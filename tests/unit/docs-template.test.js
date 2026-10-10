/**
 * Юнит-пины шаблона страницы компонента (задача T10.1, 02-architecture §8).
 *
 * Тестируемая единица — showcase/docs-template.mjs: декларативный генератор
 * док-страниц showcase/dist/docs/<имя>.html из файлов компонента (канонический
 * HTML + README-блоки + метаданные showcase/docs/<имя>.mjs).
 *
 * Ключевой контракт (Implementation requirements T10.1 п.1 + Testing
 * requirements): «сниппет HTML на странице = фактическая разметка стенда,
 * один источник — файл компонента». Сборка (showcase/build.mjs, selfChecks)
 * гоняет тот же verifyDocPageHtml по записанным страницам — «диф на билде»;
 * здесь пинится исполняемая форма проверки, включая негативный кейс
 * (расхождение сниппета обязано давать проблему, а не молча проходить).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOC_SECTIONS,
  REFERENCE_COMPONENTS,
  extractDocPageChecks,
  loadMetadata,
  normalizeMarkup,
  readComponentMarkup,
  renderDocPage,
  renderMarkdown,
  stripLeadingComments,
  verifyDocPageHtml,
} from '../../showcase/docs-template.mjs';

const root = join(import.meta.dirname, '../..');

/** Собрать док-страницу эталона из реальных файлов репозитория. */
async function buildPage(name) {
  const metadata = await loadMetadata(name);
  const markup = readComponentMarkup(root, name);
  const readme = readFileSync(join(root, 'components', name, 'README.md'), 'utf8');
  return { metadata, markup, html: renderDocPage({ name, markup, readme, metadata }) };
}

describe('шаблон страницы компонента (T10.1, 02-architecture §8)', () => {
  it('DOC_SECTIONS — 9 секций в каноническом порядке спеки', () => {
    expect(DOC_SECTIONS.map((section) => section.id)).toEqual([
      'examples', // живые примеры
      'snippet', // копируемый HTML-сниппет
      'states', // состояния
      'responsive', // стенд 375/768/1440 в iframe
      'a11y', // клавиатура + ARIA + чек-лист скринридера
      'api', // классы/модификаторы/токены/data/JS
      'do-dont', // do/don't
      'schema', // schema.org-заметка
      'version', // версия введения и changelog
    ]);
  });

  it('эталоны T10.1 — ровно ui-button, ui-field, ui-modal', () => {
    expect(REFERENCE_COMPONENTS).toEqual(['ui-button', 'ui-field', 'ui-modal']);
  });
});

describe('метаданные эталонов полны (чек-лист «страница = шаблон»)', () => {
  for (const name of REFERENCE_COMPONENTS) {
    it(`${name}: все слоты шаблона заполнены`, async () => {
      const metadata = await loadMetadata(name);
      expect(metadata.readme.states.length, 'секция «Состояния»').toBeGreaterThan(0);
      expect(metadata.readme.api.length, 'секция «API»').toBeGreaterThan(0);
      expect(metadata.readme.a11y.length, 'секция «A11y» (README-блоки)').toBeGreaterThan(0);
      expect(metadata.readme.doDont.length, 'секция «Do / Don»t»').toBeGreaterThan(0);
      expect(metadata.keyboard.length, 'клавиатурная таблица').toBeGreaterThan(0);
      expect(metadata.aria.length, 'ARIA-атрибуты').toBeGreaterThan(0);
      expect(metadata.screenReader.rows.length, 'чек-лист скринридера (T9.2)').toBeGreaterThan(0);
      expect(metadata.screenReader.rows[0].scenario).toBeTruthy();
      expect(metadata.screenReader.rows[0].expect).toBeTruthy();
      expect(metadata.version.introduced, 'версия введения').toBeTruthy();
      expect(metadata.version.task, 'задача введения').toBeTruthy();
      expect(metadata.version.changelog.length, 'changelog компонента').toBeGreaterThan(0);
    });
  }
});

describe('один источник: канонический файл компонента', () => {
  it('readComponentMarkup снимает ведущие комментарии разработчика, разметку не трогает', () => {
    const raw = [
      '<!--',
      '  ui-x (T0.0): служебный комментарий.',
      '-->',
      '<p class="ui-x">Контент</p>',
    ].join('\n');
    expect(stripLeadingComments(raw)).toBe('<p class="ui-x">Контент</p>');
  });

  for (const name of REFERENCE_COMPONENTS) {
    it(`${name}: разметка из components/${name}/${name}.html не пуста и несёт блок`, async () => {
      const markup = readComponentMarkup(root, name);
      expect(markup.length).toBeGreaterThan(50);
      expect(markup).toContain(`ui-${name.slice('ui-'.length)}`);
      expect(markup.startsWith('<!--')).toBe(false);
    });
  }
});

