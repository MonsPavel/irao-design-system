/**
 * Юнит-пины a11y-фикса закрывающей пересверки (T15.9, ревью приёмки):
 * AC «axe-пробы новых страниц: только известные исключения
 * (KNOWN_AXE_EXCEPTIONS)» не выполнялся буквально — вне реестра были
 * 1) axe `heading-order` на events-search/education-catalog (карточки
 * несут h3 сразу после h1-страницы — пропуск уровня; канон ДС
 * base/typography.css: «семантику страницы даёт реальный тег,
 * h1→h2→h3 без пропусков — гейты irao/heading-order; класс — вид»);
 * 2) color-contrast на кнопках offer-карточек «сайт „Работа России"» —
 * та же одобренная пара `.ui-button--accent` 3.12:1, но цели axe несут
 * атрибутные суффиксы ([href$=…][target=_blank]), которые регэксп
 * записи реестра не матчит.
 *
 * Фикс (этот файл — красный до него):
 *  - build.mjs: тег заголовка карточки — параметр eventCard/offerCard с
 *    дефолтом 'h3' (старые events/education/event не меняются), выдача
 *    новых events-search/education-catalog собирается с 'h2' (h1 → h2
 *    карточек — без пропуска; вид несёт роль ui-h6 с T16.12, тег не влияет);
 *  - tests/helpers/harness.js: match записи `.ui-button--accent`
 *    дополнен lookahead'ом `[` — атрибутные суффиксы той же кнопки
 *    того же класса попадают в то же исключение (не новое исключение —
 *    тот же одобренный элемент; правило tests/README.md «расширять —
 *    только записью сюда + в таблицу» соблюдено строкой таблицы).
 *
 * Поверхность браузера (axe на живых страницах dist) — проба
 * .zcode/t159-axe-new-pages.mjs по протоколу T14.12 (не CI-гейт);
 * здесь — пины исполняемой формы решения (практика
 * pilot-events-search-pagination.test.js).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_AXE_EXCEPTIONS, unexpectedViolations } from '../../tests/helpers/harness.js';

const root = join(import.meta.dirname, '..', '..');

/** CRLF-хост нормализуется (tests/unit/link.test.js). */
const build = readFileSync(join(root, 'pilot', 'career-portal', 'build.mjs'), 'utf8').replace(
  /\r\n/g,
  '\n',
);

/** Тело функции до следующей секции-комментария `/* ──` (практика
 *  pilot-events-search-pagination.test.js). */
const sectionBody = (source, name) =>
  source.match(new RegExp(`function ${name}[\\s\\S]*?(?=\\n/\\* ──)`))?.[0] ?? '';

const eventsMainBody = sectionBody(build, 'eventsMain');
const eventsSearchMainBody = sectionBody(build, 'eventsSearchMain');
const catalogMainBody = sectionBody(build, 'educationCatalogMain');
const eventCardBody = sectionBody(build, 'eventCard');
const offerCardBody = sectionBody(build, 'offerCard');

describe('build.mjs — заголовки карточек новых страниц без пропуска уровней (T15.9)', () => {
  it('events-search: выдача — тот же eventCard, но с тегом h2 (h1 страницы → h2 карточек: первая карточка следует прямо за заголовком страницы)', () => {
    expect(eventsSearchMainBody).toContain(`EVT.upcoming.map((event) => eventCard(event, 'h2'))`);
  });

  it('events.html не тронут: обычный map(eventCard) — h3 карточек там идут после секций h2 «Предстоящие»/«Прошедшие», порядок не нарушен (старая страница вне AC новых)', () => {
    expect(eventsMainBody).toContain('EVT.upcoming.map(eventCard)');
    expect(eventsMainBody).toContain('EVT.past.map(eventCard)');
  });

  it('education-catalog: предложения — offerCard с тегом h2 (первый offer следует за h1 без промежуточной секции — цель axe «.cp-offer-card__head > h3»)', () => {
    expect(catalogMainBody).toContain(`EDU.offers.map((offer) => offerCard(offer, 'h2'))`);
  });

  it('eventCard/offerCard: тег заголовка — через map-безопасный cardHeading (дефолт h3; идиома .map(eventCard) передаёт (элемент, индекс) — числовой индекс не становится тегом, регрессия сборки 24.10 «<0 class="ui-h6">» в dist пинится санитайзером h1–h6); вид несёт роль ui-h6 (T16.12: канон карточки списков 20/500) — тег не влияет на computed-стили', () => {
    expect(build).toContain(
      `const cardHeading = (headingTag) => (/^h[1-6]$/.test(headingTag ?? '') ? headingTag : 'h3');`,
    );
    expect(eventCardBody).toMatch(/function eventCard\(e, headingTag\)/);
    expect(eventCardBody).toMatch(/<\$\{cardHeading\(headingTag\)\} class="ui-h6">/);
    expect(offerCardBody).toMatch(/function offerCard\(o, headingTag\)/);
    expect(offerCardBody).toMatch(/<\$\{cardHeading\(headingTag\)\} class="ui-h6 ui-h6--primary">/);
  });
});

