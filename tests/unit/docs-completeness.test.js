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
  "## Состояния",
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

/** Собрать минимальный «полный» корень; правки после — источники проблем. */
function writeFullFixture(dir) {
  mkdirSync(join(dir, 'components', 'ui-x'), { recursive: true });
  writeFileSync(join(dir, 'components', 'ui-x', 'README.md'), VALID_README);
  mkdirSync(join(dir, 'showcase', 'docs'), { recursive: true });
  writeFileSync(
    join(dir, 'showcase', 'docs', 'ui-x.mjs'),
    `export default ${JSON.stringify(VALID_METADATA, null, 2)};\n`,
  );
  mkdirSync(join(dir, 'patterns', 'p1'), { recursive: true });
  writeFileSync(join(dir, 'patterns', 'p1', 'p1.html'), '<div class="ui-card">p1</div>');
  writeFileSync(join(dir, 'patterns', 'p1', 'README.md'), PATTERN_README);
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
    rmSync(join(fixtureRoot, 'showcase', 'docs', 'ui-x.mjs'));
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('ui-x') && p.includes('метаданны'))).toBe(true);
    } finally {
      writeFileSync(
        join(fixtureRoot, 'showcase', 'docs', 'ui-x.mjs'),
        `export default ${JSON.stringify(VALID_METADATA, null, 2)};\n`,
      );
    }
  });

  it('метаданные без каталога компонента — «и наоборот»', async () => {
    writeFileSync(
      join(fixtureRoot, 'showcase', 'docs', 'ui-orphan.mjs'),
      `export default ${JSON.stringify(VALID_METADATA, null, 2)};\n`,
    );
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('ui-orphan'))).toBe(true);
    } finally {
      rmSync(join(fixtureRoot, 'showcase', 'docs', 'ui-orphan.mjs'));
    }
  });

  it('компонент без README.md — источник секций страницы', async () => {
    const readme = join(fixtureRoot, 'components', 'ui-x', 'README.md');
    rmSync(readme);
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('ui-x') && p.includes('README'))).toBe(true);
    } finally {
      writeFileSync(readme, VALID_README);
    }
  });

  it('маппинг метаданных указывает на несуществующий «## заголовок» README', async () => {
    const readme = join(fixtureRoot, 'components', 'ui-x', 'README.md');
    const withoutStates = VALID_README.replace('## Состояния', '## Виды');
    rmSync(readme);
    writeFileSync(readme, withoutStates);
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('ui-x') && p.includes('Состояния'))).toBe(true);
    } finally {
      rmSync(readme);
      writeFileSync(readme, VALID_README);
    }
  });

  it('пустой обязательный слот метаданных (states/a11y/api/doDont) — секция шаблона пуста', async () => {
    const meta = join(fixtureRoot, 'showcase', 'docs', 'ui-x.mjs');
    const empty = JSON.parse(JSON.stringify(VALID_METADATA));
    empty.readme.doDont = [];
    rmSync(meta);
    writeFileSync(meta, `export default ${JSON.stringify(empty, null, 2)};\n`);
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('ui-x') && p.includes('doDont'))).toBe(true);
    } finally {
      rmSync(meta);
      writeFileSync(meta, `export default ${JSON.stringify(VALID_METADATA, null, 2)};\n`);
    }
  });

  it('паттерн без канонического html — стенд не соберётся', async () => {
    const html = join(fixtureRoot, 'patterns', 'p1', 'p1.html');
    rmSync(html);
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('patterns/p1'))).toBe(true);
    } finally {
      writeFileSync(html, '<div class="ui-card">p1</div>');
    }
  });

  it("README паттерна без «Do / Don't» — чек-лист прогона не зелёный", async () => {
    const readme = join(fixtureRoot, 'patterns', 'p1', 'README.md');
    rmSync(readme);
    writeFileSync(readme, PATTERN_README.replace("## Do / Don't\n", ''));
    try {
      const problems = await docCompletenessProblems(fixtureRoot);
      expect(problems.some((p) => p.includes('patterns/p1') && p.includes("Don't"))).toBe(true);
    } finally {
      rmSync(readme);
      writeFileSync(readme, PATTERN_README);
    }
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

/* ── битые ссылки (AC T10.2: «перекрёстные ссылки работают») ── */

describe('brokenDocLinks: относительные href/src обязаны резолвиться', () => {
  const base = join(fixtureRoot, 'showcase-dist-docs-stub');
  mkdirSync(join(base, 'stands', 'patterns'), { recursive: true });
  writeFileSync(join(base, 'index.html'), '<h1>каталог</h1>');
  writeFileSync(join(base, 'stands', 'ui-x.html'), '<h1>ui-x</h1>');
  writeFileSync(join(base, 'stands', 'patterns', 'p1.html'), '<h1>p1</h1>');

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

  it('битый src фрейма/скрипта тоже ловится', () => {
    const html = '<iframe src="../stands/ui-nope.html"></iframe>';
    expect(brokenDocLinks(html, base).length).toBe(1);
  });
});
