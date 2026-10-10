/**
 * Шаблон страницы компонента в showcase (задача T10.1; 02-architecture §8).
 *
 * Док-страница showcase/dist/docs/<имя>.html собирается ИЗ ФАЙЛОВ КОМПОНЕНТА —
 * дока не расходится с кодом (Context T10.1): живые примеры и копируемый
 * сниппет рендерятся из канонического components/<имя>/<имя>.html, текстовые
 * секции — из блоков README.md (декларативное сопоставление «секция шаблона →
 * ## заголовок README»), машинные части (клавиатурная таблица, ARIA, чек-лист
 * скринридера, schema-заметка, версия/changelog) — из метаданных
 * showcase/docs/<имя>.mjs.
 *
 * Секции шаблона (Scope T10.1, порядок обязателен):
 *   примеры → HTML-сниппет → состояния → responsive-стенд 375/768/1440 в
 *   iframe → a11y-заметки → API → do/don't → schema-заметка → версия/changelog.
 *
 * Контракт «сниппет = разметка стенда» (Implementation requirements п.1,
 * Testing requirements): сниппет и живые примеры — одна и та же строка
 * канонического файла; расхождение ловит сборка (selfChecks в build.mjs гоняют
 * verifyDocPageHtml по ЗАПИСАННОМУ файлу — «диф на билде») и e2e
 * tests/e2e/docs-template.spec.js. Чек-лист «страница = шаблон» —
 * CONTRIBUTING.md.
 *
 * Модуль без сборочных зависимостей: чистые функции + node:fs/node:url для
 * чтения файлов компонента. Потребители — showcase/build.mjs, unit-пины
 * (tests/unit/docs-template.test.js), e2e-спека (tests/e2e/docs-template.spec.js).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Секции страницы по шаблону T10.1 в каноническом порядке (data-ui-docs-section
 * в разметке — по этим маркерам идут проверка сборки, e2e и чек-лист ревью).
 */
export const DOC_SECTIONS = Object.freeze([
  { id: 'examples', title: 'Живые примеры' },
  { id: 'snippet', title: 'HTML-сниппет' },
  { id: 'states', title: 'Состояния' },
  { id: 'responsive', title: 'Responsive-стенд (375/768/1440)' },
  { id: 'a11y', title: 'Доступность (a11y)' },
  { id: 'api', title: 'API' },
  { id: 'do-dont', title: "Do / Don't" },
  { id: 'schema', title: 'Schema.org' },
  { id: 'version', title: 'Версия и changelog' },
]);

/**
 * Эталоны T10.1: три типа — CSS-only (button), CSS+разметка-паттерн (field),
 * JS-компонент (modal). Задача T10.2 расширяет список до всех компонентов dist
 * (добавление = метаданные showcase/docs/<имя>.mjs).
 */
export const REFERENCE_COMPONENTS = Object.freeze(['ui-button', 'ui-field', 'ui-modal']);

/* ── утилиты экранирования ── */

export function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function unescapeHtml(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** Сравнение разметки без шума: CRLF и хвостовые пробелы не считаются дифом. */
export function normalizeMarkup(markup) {
  return markup
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/** Ведущие комментарии разработчика (шапка канонического файла) — не разметка:
 *  сниппет и живые примеры их не показывают. */
export function stripLeadingComments(html) {
  return html.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
}

/* ── источники: файлы компонента ── */

/** Каноническая разметка компонента — единственный источник сниппета и живых
 *  примеров (Implementation requirements T10.1 п.1). */
export function readComponentMarkup(root, name) {
  const file = join(root, 'components', name, `${name}.html`);
  return stripLeadingComments(readFileSync(file, 'utf8'));
}

/** Метаданные доки: showcase/docs/<имя>.mjs (default export). */
export async function loadMetadata(name) {
  const module = await import(
    pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'docs', `${name}.mjs`)).href
  );
  return module.default;
}

/* ── README → блоки ── */

/**
 * Разбор README компонента на «## заголовок → тело». Текст до первого «## » —
 * интро (лид страницы). «###» остаются внутри тела секции.
 */
