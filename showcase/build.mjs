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
import {
  loadMetadata,
  readComponentMarkup,
  REFERENCE_COMPONENTS,
  renderDocPage,
  verifyDocPageHtml,
} from './docs-template.mjs';
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
  'ui-card', // T4.4 — карточка-основа: --hover/--filled, слоты, паттерн карточки-ссылки
  'ui-alert', // T4.5 — статусные сообщения: 4 варианта, роли status/alert, закрываемый вариант
  'ui-image', // T4.6 — паттерн изображений: alt/размеры/lazy, --cover/--contain, --ratio (шкала пропорций)
  'ui-figure', // T4.6 — фигура с подписью: нативные figure/figcaption, шаг подписи --ui-space-2
  'ui-breadcrumbs', // T4.7 — хлебные крошки: ol-семантика, микроразметка BreadcrumbList, лента на md-
  'ui-empty', // T4.8 — паттерн пустого состояния: медиа-слот, заголовок-роль h2, CTA обязательны
  'ui-error', // T4.8 — паттерн ошибки: inline в секции и полностраничный (--page, 404/500)
  'ui-field', // T5.1 — поле формы: label/req/hint/error + input/textarea (min-height, состояния)
  'ui-checkbox', // T5.2 — чекбокс: label-обёртка нативного инпута (accent-color primary), группы колонкой
  'ui-radio', // T5.2 — радио-ярлык: label-обёртка нативного инпута (элемент группы)
  'ui-radio-group', // T5.2 — группа радио: fieldset/legend + раскладка radio-row
  'ui-file', // T5.3 — файловый инпут: кнопка-лейбл + sr-only input (клип), value role="status", сброс
  'ui-form', // T5.4 — форма как целое: раскладка grid/aside, сводная ошибка role="alert", success
  'ui-dropdown', // T6.1 — выпадающее меню двух назначений (APG menu-button): клавиатура, вне-клик, Escape, деградация без JS
  'ui-tabs', // T6.2 — табы (APG tabs, automatic-активация): roving tabindex, стрелки/Home/End, без JS все панели видимы
  'ui-pagination', // T6.3 — пагинация: touch-цели 44px, aria-current на текущей, недоступные стрелки button[disabled], «…»
  'ui-accordion', // T6.4 — аккордеон на <details>/<summary>: без JS полностью работает, анимация grid-rows на ::details-content, --faq, single по data-ui-accordion="single"
  'ui-modal', // T7.2 — модалка на native <dialog> (ADR-0011): trap/Escape/инертность — платформа, модуль — анимация закрытия/скролл-лок/PE-деградация
  'ui-select', // T7.3 — кастомный listbox поверх нативного select (APG listbox-button): выбор синхронизирует select + change (bubbles), стрелки/Home/End/typahead, optgroup → role=group, вне-клик/Escape из T6.1, pointer:coarse — остаётся нативным (ADR-0012), деградация без JS
  'ui-table', // T7.4 — таблицы: базовая/--zebra/--compact, скролл-зона (регион tabindex+role+aria-label, градиент кромки), sticky-заголовок, карточная трансформация --cards (<md пары «заголовок–значение» из data-label; гейт irao/table-card-data-label)
  'ui-loader', // T7.5 — индикация загрузки: спиннер svg + текст role="status" (не голый спиннер, гейт irao/loader-text-status), --sm/--block/--overlay, aria-busy-паттерн
];

/** VI-модуль (T9.1): CSS собирается ОТДЕЛЬНЫМ файлом dist/ui-vi.min.css.
 * Панель components/ui-vi/ — паттерн без CSS в ui-core (сознательно: сайты
 * подключают ui-vi.min.css осознанно, последним в каскаде), поэтому ui-vi
 * исключён из предупреждения discoverComponents ниже. */
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

function copyFonts(target) {
  const t = join(target, 'fonts');
  mkdirSync(t, { recursive: true });
  if (!existsSync(FONTS_SRC)) {
    warn('assets/fonts/ отсутствует — fonts/ создан пустым');
    return;
  }
  cpSync(FONTS_SRC, t, { recursive: true });
}

