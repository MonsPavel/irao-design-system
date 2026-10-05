/**
 * Генератор страницы-стенда «Токены» (задача T2.2).
 *
 * Стенд генерируется из файлов токенов, не вручную (Implementation
 * requirements T2.2 п.2): добавленный токен появляется на стенде после
 * `npm run build` сам — «иначе разъедется». Полнота (счётчик узлов стенда =
 * счётчик токенов в файлах) — tests/unit/tokens-stand.test.js.
 *
 * Контракт парсера — файлы токенов пишутся в строгом формате:
 *  — секция: однострочный комментарий `/* ── Заголовок ── *`+`/`;
 *  — объявление: `--ui-name: value;` одной строкой;
 *  — комментарий происхождения — блок комментариев непосредственно над
 *    объявлением (описание токена на стенде);
 *  — media-переопределение — внутри `@media (min-width: Npx) { :root { … } }`
 *    в конце файла (mobile-first), имя обязано иметь базу в :root.
 *
 * Разметка валидна по .htmlvalidate.js (один h1, рекомендованные правила,
 * без inline-стилей: стилевой блок один, значения токенов прилетают через
 * var() по сгенерированным классам — заодно e2e-проверка вычислимости
 * var-цепочек dist). Стили стенда — только rem и var() слоя 2: при
 * `html { font-size: 32px }` стенд масштабируется (сценарий AC T2.2).
 */
export const TOKENS_SOURCES = [
  { file: 'tokens/primitives.css', layer: 'primitive' },
  { file: 'tokens/semantic.css', layer: 'semantic' },
];

/**
 * Парсинг файла токенов.
 * @param {string} source содержимое tokens/*.css
 * @param {'primitive'|'semantic'} layer слой ADR-0009
 * @returns {{ layer: string, sections: Array<{title: string, tokens: Token[]}>, byName: Map<string, Token> }}
 */
