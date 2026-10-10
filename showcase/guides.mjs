/**
 * Гайды внедрения (задача T10.3): quickstart, integration guide,
 * «Bitrix-разработчику за 30 минут».
 *
 * Living-источники — markdown-файлы bitrix/ (читаются и в репозитории);
 * сборка (showcase/build.mjs) публикует их как страницы полигона
 * showcase/dist/docs/<имя>.html по общему каркасу (frame) — тот же приём,
 * что у док-страниц компонентов (docs-template.mjs), только источник —
 * целостный markdown, а не файлы компонента.
 *
 * Контракт «сниппет в гайде = файл» (AC T10.3, сверка — один источник):
 * кодовые блоки, которые представляют файл bitrix/snippets/ (или канонический
 * компонент components/), помечаются в info-строке fence:
 *
 *   ```php snippet=bitrix/snippets/header-php.snippet.php
 *   …код — точный (под)кусок файла-источника…
 *   ```
 *
 * guideSyncProblems сверяет каждый блок с файлом (блок обязан быть
 * нормализованным (под)куском файла: equality для полных файлов,
 * includes для копипаст-фрагментов). Дрейф («правил файл — гайд отстал»)
 * валит сборку — «диф на билде», тот же контракт, что у T10.1 для
 * «сниппет = разметка стенда»; юнит-пины — tests/unit/guides.test.js.
 *
 * Модуль без сборочных зависимостей: чистые функции + node:fs. Потребители —
 * showcase/build.mjs, tests/unit/guides.test.js; живой DOM полигона пинит
 * tests/e2e/guides.spec.js (зеркало GUIDES там — сознательное, спека
 * Playwright ESM не импортирует; синхрон зеркал — юнит-пин).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  escapeHtml,
  normalizeMarkup,
  parseReadme,
  renderInline,
  renderMarkdown,
} from './docs-template.mjs';

/**
 * Три документа T10.3. title — доступное имя h1 полигонной страницы (и
 * зеркало в tests/e2e/guides.spec.js); file — living-источник в репозитории.
 * Имена не должны пересекаться с именами компонентов (страница
 * docs/<имя>.html — общий каталог; гейт — selfChecks сборки).
 */
export const GUIDES = Object.freeze([
  {
    name: 'quickstart',
    file: 'bitrix/quickstart.md',
    title: 'Quickstart: подключение irao-ui за 5 минут',
  },
  {
    name: 'integration-guide',
    file: 'bitrix/integration-guide.md',
    title: 'Integration guide: подключение и миграция (living doc)',
  },
  {
    name: 'bitrix-30-minutes',
    file: 'bitrix/bitrix-30-minutes.md',
    title: 'Bitrix-разработчику за 30 минут',
  },
]);

/** Маркер embed-блока в info-строке fence: snippet=<репо-путь от корня>. */
const SNIPPET_MARKER = /\bsnippet=([^\s`]+)/;

/** Living-исходник гайда из корня репозитория. */
export function readGuide(root, guide) {
  return readFileSync(join(root, guide.file), 'utf8');
}

/**
 * Извлечь embed-блоки: fence, чья info-строка содержит snippet=<путь>.
 * Обычные fence (без маркера) не трогаются — это учебный код зоны сайта.
 * Возвращает [{ path, line, code }]; line — 1-based строка начала блока
 * (в сообщения проблем).
 */
export function extractSnippetBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (current) {
      if (line.startsWith('```')) {
        blocks.push({ path: current.path, line: current.line, code: current.code.join('\n') });
        current = null;
      } else {
        current.code.push(line);
      }
      continue;
    }
    if (line.startsWith('```')) {
      const marker = SNIPPET_MARKER.exec(line);
      if (marker) current = { path: marker[1], line: index + 1, code: [] };
    }
  }
  if (current) {
    // Незакрытый fence: рендер молча съест хвост документа, синхронизация —
    // сравнит хвост файла с блоком. Явная ошибка честнее.
    throw new Error(
      `guides: незакрытый fence с маркером snippet=${current.path} (строка ${current.line})`,
    );
  }
  return blocks;
}

