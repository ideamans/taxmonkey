import * as Os from 'os'
import * as Path from 'path'
import * as Fs from 'fs'
import { URL } from 'url'
import PQueue from 'p-queue'
import * as EscapeStringRegexp from 'escape-string-regexp'
const CheerioCli = require('cheerio-httpcli')
const Progress = require('progress')
const Colors = require('colors')

export class PriceMatch {
  url: string
  line: number
  result: string
  detail: string
  html: string

  constructor(values: Partial<PriceMatch>) {
    Object.assign(this, values)
  }
}

export class App {
  url = ''
  verbose = false
  quiet = false
  concurrency = Os.cpus().length
  limit = 1000
  timeout = 30
  device = 'mobile'
  rate = 0.08
  around = 8
  round = 10
  output = './taxmonkey.tsv'

  ext = '.html,.htm,.php,.jsp,.asp,.aspx'
  index = 'index.html,index.htm,index.php,index.jsp,index.asp,index.aspx'
  host = ''

  startUrl: URL
  rateLabel: string
  exts: string[]
  reIndices: RegExp[]
  hosts: string[]

  uniqueUrls: { [prop: string]: boolean } = {}
  pQueue: PQueue
  progress?: any

  constructor(args: Partial<App> & { url: string }) {
    Object.assign(this, args)
  }

