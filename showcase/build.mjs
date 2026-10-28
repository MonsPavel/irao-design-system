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
  brokenDocLinks,
  docCompletenessProblems,
  escapeHtml,
  loadMetadata,
  parseReadme,
  readComponentMarkup,
  REFERENCE_COMPONENTS,
  renderDocPage,
  verifyDocPageHtml,
} from './docs-template.mjs';
import {
  guideSnippetCoverageProblems,
  guideSyncProblems,
  GUIDES,
  renderGuidePage,
} from './guides.mjs';
import { parseTokensFile, renderTokensStand, TOKENS_SOURCES } from './tokens-stand.mjs';
import { patternLayerProblems } from './patterns-layer-gate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SHOWCASE_DIST = join(ROOT, 'showcase', 'dist');
const FONTS_SRC = join(ROOT, 'assets', 'fonts'); // шрифты Golos + OFL-лицензия (T3.1) → копия в dist/fonts/
const THEMES_SRC = join(ROOT, 'themes');
/** Стили КАРКАСА полигона (редизайн 19.10): зона showcase — копируются в
 *  showcase/dist/showcase.css, в dist/ НЕ попадают (ADR-0006: поставка
 *  чистая, полигон не примешивает свои стили к ui-core.min.css сайтов). */
const SHOWCASE_CSS_SRC = join(ROOT, 'showcase', 'showcase.css');
/** Ссылка на репозиторий в шапке/подвале каркаса. */
const GITHUB_URL = 'https://github.com/MonsPavel/irao-design-system';

/** Описания карточек каталога для стендов вне компонентов (редизайн 19.10):
 *  ключ — имя стенда, как в stands[]. Компоненты берут лид из README.intro. */
const STAND_DESCRIPTIONS = {
  tokens: 'Палитра и смысловые токены — генерация из tokens/*.css',
  base: 'Reset, шрифты и политика фокуса — базовый слой системы',
  typography: 'Роли типографики ui-h1…ui-micro, списки, переносы длинных слов',
  layout: 'Контейнер, секции и сетки — layout-примитивы',
  'error-404': 'Полностраничный ui-error --page: страница 404/500',
  'integration/form-full-cycle':
    'Интеграционный стенд «форма целиком»: полный цикл без JS → с JS → ответ сервера → success',
  'patterns/list-page': 'Паттерн «Страница списка»: эталонная сборка из компонентов',
  'patterns/detail-page': 'Паттерн «Детальная страница»: крошки, контент + aside, JobPosting',
  'patterns/form-page': 'Паттерн «Страница формы»: форма отклика с aside-сводкой',
  'patterns/landing-section': 'Паттерн «Landing-секция»: светлая, тёмная, full-bleed, фото-фон',
  'patterns/timeline': 'Паттерн «Таймлайн этапов»: нумерованные точки этапов процесса',
  'patterns/search-overlay': 'Паттерн «Поисковый оверлей» на ui-modal--full',
  'patterns/header': 'Паттерн «Шапка сайта» с навигацией и оверлеем поиска',
  'patterns/footer': 'Паттерн «Подвал сайта»: contentinfo, контакты, «Наверх»',
};

/** Первый абзац-предложение лида README — описание карточки компонента
 *  в каталоге. Markdown-разметка снимается ЦЕЛИКОМ: карточка — не док-страница,
 *  литеральные «**» и «[текст](цель)» в описании читаются как сломанный текст
 *  (находка аудита документации 25.10). Длина capped для сетки. */
function firstSentence(text) {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*(\S(?:[^*]*?\S)?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const stop = plain.search(/[.!?](\s|$)/);
  const sentence = stop === -1 ? plain : plain.slice(0, stop + 1);
  if (sentence.length > 120) return `${sentence.slice(0, 117).trimEnd()}…`;
  return sentence;
}

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
  'ui-chip', // T14.8 — интерактивный фильтр-чип: кнопочная (aria-pressed) и ссылочная (aria-current) формы, активное состояние ARIA-атрибутом, без JS
  'ui-stat', // T17.4 — плашка «значение + подпись + сноска»: варианты поверхностей --glass (стекло на фото) / --filled (primary) / --deep (blue-deep), размер значения — ролью в разметке
  'ui-video', // T17.6 — видео-постер: обёртка button/a + постер + градиент-оверлей primary-a72 + круглая play accent (--ui-video-play-size) + метка времени; поведение воспроизведения — слот сайта
  'ui-carousel', // T17.7 — карусель (данные из JSON, степпер-tablist, APG-клавиатура) + фото-галерея prev/next: JS-модуль IraoUI.carousel в ui.min.js, без JS первый слайд в слотах, контролы hidden
];

/** VI-модуль (T9.1): CSS собирается ОТДЕЛЬНЫМ файлом dist/ui-vi.min.css.
 * Панель components/ui-vi/ — паттерн без CSS в ui-core (сознательно: сайты
 * подключают ui-vi.min.css осознанно, последним в каскаде), поэтому ui-vi
 * исключён из предупреждения discoverComponents ниже. */
const CSS_VI = ['a11y/vi.css'];

/**
 * Паттерн-слой (T17.1, вариант A — решение владельца 25.10): канонические
 * связки страниц (lpp-/ddp-/fpp-) собираются ОТДЕЛЬНЫМ ОПЦИОНАЛЬНЫМ файлом
 * dist/ui-patterns.css — ui-core.min.css не меняется, сайты подключают слой
 * по желанию (порядок в head: токены → core → patterns → сайт). Единый
 * исходник — patterns/patterns.css (доки-паттерны остаются источником правды:
 * разметка несёт те же классы, синхронность пинит tests/unit/patterns-layer.
 * test.js). Селекторы слоя — только канонические префиксы (гейт ниже,
 * selfChecks); компонентные стили слой не дублирует. Лендинг-связки,
 * find-bar и каркасы шапки/подвала добавит в слой своими задачами эпик
 * (T17.9/T17.12/T17.13), не копипаста сайтов.
 */
const CSS_PATTERNS = ['patterns/patterns.css'];

/** JS vi-модуля — последним в ui.min.js (как JS_ORDER career-portal). */
const JS_VI = ['a11y/vi.js'];

/**
 * Dev-модуль deprecation-предупреждений (T12.2, ADR-0007) — ТОЛЬКО в
 * dev-сборке dist/ui.dev.js (не минифицированный вариант ui.min.js).
 * Прод-бандл ui.min.js модуль не получает: warning о deprecated-именах —
 * инструмент разработки и миграции, консоль пользователей в проде молчит.
 */
const JS_DEV_ONLY = ['base/deprecations.js'];

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

/** Конкатенация+минификация списка файлов (esbuild transform); minify: false —
 * dev-варианты (ui.dev.js, T12.2: «не минифицированный или с флагом»). */
