#!/usr/bin/env node
/**
 * Сборка irao-ui (задача T1.3): один скрипт производит из одних исходников
 * поставку (dist/) и полигон showcase (showcase/dist/).
 *
 * dist/ — то, что уезжает на сайты (ADR-0006, 02-architecture §6.1):
 *   ui-core.min.css  tokens → base → компоненты (порядок — CSS_CORE_ORDER + COMPONENTS);
 *   ui-vi.min.css    модуль ГОСТ Р 52872 — отдельным файлом (подключение осознанное);
 *   ui.min.js        все JS-модули, классические IIFE (JS компонентов + vi);
 *   fonts/, themes/  копия источников рядом с css — относительные url() работают как есть.
 *
 * showcase/dist/ — сгенерированный полигон (gitignored, не коммитится):
 *   index.html          индекс-каталог стендов;
 *   stands/<имя>.html   страница на компонент из components/<имя>/<имя>.html в каркасе;
 *   standalone.html     страница только с ui-core.min.css — проверка валидности url().
 *
 * Принципы:
 *  - esbuild — единственная сборочная зависимость (ADR-0005). Используется
 *    transform API: исходники уже готовы к браузеру (нативный CSS/JS без
 *    транспиляции), сборка = конкатенация + минификация. url() не разрешаются
 *    и не переписываются — структура dist повторяет исходники (T3.1: fonts
 *    рядом с css, требование T1.3.2).
 *  - Порядок каскада — явные списки ниже (урок CSS_ORDER/JS_ORDER career-portal
 *    build.py), а не glob-алфавит. Добавление компонента = одна строка в
 *    COMPONENTS. Файлы из списков, которых ещё нет (T2.x/T3.x/T9.x),
 *    пропускаются с предупреждением: репозиторий собирается зелёным до их
 *    появления, а попадание каждого файла в бандл видно в логе.
 *  - Идемпотентность: в баннере только версия (package.json) и git-sha, никаких
 *    меток времени — два прогона на одном коммите дают байт-в-байт одинаковый
 *    результат (sha меняется только новым коммитом; поведение зафиксировано в
 *    showcase/README.md).
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { parseTokensFile, renderTokensStand, TOKENS_SOURCES } from './tokens-stand.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SHOWCASE_DIST = join(ROOT, 'showcase', 'dist');
const FONTS_SRC = join(ROOT, 'assets', 'fonts'); // шрифты Golos + OFL-лицензия (T3.1) → копия в dist/fonts/
const THEMES_SRC = join(ROOT, 'themes');

/**
 * Приоритетные грани preload (T3.1): 400/500 cyr — 90% русской страницы
 * (паттерн career-portal). Препружаргружаются в каркасе каждой showcase-
 * страницы ДО CSS-каскада и документируются в bitrix-сниппете подключения.
 */
const PRELOAD_FONTS = ['golos-400-cyr.woff2', 'golos-500-cyr.woff2'];

/* ── Явный порядок каскада (02-architecture §3.3: tokens → base → компоненты) ── */

/** Ядро CSS: токены и base. Пути — от корня репозитория. */
const CSS_CORE_ORDER = [
  'tokens/primitives.css', // T2.1 — слой 1, палитра (hex допустим только здесь)
  'tokens/semantic.css', // T2.2 — слой 2, смысловые значения
  'base/reset.css', // T3.1 — reset
  'base/fonts.css', // T3.1 — @font-face, url() относительно dist/fonts/
  'base/focus.css', // T3.2 — глобальная политика фокуса (ADR-0001)
  'base/typography.css', // T3.3 — типографика
  'base/layout.css', // T3.4 — layout-примитивы (контейнер/секция/сетка)
];

/**
 * Компоненты в порядке каскада. Добавление компонента = одна строка:
 *   CSS components/<имя>/<имя>.css — обязателен;
 *   JS  components/<имя>/<имя>.js  — подключается автоматически, если есть.
 * Папка components/<имя>/ без строки здесь — предупреждение сборки.
 */
