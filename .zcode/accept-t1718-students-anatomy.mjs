/**
 * Разбор высоты блока students пилота (T17.18): ui-section padding, h2,
 * grid, высоты карточек — против оригинала (.students padding/head/grid).
 */
import { chromium } from '@playwright/test';

const ORIGINAL = 'https://monspavel.github.io/career-portal/index.html';
const PILOT = 'http://127.0.0.1:8080/pilot/career-portal/dist/index.html';
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });

const originalPage = await context.newPage();
await originalPage.goto(ORIGINAL, { waitUntil: 'networkidle', timeout: 60000 });
await originalPage.waitForTimeout(400);
const origAnatomy = await originalPage.evaluate(() => {
  const section = document.querySelector('.students--illustrated');
  const s = getComputedStyle(section);
  const head = document.querySelector('.students--illustrated .students__head');
  const h = getComputedStyle(head);
  const title = document.querySelector('.students--illustrated .students__title');
  const card = document.querySelector('.students--illustrated .students__card');
  return {
    sectionPadding: [s.paddingTop, s.paddingBottom],
    headHeight: Math.round(head.getBoundingClientRect().height),
    headMarginBottom: h.marginBottom,
    titleHeight: Math.round(title.getBoundingClientRect().height),
    cardHeight: Math.round(card.getBoundingClientRect().height),
  };
});
await originalPage.close();

const pilotPage = await context.newPage();
await pilotPage.goto(PILOT, { waitUntil: 'networkidle', timeout: 60000 });
await pilotPage.waitForTimeout(400);
const pilotAnatomy = await pilotPage.evaluate(() => {
  const section = document.querySelector('#students');
  const s = getComputedStyle(section);
  const h2 = section.querySelector('h2');
  const grid = section.querySelector('.ui-grid');
  const g = getComputedStyle(grid);
  const card = section.querySelector('.pstr-card');
  const cardStyle = getComputedStyle(card);
  const title = section.querySelector('.pstr-card__title');
  const text = section.querySelector('.pstr-card__text');
  return {
    sectionPadding: [s.paddingTop, s.paddingBottom],
    h2Height: Math.round(h2.getBoundingClientRect().height),
    h2MarginBottom: getComputedStyle(h2).marginBottom,
    gridHeight: Math.round(grid.getBoundingClientRect().height),
    gridGap: g.gap,
    gridColumns: g.gridTemplateColumns,
    cardHeight: Math.round(card.getBoundingClientRect().height),
    cardMinHeight: cardStyle.minHeight,
    titleFs: getComputedStyle(title).fontSize,
    textFs: getComputedStyle(text).fontSize,
  };
});
await pilotPage.close();
await browser.close();
console.log('original:', JSON.stringify(origAnatomy));
console.log('pilot:', JSON.stringify(pilotAnatomy));
