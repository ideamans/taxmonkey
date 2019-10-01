#!/usr/bin/env node

const Yargs = require('yargs')
const Package = require('../package.json')
import * as Os from 'os'
import { App } from './index'

const defaults = new App({ url: 'http://example.com/' })

Yargs
  .usage(`Usage: $0 -c 4 -l 1000 -d mobile https://www.ideamans.com/`)
  .option('output', { alias: 'o', description: '出力先のファイルパス', default: defaults.output })
  .option('concurrency', { alias: 'c', description: '並列実行数', default: defaults.concurrency })
  .option('limit', { alias: 'l', description: '最大ユニークURL数', default: defaults.limit })
  .option('device', { alias: 'd', description: 'クローリングを行うデバイス(mobile|pc)', default: defaults.device })
  .option('round', { alias: 'r', description: 'キリのいい金額の単位', default: defaults.round })
  .option('timeout', { description: '各ページのタイムアウト秒数', default: defaults.timeout })
  .option('rate', { description: '税率', default: defaults.rate })
  .option('host', { description: '開始URL以外でリンクをたどるホスト名', default: defaults.host })
  .option('verbose', { alias: 'v', description: 'エラーや警告を標準エラーに出力', default: false })
  .boolean('verbose')
  .option('quiet', { alias: 'q', description: 'プログレスバーを非表示', default: false })
  .boolean('quiet')
  .option('ext', { description: 'HTMLドキュメントとみなす拡張子(カンマ区切り)', default: defaults.ext })
  .option('index', { description: 'インデックスドキュメントとみなすファイル名(カンマ区切り)', default: defaults.index })
  .command('* <url>', 'URLを起点にクローリングを開始し、「税込8%っぽい」金額表記をリストアップします。', yargs => {
    yargs
      .positional('url', {
        describe: 'クローリングを開始するURL',
      })
  }, async (argv: any) => {
    const app = new App({
      url: argv.url,
      output: argv.output,
      concurrency: parseInt(argv.concurrency),
      limit: parseInt(argv.limit),
      device: argv.device,
      round: parseInt(argv.round),
      timeout: parseInt(argv.timeout),
      rate: parseFloat(argv.rate),
      host: argv.host,
      ext: argv.ext,
      index: argv.index,
    })
    app.init()
    await app.run()
  })
  .argv