async function bundle(files, loader, minify = true) {
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
    minify,
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

/**
 * T13.5 (rev T3.5): компоненты, чей канонический паттерн НЕ встраивается в
 * автогенерированный стенд. У ui-skip-link якорь паттерна байт-в-байт
 * повторяет каркасный skip-link (первый элемент body каждой страницы
 * полигона) — встраивание в main давало литеральный дубль (две одинаковые
 * остановки Tab-обхода, антипример; AC «ровно один skip-якорь»). Демо на
 * стенде несёт сам каркас; поведение (первый Tab, Enter → фокус в #main)
 * пинят tests/e2e/skip-link.spec.js.
 */
const STAND_PATTERN_IS_FRAME = new Set(['ui-skip-link']);

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
  if (STAND_PATTERN_IS_FRAME.has(name)) {
    return {
      html:
        `<p class="ui-showcase-stand__note">Канонический паттерн: <code>${patternRel}</code>. ` +
        `Живой якорь на этой странице — skip-link каркаса (первый элемент <code>body</code>, ` +
        `до шапки): разметка паттерна повторяет его байт-в-байт, поэтому на стенд не ` +
        `встраивается — литеральный дубль skip-якоря исключён (T13.5; rev T3.5).</p>`,
      source: patternRel,
    };
  }
  const pattern = readFileSync(patternFull, 'utf8').trim();
  return {
    html: [
      `<p class="ui-showcase-stand__note">Канонический паттерн: <code>${patternRel}</code></p>`,
      pattern,
    ].join('\n'),
    source: patternRel,
  };
}

/* ── навигация полигона (редизайн 19.10): сайдбар на всех страницах ── */

/**
 * Плоская модель сайдбара: группы «Начало / Токены / База / Компоненты /
 * Паттерны / Гайды внедрения», элементы — { kind: 'index'|'stand'|'doc',
 * name, label }. Путь элемента решает frame() от глубины страницы (rel);
 * «Компоненты» ведёт на док-страницы (дока — главная страница компонента,
 * стенд с неё ссылывается), стендовые исключения (ui-table-scroll/cards) —
 * прямыми ссылками. Заголовки групп — НЕ h1–h6: первый заголовок DOM
 * страницы обязан оставаться её h1 (гейт иерархии typography.spec),
 * поэтому группы — текстовые li в одном плоском списке.
 */
let NAV = [];

/** Собрать навигацию из тех же источников правды, что и генерацию страниц:
 *  в группах только реально генерируемые страницы (существование — те же
 *  existsSync-условия, что ниже в generateShowcase). */
function buildNav() {
  const baseStands = ['base', 'typography', 'layout'].filter((name) =>
    existsSync(join(ROOT, 'showcase', 'pages', name, 'index.html')),
  );
  const patternNames = [
    'list-page',
    'detail-page',
    'form-page',
    'landing-section',
    'timeline',
    'search-overlay',
    'header',
    'footer',
  ].filter((name) => existsSync(join(ROOT, 'patterns', name, `${name}.html`)));
  const integrationStands = existsSync(
    join(ROOT, 'showcase', 'pages', 'integration', 'form-full-cycle', 'index.html'),
  )
    ? [{ kind: 'stand', name: 'integration/form-full-cycle', label: 'form-full-cycle' }]
    : [];
  // error-404 — полностраничный паттерн ui-error (T4.8): группа «Паттерны»,
  // источник — showcase/pages (не patterns/), потому отдельно от patternNames.
  const errorStands = existsSync(join(ROOT, 'showcase', 'pages', 'error-404', 'index.html'))
    ? [{ kind: 'stand', name: 'error-404', label: 'error-404' }]
    : [];
  const docNames = discoverComponents().filter(
    (name) =>
      existsSync(join(ROOT, 'showcase', 'docs', `${name}.mjs`)) &&
      existsSync(join(ROOT, 'components', name, 'README.md')),
  );
  const tableStands = ['ui-table-scroll', 'ui-table-cards'].filter((name) =>
    existsSync(join(ROOT, 'showcase', 'pages', name, 'index.html')),
  );
  const groups = [];
  groups.push({ title: 'Начало', items: [{ kind: 'index', label: 'Каталог' }] });
  if (TOKENS_SOURCES.every(({ file }) => existsSync(join(ROOT, file)))) {
    groups.push({ title: 'Токены', items: [{ kind: 'stand', name: 'tokens', label: 'tokens' }] });
  }
  if (baseStands.length) {
    groups.push({
      title: 'База',
      items: baseStands.map((name) => ({ kind: 'stand', name, label: name })),
    });
  }
  if (docNames.length) {
    groups.push({
      title: 'Компоненты',
      items: [
        ...docNames.map((name) => ({ kind: 'doc', name, label: name })),
        ...tableStands.map((name) => ({ kind: 'stand', name, label: name })),
      ],
    });
  }
  groups.push({
    title: 'Паттерны',
    items: [
      ...patternNames.map((name) => ({ kind: 'stand', name: `patterns/${name}`, label: name })),
      ...integrationStands,
      ...errorStands,
    ],
  });
  const guideItems = GUIDES.filter((guide) => existsSync(join(ROOT, guide.file))).map((guide) => ({
    kind: 'doc',
    name: guide.name,
    label: guide.name,
  }));
  if (guideItems.length) groups.push({ title: 'Гайды внедрения', items: guideItems });
  return groups;
}

/** href элемента навигации от глубины страницы: rel — путь страницы до
 *  рантайма ('.' у каталога, '..' у стендов/док, '../..' у вложенных). */
function navHref(item, rel, home) {
  if (item.kind === 'index') return home;
  const dir = item.kind === 'stand' ? 'stands' : 'docs';
  return rel === '.' ? `${dir}/${item.name}.html` : `${rel}/${dir}/${item.name}.html`;
}

/** Разметка сайдбара. tabindex="0": с md колонка sticky со своим скроллом —
 *  прокручиваемый регион обязан быть доступен с клавиатуры (WCAG 2.1.1,
 *  гейт axe scrollable-region-focusable). Активная страница — aria-current
 *  строго на ссылке на САМУ страницу (семантика WCAG); стенды компонентов
 *  своей записи в навигации не имеют — пометки нет. */
function navHtml(rel, home, navCurrent) {
  const lines = [
    '  <nav class="ui-showcase-nav" aria-label="Разделы полигона" tabindex="0">',
    '    <ul class="ui-showcase-nav__list">',
  ];
  for (const group of NAV) {
    lines.push(`      <li class="ui-showcase-nav__group-title">${group.title}</li>`);
    for (const item of group.items) {
      // «index»-элемент сравнивается по kind (имени у него нет)
      const isCurrent =
        navCurrent !== null &&
        navCurrent.kind === item.kind &&
        (item.kind === 'index' || navCurrent.name === item.name);
      lines.push(
        `      <li><a class="ui-showcase-nav__link${isCurrent ? ' ui-showcase-nav__link--current' : ''}"` +
          `${isCurrent ? ' aria-current="page"' : ''} href="${navHref(item, rel, home)}">${item.label}</a></li>`,
      );
    }
  }
  lines.push('    </ul>', '  </nav>');
  return lines;
}

/** Подвал каркаса: подпись системы + ссылка на репозиторий. Без меток
 *  времени — идемпотентность сборки. */