export function parseTokensFile(source, layer = 'primitive') {
  const sections = [];
  const byName = new Map();
  let current = null;
  let pendingComments = [];
  let mediaMin = null;
  let depth = 0;
  let mediaOpenDepth = null;

  const ensureSection = () => {
    if (!current) {
      current = { title: layer === 'primitive' ? 'Палитра' : 'Семантика', tokens: [] };
      sections.push(current);
    }
    return current;
  };

  for (const raw of source.split('\n')) {
    const line = raw.trim();

    // Секция — ровно однострочный комментарий-заголовок.
    const sectionMatch = line.match(/^\/\* ── (.+) ── \*\/$/);
    if (sectionMatch) {
      current = { title: sectionMatch[1].trim(), tokens: [] };
      sections.push(current);
      pendingComments = [];
      continue;
    }

    // Прочие комментарии: шапка файла и происхождение токенов.
    if (line.startsWith('/*') || line.startsWith('*') || line.endsWith('*/')) {
      pendingComments.push(
        line
          .replace(/^\/\*+/, '')
          .replace(/\*\/$/, '')
          .replace(/^\*+/, '')
          .trim(),
      );
      continue;
    }

    // Открытие media-блока (mobile-first, конец файла).
    const mediaMatch = line.match(/^@media\s*\(min-width:\s*(\d+)px\)\s*\{$/);
    if (mediaMatch) {
      mediaMin = Number(mediaMatch[1]);
      mediaOpenDepth = depth;
      depth += 1;
      continue;
    }

    // :root открывается и все закрывающие скобки — только структура.
    if (line === ':root {' || line === '}') {
      if (line === ':root {') {
        depth += 1;
      } else {
        depth -= 1;
        if (mediaMin !== null && depth === mediaOpenDepth) {
          mediaMin = null;
          mediaOpenDepth = null;
        }
      }
      continue;
    }

    // Объявление токена — одной строкой.
    const declMatch = line.match(/^(--[a-z0-9-]+)\s*:\s*([^;]+);$/);
    if (declMatch) {
      const [, name, value] = declMatch;
      const description = pendingComments.join(' ').replace(/\s+/g, ' ').trim();
      pendingComments = [];
      if (mediaMin !== null) {
        const base = byName.get(name);
        if (!base) {
          throw new Error(`tokens-stand: media-override без базового токена: ${name}`);
        }
        base.media.push({ min: mediaMin, value: value.trim() });
      } else {
        if (byName.has(name)) {
          throw new Error(`tokens-stand: дубль базового токена: ${name}`);
        }
        const token = {
          layer,
          section: ensureSection().title,
          name,
          value: value.trim(),
          description,
          media: [],
        };
        byName.set(name, token);
        ensureSection().tokens.push(token);
      }
      continue;
    }
    // Пустые строки и всё прочее — игнор.
  }

  return { layer, sections, byName };
}

/**
 * Плоский список токенов нескольких файлов в порядке объявления (без дублей —
 * парсер бросает на повторном базовом имени).
 * @param {Array<ReturnType<parseTokensFile>>} parsedFiles
 */
export function collectTokens(parsedFiles) {
  const tokens = [];
  for (const parsed of parsedFiles) {
    for (const section of parsed.sections) {
      tokens.push(...section.tokens);
    }
  }
  return tokens;
}

/* ── рендер ── */

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Имя токена → безопасный CSS-класс (имена --ui-* — [a-z0-9-]). */
const demoClass = (name) => `d-${name.replace(/^--ui-/, '')}`;

/** Тип отображения секции. */
function sectionType(layer, title) {
  if (layer === 'primitive') return 'swatch';
  if (title.includes('Цвета')) return 'swatch';
  if (title.startsWith('Типографика')) return 'typography';
  if (title.startsWith('Отступы')) return 'space';
  if (title.startsWith('Радиусы')) return 'radius';
  if (title.startsWith('Тени')) return 'shadow';
  return 'table';
}

/** Ступени значения: база + media-переопределения (mobile-first лестница). */
function ladderText(token) {
  const steps = [`база ${token.value}`];
  for (const override of token.media) {
    steps.push(`≥${override.min}px ${override.value}`);
  }
  return steps.join(' · ');
}

/** Карточка цветового токена: образец + имя + значение. */
function renderSwatch(token) {
  return [
    `        <li class="ts-card" data-token="${token.name}">`,
    `          <span class="ts-swatch ${demoClass(token.name)}" aria-hidden="true"></span>`,
    `          <code class="ts-name">${token.name}</code>`,
    `          <span class="ts-value">${escapeHtml(token.value)}</span>`,
    `        </li>`,
  ].join('\n');
}

/** Роль типографики: живой образец тройкой fs/lh/fw + ступени лестницы. */
function renderTypographyRole(fsToken, byName) {
  const role = fsToken.name.replace('--ui-fs-', '');
  const lh = byName.get(`--ui-lh-${role}`);
  const fw = byName.get(`--ui-fw-${role}`);
  if (!lh || !fw) {
    throw new Error(`tokens-stand: роль ${role} без тройки fs/lh/fw`);
  }
  const specimen = `ts-sp-${role}`;
  return [
    `        <li class="ts-card" data-token="${fsToken.name}">`,
    `          <span class="ts-specimen ${specimen}" aria-hidden="true">Аа</span>`,
    `          <code class="ts-name">${fsToken.name}</code>`,
    `          <span class="ts-value">${escapeHtml(ladderText(fsToken))}</span>`,
    `          <ul class="ts-triple">`,
    `            <li data-token="${lh.name}"><code class="ts-name">${lh.name}</code> <span class="ts-value">${escapeHtml(lh.value)}</span></li>`,
    `            <li data-token="${fw.name}"><code class="ts-name">${fw.name}</code> <span class="ts-value">${escapeHtml(fw.value)}</span></li>`,
    `          </ul>`,
    `        </li>`,
  ].join('\n');
}

function renderTypographySection(section) {
  const byName = new Map(section.tokens.map((token) => [token.name, token]));
  const fsTokens = section.tokens.filter((token) => token.name.startsWith('--ui-fs-'));
  const families = section.tokens.filter((token) => token.name.startsWith('--ui-font-family'));
  const parts = [];
  for (const family of families) {
    parts.push(
      [
        `        <li class="ts-card" data-token="${family.name}">`,
        `          <code class="ts-name">${family.name}</code>`,
        `          <span class="ts-value">${escapeHtml(family.value)}</span>`,
        `        </li>`,
      ].join('\n'),
    );
  }
  for (const fsToken of fsTokens) {
    parts.push(renderTypographyRole(fsToken, byName));
  }
  const orphan = section.tokens.filter(
    (token) =>
      !token.name.startsWith('--ui-fs-') &&
      !token.name.startsWith('--ui-lh-') &&
      !token.name.startsWith('--ui-fw-') &&
      !token.name.startsWith('--ui-font-family'),
  );
  if (orphan.length) {
    throw new Error(
      `tokens-stand: вне тройки в «Типографике»: ${orphan.map((t) => t.name).join(', ')}`,
    );
  }
  // lh/fw без fs-роли — ошибка формата (fs без пары ловит renderTypographyRole).
  for (const token of section.tokens) {
    const pair = token.name.match(/^--ui-(?:lh|fw)-([a-z0-9]+)$/);
    if (pair && !byName.has(`--ui-fs-${pair[1]}`)) {
      throw new Error(`tokens-stand: ${token.name} без --ui-fs-${pair[1]}`);
    }
  }
  return parts.join('\n');
}

function renderSpace(token) {
  return [
    `        <li class="ts-space" data-token="${token.name}">`,
    `          <span class="ts-space-bar ${demoClass(token.name)}" aria-hidden="true"></span>`,
    `          <code class="ts-name">${token.name}</code>`,
    `          <span class="ts-value">${escapeHtml(token.value)}</span>`,
    `        </li>`,
  ].join('\n');
}

function renderBoxDemo(token) {
  return [
    `        <li class="ts-card" data-token="${token.name}">`,
    `          <span class="ts-demo ${demoClass(token.name)}" aria-hidden="true"></span>`,
    `          <code class="ts-name">${token.name}</code>`,
    `          <span class="ts-value">${escapeHtml(token.value)}</span>`,
    `        </li>`,
  ].join('\n');
}

function renderTable(section) {
  const rows = section.tokens.map((token) =>
    [
      `            <tr data-token="${token.name}">`,
      `              <th scope="row"><code class="ts-name">${token.name}</code></th>`,
      `              <td class="ts-value">${escapeHtml(ladderText(token))}</td>`,
      `              <td class="ts-value">${escapeHtml(token.description)}</td>`,
      `            </tr>`,
    ].join('\n'),
  );
  // Обёртка с горизонтальным скроллом: min-content таблицы при 32px базе
  // больше узкого вьюпорта — страница не должна разваливаться (AC T2.2).
  return [
    `      <div class="ts-table-wrap">`,
    `        <table class="ts-table">`,
    `          <thead>`,
    `            <tr><th scope="col">Токен</th><th scope="col">Значение</th><th scope="col">Происхождение / смысл</th></tr>`,
    `          </thead>`,
    `          <tbody>`,
    ...rows,
    `          </tbody>`,
    `        </table>`,
    `      </div>`,
  ].join('\n');
}

/** Стили стенда: только rem и var() слоя 2 — при 32px базе страница масштабируется. */
const STAND_CSS = `
  .ts-lead { font-size: var(--ui-fs-small); line-height: var(--ui-lh-small); color: var(--ui-color-text-muted); max-width: 60rem; }
  .ts-section { margin: 0 0 var(--ui-space-7); }
  .ts-section > h2 { font-size: var(--ui-fs-h3); line-height: var(--ui-lh-h3); font-weight: var(--ui-fw-h3); margin: 0 0 var(--ui-space-4); }
  .ts-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: var(--ui-space-3); }
  .ts-card { border: var(--ui-border-width) solid var(--ui-border-color); border-radius: var(--ui-radius-md); padding: var(--ui-space-3); display: grid; gap: var(--ui-space-2); align-content: start; }
  .ts-swatch { height: 3.5rem; border-radius: var(--ui-radius-sm); border: var(--ui-border-width) solid var(--ui-border-color); }
  .ts-specimen { display: block; border-bottom: var(--ui-border-width) solid var(--ui-border-color); padding-bottom: var(--ui-space-2); overflow: hidden; }
  .ts-triple { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--ui-space-1); }
  .ts-space-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--ui-space-3); max-width: 100%; }
  .ts-space { list-style: none; display: grid; gap: var(--ui-space-1); align-content: start; }
  .ts-space-bar { display: block; height: 1.5rem; max-width: 100%; background: var(--ui-color-accent); border-radius: var(--ui-radius-sm); }
  .ts-demo { display: block; height: 4rem; background: var(--ui-color-surface); border: var(--ui-border-width) solid var(--ui-border-color); }
  .ts-name { font-family: var(--ui-font-family-mono); font-size: var(--ui-fs-micro); overflow-wrap: anywhere; }
  .ts-value { font-size: var(--ui-fs-micro); color: var(--ui-color-text-muted); overflow-wrap: anywhere; }
  .ts-table-wrap { overflow-x: auto; max-width: 100%; }
  .ts-table { width: 100%; border-collapse: collapse; }
  .ts-table th, .ts-table td { text-align: left; vertical-align: top; padding: var(--ui-space-2) var(--ui-space-3) var(--ui-space-2) 0; border-bottom: var(--ui-border-width) solid var(--ui-border-color); }
  .ts-sp-h1 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h1); line-height: var(--ui-lh-h1); font-weight: var(--ui-fw-h1); }
  .ts-sp-h2 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h2); line-height: var(--ui-lh-h2); font-weight: var(--ui-fw-h2); }
  .ts-sp-h3 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h3); line-height: var(--ui-lh-h3); font-weight: var(--ui-fw-h3); }
  .ts-sp-h4 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h4); line-height: var(--ui-lh-h4); font-weight: var(--ui-fw-h4); }
  .ts-sp-h5 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h5); line-height: var(--ui-lh-h5); font-weight: var(--ui-fw-h5); }
  .ts-sp-h6 { font-family: var(--ui-font-family); font-size: var(--ui-fs-h6); line-height: var(--ui-lh-h6); font-weight: var(--ui-fw-h6); }
  .ts-sp-lead { font-family: var(--ui-font-family); font-size: var(--ui-fs-lead); line-height: var(--ui-lh-lead); font-weight: var(--ui-fw-lead); }
  .ts-sp-body { font-family: var(--ui-font-family); font-size: var(--ui-fs-body); line-height: var(--ui-lh-body); font-weight: var(--ui-fw-body); }
  .ts-sp-small { font-family: var(--ui-font-family); font-size: var(--ui-fs-small); line-height: var(--ui-lh-small); font-weight: var(--ui-fw-small); }
  .ts-sp-caption { font-family: var(--ui-font-family); font-size: var(--ui-fs-caption); line-height: var(--ui-lh-caption); font-weight: var(--ui-fw-caption); }
  .ts-sp-micro { font-family: var(--ui-font-family); font-size: var(--ui-fs-micro); line-height: var(--ui-lh-micro); font-weight: var(--ui-fw-micro); }
`;

/**
 * Главная страница стенда (содержимое <main> каркаса showcase).
 * @param {Array<ReturnType<parseTokensFile>>} parsedFiles
 */
export function renderTokensStand(parsedFiles) {
  const styleRules = [];
  const sectionsHtml = [];

  for (const parsed of parsedFiles) {
    const layerTitle =
      parsed.layer === 'primitive'
        ? 'Слой 1 — примитивы (палитра, hex только здесь)'
        : 'Слой 2 — семантика (компоненты читают только его)';
    const layerBlocks = [];
    for (const section of parsed.sections) {
      const type = sectionType(parsed.layer, section.title);
      const body = [];
      if (type === 'swatch') {
        for (const token of section.tokens) {
          styleRules.push(`  .${demoClass(token.name)} { background: var(${token.name}); }`);
          body.push(renderSwatch(token));
        }
        layerBlocks.push(
          [
            `      <h3>${escapeHtml(section.title)}</h3>`,
            `      <ul class="ts-grid">`,
            ...body,
            `      </ul>`,
          ].join('\n'),
        );
      } else if (type === 'typography') {
        layerBlocks.push(
          [
            `      <h3>${escapeHtml(section.title)}</h3>`,
            `      <ul class="ts-grid">`,
            renderTypographySection(section),
            `      </ul>`,
          ].join('\n'),
        );
      } else if (type === 'space') {
        for (const token of section.tokens) {
          styleRules.push(`  .${demoClass(token.name)} { width: var(${token.name}); }`);
          body.push(renderSpace(token));
        }
        layerBlocks.push(
          [
            `      <h3>${escapeHtml(section.title)}</h3>`,
            `      <ul class="ts-space-list">`,
            ...body,
            `      </ul>`,
          ].join('\n'),
        );
      } else if (type === 'radius' || type === 'shadow') {
        for (const token of section.tokens) {
          const property = type === 'radius' ? 'border-radius' : 'box-shadow';
          styleRules.push(`  .${demoClass(token.name)} { ${property}: var(${token.name}); }`);
          body.push(renderBoxDemo(token));
        }
        layerBlocks.push(
          [
            `      <h3>${escapeHtml(section.title)}</h3>`,
            `      <ul class="ts-grid">`,
            ...body,
            `      </ul>`,
          ].join('\n'),
        );
      } else {
        layerBlocks.push(
          [`      <h3>${escapeHtml(section.title)}</h3>`, renderTable(section)].join('\n'),
        );
      }
    }
    sectionsHtml.push(
      [
        `    <section class="ts-section" aria-labelledby="ts-${parsed.layer}">`,
        `      <h2 id="ts-${parsed.layer}">${layerTitle}</h2>`,
        ...layerBlocks,
        `    </section>`,
      ].join('\n'),
    );
  }

  return [
    `    <style>`,
    STAND_CSS.trim(),
    styleRules.join('\n'),
    `    </style>`,
    `    <h1>Токены</h1>`,
    `    <p class="ts-lead">Сгенерировано showcase/tokens-stand.mjs из tokens/primitives.css + tokens/semantic.css — не редактировать вручную: новый токен появляется здесь после <code>npm run build</code>. Компоненты читают только слой 2 (ADR-0009); порядок каскада dist: primitives → semantic (AC T2.2).</p>`,
    ...sectionsHtml,
  ].join('\n');
}