export function parseReadme(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = new Map();
  let intro = [];
  let current = null;
  let body = null;
  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      if (current) sections.set(current, (body ?? []).join('\n').trim());
      current = heading[1];
      body = [];
      continue;
    }
    if (current === null) intro.push(line);
    else body.push(line);
  }
  if (current) sections.set(current, (body ?? []).join('\n').trim());
  return { intro: intro.join('\n').trim(), sections };
}

/** Тело README-секции по заголовку; отсутствие — ошибка сборки (дока
 *  разошлась с сопоставлением метаданных). */
export function readmeSection(parsed, name, heading, slot) {
  const body = parsed.sections.get(heading);
  if (body === undefined) {
    throw new Error(
      `docs-template: ${name} — в README.md нет секции «${heading}» ` +
        `(слот «${slot}» метаданных showcase/docs/${name}.mjs)`,
    );
  }
  return body;
}

/* ── markdown → HTML (ровно те конструкции, что живут в README компонентов) ── */

/** Инлайн-разметка: `код`, **жирный**, [текст](цель). Репо-относительные цели
 *  (не http) — не ссылки (док-страница — часть статического полигона, исходники
 *  репозитория в нём не раздаются): текст + <code>-путь. */
function renderInline(text) {
  let out = escapeHtml(text);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_all, code) => {
    codes.push(`<code>${code}</code>`);
    return `\uFFF0${codes.length - 1}\uFFF0`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, text2, target) => {
    if (/^https?:\/\//.test(target)) return `<a href="${target}">${text2}</a>`;
    // Перекрёстные ссылки полигона (T10.2 «связность»): README живёт в
    // репозитории, а ссылка рендерится на док-странице showcase/dist/docs/,
    // поэтому репо-относительный путь в ней был бы битым. Явные схемы:
    //   doc:<имя>              → ../docs/<имя>.html   (дока соседа)
    //   stand:<имя>            → ../stands/<имя>.html (стенд компонента)
    //   stand:patterns/<имя>   → ../stands/patterns/<имя>.html (стенд паттерна)
    // Существование цели пинит сборка (brokenDocLinks в selfChecks).
    const doc = /^doc:([\w-]+)$/.exec(target);
    if (doc) return `<a href="../docs/${doc[1]}.html">${text2}</a>`;
    const stand = /^stand:([\w/-]+)$/.exec(target);
    if (stand) return `<a href="../stands/${stand[1]}.html">${text2}</a>`;
    const clean = target.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
    return text2 === clean ? `<code>${clean}</code>` : `${text2} (<code>${clean}</code>)`;
  });
  return out.replace(/\uFFF0(\d+)\uFFF0/g, (_all, index) => codes[Number(index)]);
}

const BLOCK_START = /^(?:#{3,6}\s|```|\||[-*]\s|\d+[.)]\s)/;

/**
 * Блочный рендер: абзацы, «###»-заголовки, маркированные/нумерованные списки
 * (многострочные пункты), таблицы с шапкой, fenced-код. doDont — пункты
 * «**Do**…»/«**Don't**…» получают классы подсветки (плохая разметка —
 * статический пример, не живой: код внутри <code>).
 */
export function renderMarkdown(markdown, { doDont = false } = {}) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      flushParagraph();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // закрывающий ```
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{3,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith('|')) {
      flushParagraph();
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    const listMatch = /^([-*]|\d+[.)])\s+/.exec(line);
    if (listMatch) {
      flushParagraph();
      const ordered = listMatch[1] !== '-' && listMatch[1] !== '*';
      const items = [];
      let item = [];
      const flushItem = () => {
        if (item.length) {
          const content = renderInline(item.join(' '));
          let liClass = '';
          if (doDont) {
            if (content.startsWith('<strong>Do</strong>')) liClass = ' class="ui-docs-do"';
            else if (content.startsWith("<strong>Don't</strong>"))
              liClass = ' class="ui-docs-dont"';
          }
          items.push(`<li${liClass}>${content}</li>`);
          item = [];
        }
      };
      while (i < lines.length) {
        const current = lines[i];
        if (current.trim() === '') break;
        if (/^([-*]|\d+[.)])\s+/.test(current)) {
          // Новый пункт (инвариант завершения: маркер потребляет строку —
          // первый вызов гарантирован внешним listMatch).
          flushItem();
          item.push(current.replace(/^([-*]|\d+[.)])\s+/, ''));
        } else if (BLOCK_START.test(current)) {
          // Начало другого блока — список закончился (i не двигаем: строку
          // разберёт внешний цикл).
          break;
        } else {
          // Продолжение многострочного пункта.
          item.push(current.trim());
        }
        i += 1;
      }
      flushItem();
      const listClass = doDont ? ' class="ui-docs-dodont"' : '';
      out.push(
        ordered
          ? `<ol${listClass}>\n${items.join('\n')}\n</ol>`
          : `<ul${listClass}>\n${items.join('\n')}\n</ul>`,
      );
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }
  flushParagraph();
  return out.join('\n');
}