describe('«сниппет = разметка стенда» (диф-механика билда)', () => {
  it('страница эталона: сниппет = живые примеры = каноническому файлу', async () => {
    for (const name of REFERENCE_COMPONENTS) {
      const { markup, html } = await buildPage(name);
      const { examples, snippet } = extractDocPageChecks(html);
      expect(snippet, `${name}: сниппет найден`).not.toBeNull();
      expect(examples, `${name}: разметка примеров найдена`).not.toBeNull();
      expect(normalizeMarkup(snippet), `${name}: сниппет = каноническому файлу`).toBe(
        normalizeMarkup(markup),
      );
      expect(normalizeMarkup(examples), `${name}: разметка примеров = сниппету`).toBe(
        normalizeMarkup(snippet),
      );
    }
  });

  it('сниппет экранирован: живой HTML страницы не исполняет разметку сниппета', async () => {
    const { html } = await buildPage('ui-button');
    expect(html).toContain('&lt;button class="ui-button');
    const { snippet } = extractDocPageChecks(html);
    expect(snippet).toContain('<button class="ui-button');
  });

  it('verifyDocPageHtml: зелёная страница — проблем нет', async () => {
    const { markup, html } = await buildPage('ui-field');
    expect(verifyDocPageHtml(html, markup)).toEqual([]);
  });

  it('verifyDocPageHtml: расхождение сниппета — диф обнаружен (негативный кейс)', async () => {
    const { markup, html } = await buildPage('ui-button');
    // Имитация «дока отстала от кода»: в записанной странице сниппет правили руками.
    const drifted = html.replace(
      /data-ui-docs-snippet><code>[\s\S]*?<\/code><\/pre>/,
      'data-ui-docs-snippet><code>&lt;div class="устарело"&gt;&lt;/div&gt;</code></pre>',
    );
    const problems = verifyDocPageHtml(drifted, markup);
    expect(problems.some((problem) => problem.includes('сниппет'))).toBe(true);
  });

  it('verifyDocPageHtml: пропущенная секция и битые iframe — диф обнаружен', async () => {
    const { markup, html } = await buildPage('ui-button');
    const withoutSchema = html.replace(
      /<section[^>]*data-ui-docs-section="schema"[\s\S]*?<\/section>/,
      '',
    );
    expect(
      verifyDocPageHtml(withoutSchema, markup).some((problem) => problem.includes('Schema')),
    ).toBe(true);
    const brokenFrames = html.replace(/width="768"/, 'width="700"');
    expect(
      verifyDocPageHtml(brokenFrames, markup).some((problem) => problem.includes('375/768/1440')),
    ).toBe(true);
  });
});

describe('сгенерированная страница несёт все секции шаблона по порядку', () => {
  for (const name of REFERENCE_COMPONENTS) {
    it(`${name}: 9 секций data-ui-docs-section в порядке DOC_SECTIONS`, async () => {
      const { html } = await buildPage(name);
      let last = -1;
      for (const section of DOC_SECTIONS) {
        const at = html.indexOf(`data-ui-docs-section="${section.id}"`);
        expect(at, `${name}: секция ${section.id} присутствует`).toBeGreaterThan(-1);
        expect(at, `${name}: секция ${section.id} в порядке шаблона`).toBeGreaterThan(last);
        last = at;
      }
    });

    it(`${name}: a11y-секция — клавиатура, ARIA и чек-лист скринридера`, async () => {
      const { html } = await buildPage(name);
      const a11y = html.slice(
        html.indexOf('data-ui-docs-section="a11y"'),
        html.indexOf('data-ui-docs-section="api"'),
      );
      expect(a11y).toContain('Клавиатура');
      expect(a11y).toContain('ARIA');
      expect(a11y).toContain('скринридера');
      expect(a11y).toContain('screen-reader-protocol.md');
    });

    it(`${name}: responsive-секция — три iframe 375/768/1440 на стенд`, async () => {
      const { html } = await buildPage(name);
      const frames = Array.from(
        html.matchAll(/<iframe[^>]*>/g),
        (match) => match[0],
      );
      expect(frames.length).toBe(3);
      for (const frame of frames) {
        expect(frame).toContain(`src="../stands/${name}.html"`);
        expect(frame).toContain('title=');
      }
      expect(frames.join(' ')).toContain('width="375"');
      expect(frames.join(' ')).toContain('width="768"');
      expect(frames.join(' ')).toContain('width="1440"');
    });
  }
});

describe('renderMarkdown (блоки README → HTML)', () => {
  it('таблица | a | b | → table/thead/tbody', () => {
    const html = renderMarkdown(['| Что | Значение |', '| --- | --- |', '| `.x` | 1 |'].join('\n'));
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<code>.x</code>');
  });

  it('маркированный и нумерованный списки, многострочные пункты', () => {
    const html = renderMarkdown(['- раз', '  продолжение раза', '', '1. два', '2. три'].join('\n'));
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('продолжение раза');
  });

  it('fenced-код экранируется целиком', () => {
    const html = renderMarkdown(['```html', '<b>жирный</b>', '```'].join('\n'));
    expect(html).toContain('<pre><code>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>жирный</b>');
  });

  it('внешние ссылки → <a>, репо-относительные → текст + <code>-путь', () => {
    const html = renderMarkdown(
      ['[docs](https://example.com/docs)', '[ADR-0001](../../../docs/adr/0001-x.md)'].join('\n'),
    );
    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
    expect(html).toContain('ADR-0001');
    expect(html).toContain('<code>docs/adr/0001-x.md</code>');
  });

  it('сырой HTML в прозе экранируется', () => {
    const html = renderMarkdown('Текст с <div> и <script>');
    expect(html).toContain('&lt;div&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<div>');
  });
});