  normalizeUrl(url:string): string {
    const obj = new URL(url)
    this.reIndices.forEach(re => obj.pathname = obj.pathname.replace(re, ''))
    return obj.href.replace(/#.*$/, '')
  }

  isDocumentUrl(url: URL): boolean {
    const ext = Path.extname(url.pathname)
    return ext == '' || this.ext.includes(ext)
  }

  isCrawlingHost(url: URL): boolean {
    return url.host == this.startUrl.host || this.hosts.includes(url.host)
  }

  warn(message: string, exception?: Error) {
    if (!this.quiet) process.stderr.write(Colors.blue(message) + "\n")
  }

  error(message: string, exception?: Error) {
    if (!this.quiet) process.stderr.write(Colors.red(message) + "\n")
  }

  async writeRecords(records: Array<Array<string>>, append = false) {
    const data = records.map(record => record.join("\t") + "\n").join('')
    if (this.output == '-') {
      process.stdout.write(data)
    } else {
      return new Promise((ok, ng) => {
        const method = append ? Fs.appendFile : Fs.writeFile
        method.call(Fs, this.output, data, err => err ? ng(err) : ok())
      })
    }
  }

  async grepPrices(html: string): Promise<PriceMatch[]> {
    const prices: PriceMatch[] = []
    const rawLines = html.split(/\r?\n/)

    // コメント内を無視
    html = html.replace(/<!--(.+?)-->/sg, match => {
      match = match.replace(/[^\r\n]/g, '')
      return match
    })

    // style要素を無視
    html = html.replace(/<style(.+?)<\/style>/sgi, match => {
      match = match.replace(/[^\r\n]/g, '')
      return match
    })

    // タグを除去
    html = html.replace(/<(.+?)>/sg, match => {
      match = match.replace(/[^\r\n]/g, '')
      return match
    })

    // 連続するスペースをひとつに
    html = html.replace(/[ \t]{2,}/g, ' ')

    // インデント/アウトデントの除去
    html = html.replace(/^[ \t]|[ \t]+$/, '')

    const lines = html.split(/\r?\n/)
    const reNumbers = /[0-9０-９][0-9０-９,、]+/g,
      rePricePrefix = /&#165;|&yen;|￥|¥|\\|JPY/i,
      rePriceSuffix = /円|JPY/i,
      reExcludingTax = /税抜|税別|(\+\s*tax)|(\+\s*税)/i
    lines.forEach((line, lineNum) => {
      // 空行や数値のない行はスキップ
      if (line.match(/^ *$/)) return
      if (!line.match(/\d/)) return

      // 数値の記載部分とその前後の文字列を走査
      let match
      while ((match = reNumbers.exec(line)) !== null) {
        const body: string = match[0],
          head = match.index,
          tail = reNumbers.lastIndex,
          lead = Math.min(this.around, head),
          follow = Math.min(this.around, line.length - tail),
          prefix = line.substr(head - lead, lead),
          suffix = line.substr(tail, follow),
          around = [prefix, body, suffix].join('')

        // 金額表記とみなされ、かつ税抜表記とみなされるか
        if (prefix.match(rePricePrefix) || suffix.match(rePriceSuffix) ) {
          if (!prefix.match(reExcludingTax) && !suffix.match(reExcludingTax)) {
            // 数値を正規化
            const normalized = body
              .replace(/[０-９]/g, double => {
                return String.fromCharCode(double.charCodeAt(0) - 0xFEE0)
              })
              .replace(/[^\d]/g, '')

            // 税別金額
            const amount = parseInt(normalized)
            const excludeTax: number = Math.ceil(amount / (1 + this.rate))

            // 税別金額がキリのいい数値
            if (excludeTax % this.round === 0) {
              const priceMatch = new PriceMatch({
                line: lineNum + 1,
                result: `${this.rateLabel}%税込の可能性`,
                detail: `[${around}]は税別 ${excludeTax.toLocaleString()}円 の${this.rateLabel}%税込金額を含む可能性があります`,
                html: rawLines[lineNum].replace(/^\s+|\s+$/g, ''),
              })
              // console.log(priceMatch)
              prices.push(priceMatch)
            }
          }
        }
      }
    })

    return prices
  }

  async crawl(url: string) {
    const result = await CheerioCli.fetch(url, {})

    const prices = await this.grepPrices(result.body)
    if (prices.length == 0) {
      await this.writeRecords([[url, '0', '該当なし', '', '']], true)
    }

    await this.writeRecords(prices.map(price => {
      return [url, price.line.toLocaleString(), price.result, price.detail, price.html]
    }), true)

    result.$('a[href]').each((i, el) => {
      const link = result.$(el).url()
      try {
        if (link.match(/^(.+?):/) && !RegExp.$1.match(/^https?$/)) return

        const linkUrl = new URL(link)
        if (this.isDocumentUrl(linkUrl) && this.isCrawlingHost(linkUrl)) {
          this.pushUrlToQueue(this.normalizeUrl(linkUrl.href))
        }
      } catch(ex) {
        this.warn(`${url}: ${link}: ${ex.message}`, ex)
      }
    })
  }

  async safeCrawl(url: string) {
    try {
      await this.crawl(url)
    } catch(ex) {
      this.warn(`${url}: ${ex.message}`, ex)
    }
  }

  async pushUrlToQueue(url: string) {
    if (Object.keys(this.uniqueUrls).length >= this.limit) return
    if (this.uniqueUrls[url]) return
    this.uniqueUrls[url] = true

    this.pQueue.add(() => this.safeCrawl(url))
    if (this.progress) this.progress.tick()
  }

  init() {
    this.startUrl = new URL(this.url)
    this.rateLabel = (this.rate * 100).toLocaleString()
    this.exts = this.ext.split(/\s*,\s*/)
    this.reIndices = this.index.split(/\s*,\s*/)
      .map(EscapeStringRegexp)
      .map(escaped => new RegExp(`${escaped}$`, 'i'))
    this.hosts = this.host.split(/\s*,\s*/)

    this.pQueue = new PQueue({ concurrency: this.concurrency })

    if (!this.quiet) {
      this.progress = new Progress("[:bar] :percent :rate URL/s :etas", {
        total: this.limit,
      })
    }
  }

  async run() {
    CheerioCli.set('timeout', this.timeout * 1000)
    CheerioCli.set('browser', this.device == 'pc' ? 'chrome' : 'iphone')

    await this.writeRecords([['URL', '行番号', '結果', '詳細', 'HTML']])
    await this.pushUrlToQueue(this.url)
    await this.pQueue.onIdle()
  }
}