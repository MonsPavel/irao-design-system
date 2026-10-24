/**
 * Юнит-пин строк списка и сайдбара вакансий (T16.5; Testing requirements —
 * пины исполняемой формы решения до браузерной пробы — практика
 * pilot-education-catalog.test.js T15.3 / pilot-company.test.js T15.2).
 *
 * Канон — ветка «строки» паттерна list-page (T14.10, lpp-row): заголовок-
 * ссылка 20/500 без подчёркивания цветом ТЕКСТА (не heading-navy), паддинг
 * строки 24/28 (pages.css:163), CTA-пилюля — калибровка T16.11 (без
 * site-zone override), «Сбросить» — ui-button--text (T16.7), промо —
 * ui-card--filled. Причина заголовка: ui-h4 даёт 28px на lg (REPORT
 * §8.2 №6, замер fs 20 vs 28) — роль ui-h6 (T16.12, канон «заголовок
 * карточки списков» 20/500 color-text) несёт тройку 20/500 и цвет текста.
 *
 * Поверхность браузера (computed-пары original/clone) — compare.mjs и
 * приёмочная проба; здесь — пины разметки build.mjs, сайт-зоны pilot.css
 * (токены --ui-*, box-sizing ADR-0002, без hex и !important) и проб.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу
 *  шапки; CRLF-хост нормализуется (tests/unit/link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

/** Тело функции целиком (до `}` в начале строки — вложенные скобки
 *  отступом). Вакансии: vacancies.json — источник полей data-*. */
const vacancyRowBody = build.match(/function vacancyRow[\s\S]*?\n\}\n/)?.[0] ?? '';
const vacanciesMainBody = build.match(/function vacanciesMain[\s\S]*?\n\}\n/)?.[0] ?? '';

describe('build.mjs — строка вакансии cp-vac-row по связке lpp-row (T16.5 Scope)', () => {
  it('заголовок строки — h2 роли ui-h6 с ОБЫЧНОЙ ссылкой внутри (класс ui-link снят; T16.12: 20/500 color-text; ui-h4 на lg = 28px — REPORT §8.2 №6)', () => {
    expect(vacancyRowBody).toContain('<h2 class="ui-h6 cp-vac-row__title">');
    expect(vacancyRowBody).toContain('<a href="vacancy.html">');
    expect(
      vacancyRowBody,
      'ui-link в заголовке строки не применяется (fs 28, underline, primary — отклонение)',
    ).not.toContain('ui-link');
    expect(vacancyRowBody, 'ui-h4 не возвращается (fs 28 на lg)').not.toContain('ui-h4');
  });

  it('кликабельная зона — поле заголовка: overlay ui-card--link не включается (Implementation requirements п.1; канон lpp-row — простая ссылка)', () => {
    expect(vacancyRowBody).not.toContain('ui-card--link');
    expect(vacancyRowBody).toContain('<article class="ui-card ui-card--hover cp-vac-row"');
  });

  it('data-атрибуты фильтра строки сохранены в разметке — паритет оригинала (build.py:72–79, мок-фильтрация js/filters.js; Implementation requirements п.2)', () => {
    for (const attr of [
      'data-region="${esc(v.region)}"',
      'data-city="${esc(v.city)}"',
      'data-spec="${esc(v.specialization)}"',
      'data-segment="${esc(v.segment)}"',
      'data-company="${esc(v.company)}"',
      'data-exp="${esc(v.experience)}"',
      'data-position="${esc(v.title.trim().split(/\\s+/)[0])}"',
      'data-accessible="${v.accessible',
      'data-salary="',
      "data-date=\"${esc(v.date.split('.').reverse().join(''))}\"",
    ]) {
      expect(vacancyRowBody, `${attr} — как в оригинале`).toContain(attr);
    }
  });

  it('CTA-пилюля строки — pillButton (ui-button--pill калибровки T16.11); site-zone override вида не заводится (Scope)', () => {
    expect(vacancyRowBody).toContain("pillButton('откликнуться', { target: 'cp-apply-dialog' })");
    expect(pilotCss, 'нет override рамки/цвета иконки пилюли в сайт-зоне').not.toMatch(
      /\.cp-vac-row \.ui-button/,
    );
  });
});