describe('build.mjs — старые страницы media/career-track без пропуска уровней (решение владельца 25.10, T15.9-бэклог)', () => {
  it('media.html: выдача articleCard с h2 (карточки сразу за h1 — axe heading-order «.ui-card__link > h3»)', () => {
    expect(build).toContain(`ART.items.map((item) => articleCard(item, 'h2'))`);
  });

  it('career-track.html: трек-карточки h2 (сразу за h1, до секции «Материалы»), вид — та же роль ui-h4', () => {
    const trackBody = build.match(/function careerTrackMain[\s\S]*?(?=\n\/\* ──)/)?.[0] ?? '';
    expect(trackBody).toContain('<h2 class="ui-h4">${esc(track.name)}</h2>');
  });

  it('articleCard параметризован по образцу eventCard (map-безопасный cardHeading, дефолт h3); «Материалы по теме» career-track — дефолт h3 после секционного h2 — не меняется', () => {
    expect(build).toMatch(/function articleCard\(a, headingTag = 'h3'\)/);
    // тег — через локальный heading (cardHeading), как eventCard/offerCard
    expect(build).toContain('const heading = cardHeading(headingTag);');
    expect(build).toMatch(/<\$\{heading\} class="ui-small cp-article-card__title">/);
    expect(build).toContain('ART.items.slice(0, 4).map(articleCard)');
  });
});

describe('KNOWN_AXE_EXCEPTIONS — атрибутные цели того же класса accent (T15.9)', () => {
  /** Цвет-контраст узел: id + цель (форма результатов axe). */
  const contrastNode = (target) => ({
    id: 'color-contrast',
    nodes: [{ target: [target] }],
  });

  it('кнопка «сайт „Работа России"» offer-карточки — цель с [href][target] — та же одобренная пара .ui-button--accent 3.12:1, известна реестру', () => {
    const results = {
      violations: [
        contrastNode(
          '.cp-offer-card:nth-child(1) > .cp-offer-card__footer > .ui-button--accent[href$="trudvsem.ru/"][target="_blank"]',
        ),
      ],
    };
    expect(unexpectedViolations(results)).toEqual([]);
  });

  it('негативный контроль: нарушение вне реестра (heading-order) остаётся неожиданным — реестр не расширяется мимо одобренных пар', () => {
    const results = {
      violations: [{ id: 'heading-order', nodes: [{ target: ['.cp-offer-card__head > h3'] }] }],
    };
    expect(unexpectedViolations(results)).toEqual(['heading-order → .cp-offer-card__head > h3']);
  });

  it('прежнее поведение в силе: голый .ui-button--accent, стендовый #ui-button-accent и цепочка классов .ui-button--accent.ui-button[type…] известны; более длинное имя класса (.ui-button--accent-hover) — НЕ исключение (сужения/расширения мимо класса нет); реестр не пустеет', () => {
    expect(
      unexpectedViolations({
        violations: [contrastNode('.cp-find-bar > .ui-button--accent.ui-button[type="submit"]')],
      }),
    ).toEqual([]);
    expect(unexpectedViolations({ violations: [contrastNode('#ui-button-accent')] })).toEqual([]);
    expect(
      unexpectedViolations({ violations: [contrastNode('.x .ui-button--accent-hover')] }),
    ).toEqual(['color-contrast → .x .ui-button--accent-hover']);
    expect(KNOWN_AXE_EXCEPTIONS.length).toBe(5); // 4 кнопочных + .ui-video__play (T17.6)
  });
});