/**
 * Пробелы синхронизации одного гайда. Каждый embed-блок обязан быть
 * нормализованным (под)куском файла-источника (CRLF и хвостовые пробелы —
 * не диф, normalizeMarkup). markdown — параметр для юнит-фикстур; по
 * умолчанию читается living-источник гайда. Возвращает список проблем
 * (пустой = синхронно).
 */
export function guideSyncProblems(root, guide, markdown = readGuide(root, guide)) {
  const problems = [];
  for (const block of extractSnippetBlocks(markdown)) {
    const file = join(root, block.path);
    if (!existsSync(file)) {
      problems.push(
        `гайд «${guide.name}»: файл сниппета ${block.path} не найден ` +
          `(блок со строки ${block.line})`,
      );
      continue;
    }
    const fileText = normalizeMarkup(readFileSync(file, 'utf8'));
    const blockText = normalizeMarkup(block.code);
    if (!fileText.includes(blockText)) {
      problems.push(
        `гайд «${guide.name}»: блок snippet=${block.path} (строка ${block.line}) ` +
          'не совпадает с файлом-источником — сниппет в гайде отстал от файла ' +
          '(один источник — файл; обновите блок или файл с пометкой «с версии X»)',
      );
    }
  }
  return problems;
}

/**
 * Пробелы полноты: каждый файл bitrix/snippets/*.php упомянут хотя бы в
 * одном гайде (гайды — единая точка входа интегратора; «мёртвый» сниппет,
 * которого нет ни в одном гайде, не находится). Возвращает список проблем.
 */
export function guideSnippetCoverageProblems(root) {
  const snippetsDir = join(root, 'bitrix', 'snippets');
  if (!existsSync(snippetsDir)) return ['каталог bitrix/snippets/ не найден'];
  const union = GUIDES.map((guide) =>
    existsSync(join(root, guide.file)) ? readGuide(root, guide) : '',
  ).join('\n');
  const problems = [];
  const snippets = readdirSync(snippetsDir)
    .filter((name) => name.endsWith('.php'))
    .sort();
  for (const name of snippets) {
    if (!union.includes(name)) {
      problems.push(
        `bitrix/snippets/${name} не упомянут ни в одном гайде T10.3 ` +
          '(гайды — единая точка входа интегратора)',
      );
    }
  }
  return problems;
}

/**
 * Тело страницы гайда (<main>; каркас добавляет build.mjs). Источник —
 * целостный markdown: первая «#»-строка (заголовок репо-документа) не
 * дублируется — h1 берётся из метаданных GUIDES, «##»-разделы источника
 * становятся h2 страницы в исходном порядке, содержимое до первого «##» —
 * лид. Заголовки разделов рендерятся renderInline — та же семантика, что
 * у «extra»-заголовков renderDocPage (инлайн-конструкции заголовков не
 * показываются сырым markdown).
 */
export function renderGuidePage({ guide, markdown }) {
  const withoutTitle = markdown.replace(/^#\s+.+?\r?\n/, '');
  const parsed = parseReadme(withoutTitle);
  const doc = [];

  doc.push(`<h1>${escapeHtml(guide.title)}</h1>`);
  doc.push(
    `<p class="ui-showcase-stand__note">Живой документ: источник — ` +
      `<code>${guide.file}</code> репозитория. Блоки кода с маркером snippet=… ` +
      'сверяются с файлами bitrix/ на билде («диф на билде», ' +
      '<code>tests/unit/guides.test.js</code>) — сниппет в гайде не может ' +
      'отстать от файла.</p>',
  );
  if (parsed.intro) doc.push(renderMarkdown(parsed.intro));
  for (const [heading, body] of parsed.sections) {
    doc.push(`<h2>${renderInline(heading)}</h2>`);
    doc.push(renderMarkdown(body));
  }
  return doc.join('\n');
}