function footerHtml() {
  return [
    '  <footer class="ui-showcase-footer">',
    '    <div class="ui-showcase-footer__in">',
    '      <p class="ui-showcase-footer__note">irao-ui — единая UI-система для сайтов группы на Bitrix. Полигон сгенерирован сборкой <code>showcase/build.mjs</code>, стили каркаса — <code>showcase/showcase.css</code>.</p>',
    `      <a class="ui-showcase-footer__link" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">Репозиторий на GitHub</a>`,
    '    </div>',
    '  </footer>',
  ];
}

/** Каркас showcase-страницы: skip-link, шапка (название-ссылка в каталог,
 * GitHub, переключатель темы ?theme= — требование T1.3.3), сайдбар-навигация,
 * <main id="main">, подвал, подключение dist.
 * rel — относительный путь от страницы до корня репозитория (для dist);
 * home — относительная ссылка на index.html каталога стендов.
 * Опции паттернов-каркасов страницы (T7.6):
 *  - frameHeader: false — служебный блок «skip-link + шапка каталога» не
 *    выводится; вызывающий сам ставит preMain (паттерн шапки приносит свой
 *    skip-link). Нужно, чтобы на стенде header-паттерна роль banner несла
 *    ИМЕННО его шапка: вторая header-лендмарка уровня body — нарушение axe
 *    landmark-no-duplicate-banner;
 *  - preMain — html между <body> и каркасом страницы (паттерн шапки на
 *    уровне body);
 *  - pageFooter — html после каркаса страницы (паттерн подвала на уровне
 *    body — честная роль contentinfo; подвал каркаса на этой странице
 *    выключается парой withFooter: false — вторая contentinfo-лендмарка);
 *  - navCurrent — { kind, name } активной страницы для aria-current в
 *    сайдбаре (null — страница без своей записи: стенды компонентов);
 *  - navMode — 'sidebar' (умолчание: колонка слева) | 'strip' (компактная
 *    лента над контентом). Стенды — strip при ЛЮБОЙ ширине: демо-страницы
 *    паттернов несут собственные viewport-media (32px-сценарий T3.6,
 *    sticky-aside) и обязаны получить полную ширину вьюпорта, как до
 *    редизайна; навигация при этом никуда не пропадает (те же группы,
 *    свёрнутые в чипы) — меняется только подача;
 *  - withNav / withFooter / withFrameCss — отключение блоков каркаса
 *    (standalone.html — техническая страница «только ui-core.min.css»:
 *    без сайдбара, подвала и стилей каркаса). */