const COMPONENTS = [
  'ui-skip-link', // T3.5 — клавиатурный переход к #main (WCAG 2.4.1)
  'ui-link', // T4.1 — ссылки: варианты default/--on-dark/--button, правила особых случаев
  'ui-button', // T4.2 — кнопка-действие: варианты/размеры/состояния (эталон компонента)
  'ui-tag', // T4.3 — тег-аннотация: 5 вариантов career-portal + точка-маркер __icon
  'ui-badge', // T4.3 — счётчик-кружок: круг/«99+», правило при 0 и дублирования значения
];

/** VI-модуль (T9.1): CSS собирается ОТДЕЛЬНЫМ файлом dist/ui-vi.min.css. */
const CSS_VI = ['a11y/vi.css'];

/** JS vi-модуля — последним в ui.min.js (как JS_ORDER career-portal). */
const JS_VI = ['a11y/vi.js'];

/* ── утилиты ── */

function gitShortSha() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) return 'no-git';
  return result.stdout.trim();
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function assert(ok, message) {
  if (!ok) throw new Error(`self-check: ${message}`);
}

/** Конкатенация+минификация списка файлов (esbuild transform). */
async function bundle(files, loader) {
  const parts = [];
  for (const rel of files) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) {
      warn(`${rel} — ещё нет (своё время по бэклогу) — пропущен`);
      continue;
    }
    parts.push(readFileSync(full, 'utf8').trimEnd());
  }
  const joined = parts.join('\n');
  const result = await transform(joined, {
    loader,
    minify: true,
    legalComments: 'none',
    charset: 'utf8',
  });
  for (const message of result.warnings) warn(`esbuild: ${message.text}`);
  return result.code;
}

function copyFonts() {
  const target = join(DIST, 'fonts');
  mkdirSync(target, { recursive: true });
  if (!existsSync(FONTS_SRC)) {
    warn('assets/fonts/ отсутствует — dist/fonts/ создан пустым');
    return;
  }
  cpSync(FONTS_SRC, target, { recursive: true });
}

function copyThemes() {
  const target = join(DIST, 'themes');
  mkdirSync(target, { recursive: true });
  if (!existsSync(THEMES_SRC)) return;
  // В dist едут только theme-файлы: themes/ содержит и README (исходник доки).
  for (const entry of readdirSync(THEMES_SRC)) {
    if (entry.endsWith('.css')) {
      cpSync(join(THEMES_SRC, entry), join(target, entry));
    }
  }
}

/** Имена тем из собранного dist/themes (для переключателя ?theme=). */
function themeNames() {
  const dir = join(DIST, 'themes');
  return readdirSync(dir)
    .filter((name) => name.startsWith('theme-') && name.endsWith('.css'))
    .map((name) => name.slice('theme-'.length, -'.css'.length))
    .sort();
}

/* ── генерация showcase ── */

function discoverComponents() {
  const dir = join(ROOT, 'components');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('ui-'))
    .map((entry) => entry.name)
    .sort();
}

/** Тело стенда: расширенный стенд из showcase/pages/<имя>/, иначе канонический
 * паттерн (CONTRIBUTING: «Стенд компонента — showcase/pages/<имя>/»). */
function standBody(name) {
  const patternRel = `components/${name}/${name}.html`;
  const pagesRel = `showcase/pages/${name}/index.html`;
  const pagesFull = join(ROOT, pagesRel);
  if (existsSync(pagesFull)) {
    return {
      html: readFileSync(pagesFull, 'utf8').trim(),
      source: pagesRel,
    };
  }
  const patternFull = join(ROOT, patternRel);
  if (!existsSync(patternFull)) return null;
  const pattern = readFileSync(patternFull, 'utf8').trim();
  return {
    html: [
      `<p class="ui-showcase-stand__note">Канонический паттерн: <code>${patternRel}</code></p>`,
      pattern,
    ].join('\n'),
    source: patternRel,
  };
}

