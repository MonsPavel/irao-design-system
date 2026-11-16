/**
 * Юнит-пины T18.10 — макро-вынос обложки страницы в паттерн-слой (спека
 * docs/ui-system/epics/EPIC-18-macro-parity/T18.10-page-head-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон php
 *    — обложка внутренних страниц (порт .page-head/.page-head--split
 *    components.css:36–47, .page-head__note pages.css:31, .page-subtitle
 *    components.css:57–62); значения 1:1, источники *.css:строки в
 *    комментариях (дисциплина паттернов); гейт префиксов слоя расширен (php);
 *  - заголовок страницы — СУЩЕСТВУЮЩАЯ роль ui-page-title (T14.2: тройка
 *    h2 при теге h1 = .page-title career-portal; дельта — раскладка обёртки,
 *    её несёт php); подзаголовок — роли ui-lead + ui-text--muted (слой цвет
 *    не переобъявляет — прецедент dpp__place); max-width 780px — связка
 *    php-subtitle;
 *  - док-паттерны list-page/detail-page — источник правды: раздел
 *    «обложка страницы» несёт те же классы (пин синхронности, прецедент
 *    msh/vcp — pattern-mentorship-capsule.test.js);
 *  - пилот: cp-page-head/cp-page-subtitle сняты из разметки build.mjs и
 *    pilot.css — семейства page-head/page-subtitle уходят из allowlist ценза
 *    (ГЕЙТ: 0 вхождений); лендинги стажировок не сломаны — обложки на
 *    каркасе cvh (cover-hero — отдельная сущность, cvh-канон), их хук
 *    подзаголовка 640px переадресован на php-subtitle;
 *  - compare: пара edu-offers-head — на крючке канона (.php--split).
 *
 * Поверхность браузера (эталоны php-base/php-split, пробы page-head 15
 * страниц Δ≤4px) — e2e/compare-прогоны (ADR-0004: контейнер/CI; пробник
 * .zcode/accept-t1810-page-head.mjs).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-mentorship-capsule.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (практика pattern-mentorship-capsule.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Классы-крючки php- в разметке дока (class="…", комментарии вне). */
const docHooks = (docHtml) => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^php(?:-|__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки php- в правилах слоя. */
const layerHookSet = (layer) => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.php(?:-|__|$)/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);