function frame({
  rel,
  home,
  title,
  main,
  themes,
  withSwitcher = true,
  withVi = true,
  withJs = true,
  withFrameCss = true,
  withNav = true,
  withFooter = true,
  frameHeader = true,
  // Паттерн-слой (T17.1): опциональный dist/ui-patterns.css подключают ТОЛЬКО
  // стенды паттернов, чьи связки переехали в слой (list/detail/form-page).
  // Опциональность поставки на полигоне воспроизводится адресно: остальные
  // страницы слой не получают (слоя «для всех» не существует).
  withPatterns = false,
  preMain = '',
  pageFooter = '',
  navCurrent = null,
  navMode = 'sidebar',
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
  // Паттерн-слой — ПОСЛЕ ui-core, ДО стилей каркаса (токены → core → patterns
  // → сайт; T17.1). Подключение адресное: см. withPatterns выше.
  if (withPatterns) head.push(`  <link rel="stylesheet" href="${d}/ui-patterns.css">`);
  // Стили каркаса — ПОСЛЕ ui-core (редизайн 19.10): стилизуют только
  // .ui-showcase-* и каркасные элементы вокруг main, демо-областей не касаются.
  if (withFrameCss) head.push(`  <link rel="stylesheet" href="${d}/showcase.css">`);

  const header = [];
  if (frameHeader) {
    header.push(
      '  <header class="ui-showcase-header">',
      '    <div class="ui-showcase-header__in">',
      `      <a class="ui-showcase-header__home" href="${home}">irao-ui <span class="ui-showcase-header__home-note">showcase</span></a>`,
      '      <div class="ui-showcase-header__tools">',
      `        <a class="ui-showcase-header__github" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">`,
      '          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>GitHub</a>',
    );
    if (withSwitcher) {
      header.push(
        '        <label class="ui-showcase-header__theme-label" for="ui-showcase-theme">Тема</label>',
        '        <select class="ui-showcase-header__theme" id="ui-showcase-theme"',
        `               data-theme-base="${d}/themes">`,
        '          <option value="">По умолчанию</option>',
        ...themes.map((theme) => `          <option value="${theme}">${theme}</option>`),
        '        </select>',
      );
    }
    header.push('      </div>', '    </div>', '  </header>');
  }

  const body = [];
  if (frameHeader) {
    body.push('  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>');
  }
  body.push(...header, ...(preMain ? [preMain.trim()] : []));
  // Сайдбар — до main, обычный порядок обхода «навигация → контент»; обход
  // шапки+сайдбара одним движением — skip-link. Все элементы — ПРЯМЫЕ дети
  // body (инвариант ленмарк-тестов: body > header / body > main / body >
  // footer); раскладку «сайдбар | контент» несёт grid на body (showcase.css).
  if (withNav && NAV.length > 0) body.push(...navHtml(rel, home, navCurrent));
  body.push(
    // tabindex="-1" на цели skip-link: Enter переносит фокус РЕАЛЬНО в main
    // (без него браузеры меняют только хэш, activeElement уходит на body —
    // Safari-кейс, T3.5 п.2; проверено зондом chromium 2026-10-06 и e2e
    // tests/e2e/skip-link.spec.js). В Tab-порядок main не попадает:
    // отрицательный tabindex исключает последовательную навигацию.
    // ui-showcase-main — контейнер каркаса (отступы/потолок ширины ЧЕРЕЗ
    // сам main); содержимое внутри стилизует только ui-core — инвариант
    // «компоненты на полигоне выглядят как у интегратора».
    '  <main id="main" tabindex="-1" class="ui-showcase-main">',
    main,
    '  </main>',
    ...(pageFooter ? [pageFooter.trim()] : []),
    ...(withFooter ? footerHtml() : []),
  );
  if (withJs) body.push(`  <script src="${d}/ui.min.js" defer></script>`);
  if (withSwitcher) body.push(THEME_SCRIPT);
  // Скрипт каркаса (поиск каталога + copy-кнопки сниппетов): vanilla ES5,
  // новых зависимостей нет (ADR-0005); на страницах без целей — no-op.
  if (withFrameCss) body.push(FRAME_SCRIPT);

  // Класс-модификатор body включает сайдбар-раскладку (showcase.css):
  // стенды (navMode: 'strip') остаются полноширинными.
  const bodyClass =
    withNav && NAV.length > 0 && navMode === 'sidebar' ? ' class="ui-showcase-body--sidebar"' : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="ru">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${title}</title>`,
    ...head,
    '</head>',
    `<body${bodyClass}>`,
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

/**
 * Скрипт каркаса (редизайн 19.10): client-side поиск каталога и copy-кнопки
 * сниппетов док-страниц. Vanilla ES5 в духе THEME_SCRIPT, НОВЫХ npm-зависимостей
 * нет (ADR-0005: esbuild — единственная). Инварианты:
 *  - деградация без JS консервативна: без скрипта каталог просто показывается
 *    целиком, copy-кнопки не появляются (кнопка генерится разметкой, но без
 *    обработчика — просто не копирует);
 *  - детерминизм скриншотов: состояние «пустой поиск» — дефолт разметки,
 *    скрипт меняет DOM только по действию пользователя;
 *  - доступность: статус фильтра — role="status" (aria-live polite), скрытие
 *    карточек — атрибутом hidden (display:none + удаление из a11y-дерева).
 */
const FRAME_SCRIPT = `  <script>
    (function () {
      'use strict';
      var copyButtons = document.querySelectorAll('[data-ui-showcase-copy]');
      for (var i = 0; i < copyButtons.length; i++) {
        copyButtons[i].addEventListener('click', function () {
          var button = this;
          var host = button.parentNode;
          var pre = host ? host.querySelector('pre') : null;
          if (!pre) return;
          var text = pre.textContent;
          var done = function () {
            button.textContent = 'Скопировано';
            window.setTimeout(function () {
              button.textContent = 'Скопировать HTML';
            }, 2000);
          };
          // Fallback на execCommand: clipboard API недоступен вне secure
          // context или без разрешения clipboard-write (headless, file://).
          var fallback = function () {
            var area = document.createElement('textarea');
            area.value = text;
            document.body.appendChild(area);
            area.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(area);
            done();
          };
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(done, fallback);
            } else {
              fallback();
            }
          } catch (e) {
            fallback();
          }
        });
      }
      var search = document.getElementById('ui-showcase-search');
      if (search) {
        var items = document.querySelectorAll('[data-ui-showcase-item]');
        var groups = document.querySelectorAll('[data-ui-showcase-group]');
        var status = document.getElementById('ui-showcase-search-status');
        var applyFilter = function () {
          var query = search.value.trim().toLowerCase();
          var shown = 0;
          for (var i = 0; i < items.length; i++) {
            var match = !query || items[i].textContent.toLowerCase().indexOf(query) !== -1;
            items[i].hidden = !match;
            if (match) shown++;
          }
          for (var g = 0; g < groups.length; g++) {
            var visible = groups[g].querySelectorAll('[data-ui-showcase-item]:not([hidden])').length;
            groups[g].hidden = query && visible === 0;
          }
          if (!query) status.textContent = '';
          else if (shown === 0) status.textContent = 'Ничего не найдено.';
          else status.textContent = 'Показано: ' + shown + ' из ' + items.length;
        };
        search.addEventListener('input', applyFilter);
      }
    })();
  </script>`;

async function generateShowcase({ themes }) {
  mkdirSync(join(SHOWCASE_DIST, 'stands'), { recursive: true });
  // Навигация каркаса — до генерации страниц: frame() читает её для сайдбара.
  NAV = buildNav();

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
      navCurrent: { kind: 'stand', name: 'tokens' },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">base</h1>\n${readFileSync(baseStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'base' },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">typography</h1>\n${readFileSync(typographyStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'typography' },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">layout</h1>\n${readFileSync(layoutStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'layout' },
      navMode: 'strip',
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
      navCurrent: { kind: 'stand', name: 'error-404' },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">integration/form-full-cycle</h1>\n${readFileSync(fullCycleStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'integration/form-full-cycle' },
      navMode: 'strip',
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
  // сборка страницы списка из готовых компонентов (доки-паттерны живут в
  // patterns/<name>/, CONTRIBUTING). Источник — канонический файл паттерна
  // patterns/list-page/list-page.html: он же стенд (обе ветки — «с данными»
  // и «пустая выдача» — рядом, как якоря-состояния T5.6); связки lpp-* —
  // паттерн-слой dist/ui-patterns.css (T17.1, withPatterns: true ниже),
  // разметка несёт те же классы. Каркас БЕЗ служебного <h1>: заголовок
  // страницы несёт сам паттерн — h1 page-head (как error-404; два h1 —
  // гейт irao/one-h1).
  const listPageStandSource = join(ROOT, 'patterns', 'list-page', 'list-page.html');
  if (existsSync(listPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/list-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/list-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head страницы списка).
      main: readFileSync(listPageStandSource, 'utf8').trim(),
      // Связки lpp-* — паттерн-слой (T17.1): стенд подключает dist/ui-patterns.css.
      withPatterns: true,
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/list-page' },
      navMode: 'strip',
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'list-page.html'), page);
    stands.push({ name: 'patterns/list-page', source: 'patterns/list-page/list-page.html' });
  } else {
    warn('patterns/list-page/list-page.html ещё нет — стенд patterns/list-page не сгенерирован');
  }

  // Стенд «patterns/detail-page» (T8.2) — паттерн «Детальная страница»:
  // эталонная сборка детальной страницы (крошки → page-head → контент+aside
  // → related) из готовых компонентов; JobPosting-микроразметка эталона —
  // поверхность schema-парсера e2e. Источник — канонический файл
  // паттерна patterns/detail-page/detail-page.html (он же стенд); связки
  // dpp-* — паттерн-слой dist/ui-patterns.css (T17.1, withPatterns: true
  // ниже). Каркас БЕЗ служебного <h1>: заголовок страницы несет сам паттерн
  // — h1 page-head (как patterns/list-page; два h1 — гейт irao/one-h1).
  const detailPageStandSource = join(ROOT, 'patterns', 'detail-page', 'detail-page.html');
  if (existsSync(detailPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/detail-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/detail-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head детальной страницы).
      main: readFileSync(detailPageStandSource, 'utf8').trim(),
      // Связки dpp-* — паттерн-слой (T17.1): стенд подключает dist/ui-patterns.css.
      withPatterns: true,
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/detail-page' },
      navMode: 'strip',
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
  // форма» / «серверный ответ» / success — рядом как якоря-состояния);
  // связки fpp-* — паттерн-слой dist/ui-patterns.css (T17.1, withPatterns:
  // true ниже). Каркас БЕЗ служебного <h1>: заголовок страницы несет сам
  // паттерн — h1 page-head (как patterns/list-page; два h1 — гейт
  // irao/one-h1).
  const formPageStandSource = join(ROOT, 'patterns', 'form-page', 'form-page.html');
  if (existsSync(formPageStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/form-page.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/form-page — irao-ui showcase',
      // Без служебного h1: h1 несёт сам паттерн (page-head страницы формы).
      main: readFileSync(formPageStandSource, 'utf8').trim(),
      // Связки fpp-* — паттерн-слой (T17.1): стенд подключает dist/ui-patterns.css.
      withPatterns: true,
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/form-page' },
      navMode: 'strip',
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'form-page.html'), page);
    stands.push({ name: 'patterns/form-page', source: 'patterns/form-page/form-page.html' });
  } else {
    warn('patterns/form-page/form-page.html ещё нет — стенд patterns/form-page не сгенерирован');
  }

  // Стенд «patterns/landing-section» (T8.3) — паттерн «Landing-секция»:
  // правила сборки лендинг-секций + mini-эталон из шести секций (светлая /
  // тёмная on-dark / с-изображением full-bleed / с-фото-фоном T17.3 /
  // nav-карточки и лента логотипов T17.9); связки ритма (lsp-*) — <style>
  // в нём (зона сайта, в dist не попадает), связки lnk-card/lgo-grid —
  // паттерн-слой dist/ui-patterns.css (T17.9, withPatterns: true ниже —
  // четвёртый получатель слоя).
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
      main: `    <h1 class="ui-showcase-title">patterns/landing-section</h1>\n${readFileSync(landingSectionStandSource, 'utf8').trim()}`,
      themes,
      // Связки lnk-card/lgo-grid — паттерн-слой (T17.9): стенд подключает
      // dist/ui-patterns.css.
      withPatterns: true,
      navCurrent: { kind: 'stand', name: 'patterns/landing-section' },
      navMode: 'strip',
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

  // Стенд «patterns/timeline» (T14.11) — паттерн «таймлайн этапов»: правила
  // сборки композиции «этапы процесса» + mini-эталон из четырёх этапов (ol:
  // нумерованная точка, заголовок h3, текст) БЕЗ нового CSS; связки паттерна
  // (tl-*) — <style> в нём (зона сайта, в dist не попадает). Каркас СО
  // СЛУЖЕБНЫМ <h1> (как landing-section): таймлайн — фрагмент секции, h1 у
  // него нет по определению, а стенд — демо-страница полигона; axe
  // page-has-heading-one требует h1, заголовок секции эталона — h2 с ролью
  // ui-h2 (иерархия h1 → h2 → h3 без пропусков).
  const timelineStandSource = join(ROOT, 'patterns', 'timeline', 'timeline.html');
  if (existsSync(timelineStandSource)) {
    mkdirSync(join(SHOWCASE_DIST, 'stands', 'patterns'), { recursive: true });
    const page = frame({
      rel: '../..', // stands/patterns/timeline.html → SHOWCASE_DIST (на два уровня выше)
      home: '../../index.html', // → index.html каталога стендов
      title: 'patterns/timeline — irao-ui showcase',
      // Служебный h1: таймлайн — фрагмент, h1 несёт каркас демо-страницы.
      main: `    <h1 class="ui-showcase-title">patterns/timeline</h1>\n${readFileSync(timelineStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/timeline' },
      navMode: 'strip',
    });
    writeFileSync(join(SHOWCASE_DIST, 'stands', 'patterns', 'timeline.html'), page);
    stands.push({ name: 'patterns/timeline', source: 'patterns/timeline/timeline.html' });
  } else {
    warn('patterns/timeline/timeline.html ещё нет — стенд patterns/timeline не сгенерирован');
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
      main: `    <h1 class="ui-showcase-title">patterns/search-overlay</h1>\n${readFileSync(searchOverlayStandSource, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/search-overlay' },
      navMode: 'strip',
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
      // Сайдбар каркаса остаётся: nav-лендмарки не уникальны (в отличие от
      // banner), у навигаций паттерна и каркаса разные aria-label.
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
        '    <h1 class="ui-showcase-title">patterns/header</h1>',
        '    <p class="ui-showcase-stand__note">',
        '      Демо-страница стенда: разметка паттерна стоит на уровне body — у',
        '      <code>&lt;header&gt;</code> роль banner, у навигаций — navigation. Каталог стендов:',
        '      <a href="../../index.html">irao-ui showcase</a>. Дока и Bitrix-заметки —',
        '      patterns/header/README.md.',
        '    </p>',
      ].join('\n'),
      themes,
      navCurrent: { kind: 'stand', name: 'patterns/header' },
      navMode: 'strip',
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
      // Подвал каркаса выключен: contentinfo-лендмарка уровня body — одна,
      // её несёт паттерн (пара к frameHeader: false стенда шапки).
      withFooter: false,
      // Служебный h1 — он же цель «Наверх» (#top, tabindex="-1"): переход
      // кверху паттерна переносит фокус реально (пара T3.5).
      main: [
        '    <h1 id="top" class="ui-showcase-title" tabindex="-1">patterns/footer</h1>',
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
      navCurrent: { kind: 'stand', name: 'patterns/footer' },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">${name}</h1>\n${readFileSync(source, 'utf8').trim()}`,
      themes,
      navCurrent: { kind: 'stand', name },
      navMode: 'strip',
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
      main: `    <h1 class="ui-showcase-title">${name}</h1>\n${body.html}`,
      themes,
      navMode: 'strip',
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
    const readme = readFileSync(readmePath, 'utf8');
    let main;
    try {
      main = renderDocPage({
        name,
        markup,
        readme,
        metadata,
        // Канон с h1 (ui-error: полностраничный 404/500 — правило T4.8) — без
        // служебного h1 каркаса: он был бы вторым h1 (гейт irao/one-h1);
        // прецедент — стенды error-404/паттернов «h1 несёт сам паттерн».
        pageHeading: !/<h1[\s>]/.test(markup),
      });
    } catch (error) {
      throw new Error(`дока ${name}: ${error.message}`, { cause: error });
    }
    const page = frame({
      rel: '..', // docs/<имя>.html → SHOWCASE_DIST
      home: '../index.html', // → index.html каталога стендов
      title: `${name} — дока — irao-ui showcase`,
      main,
      themes,
      navCurrent: { kind: 'doc', name },
    });
    writeFileSync(join(SHOWCASE_DIST, 'docs', `${name}.html`), page);
    docs.push({ name, markup, intro: parseReadme(readme).intro });
  }
  const missingReference = REFERENCE_COMPONENTS.filter(
    (reference) => !docs.some((doc) => doc.name === reference),
  );
  if (missingReference.length) {
    warn(`эталоны T10.1 без док-страниц (шаблон не собран): ${missingReference.join(', ')}`);
  }

  // Гайды внедрения T10.3 (quickstart, integration guide, «Bitrix-разработчику
  // за 30 минут»): living-источники bitrix/*.md публикуются страницами
  // showcase/dist/docs/<имя>.html (глубина docs/ — как у док-страниц).
  // Синхронность embed-блоков («сниппет в гайде = файл bitrix/») — selfChecks
  // ниже, «диф на билде»; поверхность живого DOM — tests/e2e/guides.spec.js.
  const guides = [];
  for (const guide of GUIDES) {
    const sourcePath = join(ROOT, guide.file);
    if (!existsSync(sourcePath)) {
      warn(`гайд ${guide.name}: источника ${guide.file} нет — страница не сгенерирована`);
      continue;
    }
    const page = frame({
      rel: '..', // docs/<имя>.html → SHOWCASE_DIST (глубина как у док-страниц T10.1)
      home: '../index.html',
      // <title> короткий (гейт long-title, ≤70): доступное имя страницы — h1 из GUIDES.
      title: `${guide.name} — гайд внедрения — irao-ui showcase`,
      main: renderGuidePage({ guide, markdown: readFileSync(sourcePath, 'utf8') }),
      themes,
      navCurrent: { kind: 'doc', name: guide.name },
    });
    writeFileSync(join(SHOWCASE_DIST, 'docs', `${guide.name}.html`), page);
    guides.push(guide);
  }

  /* Каталог полигона (редизайн 19.10): карточная сетка + client-side поиск
     (vanilla JS в FRAME_SCRIPT, новых зависимостей нет — ADR-0005). Секции
     сохраняют aria-labelledby-якоря stands-/docs-/guides-heading — на
     видимость ссылок гайдов пинится tests/e2e/guides.spec.js. Карточка
     компонента несёт две цели: дока (основная) и стенд (доп. ссылка). */
  const componentStandNames = new Set(discovered);

  const standCard = (name) => {
    const isPattern = name.startsWith('patterns/') || name.startsWith('integration/');
    const chip = name.startsWith('integration/') ? 'интеграция' : isPattern ? 'паттерн' : 'стенд';
    const mod = isPattern ? 'pattern' : 'stand';
    const label = name.split('/').pop();
    const desc = STAND_DESCRIPTIONS[name] ?? `Стенд ${name}`;
    return [
      '      <li class="ui-showcase-card" data-ui-showcase-item>',
      `        <a class="ui-showcase-card__link" href="stands/${name}.html">`,
      `          <span class="ui-showcase-card__chip ui-showcase-card__chip--${mod}">${chip}</span>`,
      `          <span class="ui-showcase-card__name">${label}</span>`,
      `          <span class="ui-showcase-card__desc">${escapeHtml(desc)}</span>`,
      '        </a>',
      '      </li>',
    ].join('\n');
  };

  const docCard = ({ name, intro }) =>
    [
      '      <li class="ui-showcase-card" data-ui-showcase-item>',
      `        <a class="ui-showcase-card__link" href="docs/${name}.html">`,
      '          <span class="ui-showcase-card__chip ui-showcase-card__chip--doc">дока</span>',
      `          <span class="ui-showcase-card__name">${name}</span>`,
      `          <span class="ui-showcase-card__desc">${escapeHtml(firstSentence(intro))}</span>`,
      '        </a>',
      `        <a class="ui-showcase-card__aside-link" href="stands/${name}.html">Стенд компонента →</a>`,
      '      </li>',
    ].join('\n');

  const guideCard = ({ name, title }) =>
    [
      '      <li class="ui-showcase-card" data-ui-showcase-item>',
      `        <a class="ui-showcase-card__link" href="docs/${name}.html">`,
      '          <span class="ui-showcase-card__chip ui-showcase-card__chip--guide">гайд</span>',
      `          <span class="ui-showcase-card__name">${name}</span>`,
      `          <span class="ui-showcase-card__desc">${escapeHtml(title)}</span>`,
      '        </a>',
      '      </li>',
    ].join('\n');

  // Секция «Стенды и паттерны»: всё, кроме стендов компонентов (их несёт
  // карточка доки) и спец-стендов ui-table-* (живут в «Компонентах»).
  const catalogStands = stands.filter(
    (stand) =>
      !componentStandNames.has(stand.name) &&
      stand.name !== 'ui-table-scroll' &&
      stand.name !== 'ui-table-cards',
  );
  const standCards = catalogStands.map(({ name }) => standCard(name)).join('\n');
  const docCards = docs.map((doc) => docCard(doc)).join('\n');
  const guideCards = guides.map((guide) => guideCard(guide)).join('\n');

  const cardsOrPlaceholder = (cards, placeholder) =>
    cards
      ? ['      <ul class="ui-showcase-cards">', cards, '      </ul>'].join('\n')
      : `      <p class="ui-showcase-section__note">${placeholder}</p>`;

  const index = frame({
    rel: '.', // showcase/dist/ → SHOWCASE_DIST (рантайм рядом с index)
    home: 'index.html',
    title: 'irao-ui showcase',
    navCurrent: { kind: 'index' },
    main: [
      '    <h1 class="ui-showcase-title">irao-ui showcase</h1>',
      '    <p class="ui-showcase-lead">Единый источник правды UI-системы: по этим страницам работают Playwright-тесты и читают документацию интеграторы сайтов группы. Каркас, каталог и стили полигона генерируются <code>showcase/build.mjs</code>.</p>',
      '    <section class="ui-showcase-search" aria-label="Поиск по полигону">',
      '      <label class="ui-showcase-search__label" for="ui-showcase-search">Поиск по названиям</label>',
      '      <div class="ui-showcase-search__field">',
      '        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.4 9.82l3.64 3.64a1 1 0 0 0 1.42-1.42l-3.64-3.63A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"/></svg>',
      '        <input class="ui-showcase-search__input" id="ui-showcase-search" type="search" placeholder="Компонент, паттерн, гайд…" autocomplete="off">',
      '      </div>',
      '      <p class="ui-showcase-search__status" id="ui-showcase-search-status" role="status"></p>',
      '    </section>',
      '    <section class="ui-showcase-section" aria-labelledby="stands-heading" data-ui-showcase-group>',
      '      <h2 id="stands-heading">Стенды и паттерны</h2>',
      '      <p class="ui-showcase-section__note">Живые стенды базовых слоёв, паттерны страниц и интеграционные сценарии. Стенды компонентов — в карточках раздела «Компоненты».</p>',
      cardsOrPlaceholder(standCards, 'Стенды появятся вместе с компонентами (EPIC-4+).'),
      '    </section>',
      '    <section class="ui-showcase-section" aria-labelledby="docs-heading" data-ui-showcase-group>',
      '      <h2 id="docs-heading">Компоненты</h2>',
      '      <p class="ui-showcase-section__note">Дока по единому шаблону T10.1: живые примеры, копируемый сниппет, состояния, responsive 375/768/1440, a11y, API, do/don’t, версия.</p>',
      cardsOrPlaceholder(
        docCards,
        'Доки по шаблону появятся с T10.1 (эталонные три) и T10.2 (все компоненты).',
      ),
      '    </section>',
      '    <section class="ui-showcase-section" aria-labelledby="guides-heading" data-ui-showcase-group>',
      '      <h2 id="guides-heading">Гайды внедрения (Bitrix)</h2>',
      '      <p class="ui-showcase-section__note">Living-документы из <code>bitrix/*.md</code>: сниппеты в гайдах сверяются с файлами на билде («диф на билде»).</p>',
      cardsOrPlaceholder(
        guideCards,
        'Гайды внедрения появятся с T10.3: quickstart, integration guide, «Bitrix-разработчику за 30 минут».',
      ),
      '    </section>',
      '    <section class="ui-showcase-section" aria-labelledby="standalone-heading">',
      '      <h2 id="standalone-heading">Проверка дистрибутива</h2>',
      '      <p><a href="standalone.html">standalone.html</a> — страница только с <code>ui-core.min.css</code>: сетевых ошибок быть не должно (валидные относительные url()).</p>',
      '      <ul class="ui-showcase-dist-list">',
      '        <li><code>ui-core.min.css</code> — tokens → base → компоненты;</li>',
      '        <li><code>ui-vi.min.css</code> — VI-модуль ГОСТ Р 52872, подключение осознанное;</li>',
      '        <li><code>ui-patterns.css</code> — паттерн-слой (связки страниц lpp-/ddp-/fpp-, T17.1; лендинг-связки lnk-/lgo-, T17.9), подключение опционально;</li>',
      '        <li><code>ui.min.js</code> — все JS-модули (IIFE).</li>',
      '      </ul>',
      '    </section>',
    ].join('\n'),
    themes,
  });
  writeFileSync(join(SHOWCASE_DIST, 'index.html'), index);

  // standalone.html — техническая страница проверки dist: ТОЛЬКО
  // ui-core.min.css, без обвязки каркаса (сайдбар/подвал/стили полигона).
  const standalone = frame({
    rel: '.', // showcase/dist/ → SHOWCASE_DIST (рантайм рядом с index)
    home: 'index.html',
    title: 'standalone — irao-ui',
    withSwitcher: false,
    withVi: false,
    withJs: false,
    withFrameCss: false,
    withNav: false,
    withFooter: false,
    main: [
      '    <h1>standalone: только ui-core.min.css</h1>',
      '    <p>Проверка dist: страница подключает только собранный <code>ui-core.min.css</code>; любые url() внутри (шрифты) должны разрешаться в dist/fonts/ без сетевых ошибок. Открывается через npm run serve.</p>',
    ].join('\n'),
    themes,
  });
  writeFileSync(join(SHOWCASE_DIST, 'standalone.html'), standalone);

  return { stands, docs, guides, discovered };
}

