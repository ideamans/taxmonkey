Webサイトをクロールして、`消費税率8%っぽい`日本円の表記を探します。

* リンクをたどって金額表記を探します(例: 10,800円や￥10,800)。
* その金額から税別価格を逆算して、キリのいい金額(デフォルト10円単位)になる表記を探します。
* ただし税別・税抜・+税などの税別を表す表記がある場合は除きます。

上記の通り精度は猿並みですが、消費税率10%への変更の思わぬ抜け漏れのチェックに利用ください。

# インストール

Node.js製のプログラムです。

```bash
npm install -g taxmonkey
```

# 利用方法

起点となるURLを指定します。

```bash
taxmonkey https://www.ideamans.com/
```

次のようなTSVを出力します。クリップボード経由でExcelに貼り付けることができます。

該当箇所のないページも含みます。

```
URL     行番号  結果    詳細    HTML
https://www.ideamans.com/       0       該当なし
https://www.ideamans.com/mt/sheetasset/ 0       該当なし
https://www.ideamans.com/lightfile/managed/pricing/     455     8%税込の可能性  [ 10,000円/サイト]は税別 9,260円 の8%税込金額を含む可能性があります     10,000円<small>/サイト</small>
```

# ヘルプ

```bash
taxmonkey -h
```

```
taxmonkey <url>

URLを起点にクローリングを開始し、「税込8%っぽい」金額表記をリストアップします。

位置:
  url  クローリングを開始するURL

オプション:
  --help             ヘルプを表示                                         [真偽]
  --version          バージョンを表示                                     [真偽]
  --output, -o       出力先のファイルパス        [デフォルト: "./taxmonkey.tsv"]
  --concurrency, -c  並列実行数                                  [デフォルト: 8]
  --limit, -l        最大ユニークURL数                        [デフォルト: 1000]
  --device, -d       クローリングを行うデバイス(mobile|pc)[デフォルト: "mobile"]
  --round, -r        キリのいい金額の単位                       [デフォルト: 10]
  --timeout          各ページのタイムアウト秒数                 [デフォルト: 30]
  --rate             税率                                     [デフォルト: 0.08]
  --host             開始URL以外でリンクをたどるホスト名        [デフォルト: ""]
  --verbose, -v      エラーや警告を標準エラーに出力   [真偽] [デフォルト: false]
  --quiet, -q        プログレスバーを非表示           [真偽] [デフォルト: false]
  --ext              HTMLドキュメントとみなす拡張子(カンマ区切り)
                                 [デフォルト: ".html,.htm,.php,.jsp,.asp,.aspx"]
  --index            インデックスドキュメントとみなすファイル名(カンマ区切り)
   [デフォルト: "index.html,index.htm,index.php,index.jsp,index.asp,index.aspx"]
```