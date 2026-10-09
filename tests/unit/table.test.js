/**
 * Юнит-пин ui-table (задача T7.4; Testing requirements).
 *
 * Поверхность браузера — три стенда (showcase/pages/ui-table — базовая
 * таблица, ui-table-scroll — скролл-зона и sticky-заголовок, ui-table-cards —
 * карточная трансформация и матрица выбора паттерна), клавиатурный скролл,
 * полнота данных карточного режима, axe и эталоны — в
 * tests/e2e/ui-table.spec.js; здесь — пины исполняемой формы решения:
 *  - components/ui-table/ui-table.css: box-sizing на корнях (ADR-0002);
 *    border-collapse: separate + border-spacing: 0 — collapse ломает
 *    position: sticky (рамки уезжают вместе с прокруткой); разделители строк
 *    на ячейках токеном --ui-color-divider; hover — пара одобренного дизайна
 *    --ui-color-surface-hover ТОЛЬКО под (hover: hover) (ADR-0010, EPIC-4);
 *    zebra — --ui-color-surface-muted (приглушённый фон «серых» секций);
 *    скролл-зона .ui-table__scroll — overflow-x: auto, tabindex/role/aria
 *    задаются разметкой (регион с именем — WCAG 2.4.1/4.1.2), индикация
 *    прокрутки — градиент кромки от --ui-color-surface шириной ступени
 *    шкалы §3.2; sticky-заголовок — position: sticky в пределах скролл-зоны,
 *    непрозрачный фон --ui-color-surface (контент не светится сквозь),
 *    z-index — ступень лестницы --ui-z-sticky;
 *    карточная трансформация .ui-table--cards — mobile-first: база (<md) —
 *    блоки-карточки с парами «заголовок–значение» из data-label (::before
 *    { content: attr(data-label) }, приглушённая подпись), шапка скрыта
 *    (имена колонок дублированы data-label — гейт irao/table-card-data-label),
 *    возврат к table-раскладке в @media (min-width: 768px) — md шкалы T2.5;
 *  - канонический паттерн ui-table.html: caption (нативное имя таблицы),
 *    th scope="col"/th scope="row" (связь заголовков — a11y-требование
 *    задачи); без data-ui-* хуков — CSS-компонент, JS-модуля нет;
 *  - инварианты системы: без !important, без hex (VI §5);
 *  - стенды: скролл-стенд несёт роль region + tabindex="0" + aria-label,
 *    карточный стенд — data-label на КАЖДОЙ ячейке --cards-таблицы
 *  - 'ui-table' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css;
 *  - гейт irao/table-card-data-label в .htmlvalidate.js с негативной и
 *    позитивной фикстурами в tests/lint-cases (Implementation requirements
 *    п.1: ячейки в карточном режиме обязаны иметь data-label);
 *  - README компонента: матрица выбора паттерна (DoD: «матрица обязательна»).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Все тела правил, чей селектор включает класс (группированные селекторы). */
const rulesOf = (css, cls) => {
  const blocks = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].includes(cls)) blocks.push(match[2]);
  }
  return blocks;
};

