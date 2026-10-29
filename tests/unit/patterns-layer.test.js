/**
 * Юнит-пины T17.1 — паттерн-слой ui-patterns.css в dist (вариант A, решение
 * владельца 25.10; спека docs/ui-system/epics/EPIC-17-ds-full-coverage/
 * T17.1-pattern-layer.md).
 *
 * Исполняемая форма решения:
 *  - patterns/patterns.css — единый исходник слоя: канонические связки
 *    list/detail/form-страниц (классы lpp-, ddp-, fpp-), перенесённые 1:1 из
 *    док-HTML паттернов (значения и «как есть»-литералы с комментариями-
 *    источниками); компонентные стили слой не дублирует;
 *  - showcase/build.mjs собирает слой в dist/ui-patterns.css (минифицированный,
 *    с баннером версии, как ui-core) и подключает его стендам трёх паттернов;
 *  - подключение ОПЦИОНАЛЬНО: ui-core.min.css не меняется; порядок в <head>:
 *    токены → core → patterns → сайт;
 *  - селекторы слоя — только канонические префиксы
 *    lpp-|ddp-|fpp-|lnk-|lgo-|tlp-|nvp|hsp-|ftp- (гейт «защита от
 *    превращения слоя в свалку»); док-HTML паттернов и слой синхронны
 *    (одни классы);
 *  - слой не содержит @media-ступеней, кроме канонических ступеней паттернов
 *    (mobile-first ДС; лестницы пилота 1023/767 не переносятся);
 *  - пилот подключает слой (ds/ui-patterns.css) и перевёл строки/сайдбар
 *    вакансий на lpp-*; дубликаты cp-vac-row-семейства, cp-vac-layout,
 *    cp-vac-side-семейства и cp-breadcrumbs сняты из pilot.css
 *    (cp-page-head — полнота в adoption T17.14; find-bar переведён на
 *    канон lpp-find в T17.12).
 *
 * Поверхность браузера (стенды, compare-пробы, визуальные эталоны) — e2e/
 * compare-прогон; здесь — пины исходников и сборки.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

/** Шкала брейкпоинтов T2.5 (значения BREAKPOINTS stylelint.config.mjs;
 *  формат — строковые px-значения, прецедент pattern-detail-page.test.js). */
const BREAKPOINTS = ['480', '768', '1024', '1280', '1440'];

const LAYER_PATH = join(root, 'patterns', 'patterns.css');
const PATTERN_SOURCES = {
  'patterns/list-page/list-page.html': 'lpp-',
  // Детальная страница — T17.14: канон контентной колонки — голый блок `dpp`
  // с BEM-элементами `dpp__*` (пример спеки: <div class="ddp"> → spelling
  // слоя dpp, гейт префиксов). Префикс без дефиса матчит и прежние связки
  // dpp-* (крошки/лейаут/aside), и новые dpp__/dpp-- — синхронность «док ↔
  // слой» гонится по обоим семействам.
  'patterns/detail-page/detail-page.html': 'dpp',
  'patterns/form-page/form-page.html': 'fpp-',
  // Таймлайн — adoption T17.10: связки tlp-* переехали из <style> дока
  // (T14.11) в слой, разметка дока и пилота — на классах канона. Значение
  // БЕЗ дефиса: блок-класс таймлайна — голый `tlp` (пример спеки T17.10).
  'patterns/timeline/timeline.html': 'tlp',
  // Каркасы шапки/подвала — T17.13: связки hsp-/ftp-* переехали из
  // <style> доков (T7.6) в слой, разметка доков и пилота — на классах
  // канона (один источник правды; светлый футер — база ftp, тон —
  // модификатор ftp--muted).
  'patterns/header/header.html': 'hsp',
  'patterns/footer/footer.html': 'ftp',
};

/** Поднавигация разделов (T17.11): канон nvp — тот же док-источник list-page
 *  (страницы разделов — списки), отдельная пара для синхронности «разметка ↔
 *  слой» (блок-класс — голый `nvp`, пример спеки T17.11). */
const PATTERN_SOURCE_EXTRA = [['patterns/list-page/list-page.html', 'nvp']];

/** Крючки слоя без разметки в доке (осознанные, с обоснованием — по образцу
 *  MARKERS_WITHOUT_RULES, обратное направление: правило слоя без класса в
 *  док-HTML). hsp--overlay — режим ГЛАВНОЙ (absolute поверх hero, спека
 *  T17.13 п.3): на стенде шапки он накрыл бы контент и встал в пару к
 *  banner-лендмарке. Крючок исполнен разметкой ПИЛОТА (index.html — пин
 *  «overlay-режим главной» ниже) — слой не изобретает имён.
 *  dpp--card — карточная форма контентной колонки вакансии (T17.14): порт
 *  cp-vacancy-page (принято ДС в калибровке T15.1; оригинал .vacancy-page
 *  без карточки) — исполнен разметкой ПИЛОТА (vacancy.html), док канона
 *  несёт базовую колонку без карточки. */
const LAYER_HOOKS_WITHOUT_DOC_MARKUP = new Set(['hsp--overlay', 'dpp--card']);

/** Все пары «док → префикс» для пинов синхронности. */
const PATTERN_SOURCE_ENTRIES = [...Object.entries(PATTERN_SOURCES), ...PATTERN_SOURCE_EXTRA];

let layer = '';
try {
  layer = readFileSync(LAYER_PATH, 'utf8');
} catch {
  // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
  layer = '';
}

/** CSS без комментариев: гейты смотрят на исполняемый код, не на прозу. */
const code = layer.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; для ступеней — срез от
 *  индекса крючка, прецедент пина nvp). */
const blockOf = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = code.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Селекторы исполняемого кода: прелюдии @media/at-rule пропускаются. */
const selectors =
  code
    .split('\n')
    .join('\n')
    .match(/([^{}]+)\{/g)
    ?.map((piece) => piece.replace(/\{$/, '').trim())
    .filter((selector) => selector !== '' && !selector.startsWith('@')) ?? [];

/** Классы-крючки селектора: все \.имена в нём. */
const hookClasses = (selector) => selector.match(/\.[a-z][a-z0-9_-]*/g) ?? [];

/** Классы паттерна из разметки дока (атрибуты class="", многострочные —
 *  схлопнуты; комментарии не участвуют). */
const markupClasses = (html, prefix) => {
  const collapsed = html
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ');
  const attrs = collapsed.match(/class="[^"]*"/g) ?? [];
  const found = new Set();
  for (const attr of attrs) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (name.startsWith(prefix)) found.add(name);
    }
  }
  return found;
};

/** Крючки слоя по префиксам из селекторов (классы lpp-, ddp-, fpp-). Блок
 *  таймлайна — голый `tlp` (пример спеки T17.10, без дефиса) — значение без
 *  дефиса матчит префикс и его BEM-потомков. */
