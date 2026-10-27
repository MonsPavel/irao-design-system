/**
 * Юнит-пины строк списка и сайдбара вакансий (T16.5; Testing requirements —
 * пины исполняемой формы решения до браузерной пробы — практика
 * pilot-education-catalog.test.js T15.3 / pilot-company.test.js T15.2).
 *
 * С T17.1 связки строк/сайдбара — ПАТТЕРН-СЛОЙ (вариант A, решение
 * владельца 25.10): разметка build.mjs несёт классы lpp-* канона list-page,
 * значения живут в patterns/patterns.css → dist/ui-patterns.css (копипаста
 * cp-vac-row-семейства, cp-vac-layout, cp-vac-side-семейства и
 * cp-breadcrumbs снята из pilot.css — урок T16.5: копипаста дрейфует, слой
 * делает канон исполняемым). Пины значений строки/сайдбара переведены с
 * pilot.css на слой; в pilot.css остались только шимы сайт-зоны (cp-pill до
 * T17.12, положение «Сбросить») и ритм страниц без канона в док-HTML
 * (cp-page-head, cp-find-bar).
 *
 * Канон — ветка «строки» паттерна list-page (T14.10, lpp-row): заголовок-
 * ссылка 20/500 без подчёркивания цветом ТЕКСТА (не heading-navy), паддинг
 * строки 24/28 (pages.css:165), CTA-пилюля — калибровка T16.11 (без
 * site-zone override), «Сбросить» — ui-button--text (T16.7), промо —
 * ui-card--filled. Причина заголовка: ui-h4 даёт 28px на lg (REPORT
 * §8.2 №6, замер fs 20 vs 28) — роль ui-h6 (T16.12, канон «заголовок
 * карточки списков» 20/500 color-text) несёт тройку 20/500 и цвет текста.
 *
 * Поверхность браузера (computed-пары original/clone) — compare.mjs и
 * приёмочная проба; здесь — пины разметки build.mjs, слоя patterns.css,
 * шимов pilot.css (токены --ui-*, box-sizing ADR-0002, без hex и
 * !important) и проб.
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
/** Паттерн-слой (T17.1): источник значений строк/сайдбара. */
const layer = stripCssComments(readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8'));

/** Тело функции целиком (до `}` в начале строки — вложенные скобки
 *  отступом). Вакансии: vacancies.json — источник полей data-*. */
const vacancyRowBody = build.match(/function vacancyRow[\s\S]*?\n\}\n/)?.[0] ?? '';
const vacanciesMainBody = build.match(/function vacanciesMain[\s\S]*?\n\}\n/)?.[0] ?? '';

describe('build.mjs — строка вакансии на связке слоя lpp-row (T16.5 + T17.1 Scope)', () => {
  it('заголовок строки — h2 роли ui-h6 с ОБЫЧНОЙ ссылкой внутри (класс ui-link снят; T16.12: 20/500 color-text; ui-h4 на lg = 28px — REPORT §8.2 №6)', () => {
    expect(vacancyRowBody).toContain('<h2 class="ui-h6 lpp-row__title">');
    expect(vacancyRowBody).toContain('<a href="vacancy.html">');
    expect(
      vacancyRowBody,
      'ui-link в заголовке строки не применяется (fs 28, underline, primary — отклонение)',
    ).not.toContain('ui-link');
    expect(vacancyRowBody, 'ui-h4 не возвращается (fs 28 на lg)').not.toContain('ui-h4');
  });

  it('кликабельная зона — поле заголовка: overlay ui-card--link не включается (Implementation requirements п.1; канон lpp-row — простая ссылка)', () => {
    expect(vacancyRowBody).not.toContain('ui-card--link');
    expect(vacancyRowBody).toContain('<article class="ui-card ui-card--hover lpp-row"');
  });

  it('data-атрибуты фильтра строки сохранены в разметке — паритет оригинала (build.py:74–79, мок-фильтрация js/filters.js; Implementation requirements п.2)', () => {
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
      /\.lpp-row \.ui-button/,
    );
  });
});

describe('build.mjs — сайдбар фильтров (T16.5 Scope; классы — слой T17.1)', () => {
  it('«Сбросить ×» — ui-button--text (T16.7 доставлен; × — паритет оригинала, vacancies.html:123, T16.5-бэклог): outline 52px заменён; AC REPORT §8.2 №6/№8 — fs 14/400 underline muted', () => {
    expect(vacanciesMainBody).toContain(
      '<button class="ui-button ui-button--text" type="button">Сбросить &times;</button>',
    );
    expect(vacanciesMainBody, 'outline-вариант в сайдбаре не остаётся').not.toContain(
      'ui-button--outline',
    );
  });

  it('промо-карточка — ui-card ui-card--filled (существующий API ДС; blue-50 + r16) с primary-кнопкой «узнать подробнее» (tdl none — T16.2); класс-хук пробы side-promo сохранён', () => {
    expect(vacanciesMainBody).toContain('<div class="ui-card ui-card--filled cp-vac-side__promo">');
    expect(vacanciesMainBody).toContain(
      '<a class="ui-button ui-button--primary" href="practices.html">узнать подробнее</a>',
    );
  });
});

