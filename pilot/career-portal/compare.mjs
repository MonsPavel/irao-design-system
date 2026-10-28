#!/usr/bin/env node
/**
 * pilot/career-portal/compare.mjs — сравнение оригинала career-portal
 * (GitHub Pages) и пилотного клона на irao-ui (локальный serve).
 *
 * Продукт прогона (pilot/career-portal/compare-output/):
 *  - original/<страница>.png и pilot/<страница>.png — полностраничные
 *    скриншоты 1440px для просмотра владельцем;
 *  - compare.json — машинные метрики:
 *      docHeight — высота документа (грубая мера вертикального ритма);
 *      blocks    — высота/ширина одноимённых блоков (hero, production, …);
 *      probes    — computed-стили пар «класс оригинала → ui-компонент»
 *                  (кнопка, тег, поле, карточка, крошки, FAQ, …) и
 *                  shell-проб EPIC-16 (фон страницы, шапка, dropdown,
 *                  футер, строки, сайдбар) — короткие поля, не весь
 *                  computed-стиль; нет сущности на странице — null.
 *  - viewer.html — пары скриншотов + таблица всех проб (новые и прежние).
 *
 * Запуск: node showcase/serve.mjs & node pilot/career-portal/compare.mjs
 *
 * Перед прогоном compare выполняет гейт мёртвых внутренних ссылок dist
 * (check-links.mjs, T15.9): есть DEAD — прогон падает до браузеров.
 * Отдельный запуск гейта: node pilot/career-portal/check-links.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { collectDeadLinks } from './check-links.mjs';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(PILOT_DIR, 'compare-output');
const ORIGINAL_BASE = 'https://monspavel.github.io/career-portal';
const PILOT_BASE = 'http://127.0.0.1:8080/pilot/career-portal/dist';
const VIEWPORT = { width: 1440, height: 900 };

// Гейт мёртвых ссылок (T15.9) — в том же запуске, до браузеров: compare
// строит пары страниц по PAGES, мёртвая внутренняя ссылка делает прогон
// бессмысленным (уроки раунда 2 — REPORT §7). Падаем сразу, до траты ~5 мин.
// existsSync-гард (T15.9-бэклог): при несобранном dist readdirSync даёт
// сырой ENOENT-стектрейс — выводим сообщение CLI.
const DIST = join(PILOT_DIR, 'dist');
if (!existsSync(DIST)) {
  console.error(
    `dist не найден: ${DIST} — сначала соберите пилот: node pilot/career-portal/build.mjs`,
  );
  process.exit(1);
}
const linkGate = collectDeadLinks(DIST);
if (linkGate.dead.length > 0) {
  console.error(
    `Гейт ссылок: ${linkGate.dead.length} DEAD — compare остановлен:\n` +
      linkGate.dead.map(({ page, href }) => `  ${page} → ${href}`).join('\n'),
  );
  process.exit(1);
}
console.log(
  `Гейт ссылок: ${linkGate.checked.length} страниц, ${linkGate.links} внутренних ссылок, 0 DEAD`,
);

const PAGES = [
  'index.html',
  'vacancies.html',
  'vacancy.html',
  'vacancy-apply.html',
  'internships.html',
  'practices.html',
  'internship.html',
  'internship-apply.html',
  'education.html',
  'education-catalog.html',
  'events.html',
  'events-search.html',
  'event.html',
  'event-apply.html',
  'media.html',
  'article.html',
  'career-track.html',
  'company.html',
  'companies.html',
  '404.html',
];

/** Пары «селектор оригинала → селектор пилота» для проб компонентов.
 *  Берём ПЕРВОЕ вхождение на каждой из пары страниц с одинаковым именем. */