const layerHooks = (prefix) => {
  const hooks = new Set();
  for (const selector of selectors) {
    for (const hook of hookClasses(selector)) {
      if (hook.startsWith(`.${prefix}`)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

/** Классы-маркеры канона без собственных правил (таксономия имён, вид несёт
 *  разметка/компоненты). Список осознанный: новый класс разметки без правила
 *  падает тестом — снимается правилом слоя или дописывается сюда. */
const MARKERS_WITHOUT_RULES = new Set([
  'lpp-row__short', // цвет несёт роль ui-text--muted разметки
  'dpp-article', // semantic-обёртка article (JobPosting), стилей не требует
  'dpp-aside__title', // вид несёт роль ui-h4 разметки
  'dpp-aside__note', // цвет несёт роль ui-text--muted разметки
  'ftp__logo', // размеры логотипа — сайт-зона (T17.13 п.1); слот каркаса
  'ftp__contact-label', // цвет muted несёт роль ui-text--muted разметки
  'ftp__top', // переход кверху — вид несёт роль ui-link разметки
]);

describe('patterns/patterns.css — единый исходник паттерн-слоя (Scope T17.1)', () => {
  it('файл существует и объявляет слой: вариант A, опциональное подключение, порядок в head', () => {
    expect(layer, 'исходник слоя на месте').not.toBe('');
    expect(layer, 'решение владельца (вариант A) зафиксировано в шапке').toContain('вариант A');
    expect(layer, 'опциональность подключения задокументирована').toContain('ui-patterns.css');
    expect(layer, 'порядок каскада: токены → core → patterns → сайт').toContain('core');
  });

  it('селекторы слоя — только канонические префиксы lpp-|ddp-|fpp-|lnk-|lgo-|tlp-|nvp|hsp-|ftp- (Implementation requirements п.2; lnk-/lgo- — лендинг-связки T17.9; tlp- — таймлайн T17.10; nvp — поднавигация T17.11; hsp-/ftp- — каркасы шапки/подвала T17.13)', () => {
    expect(selectors.length, 'правила в слое есть').toBeGreaterThan(0);
    for (const selector of selectors) {
      const hooks = hookClasses(selector);
      // Блок-классы таймлайна (tlp, T17.10) и поднавигации (nvp, T17.11) —
      // голые, без суффикса: префикс продолжается дефисом, модификатором __
      // или заканчивается на нём.
      expect(
        hooks.some((hook) => /^\.(lpp|dpp|fpp|lnk|lgo|tlp|nvp|hsp|ftp)(?:-|__|$)/.test(hook)),
        `селектор «${selector}» несёт крючок слоя lpp-/ddp-/fpp-/lnk-/lgo-/tlp-/nvp/hsp-/ftp-`,
      ).toBe(true);
      for (const hook of hooks) {
        expect(
          /^\.(?:ui-|(?:lpp|dpp|fpp|lnk|lgo|tlp|nvp|hsp|ftp)(?:-|__|$))/.test(hook),
          `крючок «${hook}» селектора «${selector}» — канонический префикс (или компонент-потомок ui-), не свалка`,
        ).toBe(true);
      }
      expect(selector, 'ID-селекторов в слое нет (02-architecture §1)').not.toMatch(/#[a-zA-Z]/);
    }
  });

  it('слой не дублирует компоненты: ни один селектор не начинается с ui-крючка (Out of scope)', () => {
    for (const selector of selectors) {
      const first = hookClasses(selector)[0];
      expect(
        first.startsWith('.ui-'),
        `селектор «${selector}» начинается с крючка слоя, не компонента`,
      ).toBe(false);
    }
  });

  it('инварианты системы: без hex, без !important, без inline-стилей', () => {
    expect(code, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code, '!important только в a11y/vi.css').not.toContain('!important');
  });

  it('media-ступени — только канонические: min-width из шкалы T2.5 и (hover: hover)', () => {
    const medias = [...code.matchAll(/@media\s+([^{]+)/g)].map((match) => match[1].trim());
    expect(medias.length, 'media-ступени в слое есть').toBeGreaterThan(0);
    for (const media of medias) {
      if (media.startsWith('(hover')) {
        expect(media, 'hover-гвард канонический').toBe('(hover: hover)');
        continue;
      }
      const values = [...media.matchAll(/min-width:\s*(\d+)px/g)].map((match) => match[1]);
      expect(values.length, `ступень «${media}» — min-width (mobile-first)`).toBeGreaterThan(0);
      for (const value of values) {
        expect(BREAKPOINTS, `значение ${value}px — из шкалы T2.5`).toContain(value);
      }
      expect(media, 'лестницы пилота (max-width) не переносятся').not.toContain('max-width');
    }
  });

  it('значения канона 1:1 — строка списка (24/28, шаг main 8px, лента 16px, CTA-пилюля вне ссылки)', () => {
    const blockOf = (selector) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = code.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
      return match ? match[1] : null;
    };
    const row = blockOf('.lpp-row');
    expect(row, '.lpp-row найдено').toBeTruthy();
    expect(row, 'паддинг строки 24/28 — pages.css:165 «как есть»').toContain(
      'padding: var(--ui-space-5) 1.75rem;',
    );
    expect(row, 'gap — канон list-page (space-7, решение владельца 25.10)').toContain(
      'gap: var(--ui-space-7);',
    );
    expect(row, 'flex-direction: row — сброс колонки ui-card').toContain('flex-direction: row;');
    const main = blockOf('.lpp-row__main');
    expect(main, 'шаг main-блока 8px').toContain('gap: var(--ui-space-2);');
    expect(main, 'min-width: 0 — перенос длинных заголовков').toContain('min-width: 0;');
    const rows = blockOf('.lpp-rows');
    expect(rows, 'шаг ленты 16px — .vac-rows pages.css:157').toContain('gap: var(--ui-space-4);');
    const title = blockOf('.lpp-row__title a');
    expect(title, 'ссылка заголовка — plain (inherit, без линии)').toContain('color: inherit;');
    expect(title).toContain('text-decoration: none;');
  });

  it('значения канона 1:1 — сайдбар (280px от lg, mobile-база одна колонка, sticky от md)', () => {
    const lgBlock = code.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\n\}/);
    expect(lgBlock, 'ступень lg в слое есть').toBeTruthy();
    expect(
      lgBlock[0],
      'колонка сайдбара 17.5rem = 280px оригинала (калибровка T17.1: значение канона, не пилота)',
    ).toContain('grid-template-columns: 17.5rem minmax(0, 1fr);');
    // База лейаута — правило до первой media-ступени связки (mobile-first).
    const layoutBase = code.match(/\.lpp-layout\s*\{([^}]*)\}/);
    expect(layoutBase, '.lpp-layout найдено').toBeTruthy();
    expect(layoutBase[1], 'мобильная база — одна колонка (mobile-first)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const mdBlock = code.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\n\}/);
    expect(mdBlock[0], 'sticky сайдбара — от md (ступень канона)').toContain('position: sticky;');
  });

  it('значения канона 1:1 — крошки/page-head/detail/form («как есть»-литералы с источниками)', () => {
    expect(code, 'ритм крошек 20px «как есть» (полоса 62px, T14.5)').toContain(
      'padding-block: 1.25rem var(--ui-space-5);',
    );
    expect(code, 'detail: aside — порт form-aside (поверхность muted)').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
    expect(code, 'detail: related-кнопки — anywhere (32px-стресс T3.6)').toContain(
      'overflow-wrap: anywhere;',
    );
    expect(code, 'form: форма после page-head — space-6').toContain(
      'margin-top: var(--ui-space-6);',
    );
    expect(code, 'detail: aside lg — токен --ui-form-aside-width').toContain(
      'grid-template-columns: minmax(0, 1fr) var(--ui-form-aside-width);',
    );
  });

  it('значения канона 1:1 — контентная колонка dpp (T17.14): колонка gap 32, шапка-тройка gap 8, лента тегов, секция gap 8', () => {
    // Спека T17.14: ddp-канон (spelling слоя — dpp, гейт префиксов; блоки
    // cp-vacancy-page*/cp-detail-* сняты в слой, значения — калибровка
    // раундов 2–4, перенос механический).
    const col = blockOf('.dpp');
    expect(col, '.dpp найдено').toBeTruthy();
    expect(col, 'колонка gap 32 — cp-detail-main (pages.css:544) / cp-vacancy-page').toContain(
      'gap: var(--ui-space-6);',
    );
    expect(col, 'flex-колонка').toContain('flex-direction: column;');
    const card = blockOf('.dpp--card');
    expect(card, '.dpp--card найдено (карточная форма вакансии)').toBeTruthy();
    expect(card, 'паддинг карточки 32 — cp-vacancy-page (принято ДС, T15.1)').toContain(
      'padding: var(--ui-space-6);',
    );
    expect(card, 'радиус карточки').toContain('border-radius: var(--ui-radius-md);');
    expect(card, 'поверхность карточки').toContain(
      'background-color: var(--ui-color-surface);',
    );
    const head = blockOf('.dpp__head');
    expect(head, '.dpp__head найдено').toBeTruthy();
    expect(head, 'шапка-тройка gap 8 — cp-vacancy-page__head/cp-detail-head').toContain(
      'gap: var(--ui-space-2);',
    );
    const tags = blockOf('.dpp__tags');
    expect(tags, '.dpp__tags найдено').toBeTruthy();
    expect(tags, 'лента gap 8 — cp-detail-tags').toContain('gap: var(--ui-space-2);');
    expect(tags, 'перенос строк ленты').toContain('flex-wrap: wrap;');
    const photo = blockOf('.dpp__photo');
    expect(photo, '.dpp__photo найдено').toBeTruthy();
    expect(photo, 'мобильная база 260px — оригинал @max-767 (pages.css:933)').toContain(
      'height: 16.25rem;',
    );
    expect(photo, 'радиус фото').toContain('border-radius: var(--ui-radius-md);');
    const photoIdx = code.indexOf('.dpp__photo');
    const photoMd = code
      .slice(photoIdx)
      .match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.dpp__photo\s*\{([^}]*)\}/);
    expect(photoMd, 'ступень md для фото найдена').toBeTruthy();
    expect(photoMd[1], 'фото 420px от md — pages.css:542 «как есть»').toContain(
      'height: 26.25rem;',
    );
    const section = blockOf('.dpp__section');
    expect(section, '.dpp__section найдено').toBeTruthy();
    expect(section, 'секция gap 8 — cp-vacancy-page__section/cp-detail-section').toContain(
      'gap: var(--ui-space-2);',
    );
  });

  it('значения канона 1:1 — зарплата/place/date (литерал 18px T16.13; цвет muted — роль разметки)', () => {
    const salary = blockOf('.dpp__salary');
    expect(salary, '.dpp__salary найдено').toBeTruthy();
    expect(salary, 'литерал 1.125rem = 18px — pages.css:271, T16.13-mapping (НЕ роль)').toContain(
      'font-size: 1.125rem;',
    );
    const place = code.match(/\.dpp__place,\s*\.dpp__date\s*\{([^}]*)\}/)?.[1] ?? null;
    expect(place, '.dpp__place/.dpp__date найдено').toBeTruthy();
    expect(place, 'шаг иконки 4px — калибровка пилота (space-1)').toContain(
      'gap: var(--ui-space-1);',
    );
    expect(place, 'inline-flex строка с иконкой').toContain('display: inline-flex;');
    expect(place, 'цвет muted несёт роль ui-text--muted разметки').not.toContain('color');
  });

  it('значения канона 1:1 — слот медиа (карта-заглушка) и foot (разделитель + space-between)', () => {
    const media = blockOf('.dpp__media');
    expect(media, '.dpp__media найдено').toBeTruthy();
    expect(media, 'высота 18rem — cp-vacancy-page__map (карта — контент сайта)').toContain(
      'height: 18rem;',
    );
    expect(media, 'радиус слота').toContain('border-radius: var(--ui-radius-md);');
    expect(media, 'заглушка на muted-поверхности').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
    const foot = blockOf('.dpp__foot');
    expect(foot, '.dpp__foot найдено').toBeTruthy();
    expect(foot, 'space-between — cp-vacancy-page__foot').toContain(
      'justify-content: space-between;',
    );
    expect(foot, 'разделитель — border-top muted').toContain(
      'border-top: var(--ui-border-width) solid var(--ui-color-border-muted);',
    );
    expect(foot, 'отступ над разделителем 16 — cp-vacancy-page__foot').toContain(
      'padding-top: var(--ui-space-4);',
    );
    // Мобильная база — колонка (оригинал .vacancy-page__foot @max-760 →
    // column; канон принимает значение оригинала, ступень md из шкалы T2.5).
    expect(foot, 'мобильная база — колонка (оригинал ≤760)').toContain(
      'flex-direction: column;',
    );
    expect(foot, 'мобильная база — прижато влево').toContain('align-items: flex-start;');
    const idx = code.indexOf('.dpp__foot');
    const md = code
      .slice(idx)
      .match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.dpp__foot\s*\{([^}]*)\}/);
    expect(md, 'ступень md для foot найдена').toBeTruthy();
    // space-between остаётся из базы — ступень меняет только направление/ось.
    expect(md[1], 'от md — строка (как в оригинале ≥761)').toContain('flex-direction: row;');
    expect(md[1]).toContain('align-items: center;');
    expect(md[1], 'space-between не переобъявляется (база)').not.toContain('flex-direction: column');
  });

  it('значения канона 1:1 — article-связки: колонка 24, мета-лента 12 (дети 28px), тип с точкой', () => {
    const article = blockOf('.dpp--article');
    expect(article, '.dpp--article найдено').toBeTruthy();
    expect(article, 'колонка статьи gap 24 — pages.css:614 (.article-page) «как есть»').toContain(
      'gap: var(--ui-space-5);',
    );
    const meta = blockOf('.dpp__meta');
    expect(meta, '.dpp__meta найдено').toBeTruthy();
    expect(meta, 'лента gap 12 — pages.css:620').toContain('gap: var(--ui-space-3);');
    expect(meta, 'отступ до галереи 8 — pages.css:622').toContain(
      'margin-bottom: var(--ui-space-2);',
    );
    const metaChild = blockOf('.dpp__meta > *');
    expect(metaChild, 'дети мета-ленты — «текст на одной линии» (pages.css:626)').toContain(
      'min-height: 1.75rem;',
    );
    expect(metaChild, 'inline-flex с центром — тот же вид, min-height вместо height (rem-стресс, прецедент ui-tag T4.2)').toContain(
      'align-items: center;',
    );
    const type = blockOf('.dpp__type');
    expect(type, '.dpp__type найдено').toBeTruthy();
    expect(type, 'строка 14 — fs-small').toContain('font-size: var(--ui-fs-small);');
    expect(type, 'вес 500 — .media__tag --fw-caption (media.css:85)').toContain(
      'font-weight: var(--ui-fw-small);',
    );
    expect(type, 'uppercase наследует .media__tag').toContain('text-transform: uppercase;');
    expect(type, 'ls 0.02em «как есть» (pages.css:635)').toContain('letter-spacing: 0.02em;');
    const dot = code.match(/\.dpp__type::before\s*\{([^}]*)\}/);
    expect(dot, '.dpp__type::before найдено').toBeTruthy();
    expect(dot[1], 'точка 8px «как есть» (media.css)').toContain('width: 0.5rem;');
    expect(dot[1], 'точка — primary').toContain('background-color: var(--ui-color-primary);');
  });

  it('значения канона 1:1 — article-связки: галерея 2fr/1fr от lg, текст 16, related 40/56/32', () => {
    const gallery = blockOf('.dpp__gallery');
    expect(gallery, '.dpp__gallery найдено').toBeTruthy();
    expect(gallery, 'шаг 16 — pages.css:644').toContain('gap: var(--ui-space-4);');
    expect(gallery, 'мобильная база — колонка (оригинал ≤1023 → 1fr)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const idx = code.indexOf('.dpp__gallery');
    const lg = code
      .slice(idx)
      .match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.dpp__gallery\s*\{([^}]*)\}/);
    expect(lg, 'ступень lg для галереи найдена').toBeTruthy();
    expect(lg[1], '2fr/1fr — pages.css:644 «как есть», от lg (канон ступени 1024)').toContain(
      'grid-template-columns: 2fr minmax(0, 1fr);',
    );
    const galleryImg = blockOf('.dpp__gallery img');
    expect(galleryImg, 'фото галереи растянуто (pages.css:646)').toContain('height: 100%;');
    expect(galleryImg).toContain('border-radius: var(--ui-radius-md);');
    const text = blockOf('.dpp__text');
    expect(text, '.dpp__text найдено').toBeTruthy();
    expect(text, 'шаг абзацев 16 — pages.css:648').toContain('gap: var(--ui-space-4);');
    const related = blockOf('.dpp-related');
    expect(related, '.dpp-related найдено').toBeTruthy();
    expect(related, 'отступ related 40px «как есть» — pages.css:650').toContain(
      'margin-top: 2.5rem;',
    );
    const relatedH3 = blockOf('.dpp-related .ui-h3');
    expect(relatedH3, 'шаг заголовка 56px «как есть» (article.html:31)').toContain(
      'margin-top: 3.5rem;',
    );
    expect(relatedH3, 'низ 32px — section__title (components.css:340)').toContain(
      'margin-bottom: var(--ui-space-6);',
    );
    const first = blockOf('.dpp-related .ui-h3:first-child');
    expect(first, 'первый заголовок без верхнего шага').toContain('margin-top: 0;');
  });

  it('значения канона 1:1 — company-связки: hero 25rem/1fr от 1280 (оригинал ≤1279 — колонка), фото 260/320, where-пары', () => {
    const hero = blockOf('.dpp-hero');
    expect(hero, '.dpp-hero найдено').toBeTruthy();
    expect(hero, 'зазор 48 — pages.css:796').toContain('gap: var(--ui-space-7);');
    expect(hero, 'выравнивание по центру строки').toContain('align-items: center;');
    expect(hero, 'низ 40px «как есть» — pages.css:796').toContain('margin-bottom: 2.5rem;');
    expect(hero, 'мобильная база — колонка (оригинал ≤1279 → 1fr)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const heroIdx = code.indexOf('.dpp-hero');
    const heroLg = code
      .slice(heroIdx)
      .match(/@media \(min-width: 1280px\)\s*\{[\s\S]*?\.dpp-hero\s*\{([^}]*)\}/);
    expect(heroLg, 'ступень 1280 для hero найдена (оригинал ≤1279, шкала T2.5)').toBeTruthy();
    expect(
      heroLg[1],
      '2кол 400px/1fr — pages.css:796 «как есть» (25rem; minmax — rem-стресс T3.6)',
    ).toContain('grid-template-columns: 25rem minmax(0, 1fr);');
    const heroPhotoLg = code
      .slice(heroIdx)
      .match(/@media \(min-width: 1280px\)\s*\{[\s\S]*?\.dpp-hero__photo\s*\{([^}]*)\}/);
    expect(heroPhotoLg, 'ступень 1280 для фото hero найдена').toBeTruthy();
    expect(heroPhotoLg[1], 'фото 320px от 1280 — pages.css:799/903').toContain('height: 20rem;');
    const photo = blockOf('.dpp-hero__photo');
    expect(photo, '.dpp-hero__photo найдено').toBeTruthy();
    expect(photo, 'мобильная база фото 260px — pages.css:903 (оригинал ≤1279)').toContain(
      'height: 16.25rem;',
    );
    expect(photo).toContain('border-radius: var(--ui-radius-md);');
    const body = blockOf('.dpp-hero__body');
    expect(body, 'шаг имя/описание 16 — pages.css:801').toContain('gap: var(--ui-space-4);');
    const heroText = blockOf('.dpp-hero__text');
    expect(heroText, 'шаг абзацев 12 — pages.css:803').toContain('gap: var(--ui-space-3);');
    const where = blockOf('.dpp-where');
    expect(where, '.dpp-where найдено').toBeTruthy();
    expect(where, 'шаг пар 24 — pages.css:821').toContain('gap: var(--ui-space-5);');
    expect(where, 'низ 56px «как есть» — company-section-gap (pages.css:884)').toContain(
      'margin-bottom: 3.5rem;',
    );
    expect(where, 'мобильная база — колонка (оригинал ≤1023 → 1fr)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const whereIdx = code.indexOf('.dpp-where');
    const whereLg = code
      .slice(whereIdx)
      .match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.dpp-where\s*\{([^}]*)\}/);
    expect(whereLg, 'ступень lg для where найдена').toBeTruthy();
    expect(whereLg[1], 'пара фото+подпись 2 колонки от lg — pages.css:821').toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    );
    const wherePhoto = blockOf('.dpp-where__photo');
    expect(wherePhoto, 'высота фото 280px «как есть» — pages.css:823').toContain(
      'height: 17.5rem;',
    );
  });

  it('значения канона 1:1 — поднавигация nvp (T17.11): сетка 5×1fr «сетка 264» от md, маргины 24/48 (pages.css:969–1001)', () => {
    // Вид пилюль несёт модификатор ui-tabs--pill (T14.9) — слой его не
    // дублирует: nvp переносит только раскладку страницы (сетка трека и
    // nav-маргины — зона страницы по README ui-tabs «Модификатор --pill»).
    const nav = code.match(/(?:^|\n)\.nvp\s*\{([^}]*)\}/);
    expect(nav, '.nvp найдено').toBeTruthy();
    expect(nav[1], 'маргины nav.tabs-pill 24/48 — pages.css:969').toContain(
      'margin: var(--ui-space-5) 0 var(--ui-space-7);',
    );
    const list = code.match(/(?:^|\n)\.nvp \.ui-tabs__list\s*\{([^}]*)\}/);
    expect(list, '.nvp .ui-tabs__list найдено').toBeTruthy();
    expect(list[1], 'DS-маргин __list (32px под панелями) сброшен').toContain('margin: 0;');
    // Сетка 5×1fr — от md (768, шкала T2.5): mobile-first база — лента ДС
    // (flex с переносом; оригинал держит сетку и на узких — осознанное
    // отклонение, прецедент таймлайна T17.10). 32px-гейт T3.6: min-content
    // пяти пилюль ≈760px — на 640 (zoom 200%) сетка даёт hscroll. Поиск — от
    // начала блока nvp (в файле есть другие @media 768 — lpp-/lgo-/lnk-).
    const nvpIdx = code.indexOf('.nvp .ui-tabs__list');
    expect(nvpIdx, 'базовое правило ленты nvp найдено').toBeGreaterThan(-1);
    const grid = code
      .slice(nvpIdx)
      .match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.nvp \.ui-tabs__list\s*\{([^}]*)\}/);
    expect(grid, 'сетка repeat(5, 1fr) трека — pages.css:975 («сетка 264»), от md').toBeTruthy();
    expect(grid[1]).toContain('grid-template-columns: repeat(5, 1fr);');
    // Компонентные свойства (трек/пилюли) слой не повторяет.
    expect(list[1]).not.toContain('background');
    expect(list[1]).not.toContain('padding');
  });

  it('значения канона 1:1 — каркас шапки hsp (T17.13): сетка 1fr auto 1fr, паддинги 16/8, меню gap 16 + nowrap-пункты', () => {
    const inner = blockOf('.hsp__inner');
    expect(inner, '.hsp__inner найдено').toBeTruthy();
    expect(inner, 'сетка 1fr auto 1fr — .cp-header__inner (pilot.css:52)').toContain(
      'grid-template-columns: 1fr auto 1fr;',
    );
    expect(inner, 'gap 16 — --ui-space-4').toContain('gap: var(--ui-space-4);');
    expect(inner, 'паддинг верх 16 — --ui-space-4 (спека T17.13 «паддинги 16/8»)').toContain(
      'padding-top: var(--ui-space-4);',
    );
    expect(inner, 'паддинг низ 8 — --ui-space-2').toContain('padding-bottom: var(--ui-space-2);');
    const menu = blockOf('.hsp__menu');
    expect(menu, '.hsp__menu найдено').toBeTruthy();
    expect(menu, 'gap 16 — меню шапки').toContain('gap: var(--ui-space-4);');
    expect(menu, 'padding-top 8 — ритм строки пунктов').toContain(
      'padding-top: var(--ui-space-2);',
    );
    const link = blockOf('.hsp__menu .ui-link');
    expect(link, 'nowrap-пункты меню').toContain('white-space: nowrap;');
  });

  it('значения канона 1:1 — режимы шапки: базовый static (border muted) поверх — hsp--overlay (absolute, z-40)', () => {
    const hsp = blockOf('.hsp');
    expect(hsp, '.hsp найдено').toBeTruthy();
    expect(hsp, 'базовый static несёт border-bottom muted — .cp-header--static').toContain(
      'border-bottom: var(--ui-border-width) solid var(--ui-color-border-muted);',
    );
    expect(hsp, 'surface-пара основы (Implementation requirements п.1)').toContain(
      'background-color: var(--ui-color-surface);',
    );
    const overlay = blockOf('.hsp--overlay');
    expect(overlay, '.hsp--overlay найдено').toBeTruthy();
    expect(overlay, 'absolute поверх контента главной — .cp-header (pilot.css:43)').toContain(
      'position: absolute;',
    );
    expect(overlay, 'z-40 — слой шапки оригинала (header.css:6)').toContain('z-index: 40;');
  });

  it('ступень 767 — в каркасе mobile-first: меню-право скрыто в базе, включается от md (канон header.css:131)', () => {
    const right = blockOf('.hsp__menu--right');
    expect(right, '.hsp__menu--right найдено').toBeTruthy();
    expect(right, 'мобильная база — скрыто (≤767 канона)').toContain('display: none;');
    const idx = code.indexOf('.hsp__menu--right');
    const md = code
      .slice(idx)
      .match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.hsp__menu--right\s*\{([^}]*)\}/);
    expect(md, 'ступень md для меню-право найдена').toBeTruthy();
    expect(md[1], 'от 768 — flex (тот же рендер, что max-width: 767 оригинала)').toContain(
      'display: flex;',
    );
  });

  it('значения канона 1:1 — каркас подвала ftp (T17.13): сетка auto 2fr 2fr 1fr от 1024, база 2 колонки, паддинги 48', () => {
    const inner = blockOf('.ftp__inner');
    expect(inner, '.ftp__inner найдено').toBeTruthy();
    expect(inner, 'база — 2 колонки (ступень ≤1023 пилота, mobile-first)').toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    );
    expect(inner, 'зазор 40px «как есть» — footer.css:10').toContain('gap: 2.5rem;');
    expect(inner, 'выравнивание по центру строки — footer.css:8').toContain('align-items: center;');
    expect(inner, 'паддинги 48 — --ui-space-7 (footer.css:3)').toContain(
      'padding-top: var(--ui-space-7);',
    );
    const idx = code.indexOf('.ftp__inner');
    const lg = code
      .slice(idx)
      .match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.ftp__inner\s*\{([^}]*)\}/);
    expect(lg, 'ступень lg для подвала найдена').toBeTruthy();
    expect(lg[1], 'десктоп — auto 2fr 2fr 1fr (.cp-footer__inner pilot.css:605)').toContain(
      'grid-template-columns: auto 2fr 2fr 1fr;',
    );
  });

  it('значения канона 1:1 — колонка ссылок (шаг 9px, 14/1.35) и ступень 767: nowrap — от md (канон footer.css:150)', () => {
    const links = blockOf('.ftp__links');
    expect(links, '.ftp__links найдено').toBeTruthy();
    expect(links, 'шаг строк 9px «как есть» — footer.css:26').toContain('gap: 0.5625rem;');
    expect(links, 'строки 14/1.35 — fs-small/lh-small (footer.css:29-32)').toContain(
      'font-size: var(--ui-fs-small);',
    );
    expect(links).toContain('line-height: var(--ui-lh-small);');
    // База (mobile-first) — перенос; nowrap включается от md: тот же рендер,
    // что «nowrap в базе + снятие @media (max-width: 767px)» пилота.
    const base = blockOf('.ftp__links .ui-link');
    expect(base, 'база ссылки — без nowrap').not.toContain('white-space');
    const idx = code.indexOf('.ftp__links .ui-link');
    const md = code
      .slice(idx)
      .match(
        /@media \(min-width: 768px\)\s*\{[\s\S]*?\.ftp__links \.ui-link,\s*\.ftp__right \.ui-small\s*\{([^}]*)\}/,
      );
    expect(md, 'ступень md nowrap-снятия найдена (ссылки + копирайт)').toBeTruthy();
    expect(md[1]).toContain('white-space: nowrap;');
  });

  it('значения канона 1:1 — контакты (шаг 28/4, 14/500/1.35) и правая колонка (24, space-between)', () => {
    const contacts = blockOf('.ftp__contacts');
    expect(contacts, 'шаг блоков 28px «как есть» — footer.css:48').toContain('gap: 1.75rem;');
    const contact = blockOf('.ftp__contact');
    expect(contact, 'шаг label/значение 4px — --ui-space-1 (footer.css:54)').toContain(
      'gap: var(--ui-space-1);',
    );
    expect(contact, 'строки 14/500/1.35 — footer.css:62-74').toContain(
      'font-size: var(--ui-fs-small);',
    );
    expect(contact).toContain('font-weight: var(--ui-fw-small);');
    expect(contact).toContain('line-height: var(--ui-lh-small);');
    const right = blockOf('.ftp__right');
    expect(right, 'шаг 24 — --ui-space-5 (footer.css:85)').toContain('gap: var(--ui-space-5);');
    expect(right, 'соцсети сверху, копирайт снизу — footer.css:79-86').toContain(
      'justify-content: space-between;',
    );
    const group = blockOf('.ftp__contact-group');
    expect(group, 'зазор группы 40px «как есть» — footer.css:59').toContain('gap: 2.5rem;');
  });

  it('соц-кнопки подвала — ui-button--round на токен-хуках: 36px blue-50 r12, hover primary (остаток §8.3, footer.css:93-108)', () => {
    const social = blockOf('.ftp__social');
    expect(social, '.ftp__social найдено').toBeTruthy();
    expect(social, 'пара покоя — на хуке bg модификатора (blue-50 = surface-muted)').toContain(
      '--ui-button-bg: var(--ui-color-surface-muted);',
    );
    expect(social, 'пара покоя — на хуке цвета (text оригинала, footer.css:101)').toContain(
      '--ui-button-color: var(--ui-color-text);',
    );
    expect(social, '36px «как есть» — footer.css:97-98 (вне шкалы)').toContain('width: 2.25rem;');
    expect(social).toContain('height: 2.25rem;');
    expect(social, 'r12 «как есть» — footer.css:100 (не круг --round)').toContain(
      'border-radius: 0.75rem;',
    );
    const idx = code.indexOf('.ftp__social');
    const hover = code
      .slice(idx)
      .match(/@media \(hover: hover\)\s*\{[\s\S]*?\.ftp__social:hover\s*\{([^}]*)\}/);
    expect(hover, 'hover-пара на хуках — под (hover: hover)').toBeTruthy();
    expect(hover[1], 'hover bg primary — footer.css:106').toContain(
      '--ui-button-bg: var(--ui-color-primary);',
    );
    expect(hover[1], 'hover подпись on-dark — footer.css:107').toContain(
      '--ui-button-color: var(--ui-color-text-on-dark);',
    );
    // hover/active-пару модификатор закрепляет сам (T17.9) — слой меняет
    // только значения хуков, защищённые правила --round переразрешают пару.
    expect(social, 'пару несёт хук, не свойство').not.toMatch(/(^|\n)\s*(background-)?color:/);
  });
});