describe('build.mjs — сайдбар фильтров (T16.5 Scope)', () => {
  it('«Сбросить» — ui-button--text (T16.7 доставлен, STATUS: done): outline 52px заменён; AC REPORT §8.2 №6/№8 — fs 14/400 underline muted', () => {
    expect(vacanciesMainBody).toContain(
      '<button class="ui-button ui-button--text" type="button">Сбросить</button>',
    );
    expect(vacanciesMainBody, 'outline-вариант в сайдбаре не остаётся').not.toContain(
      'ui-button--outline',
    );
  });

  it('промо-карточка — ui-card ui-card--filled (существующий API ДС; blue-50 + r16) с primary-кнопкой «узнать подробнее» (tdl none — T16.2)', () => {
    expect(vacanciesMainBody).toContain('<div class="ui-card ui-card--filled cp-vac-side__promo">');
    expect(vacanciesMainBody).toContain(
      '<a class="ui-button ui-button--primary" href="practices.html">узнать подробнее</a>',
    );
  });
});

describe('pilot.css — сайт-зона строки cp-vac-row (T16.5 Scope; токены, ADR-0002)', () => {
  it('строка: box-sizing на корне (ADR-0002) и паддинг 24/28 — var(--ui-space-5) 1.75rem (оригинал .vac-row pages.css:163; канон .lpp-row list-page.html:118)', () => {
    const row = blockOf(pilotCss, '.cp-vac-row');
    expect(row, '.cp-vac-row найдено').toBeTruthy();
    expect(row).toContain('box-sizing: border-box;');
    expect(row).toContain('padding: var(--ui-space-5) 1.75rem;');
    expect(row, 'паддинг 16px (--ui-space-4) — отклонение, снят').not.toContain(
      'padding: var(--ui-space-4);',
    );
  });

  it('main-блок строки: box-sizing (ADR-0002) и min-width: 0 — длинные заголовки переносятся (канон .lpp-row__main, list-page.html:124–131)', () => {
    const main = blockOf(pilotCss, '.cp-vac-row__main');
    expect(main).toContain('box-sizing: border-box;');
    expect(main).toContain('min-width: 0;');
  });

  it('ссылка заголовка — цвет наследует заголовку (текст страницы, НЕ heading-navy), подчёркивания нет (оригинал .vac-row__title a pages.css:169; канон .lpp-row__title a list-page.html:140–143)', () => {
    const anchor = blockOf(pilotCss, '.cp-vac-row__title a');
    expect(anchor, 'сайт-зона для plain <a> (UA-дефолт синий с линией)').toBeTruthy();
    expect(anchor).toContain('color: inherit;');
    expect(anchor).toContain('text-decoration: none;');
  });

  it('hover строки перекрашивает ссылку в primary — только под (hover: hover) (pages.css:178; дисциплина EPIC-4, канон list-page.html:145–148)', () => {
    const hovered = [...pilotCss.matchAll(/@media \(hover: hover\) \{[\s\S]*?\n\}/g)]
      .map((m) => m[0])
      .find((block) => block.includes('.cp-vac-row:hover .cp-vac-row__title a'));
    expect(hovered, 'правило найдено под hover-гвардом').toBeTruthy();
    expect(hovered).toContain('color: var(--ui-color-primary);');
  });

  it('«Сбросить» прижата к левому краю панели: align-self flex-start (оригинал .vac-side__reset pages.css:101); высота/подчёркивание/цвет — сам компонент ui-button--text (T16.7)', () => {
    const align = blockOf(pilotCss, '.cp-vac-side > .ui-button--text');
    expect(align, 'сайт-зона задаёт только положение в панели').toBeTruthy();
    expect(align).toContain('align-self: flex-start;');
    expect(align, 'высота/цвет/линия — зона компонента, не сайта').not.toMatch(
      /height|color|text-decoration/,
    );
  });

  it('промо-карточка без геометрических override: ui-card--filled несёт bg/радиус/паддинг сам (паддинг 24 vs 20 — «принято ДС» REPORT §3.3/mapping)', () => {
    expect(
      blockOf(pilotCss, '.cp-vac-side__promo'),
      'правило удалено — остаётся hook пробы',
    ).toBeNull();
  });

  it('в блоке строки/сайдбара нет hex и !important (инварианты системы)', () => {
    const start = pilotCss.indexOf('.cp-vac-rows');
    const end = pilotCss.indexOf('.cp-vac-main');
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — пробы строк/сайдбара (T16.5; Testing requirements: замер как §8.2 №6)', () => {
  it('probe row-title смотрит на новую роль заголовка (.ui-h6): селектор по роли, не по тегу', () => {
    expect(compare).toContain("pilot: '.cp-vac-row .ui-h6'");
    expect(compare, 'старый селектор ui-h4 снят').not.toContain("pilot: '.cp-vac-row .ui-h4'");
  });

  it('промо-карточка и её primary-кнопка покрыты пробами (AC: ui-card--filled blue-50/r16, кнопка tdl none)', () => {
    expect(compare).toContain("name: 'side-promo'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo'");
    expect(compare).toContain("name: 'promo-btn'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo .ui-button--primary'");
  });
});
