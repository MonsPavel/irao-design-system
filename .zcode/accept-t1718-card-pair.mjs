/**
 * Скрин-проба AC2 T17.18 (значения, не эталоны): computed-геометрия
 * оригинальной .students__card против канона стенда patterns/poster-card —
 * каркас (высота/паддинг/радиус), координаты иллюстрации, кнопка-действие.
 * Пара — peach-карточка; ширины колонок выровнены (одиночная карточка в
 * контейнере 429px оригинала ≈ слот канона).
 */
import { chromium } from '@playwright/test';

const ORIGINAL = 'https://monspavel.github.io/career-portal/index.html';
const STAND = 'http://127.0.0.1:8080/showcase/dist/stands/patterns/poster-card.html';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const probe = async (page, cardSel) =>
  page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return null;
    const s = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    const illu = card.querySelector('[class*="illu"]');
    const i = illu ? getComputedStyle(illu) : null;
    const iRect = illu ? illu.getBoundingClientRect() : null;
    const btn = card.querySelector('a[class*="action"], a[class*="btn"]');
    const b = btn ? getComputedStyle(btn) : null;
    const bRect = btn ? btn.getBoundingClientRect() : null;
    return {
      cardWidth: Math.round(rect.width),
      cardHeight: Math.round(rect.height),
      padding: s.padding,
      radius: s.borderRadius,
      illu: i && iRect
        ? {
            left: Math.round(iRect.left - rect.left),
            topPct: Math.round(((iRect.top - rect.top) / rect.height) * 100),
            widthPct: Math.round((iRect.width / rect.width) * 100),
          }
        : null,
      btn:
        b && bRect
          ? {
              size: [Math.round(bRect.width), Math.round(bRect.height)],
              rightGap: Math.round(rect.right - bRect.right),
              bottomGap: Math.round(rect.bottom - bRect.bottom),
              radius: b.borderRadius,
            }
          : null,
    };
  }, cardSel);

const originalPage = await context.newPage();
await originalPage.goto(ORIGINAL, { waitUntil: 'networkidle', timeout: 60000 });
await originalPage.waitForTimeout(400);
const orig = await probe(originalPage, '.students--illustrated .students__card--peach');
await originalPage.close();

const standPage = await context.newPage();
await standPage.goto(STAND, { waitUntil: 'networkidle', timeout: 60000 });
await standPage.waitForTimeout(400);
// Оригинальная карточка 429px ширины в 3-колоночной сетке 1425px — стенд даёт
// слот ~445px; сравниваем ЗНАЧЕНИЯ каркаса (padding/radius/координаты),
// высоты — по минимальной высоте ступени.
const canon = await probe(standPage, '.pstr-card--peach');
await standPage.close();
await browser.close();

console.log('original:', JSON.stringify(orig));
console.log('canon   :', JSON.stringify(canon));