describe('синхронность док-HTML паттернов и слоя (AC: одни классы)', () => {
  for (const [docPath, prefix] of PATTERN_SOURCE_ENTRIES) {
    describe(docPath, () => {
      const html = readFileSync(join(root, docPath), 'utf8');
      const markup = markupClasses(html, prefix);
      const hooks = layerHooks(prefix);

      it('перенос исполнен: связки живут в слое, <style> в док-HTML больше нет', () => {
        expect(
          html.replace(/<!--[\s\S]*?-->/g, ''),
          '<style> перенесён в patterns/patterns.css (упоминания в комментариях — история переноса)',
        ).not.toContain('<style>');
      });

      it('крючки слоя существуют в разметке дока (слой не изобретает имён)', () => {
        expect(hooks.size, `${prefix}-крючки в слое есть`).toBeGreaterThan(0);
        for (const hook of hooks) {
          expect(
            markup.has(hook) || LAYER_HOOKS_WITHOUT_DOC_MARKUP.has(hook),
            `${prefix}-крючок «${hook}» из слоя отсутствует в разметке ${docPath}`,
          ).toBe(true);
        }
      });

      it('классы разметки покрыты слоем (новый класс без правила падает тестом)', () => {
        expect(markup.size, `${prefix}-классы в разметке есть`).toBeGreaterThan(0);
        for (const name of markup) {
          expect(
            hooks.has(name) || MARKERS_WITHOUT_RULES.has(name),
            `класс «${name}» разметки ${docPath} не имеет правила в слое (добавь правило или MARKERS_WITHOUT_RULES)`,
          ).toBe(true);
        }
      });
    });
  }

  it('грид-ветка канона получает крючок класса: lpp-grid в разметке list-page (адаптация #lpp-grid → класс)', () => {
    const html = readFileSync(join(root, 'patterns/list-page/list-page.html'), 'utf8');
    expect(html, 'крючок грид-ветки — класс (ID в CSS запрещён §1)').toMatch(
      /class="ui-grid ui-grid--3 lpp-grid"/,
    );
  });
});