function copyThemes(target) {
  const t = join(target, 'themes');
  mkdirSync(t, { recursive: true });
  if (!existsSync(THEMES_SRC)) return;
  // В dist едут только theme-файлы: themes/ содержит и README (исходник доки).
  for (const entry of readdirSync(THEMES_SRC)) {
    if (entry.endsWith('.css')) {
      cpSync(join(THEMES_SRC, entry), join(t, entry));
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
 * home — относительная ссылка на index.html каталога стендов.
 * Опции паттернов-каркасов страницы (T7.6):
 *  - frameHeader: false — служебный блок «skip-link + шапка каталога» не
 *    выводится; вызывающий сам ставит preMain (паттерн шапки приносит свой
 *    skip-link). Нужно, чтобы на стенде header-паттерна роль banner несла
 *    ИМЕННО его шапка: вторая header-лендмарка уровня body — нарушение axe
 *    landmark-no-duplicate-banner;
 *  - preMain — html между <body> и <main> (паттерн шапки на уровне body);
 *  - pageFooter — html после </main> (паттерн подвала на уровне body —
 *    честная роль contentinfo). */
function frame({
  rel,
  home,
  title,
  main,
  themes,
  withSwitcher = true,
  withVi = true,
  withJs = true,
  frameHeader = true,
  preMain = '',
  pageFooter = '',
}) {
  const d = rel; // rel — путь от страницы до КОРНЯ рантайма (dist-содержимого):
  // стенды лежат на уровень ниже (../), index — рядом (.). Рантайм (css/js/
  // fonts/themes) сборщик кладёт рядом со стендами (SHOWCASE_DIST) и в dist —
  // тогда относительные ссылки одинаковы при любой схеме раздачи: локально
  // (/showcase/dist/…) и на GitHub Pages (корень сайта = showcase/dist).
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

  const header = [];
  if (frameHeader) {
    header.push(
      '  <header class="ui-showcase-header">',
      `    <a class="ui-showcase-header__home" href="${home}">irao-ui showcase</a>`,
    );
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
  }

  const body = [];
  if (frameHeader) {
    body.push('  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>');
  }
  body.push(
    ...header,
    ...(preMain ? [preMain.trim()] : []),
    // tabindex="-1" на цели skip-link: Enter переносит фокус РЕАЛЬНО в main
    // (без него браузеры меняют только хэш, activeElement уходит на body —
    // Safari-кейс, T3.5 п.2; проверено зондом chromium 2026-10-06 и e2e
    // tests/e2e/skip-link.spec.js). В Tab-порядок main не попадает:
    // отрицательный tabindex исключает последовательную навигацию.
    '  <main id="main" tabindex="-1">',
    main,
    '  </main>',
    ...(pageFooter ? [pageFooter.trim()] : []),
  );
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

async function generateShowcase({ themes }) {
  mkdirSync(join(SHOWCASE_DIST, 'stands'), { recursive: true });

  const stands = [];

  // Стенд «Токены» (T2.2) — генерируется из файлов токенов, не вручную
  // (Implementation requirements T2.2 п.2); полнота — tokens-stand.test.js.
  if (TOKENS_SOURCES.every(({ file }) => existsSync(join(ROOT, file)))) {
    const parsedTokens = TOKENS_SOURCES.map(({ file, layer }) =>
      parseTokensFile(readFileSync(join(ROOT, file), 'utf8'), layer),
    );
    const tokensPage = frame({
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
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
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
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
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
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
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
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

  // Стенд «error-404» (T4.8) — полностраничный вариант ui-error как страница
  // 404. Каркас БЕЗ служебного <h1> (в отличие от base/typography/layout
  // выше): заголовок страницы несёт сам паттерн — h1 состояния (правило
  // спеки T4.8 п.2). Служебный h1 каркаса делал бы демо-страницу невалидной
  // (два h1 — гейт irao/one-h1) и подменял семантику «страницы-ошибки».
  const error404StandSource = join(ROOT, 'showcase', 'pages', 'error-404', 'index.html');
  if (existsSync(error404StandSource)) {
    const page = frame({
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: 'error-404 — irao-ui showcase',
      main: readFileSync(error404StandSource, 'utf8').trim(),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'error-404.html'), page);
    stands.push({ name: 'error-404', source: 'showcase/pages/error-404/index.html' });
  } else {
    warn('showcase/pages/error-404/index.html ещё нет — стенд error-404 не сгенерирован');
  }

  // Стенд «integration/form-full-cycle» (T5.6) — интеграционный стенд «форма
  // целиком»: четыре ветки полного цикла (без JS → с JS → «серверный ответ» →
  // success), каждая — якорь-состояние для e2e и visual (Tests first —
  // tests/e2e/form-full-cycle.spec.js). Имя вложенное — Technical
  // considerations T5.6 («стенд живёт в showcase как
  // "integration/form-full-cycle"»): страница лежит на два уровня ниже
  // SHOWCASE_DIST, поэтому рантайм подключается относительным ../..
  // (механика frame(), глубже, чем у плоских стендов).
  const fullCycleStandSource = join(
    ROOT,
    'showcase',
    'pages',
    'integration',
    'form-full-cycle',
    'index.html',
  );
  if (existsSync(fullCycleStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'integration'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/integration/form-full-cycle.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'integration/form-full-cycle — irao-ui showcase',
      main: `    <h1>integration/form-full-cycle</h1>\n${readFileSync(fullCycleStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'integration', 'form-full-cycle.html'), page);
    stands.push({
      name: 'integration/form-full-cycle',
      source: 'showcase/pages/integration/form-full-cycle/index.html',
    });
  } else {
    warn(
      'showcase/pages/integration/form-full-cycle/index.html ещё нет — ' +
        'стенд integration/form-full-cycle не сгенерирован',
    );
  }

  // Стенд «patterns/list-page» (T8.1) — паттерн «Страница списка»: эталонная
  // сборка страницы списка из готовых компонентов БЕЗ нового CSS (доки-
  // паттерны живут в patterns/<name>/, CONTRIBUTING). Источник — канонический
  // файл паттерна patterns/list-page/list-page.html: он же стенд (обе ветки —
  // «с данными» и «пустая выдача» — рядом, как якоря-состояния T5.6), связки
  // паттерна — <style> в нём (зона сайта, в dist не попадает). Каркас БЕЗ
  // служебного <h1>: заголовок страницы несёт сам паттерн — h1 page-head
  // (как error-404; два h1 — гейт irao/one-h1).
  const listPageStandSource = join(ROOT, 'patterns', 'list-page', 'list-page.html');
  if (existsSync(listPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/list-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/list-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head страницы списка).
      main: readFileSync(listPageStandSource, 'utf8').trim(),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'list-page.html'), page);
    stands.push({ name: 'patterns/list-page', source: 'patterns/list-page/list-page.html' });
  } else {
    warn('patterns/list-page/list-page.html ещё нет — стенд patterns/list-page не сгенерирован');
  }

  // Стенд «patterns/detail-page» (T8.2) — паттерн «Детальная страница»:
  // эталонная сборка детальной страницы (крошки → page-head → контент+aside
  // → related) из готовых компонентов БЕЗ нового CSS; JobPosting-микроразметка
  // эталона — поверхность schema-парсера e2e. Источник — канонический файл
  // паттерна patterns/detail-page/detail-page.html (он же стенд), связки
  // паттерна — <style> в нём (зона сайта, в dist не попадает). Каркас БЕЗ
  // служебного <h1>: заголовок страницы несёт сам паттерн — h1 page-head
  // (как patterns/list-page; два h1 — гейт irao/one-h1).
  const detailPageStandSource = join(ROOT, 'patterns', 'detail-page', 'detail-page.html');
  if (existsSync(detailPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/detail-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/detail-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head детальной страницы).
      main: readFileSync(detailPageStandSource, 'utf8').trim(),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'detail-page.html'), page);
    stands.push({ name: 'patterns/detail-page', source: 'patterns/detail-page/detail-page.html' });
  } else {
    warn(
      'patterns/detail-page/detail-page.html ещё нет — стенд patterns/detail-page не сгенерирован',
    );
  }

  // Стенд «patterns/form-page» (T8.3) — паттерн «Страница формы»: эталонная
  // сборка страницы-формы с информационной колонкой (крошки → page-head →
  // ui-form с aside-сводкой вакансии; полный форма-цикл T5.6 — ветки «живая
  // форма» / «серверный ответ» / success — рядом как якоря-состояния) БЕЗ
  // нового CSS; связки паттерна (fpp-*) — <style> в нём (зона сайта, в dist
  // не попадает). Каркас БЕЗ служебного <h1>: заголовок страницы несёт сам
  // паттерн — h1 page-head (как patterns/list-page; два h1 — гейт irao/one-h1).
  const formPageStandSource = join(ROOT, 'patterns', 'form-page', 'form-page.html');
  if (existsSync(formPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/form-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/form-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head страницы формы).
      main: readFileSync(formPageStandSource, 'utf8').trim(),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'form-page.html'), page);
    stands.push({ name: 'patterns/form-page', source: 'patterns/form-page/form-page.html' });
  } else {
    warn('patterns/form-page/form-page.html ещё нет — стенд patterns/form-page не сгенерирован');
  }

  // Стенд «patterns/landing-section» (T8.3) — паттерн «Landing-секция»:
  // правила сборки лендинг-секций + mini-эталон из трёх секций (светлая /
  // тёмная on-dark / с-изображением full-bleed) БЕЗ нового CSS; связки
  // паттерна (lsp-*) — <style> в нём (зона сайта, в dist не попадает).
  // Каркас СО СЛУЖЕБНЫМ <h1> (как base/typography/layout/integration):
  // лендинг-секция — не страница, h1 у неё нет по определению, а стенд —
  // демо-страница полигона; axe page-has-heading-one требует h1, заголовки
  // секций — h2 с ролью ui-h2 (иерархия h1 → h2 → h3 без пропусков).
  const landingSectionStandSource = join(
    ROOT,
    'patterns',
    'landing-section',
    'landing-section.html',
  );
  if (existsSync(landingSectionStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/landing-section.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/landing-section — irao-ui showcase',
      // Служебный h1: лендинг-секция — фрагмент, h1 несёт каркас демо-страницы.
      main: `    <h1>patterns/landing-section</h1>\n${readFileSync(landingSectionStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'landing-section.html'), page);
    stands.push({
      name: 'patterns/landing-section',
      source: 'patterns/landing-section/landing-section.html',
    });
  } else {
    warn(
      'patterns/landing-section/landing-section.html ещё нет — ' +
        'стенд patterns/landing-section не сгенерирован',
    );
  }

  // Стенд «patterns/search-overlay» (T7.6) — паттерн «Поисковый оверлей»:
  // полноэкранный поиск на ui-modal--full (T7.2) с GET-формой и фокусом в
  // поле при открытии (сниппет паттерна по событию irao-ui:modal-open).
  // Источник — канонический файл паттерна
  // patterns/search-overlay/search-overlay.html (он же стенд), связки
  // паттерна (sop-*) — <style> в нём (зона сайта, в dist не попадает).
  // Каркас СО СЛУЖЕБНЫМ <h1> (как base/typography/layout/integration):
  // оверлей — фрагмент страницы, не страница; axe page-has-heading-one
  // требует h1, диалог в разметке скрыт (модуль снял open).
  const searchOverlayStandSource = join(ROOT, 'patterns', 'search-overlay', 'search-overlay.html');
  if (existsSync(searchOverlayStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/search-overlay.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/search-overlay — irao-ui showcase',
      // Служебный h1: оверлей — фрагмент, h1 несёт каркас демо-страницы.
      main: `    <h1>patterns/search-overlay</h1>\n${readFileSync(searchOverlayStandSource, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'search-overlay.html'), page);
    stands.push({
      name: 'patterns/search-overlay',
      source: 'patterns/search-overlay/search-overlay.html',
    });
  } else {
    warn(
      'patterns/search-overlay/search-overlay.html ещё нет — ' +
        'стенд patterns/search-overlay не сгенерирован',
    );
  }

  // Стенд «patterns/header» (T7.6) — паттерн «Шапка»: разметка паттерна
  // ставится НА УРОВНЕ body (preMain — между <body> и <main>), как на
  // реальном сайте: у копируемого <header> честная роль banner, у nav —
  // navigation (правила ленмарк — README паттерна). Служебная шапка каркаса
  // выключена (frameHeader: false): она была бы ВТОРОЙ banner-лендмаркой
  // уровня body — нарушение axe landmark-no-duplicate-banner; вместе с ней
  // уходят skip-link (его приносит сам паттерн) и переключатель темы
  // (withSwitcher: false — THEME_SCRIPT ссылается на select каркаса).
  const headerStandSource = join(ROOT, 'patterns', 'header', 'header.html');
  if (existsSync(headerStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/header.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/header — irao-ui showcase',
      frameHeader: false,
      withSwitcher: false,
      // Паттерн несёт свой skip-link (первый элемент сниппета) — гейт
      // selfChecks «skip-link до <header>» исполняет разметка паттерна.
      // Директива html-validate — ЗДЕСЬ, не в источнике паттерна: во
      // фрагменте без <body> правило element-permitted-content не срабатывает
      // (no-unused-disable), а на стенде <style> паттерна встаёт прямым
      // ребёнком body (подставка связок зоны сайта; в бою —
      // template_styles.css, README паттерна).
      preMain:
        '<!-- html-validate-disable element-permitted-content -->\n' +
        readFileSync(headerStandSource, 'utf8'),
      // Служебный h1 в main: шапка — каркас без заголовков; axe
      // page-has-heading-one требует h1, ссылка ведёт в каталог стендов.
      main: [
        '    <h1>patterns/header</h1>',
        '    <p class="ui-showcase-stand__note">',
        '      Демо-страница стенда: разметка паттерна стоит на уровне body — у',
        '      <code>&lt;header&gt;</code> роль banner, у навигаций — navigation. Каталог стендов:',
        '      <a href="../../index.html">irao-ui showcase</a>. Дока и Bitrix-заметки —',
        '      patterns/header/README.md.',
        '    </p>',
      ].join('\n'),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'header.html'), page);
    stands.push({ name: 'patterns/header', source: 'patterns/header/header.html' });
  } else {
    warn('patterns/header/header.html ещё нет — стенд patterns/header не сгенерирован');
  }

  // Стенд «patterns/footer» (T7.6) — паттерн «Подвал»: разметка паттерна
  // ставится НА УРОВНЕ body ПОСЛЕ main (pageFooter) — у копируемого
  // <footer> честная роль contentinfo (правила ленмарк — README паттерна).
  // Служебная шапка каркаса остаётся (подвал не спорит с banner).
  const footerStandSource = join(ROOT, 'patterns', 'footer', 'footer.html');
  if (existsSync(footerStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/footer.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/footer — irao-ui showcase',
      // Служебный h1 — он же цель «Наверх» (#top, tabindex="-1"): переход
      // кверху паттерна переносит фокус реально (пара T3.5).
      main: [
        '    <h1 id="top" tabindex="-1">patterns/footer</h1>',
        '    <p class="ui-showcase-stand__note">',
        '      Демо-страница стенда: разметка паттерна стоит на уровне body после',
        '      <code>&lt;main&gt;</code> — у <code>&lt;footer&gt;</code> роль contentinfo, контакты — в',
        '      <code>&lt;address&gt;</code>. Ссылка «Наверх» ведёт на якорь #top (начало страницы).',
        '      Каталог стендов: <a href="../../index.html">irao-ui showcase</a>. Дока и',
        '      Bitrix-заметки — patterns/footer/README.md.',
        '    </p>',
      ].join('\n'),
      // Директива html-validate — здесь, не в источнике паттерна (причина —
      // в блоке стенда header выше): <style> подвала встаёт прямым ребёнком
      // body (подставка связок зоны сайта; в бою — template_styles.css).
      pageFooter:
        '<!-- html-validate-disable element-permitted-content -->\n' +
        readFileSync(footerStandSource, 'utf8'),
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'footer.html'), page);
    stands.push({ name: 'patterns/footer', source: 'patterns/footer/footer.html' });
  } else {
    warn('patterns/footer/footer.html ещё нет — стенд patterns/footer не сгенерирован');
  }

  // Стенды «ui-table-scroll» / «ui-table-cards» (T7.4) — второй и третий
  // паттерны компонента ui-table: AC задачи — «три стенда», компонент при
  // этом один (components/ui-table/, CSS попадает в dist через COMPONENTS).
  // Базовый паттерн живёт в стандартном стенде ui-table (showcase/pages/
  // ui-table); эти два — спец-страницы как base/typography: источник —
  // showcase/pages/<имя>/index.html.
  for (const name of ['ui-table-scroll', 'ui-table-cards']) {
    const source = join(ROOT, 'showcase', 'pages', name, 'index.html');
    if (!existsSync(source)) {
      warn(`showcase/pages/${name}/index.html ещё нет — стенд ${name} не сгенерирован`);
      continue;
    }
    const page = frame({
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
      home: '../index.html', // /showcase/dist/stands/ → index.html каталога стендов
      title: `${name} — irao-ui showcase`,
      main: `    <h1>${name}</h1>\n${readFileSync(source, 'utf8').trim()}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', `${name}.html`), page);
    stands.push({ name, source: `showcase/pages/${name}/index.html` });
  }

  const discovered = discoverComponents();
  for (const name of discovered) {
    if (!COMPONENTS.includes(name) && name !== 'ui-vi') {
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
      rel: '..', // showcase/dist/stands/ → SHOWCASE_DIST (рантайм рядом со стендами)
      home: '../index.html', // /showcase/dist/stands/ → showcase/dist/index.html
      title: `${name} — irao-ui showcase`,
      main: `    <h1>${name}</h1>\n${body.html}`,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', `${name}.html`), page);
    stands.push({ name, source: body.source });
  }

  // Доки компонентов по шаблону T10.1 (02-architecture §8): страница собирается
  // ИЗ ФАЙЛОВ КОМПОНЕНТА — живые примеры и сниппет из канонического
  // components/<имя>/<имя>.html, текстовые секции из README-блоков, машинные
  // (клавиатура/ARIA/скринридер/schema/версия) из метаданных
  // showcase/docs/<имя>.mjs. Метаданные есть не у всех компонентов — полный
  // прогон добавляет T10.2; AC T10.1 — три эталона соответствуют шаблону
  // на 100% (проверка — selfChecks ниже + юнит-пины + e2e).
  const docs = [];
  mkdirSync(join(SHOWCASE_DIST, 'docs'), { recursive: true });
  for (const name of discovered) {
    if (!existsSync(join(ROOT, 'showcase', 'docs', `${name}.mjs`))) continue;
    const metadata = await loadMetadata(name);
    const readmePath = join(ROOT, 'components', name, 'README.md');
    if (!existsSync(readmePath)) {
      warn(`components/${name}/README.md не найден — дока ${name} не сгенерирована`);
      continue;
    }
    const markup = readComponentMarkup(ROOT, name);
    let main;
    try {
      main = renderDocPage({ name, markup, readme: readFileSync(readmePath, 'utf8'), metadata });
    } catch (error) {
      throw new Error(`дока ${name}: ${error.message}`);
    }
    const page = frame({
      rel: '../..', // docs/<имя>.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: `${name} — дока — irao-ui showcase`,
      main,
      themes,
    });
    writeFileSync(join(SHOWCASE_DIST, 'docs', `${name}.html`), page);
    docs.push({ name, markup });
  }
  const missingReference = REFERENCE_COMPONENTS.filter(
    (reference) => !docs.some((doc) => doc.name === reference),
  );
  if (missingReference.length) {
    warn(`эталоны T10.1 без док-страниц (шаблон не собран): ${missingReference.join(', ')}`);
  }

  const standItems = stands.map(
    ({ name, source }) =>
      `      <li><a href="stands/${name}.html">${name}</a> — <code>${source}</code></li>`,
  );
  const docItems = docs.map(
    ({ name }) =>
      `      <li><a href="docs/${name}.html">${name}</a> — дока по шаблону T10.1: примеры, сниппет, состояния, responsive, a11y, API, do/don't, версия</li>`,
  );
  const standSection = standItems.length
    ? ['      <ul>', ...standItems, '      </ul>'].join('\n')
    : '      <p>Стенды появятся вместе с компонентами (EPIC-4+).</p>';

  const distFiles = ['ui-core.min.css', 'ui-vi.min.css', 'ui.min.js'];
  const distSection = distFiles.map((file) => `      <li><code>${file}</code></li>`).join('\n');

  const index = frame({
    rel: '.', // showcase/dist/ → SHOWCASE_DIST (рантайм рядом с index)
    home: 'index.html',
    title: 'irao-ui showcase',
    main: [
      '    <h1>irao-ui showcase</h1>',
      '    <p>Единый источник правды: по этим страницам работают Playwright-тесты (T1.4) и читают доку интеграторы. Сгенерировано showcase/build.mjs.</p>',
      '    <section aria-labelledby="stands-heading">',
      '      <h2 id="stands-heading">Стенды компонентов</h2>',
      standSection,
      '    </section>',
      '    <section aria-labelledby="docs-heading">',
      '      <h2 id="docs-heading">Доки компонентов (шаблон T10.1)</h2>',
      docItems.length
        ? ['      <ul>', ...docItems, '      </ul>'].join('\n')
        : '      <p>Доки по шаблону появятся с T10.1 (эталонные три) и T10.2 (все компоненты).</p>',
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
    rel: '.', // showcase/dist/ → SHOWCASE_DIST (рантайм рядом с index)
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

  return { stands, docs };
}

/* ── self-проверки сборки (AC T1.3; unit для build.mjs не требуется —
   проверяется сборкой, сценарии e2e — с T1.4) ── */

function selfChecks({ banner, stands, docs }) {
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
    assert(html.includes('ui-core.min.css'), `${rel} не подключает собранный ui-core.min.css`);
    // Skip-link и его цель в каркасе каждой страницы (T3.5: правило для
    // сайтов «цель существует» исполняет сборка; WCAG 2.4.1).
    assert(
      html.includes('<a class="ui-skip-link" href="#main">'),
      `${rel}: skip-link отсутствует в каркасе (T3.5)`,
    );
    assert(
      html.indexOf('<a class="ui-skip-link"') <
        // Первая шапка ПОСЛЕ skip-link (литерал «<header» в док-комментарии
        // паттерна шапки — не элемент): с T7.6 паттерн шапки несёт свой
        // skip-link в preMain, инвариант «skip-link до <header>» — на нём.
        html.indexOf('<header', html.indexOf('<a class="ui-skip-link"')),
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
  // Доки по шаблону T10.1: проверка ведётся по ЗАПИСАННОМУ файлу — «диф на
  // билде» (Testing requirements T10.1). verifyDocPageHtml пинит чек-лист
  // «страница = шаблон»: 9 секций по порядку, сниппет = каноническому файлу
  // компонента, живые примеры = сниппету, responsive — iframe 375/768/1440.
  for (const { name, markup } of docs) {
    const html = readFileSync(join(SHOWCASE_DIST, 'docs', `${name}.html`), 'utf8');
    const problems = verifyDocPageHtml(html, markup);
    assert(problems.length === 0, `дока ${name} ≠ шаблону T10.1: ${problems.join('; ')}`);
  }
  // AC T10.1: все три эталона собрались и прошли чек-лист (отсутствие
  // метаданных эталона — warning выше, здесь — жёсткий гейт).
  for (const reference of REFERENCE_COMPONENTS) {
    assert(
      docs.some((doc) => doc.name === reference),
      `эталон T10.1 ${reference} не имеет док-страницы (нужны showcase/docs/${reference}.mjs)`,
    );
  }
}

/* ── main ── */

async function main() {
  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const sha = gitShortSha();
  const banner = `/*! irao-ui v${version} · git ${sha}\n * Сгенерировано showcase/build.mjs — не редактировать вручную.\n */\n`;

  rmSync(DIST, { recursive: true, force: true });
  rmSync(SHOWCASE_DIST, { recursive: true, force: true });

  const coreCss = await bundle(
    [...CSS_CORE_ORDER, ...COMPONENTS.map((name) => `components/${name}/${name}.css`)],
    'css',
  );

  const viCss = await bundle(CSS_VI, 'css');

  const jsFiles = [...COMPONENTS.map((name) => `components/${name}/${name}.js`), ...JS_VI].filter(
    (rel) => existsSync(join(ROOT, rel)),
  );
  const uiJs = await bundle(jsFiles, 'js');

  // Рантайм (css/js/fonts/themes) emits в ОБЕ точки раздачи:
  //  - DIST — дистрибутив для Bitrix-упаковки (release zip);
  //  - SHOWCASE_DIST — полигон: стенды ссылаются на рантайм ОТНОСИТЕЛЬНО
  //    страницы (../ui-core…), поэтому он обязан лежать рядом со стендами —
  //    тогда Pages (корень сайта = showcase/dist) и локальная схема раздачи
  //    работают одинаково (фикс 07.10: на Pages стили отдавали 404).
  const emitRuntime = (target) => {
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'ui-core.min.css'), banner + coreCss);
    writeFileSync(join(target, 'ui-vi.min.css'), banner + viCss);
    writeFileSync(join(target, 'ui.min.js'), banner + uiJs);
    copyFonts(target);
    copyThemes(target);
  };
  emitRuntime(DIST);
  emitRuntime(SHOWCASE_DIST);

  const { stands, docs } = await generateShowcase({ themes: themeNames() });
  selfChecks({ banner, stands, docs });

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
  console.log(
    `  showcase/dist/docs/   ${docs.length} док-страниц(ы) по шаблону T10.1 ` +
      `(${docs.map((doc) => doc.name).join(', ') || '—'})`,
  );
  console.log('OK: сборка завершена (структура 02-architecture §6.1)');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