/** Таблица | a | b | со строкой-разделителем → thead/tbody, th scope="col". */
function renderTable(rows) {
  const cells = (row) =>
    row
      .replace(/^\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((cell) => cell.trim());
  const hasHeader = rows.length >= 2 && /^[\s|:-]+$/.test(rows[1]);
  const header = hasHeader ? cells(rows[0]) : null;
  const bodyRows = hasHeader ? rows.slice(2) : rows;
  const renderRow = (row, tag) =>
    `<tr>${cells(row)
      .map((cell) => `<${tag}>${renderInline(cell)}</${tag}>`)
      .join('')}</tr>`;
  const thead = header
    ? `<thead>\n<tr>${header
        .map((cell) => `<th scope="col">${renderInline(cell)}</th>`)
        .join('')}</tr>\n</thead>`
    : '';
  const tbody = `<tbody>\n${bodyRows.map((row) => renderRow(row, 'td')).join('\n')}\n</tbody>`;
  return `<table>\n${[thead, tbody].filter(Boolean).join('\n')}\n</table>`;
}

/* ── каркас страницы ── */

/** CSS док-страницы — зона showcase (в dist не попадает), токены слоя 2. */
const DOCS_STYLE = `<style>
  .ui-docs-frames {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-4);
    align-items: flex-start;
    margin: 0 0 var(--ui-space-4);
  }
  .ui-docs-frame {
    margin: 0;
    max-width: 100%;
    overflow-x: auto;
    /* Прокручиваемая область обязана быть доступна с клавиатуры (WCAG 2.1.1;
       гейт axe scrollable-region-focusable): узкий экран страницы docs —
       фрейм 768/1440 скроллится по x. */
  }
  .ui-docs-frame iframe {
    display: block;
    border: var(--ui-border-width) solid var(--ui-border-color);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-color-surface);
  }
  .ui-docs-frame figcaption {
    font-size: var(--ui-fs-small);
    color: var(--ui-color-text-muted);
    margin-top: var(--ui-space-2);
  }
  .ui-docs-snippet {
    background: var(--ui-color-surface-muted);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-3) var(--ui-space-4);
    overflow-x: auto;
    margin: 0 0 var(--ui-space-4);
  }
  .ui-docs-snippet code {
    font-family: var(--ui-font-family-mono);
    font-size: var(--ui-fs-small);
  }
  .ui-docs-dodont {
    list-style: none;
    padding-inline-start: 0;
  }
  .ui-docs-dodont li {
    position: relative;
    padding-inline-start: var(--ui-space-5);
    margin-block: var(--ui-space-2);
  }
  .ui-docs-dodont li::before {
    position: absolute;
    inset-inline-start: 0;
    font-weight: var(--ui-fw-body-bold);
  }
  .ui-docs-do::before {
    content: '✓';
    color: var(--ui-color-success);
  }
  .ui-docs-dont::before {
    content: '✕';
    color: var(--ui-color-error);
  }
</style>`;

function section(id, title, body) {
  return [
    `<section data-ui-docs-section="${id}" aria-labelledby="ui-docs-${id}-heading">`,
    `<h2 id="ui-docs-${id}-heading">${title}</h2>`,
    body,
    '</section>',
  ].join('\n');
}

const STAND_NOTE = 'ui-showcase-stand__note';

/** Responsive-секция: реальные iframe-вьюпорты (не картинки) — один и тот же
 *  стенд компонента в трёх ширинах (Implementation requirements T10.1 п.2). */
function renderResponsive(name) {
  const widths = [
    { width: 375, label: '375 — мобильный' },
    { width: 768, label: '768 — планшет (md шкалы T2.5)' },
    { width: 1440, label: '1440 — десктоп (2xl шкалы T2.5)' },
  ];
  const frames = widths
    .map(
      ({ width, label }) =>
        `  <figure class="ui-docs-frame" tabindex="0">\n` +
        `    <iframe src="../stands/${name}.html" title="Стенд ${name}, ширина ${width} пикселей" width="${width}" height="480"></iframe>\n` +
        `    <figcaption>${label}</figcaption>\n` +
        `  </figure>`,
    )
    .join('\n');
  return section(
    'responsive',
    'Responsive-стенд (375/768/1440)',
    [
      `<p class="${STAND_NOTE}">Реальные iframe-вьюпорты, не картинки: один и тот же стенд ` +
        `<a href="../stands/${name}.html">${name}</a> в трёх ширинах — ` +
        `мобильный 375, <code>md</code> 768 и <code>2xl</code> 1440 шкалы брейкпоинтов. ` +
        `Внутри фрейма — живой компонент: поперечный скролл фрейма показывает поведение ` +
        `компонента на узком вьюпорте.</p>`,
      '<div class="ui-docs-frames">',
      frames,
      '</div>',
    ].join('\n'),
  );
}

/**
 * Главная док-страница компонента (тело <main>; каркас добавляет build.mjs).
 * Все секции шаблона — по порядку DOC_SECTIONS; порядок проверяет сборка
 * (verifyDocPageHtml) и e2e.
 */
export function renderDocPage({ name, markup, readme, metadata }) {
  const parsed = parseReadme(readme);
  const doc = [];

  doc.push(`<h1>${name}</h1>`);
  if (parsed.intro) doc.push(renderMarkdown(parsed.intro));
  doc.push(
    `<p class="${STAND_NOTE}">Дока по единому шаблону (T10.1, 02-architecture §8). ` +
      `Полная матрица вариантов и состояний — стенд ` +
      `<a href="../stands/${name}.html">${name}</a>; каталог — ` +
      `<a href="../index.html">irao-ui showcase</a>. Источник страницы — файлы ` +
      `компонента: <code>components/${name}/</code> (разметка, README, метаданные ` +
      `<code>showcase/docs/${name}.mjs</code>).</p>`,
  );
  doc.push(DOCS_STYLE);

  /* 1. Живые примеры: каноническая разметка как есть (не картинка, не копия). */
  doc.push(
    section(
      'examples',
      'Живые примеры',
      [
        `<p class="${STAND_NOTE}">Канонический паттерн ` +
          `<code>components/${name}/${name}.html</code> вживую. Полный набор вариантов ` +
          `и состояний — на стенде <a href="../stands/${name}.html">${name}</a>.</p>`,
        '<div class="ui-docs-examples" data-ui-docs-examples>',
        '<!-- ui-docs-examples:start -->',
        markup,
        '<!-- ui-docs-examples:end -->',
        '</div>',
      ].join('\n'),
    ),
  );

  /* 2. Копируемый сниппет: та же строка, что примеры выше (экранирована). */
  doc.push(
    section(
      'snippet',
      'HTML-сниппет',
      [
        `<p class="${STAND_NOTE}">Копируемая разметка — тот же источник, что живые примеры ` +
          `выше: <code>components/${name}/${name}.html</code>. Синхронность ` +
          `«сниппет = разметка стенда» проверяет сборка (selfChecks, диф на билде) и ` +
          `<code>tests/e2e/docs-template.spec.js</code>.</p>`,
        `<pre class="ui-docs-snippet" data-ui-docs-snippet><code>${escapeHtml(markup)}</code></pre>`,
      ].join('\n'),
    ),
  );

  /* 3. Состояния — README-блоки по метаданным. */
  doc.push(
    section(
      'states',
      'Состояния',
      metadata.readme.states
        .map((heading) => renderMarkdown(readmeSection(parsed, name, heading, 'readme.states')))
        .join('\n'),
    ),
  );

  /* 4. Responsive: iframe 375/768/1440 (выше). */
  doc.push(renderResponsive(name));

  /* 5. A11y: клавиатурная таблица + ARIA + README-блоки + чек-лист скринридера. */
  const keyboardRows = metadata.keyboard
    .map(
      (row) =>
        `<tr><td><kbd>${escapeHtml(row.keys)}</kbd></td><td>${renderInline(row.action)}</td></tr>`,
    )
    .join('\n');
  const ariaRows = metadata.aria
    .map((row) => `<tr><td>${renderInline(row.what)}</td><td>${renderInline(row.why)}</td></tr>`)
    .join('\n');
  const srRows = metadata.screenReader.rows
    .map(
      (row) =>
        `<tr><td>${renderInline(row.scenario)}</td><td>${renderInline(row.expect)}</td>` +
        `<td><code>${escapeHtml(row.pin)}</code></td></tr>`,
    )
    .join('\n');
  doc.push(
    section(
      'a11y',
      'Доступность (a11y)',
      [
        '<h3>Клавиатура</h3>',
        '<table>',
        '<thead>',
        '<tr><th scope="col">Клавиши</th><th scope="col">Поведение</th></tr>',
        '</thead>',
        `<tbody>\n${keyboardRows}\n</tbody>`,
        '</table>',
        '<h3>ARIA-атрибуты и семантика</h3>',
        '<table>',
        '<thead>',
        '<tr><th scope="col">Атрибут / семантика</th><th scope="col">Зачем</th></tr>',
        '</thead>',
        `<tbody>\n${ariaRows}\n</tbody>`,
        '</table>',
        metadata.readme.a11y
          .map((heading) => renderMarkdown(readmeSection(parsed, name, heading, 'readme.a11y')))
          .join('\n'),
        '<h3>Чек-лист скринридера (протокол T9.2)</h3>',
        `<p class="${STAND_NOTE}">Матрица и ожидания озвучки — ` +
          `<code>${escapeHtml(metadata.screenReader.source)}</code>` +
          (metadata.screenReader.note ? ` (${escapeHtml(metadata.screenReader.note)})` : '') +
          ': ручной прогон с NVDA/VoiceOver — релизный гейт T12.1; авто-пины контракта — ' +
          'ниже.</p>',
        '<table>',
        '<thead>',
        '<tr><th scope="col">Сценарий</th><th scope="col">Ожидаемое объявление</th><th scope="col">Пин (авто)</th></tr>',
        '</thead>',
        `<tbody>\n${srRows}\n</tbody>`,
        '</table>',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  );

  /* 6. API. */
  doc.push(
    section(
      'api',
      'API',
      metadata.readme.api
        .map((heading) => renderMarkdown(readmeSection(parsed, name, heading, 'readme.api')))
        .join('\n'),
    ),
  );

  /* 7. Do / Don't: подсветка «плохой» разметки — статические примеры. */
  doc.push(
    section(
      'do-dont',
      "Do / Don't",
      metadata.readme.doDont
        .map((heading) =>
          renderMarkdown(readmeSection(parsed, name, heading, 'readme.doDont'), { doDont: true }),
        )
        .join('\n'),
    ),
  );

  /* Дополнительные README-блоки вне шаблона (Bitrix-заметки, границы) — после
     do/don't, до schema/версии; шаблонные секции проверяются независимо. */
  for (const [index, heading] of (metadata.readme.extra ?? []).entries()) {
    doc.push(
      [
        `<section data-ui-docs-section="extra" aria-labelledby="ui-docs-extra-${index}-heading">`,
        `<h2 id="ui-docs-extra-${index}-heading">${escapeHtml(heading)}</h2>`,
        renderMarkdown(readmeSection(parsed, name, heading, `readme.extra[${index}]`)),
        '</section>',
      ].join('\n'),
    );
  }

  /* 8. Schema.org-заметка: секция присутствует всегда; н/п — осознанно. */
  doc.push(
    section(
      'schema',
      'Schema.org',
      metadata.schema
        ? renderMarkdown(metadata.schema)
        : `<p>Микроразметка schema.org для компонента не предусмотрена (н/п): семантика — ` +
            `нативная HTML-разметка компонента. Schema-паттерны системы (BreadcrumbList, ` +
            `JobPosting и др.) документируются на страницах своих компонентов и паттернов ` +
            `(см. правило «не ради галочки» — 02-architecture §0).</p>`,
    ),
  );

  /* 9. Версия введения и changelog (semver — 02-architecture §11). */
  const changelogRows = metadata.version.changelog
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.version)}</td><td>${renderInline(entry.change)}</td></tr>`,
    )
    .join('\n');
  doc.push(
    section(
      'version',
      'Версия и changelog',
      [
        `<p>Введён в версии <strong>${escapeHtml(metadata.version.introduced)}</strong> ` +
          `(задача <code>${escapeHtml(metadata.version.task)}</code>). Изменение классов, ` +
          `data-атрибутов или канонического HTML — только мажорной версией (semver, ` +
          `02-architecture §11); обратная совместимость HTML-паттернов важнее удобства кода.</p>`,
        '<table>',
        '<thead>',
        '<tr><th scope="col">Версия</th><th scope="col">Изменение</th></tr>',
        '</thead>',
        `<tbody>\n${changelogRows}\n</tbody>`,
        '</table>',
      ].join('\n'),
    ),
  );

  return doc.join('\n');
}

/* ── машинная проверка «страница = шаблон» (сборка + unit + e2e) ── */

/**
 * Извлечь из ЗАПИСАННОЙ док-страницы пару «живые примеры / сниппет»:
 * сниппет разэкранируется — обе строки сравнимы с каноническим файлом.
 */
export function extractDocPageChecks(html) {
  const examples =
    /<!-- ui-docs-examples:start -->\n([\s\S]*?)\n<!-- ui-docs-examples:end -->/.exec(html);
  const snippet = /data-ui-docs-snippet><code>([\s\S]*?)<\/code><\/pre>/.exec(html);
  return {
    examples: examples ? examples[1].trim() : null,
    snippet: snippet ? unescapeHtml(snippet[1]).trim() : null,
  };
}

/**
 * Чек-лист «страница = шаблон» в машинной форме: все 9 секций по порядку,
 * сниппет = каноническому файлу, живые примеры = сниппету («сниппет = разметка
 * стенда»), responsive — ровно iframe 375/768/1440. Возвращает список проблем
 * (пустой = страница соответствует шаблону); сборка падает на первой.
 */
export function verifyDocPageHtml(html, markup) {
  const problems = [];
  let last = -1;
  for (const docSection of DOC_SECTIONS) {
    const marker = `data-ui-docs-section="${docSection.id}"`;
    const at = html.indexOf(marker);
    if (at < 0) {
      problems.push(`нет секции «${docSection.title}» (${docSection.id})`);
    } else if (at < last) {
      problems.push(`секция «${docSection.title}» нарушает порядок шаблона`);
    } else {
      last = at;
    }
  }
  const { examples, snippet } = extractDocPageChecks(html);
  if (snippet === null) {
    problems.push('сниппет не найден (data-ui-docs-snippet)');
  } else if (normalizeMarkup(snippet) !== normalizeMarkup(markup)) {
    problems.push('сниппет ≠ каноническому файлу компонента (диф: дока отстала от кода)');
  }
  if (examples === null) {
    problems.push('разметка живых примеров не найдена (data-ui-docs-examples)');
  } else if (snippet !== null && normalizeMarkup(examples) !== normalizeMarkup(snippet)) {
    problems.push('разметка живых примеров ≠ сниппету («сниппет = разметка стенда», T10.1)');
  }
  const frames = Array.from(html.matchAll(/<iframe[^>]*\swidth="(\d+)"/g), (match) => match[1]);
  if (frames.join(' ') !== '375 768 1440') {
    problems.push(
      `responsive-секция: ожидались iframe 375/768/1440, получено ${frames.join('/') || '—'}`,
    );
  }
  return problems;
}

/* ── полнота док (T10.2, Technical considerations): инвентаризация
   «компоненты dist + паттерны ↔ страницы showcase». Сборка гоняет её в
   selfChecks — «у каждого каталога components/* есть страница и наоборот». ── */

/** Метаданные док из УКАЗАННОГО корня. require(esm), а не import(): функция
 *  исполняется и сборкой (plain Node), и юнит-пинами полноты (T10.2) под
 *  Vitest — трансформер Vite не резолвит динамический import() файлов вне
 *  корня проекта (временные фикстуры тестов), а createRequire не
 *  перехватывается. Node 24: require(esm) синхронен для модулей без
 *  top-level await — default-экспорт объекта метаданных этому удовлетворяет. */
const requireDocMetadata = createRequire(import.meta.url);

function importDocMetadata(root, name) {
  const metadata = requireDocMetadata(join(root, 'showcase', 'docs', `${name}.mjs`));
  return Promise.resolve(metadata?.default ?? metadata);
}

/** Обязательные слоты маппинга «секция шаблона → ## заголовок README». */
const DOC_README_SLOTS = Object.freeze(['states', 'a11y', 'api', 'doDont']);

/** Обязательные секции README паттерна (чек-лист прогона T10.2): состав/
 *  разметка («Формула секции» — лендинг-паттерн T8.3), a11y (заголовок может
 *  нести уточнение, как «A11y — диалог-чек» search-overlay), do/don't. */
const PATTERN_SECTION_CHECKS = Object.freeze([
  ['состава/разметки', /^(?:Состав|Разметка|Формула секции)$/],
  ['A11y', /^A11y/],
  ["Do / Don't", /^Do \/ Don't/],
]);

/**
 * Пробелы полноты док. Пустой список = у каждого каталога components/ui-*
 * есть README и метаданные док-страницы (маппинг указывает на существующие
 * «## заголовки», машинные части — клавиатура/ARIA/скринридер/версия —
 * непусты), у каждого showcase/docs/*.mjs есть компонент («и наоборот»),
 * у каждого patterns/<имя>/ — канонический html (источник стенда) и README
 * с обязательными секциями. Синхронизировано с чек-листом CONTRIBUTING
 * («страница = шаблон») и юнит-пинами tests/unit/docs-completeness.test.js.
 */
export async function docCompletenessProblems(root) {
  const problems = [];

  const componentsDir = join(root, 'components');
  const componentNames = existsSync(componentsDir)
    ? readdirSync(componentsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('ui-'))
        .map((entry) => entry.name)
        .sort()
    : [];

  const docsDir = join(root, 'showcase', 'docs');
  const docNames = existsSync(docsDir)
    ? readdirSync(docsDir)
        .filter((entry) => entry.endsWith('.mjs'))
        .map((entry) => entry.slice(0, -'.mjs'.length))
        .sort()
    : [];

  for (const name of componentNames) {
    const readmePath = join(componentsDir, name, 'README.md');
    if (!existsSync(readmePath)) {
      problems.push(`${name}: нет components/${name}/README.md — источник секций док-страницы`);
      continue; // слоты маппинга без README не проверить
    }
    if (!existsSync(join(docsDir, `${name}.mjs`))) {
      problems.push(
        `${name}: нет метаданных showcase/docs/${name}.mjs — док-страница не соберётся ` +
          '(чек-лист «страница = шаблон», CONTRIBUTING)',
      );
      continue;
    }
    let metadata;
    try {
      metadata = await importDocMetadata(root, name);
    } catch (error) {
      problems.push(`${name}: метаданные showcase/docs/${name}.mjs не импортируются (${error.message})`);
      continue;
    }
    if (!metadata || typeof metadata !== 'object') {
      problems.push(`${name}: метаданные showcase/docs/${name}.mjs без default-экспорта объекта`);
      continue;
    }
    const parsed = parseReadme(readFileSync(readmePath, 'utf8'));
    const slots = metadata.readme ?? {};
    for (const slot of DOC_README_SLOTS) {
      const headings = slots[slot];
      if (!Array.isArray(headings) || headings.length === 0) {
        problems.push(`${name}: слот readme.${slot} пуст — секция шаблона останется пустой`);
        continue;
      }
      for (const heading of headings) {
        if (!parsed.sections.has(heading)) {
          problems.push(`${name}: в README.md нет секции «${heading}» (слот readme.${slot})`);
        }
      }
    }
    for (const [index, heading] of (slots.extra ?? []).entries()) {
      if (!parsed.sections.has(heading)) {
        problems.push(`${name}: в README.md нет секции «${heading}» (слот readme.extra[${index}])`);
      }
    }
    // A11y-требование T10.2 «секция шаблона — непустая»: машинные части
    // a11y-секции (клавиатура, ARIA, скринридер) обязаны быть заполнены.
    if (!Array.isArray(metadata.keyboard) || metadata.keyboard.length === 0) {
      problems.push(`${name}: клавиатурная таблица (metadata.keyboard) пуста`);
    }
    if (!Array.isArray(metadata.aria) || metadata.aria.length === 0) {
      problems.push(`${name}: ARIA-список (metadata.aria) пуст`);
    }
    if (!Array.isArray(metadata.screenReader?.rows) || metadata.screenReader.rows.length === 0) {
      problems.push(`${name}: чек-лист скринридера (metadata.screenReader.rows) пуст (протокол T9.2)`);
    }
    if (!metadata.version?.introduced || !metadata.version?.task) {
      problems.push(`${name}: version.introduced / version.task не заполнены`);
    }
  }

  // «И наоборот»: страница без компонента.
  for (const name of docNames) {
    if (!componentNames.includes(name)) {
      problems.push(
        `showcase/docs/${name}.mjs: нет components/${name}/ — метаданные без компонента`,
      );
    }
  }

  // Паттерны: страница паттерна в showcase — стенд (standSource — канонический
  // html), дока — README; полнота — обязательные секции чек-листа.
  const patternsDir = join(root, 'patterns');
  if (existsSync(patternsDir)) {
    const patternNames = readdirSync(patternsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of patternNames) {
      if (!existsSync(join(patternsDir, name, `${name}.html`))) {
        problems.push(`patterns/${name}: нет ${name}.html — стенд showcase не соберётся`);
      }
      const readmePath = join(patternsDir, name, 'README.md');
      if (!existsSync(readmePath)) {
        problems.push(`patterns/${name}: нет README.md — дока паттерна`);
        continue;
      }
      const headings = Array.from(
        readFileSync(readmePath, 'utf8').matchAll(/^##\s+(.+?)\s*$/gm),
        (match) => match[1],
      );
      for (const [label, re] of PATTERN_SECTION_CHECKS) {
        if (!headings.some((heading) => re.test(heading))) {
          problems.push(`patterns/${name}: в README.md нет секции «${label}» (чек-лист паттерна)`);
        }
      }
    }
  }

  return problems;
}

/**
 * Битые ссылки записанной страницы (AC T10.2 «перекрёстные ссылки работают —
 * нет битых»): относительные href/src разрешаются относительно baseDir
 * (каталог страницы в полигоне) и обязаны существовать. Схемы-цели
 * (якоря, http(s), mailto, data) — не файлы полигона, пропускаются.
 * Возвращает список проблем (пустой = все ссылки резолвятся).
 */
export function brokenDocLinks(html, baseDir) {
  const problems = [];
  for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const target = match[1];
    if (target === '' || /^(?:https?:|mailto:|data:|#)/.test(target)) continue;
    const clean = target.split('#')[0].split('?')[0];
    if (clean === '') continue;
    if (!existsSync(join(baseDir, clean))) {
      problems.push(`${target} — цели нет в полигоне`);
    }
  }
  return problems;
}
