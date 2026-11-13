/**
 * Юнит-пины T18.11 — макро-вынос строки табов-ссылок в паттерн-слой (спека
 * docs/ui-system/epics/EPIC-18-macro-parity/T18.11-tabs-row-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон tnv —
 *    строка «табы + ссылки разделов» (порт .cp-tabs-row/.cp-tabs-links
 *    pilot.css:2109–2120 и хуков .int-tabs, замер 06.11); значения 1:1,
 *    источники в комментариях (дисциплина паттернов); гейт префиксов слоя
 *    расширен (tnv);
 *  - СТЫК (аргументация в спеке-итоге): канон слоя, НЕ расширение ui-tabs API.
 *    Прецедент T17.12 (ui-select--pill — API-модификатор) не применяется:
 *    там переиспользовался каркас самого компонента (геометрия select);
 *    здесь вид пилюль несёт СУЩЕСТВУЮЩИЙ модификатор ui-tabs--pill (T14.9),
 *    активность межстраничных ссылок — его aria-current-ветка (T17.11),
 *    а cp-остаток — раскладка страницы (ряд «лента + nav» одной полосой,
 *    лента ссылок, погашение DS-маргина ленты в ряду) — зона паттерн-слоя
 *    (README ui-tabs «Модификатор --pill»; прецедент nvp T17.11). Ссылки в
 *    nav — вне tablist (правило ui-tabs): режим «link-лента» на ui-tabs
 *    размыл бы контракт T13.6 и стилизовал бы элементы вне BEM-дерева;
 *  - клавиатура/aria (Implementation requirements п.2): смешанный набор несёт
 *    настоящий tablist на ui-tabs (data-ui-tabs + панели-подсказки T15.4) —
 *    компонент даёт roving tabindex/APG автоматически; начальный выбор —
 *    aria-current="page" (T14.9), активную пилюлю красит модификатор
 *    (1:1 pages.css:1000 — active-состояние, Implementation requirements п.1);
 *  - док-паттерн list-page — источник правды: раздел «строка табов + ссылок»
 *    несёт те же классы (пин синхронности, прецедент php T18.10);
 *  - пилот: cp-tabs-row/cp-tabs-links сняты из разметки build.mjs и pilot.css
 *    — семейства tabs-row/tabs-links уходят из allowlist ценза (ГЕЙТ: 0
 *    вхождений); хуки .int-tabs .cp-tabs-row (nowrap + маргин) сняты как
 *    ступень/сброс канона; секция int-tabs (pt 24/pb 40) — сайт-зона остаётся;
 *  - compare: блок-пары internships/practices — на крючке канона (.tnv).
 *
 * Мобильная база канона — осознанное отклонение от оригинала (прецедент nvp
 * T17.11: оригинал держит ряд на всех ширинах — grid 5×1fr pages.css:974
 * без мобильной ветки): база канона — перенос (лента ДС, без горизонтального
 * скролла), «одна полоса» — от md (768, шкала T2.5). Desktop-рендер (≥768)
 * 1:1 оригиналу и принятому пилоту; на 375/32px-базе T3.6 nowrap min-content
 * ряда (~440px) не проходит — гранула переноса обязательна.
 *
 * Поверхность браузера (эталоны tnv-row desktop/mobile + tnv-tab-active,
 * пробы internships/practices Δ≤4px) — e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-page-head.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (практика pattern-page-head.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Классы-крючки tnv- в разметке дока (class="…", комментарии вне). */