const COMPONENT_PROBES = [
  ['button-primary', '.btn--primary', '.ui-button--primary'],
  ['button-accent', '.btn--accent', '.ui-button--accent'],
  ['button-outline', '.btn--outline', '.ui-button--outline'],
  ['pill-btn', '.pill-btn', '.cp-vac-row .ui-button'],
  ['tag-blue', '.tag--blue', '.ui-tag--blue'],
  ['tag-orange', '.tag--orange', '.ui-tag--orange'],
  ['card', '.card', '.ui-card'],
  ['field-input', '.field__input', '.ui-field__input'],
  ['field-label', '.field__label', '.ui-field__label'],
  ['checkbox', '.checkbox', '.ui-checkbox'],
  ['radio', '.radio', '.ui-radio'],
  ['breadcrumbs', '.breadcrumbs', '.ui-breadcrumbs'],
  ['faq-q', '.faq__q', '.ui-accordion__q'],
  ['faq-item', '.faq__item', '.ui-accordion__item'],
  ['pagination-page', '.pagination__page', '.ui-pagination__page'],
  ['tabs-pill', '.tabs-pill__tab', '.ui-tabs__tab'],
  ['chip', '.chip', '.ui-chip__pill'],
  ['modal-dialog', '.modal__dialog', '.ui-modal'],
  ['section-title', '.section__title', '.ui-h2'],
  ['page-title', '.page-title', '.ui-page-title'],
];

/** Shell-пробы (T16.8, EPIC-16): зоны, не покрытые раундами 1–2 — фон
 *  страницы, шапка, dropdown, футер, строки, сайдбар. Та же конвенция
 *  пар «селектор оригинала → селектор пилота», первое вхождение; поля —
 *  короткая карта «алиас → css-свойство» (не весь computed-стиль).
 *  Нет сущности на странице — null на соответствующей стороне (проба
 *  не падает). footer-link дополнительно снимает bg/высоту футера —
 *  сущность `footer` из спеки живёт в этой же пробе (8 новых проб).
 *  Спека называла пункт dropdown «Рабочие направления» — такого пункта
 *  нет ни в оригинале, ни в пилоте; берём первый пункт dropdown
 *  («Стажировки и практики», одинаковый текст на обеих сторонах). */
