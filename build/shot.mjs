import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 860 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
for (const w of [9, 15, 29, 'index']) {
  const url = w === 'index' ? 'http://localhost:8765/immortals/' : `http://localhost:8765/immortals/week-${w}/`;
  await p.goto(url, { waitUntil: 'load' });
  if (w !== 'index') {
    await p.click('#go'); await p.waitForTimeout(300);
    for (let i = 0; i < (w === 15 ? 1 : 2); i++) { await p.click('#skip'); await p.waitForTimeout(200); }
  }
  await p.screenshot({ path: `build/shot-${w}.png` });
}
console.log('errors:', errs.filter(e => !/fonts\.g/.test(e)));
await b.close();