/** Каркас showcase-страницы: skip-link, header-заглушка, <main id="main">,
 * подключение dist, переключатель темы ?theme= (требование T1.3.3).
 * rel — относительный путь от страницы до корня репозитория (для dist);
 * home — относительная ссылка на index.html каталога стендов. */
function frame({
  rel,
  home,
  title,
  main,
  themes,
  withSwitcher = true,
  withVi = true,
  withJs = true,
}) {
  const d = `${rel}/dist`;
  // Preload шрифтов ДО CSS-каскада (T3.1, паттерн career-portal). Шрифты
  // грузятся в CORS-режиме даже с того же origin — без crossorigin preload
  // не матчится с загрузкой и шрифт запросится дважды.
  const head = [
    ...PRELOAD_FONTS.map(
      (font) =>
        `  <link rel="preload" href="${d}/fonts/${font}" as="font" type="font/woff2" crossorigin>`,
    ),
    `  <link rel="stylesheet" href="${d}/ui-core.min.css">`,
  ];
  if (withVi) head.push(`  <link rel="stylesheet" href="${d}/ui-vi.min.css">`);

  const header = [
    '  <header class="ui-showcase-header">',
    `    <a class="ui-showcase-header__home" href="${home}">irao-ui showcase</a>`,
  ];
  if (withSwitcher) {
    header.push(
      '    <label class="ui-showcase-header__theme-label" for="ui-showcase-theme">Тема</label>',
      '    <select class="ui-showcase-header__theme" id="ui-showcase-theme"',
      `           data-theme-base="${d}/themes">`,
      '      <option value="">По умолчанию</option>',
      ...themes.map((theme) => `      <option value="${theme}">${theme}</option>`),
      '    </select>',
    );
  }
  header.push('  </header>');

  const body = [
    '  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>',
    ...header,
    // tabindex="-1" на цели skip-link: Enter переносит фокус РЕАЛЬНО в main
    // (без него браузеры меняют только хэш, activeElement уходит на body —
    // Safari-кейс, T3.5 п.2; проверено зондом chromium 2026-10-06 и e2e
    // tests/e2e/skip-link.spec.js). В Tab-порядок main не попадает:
    // отрицательный tabindex исключает последовательную навигацию.
    '  <main id="main" tabindex="-1">',
    main,
    '  </main>',
  ];
  if (withJs) body.push(`  <script src="${d}/ui.min.js" defer></script>`);
  if (withSwitcher) body.push(THEME_SCRIPT);

  return [
    '<!DOCTYPE html>',
    '<html lang="ru">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${title}</title>`,
    ...head,
    '</head>',
    '<body>',
    ...body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** Переключатель темы: ?theme=<имя> ↔ data-ui-theme на <html> + theme-файл.
 * Базовый путь к темам берётся из data-theme-base на select (глубина страницы). */
const THEME_SCRIPT = `  <script>
    (function () {
      var select = document.getElementById('ui-showcase-theme');
      if (!select) return;
      var linkId = 'ui-showcase-theme-link';
      function applyTheme(name) {
        if (name) {
          document.documentElement.setAttribute('data-ui-theme', name);
        } else {
          document.documentElement.removeAttribute('data-ui-theme');
        }
        var link = document.getElementById(linkId);
        if (!name) {
          if (link) link.parentNode.removeChild(link);
          return;
        }
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        link.href = select.getAttribute('data-theme-base') + '/theme-' + name + '.css';
      }
      var requested = new URLSearchParams(window.location.search).get('theme') || '';
      if (requested) {
        var known = Array.prototype.some.call(select.options, function (option) {
          return option.value === requested;
        });
        if (known) {
          select.value = requested;
          applyTheme(requested);
        }
      }
      select.addEventListener('change', function () {
        var url = new URL(window.location.href);
        if (select.value) url.searchParams.set('theme', select.value);
        else url.searchParams.delete('theme');
        window.history.replaceState(null, '', url);
        applyTheme(select.value);
      });
    })();
  </script>`;

function generateShowcase({ themes }) {
  mkdirSync(join(SHOWCASE_DIST, 'stands'), { recursive: true });

  const stands = [];

  // Стенд «Токены» (T2.2) — генерируется из файлов токенов, не вручную
  // (Implementation requirements T2.2 п.2); полнота — tokens-stand.test.js.
  if (TOKENS_SOURCES.every(({ file }) => existsSync(join(ROOT, file)))) {
    const parsedTokens = TOKENS_SOURCES.map(({ file, layer }) =>
      parseTokensFile(readFileSync(join(ROOT, file), 'utf8'), layer),
    );
    const tokensPage = frame({
      rel: '../../..', // showcase/dist/stands/ → корень репозитория
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: 'tokens — irao-ui showcase',
      main: renderTokensStand(parsedTokens),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'tokens.html'), tokensPage);
    stands.push({
      name: 'tokens',
      source: 'tokens/primitives.css + tokens/semantic.css (генерация из файлов)',
    });
  } else {
    warn('tokens/*.css ещё не все на месте — стенд tokens не сгенерирован');
  }

  // Стенд «base» (T3.2) — поверхность e2e политики фокуса (ADR-0001): все 7
  // целей селекторного списка base/focus.css на одной странице, чтобы
  // Tab-обход (tests/e2e/focus.spec.js) проходил по каждой. Источник —
  // фрагмент тела, как у компонентов (showcase/pages/base/index.html).
  const baseStandSource = join(ROOT, 'showcase', 'pages', 'base', 'index.html');
  if (existsSync(baseStandSource)) {
    const page = frame({
      rel: '../../..', // showcase/dist/stands/ → корень репозитория
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: 'base — irao-ui showcase',
      main: `    <h1>base</h1>\n${readFileSync(baseStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'base.html'), page);
    stands.push({ name: 'base', source: 'showcase/pages/base/index.html' });
  } else {
    warn('showcase/pages/base/index.html ещё нет — стенд base не сгенерирован');
  }

  // Стенд «typography» (T3.3) — поверхность e2e типографики: все классы ролей
  // ui-h1…ui-micro + ui-text--muted, списки ui-list, ui-address и длинные
  // RU-слова (переносы) на одной странице. Сценарии — computed-размеры на
  // 375/768/1280/1440, иерархия заголовков всех страниц полигона, 32px-сценарий
  // (tests/e2e/typography.spec.js). Источник — фрагмент тела, как у base.
  const typographyStandSource = join(ROOT, 'showcase', 'pages', 'typography', 'index.html');
  if (existsSync(typographyStandSource)) {
    const page = frame({
      rel: '../../..', // showcase/dist/stands/ → корень репозитория
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: 'typography — irao-ui showcase',
      main: `    <h1>typography</h1>\n${readFileSync(typographyStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'typography.html'), page);
    stands.push({ name: 'typography', source: 'showcase/pages/typography/index.html' });
  } else {
    warn('showcase/pages/typography/index.html ещё нет — стенд typography не сгенерирован');
  }

  // Стенд «layout» (T3.4) — поверхность e2e layout-примитивов: контейнер,
  // секции (в т.ч. --muted) и сетки --2/--3/--4 с длинным RU-словом в ячейке
  // (защита minmax(0, 1fr)). Сценарии — overflow на 320/375/768/1024/1440,
  // computed-колонки по вьюпортам, токены, эталоны на 4 вьюпортах
  // (tests/e2e/layout.spec.js). Источник — фрагмент тела, как у base.
  const layoutStandSource = join(ROOT, 'showcase', 'pages', 'layout', 'index.html');
  if (existsSync(layoutStandSource)) {
    const page = frame({
      rel: '../../..', // showcase/dist/stands/ → корень репозитория
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: 'layout — irao-ui showcase',
      main: `    <h1>layout</h1>\n${readFileSync(layoutStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'layout.html'), page);
    stands.push({ name: 'layout', source: 'showcase/pages/layout/index.html' });
  } else {
    warn('showcase/pages/layout/index.html ещё нет — стенд layout не сгенерирован');
  }

  const discovered = discoverComponents();
  for (const name of discovered) {
    if (!COMPONENTS.includes(name)) {
      warn(
        `components/${name}/ есть, но имя не добавлено в COMPONENTS showcase/build.mjs — ` +
          'CSS не попадёт в ui-core.min.css (добавление компонента = одна строка)',
      );
    }
    const body = standBody(name);
    if (!body) {
      warn(`components/${name}/${name}.html не найден — стенд не сгенерирован`);
      continue;
    }
    const page = frame({
      rel: '../../..', // showcase/dist/stands/ → корень репозитория
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: `${name} — irao-ui showcase`,
      main: `    <h1>${name}</h1>\n${body.html}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', `${name}.html`), page);
    stands.push({ name, source: body.source });
  }

  const standItems = stands.map(
    ({ name, source }) =>
      `      <li><a href="stands/${name}.html">${name}</a> — <code>${source}</code></li>`,
  );
  const standSection = standItems.length
    ? ['      <ul>', ...standItems, '      </ul>'].join('\n')
    : '      <p>Стенды появятся вместе с компонентами (EPIC-4+).</p>';

  const distFiles = ['ui-core.min.css', 'ui-vi.min.css', 'ui.min.js'];
  const distSection = distFiles.map((file) => `      <li><code>${file}</code></li>`).join('\n');

  const index = frame({
    rel: '../..', // showcase/dist/ → корень репозитория
    home: 'index.html',
    title: 'irao-ui showcase',
    main: [
      '    <h1>irao-ui showcase</h1>',
      '    <p>Единый источник правды: по этим страницам работают Playwright-тесты (T1.4) и читают доку интеграторы. Сгенерировано showcase/build.mjs.</p>',
      '    <section aria-labelledby="stands-heading">',
      '      <h2 id="stands-heading">Стенды компонентов</h2>',
      standSection,
      '    </section>',
      '    <section aria-labelledby="standalone-heading">',
      '      <h2 id="standalone-heading">Проверка дистрибутива</h2>',
      '      <p><a href="standalone.html">standalone.html</a> — страница только с <code>ui-core.min.css</code>: сетевых ошибок быть не должно (валидные относительные url()).</p>',
      '      <h3>Файлы dist</h3>',
      '      <ul>',
      distSection,
      '      </ul>',
      '    </section>',
    ].join('\n'),
    themes,
  });
  writeFileSync(join(SHOWCASE_DIST, 'index.html'), index);

  const standalone = frame({
    rel: '../..', // showcase/dist/ → корень репозитория
    home: 'index.html',
    title: 'standalone — irao-ui',
    withSwitcher: false,
    withVi: false,
    withJs: false,
    main: [
      '    <h1>standalone: только ui-core.min.css</h1>',
      '    <p>Проверка dist: страница подключает только собранный <code>ui-core.min.css</code>; любые url() внутри (шрифты) должны разрешаться в dist/fonts/ без сетевых ошибок. Открывается через npm run serve.</p>',
    ].join('\n'),
    themes,
  });
  writeFileSync(join(SHOWCASE_DIST, 'standalone.html'), standalone);

  return stands;
}

/* ── self-проверки сборки (AC T1.3; unit для build.mjs не требуется —
   проверяется сборкой, сценарии e2e — с T1.4) ── */

function selfChecks({ banner, stands }) {
  for (const name of ['ui-core.min.css', 'ui-vi.min.css', 'ui.min.js', 'fonts', 'themes']) {
    assert(existsSync(join(DIST, name)), `dist/${name} отсутствует (структура §6.1)`);
  }
  for (const name of ['ui-core.min.css', 'ui-vi.min.css', 'ui.min.js']) {
    const content = readFileSync(join(DIST, name), 'utf8');
    assert(content.startsWith('/*! irao-ui v'), `баннер версии не в начале dist/${name}`);
  }
  // Страницы используют собранный dist, не исходники (AC T1.3).
  const pages = ['index.html', 'standalone.html', ...stands.map((s) => `stands/${s.name}.html`)];
  const sourceRef =
    /(?:href|src)="([^"]*(?:\/components\/|\/tokens\/|\/base\/|\/a11y\/|\/themes\/)[^"]*)"/;
  for (const rel of pages) {
    const html = readFileSync(join(SHOWCASE_DIST, rel), 'utf8');
    const match = html.match(sourceRef);
    assert(!match, `${rel} ссылается на исходники, а не на dist: ${match ? match[1] : ''}`);
    assert(html.includes('dist/ui-core.min.css'), `${rel} не подключает собранный ui-core.min.css`);
    // Skip-link и его цель в каркасе каждой страницы (T3.5: правило для
    // сайтов «цель существует» исполняет сборка; WCAG 2.4.1).
    assert(
      html.includes('<a class="ui-skip-link" href="#main">'),
      `${rel}: skip-link отсутствует в каркасе (T3.5)`,
    );
    assert(
      html.indexOf('<a class="ui-skip-link"') < html.indexOf('<header'),
      `${rel}: skip-link — не первый интерактивный элемент каркаса`,
    );
    assert(
      html.includes('<main id="main" tabindex="-1">'),
      `${rel}: цель #main (main id="main" tabindex="-1") отсутствует — skip-link ведёт в никуда`,
    );
  }
  // Идемпотентность баннера: ни дат, ни меток времени.
  assert(
    !/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}:\d{2}:\d{2}\b/.test(banner),
    'баннер содержит метку времени — ломает идемпотентность',
  );
}

/* ── main ── */

async function main() {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const sha = gitShortSha();
  const banner = `/*! irao-ui v${version} · git ${sha}\n * Сгенерировано showcase/build.mjs — не редактировать вручную.\n */\n`;

  rmSync(DIST, { recursive: true, force: true });
  rmSync(SHOWCASE_DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const coreCss = await bundle(
    [...CSS_CORE_ORDER, ...COMPONENTS.map((name) => `components/${name}/${name}.css`)],
    'css',
  );
  writeFileSync(join(DIST, 'ui-core.min.css'), banner + coreCss);

  const viCss = await bundle(CSS_VI, 'css');
  writeFileSync(join(DIST, 'ui-vi.min.css'), banner + viCss);

  const jsFiles = [...COMPONENTS.map((name) => `components/${name}/${name}.js`), ...JS_VI].filter(
    (rel) => existsSync(join(ROOT, rel)),
  );
  const uiJs = await bundle(jsFiles, 'js');
  writeFileSync(join(DIST, 'ui.min.js'), banner + uiJs);

  copyFonts();
  copyThemes();

  const stands = generateShowcase({ themes: themeNames() });
  selfChecks({ banner, stands });

  for (const name of COMPONENTS) {
    if (!existsSync(join(ROOT, `components/${name}`))) {
      warn(`'${name}' есть в COMPONENTS, но папки components/${name}/ нет`);
    }
  }

  console.log(`irao-ui build: v${version} · git ${sha}`);
  console.log(`  dist/ui-core.min.css  ${coreCss.length} байт css + баннер`);
  console.log(`  dist/ui-vi.min.css    ${viCss.length} байт css + баннер`);
  console.log(
    `  dist/ui.min.js        ${uiJs.length} байт js + баннер (${jsFiles.length} модулей)`,
  );
  console.log(`  showcase/dist/        index.html + standalone.html + ${stands.length} стенд(ов)`);
  console.log('OK: сборка завершена (структура 02-architecture §6.1)');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