describe('сборка showcase/build.mjs: dist/ui-patterns.css (AC: собирается, подключение опционально)', () => {
  const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');

  it('исходник слоя в явном порядке каскада и бандлится с баннером', () => {
    expect(build, 'исходник слоя — patterns/patterns.css').toContain("'patterns/patterns.css'");
    expect(build, 'dist-файл слоя — ui-patterns.css').toContain("'ui-patterns.css'");
    expect(build, 'минификация+баннер — общий bundle()/emitRuntime').toContain('emitRuntime');
  });

  it('гейт префиксов — проверка в сборке (Implementation requirements п.2)', () => {
    expect(build, 'self-check селекторов слоя в сборке').toContain('слоя');
  });

  it('подключение опционально: слой получают стенды паттернов с связками в слое (list/detail/form, landing-section, timeline — T17.10, header/footer — T17.13)', () => {
    for (const stand of [
      'list-page',
      'detail-page',
      'form-page',
      'landing-section',
      'timeline',
      'header',
      'footer',
    ]) {
      // Якорь — title стенда: первое вхождение имени паттерна в build.mjs —
      // список навигации buildNav, до frame-вызова.
      const block = build.slice(build.indexOf(`title: 'patterns/${stand} — irao-ui showcase'`));
      expect(block.slice(0, 800), `patterns/${stand}: слой подключён стенду`).toContain(
        'withPatterns: true',
      );
    }
    // Включение адресное: ровно семь вызовов frame() передают слой
    // («withPatterns: true,»); остальные страницы полигона — нет.
    // Четвёртый — patterns/landing-section (T17.9): связки lnk-card/lgo-grid
    // живут в слое, мини-стенд паттерна их рендерит; пятый — patterns/
    // timeline (T17.10): связки tlp-* переехали из <style> дока в слой;
    // шестой/седьмой — patterns/header и patterns/footer (T17.13): связки
    // hsp-*/ftp-* — в слое (один источник правды).
    expect(
      build.match(/withPatterns: true,/g)?.length,
      'получателей слоя ровно семь — стенды паттернов с связками в слое',
    ).toBe(7);
  });

  it('self-check: dist/ui-patterns.css существует и несёт баннер версии', () => {
    expect(build, 'файл слоя в списке self-check структуры §6.1').toContain("'ui-patterns.css'");
    expect(build, 'баннер слоя проверяется как у ui-core').toContain('баннер версии не в начале');
  });
});

