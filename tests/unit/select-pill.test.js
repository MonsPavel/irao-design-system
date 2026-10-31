/**
 * Юнит-пины T17.12 — пилюля select-фильтра и find-bar (спека
 * docs/ui-system/epics/EPIC-17-ds-full-coverage/T17.12-filter-pill.md).
 *
 * Исполняемая форма решения:
 *  - ДС: модификатор `ui-select--pill` на КЛАССЕ-ОБЁРТКЕ (пример спеки:
 *    <div class="ui-select--pill"><select data-ui-select="wrap">…) — несёт
 *    ТОЛЬКО геометрию пилюли (рамка/радиус/фон + компоновка обёртки);
 *    ширину (flex-basis) и позиционный контекст модификатор не задаёт:
 *    ширина — раскладка сайта (12rem лента / 260px каталог), позицию
 *    гарантирует модуль (контракт wrap, ui-select.js); внутренности
 *    listbox/триггера не меняются (Implementation requirements п.1);
 *  - паттерн-слой: lpp-filters — лента пилюль gap 16 (space-4) с шириной
 *    пилюль 260px (значение канона list-page, AC); lpp-find — find-bar
 *    (поле+кнопка, gap 8, ритм снизу 8 — метрики принятого findBar T15.5);
 *  - док-канон list-page — источник правды: разметка lpp-find в
 *    patterns/list-page/list-page.html (синхронность пинит
 *    patterns-layer.test.js);
 *  - пилот: cp-pill/cp-find-bar/cp-catalog-filters сняты из разметки
 *    (build.mjs) и pilot.css; сайдбарный шим flex-basis снят (модификатор
 *    flex-basis не несёт); hero-панель держит 12rem правилом сайта;
 *  - стенд ui-select — секция «фильтр-пилюля» (#uiss-pill).
 *
 * Поверхность браузера (открытый listbox в пилюле, axe, эталоны) —
 * tests/e2e/ui-select.spec.js; значения пилюль против оригинала —
 * compare/probe-проба пилота.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const componentCss = readFileSync(join(root, 'components/ui-select/ui-select.css'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const layer = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const doc = readFileSync(join(root, 'patterns/list-page/list-page.html'), 'utf8');
const readme = readFileSync(join(root, 'components/ui-select/README.md'), 'utf8');
const stand = readFileSync(join(root, 'showcase/pages/ui-select/index.html'), 'utf8');
const pilotBuild = readFileSync(join(root, 'pilot/career-portal/build.mjs'), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const pilotCss = readFileSync(join(root, 'pilot/career-portal/pilot.css'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Блок правила по селектору (точное совпадение начала). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('ДС: модификатор ui-select--pill (компонент, Implementation requirements п.1–2)', () => {
  it('правило есть, селектор — на обёртке (пример спеки), блок-класс без потомков', () => {
    const block = blockOf(componentCss, '.ui-select--pill');
    expect(block, '.ui-select--pill найдено').toBeTruthy();
  });

  it('геометрия пилюли: без рамки (dead-токен исходника закреплён явно), радиус pill, фон surface-muted (канон cp-pill/T16.11)', () => {
    const block = blockOf(componentCss, '.ui-select--pill');
    expect(block, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(
      block,
      'рамки нет — cp-pill вёл несуществующий --ui-color-border, рендер без рамки',
    ).toContain('border: none;');
    expect(block, 'радиус пилюли').toContain('border-radius: var(--ui-radius-pill);');
    expect(block, 'радиус пилюли').toContain('border-radius: var(--ui-radius-pill);');
    expect(block, 'фон пилюли — surface-muted (blue-50)').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
  });

  it('компоновка обёртки: inline-flex по центру (select в потоке держит высоту, триггер растягивается wrap-модификатором)', () => {
    const block = blockOf(componentCss, '.ui-select--pill');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('align-items: center;');
  });

  it('растяжка пилюли — от поля: select несёт ui-field__select (width: 100% и высота поля — компонент ui-field), голых элементных правил в модификаторе нет (гейт БЭМ §2)', () => {
    const fieldCss = readFileSync(join(root, 'components/ui-field/ui-field.css'), 'utf8')
      .replace(/\r\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(
      fieldCss,
      'поле даёт ширину 100% (заполнение пилюли, было .cp-pill select) — общее правило коробки контролов',
    ).toMatch(/\.ui-field__input,\s*\.ui-field__select,[\s\S]{0,200}width: 100%;/);
    expect(
      (componentCss.match(/\.ui-select--pill[^{]*\{/g) ?? []).map((piece) =>
        piece.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['.ui-select--pill {']);
  });

  it('ширину (flex-basis) и позицию модификатор НЕ задаёт — раскладка сайта, позиция — гарантия модуля (контракт wrap)', () => {
    const block = blockOf(componentCss, '.ui-select--pill');
    expect(
      block,
      'без flex-basis (ширина — сайт; inline-flex — компоновка, не ширина)',
    ).not.toContain('flex-');
    expect(block, 'без position (модуль ставит relative статичной обёртке)').not.toContain(
      'position',
    );
  });

  it('внутренности триггера/listbox модификатор не трогает: новых правил на .ui-select--pill .ui-select__* нет', () => {
    expect(
      (componentCss.match(/\.ui-select--pill[^{]*\{/g) ?? []).map((piece) =>
        piece.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['.ui-select--pill {']);
  });

  it('инварианты системы: без hex и !important (hex — tokens/primitives.css, !important — a11y/vi.css)', () => {
    expect(componentCss, 'hex только в primitives').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(componentCss, '!important только в vi.css').not.toContain('!important');
  });
});

describe('README ui-select (AC: строка API + пример фильтр-панели)', () => {
  it('модификатор задокументирован в API-таблице и в Do', () => {
    expect(readme).toContain('ui-select--pill');
    expect(readme, 'Do для пилюли фильтра ведёт на модификатор').toMatch(
      /ui-select--pill[\s\S]{0,400}data-ui-select="wrap"/,
    );
  });

  it('пример фильтр-панели: label[for] рядом, ширина — раскладка сайта', () => {
    expect(readme).toMatch(/<div class="ui-select--pill">[\s\S]{0,200}data-ui-select="wrap"/);
    expect(readme).toContain('ui-vh');
  });
});

describe('паттерн-слой: lpp-filters и lpp-find (AC, каноны list-page)', () => {
  it('lpp-filters — лента пилюль: gap 16 (space-4, спека T17.12), wrap, ритм дока сверху', () => {
    const filters = blockOf(layer, '.lpp-filters');
    expect(filters, '.lpp-filters найдено').toBeTruthy();
    expect(filters, 'box-sizing на корне связки (ADR-0002)').toContain('box-sizing: border-box;');
    expect(filters).toContain('display: flex;');
    expect(filters).toContain('flex-wrap: wrap;');
    expect(filters, 'gap 16 — значение канона (спека T17.12; T8.1 брал 12)').toContain(
      'gap: var(--ui-space-4);',
    );
    expect(filters).toContain('align-items: center;');
    expect(filters, 'верхний ритм дока T8.1 сохранён').toContain('margin: var(--ui-space-5) 0');
  });

  it('нижний ритм ленты — 2.5rem «как есть» (.vac-filters pages.css:19, 40px вне шкалы §3.2 — прецедент --ui-card-gap)', () => {
    const filters = blockOf(layer, '.lpp-filters');
    expect(filters).toContain('margin: var(--ui-space-5) 0 2.5rem;');
  });

  it('ширина пилюли фильтра в ленте — 260px оригинала (vacancy-search.css:41; AC «260px — канон list-page»); правило на ui-потомке под крючком слоя', () => {
    const pill = blockOf(layer, '.lpp-filters > .ui-select--pill');
    expect(pill, '.lpp-filters > .ui-select--pill найдено').toBeTruthy();
    expect(pill).toContain('flex: 0 0 260px;');
  });

  it('lpp-find — find-bar «поле + кнопка»: gap 8 (space-2), ритм снизу 8 (space-2) — метрики принятого findBar T15.5', () => {
    const find = blockOf(layer, '.lpp-find');
    expect(find, '.lpp-find найдено').toBeTruthy();
    expect(find, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(find).toContain('display: flex;');
    expect(find).toContain('gap: var(--ui-space-2);');
    expect(find).toContain('margin-bottom: var(--ui-space-2);');
  });

  it('поле find-bar растягивается, кнопка — рядом', () => {
    const field = blockOf(layer, '.lpp-find .ui-field');
    expect(field, '.lpp-find .ui-field найдено').toBeTruthy();
    expect(field).toContain('flex: 1 1 auto;');
  });

  it('док-канон — источник правды: разметка lpp-find в list-page.html (форма role="search", поле+кнопка accent)', () => {
    expect(doc).toMatch(/<form[^>]*class="lpp-find"/);
    expect(doc).toMatch(/class="lpp-find"[\s\S]{0,400}role="search"/);
    expect(doc).toMatch(/lpp-find[\s\S]{0,600}ui-field__input/);
    expect(doc).toMatch(/lpp-find[\s\S]{0,900}ui-button--accent/);
  });
});

describe('пилот career-portal: cp-* сняты (AC «~30 строк»)', () => {
  it('build.mjs: пилюля — на модификаторе ДС, findBar — lpp-find, каталог — lpp-filters', () => {
    expect(pilotBuild, 'helper пилюли — на модификаторе').toContain(
      '<div class="ui-select--pill">',
    );
    expect(pilotBuild, 'findBar — на каноне слоя').toContain('class="lpp-find"');
    expect(pilotBuild, 'лента каталога — канон слоя').toContain('class="lpp-filters"');
  });

  it('build.mjs: сайт-зонные классы сняты из РАЗМЕТКИ (в прозе комментариев упоминания истории — не пин)', () => {
    expect(pilotBuild, 'cp-pill в разметке снят').not.toMatch(/class="[^"]*\bcp-pill\b/);
    expect(pilotBuild, 'cp-find-bar в разметке снят').not.toMatch(/class="[^"]*\bcp-find-bar\b/);
    expect(pilotBuild, 'cp-catalog-filters в разметке снят').not.toMatch(
      /class="[^"]*\bcp-catalog-filters\b/,
    );
  });

  it('pilot.css: правила cp-pill/cp-catalog-filters/cp-find-bar сняты', () => {
    expect(pilotCss).not.toContain('.cp-pill');
    expect(pilotCss).not.toContain('.cp-find-bar');
    expect(pilotCss).not.toContain('.cp-catalog-filters');
  });

  it('pilot.css: сайдбарный шим flex-basis снят (модификатор flex-basis не несёт — колонка растягивает сама)', () => {
    expect(pilotCss).not.toContain('.lpp-side__group .cp-pill');
  });

  it('pilot.css: ширина пилюль hero-панели (12rem) — правило сайта на модификаторе', () => {
    const hero = blockOf(pilotCss, '.cp-vacancy-search__fields > .ui-select--pill');
    expect(hero, 'правило hero-панели найдено').toBeTruthy();
    expect(hero).toContain('flex: 1 1 12rem;');
  });
});

describe('стенд ui-select: секция «фильтр-пилюля» (AC)', () => {
  it('секция #uiss-pill: модификатор + label[for] рядом с обёрткой (канон имени)', () => {
    expect(stand).toContain('id="uiss-pill"');
    expect(stand).toMatch(/class="ui-select--pill"/);
    expect(stand, 'имя поля — label[for] РЯДОМ с обёрткой').toMatch(
      /label[^>]*for="uiss-pill-city"/,
    );
  });

  it('ширина пилюль на стенде — стилевой блок стенда (раскладка стенда, не компонента)', () => {
    expect(stand).toMatch(/\.uiss-pillrow [\s\S]{0,200}ui-select--pill/);
  });
});