const listPageHtml = readFileSync(
  join(root, 'patterns', 'list-page', 'list-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');
const detailPageHtml = readFileSync(
  join(root, 'patterns', 'detail-page', 'detail-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон обложки страницы (php, T18.10 Scope)', () => {
  it('обёртка .php: колонка «заголовок → подзаголовок», шаг 16 (gap components.css:39), низ 40 (components.css:40, вне шкалы «как есть»)', () => {
    const php = blockOf(layer, '.php');
    expect(php, '.php найдено').toBeTruthy();
    expect(php, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(php, 'flex-обёртка (components.css:37)').toContain('display: flex;');
    expect(php, 'мобильная база — колонка (components.css:38)').toContain(
      'flex-direction: column;',
    );
    expect(php, 'шаг 16 — --ui-space-4 (components.css:39)').toContain('gap: var(--ui-space-4);');
    expect(php, 'низ 40px «как есть» (components.css:40 — вне шкалы §3.2)').toContain(
      'margin-bottom: 2.5rem;',
    );
  });

  it('--split: правая колонка «На сайте N вакансий» — эффективные значения оригинала (pages.css:24–29): шаг 24, прижатие flex-end на всех ширинах; мобильная база — колонка (components.css:46), строка — от md (components.css:43, инверсия mobile-first)', () => {
    const split = blockOf(layer, '.php--split');
    expect(split, '.php--split найдено').toBeTruthy();
    expect(
      split,
      'строка без wrap — max-content пары «заголовок+кнопка» education уводит вторую колонку на 2-ю строку на одобренных ширинах',
    ).not.toContain('flex-wrap');
    expect(split, 'мобильная база — колонка (components.css:46, инверсия @max-767)').toContain(
      'flex-direction: column;',
    );
    expect(
      split,
      'шаг 24px — pages.css:28 (вторая пара .page-head--split, грузится после components.css и выигрывает каскад)',
    ).toContain('gap: 1.5rem;');
    expect(
      split,
      'align-items: flex-end — pages.css:26 (перебивает components.css:46 flex-start: оригинал прижимает ноту к низу строки и к правому краю в колонке ≤767)',
    ).toContain('align-items: flex-end;');
    expect(
      split,
      'space-between — components.css:43/pages.css:27 (несётся и в колонке ≤767)',
    ).toContain('justify-content: space-between;');
    const md = mediaBlockOf(layer, 768, 'php--split');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(
      md,
      'от md — строка (components.css:43; тот же рендер, что max-width: 767 оригинала)',
    ).toContain('flex-direction: row;');
    expect(md, 'flex-end в ступени не переобъявляется (база — pages.css:26)').not.toContain(
      'align-items',
    );
    expect(md, 'gap/justify в ступени не переобъявляются (база — pages.css:27–28)').not.toMatch(
      /gap|justify-content/,
    );
    const granule = blockOf(layer, '.php--split .php-note');
    expect(
      granule,
      'гранула 32px-гейта T3.6 в ступени md — усадка ноты под переполнением',
    ).toBeTruthy();
    expect(
      granule,
      'усадка ноты — flex-shrink: 1 (pages.css:31 flex: none переобъявляется только под переполнением, класс overflow-wrap: anywhere T17.14)',
    ).toContain('flex-shrink: 1;');
    expect(granule, 'min-width: 0 — прецедент .lpp-row__main (T18.7)').toContain('min-width: 0;');
  });

  it('php-note: правая колонка --split не усаживается (flex: none — .page-head__note pages.css:31); шрифт/цвет несут роли ui-body/ui-text--muted разметки (слой цвет не переобъявляет)', () => {
    const note = blockOf(layer, '.php-note');
    expect(note, '.php-note найдено').toBeTruthy();
    expect(note, 'flex: none — pages.css:31').toContain('flex: none;');
    expect(note, 'цвет слой не переобъявляет — роль ui-text--muted разметки').not.toContain(
      'color',
    );
    expect(
      note,
      'шрифт слой не переобъявляет — роль ui-body разметки (fs-body pages.css:31)',
    ).not.toContain('font');
  });

  it('php-subtitle: max-width 780px «как есть» (components.css:61); цвет/шрифт — роли ui-lead + ui-text--muted разметки', () => {
    const subtitle = blockOf(layer, '.php-subtitle');
    expect(subtitle, '.php-subtitle найдено').toBeTruthy();
    expect(subtitle, 'max-width 48.75rem = 780px — components.css:61').toContain(
      'max-width: 48.75rem;',
    );
    expect(subtitle, 'цвет muted несёт роль ui-text--muted разметки').not.toContain('color');
    expect(subtitle, 'шрифт несёт роль ui-lead разметки (fs-lead components.css:58)').not.toContain(
      'font',
    );
  });

  it('гейт префиксов слоя расширен (php): канон проходит, чужой крючок ловится', () => {
    expect(patternLayerProblems('.php { display: flex; }'), 'php — канонический префикс').toEqual(
      [],
    );
    expect(
      patternLayerProblems('.php--split .ui-button { flex-shrink: 0; }'),
      'php + ui-потомок каноничны',
    ).toEqual([]);
    expect(
      patternLayerProblems('.tl-evil { gap: 4px; }').length,
      'чужой namespace ловится',
    ).toBeGreaterThan(0);
  });

  it('синхронность док ↔ слой: раздел «обложка страницы» в list-page/detail-page несёт ровно те же классы (док — источник правды)', () => {
    const hooks = layerHookSet(layer);
    expect(
      [...hooks].sort(),
      'слой несёт полный API канона: php, php--split, php-note, php-subtitle',
    ).toEqual(['php', 'php--split', 'php-note', 'php-subtitle']);
    for (const [name, html] of [
      ['list-page.html', listPageHtml],
      ['detail-page.html', detailPageHtml],
    ]) {
      const markup = docHooks(html);
      expect(markup.size, `${name}: php-классы в разметке есть`).toBeGreaterThan(0);
      for (const hook of hooks) {
        expect(markup.has(hook), `${name}: крючок «${hook}» из слоя есть в разметке дока`).toBe(
          true,
        );
      }
      for (const name2 of markup) {
        expect(hooks.has(name2), `${name}: класс «${name2}» разметки имеет правило слоя`).toBe(
          true,
        );
      }
    }
    expect(listPageHtml, 'раздел обложки list-page — по имени канона').toContain('php php--split');
    expect(detailPageHtml, 'раздел обложки detail-page — по имени канона').toContain(
      'php php--split',
    );
  });
});

describe('пилот career-portal: обложки страниц на каноне php (T18.10; AC: cp-семейств 0)', () => {
  it('разметка build.mjs: cp-page-head/cp-page-subtitle сняты — обложки на php/php--split/php-subtitle/php-note', () => {
    expect(build, 'cp-page-head из разметки снят').not.toMatch(/class="[^"]*\bcp-page-head/);
    expect(build, 'cp-page-subtitle из разметки снят').not.toMatch(
      /class="[^"]*\bcp-page-subtitle/,
    );
    expect(build, 'вакансии — split-обложка канона (оригинал vacancies.html:149)').toContain(
      '<div class="php php--split">',
    );
    expect(
      build,
      'подзаголовок — связка php-subtitle × ui-lead × ui-text--muted (typography — роли)',
    ).toContain('class="php-subtitle ui-lead ui-text--muted"');
    expect(
      build,
      'нота «На сайте N вакансий» — php-note + роли ui-body/ui-text--muted (fs-body pages.css:31)',
    ).toContain('class="php-note ui-body ui-text--muted"');
    expect(
      build,
      'шапка предложений education — split-обложка + сайт-хук кнопки (edu-offer-head — не-cp крючок)',
    ).toContain('class="php php--split edu-offer-head"');
    expect(
      build,
      'обложка events — каркас cvh (cover-hero — отдельная сущность, cvh-канон)',
    ).toContain('<div class="cvh ev-cover">');
  });

  it('pilot.css: пары cp-page-head/cp-page-subtitle сняты, компенсирующие хуки 16/40 сняты как дубликаты базы канона', () => {
    expect(pilotCss, 'пара .cp-page-head перенесена в слой').not.toContain('.cp-page-head');
    expect(pilotCss, 'пара .cp-page-subtitle перенесена в слой').not.toContain('.cp-page-subtitle');
    expect(
      pilotCss,
      'хук cmp-head снят (шаг 16/низ 40 — теперь база канона php; пин T18.9 снят)',
    ).not.toContain('.cmp-head');
    expect(
      pilotCss,
      'низ .edu-offer-head снят (база канона); хук кнопки flex-shrink остаётся (ui-button не nowrap)',
    ).not.toMatch(/\.edu-offer-head\s*\{[^}]*margin-bottom/);
    expect(pilotCss, 'хук кнопки шапки предложений — остаётся сайт-зоной').toContain(
      '.edu-offer-head .ui-button',
    );
    expect(
      pilotCss,
      'ступень 767 cp-page-head--split снята (мобильная база — канон php)',
    ).not.toMatch(/\.cp-page-head--split/);
  });

  it('хуки подзаголовка обложек лендингов переадресованы на php-subtitle (лендинги на cvh не сломаны — 640px pages.css:965)', () => {
    for (const hook of [
      '.ctr-cover .php-subtitle',
      '.edu-cover .php-subtitle',
      '.int-cover .php-subtitle',
      '.ev-cover .php-subtitle',
    ]) {
      expect(pilotCss, `хук ${hook} — на крючке канона`).toContain(hook);
      expect(
        blockOf(pilotCss, hook),
        `хук ${hook}: max-width 40rem = 640px (pages.css:965)`,
      ).toContain('max-width: 40rem');
    }
    expect(
      blockOf(pilotCss, '.ev-cover'),
      'обложка events на каркасе cvh — без отмены ритма',
    ).not.toContain('margin-bottom');
  });

  it('compare: пара edu-offers-head — на крючке канона .php--split', () => {
    expect(compare).toContain("['edu-offers-head', '.page-head--split', '.php--split']");
    expect(compare).not.toContain("['edu-offers-head', '.page-head--split', '.edu-offer-head']");
  });
});

describe('ценз сайт-зоны: семейства page-head/page-subtitle ушли из allowlist (T18.10 AC)', () => {
  it('allowlist ценза без page-head/page-subtitle — судьба семейств «вынос в слой» (REPORT §11.4)', () => {
    expect(ALLOWED_CP_FAMILIES, 'page-head — вынесена в слой').not.toContain('page-head');
    expect(ALLOWED_CP_FAMILIES, 'page-subtitle — вынесена в слой').not.toContain('page-subtitle');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('hero');
    // errata T18.16: семейство vacancy-search ушло из allowlist (канон vcs
    // слоя) — пин «прочие не тронуты» по нему снят
  });
});