describe('паттерн-слой — значения строки lpp-row (T16.5 пины на слой T17.1; токены, ADR-0002)', () => {
  it('строка: box-sizing на корне (ADR-0002), паддинг 24/28 — var(--ui-space-5) 1.75rem (оригинал .vac-row pages.css:165; канон .lpp-row list-page) и flex-direction: row — сброс колонки ui-card (карточка — flex-колонка, связка обязана вернуть ряд)', () => {
    const row = blockOf(layer, '.lpp-row');
    expect(row, '.lpp-row найдено в слое').toBeTruthy();
    expect(row).toContain('box-sizing: border-box;');
    expect(row).toContain('flex-direction: row;');
    expect(row).toContain('padding: var(--ui-space-5) 1.75rem;');
    expect(row, 'паддинг 16px (--ui-space-4) — отклонение, снят').not.toContain(
      'padding: var(--ui-space-4);',
    );
  });

  it('main-блок строки: box-sizing (ADR-0002), шаг 8px (--ui-space-2 — .vac-row__main pages.css:168) и min-width: 0 — длинные заголовки переносятся', () => {
    const main = blockOf(layer, '.lpp-row__main');
    expect(main).toContain('box-sizing: border-box;');
    expect(main).toContain('gap: var(--ui-space-2);');
    expect(main).toContain('min-width: 0;');
  });

  it('лента строк: шаг 16px (--ui-space-4 — .vac-rows pages.css:154)', () => {
    expect(blockOf(layer, '.lpp-rows')).toContain('gap: var(--ui-space-4);');
  });

  it('ссылка заголовка — цвет наследует заголовку (текст страницы, НЕ heading-navy), подчёркивания нет (оригинал .vac-row__title a pages.css:172)', () => {
    const anchor = blockOf(layer, '.lpp-row__title a');
    expect(anchor, 'слой для plain <a> (UA-дефолт синий с линией)').toBeTruthy();
    expect(anchor).toContain('color: inherit;');
    expect(anchor).toContain('text-decoration: none;');
  });

  it('hover строки перекрашивает ссылку в primary — только под (hover: hover) (pages.css:178; дисциплина EPIC-4)', () => {
    const hovered = [...layer.matchAll(/@media \(hover: hover\) \{[\s\S]*?\n\}/g)]
      .map((m) => m[0])
      .find((block) => block.includes('.lpp-row:hover .lpp-row__title a'));
    expect(hovered, 'правило найдено под hover-гвардом').toBeTruthy();
    expect(hovered).toContain('color: var(--ui-color-primary);');
  });
});

describe('pilot.css — шимы сайт-зоны на крючках слоя (T17.1)', () => {
  it('«Сбросить» прижата к левому краю панели: align-self flex-start (оригинал .vac-side__reset pages.css:101); высота/подчёркивание/цвет — сам компонент ui-button--text (T16.7)', () => {
    const align = blockOf(pilotCss, '.lpp-side > .ui-button--text');
    expect(align, 'сайт-зона задаёт только положение в панели').toBeTruthy();
    expect(align).toContain('align-self: flex-start;');
    expect(align, 'высота/цвет/линия — зона компонента, не сайта').not.toMatch(
      /height|color|text-decoration/,
    );
  });

  it('пилюля сайдбара — шим flex-basis: auto на крючке слоя (cp-pill до T17.12)', () => {
    const shim = blockOf(pilotCss, '.lpp-side__group .cp-pill');
    expect(shim, 'шим на крючке канона lpp-side__group').toBeTruthy();
    expect(shim).toContain('flex-basis: auto;');
  });

  it('промо-карточка без геометрических override: ui-card--filled несёт bg/радиус/паддинг сам (паддинг 24 vs 20 — «принято ДС» REPORT §3.3/mapping)', () => {
    expect(
      blockOf(pilotCss, '.cp-vac-side__promo'),
      'правило удалено — остаётся hook пробы',
    ).toBeNull();
  });

  it('в блоке шимов сайдбара нет hex и !important (инварианты системы)', () => {
    const start = pilotCss.indexOf('.lpp-side__group .cp-pill');
    const end = pilotCss.indexOf('.cp-vac-main');
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — пробы строк/сайдбара (T16.5; Testing requirements: замер как §8.2 №6)', () => {
  it('probe row-title смотрит на новую роль заголовка (.ui-h6): селектор по роли, не по тегу', () => {
    expect(compare).toContain("pilot: '.lpp-row .ui-h6'");
    expect(compare, 'старый селектор ui-h4 снят').not.toContain("pilot: '.lpp-row .ui-h4'");
  });

  it('промо-карточка и её primary-кнопка покрыты пробами (AC: ui-card--filled blue-50/r16, кнопка tdl none)', () => {
    expect(compare).toContain("name: 'side-promo'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo'");
    expect(compare).toContain("name: 'promo-btn'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo .ui-button--primary'");
  });
});

describe('probe-vac-rows.mjs — закрывающая проба data-*/строк (ревью T16.5)', () => {
  /** JS без блочных комментариев: пины смотрят на исполняемый код. */
  const probe = readFileSync(join(pilotDir, 'probe-vac-rows.mjs'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('скрипт пробы закоммичен в инструментарий пилота (REPORT §8.2 №6 ссылается на него как на закрывающее доказательство)', () => {
    expect(probe.length).toBeGreaterThan(500);
  });

  it('data-* читаются с САМОЙ строки — те же пер-сторонние селекторы, что у пары row-item (.vac-row / .lpp-row); подстрочный [class*="vac-row"] матчит контейнер vac-rows и даёт 10×null — холостая сверка (замечание ревью)', () => {
    expect(probe).toContain("const ROW_SELECTOR = { original: '.vac-row', pilot: '.lpp-row' };");
    expect(probe, 'подстрочный селектор контейнера снят (в коде)').not.toContain(
      '[class*="vac-row"]',
    );
  });

  it('нулевые значения не проходят за MATCH: отсутствующая строка — ошибка пробы, а не null-список', () => {
    expect(probe).toMatch(/row is missing/i);
  });
});