describe('components/ui-table/ui-table.css — база (ADR-0002, токены)', () => {
  const path = join(root, 'components', 'ui-table', 'ui-table.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define table — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define table */')).toBe(true);
  });

  it('.ui-table: box-sizing; width 100%; border-collapse: separate — collapse ломает position: sticky (Implementation requirements п.3)', () => {
    const block = blockOf(css, '.ui-table');
    expect(block, 'правило .ui-table найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: 100%;');
    expect(block).toContain('border-collapse: separate;');
    expect(block).toContain('border-spacing: 0;');
  });

  it('ячейки: box-sizing; паддинг ступенями шкалы §3.2; разделитель строк токеном --ui-color-divider', () => {
    const blocks = rulesOf(css, '.ui-table__cell');
    expect(blocks.length, 'правила ячеек найдены').toBeGreaterThan(0);
    const base = blocks[0];
    expect(base).toContain('box-sizing: border-box;');
    expect(base).toContain('padding: var(--ui-space-3) var(--ui-space-4);');
    expect(base).toContain('border-bottom: var(--ui-border-width) solid var(--ui-color-divider);');
  });

  it('заголовки (колонки и строки) — вес --ui-fw-body-bold', () => {
    const colBlocks = rulesOf(css, '.ui-table__col');
    const withWeight = colBlocks.filter((block) =>
      block.includes('font-weight: var(--ui-fw-body-bold);'),
    );
    expect(withWeight.length, 'вес заголовков токеном --ui-fw-body-bold').toBeGreaterThan(0);
    const rowHeadBlocks = rulesOf(css, '.ui-table__rowhead');
    const rowHeadWeight = rowHeadBlocks.filter((block) =>
      block.includes('font-weight: var(--ui-fw-body-bold);'),
    );
    expect(rowHeadWeight.length, 'вес заголовков строк тем же токеном').toBeGreaterThan(0);
  });

  it('скролл-зона .ui-table__scroll: overflow-x: auto; индикация — градиент кромки от --ui-color-surface шириной ступени шкалы', () => {
    const block = blockOf(css, '.ui-table__scroll');
    expect(block, 'правило .ui-table__scroll найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('overflow-x: auto;');
    expect(block).toContain('linear-gradient(to left, var(--ui-color-surface), transparent);');
    expect(block).toContain('background-size: var(--ui-space-5) 100%;');
  });

  it('sticky-заголовок: position: sticky в пределах скролл-зоны, непрозрачный фон --ui-color-surface, z-index --ui-z-sticky (Implementation requirements п.3)', () => {
    const block = blockOf(css, '.ui-table--sticky-head .ui-table__col');
    expect(block, 'правило sticky-заголовка найдено').toBeTruthy();
    expect(block).toContain('position: sticky;');
    expect(block).toContain('top: 0;');
    expect(block).toContain('background-color: var(--ui-color-surface);');
    expect(block).toContain('z-index: var(--ui-z-sticky);');
  });

  it('zebra — модификатор, фон --ui-color-surface-muted по чётным строкам тела', () => {
    const even = rulesOf(css, ':nth-child(even)');
    expect(even.length, 'правило полос найдено').toBeGreaterThan(0);
    const withMuted = even.filter((block) =>
      block.includes('background-color: var(--ui-color-surface-muted);'),
    );
    expect(withMuted.length, 'фон полос — --ui-color-surface-muted').toBeGreaterThan(0);
  });

  it('compact — модификатор с меньшим паддингом (ступени шкалы §3.2)', () => {
    const blocks = rulesOf(css, '.ui-table--compact');
    const withPadding = blocks.filter((block) =>
      block.includes('padding: var(--ui-space-2) var(--ui-space-3);'),
    );
    expect(withPadding.length, 'компактный паддинг найден').toBeGreaterThan(0);
  });

  it('все :hover-правила — ТОЛЬКО внутри @media (hover: hover); hover — пара одобренного дизайна --ui-color-surface-hover (Technical considerations)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    const beforeMedia = css.slice(0, mediaIndex);
    expect(beforeMedia, 'до media-обёртки :hover-селекторов нет').not.toContain(':hover');
    const rowHover = blockOf(css.slice(mediaIndex), '.ui-table__row:hover');
    expect(rowHover, 'правило hover строки найдено').toBeTruthy();
    expect(rowHover).toContain('background-color: var(--ui-color-surface-hover);');
  });

  it('инварианты системы: без !important и без hex в исполняемом коде (VI §5)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('components/ui-table/ui-table.css — карточная трансформация (.ui-table--cards)', () => {
  const path = join(root, 'components', 'ui-table', 'ui-table.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('база (<md): таблица, группы и строки — блоки; шапка скрыта (имена колонок несёт data-label)', () => {
    const table = blockOf(css, '.ui-table--cards');
    expect(table, 'правило корня карточного режима найдено').toBeTruthy();
    expect(table).toContain('display: block;');
    const body = blockOf(css, '.ui-table--cards .ui-table__body');
    expect(body, 'тело — блок').toBeTruthy();
    expect(body).toContain('display: block;');
    const head = blockOf(css, '.ui-table--cards .ui-table__head');
    expect(head, 'правило скрытия шапки найдено').toBeTruthy();
    expect(head).toContain('display: none;');
  });

  it('карточка-строка: рамка/радиус/фон из токенов карточки (ui-card)', () => {
    const blocks = rulesOf(css, '.ui-table--cards .ui-table__row');
    const withBorder = blocks.filter(
      (block) => block.includes('border-radius: var(--ui-radius-md);'),
    );
    expect(withBorder.length, 'радиус карточки найден').toBeGreaterThan(0);
    expect(withBorder[0]).toContain('background-color: var(--ui-color-surface);');
    expect(withBorder[0]).toContain('border: var(--ui-border-width) solid var(--ui-border-color);');
  });

  it('ячейки в карточном режиме — блоки без разделителей; пара «заголовок–значение» — ::before { content: attr(data-label) } приглушённым caption-текстом', () => {
    const cellBlocks = rulesOf(css, '.ui-table--cards .ui-table__cell');
    const displayBlock = cellBlocks.filter((block) => block.includes('display: block;'));
    expect(displayBlock.length, 'ячейки — блоки').toBeGreaterThan(0);
    const labelBlocks = rulesOf(css, '.ui-table--cards .ui-table__cell::before');
    const withContent = labelBlocks.filter((block) =>
      block.includes('content: attr(data-label);'),
    );
    expect(withContent.length, '::before с data-label найден').toBeGreaterThan(0);
    expect(withContent[0]).toContain('color: var(--ui-color-text-muted);');
    const rowHeadLabels = rulesOf(css, '.ui-table--cards .ui-table__rowhead::before');
    expect(
      rowHeadLabels.some((block) => block.includes('content: attr(data-label);')),
      'data-label на заголовках строк тоже',
    ).toBe(true);
  });

  it('md (768px, шкала T2.5): возврат к table-раскладке; подписи data-label сняты (content: none)', () => {
    const mediaIndex = css.indexOf('@media (min-width: 768px)');
    expect(mediaIndex, 'md-медиазапрос присутствует').toBeGreaterThan(-1);
    const md = css.slice(mediaIndex);
    const table = blockOf(md, '.ui-table--cards');
    expect(table, 'таблица в md').toBeTruthy();
    expect(table).toContain('display: table;');
    const head = blockOf(md, '.ui-table--cards .ui-table__head');
    expect(head).toContain('display: table-header-group;');
    const body = blockOf(md, '.ui-table--cards .ui-table__body');
    expect(body).toContain('display: table-row-group;');
    const row = blockOf(md, '.ui-table--cards .ui-table__row');
    expect(row).toContain('display: table-row;');
    const cells = rulesOf(md, '.ui-table--cards .ui-table__cell');
    expect(
      cells.some((block) => block.includes('display: table-cell;')),
      'ячейки — table-cell',
    ).toBe(true);
    const labels = rulesOf(md, '.ui-table--cards .ui-table__cell::before');
    expect(
      labels.some((block) => block.includes('content: none;')),
      'подписи data-label сняты',
    ).toBe(true);
  });
});