const docHooks = (docHtml) => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^tnv(?:__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки tnv- в правилах слоя. */
const layerHookSet = (layer) => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.tnv(?:__|$)/.test(hook)) hooks.add(hook.slice(1));
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

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон строки табов + ссылок (tnv, T18.11 Scope)', () => {
  it('ряд .tnv: flex «табы + ссылки», шаг 8/16 (gap .cp-tabs-row pilot.css:2112), центр строки; box-sizing на корне (ADR-0002)', () => {
    const tnv = blockOf(layer, '.tnv');
    expect(tnv, '.tnv найдено').toBeTruthy();
    expect(tnv, 'box-sizing на корне связки — ADR-0002').toContain('box-sizing: border-box;');
    expect(tnv, 'flex-ряд (.cp-tabs-row pilot.css:2110)').toContain('display: flex;');
    expect(tnv, 'мобильная база — перенос (лента ДС; ступень md ниже, прецедент nvp)').toContain(
      'flex-wrap: wrap;',
    );
    expect(tnv, 'шаг 8/16 — gap .cp-tabs-row (pilot.css:2112) 1:1').toContain(
      'gap: var(--ui-space-2) var(--ui-space-4);',
    );
    expect(tnv, 'центр строки (.cp-tabs-row pilot.css:2113)').toContain('align-items: center;');
  });

  it('ступень md (768, шкала T2.5): «одна полоса» оригинала — nowrap (pages.css:974 grid 5 колонок без переноса; замер 06.11 — перенос канона давал ряд 92px)', () => {
    const md = mediaBlockOf(layer, 768, 'tnv');
    expect(md, 'ступень md канона есть').toBeTruthy();
    expect(md, 'от md ряд без переноса (одна полоса, порт хука .int-tabs)').toContain(
      'flex-wrap: nowrap;',
    );
    expect(md, 'шаг/выравнивание в ступени не переобъявляются (база)').not.toMatch(
      /gap|align-items/,
    );
  });

  it('.tnv .ui-tabs__list: DS-маргин ленты (ритм «лента → панель») в ряду погашен — замер 06.11: маргин давал ряд 92px (панелей-подсказок в потоке нет, ритм ведёт секция; прецедент сброса .nvp)', () => {
    const list = blockOf(layer, '.tnv .ui-tabs__list');
    expect(list, '.tnv .ui-tabs__list найдено').toBeTruthy();
    expect(list, 'нижний маргин ленты снят (порт хука .int-tabs)').toContain('margin-bottom: 0;');
  });

  it('.tnv__links — лента ссылок разделов: inline-flex с переносом, шаг 8/16 (.cp-tabs-links pilot.css:2116–2120); цвет/шрифт ссылок слой не переобъявляет (роль ui-link разметки)', () => {
    const links = blockOf(layer, '.tnv__links');
    expect(links, '.tnv__links найдено').toBeTruthy();
    expect(links, 'box-sizing на корне связки — ADR-0002').toContain('box-sizing: border-box;');
    expect(links, 'inline-flex (.cp-tabs-links pilot.css:2117)').toContain('display: inline-flex;');
    expect(links, 'перенос строк ленты (.cp-tabs-links pilot.css:2118)').toContain(
      'flex-wrap: wrap;',
    );
    expect(links, 'шаг 8/16 — gap .cp-tabs-links (pilot.css:2119) 1:1').toContain(
      'gap: var(--ui-space-2) var(--ui-space-4);',
    );
    expect(links, 'цвет несёт роль ui-link разметки').not.toContain('color');
    expect(links, 'шрифт несёт роль ui-link разметки').not.toContain('font');
  });

  it('гейт префиксов слоя расширен (tnv): канон проходит, ui-потомок проходит, чужой крючок ловится', () => {
    expect(patternLayerProblems('.tnv { display: flex; }'), 'tnv — канонический префикс').toEqual(
      [],
    );
    expect(
      patternLayerProblems('.tnv .ui-tabs__list { margin-bottom: 0; }'),
      'tnv + ui-потомок каноничны',
    ).toEqual([]);
    expect(
      patternLayerProblems('.tn-evil { gap: 4px; }').length,
      'чужой namespace ловится',
    ).toBeGreaterThan(0);
  });

  it('синхронность док ↔ слой: раздел «строка табов + ссылок» в list-page несёт ровно те же классы (док — источник правды, прецедент php T18.10)', () => {
    const hooks = layerHookSet(layer);
    expect(
      [...hooks].sort(),
      'слой несёт полный API канона: tnv, tnv__links',
    ).toEqual(['tnv', 'tnv__links']);
    const markup = docHooks(listPageHtml);
    expect(markup.size, 'list-page.html: tnv-классы в разметке есть').toBeGreaterThan(0);
    for (const hook of hooks) {
      expect(markup.has(hook), `list-page: крючок «${hook}» из слоя есть в разметке дока`).toBe(
        true,
      );
    }
    for (const name of markup) {
      expect(hooks.has(name), `list-page: класс «${name}» разметки имеет правило слоя`).toBe(true);
    }
    expect(listPageHtml, 'раздел строки — по имени канона').toContain('class="tnv"');
    expect(listPageHtml, 'лента ссылок — по имени канона').toContain('tnv__links');
  });
});

