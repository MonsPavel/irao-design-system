/**
 * Юнит-пины T10.3 — quickstart, integration-guide, «Bitrix-разработчику
 * за 30 минут» (AC: три документа опубликованы в showcase/docs; сниппеты
 * в гайдах = файлы в bitrix/ — проверка синхронизации; quickstart не
 * требует ничего, кроме FTP/SSH).
 *
 * Исполняемая форма:
 *  - showcase/guides.mjs — реестр гайдов, извлечение embed-блоков
 *    (fence с info-строкой `snippet=<репо-путь>`), синхронизация «блок =
 *    (под)кусок файла-источника» (один источник — файл; дрейф ловится
 *    также на билде, selfChecks), полнота покрытия сниппетов гайдами и
 *    рендер страницы гайда в каркасе showcase;
 *  - bitrix/quickstart.md, bitrix/integration-guide.md,
 *    bitrix/bitrix-30-minutes.md — living-источники трёх документов;
 *    публикацию (showcase/dist/docs/<имя>.html + раздел индекса) собирает
 *    build.mjs — живой DOM полигонных страниц пинит tests/e2e/guides.spec.js
 *    (зеркало имён GUIDES синхронизировано юнит-пином ниже).
 *
 * Версионирование сниппетов (Implementation requirements T10.3 п.2):
 * сниппет, изменившийся между minor-релизами, несёт пометку «с версии X»
 * в bitrix/snippets/README.md и в гайдах — пин ниже.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  extractSnippetBlocks,
  guideSnippetCoverageProblems,
  guideSyncProblems,
  GUIDES,
  renderGuidePage,
} from '../../showcase/guides.mjs';
import { renderMarkdown } from '../../showcase/docs-template.mjs';

const root = join(import.meta.dirname, '..', '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

const guideSources = Object.fromEntries(
  GUIDES.map((guide) => [guide.name, read(guide.file.split('/').join('/'))]),
);
const quickstart = guideSources['quickstart'];
const integrationGuide = guideSources['integration-guide'];
const tutorial = guideSources['bitrix-30-minutes'];
const snippetsReadme = read('bitrix', 'snippets', 'README.md');
const buildSource = read('showcase', 'build.mjs');

describe('showcase/guides.mjs — реестр гайдов (T10.3 Scope: три документа)', () => {
  it('ровно три гайда: quickstart, integration-guide, bitrix-30-minutes', () => {
    expect(GUIDES.map((guide) => guide.name)).toEqual([
      'quickstart',
      'integration-guide',
      'bitrix-30-minutes',
    ]);
  });

  it('каждый источник-файл существует (living doc живёт в bitrix/, а не в showcase)', () => {
    for (const guide of GUIDES) {
      expect(guide.file, `файл гайда ${guide.name}`).toMatch(/^bitrix\/.+\.md$/);
      expect(existsSync(join(root, guide.file)), `${guide.file} существует`).toBe(true);
    }
  });

  it('сборка подключает реестр (публикация — showcase/dist/docs/, AC1)', () => {
    expect(buildSource).toContain("from './guides.mjs'");
  });
});

describe('синхронизация «сниппет в гайде = файл» (AC2: один источник — bitrix/)', () => {
  it('реальные гайды: каждый embed-блок — точный (под)кусок файла-источника', () => {
    for (const guide of GUIDES) {
      expect(guideSyncProblems(root, guide), `гайд ${guide.name}`).toEqual([]);
    }
  });

  it('embed-блоки извлекаются из fence с маркером snippet=<путь>; обычные fence — нет', () => {
    const markdown = [
      '```php',
      '$plain = true;',
      '```',
      '',
      '```php snippet=bitrix/snippets/header-php.snippet.php',
      "const UI_VERSION = '0.1.0';",
      '```',
    ].join('\n');
    const blocks = extractSnippetBlocks(markdown);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].path).toBe('bitrix/snippets/header-php.snippet.php');
    expect(blocks[0].code).toBe("const UI_VERSION = '0.1.0';");
  });

  it('расхождение ловится: блок, которого нет в файле, — проблема с путём и строкой', () => {
    const diverged = [
      '```php snippet=bitrix/snippets/header-php.snippet.php',
      "const UI_VERSION = '9.9.9'; // гайд отстал от файла",
      '```',
    ].join('\n');
    const problems = guideSyncProblems(root, GUIDES[0], diverged);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('bitrix/snippets/header-php.snippet.php');
    expect(problems[0]).toContain('quickstart');
  });

  it('файл-источник отсутствует — проблема, а не молчаливый пропуск', () => {
    const missing = '```php snippet=bitrix/snippets/no-such-snippet.php\nx\n```\n';
    const problems = guideSyncProblems(root, GUIDES[0], missing);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no-such-snippet.php');
  });

  it('CRLF и хвостовые пробелы — не диф (нормализация обеих сторон)', () => {
    const withNoise = [
      '```php snippet=bitrix/snippets/header-php.snippet.php',
      "const UI_VERSION = '0.1.0';   \t",
      '```',
    ]
      .join('\n')
      .replace(/\n/g, '\r\n');
    expect(guideSyncProblems(root, GUIDES[0], withNoise)).toEqual([]);
  });

  it('полнота: каждый файл bitrix/snippets/*.php упомянут хотя бы в одном гайде', () => {
    expect(guideSnippetCoverageProblems(root)).toEqual([]);
  });
});

describe('renderGuidePage — страница гайда в каркасе showcase', () => {
  const guide = { name: 'quickstart', file: 'bitrix/quickstart.md', title: 'Quickstart: тест' };

  it('h1 из метаданных гайда; «#»-строка источника не дублируется в теле', () => {
    const html = renderGuidePage({ guide, markdown: '# Quickstart: тест\n\nВводный абзац.\n' });
    expect(html).toContain('<h1>Quickstart: тест</h1>');
    expect(html).toContain('<p>Вводный абзац.</p>');
    expect(html.match(/<h1>/g)).toHaveLength(1);
  });

  it('«##»-разделы источника становятся h2 страницы по порядку', () => {
    const html = renderGuidePage({
      guide,
      markdown: '# t\n\nИнтро.\n\n## Первый\n\nТело 1.\n\n## Второй\n\nТело 2.\n',
    });
    const h2s = html.match(/<h2>[^<]*<\/h2>/g) ?? [];
    expect(h2s).toEqual(['<h2>Первый</h2>', '<h2>Второй</h2>']);
  });

  it('info-строка fence (snippet=…) не протекает в вывод; код экранирован', () => {
    const html = renderGuidePage({
      guide,
      markdown: '```php snippet=bitrix/snippets/json-data.php\n$ x < y;\n```\n',
    });
    expect(html).toContain('<pre><code>$ x &lt; y;</code></pre>');
    expect(html).not.toContain('snippet=bitrix/snippets');
  });

  it('страница помечает источник: living doc + сверка сниппетов на билде', () => {
    const html = renderGuidePage({ guide, markdown: '# t\n\nТекст.\n' });
    expect(html).toContain('bitrix/quickstart.md');
    expect(html).toContain('snippet=');
  });
});

describe('blockquote в renderMarkdown — цитаты-правила гайдов (и README компонентов)', () => {
  it('подряд идущие «> »-строки — один blockquote, без литеральных «&gt;»', () => {
    const html = renderMarkdown('> **Правило.** Сервер всегда.\n> Продолжение правила.\n');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<strong>Правило.</strong>');
    expect(html).not.toContain('&gt;');
  });
});

describe('bitrix/quickstart.md — подключение за 5 минут (AC3: только FTP/SSH)', () => {
  it('шаги копипастом: dist → /local/ui/{version}/ → 4 строки header.php → кнопка', () => {
    expect(quickstart).toContain('# Quickstart: подключение irao-ui за 5 минут');
    expect(quickstart).toContain('/local/ui/');
    expect(quickstart).toContain("const UI_VERSION = '0.1.0'");
    expect(quickstart).toContain('## Шаг 2. Четыре строки в header.php');
    expect(quickstart).toContain('## Шаг 3. Скопируйте кнопку из доки');
    expect(quickstart).toContain('ui-button--primary');
  });

  it('на сайте Node не нужен: только копирование файлов и правка header.php', () => {
    expect(quickstart).toContain('На сайте Node не нужен');
    expect(quickstart, 'composer-обвязки на сайте нет').not.toContain('composer');
    expect(quickstart).toMatch(/FTP|SSH/);
  });

  it('встроенный код синхронен файлам: подключение — сниппет, кнопка — канон ui-button', () => {
    expect(quickstart).toContain('snippet=bitrix/snippets/header-php.snippet.php');
    expect(quickstart).toContain('snippet=components/ui-button/ui-button.html');
  });

  it('связность: integration guide, «30 минут», чек-лист первого подключения', () => {
    expect(quickstart).toContain('doc:integration-guide');
    expect(quickstart).toContain('doc:bitrix-30-minutes');
    expect(quickstart).toContain('first-connect-checklist.md');
  });

  it('инкогнито-проверка — формализованный сценарий в самом гайде', () => {
    expect(quickstart).toContain('Инкогнито-проверка');
    expect(quickstart).toContain('только по этим документам');
  });
});

describe('bitrix/integration-guide.md — living doc полного объёма T10.3 (Scope)', () => {
  it('разделы объёма: подключение CSS/JS/шрифтов, крошки/пагинация-сниппеты', () => {
    expect(integrationGuide).toContain('## Что вы подключаете: CSS, JS, шрифты');
    expect(integrationGuide).toContain('## Крошки и пагинация (серверные сниппеты)');
  });

  it('ключевые embed-блоки гайда синхронизируются с файлами сниппетов', () => {
    for (const path of [
      'bitrix/snippets/header-php.snippet.php',
      'bitrix/snippets/breadcrumbs.php',
      'bitrix/snippets/pagination.php',
      'bitrix/snippets/json-data.php',
    ]) {
      expect(integrationGuide, `маркер snippet=${path}`).toContain(`snippet=${path}`);
    }
  });

  it('обновление версии помнит правило версионирования сниппетов («с версии X»)', () => {
    expect(integrationGuide).toContain('## Обновление версии');
    expect(integrationGuide).toContain('с версии');
  });
});

describe('bitrix/bitrix-30-minutes.md — сквозной туториал (Scope: до страницы со списком и формой)', () => {
  it('пять шагов с бюджетом времени, уложенных в 30 минут', () => {
    expect(tutorial).toContain('# Bitrix-разработчику за 30 минут');
    for (const step of ['## Шаг 1', '## Шаг 2', '## Шаг 3', '## Шаг 4', '## Шаг 5']) {
      expect(tutorial, `раздел ${step}`).toContain(step);
    }
    expect(tutorial).toContain('≈30 минут');
  });

  it('путь туториала: подключение → список (паттерн list-page) → форма (контракт T5.6)', () => {
    expect(tutorial).toContain('stand:patterns/list-page');
    expect(tutorial).toContain('stand:patterns/form-page');
    expect(tutorial).toContain('на сервере всегда');
    expect(tutorial).toContain('T5.6');
  });

  it('шаги опираются на те же файлы-сниппеты (один источник с гайдами)', () => {
    for (const path of [
      'bitrix/snippets/header-php.snippet.php',
      'bitrix/snippets/breadcrumbs.php',
      'bitrix/snippets/pagination.php',
      'bitrix/snippets/form-error-render.php',
    ]) {
      expect(tutorial, `маркер snippet=${path}`).toContain(`snippet=${path}`);
    }
    expect(tutorial).toContain('first-connect-checklist.md');
    expect(tutorial).toContain('журнал конфликтов');
  });
});

describe('версионирование сниппетов (Implementation requirements T10.3 п.2)', () => {
  const snippetFiles = readdirSync(join(root, 'bitrix', 'snippets')).filter(
    (name) =>
      (name.endsWith('.php') && name !== 'header-php.snippet.php') ||
      name === 'header-php.snippet.php',
  );

  it('каждый сниппет в snippets/README несёт пометку «с версии …»', () => {
    const markers = snippetsReadme.match(/с версии \d+\.\d+\.\d+/g) ?? [];
    expect(
      markers.length,
      `пометок «с версии X.Y.Z»: ${markers.join(', ')}`,
    ).toBeGreaterThanOrEqual(snippetFiles.length);
    expect(snippetsReadme, 'правило пометки между minor').toContain('между minor');
  });
});

describe('e2e-зеркало синхронно реестру (tests/e2e/guides.spec.js)', () => {
  it('имена гайдов в e2e-спеке = GUIDES (Playwright не импортирует ESM — зеркало с пином)', () => {
    const spec = read('tests', 'e2e', 'guides.spec.js');
    for (const guide of GUIDES) {
      expect(spec, `${guide.name} в зеркале спеки`).toContain(`'${guide.name}'`);
    }
  });
});
