/** Проба 32px-базы T3.6 для стендов list-page/landing-section (T18.17):
 *  html font-size 32px + перечисление элементов с right edge > clientWidth.
 *  Использование: node .zcode/t1817-32px.mjs [patterns/list-page|patterns/landing-section] [width]
 *  (serve: node showcase/serve.mjs) */
import { chromium } from '@playwright/test';

const standPath = process.argv[2] ?? 'patterns/list-page';
const width = Number(process.argv[3] ?? 768);
const url = `http://127.0.0.1:8080/${standPath}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
await page.waitForTimeout(300);

const out = await page.evaluate(() => {
  const cw = document.documentElement.clientWidth;
  const wide = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > cw + 1 && r.width > 0) {
      wide.push({
        cls: (el.className.baseVal ?? el.className ?? '').toString().slice(0, 60),
        tag: el.tagName.toLowerCase(),
        right: Math.round(r.right),
        w: Math.round(r.width),
      });
    }
  }
  return { cw, scrollWidth: document.documentElement.scrollWidth, wide: wide.slice(0, 25) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