describe('пилот career-portal: строка табов+ссылок на каноне tnv (T18.11; AC: cp-семейств 0)', () => {
  it('разметка build.mjs: cp-tabs-row/cp-tabs-links сняты — ряд на tnv, лента ссылок на tnv__links, tablist/панели-подсказки сохранены', () => {
    expect(build, 'cp-tabs-row из разметки снят').not.toMatch(/class="[^"]*\bcp-tabs-row/);
    expect(build, 'cp-tabs-links из разметки снят').not.toMatch(/class="[^"]*\bcp-tabs-links/);
    expect(build, 'ряд — канон tnv слоя').toContain('<div class="tnv">');
    expect(build, 'лента ссылок — связка tnv__links слоя').toContain('<nav class="tnv__links"');
    expect(build, 'tablist сохранён (клавиатура/aria — компонент, п.2)').toContain(
      '<div class="ui-tabs ui-tabs--pill" data-ui-tabs>',
    );
    expect(build, 'панели-подсказки T15.4 сохранены (ui-vh)').toMatch(
      /class="ui-tabs__panel ui-vh"/,
    );
  });

  it('pilot.css: пары .cp-tabs-row/.cp-tabs-links сняты, хуки .int-tabs сняты как ступень/сброс канона; секция int-tabs (pt 24/pb 40) — сайт-зона остаётся', () => {
    expect(pilotCss, 'пара .cp-tabs-row перенесена в слой').not.toContain('.cp-tabs-row');
    expect(pilotCss, 'пара .cp-tabs-links перенесена в слой').not.toContain('.cp-tabs-links');
    expect(
      blockOf(pilotCss, '.int-tabs'),
      'ритм секции int-tabs — сайт-зона (pt 24 inline оригинала)',
    ).toContain('padding-top: 1.5rem');
    expect(blockOf(pilotCss, '.int-tabs'), 'низ секции — 40 (.section)').toContain(
      'padding-bottom: 2.5rem',
    );
  });

  it('compare: блок-пары internships/practices — на крючке канона .tnv (прецедент lpp-/nvp-)', () => {
    expect(compare, 'проба tabs internships — на крючке слоя').toContain(
      "['tabs', '.tabs-pill', '.tnv']",
    );
    expect(compare, 'проба tabs practices — на крючке слоя').toContain(
      "['tabs', '.tabs-pill', '.tnv']",
    );
    expect(compare).not.toContain('.cp-tabs-row');
  });
});

describe('ценз сайт-зоны: семейства tabs-row/tabs-links ушли из allowlist (T18.11 AC)', () => {
  it('allowlist ценза без tabs-row/tabs-links — судьба семейств «вынос в слой» (REPORT §11.4)', () => {
    expect(ALLOWED_CP_FAMILIES, 'tabs-row — вынесена в слой').not.toContain('tabs-row');
    expect(ALLOWED_CP_FAMILIES, 'tabs-links — вынесена в слой').not.toContain('tabs-links');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('hero');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('dir-modal');
  });
});