describe('канонический паттерн (components/ui-table/ui-table.html) — семантика', () => {
  const html = readFileSync(join(root, 'components', 'ui-table', 'ui-table.html'), 'utf8');
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');

  it('таблица с нативным именем (caption) и связанными заголовками (th scope)', () => {
    expect(markup).toContain('<table class="ui-table">');
    expect(markup).toContain('<caption class="ui-table__caption">');
    expect(markup, 'заголовки колонок — th scope="col"').toContain('scope="col"');
    expect(markup, 'заголовки строк — th scope="row"').toContain('scope="row"');
    expect(markup).toContain('class="ui-table__head"');
    expect(markup).toContain('class="ui-table__body"');
    expect(markup).toContain('class="ui-table__row"');
    expect(markup).toContain('class="ui-table__col"');
    expect(markup).toContain('class="ui-table__rowhead"');
    expect(markup).toContain('class="ui-table__cell"');
  });

  it('CSS-компонент: без JS-модуля и без data-ui-* хуков (паттерны, не «умная таблица»)', () => {
    expect(existsSync(join(root, 'components', 'ui-table', 'ui-table.js'))).toBe(false);
    expect(markup).not.toContain('data-ui-');
    expect(markup, 'канонический паттерн — базовая таблица').not.toContain('ui-table--cards');
  });
});

