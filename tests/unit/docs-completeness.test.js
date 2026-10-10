/**
 * Юнит-пины полноты док (задача T10.2, EPIC-10).
 *
 * Тестируемые единицы — новые экспорты showcase/docs-template.mjs:
 *  - docCompletenessProblems(root) — инвентаризация «компоненты dist + паттерны
 *    ↔ страницы showcase»: у каждого каталога components/ui-* есть README и
 *    метаданные showcase/docs/<имя>.mjs (и наоборот), маппинг метаданных
 *    указывает на существующие «## заголовки» README, у каждого каталога
 *    patterns/<имя>/ — канонический html (источник стенда) и README с
 *    обязательными секциями. Сборка (selfChecks build.mjs) гоняет ту же
 *    функцию — Technical considerations T10.2 «автопроверка полноты»;
 *  - brokenDocLinks(html, baseDir) — «перекрёстные ссылки работают (нет
 *    битых)»: относительные href/src записанной страницы разрешаются
 *    относительно её каталога и обязаны существовать;
 *  - схемы doc:/stand: в renderInline — форма перекрёстных ссылок в
 *    README-текстах: README живёт в репозитории, ссылка рендерится на
 *    док-странице showcase (docs/), цель — соседний каталог полигона.
 *
 * Ключевой сценарий — «реальный репозиторий полен»: он красный, пока у
 * каждого компонента dist не появились метаданные и недостающие README-секции
 * (прогон T10.2 до 100%), и остаётся гейтом регрессии дальше.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  brokenDocLinks,
  docCompletenessProblems,
  renderDocPage,
  renderMarkdown,
} from '../../showcase/docs-template.mjs';

const root = join(import.meta.dirname, '../..');

/* ── фикстура: минимальный «полный» репозиторий ── */

const VALID_README = [
  '# ui-x',
  '',
  '## API',
  'Классы компонента.',
  '',
  '## Состояния',
  'Default, disabled.',
  '',
  '## Клавиатура и a11y',
  'Tab — фокус.',
  '',
  "## Do / Don't",
  '- **Do**: нативный элемент.',
  '',
  '## Известные границы',
  'Граница.',
].join('\n');

const VALID_METADATA = {
  readme: {
    states: ['Состояния'],
    a11y: ['Клавиатура и a11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Известные границы'],
  },
  keyboard: [{ keys: 'Tab', action: 'фокус' }],
  aria: [{ what: '`<button>`', why: 'нативная семантика' }],
  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    rows: [{ scenario: 'Tab', expect: 'имя, роль', pin: 'tests/e2e/ui-x.spec.js' }],
  },
  schema: null,
  version: {
    introduced: '0.1.0',
    task: 'T0.0',
    changelog: [{ version: '0.1.0', change: 'Введение компонента.' }],
  },
};

const PATTERN_README = [
  '# Паттерн p1',
  '',
  '## Состав',
  'Блоки паттерна.',
  '',
  '## A11y',
  'Порядок чтения.',
  '',
  "## Do / Don't",
  '- **Do**: собирать из компонентов.',
].join('\n');

/** Собрать минимальный «полный» корень; правки после — источники проблем.
 *  Каждый негативный кейс добавляет СВОЙ компонент с уникальным именем:
 *  метаданные — require(esm)-модули, их кэш не инвалидируется перезаписью
 *  файла, поэтому мутации одного ui-x ломали бы порядок проверок. */
function writeFullFixture(dir) {
  mkdirSync(join(dir, 'components', 'ui-x'), { recursive: true });
  writeFileSync(join(dir, 'components', 'ui-x', 'README.md'), VALID_README);
  writeMetadata(dir, 'ui-x', VALID_METADATA);
  mkdirSync(join(dir, 'patterns', 'p1'), { recursive: true });
  writeFileSync(join(dir, 'patterns', 'p1', 'p1.html'), '<div class="ui-card">p1</div>');
  writeFileSync(join(dir, 'patterns', 'p1', 'README.md'), PATTERN_README);
}

function writeMetadata(dir, name, metadata) {
  mkdirSync(join(dir, 'showcase', 'docs'), { recursive: true });
  writeFileSync(
    join(dir, 'showcase', 'docs', `${name}.mjs`),
    `export default ${JSON.stringify(metadata, null, 2)};\n`,
  );
}

/** Добавить компонент фикстуры с кастомными README/метаданными. */
function addFixtureComponent(dir, name, readme, metadata) {
  mkdirSync(join(dir, 'components', name), { recursive: true });
  writeFileSync(join(dir, 'components', name, 'README.md'), readme);
  writeMetadata(dir, name, metadata);
}

const fixtureRoot = mkdtempSync(join(tmpdir(), 'irao-docs-completeness-'));
writeFullFixture(fixtureRoot);

afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

/* ── инвентаризация полноты (Technical considerations T10.2) ── */

