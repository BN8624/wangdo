// Ninja Adventure 원본 묶음(CC0)을 itch.io에서 가입 없이 받는다. 브라우저(Playwright)로 무료 다운로드 단추를 누른다.
//   node scripts/fetch-ninja-pack.cjs <저장할 zip 경로>
// 받은 뒤: unzip으로 풀고 python3 scripts/proto-art.py "<풀린 폴더>/Ninja Adventure - Asset Pack"
// 묶음은 크기(약 94MB) 때문에 저장소에 넣지 않는다.
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2];
  if (!out) throw new Error('저장할 zip 경로를 주세요');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto('https://pixel-boy.itch.io/ninja-adventure-asset-pack', { waitUntil: 'domcontentloaded' });
  // 무료 묶음의 "No thanks, just take me to the downloads"와 같은 길
  const url = await page.evaluate(async () => (await (await fetch('/ninja-adventure-asset-pack/download_url', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } })).json()).url);
  await page.goto(url, { waitUntil: 'networkidle' });
  const btn = page.locator('.upload', { hasText: 'Ninja Adventure - Asset Pack.zip' }).locator('a.download_btn');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10 * 60_000 }), btn.first().click()]);
  await dl.saveAs(out);
  console.log(`받음: ${out}`);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
