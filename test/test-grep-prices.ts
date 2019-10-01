import test from 'ava'
import { App, PriceMatch } from '../src/index'

test('金額表記の抜き出し', async t => {
  const app = new App({ url: 'https://www.ideamans.com/' })
  const prices = await app.grepPrices(`
<html>
<head>
<style>
p { margin-bottom: 10px }
</style>
</head>
<body>
<!--
<p>10,800円</p>
-->
<p>10,800円</p>
<p>\\10,800</p>
<p>¥10,800</p>
<p>￥10,800</p>
<p>&yen;10,800</p>
<p>&#165;10,800</p>
<p>JPY10,800</p>
<p>10,800JPY</p>
<p>10,800円</p>
<p>10,800 円</p><p>10,800円</p>
<p>10,800円(税別)</p>
<p>10,800円 税別</p>
<p>10,800円(税抜)</p>
<p>10,800円(税込)</p>
<p>&yen;10,800(+税)</p>
<p>&yen;10,800(+tax)</p>
<p>10,900円</p>
</body>
</html>
  `)

  t.deepEqual(prices, [
    { line: 12, amount: 10800, phrase: '10,800円', html: '<p>10,800円</p>' },
    { line: 13, amount: 10800, phrase: '\\10,800', html: '<p>\\10,800</p>' },
    { line: 14, amount: 10800, phrase: '¥10,800', html: '<p>¥10,800</p>' },
    { line: 15, amount: 10800, phrase: '￥10,800', html: '<p>￥10,800</p>' },
    { line: 16, amount: 10800, phrase: '&yen;10,800', html: '<p>&yen;10,800</p>' },
    { line: 17, amount: 10800, phrase: '&#165;10,800', html: '<p>&#165;10,800</p>' },
    { line: 18, amount: 10800, phrase: 'JPY10,800', html: '<p>JPY10,800</p>' },
    { line: 19, amount: 10800, phrase: '10,800JPY', html: '<p>10,800JPY</p>' },
    { line: 20, amount: 10800, phrase: '10,800円', html: '<p>10,800円</p>' },
    { line: 21, amount: 10800, phrase: '10,800 円10,800', html: '<p>10,800 円</p><p>10,800円</p>' },
    { line: 21, amount: 10800, phrase: '10,800 円10,800円', html: '<p>10,800 円</p><p>10,800円</p>' },
    { line: 25, amount: 10800, phrase: '10,800円(税込)', html: '<p>10,800円(税込)</p>' },
  ].map(values => new PriceMatch(values)))
})