describe('docCompletenessProblems: полный фикстурный корень', () => {
  it('полный корень — проблем нет', async () => {
    expect(await docCompletenessProblems(fixtureRoot)).toEqual([]);
  });

  it('компонент без метаданных showcase/docs/<имя>.mjs — док-страница не соберётся', async () => {
    mkdirSync(join(fixtureRoot, 'components', 'ui-x-nometa'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'components', 'ui-x-nometa', 'README.md'), VALID_README);
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('ui-x-nometa') && p.includes('метаданны'))).toBe(true);
  });

  it('метаданные без каталога компонента — «и наоборот»', async () => {
    writeMetadata(fixtureRoot, 'ui-orphan', VALID_METADATA);
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('ui-orphan'))).toBe(true);
  });

  it('компонент без README.md — источник секций страницы', async () => {
    mkdirSync(join(fixtureRoot, 'components', 'ui-x-noreadme'), { recursive: true });
    writeMetadata(fixtureRoot, 'ui-x-noreadme', VALID_METADATA);
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('ui-x-noreadme') && p.includes('README'))).toBe(true);
  });

  it('маппинг метаданных указывает на несуществующий «## заголовок» README', async () => {
    addFixtureComponent(
      fixtureRoot,
      'ui-x-badmapping',
      VALID_README.replace('## Состояния', '## Виды'),
      VALID_METADATA,
    );
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('ui-x-badmapping') && p.includes('Состояния'))).toBe(
      true,
    );
  });

  it('пустой обязательный слот метаданных (states/a11y/api/doDont) — секция шаблона пуста', async () => {
    const empty = JSON.parse(JSON.stringify(VALID_METADATA));
    empty.readme.doDont = [];
    addFixtureComponent(fixtureRoot, 'ui-x-emptydodont', VALID_README, empty);
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('ui-x-emptydodont') && p.includes('doDont'))).toBe(true);
  });

  it('паттерн без канонического html — стенд не соберётся', async () => {
    mkdirSync(join(fixtureRoot, 'patterns', 'p2'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'patterns', 'p2', 'README.md'), PATTERN_README);
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('patterns/p2'))).toBe(true);
  });

  it("README паттерна без «Do / Don't» — чек-лист прогона не зелёный", async () => {
    mkdirSync(join(fixtureRoot, 'patterns', 'p3'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'patterns', 'p3', 'p3.html'), '<div class="ui-card">p3</div>');
    writeFileSync(
      join(fixtureRoot, 'patterns', 'p3', 'README.md'),
      PATTERN_README.replace("## Do / Don't\n", ''),
    );
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('patterns/p3') && p.includes("Don't"))).toBe(true);
  });

  it('README паттерна со схемой doc:/stand: — ссылка не работает нигде (ревью T10.2)', async () => {
    // README паттернов в полигон не рендерятся (рендерит только компонентные
    // доки), а doc:/stand: вне renderInline — несуществующая схема URL: на
    // GitHub ссылка битая. Гейт brokenDocLinks сюда не смотрит (он сканирует
    // showcase/dist/docs/*.html) — схему в README паттернов ловит инвентаризация.
    mkdirSync(join(fixtureRoot, 'patterns', 'p4'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'patterns', 'p4', 'p4.html'), '<div class="ui-card">p4</div>');
    writeFileSync(
      join(fixtureRoot, 'patterns', 'p4', 'README.md'),
      PATTERN_README + '\nСборка на базе [ui-x](doc:ui-x) и [стенда](stand:ui-x).\n',
    );
    const problems = await docCompletenessProblems(fixtureRoot);
    expect(problems.some((p) => p.includes('patterns/p4') && p.includes('doc:'))).toBe(true);
  });
});

describe('docCompletenessProblems: реальный репозиторий (прогон T10.2 до 100%)', () => {
  it('у каждого компонента dist и каждого паттерна — полная дока; проблем нет', async () => {
    expect(await docCompletenessProblems(root)).toEqual([]);
  });
});

/* ── схемы перекрёстных ссылок (Scope T10.2: связность) ── */

describe('renderMarkdown: схемы doc:/stand: — перекрёстные ссылки между страницами', () => {
  it('doc:<имя> → ссылка на док-страницу соседа (из docs/ на docs/)', () => {
    const html = renderMarkdown('Пара — [ui-link](doc:ui-link).');
    expect(html).toContain('<a href="../docs/ui-link.html">ui-link</a>');
  });

  it('stand:<имя> → ссылка на стенд компонента', () => {
    const html = renderMarkdown('Матрица — [стенд ui-table](stand:ui-table).');
    expect(html).toContain('<a href="../stands/ui-table.html">стенд ui-table</a>');
  });

  it('stand:patterns/<имя> → ссылка на стенд паттерна (вложенный каталог)', () => {
    const html = renderMarkdown('Оверлей — [паттерн](stand:patterns/search-overlay).');
    expect(html).toContain('<a href="../stands/patterns/search-overlay.html">паттерн</a>');
  });

  it('репо-относительные цели ведут себя как раньше (текст + <code>-путь)', () => {
    const html = renderMarkdown('[ADR-0001](../../../docs/adr/0001-x.md)');
    expect(html).toContain('<code>docs/adr/0001-x.md</code>');
    expect(html).not.toContain('<a href=');
  });

  it('внешние ссылки остаются настоящими ссылками', () => {
    const html = renderMarkdown('[docs](https://example.com/docs)');
    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
  });
});