const SHELL_PROBES = [
  // фон <body> — ловит возврат blue-50 (REPORT §8.2 №1); без текстового
  // среза (text у body — весь текст страницы, шум)
  {
    name: 'body-bg',
    original: 'body',
    pilot: 'body',
    fields: { bg: 'background-color' },
    text: false,
  },
  // первый пункт меню шапки (REPORT §8.2 №4): высота строки — rect
  {
    name: 'header-link',
    original: '.header__menu--left .header__link',
    pilot: '.cp-header__menu--left .ui-link--nav',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    rect: true,
  },
  // пункт dropdown шапки (REPORT §8.2 №4): скрыт (display:none) —
  // computed-стили читаются, rect не берём
  {
    name: 'dropdown-item',
    original: '.header__dropdown-link',
    pilot: '.ui-dropdown__item',
    fields: { fs: 'font-size', lh: 'line-height', padding: 'padding', tdl: 'text-decoration-line' },
  },
  // первая ссылка футера (REPORT §8.2 №5) + bg/высота самого футера
  {
    name: 'footer-link',
    original: '.footer__link',
    pilot: '.cp-footer__link',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    extra: {
      original: '.footer',
      pilot: '.cp-footer',
      fields: { footerBg: 'background-color' },
      rectName: 'footerHeight',
    },
  },
  // заголовок первой строки списка (REPORT §8.2 №6): тег + типографика.
  // Селектор по РОЛИ (T16.5): строка несёт ui-h6 — канон «заголовок
  // карточки списков» T16.12 (20/500 color-text); ui-h4 давал 28px на lg.
  // Класс связки — lpp-* с T17.1 (паттерн-слой dist/ui-patterns.css).
  {
    name: 'row-title',
    original: '.vac-row__title',
    pilot: '.lpp-row .ui-h6',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    tag: true,
  },
  // сам ряд: паддинг, фон, радиус (страницы со строками — null-сима)
  {
    name: 'row-item',
    original: '.vac-row',
    pilot: '.lpp-row',
    fields: { padding: 'padding', bg: 'background-color', radius: 'border-radius' },
  },
  // кружок стрелки CTA строки — ловит accent vs primary (REPORT §8.2 №6)
  {
    name: 'pill-icon',
    original: '.pill-btn__icon',
    pilot: '.lpp-row .ui-button__icon',
    fields: { bg: 'background-color' },
  },
  // «Сбросить» сайдбара (REPORT §8.2 №6/№8); класс панели — lpp-side с T17.1
  {
    name: 'reset-control',
    original: '.vac-side__reset',
    pilot: '.lpp-side .ui-button',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    tag: true,
    rect: true,
  },
  // Промо-карточка сайдбара (T16.5, REPORT §8.2 №6): ui-card--filled —
  // bg blue-50 и радиус 16 от компонента; паддинг — база ДС 24px против 20
  // оригинала («принято ДС» REPORT §3.3/mapping, как у всех ui-card).
  {
    name: 'side-promo',
    original: '.vac-side__promo',
    pilot: '.cp-vac-side__promo',
    fields: { bg: 'background-color', padding: 'padding', radius: 'border-radius' },
  },
  // Primary-кнопка промо без подчёркивания (T16.2; REPORT §8.2 №3)
  {
    name: 'promo-btn',
    original: '.vac-side__promo .btn--primary',
    pilot: '.cp-vac-side__promo .ui-button--primary',
    fields: { fs: 'font-size', tdl: 'text-decoration-line' },
    rect: true,
  },
  // Заголовок карточки события (T16.12, REPORT §9.1 №1): канон 20/500
  // color-text — probe-пара раунда 4, заводится при закрытии T16.12 (§9.2).
  // Селектор по РОЛИ, не по тегу: выдача events-search собирает карточки
  // с h2 (T15.9), карточки событий — h3/h2 по месту страницы.
  {
    name: 'card-title',
    original: '.event-card__title',
    pilot: '.cp-event-card__body .ui-h6',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
    tag: true,
  },
  // Мини-тайтл карточки статьи (T16.12): 14/500 color-text
  {
    name: 'article-title',
    original: '.article-card__title',
    pilot: '.cp-article-card__title',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
    tag: true,
  },
  // Заголовок залитой карточки преимущества (T16.12): 20/500 primary.
  // Селектор ограничен сеткой преимуществ — на career-track ui-card--filled
  // несут ещё и карточки треков (вне T16.12, ложно попали бы в пробу).
  {
    name: 'card-title-primary',
    original: '.adv-card__title',
    pilot: '.cp-adv-grid .ui-card--filled h3',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  // Шорт карточки организации (T16.12): подпись muted (AA-цвет gray-700)
  {
    name: 'card-short',
    original: '.org-card__short',
    pilot: '.cp-org-card .ui-text--muted',
    fields: { fs: 'font-size', color: 'color' },
  },
  // ── Деталка вакансии и aside анкеты (T16.13, REPORT §9.1 №3/№4) ──
  // Зарплата (vacancy.html): канон — литерал 18px muted (pages.css:271);
  // клон — литерал 1.125rem сайт-зоны + ui-text--muted (AA gray-700).
  {
    name: 'salary',
    original: '.vacancy-page__salary',
    pilot: '.cp-vacancy-page__salary',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  // Подзаголовок секции детальной (vacancy.html): канон fs-h4-тройка 28/500 —
  // роль ui-h4 (было ui-h3 42/500)
  {
    name: 'section-h2',
    original: '.vacancy-page__section h2',
    pilot: '.cp-vacancy-page__section h2',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  // Aside анкеты (vacancy-apply.html): титул primary (28/500 — роль ui-h4),
  // текст 14/400 (fs-small крючка × fw роли ui-body), метка 12/400 muted
  // (fs-micro × fw-micro крючка), значение 14/500 (fs-small × fw-small)
  {
    name: 'aside-title',
    original: '.form-aside__title',
    pilot: '.ui-form__aside-title',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  {
    name: 'aside-text',
    original: '.form-aside__text',
    pilot: '.ui-form__aside-text',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  {
    name: 'aside-label',
    original: '.form-aside__label',
    pilot: '.ui-form__aside-label',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  {
    name: 'aside-value',
    original: '.form-aside__value',
    pilot: '.ui-form__aside-value',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color' },
  },
  // Фильтр медиа-каталога (T16.14, REPORT §9.1 №5): тег-фильтр 40px —
  // ui-tag--blue × ui-tag--filter. Первое вхождение на media.html —
  // активный «Все» на обеих сторонах: плашка primary / text-on-dark
  // (ARIA aria-current=page у клона, inline-стиль у оригинала), покой
  // (blue-100/primary) гейтят e2e стенда ui-tag и пары tag-blue.
  {
    name: 'filter-tag',
    original: '.filter-tag',
    pilot: '.ui-tag--filter',
    fields: {
      fs: 'font-size',
      fw: 'font-weight',
      color: 'color',
      bg: 'background-color',
      radius: 'border-radius',
    },
    rect: true,
  },
  // Кнопка «прикрепить файл» (T16.13: канон — пилюля btn--light на коробке
  // field__file). Визуал собирается ui-file (T5.3): коробка blue-50 с
  // прозрачной пилюлей-кнопкой ≡ канонной кнопке с bg blue-50 (bg самой
  // кнопки литерально расходится — прозрачный на blue-50 коробке; сравниваем
  // подпись/радиус кнопки и фон коробки).
  {
    name: 'file-box',
    original: '.field__file',
    pilot: '.ui-file',
    fields: { bg: 'background-color', radius: 'border-radius' },
  },
  {
    name: 'file-button',
    original: '.field__file .btn--light',
    pilot: '.ui-file__button',
    fields: { color: 'color', radius: 'border-radius' },
  },
  // Базовая строка промо-блока «бегущие строки» (T16.15, REPORT §9.1 №6):
  // канон 40/500 uppercase, ls 0 (база 0.02em — pages.css:1070/1081), primary
  // на светлом blue-50. Первое вхождение — internships.html; подписи --bar 18
  // и мелкая --sm 13 несут ту же базу строк (fw/tt/color) и гейтятся этой
  // парой по общим полям.
  {
    name: 'marquee-line',
    original: '.adv-marquee__line--xl',
    pilot: '.cp-adv-marquee__line--xl',
    fields: {
      fs: 'font-size',
      fw: 'font-weight',
      color: 'color',
      ls: 'letter-spacing',
      tt: 'text-transform',
    },
    rect: true,
  },
  // Карточка компании (T16.16, REPORT §9.1 №7): канон мини-карточки — 14/500
  // color-text (inline-стиль companies.html:153+: --fs-small-regular ×
  // --fw-small = тройка small ДС, роль ui-small на ссылке), паддинг 20×24,
  // высота строки в grid-3. Первое вхождение — companies.html.
  {
    name: 'company-card',
    original: '.card--hover',
    pilot: '.cp-company-card',
    fields: {
      fs: 'font-size',
      fw: 'font-weight',
      lh: 'line-height',
      color: 'color',
      padding: 'padding',
    },
    rect: true,
  },
  // Трек поднавигации разделов (T16.16, REPORT §9.1 №8; T17.11): blue-50,
  // pad 4, radius pill — модификатор ui-tabs--pill (T14.9-adoption); сетка
  // 5×1fr и маргины — канон nvp паттерн-слоя (T17.11); ширина трека следует
  // контейнеру (shell 1345↔1361 — «принято»), высота 56↔60 — порог ≤4px
  // (52 против 48 — решение T14.9).
  {
    name: 'subnav-track',
    original: '.tabs-pill',
    pilot: '.nvp .ui-tabs__list',
    fields: { bg: 'background-color', padding: 'padding', radius: 'border-radius' },
    rect: true,
  },
  // Таб поднавигации: прозрачная пилюля, подпись text; fs/fw 20/400↔14/500 —
  // «принято ДС» (решение спеки T14.9). Первое вхождение на страницах с
  // поднавигацией — неактивная пилюля «Практики» на обеих сторонах.
  {
    name: 'subnav-tab',
    original: '.tabs-pill__tab',
    pilot: '.nvp .ui-tabs__tab',
    fields: { fs: 'font-size', fw: 'font-weight', color: 'color', bg: 'background-color' },
    rect: true,
  },
  // Активный таб поднавигации: заливка primary + text-on-dark. T17.11: пару
  // красит сам модификатор --pill по aria-current="page" (покой + hover) —
  // сайт-зонная реплика 0,4,0 снята из pilot.css.
  {
    name: 'subnav-tab-active',
    original: '.tabs-pill__tab.is-active',
    pilot: ".nvp .ui-tabs__tab[aria-current='page']",
    fields: { bg: 'background-color', color: 'color' },
    rect: true,
  },
];

/** Пары блоков главной (высота секций). */
const BLOCK_PROBES = {
  'index.html': [
    ['hero', '.hero', '.cp-hero'],
    ['production', '.production', '.cp-production'],
    ['directions', '.directions', '#directions'],
    ['holding', '.holding', '.cp-holding'],
    // Лента логотипов — связка lgo-grid (T17.9): проба на крючке слоя
    // (прецедент video-block/cta-mail).
    ['employers', '.employers', '.lgo-grid'],
    ['why-us', '.why-us', '.cp-why-us'],
    ['vacancy-search', '.vacancy-search', '#vacancies'],
    ['students', '.students--illustrated', '#students'],
    ['video-block', '.video-block', '.ui-video'],
    ['media', '.media', '#media'],
    ['team', '.team', '.cp-team__photo'],
    ['cta-mail', '.cta-mail', '.ui-card--cta--primary'],
    ['footer', '.footer', '.cp-footer'],
  ],
  // Статы компании на ui-stat (T17.4): сетки — сайт-зона, плашки — компонент;
  // блоки гейтят высоты миграции (AC: порог ±4px). Оригинал несёт те же
  // классы блоков (.company-stats/.company-adv, pages.css:805/813).
  'company.html': [
    ['company-stats', '.company-stats', '.cp-company-stats'],
    ['company-adv', '.company-adv', '.cp-company-adv'],
    // Фото-секция ui-section--photo (T17.3): CTA-баннер (banner-card
    // оригинала, pages.css:656–674) — высота миграции на модификатор ДС.
    ['company-banner', '.banner-card', '.cp-company-banner'],
  ],
  // Таймлайн «Как попасть» (T17.10): adoption на связки tlp-* паттерн-слоя;
  // блок гейтит высоту миграции (AC: порог ±4px). Оригинал — .timeline
  // (pages.css:1096); education/career-track таймлайна не несут (career-track
  // строит steps-bar — другая композиция, канона в ДС нет).
  'internships.html': [['timeline', '.timeline', '.tlp']],
  'practices.html': [['timeline', '.timeline', '.tlp']],
};

const STYLES = [
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-radius',
  'border-width',
  'border-color',
  'padding',
  'height',
];

async function lazyWarmup(page) {
  // loading="lazy" ниже фолда не грузится при fullPage-скриншоте Playwright:
  // прокручиваем страницу до низа шагами, ждём догрузки, возвращаемся наверх.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => img.loading === 'lazy' && !img.complete)
        // картинки в закрытых <dialog> не грузятся никогда — ждём с таймаутом
        .map(
          (img) =>
            new Promise((resolve) => {
              const done = () => resolve();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
              setTimeout(done, 4000);
            }),
        ),
    ),
  );
  await page.waitForTimeout(250);
}

async function metricsFor(page) {
  return page.evaluate(() => ({ docHeight: document.documentElement.scrollHeight }));
}

async function probe(page, selector) {
  return page.evaluate(
    ({ selector, styles }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      const picked = {};
      for (const style of styles) picked[style] = computed.getPropertyValue(style);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        styles: picked,
        text: (el.textContent || '').trim().slice(0, 60),
      };
    },
    { selector, styles: STYLES },
  );
}

/** Shell-проба: короткие поля computed-стиля + опциональные тег/высота
 *  (и «хвост» extra — второй элемент той же сущности, напр. футер целиком:
 *  его поля footerBg/footerHeight попадают в объект рядом с полями ссылки).
 *  Нет элемента(ов) на стороне — null по отсутствующим полям; если нет
 *  ничего — проба возвращает null (сторона честно пуста, конвейер не падает). */
async function shellProbe(page, spec, side) {
  const read = (selector, fields, { tag = false, rectName = null, withText = true } = {}) =>
    page.evaluate(
      ({ selector, fields, tag, rectName, withText }) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const computed = getComputedStyle(el);
        const out = {};
        for (const [alias, prop] of Object.entries(fields)) {
          out[alias] = computed.getPropertyValue(prop);
        }
        if (tag) out.tag = el.tagName.toLowerCase();
        if (rectName) out[rectName] = Math.round(el.getBoundingClientRect().height);
        if (withText) out.text = (el.textContent || '').trim().slice(0, 60);
        return out;
      },
      { selector, fields, tag, rectName, withText },
    );

  const main = await read(spec[side], spec.fields, {
    tag: spec.tag,
    rectName: spec.rect ? 'height' : null,
    withText: spec.text !== false,
  });
  const extra = spec.extra
    ? await read(spec.extra[side], spec.extra.fields, {
        rectName: spec.extra.rectName,
        withText: false,
      })
    : null;
  if (!main && !extra) return null;
  return { ...(main || {}), ...(extra || {}) };
}

const browser = await chromium.launch();
mkdirSync(join(OUT, 'original'), { recursive: true });
mkdirSync(join(OUT, 'pilot'), { recursive: true });

const report = { generatedAt: new Date().toISOString(), viewport: VIEWPORT, pages: {} };

for (const pageName of PAGES) {
  const blocks = BLOCK_PROBES[pageName] || [];
  const originalContext = await browser.newContext({ viewport: VIEWPORT });
  const originalPage = await originalContext.newPage();
  await originalPage.goto(`${ORIGINAL_BASE}/${pageName}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await originalPage.waitForTimeout(400);
  await lazyWarmup(originalPage);
  const originalResult = { ...(await metricsFor(originalPage)), blocks: {} };
  for (const [name, selector] of blocks) {
    originalResult.blocks[name] = await originalPage.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }, selector);
  }
  const originalProbes = {};
  for (const [name, selector] of COMPONENT_PROBES) {
    originalProbes[name] = await probe(originalPage, selector);
  }
  const originalShellProbes = {};
  for (const spec of SHELL_PROBES) {
    originalShellProbes[spec.name] = await shellProbe(originalPage, spec, 'original');
  }
  await originalPage.screenshot({
    path: join(OUT, 'original', pageName.replace('.html', '.png')),
    fullPage: true,
  });
  await originalContext.close();

  const pilotContext = await browser.newContext({ viewport: VIEWPORT });
  const pilotPage = await pilotContext.newPage();
  const pilotErrors = [];
  pilotPage.on('console', (message) => {
    if (message.type() === 'error') pilotErrors.push(message.text());
  });
  pilotPage.on('pageerror', (error) => pilotErrors.push(String(error)));
  await pilotPage.goto(`${PILOT_BASE}/${pageName}`, { waitUntil: 'networkidle', timeout: 60000 });
  await pilotPage.waitForTimeout(400);
  await lazyWarmup(pilotPage);
  const pilotResult = { ...(await metricsFor(pilotPage)), blocks: {} };
  for (const [name, , pilotSelector] of blocks) {
    pilotResult.blocks[name] = await pilotPage.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }, pilotSelector);
  }
  const pilotProbes = {};
  for (const [name, , pilotSelector] of COMPONENT_PROBES) {
    pilotProbes[name] = await probe(pilotPage, pilotSelector);
  }
  const pilotShellProbes = {};
  for (const spec of SHELL_PROBES) {
    pilotShellProbes[spec.name] = await shellProbe(pilotPage, spec, 'pilot');
  }
  await pilotPage.screenshot({
    path: join(OUT, 'pilot', pageName.replace('.html', '.png')),
    fullPage: true,
  });
  await pilotContext.close();

  report.pages[pageName] = {
    docHeight: { original: originalResult.docHeight, pilot: pilotResult.docHeight },
    blocks: Object.fromEntries(
      Object.entries(originalResult.blocks).map(([name, box]) => [
        name,
        { original: box, pilot: pilotResult.blocks[name] ?? null },
      ]),
    ),
    probes: Object.fromEntries(
      COMPONENT_PROBES.map(([name]) => [
        name,
        { original: originalProbes[name], pilot: pilotProbes[name] },
      ]).concat(
        SHELL_PROBES.map(({ name }) => [
          name,
          { original: originalShellProbes[name], pilot: pilotShellProbes[name] },
        ]),
      ),
    ),
    pilotConsoleErrors: pilotErrors,
  };
  console.log(
    `${pageName}: doc ${originalResult.docHeight} → ${pilotResult.docHeight}` +
      (pilotErrors.length ? `; ERRORS: ${pilotErrors.join(' | ')}` : ''),
  );
}

await browser.close();
writeFileSync(join(OUT, 'compare.json'), JSON.stringify(report, null, 2));
console.log(`\nМетрики: ${join(OUT, 'compare.json')}`);

/** viewer.html — пары скриншотов + таблица ВСЕХ проб страницы (прежние
 *  компонентные и новые shell): у расходящихся значений красная метка. */
const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Токены пробы для показа: «алиас=значение» (текст в json, не в таблице). */
function probeTokens(value) {
  if (!value) return null;
  const tokens = {};
  if (typeof value.width === 'number') tokens['wh'] = `${value.width}×${value.height}`;
  if (value.styles) for (const [key, val] of Object.entries(value.styles)) tokens[key] = val;
  for (const [key, val] of Object.entries(value)) {
    if (key === 'text' || key === 'styles' || key === 'width') continue;
    // у компонентных проб высота уже показана в 'wh'; у rect-проб shell
    // (width не снимается, height пишется самим shellProbe) — показываем
    if (key === 'height' && typeof value.width === 'number') continue;
    tokens[key] = val;
  }
  return tokens;
}

function probeRow(name, pair) {
  const original = probeTokens(pair.original);
  const pilot = probeTokens(pair.pilot);
  const keys = [...new Set([...Object.keys(original || {}), ...Object.keys(pilot || {})])];
  const cell = (tokens) => {
    if (!tokens) return '<i style="color:#888">null (нет на странице)</i>';
    return keys
      .map((key) => {
        const mismatch = original && pilot && original[key] !== pilot[key];
        const val = tokens[key] ?? '—';
        return `${key}=<${mismatch ? 'b style="color:#b33"' : 'span'}>${esc(val)}</${mismatch ? 'b' : 'span'}>`;
      })
      .join(', ');
  };
  const text = pair.original?.text || pair.pilot?.text || '';
  return (
    `<tr><td style="padding:4px 10px;white-space:nowrap">${esc(name)}` +
    (text ? `<br><small style="color:#888">«${esc(text.slice(0, 30))}»</small>` : '') +
    `</td><td style="padding:4px 10px">${cell(original)}</td><td style="padding:4px 10px">${cell(pilot)}</td></tr>`
  );
}

const viewerSections = PAGES.map((pageName) => {
  const data = report.pages[pageName];
  const png = pageName.replace('.html', '.png');
  const rows = Object.entries(data.probes)
    .map(([name, pair]) => probeRow(name, pair))
    .join('');
  return (
    `<section style="margin:24px 0"><h2 style="font:600 20px/1.3 system-ui">${esc(pageName)} ` +
    `<small style="color:#666;font-weight:400">— высота документа: оригинал ${data.docHeight.original}px / пилот ${data.docHeight.pilot}px</small></h2>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">` +
    `<figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">оригинал (GitHub Pages)</figcaption>` +
    `<img style="width:100%;display:block;border:1px solid #ccc" src="original/${esc(png)}"></figure>` +
    `<figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">пилот на irao-ui</figcaption>` +
    `<img style="width:100%;display:block;border:1px solid #ccc" src="pilot/${esc(png)}"></figure></div>` +
    `<details style="margin-top:8px"><summary style="cursor:pointer;font:13px system-ui;color:#444">пробы (${Object.keys(data.probes).length})</summary>` +
    `<table style="border-collapse:collapse;font:12px/1.5 ui-monospace,monospace;min-width:900px">` +
    `<thead><tr><th style="text-align:left;padding:4px 10px">probe</th><th style="text-align:left;padding:4px 10px">оригинал</th><th style="text-align:left;padding:4px 10px">пилот</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></details></section>`
  );
}).join('\n');

const viewer =
  `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>career-portal: оригинал vs пилот irao-ui</title></head>` +
  `<body style="max-width:1720px;margin:0 auto;padding:24px;font-family:system-ui">` +
  `<h1 style="font:600 28px/1.3 system-ui">career-portal: оригинал vs пилот на irao-ui</h1>` +
  `<p style="color:#555">Скриншоты 1440px, полная страница; пробы — computed-значения из compare.json ` +
  `(сгенерировано ${esc(report.generatedAt)}, воспроизведение — README пилота). Расхождения значений — красным.</p>` +
  viewerSections +
  `</body></html>`;
writeFileSync(join(OUT, 'viewer.html'), viewer);
console.log(`Просмотр: ${join(OUT, 'viewer.html')}`);
