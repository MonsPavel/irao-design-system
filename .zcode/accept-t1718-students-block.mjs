/**
 * Узкая проба T17.18 (прецедент .zcode/accept-*.mjs): BLOCK_PROBE students
 * compare.mjs — высота блока «Школьникам и студентам» оригинала
 * (.students--illustrated) против пилота (#students) после adoption на
 * pstr-. Сервер: node showcase/serve.mjs (127.0.0.1:8080). Вьюпорт — как в
 * compare.mjs (1440×900) + лестница 375/768 для контекста.
 */
import { chromium } from '@playwright/test';

const ORIGINAL = 'https://monspavel.github.io/career-portal/index.html';
const PILOT = 'http://127.0.0.1:8080/pilot/career-portal/dist/index.html';
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 },
];

const lazyWarmup = (page) =>
  page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

const blockHeight = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  }, selector);

const browser = await chromium.launch();
const report = {};
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport });
  const originalPage = await context.newPage();
  await originalPage.goto(ORIGINAL, { waitUntil: 'networkidle', timeout: 60000 });
  await originalPage.waitForTimeout(400);
  await lazyWarmup(originalPage);
  const original = await blockHeight(originalPage, '.students--illustrated');
  await originalPage.close();

  const pilotPage = await context.newPage();
  await pilotPage.goto(PILOT, { waitUntil: 'networkidle', timeout: 60000 });
  await pilotPage.waitForTimeout(400);
  await lazyWarmup(pilotPage);
  const pilot = await blockHeight(pilotPage, '#students');
  await pilotPage.close();
  await context.close();

  report[`${viewport.width}`] = { original, pilot };
  console.log(
    `${viewport.width}px: original ${original ? original.height : 'null'} / pilot ${pilot ? pilot.height : 'null'}`,
  );
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