describe('стенды (showcase/pages/ui-table*) — контракты разметки', () => {
  it('скролл-стенд: регион с tabindex="0", role="region" и aria-label (WCAG 2.4.1/4.1.2); sticky-демо — модификатор --sticky-head', () => {
    const html = readFileSync(
      join(root, 'showcase', 'pages', 'ui-table-scroll', 'index.html'),
      'utf8',
    );
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    const scrollZone = markup.match(/<div class="ui-table__scroll"[^>]*>/g) ?? [];
    expect(scrollZone.length, 'скролл-зоны на стенде').toBeGreaterThan(0);
    for (const zone of scrollZone) {
      expect(zone, `role=region: ${zone}`).toContain('role="region"');
      expect(zone, `tabindex=0: ${zone}`).toContain('tabindex="0"');
      expect(zone, `aria-label: ${zone}`).toMatch(/aria-label="[^"]/);
    }
    expect(markup).toContain('ui-table--sticky-head');
  });

  it('карточный стенд: data-label на КАЖДОЙ ячейке --cards-таблицы (Implementation requirements п.1)', () => {
    const html = readFileSync(
      join(root, 'showcase', 'pages', 'ui-table-cards', 'index.html'),
      'utf8',
    );
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    const cardsTable = markup.match(
      /<table class="ui-table ui-table--cards">[\s\S]*?<\/table>/,
    );
    expect(cardsTable, '--cards-таблица на стенде').toBeTruthy();
    const cells = cardsTable[0].match(/<t[dh]\b/g) ?? [];
    const labels = cardsTable[0].match(/data-label="/g) ?? [];
    expect(labels.length, `каждая ячейка с data-label (${cells.length} ячеек)`).toBe(cells.length);
    expect(cells.length, 'в таблице есть ячейки').toBeGreaterThan(3);
  });

  it('README компонента несёт матрицу выбора паттерна (DoD: «матрица обязательна»)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-table', 'README.md'), 'utf8');
    expect(readme).toContain('## Матрица выбора паттерна');
    expect(readme).toContain('ui-table--cards');
    expect(readme).toContain('ui-table__scroll');
    expect(readme, 'правило гейта задокументировано').toContain('irao/table-card-data-label');
    expect(readme, 'потеря table-семантики осознана и задокументирована').toContain(
      'Потеря table-семантики',
    );
  });
});

describe('сборка и гейты — подключение и контроль разметки', () => {
  it("'ui-table' в COMPONENTS showcase/build.mjs — CSS попадает в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const components = build.match(/const COMPONENTS = \[([\s\S]*?)\];/);
    expect(components, 'список COMPONENTS найден').toBeTruthy();
    expect(components[1]).toContain("'ui-table'");
  });

  it('гейт irao/table-card-data-label зарегистрирован с негативной и позитивной фикстурами (npm run test:lint)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config).toContain("'irao/table-card-data-label'");

    const runner = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(runner).toContain("file: 'html/table-card-missing-label.html'");
    expect(runner).toContain("'irao/table-card-data-label'");
    expect(runner).toContain("file: 'html/table-card-valid.html'");

    expect(existsSync(join(root, 'tests', 'lint-cases', 'html', 'table-card-missing-label.html'))).toBe(true);
    expect(existsSync(join(root, 'tests', 'lint-cases', 'html', 'table-card-valid.html'))).toBe(true);
  });
});