/* ── self-проверки сборки (AC T1.3; unit для build.mjs не требуется —
   проверяется сборкой, сценарии e2e — с T1.4) ── */

async function selfChecks({ banner, stands, docs, guides, discovered }) {
  for (const name of [
    'ui-core.min.css',
    'ui-vi.min.css',
    // Паттерн-слой (T17.1): опциональный файл поставки — структура §6.1.
    'ui-patterns.css',
    'ui.min.js',
    'ui.dev.js',
    'fonts',
    'themes',
  ]) {
    assert(existsSync(join(DIST, name)), `dist/${name} отсутствует (структура §6.1)`);
  }
  // Зональность стилей каркаса (редизайн 19.10): showcase.css есть в полигоне
  // и его НЕТ в поставке — ui-core.min.css сайтов не смешивается с полигоном.
  assert(existsSync(join(SHOWCASE_DIST, 'showcase.css')), 'showcase/dist/showcase.css отсутствует');
  assert(
    !existsSync(join(DIST, 'showcase.css')),
    'dist/showcase.css не должен существовать: стили каркаса — зона полигона (ADR-0006)',
  );
  for (const name of [
    'ui-core.min.css',
    'ui-vi.min.css',
    'ui-patterns.css',
    'ui.min.js',
    'ui.dev.js',
  ]) {
    const content = readFileSync(join(DIST, name), 'utf8');
    assert(content.startsWith('/*! irao-ui v'), `баннер версии не в начале dist/${name}`);
  }
  // Гейт паттерн-слоя (T17.1, Implementation requirements п.2 — «проверка в
  // сборке»): селекторы слоя — только канонические префиксы lpp-|dpp-|fpp-
  // (потомки — компоненты ui-*), ID и чужие namespace-крючки запрещены —
  // защита от превращения слоя в свалку. Логика — showcase/patterns-layer-
  // gate.mjs (чистая функция, импортируется и юнит-пинами — ревью T17.1:
  // прежний инлайн-гейт с match без /g проверял только ПЕРВОЕ правило).
  {
    const layerProblems = patternLayerProblems(
      readFileSync(join(ROOT, 'patterns/patterns.css'), 'utf8'),
    );
    assert(layerProblems.length === 0, `гейт селекторов слоя: ${layerProblems.join('; ')}`);
  }
  // Страницы используют собранный dist, не исходники (AC T1.3). Доки по
  // шаблону T10.1 — в том же обходе (ревью T10.1: сломанный rel каркаса
  // иначе не ловит ни один гейт — рендер без CSS/JS выглядит «зелёным»).
  const pages = [
    'index.html',
    'standalone.html',
    ...stands.map((s) => `stands/${s.name}.html`),
    ...docs.map((d) => `docs/${d.name}.html`),
    ...guides.map((g) => `docs/${g.name}.html`),
  ];
  const sourceRef =
    /(?:href|src)="([^"]*(?:\/components\/|\/tokens\/|\/base\/|\/a11y\/|\/themes\/)[^"]*)"/;
  for (const rel of pages) {
    const html = readFileSync(join(SHOWCASE_DIST, rel), 'utf8');
    const match = html.match(sourceRef);
    assert(!match, `${rel} ссылается на исходники, а не на dist: ${match ? match[1] : ''}`);
    assert(html.includes('ui-core.min.css'), `${rel} не подключает собранный ui-core.min.css`);
    // Пин глубины страниц docs/ (на уровень ниже SHOWCASE_DIST): рантайм
    // подключается «../» — иначе 404 каркаса, которые не видны в статике.
    if (rel.startsWith('docs/')) {
      assert(
        html.includes('href="../ui-core.min.css"'),
        `${rel}: рантайм подключён не от «../» (глубина docs/ = SHOWCASE_DIST − 1)`,
      );
    }
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
      html.includes('<main id="main" tabindex="-1" class="ui-showcase-main">'),
      `${rel}: цель #main (main id="main" tabindex="-1") отсутствует — skip-link ведёт в никуда`,
    );
    // Каркас редизайна 19.10: стили каркаса подключены ПОСЛЕ ui-core,
    // сайдбар-навигация есть на всех страницах, кроме технической
    // standalone; активная ссылка (aria-current="page") — не более одной,
    // и ровно одна на страницах со своей записью в навигации (стенды
    // компонентов записи не имеют — их несёт карточка доки в каталоге).
    const pageName = rel
      .replace(/\.html$/, '')
      .replace(/^stands\//, '')
      .replace(/^docs\//, '');
    const hasNoCurrent = !rel.startsWith('docs/') && discovered.includes(pageName);
    if (rel !== 'standalone.html') {
      assert(
        html.indexOf('ui-core.min.css') < html.indexOf('showcase.css'),
        `${rel}: showcase.css подключён до ui-core.min.css (порядок каскада каркаса)`,
      );
      assert(html.includes('ui-showcase-nav'), `${rel}: сайдбар-навигация отсутствует`);
      const currentCount = html.split('ui-showcase-nav__link--current').length - 1;
      if (hasNoCurrent) {
        assert(
          currentCount === 0,
          `${rel}: стенд компонента без записи в навигации несёт ${currentCount} current-ссылок`,
        );
      } else {
        assert(
          currentCount === 1,
          `${rel}: ссылок с aria-current="page" в сайдбаре ${currentCount} (должна быть ровно одна)`,
        );
      }
    } else {
      assert(
        !html.includes('showcase.css'),
        'standalone.html: страница проверки dist — только ui-core.min.css, без стилей каркаса',
      );
    }
  }
  // Паттерн-слой на полигоне (T17.1): подключение адресно — стенды трёх
  // паттернов и landing-section, чьи связки живут в слое (T17.9 — lnk-card/
  // lgo-grid); остальные страницы (и каталог) слой не получают —
  // опциональность воспроизводится на полигоне.
  const patternLayerStands = new Set([
    'stands/patterns/list-page.html',
    'stands/patterns/detail-page.html',
    'stands/patterns/form-page.html',
    'stands/patterns/landing-section.html',
  ]);
  for (const rel of pages) {
    const html = readFileSync(join(SHOWCASE_DIST, rel), 'utf8');
    const hasLayerLink = html.includes('ui-patterns.css">');
    assert(
      hasLayerLink === patternLayerStands.has(rel),
      `${rel}: подключение ui-patterns.css ${patternLayerStands.has(rel) ? 'ожидается' : 'не ожидается'} (слой опционален, получатели — стенды трёх паттернов + landing-section T17.9)`,
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
  // T10.2 добавляет к прогону полноту и связность: инвентаризация
  // «компоненты dist + паттерны ↔ страницы» и проверку, что относительные
  // ссылки страниц (перекрёстные doc:/stand:, стенды responsive-секции)
  // резолвятся в полигоне — «нет битых» (AC T10.2).
  const completeness = await docCompletenessProblems(ROOT);
  assert(completeness.length === 0, `полнота док (T10.2): ${completeness.join('; ')}`);
  for (const { name, markup } of docs) {
    const html = readFileSync(join(SHOWCASE_DIST, 'docs', `${name}.html`), 'utf8');
    const problems = verifyDocPageHtml(html, markup);
    assert(problems.length === 0, `дока ${name} ≠ шаблону T10.1: ${problems.join('; ')}`);
    const broken = brokenDocLinks(html, join(SHOWCASE_DIST, 'docs'));
    assert(broken.length === 0, `дока ${name}: битые ссылки — ${broken.join('; ')}`);
  }
  // AC T10.2: 100% компонентов dist имеют док-страницу — discovered ↔ docs
  // «и наоборот» на уровне собранного полигона (инвентаризация выше — по
  // исходникам, этот гейт — по факту генерации).
  const missingDocs = discovered.filter((name) => !docs.some((doc) => doc.name === name));
  assert(
    missingDocs.length === 0,
    `компоненты dist без док-страницы (T10.2): ${missingDocs.join(', ')}`,
  );
  // AC T10.1: все три эталона собрались и прошли чек-лист (отсутствие
  // метаданных эталона — warning выше, здесь — жёсткий гейт).
  for (const reference of REFERENCE_COMPONENTS) {
    assert(
      docs.some((doc) => doc.name === reference),
      `эталон T10.1 ${reference} не имеет док-страницы (нужны showcase/docs/${reference}.mjs)`,
    );
  }
  // Гайды T10.3 (AC): «сниппеты в гайдах = файлы в bitrix/» — синхронизация
  // embed-блоков на билде; полнота покрытия сниппетов гайдами; битые ссылки
  // записанных страниц полигона. Имя гайда не должно подменять док-страницу
  // компонента (общий каталог docs/).
  const guideCoverage = guideSnippetCoverageProblems(ROOT);
  assert(guideCoverage.length === 0, `полнота гайдов T10.3: ${guideCoverage.join('; ')}`);
  for (const guide of guides) {
    assert(
      !discovered.includes(guide.name),
      `имя гайда ${guide.name} пересекается с компонентом — подмена док-страницы docs/${guide.name}.html`,
    );
    const syncProblems = guideSyncProblems(ROOT, guide);
    assert(
      syncProblems.length === 0,
      `синхронизация гайда ${guide.name}: ${syncProblems.join('; ')}`,
    );
    const guideHtml = readFileSync(join(SHOWCASE_DIST, 'docs', `${guide.name}.html`), 'utf8');
    const guideBroken = brokenDocLinks(guideHtml, join(SHOWCASE_DIST, 'docs'));
    assert(
      guideBroken.length === 0,
      `гайд ${guide.name}: битые ссылки — ${guideBroken.join('; ')}`,
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

  // Паттерн-слой (T17.1): тот же конвейер, что у ui-core — минификация
  // esbuild + баннер версии (emitRuntime ниже); подключение опционально.
  const patternsCss = await bundle(CSS_PATTERNS, 'css');

  const jsFiles = [...COMPONENTS.map((name) => `components/${name}/${name}.js`), ...JS_VI].filter(
    (rel) => existsSync(join(ROOT, rel)),
  );
  const uiJs = await bundle(jsFiles, 'js');

  // Dev-вариант ui.min.js (T12.2): те же модули + механизм deprecation, БЕЗ
  // минификации (исходники читаемы в devtools). Прод-бандл выше не меняется.
  const uiDevJs = await bundle([...jsFiles, ...JS_DEV_ONLY], 'js', false);

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
    // Паттерн-слой (T17.1) — опциональный файл поставки: подключение — решение
    // сайта, порядок в head после ui-core (токены → core → patterns → сайт).
    writeFileSync(join(target, 'ui-patterns.css'), banner + patternsCss);
    writeFileSync(join(target, 'ui.min.js'), banner + uiJs);
    writeFileSync(join(target, 'ui.dev.js'), banner + uiDevJs);
    copyFonts(target);
    copyThemes(target);
  };
  emitRuntime(DIST);
  emitRuntime(SHOWCASE_DIST);
  // Стили каркаса полигона — ТОЛЬКО в полигон (редизайн 19.10): dist/
  // остаётся чистой поставкой для сайтов (ADR-0006). Копия байт-в-байт,
  // без баннера — файл живёт в репозитории как исходник.
  writeFileSync(join(SHOWCASE_DIST, 'showcase.css'), readFileSync(SHOWCASE_CSS_SRC, 'utf8'));

  const { stands, docs, guides, discovered } = await generateShowcase({ themes: themeNames() });
  await selfChecks({ banner, stands, docs, guides, discovered });

  for (const name of COMPONENTS) {
    if (!existsSync(join(ROOT, `components/${name}`))) {
      warn(`'${name}' есть в COMPONENTS, но папки components/${name}/ нет`);
    }
  }

  console.log(`irao-ui build: v${version} · git ${sha}`);
  console.log(`  dist/ui-core.min.css  ${coreCss.length} байт css + баннер`);
  console.log(`  dist/ui-vi.min.css    ${viCss.length} байт css + баннер`);
  console.log(
    `  dist/ui-patterns.css  ${patternsCss.length} байт css + баннер (паттерн-слой T17.1, опциональный)`,
  );
  console.log(
    `  dist/ui.min.js        ${uiJs.length} байт js + баннер (${jsFiles.length} модулей)`,
  );
  console.log(
    `  dist/ui.dev.js        ${uiDevJs.length} байт js + баннер (${jsFiles.length + JS_DEV_ONLY.length} модулей, не минифицирован, T12.2)`,
  );
  console.log(`  showcase/dist/        index.html + standalone.html + ${stands.length} стенд(ов)`);
  console.log(
    `  showcase/dist/docs/   ${docs.length} док-страниц(ы) по шаблону T10.1 ` +
      `(${docs.map((doc) => doc.name).join(', ') || '—'})`,
  );
  console.log(
    `  showcase/dist/docs/   ${guides.length} гайд(а) внедрения T10.3 ` +
      `(${guides.map((guide) => guide.name).join(', ') || '—'})`,
  );
  console.log('OK: сборка завершена (структура 02-architecture §6.1)');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