describe('пилот career-portal: слой подключён, вакансии на lpp-* (AC T17.1)', () => {
  const pilotDir = join(root, 'pilot', 'career-portal');
  const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const pilotCss = readFileSync(join(pilotDir, 'pilot.css'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const probe = readFileSync(join(pilotDir, 'probe-vac-rows.mjs'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('слой копируется в dist/ds/ и подключается в порядке токены → core → patterns → сайт', () => {
    expect(build, 'рантайм ДС копирует ui-patterns.css').toContain("'ui-patterns.css'");
    // Якоря — link-теги head (упоминания в комментариях раньше шаблона страницы).
    const coreIdx = build.indexOf('<link rel="stylesheet" href="ds/ui-core.min.css">');
    const patternsIdx = build.indexOf('<link rel="stylesheet" href="ds/ui-patterns.css">');
    const siteIdx = build.indexOf('<link rel="stylesheet" href="pilot.css">');
    expect(coreIdx, 'core в head').toBeGreaterThan(-1);
    expect(patternsIdx, 'слой в head после core (и после vi)').toBeGreaterThan(coreIdx);
    expect(siteIdx, 'сайт-зона после слоя').toBeGreaterThan(patternsIdx);
  });

  it('строки вакансий — разметка lpp-row (канон list-page 1:1, мета — muted ролью)', () => {
    expect(build).toContain('<article class="ui-card ui-card--hover lpp-row"');
    expect(build).toContain('<div class="lpp-row__main">');
    expect(build).toContain('<h2 class="ui-h6 lpp-row__title">');
    expect(build).toContain('class="lpp-row__place ui-small ui-text--muted"');
    expect(build).toContain('<p class="lpp-row__short ui-small ui-text--muted">');
    expect(build).toContain('class="lpp-row__date ui-small ui-text--muted"');
    expect(build).toContain('<div class="lpp-rows">');
    expect(build, 'cp-vac-row* из разметки сняты').not.toContain('cp-vac-row');
  });

  it('сайдбар вакансий — разметка lpp-layout/lpp-side/lpp-side__group (280px по канону)', () => {
    expect(build).toContain('<div class="lpp-layout">');
    expect(build).toContain('<aside class="lpp-side"');
    expect(build).toContain('<div class="lpp-side__group">');
    expect(build, 'подписи групп — канон lpp-pill__name').toContain('lpp-pill__name');
    expect(build, 'cp-vac-layout/cp-vac-side из разметки сняты').not.toMatch(
      /cp-vac-layout|cp-vac-side(?!__promo)/,
    );
  });

  it('крошки — канон lpp-breadcrumbs по всем страницам (helper breadcrumbs)', () => {
    expect(build).toContain('class="ui-breadcrumbs lpp-breadcrumbs"');
    expect(build).not.toContain('cp-breadcrumbs');
  });

  it('pilot.css: дубликаты сняты, шимы переадресованы на крючки слоя', () => {
    for (const gone of [
      '.cp-breadcrumbs',
      '.cp-vac-rows',
      '.cp-vac-row',
      '.cp-vac-layout',
      '.cp-vac-side__group',
      '.cp-vac-side__label',
    ]) {
      expect(pilotCss, `дубликат ${gone} удалён`).not.toContain(gone);
    }
    expect(pilotCss, 'шим «Сбросить» — на крючке слоя').toContain('.lpp-side > .ui-button--text');
    expect(
      pilotCss,
      'шим пилюли сайдбара снят (T17.12: модификатор ui-select--pill не несёт flex-basis)',
    ).not.toContain('.lpp-side__group .cp-pill');
    expect(pilotCss, 'cp-vac-main остаётся (нет в списке снятия — ритм main-колонки)').toContain(
      '.cp-vac-main',
    );
  });

  it('пробы compare переведены на lpp-*: MATCH-статусы REPORT §8.2 сохраняются', () => {
    expect(compare).toContain("pilot: '.lpp-row .ui-h6'");
    expect(compare).toContain("pilot: '.lpp-row'");
    expect(compare).toContain("pilot: '.lpp-row .ui-button__icon'");
    expect(compare, 'reset-control — на крючке слоя').toContain("pilot: '.lpp-side .ui-button'");
    expect(compare, 'side-promo — hook пробы сохранён').toContain("pilot: '.cp-vac-side__promo'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo .ui-button--primary'");
    expect(probe).toContain("const ROW_SELECTOR = { original: '.vac-row', pilot: '.lpp-row' };");
  });

  it('поднавигация — канон nvp (T17.11): cp-subnav снят из разметки и pilot.css, пробы compare на крючке слоя', () => {
    expect(build, 'subnav() на каноне: nav = ui-tabs--pill + nvp').toContain(
      'class="ui-tabs ui-tabs--pill nvp"',
    );
    expect(build, 'сайт-зонный класс снят из разметки').not.toContain('cp-subnav');
    expect(pilotCss, 'пара 0,4,0 удалена из pilot.css (REPORT §9.1 №8)').not.toContain('cp-subnav');
    expect(compare, 'проба трека — на крючке слоя').toContain("pilot: '.nvp .ui-tabs__list'");
    expect(compare, 'проба таба — на крючке слоя').toContain("pilot: '.nvp .ui-tabs__tab'");
    expect(compare, 'проба активного таба — на крючке слоя').toContain(
      'pilot: ".nvp .ui-tabs__tab[aria-current=\'page\']"',
    );
  });

  it('cp-page-head не снимается (канона в док-HTML нет — T17.14); find-bar снят на канон lpp-find (T17.12)', () => {
    expect(pilotCss, 'page-head — ритм страниц, полное снятие в adoption').toContain(
      '.cp-page-head',
    );
    expect(pilotCss, 'find-bar переведён на канон слоя (T17.12)').not.toContain('.cp-find-bar');
    expect(
      build,
      'cp-find-bar из разметки снят — findBar на lpp-find (проза комментариев — история)',
    ).not.toMatch(/class="[^"]*\bcp-find-bar\b/);
    expect(build, 'findBar несёт канон слоя').toContain('class="lpp-find"');
  });

  it('шапка/подвал — каркасы hsp/ftp (T17.13): разметка на классах слоя, cp-дубликаты сняты', () => {
    expect(build, 'шапка — блок hsp').toContain('<header class="hsp');
    expect(
      build,
      'overlay-режим главной — модификатор канона (собирается в headerHtml: mode)',
    ).toContain("' hsp--overlay'");
    expect(build).toContain('class="ui-container hsp__inner"');
    expect(build).toContain('class="hsp__menu hsp__menu--left"');
    expect(build).toContain('class="hsp__menu hsp__menu--right"');
    expect(build, 'слот логотипа').toContain('class="hsp__logo"');
    expect(build, 'слот действия (VI) — канон спеки T17.13 п.3').toContain('class="hsp__action"');
    expect(build, 'cp-header из разметки снят').not.toMatch(/class="[^"]*\bcp-header/);
    expect(build, 'подвал — блок ftp').toContain('<footer class="ftp"');
    expect(build).toContain('class="ui-container ftp__inner"');
    expect(build).toContain('class="ftp__links"');
    expect(build).toContain('class="ftp__contacts"');
    expect(build).toContain('class="ftp__right"');
    expect(build).toContain('class="ftp__socials"');
    expect(
      build,
      'соц-кнопки — вид на модификаторе ui-button--round (T17.9), пара — хуками слоя',
    ).toContain('ui-button ui-button--round ftp__social');
    expect(build, 'cp-footer из разметки снят').not.toMatch(/class="[^"]*\bcp-footer/);
  });

  it('pilot.css: каркасы сняты (~150 строк), бренд-строки сайт-зоны остались (Implementation requirements п.1 T17.13)', () => {
    for (const gone of [
      '.cp-header',
      '.cp-header__inner',
      '.cp-header__menu',
      '.cp-header__logo',
      '.cp-footer__inner',
      '.cp-footer__links',
      '.cp-footer__contact',
      '.cp-footer__right',
      '.cp-footer__socials',
      '.cp-footer__social',
    ]) {
      expect(pilotCss, `каркас ${gone} перенесён в слой`).not.toContain(gone);
    }
    expect(pilotCss, 'цвет ссылок футера — сайт-зона (п.1)').toContain('.ftp .ui-link');
    expect(pilotCss, 'hover-accent футера — сайт-зона (п.1)').toContain('.ftp .ui-link:hover');
    expect(pilotCss, 'VI-пилюля — бренд-строка на слоте слоя (п.2)').toContain('.hsp__action');
    expect(pilotCss, 'логотип-размеры — сайт-зона').toContain('.hsp__logo img');
  });

  it('compare: shell-пробы шапки/подвала — на крючках слоя (прецедент lpp-/nvp-)', () => {
    expect(compare, 'проба пункта меню — на крючке слоя').toContain(
      "pilot: '.hsp__menu--left .ui-link--nav'",
    );
    expect(compare, 'проба ссылки футера — на крючке слоя').toContain(
      "pilot: '.ftp__links .ui-link'",
    );
    expect(compare, 'проба футера (bg/высота) — на крючке слоя').toContain("pilot: '.ftp'");
    expect(compare, 'блок футера (высоты) — на крючке слоя').toContain(
      "['footer', '.footer', '.ftp']",
    );
  });
});

describe('пилот career-portal: детальные страницы на dpp-каноне (T17.14; AC: 5 страниц, cp-* сняты)', () => {
  const pilotDir = join(root, 'pilot', 'career-portal');
  const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const pilotCss = readFileSync(join(pilotDir, 'pilot.css'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

  /** Кусок build.mjs одной main-функции (рабочая копия Windows — CRLF нормализован). */
  const mainOf = (name) => build.match(new RegExp(`function ${name}[\\s\\S]*?\\n\\}`))?.[0] ?? '';

  it('вакансия (vacancy.html): карточка-колонка dpp dpp--card, шапка-тройка, salary/place — на каноне; cp-vacancy-page* сняты', () => {
    const main = mainOf('vacancyMain');
    expect(main, 'карточка-контейнер — модификатор канона (порт cp-vacancy-page)').toContain(
      '<article class="dpp dpp--card">',
    );
    expect(main, 'шапка-тройка').toContain('<header class="dpp__head">');
    expect(
      main,
      'зарплата — литерал канона + роль muted (цвет слой не дублирует, T16.13)',
    ).toContain('<p class="dpp__salary ui-text--muted">');
    expect(main, 'place — канон + роль muted').toContain('<p class="dpp__place ui-text--muted">');
    expect(main, 'секции контента').toContain('<div class="dpp__section">');
    expect(main, 'карта — слот ddp__media (спека: содержимое — сайт)').toContain(
      '<div class="dpp__media" role="img"',
    );
    expect(main, 'foot — разделитель + space-between').toContain('<footer class="dpp__foot">');
    expect(main, 'дата — канон + роль muted').toContain(
      '<time class="dpp__date ui-small ui-text--muted"',
    );
    expect(build, 'cp-vacancy-page* из разметки сняты').not.toContain('cp-vacancy-page');
  });

  it('событие/стажировка (internshipDetail): main-колонка dpp, шапка-тройка, теги, фото, секции; cp-detail-* сняты', () => {
    const main = mainOf('internshipDetail');
    expect(main, 'контентная колонка — канон dpp (gap 32)').toContain('<div class="dpp">');
    expect(main, 'шапка-тройка').toContain('<header class="dpp__head">');
    expect(main, 'лента тегов').toContain('<p class="dpp__tags">');
    expect(main, 'фото 420/260 — канон').toContain(
      '<img class="ui-image ui-image--cover dpp__photo"',
    );
    expect(main, 'секции контента').toContain('<div class="dpp__section">');
    expect(build, 'cp-detail-* из разметки сняты').not.toMatch(/cp-detail-(main|head|tags|photo|section)/);
  });

  it('статья (article.html): колонка dpp--article, мета-лента, тип с точкой, галерея, текст, related; cp-article-* сняты', () => {
    const main = mainOf('articleMain');
    expect(main, 'колонка статьи — модификатор канона (gap 24)').toContain(
      '<article class="dpp dpp--article">',
    );
    expect(main, 'мета-лента 12').toContain('<p class="dpp__meta">');
    expect(main, 'тип с точкой').toContain('<span class="dpp__type">');
    expect(main, 'галерея 2fr/1fr').toContain('<div class="dpp__gallery">');
    expect(main, 'текст статьи').toContain('<div class="dpp__text">');
    expect(main, 'related — заголовки/шаги канона').toContain('<div class="dpp-related">');
    expect(build, 'cp-article-page/meta/type/gallery/text/related из разметки сняты').not.toMatch(
      /cp-article-(page|meta|type|gallery|text|related)/,
    );
  });

  it('компания (company.html): hero-2кол и where-пары на каноне; статы/преимущества/заголовки/баннер — сайт-зона (ui-stat/фото-секция — свои задачи)', () => {
    const main = mainOf('companyMain');
    expect(main, 'hero-2кол (400px/1fr, ступени)').toContain('<div class="dpp-hero">');
    expect(main, 'фото hero').toContain(
      '<img class="ui-image ui-image--cover dpp-hero__photo"',
    );
    expect(main, 'тело hero').toContain('<div class="dpp-hero__body">');
    expect(main, 'текст hero').toContain('<div class="dpp-hero__text">');
    expect(main, 'where-пары').toContain('<div class="dpp-where">');
    expect(main, 'фото where').toContain(
      '<img class="ui-image ui-image--cover dpp-where__photo"',
    );
    expect(build, 'cp-company-hero/where из разметки сняты').not.toMatch(
      /cp-company-(hero|where)/,
    );
    expect(main, 'статы — сайт-зона (ui-stat--filled, T17.4)').toContain(
      '<ul class="cp-company-stats">',
    );
    expect(main, 'преимущества — сайт-зона (ui-stat--deep)').toContain(
      '<ul class="cp-company-adv">',
    );
    expect(main, 'баннер — сайт-зона (фото-секция + CTA, T17.3/17.8)').toContain(
      'ui-section--photo cp-company-banner',
    );
  });

  it('pilot.css: связки детальных страниц сняты (~330 строк), сайт-зонные раскладки компании остались', () => {
    for (const gone of [
      '.cp-vacancy-page',
      '.cp-vacancy-page__head',
      '.cp-vacancy-page__salary',
      '.cp-vacancy-page__place',
      '.cp-vacancy-page__section',
      '.cp-vacancy-page__map',
      '.cp-vacancy-page__foot',
      '.cp-vacancy-page__date',
      '.cp-detail-main',
      '.cp-detail-head',
      '.cp-detail-tags',
      '.cp-detail-photo',
      '.cp-detail-section',
      '.cp-article-page',
      '.cp-article-meta',
      '.cp-article-type',
      '.cp-article-gallery',
      '.cp-article-text',
      '.cp-article-related',
      '.cp-company-hero',
      '.cp-company-hero__photo',
      '.cp-company-hero__body',
      '.cp-company-hero__text',
      '.cp-company-where',
      '.cp-company-where__photo',
    ]) {
      expect(pilotCss, `связка ${gone} перенесена в слой`).not.toContain(gone);
    }
    // Ступени 1023/767 cp-специфики детальных страниц сняты вместе с
    // правилами (лестницы канона — mobile-first 768/1024/1280).
    for (const gone of ['.cp-article-gallery', '.cp-detail-photo']) {
      expect(pilotCss, `ступень 1023 ${gone} снята`).not.toContain(gone);
    }
    // Сайт-зона (раскладки сеток на ui-stat + баннер) — остаётся.
    for (const kept of ['.cp-company-stats', '.cp-company-adv', '.cp-company-banner']) {
      expect(pilotCss, `сайт-зона ${kept} остаётся (ui-stat/фото-секция)`).toContain(kept);
    }
  });

  it('compare: probe-пары salary/section-h2 — на крючках канона (прецедент lpp-/nvp-)', () => {
    expect(compare, 'проба salary — на крючке слоя').toContain("pilot: '.dpp__salary'");
    expect(compare, 'проба section-h2 — на крючке слоя').toContain("pilot: '.dpp__section h2'");
    expect(compare).not.toContain("pilot: '.cp-vacancy-page__salary'");
    expect(compare).not.toContain("pilot: '.cp-vacancy-page__section h2'");
  });

  it('cp-page-head остаётся (страницы списков — вне Scope T17.14; пин T17.1)', () => {
    expect(pilotCss).toContain('.cp-page-head');
  });
});

describe('гейт селекторов слоя — patternLayerProblems (функционально; ревью T17.1: матч всех правил, не первого)', () => {
  /** Ревью T17.1 high: гейт в selfChecks матчил /([^{}]+)\{/ БЕЗ /g —
   *  проверялось только первое правило, чужой префикс в любом другом
   *  проходил сборку. Гейт вынесен в showcase/patterns-layer-gate.mjs
   *  (matchAll по всем правилам) — здесь он тестируется КАК КОД: реальные
   *  и отравленные входы, а не пины текста build.mjs. */

  it('реальный patterns.css чист: ВСЕ правила проходят гейт (0 проблем)', () => {
    expect(patternLayerProblems(layer), 'все правила слоя каноничны').toEqual([]);
  });

  it('чужой префикс в ЛЮБОМ правиле ловится — не только в первом', () => {
    // Первое правило каноническое (пройдено бы и старым гейтом), чужое — в
    // середине и в конце: старый код (match без /g) вернул бы 0 проблем.
    const poisoned = [
      '/* комментарий с .cp-обманом внутри — не селектор */',
      '.lpp-row { display: flex; }',
      '',
      '.cp-evil .ui-button { overflow-wrap: anywhere; }',
      '',
      '.lpp-rows { display: flex; flex-direction: column; }',
      '.tl-evil { gap: var(--ui-space-2); }',
    ].join('\n');
    const problems = patternLayerProblems(poisoned);
    // Чужой селектор даёт ДВЕ диагностики: «нет канонического крючка» +
    // «чужой крючок» (по одной на каждый нарушенный инвариант).
    expect(problems.length, 'по две диагностики на каждый чужой селектор').toBe(4);
    expect(problems.join('; '), 'первый чужой крючок пойман').toContain('.cp-evil');
    expect(problems.join('; '), 'последний чужой крючок пойман').toContain('.tl-evil');
  });

  it('ID-селектор ловится в любом правиле (02-architecture §1)', () => {
    const problems = patternLayerProblems(
      '.lpp-row { display: flex; }\n\n#lpp-grid .ui-button { overflow-wrap: anywhere; }',
    );
    // Две диагностики: нет канонического КЛАССА-крючка + сам ID-селектор.
    expect(problems.length, 'ID даёт «нет крючка» и «ID-селектор»').toBe(2);
    expect(problems.join('; ')).toContain('ID');
  });

  it('правила ВНУТРИ @media проверяются, прелюдия селектором не считается', () => {
    const css = [
      '@media (min-width: 768px) {',
      '  .cp-inside-media { position: sticky; }',
      '}',
    ].join('\n');
    const problems = patternLayerProblems(css);
    // Чужой селектор — две диагностики («нет крючка слоя» + «чужой крючок»);
    // прелюдия @media в селекторы не попадает (иначе матч был бы один и
    // мусорный, а .cp-inside-media не проверился бы вовсе).
    expect(problems.length, 'правило из media поймано, прелюдия — не селектор').toBe(2);
    expect(problems.join('; ')).toContain('.cp-inside-media');
    expect(problems.join('; ')).not.toContain('@media');
  });

  it('потомки ui-* разрешены, пустой слой — проблема', () => {
    expect(
      patternLayerProblems(
        '.lpp-rows .ui-button, .lpp-grid .ui-button { overflow-wrap: anywhere; }',
      ),
      'ui-потомок под крючком слоя каноничен',
    ).toEqual([]);
    expect(patternLayerProblems('/* только комментарии */').length, 'пустой слой — проблема').toBe(
      1,
    );
  });
});