/* ── extra-заголовки рендерятся инлайном, а не escapeHtml (ревью T10.2) ── */

describe('renderDocPage: заголовок extra-секции с markdown-ссылкой', () => {
  const readme = [
    '# ui-x',
    '',
    '## API',
    'Классы.',
    '',
    '## Состояния',
    'Состояния.',
    '',
    '## Клавиатура и a11y',
    'Tab.',
    '',
    "## Do / Don't",
    '- **Do**: нативно.',
    '',
    '## Мобильная стратегия — [ADR-0012](../../docs/adr/0012-x.md) и [внешняя](https://example.com/adr)',
    'Тело секции.',
  ].join('\n');
  const metadata = JSON.parse(JSON.stringify(VALID_METADATA));
  metadata.readme.extra = [
    'Мобильная стратегия — [ADR-0012](../../docs/adr/0012-x.md) и [внешняя](https://example.com/adr)',
  ];
  const html = renderDocPage({
    name: 'ui-x',
    markup: '<p class="ui-x">demo</p>',
    readme,
    metadata,
  });

  it('репо-относительная ссылка — инлайн-форма тел секций (текст + code-путь), не сырой markdown', () => {
    expect(html).toContain('Мобильная стратегия — ADR-0012 (<code>docs/adr/0012-x.md</code>) и');
    // Сырой markdown в доступном имени h2 — скобочный мусор для скринридера.
    expect(html).not.toContain('[ADR-0012](../../docs/adr/0012-x.md)');
  });

  it('внешняя ссылка в заголовке — настоящий <a>', () => {
    expect(html).toContain('<a href="https://example.com/adr">внешняя</a>');
  });
});

/* ── битые ссылки (AC T10.2: «перекрёстные ссылки работают») ── */

describe('brokenDocLinks: относительные href/src обязаны резолвиться', () => {
  // base — модель каталога docs/ полигона: соседние каталоги (stands/, index)
  // резолвятся через «../».
  const base = join(fixtureRoot, 'docs');
  mkdirSync(join(fixtureRoot, 'stands', 'patterns'), { recursive: true });
  mkdirSync(base, { recursive: true });
  writeFileSync(join(fixtureRoot, 'index.html'), '<h1>каталог</h1>');
  writeFileSync(join(fixtureRoot, 'stands', 'ui-x.html'), '<h1>ui-x</h1>');
  writeFileSync(join(fixtureRoot, 'stands', 'patterns', 'p1.html'), '<h1>p1</h1>');

  it('существующие относительные ссылки и якоря — проблем нет', () => {
    const html = [
      '<a href="../stands/ui-x.html">стенд</a>',
      '<a href="../index.html">каталог</a>',
      '<a href="../stands/patterns/p1.html">паттерн</a>',
      '<a href="#ui-docs-api-heading">API</a>',
      '<a href="https://example.com">внешнее</a>',
      '<iframe src="../stands/ui-x.html"></iframe>',
    ].join('\n');
    expect(brokenDocLinks(html, base)).toEqual([]);
  });

  it('несуществующая цель — проблема с путём', () => {
    const html = '<a href="../stands/ui-nope.html">битое</a>';
    const problems = brokenDocLinks(html, base);
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain('../stands/ui-nope.html');
  });

  it("учебные href в код-примерах (сниппет, do/don't) — не ссылки страницы", () => {
    const html = [
      '<pre><code>&lt;a class="ui-link" href="/notifications"&gt;…&lt;/a&gt;</code></pre>',
      '<ul><li>Don\'t: <code>&lt;a href="…"&gt;Отправить&lt;/a&gt;</code></li></ul>',
      '<a href="../stands/ui-x.html">настоящая ссылка</a>',
    ].join('\n');
    expect(brokenDocLinks(html, base)).toEqual([]);
  });

  it('демо-ссылки секции «Живые примеры» (канонический паттерн) — не ссылки страницы', () => {
    const html = [
      '<!-- ui-docs-examples:start -->',
      '<a class="ui-breadcrumbs__link" itemprop="item" href="/vacancies/">Вакансии</a>',
      '<!-- ui-docs-examples:end -->',
      '<a href="../stands/ui-x.html">настоящая ссылка</a>',
    ].join('\n');
    expect(brokenDocLinks(html, base)).toEqual([]);
  });

  it('битый src фрейма/скрипта тоже ловится', () => {
    const html = '<iframe src="../stands/ui-nope.html"></iframe>';
    expect(brokenDocLinks(html, base).length).toBe(1);
  });
});
