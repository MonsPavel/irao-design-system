/**
 * Юнит-пины T17.18 — постерная иллюстрированная карточка (связка pstr-;
 * спека docs/ui-system/epics/EPIC-17-ds-full-coverage/T17.18-poster-card.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): связка
 *    pstr — каркас карточки (.pstr-card: колонка, min-height 600px 1:1
 *    оригинала в mobile-first инверсии, паддинг 20px «как есть», радиус
 *    карточки, клип иллюстрации), модификаторы тонов --peach/--navy/--light
 *    (peach — через хук --pstr-bg с color-mix от токенов, гейт слоя без hex;
 *    navy/light — семантические токены) и элементы __body/__title/__text/
 *    __illu (позиции по тонам «как есть»)/__action (круглая кнопка 3.25rem,
 *    пара на хуках --pstr-action-bg/--pstr-action-color, hover scale 1.08);
 *  - гейт префиксов слоя расширен pstr (механизм T17.9: patterns-layer-gate
 *    .mjs + пины patterns-layer.test.js);
 *  - док-паттерн poster-card — источник правды: разметка
 *    patterns/poster-card/poster-card.html несёт те же классы (пин
 *    синхронности, прецеденты T17.9/T17.15);
 *  - BEM-форма крючков: ^pstr(__[a-z-]+)?(--[a-z-]+)?$ (AC4);
 *  - пилот: studentCards build.mjs — разметка pstr-, тон-строки lnk-card
 *    студентского блока сняты из pilot.css (правила слоя; lnk-канон в слое
 *    остаётся — потребитель «Может быть интересно»), ценз: пороги census
 *    не двигаются, семейство pstr- в pilot.css не появляется (правила в
 *    слое — гейт «новых cp-визуальных блоков 0»).
 *
 * Поверхность браузера (computed-геометрия, axe, эталоны 375/768/1440,
 * скрин-пары против оригинала) — e2e pattern-poster-card.spec.js и
 * compare-прогон; здесь — пины исходников.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_PILOT_CSS_CODE_LINES,
  MAX_PILOT_CSS_LINES,
  MAX_PILOT_JS_LINES,
  censusMetrics,
  runCensusGate,
} from '../../pilot/career-portal/census.mjs';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (первая @media файла — ветка lpp-layout, не T17.18). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);

const docPath = join(root, 'patterns', 'poster-card', 'poster-card.html');
let docHtml = '';
try {
  docHtml = readFileSync(docPath, 'utf8').replace(/\r\n/g, '\n');
} catch {
  // Красный шаг TDD: дока ещё нет — пин синхронности упадёт с понятным сообщением.
  docHtml = '';
}

const pilotDir = join(root, 'pilot', 'career-portal');
const pilotBuild = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8');
const pilotJs = readFileSync(join(pilotDir, 'pilot.js'), 'utf8');

/** Классы-крючки pstr в разметке дока (class="…", комментарии вне). */
const docHooks = () => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^pstr(?:-|__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки pstr в правилах слоя (включая media-ступени). */
const layerHookSet = () => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.pstr(?:-|__|$)/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

/** Крючки pstr в селекторах слоя — для BEM-формы (AC4). */
const layerPstrSelectors = () =>
  (layer.match(/[^{}]+(?=\{)/g) ?? []).filter((selector) =>
    /(^|[^a-z-])\.pstr(?:-|__|$)/.test(selector),
  );

/** Класс разметки связки без собственных правил (вид несёт роли/хуки;
 *  таксономия имён канона, список осознанный). */
const MARKERS_WITHOUT_RULES = new Set([
  'pstr-card__title', // типографику несёт роль ui-h3 разметки; цвет — правило связки
  'pstr-card__text', // типографику несёт роль ui-body разметки; цвет — правило связки
]);

describe('patterns/patterns.css — каркас постерной карточки (связка pstr, T17.18 Scope)', () => {
  it('блок: колонка с клипом иллюстрации, паддинг 20px «как есть», радиус карточки, тон — хук --pstr-bg', () => {
    const card = blockOf(layer, '.pstr-card');
    expect(card, '.pstr-card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'flex-колонка (students.css:85-87)').toContain('display: flex;');
    expect(card, 'relative — абсолюты __illu/__action от карточки').toContain(
      'position: relative;',
    );
    expect(card, 'flex-колонка (students.css:86)').toContain('flex-direction: column;');
    expect(card, 'клип иллюстрации (students.css:92)').toContain('overflow: hidden;');
    expect(card, 'паддинг 20px оригинала (students.css:89) — «как есть», вне шкалы §3.2').toContain(
      'padding: 1.25rem;',
    );
    expect(card, 'радиус --radius-card 16px оригинала = md').toContain(
      'border-radius: var(--ui-radius-md);',
    );
    expect(
      card,
      'заливка — хук --pstr-bg (peach вне токенов; T17.15-прецедент --hro-tag-bg)',
    ).toContain('background-color: var(--pstr-bg, var(--ui-color-surface));');
  });

  it('min-height 600px оригинала — mobile-first инверсия лестницы 600/440/380 (Implementation requirements T17.1 п.4)', () => {
    const card = blockOf(layer, '.pstr-card');
    expect(card, 'база ≤767 — 380px оригинала (students.css:187)').toContain(
      'min-height: 23.75rem;',
    );
    const md = mediaBlockOf(layer, '768', 'pstr-card');
    expect(md, 'ступень md — 440px оригинала (students.css:183)').toBeTruthy();
    expect(md).toContain('min-height: 27.5rem;');
    const lg = mediaBlockOf(layer, '1024', 'pstr-card');
    expect(lg, 'ступень lg — 600px оригинала (students.css:88)').toBeTruthy();
    expect(lg).toContain('min-height: 37.5rem;');
  });

  it('тело: relative z1, flex-колонка, шаг 12px (--ui-space-3; students.css:98-103)', () => {
    const body = blockOf(layer, '.pstr-card__body');
    expect(body, '.pstr-card__body найдено').toBeTruthy();
    expect(body).toContain('position: relative;');
    expect(body).toContain('z-index: 1;');
    expect(body).toContain('display: flex;');
    expect(body).toContain('flex-direction: column;');
    expect(body).toContain('gap: var(--ui-space-3);');
  });

  it('заголовок/текст — цвет текста карточки (students.css:105-121); типографика — роли разметки', () => {
    const title = blockOf(layer, '.pstr-card__title');
    expect(title, '.pstr-card__title найдено').toBeTruthy();
    expect(title, 'цвет text оригинала (heading-роль — primary, исходник — text)').toContain(
      'color: var(--ui-color-text);',
    );
    const text = blockOf(layer, '.pstr-card__text');
    expect(text, '.pstr-card__text найдено').toBeTruthy();
    expect(text).toContain('color: var(--ui-color-text);');
    expect(text, 'fs-body/lh-body — роль ui-body, слой не дублирует').not.toContain('font-size');
  });

  it('тон navy: заливка primary-deep, текст on-dark (students.css:96, 114/122)', () => {
    const navy = blockOf(layer, '.pstr-card--navy');
    expect(navy, '.pstr-card--navy найдено').toBeTruthy();
    expect(navy, '--color-primary-deep оригинала → семантический токен').toContain(
      '--pstr-bg: var(--ui-color-primary-deep);',
    );
    const onDark = blockOf(layer, '.pstr-card--navy .pstr-card__title');
    expect(onDark, 'на navy заголовок on-dark (students.css:114)').toBeTruthy();
    expect(onDark).toContain('color: var(--ui-color-text-on-dark);');
    const onDarkText = blockOf(layer, '.pstr-card--navy .pstr-card__text');
    expect(onDarkText, 'на navy текст on-dark (students.css:122)').toBeTruthy();
    expect(onDarkText).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('тон light: заливка surface-muted (surface-blue-50 оригинала; students.css:97)', () => {
    const light = blockOf(layer, '.pstr-card--light');
    expect(light, '.pstr-card--light найдено').toBeTruthy();
    expect(light).toContain('--pstr-bg: var(--ui-color-surface-muted);');
  });

  it('тон peach: вне токенов — хук --pstr-bg с color-mix от токенов (гейт слоя без hex; AC1)', () => {
    const peach = blockOf(layer, '.pstr-card--peach');
    expect(peach, '.pstr-card--peach найдено').toBeTruthy();
    expect(peach, 'тон — через хук --pstr-bg').toMatch(/--pstr-bg:\s*color-mix\(/);
    expect(peach, 'color-mix от токенов, без hex (инвариант слоя)').toMatch(
      /color-mix\(in srgb,\s*var\(--ui-color-[a-z-]+\)\s+\d+%,\s*var\(--ui-color-[a-z-]+\)\)/,
    );
  });

  it('иллюстрация: absolute, pointer-events none, height auto (students.css:124-129)', () => {
    const illu = blockOf(layer, '.pstr-card__illu');
    expect(illu, '.pstr-card__illu найдено').toBeTruthy();
    expect(illu).toContain('position: absolute;');
    expect(illu).toContain('pointer-events: none;');
    expect(illu).toContain('height: auto;');
  });

  it('позиции иллюстраций по тонам — «как есть» (students.css:131-148)', () => {
    const peach = blockOf(layer, '.pstr-card--peach .pstr-card__illu');
    expect(peach, 'peach: left 0 / top 42% / width 67%').toBeTruthy();
    expect(peach).toContain('left: 0;');
    expect(peach).toContain('top: 42%;');
    expect(peach).toContain('width: 67%;');
    const navy = blockOf(layer, '.pstr-card--navy .pstr-card__illu');
    expect(navy, 'navy: left 6% / top 43% / width 56%').toBeTruthy();
    expect(navy).toContain('left: 6%;');
    expect(navy).toContain('top: 43%;');
    expect(navy).toContain('width: 56%;');
    const light = blockOf(layer, '.pstr-card--light .pstr-card__illu');
    expect(light, 'light: right −8% / top 45% / width 63%').toBeTruthy();
    expect(light).toContain('right: -8%;');
    expect(light).toContain('top: 45%;');
    expect(light).toContain('width: 63%;');
  });

  it('кнопка-действие: абсолют правый-низ 20px, 3.25rem (52px), круглая, пара на хуках (students.css:150-170)', () => {
    const action = blockOf(layer, '.pstr-card__action');
    expect(action, '.pstr-card__action найдено').toBeTruthy();
    expect(action).toContain('position: absolute;');
    expect(action, 'right/bottom 20px оригинала — «как есть»').toContain('right: 1.25rem;');
    expect(action).toContain('bottom: 1.25rem;');
    expect(action, 'z1 — поверх иллюстрации').toContain('z-index: 1;');
    expect(action, '52px оригинала = 3.25rem (спека Scope)').toContain('width: 3.25rem;');
    expect(action).toContain('height: 3.25rem;');
    expect(action, 'круг — канон круглой кнопки ДС (ui-button--round)').toContain(
      'border-radius: 50%;',
    );
    expect(action, 'фон — хук --pstr-action-bg, дефолт orange accent (пара peach)').toContain(
      'background-color: var(--pstr-action-bg, var(--ui-color-accent));',
    );
    expect(action, 'цвет — хук --pstr-action-color, дефолт on-dark').toContain(
      'color: var(--pstr-action-color, var(--ui-color-text-on-dark));',
    );
  });

  it('hover scale 1.08 (students.css:172) на transition --ui-transition', () => {
    const action = blockOf(layer, '.pstr-card__action');
    expect(action, 'переход transform — токен').toContain(
      'transition: transform var(--ui-transition);',
    );
    const hover = blockOf(layer, '.pstr-card__action:hover');
    expect(hover, '.pstr-card__action:hover найдено').toBeTruthy();
    expect(hover).toContain('transform: scale(1.08);');
  });

  it('пары действия по тонам (students.css:174-176): peach accent, navy surface, light primary', () => {
    const peach = blockOf(layer, '.pstr-card--peach');
    expect(peach, 'peach — кнопка accent/on-dark (btn--orange)').toContain(
      '--pstr-action-bg: var(--ui-color-accent);',
    );
    expect(peach).toContain('--pstr-action-color: var(--ui-color-text-on-dark);');
    const navy = blockOf(layer, '.pstr-card--navy');
    expect(navy, 'navy — кнопка surface/text (btn--white)').toContain(
      '--pstr-action-bg: var(--ui-color-surface);',
    );
    expect(navy).toContain('--pstr-action-color: var(--ui-color-text);');
    const light = blockOf(layer, '.pstr-card--light');
    expect(light, 'light — кнопка primary/on-dark (btn--navy)').toContain(
      '--pstr-action-bg: var(--ui-color-primary);',
    );
    expect(light).toContain('--pstr-action-color: var(--ui-color-text-on-dark);');
  });

  it('инварианты слоя: гейт селекторов чист (pstr в каноне, без чужих крючков)', () => {
    expect(patternLayerProblems(layerFile), 'гейт patternLayerProblems — 0 проблем').toEqual([]);
  });

  it('BEM-форма крючков pstr-: блок pstr-card + __элемент/--модификатор (AC4; имена блоков — из Scope спеки)', () => {
    const hooks = [...layerHookSet()];
    expect(hooks.length, 'крючки pstr в слое есть').toBeGreaterThan(0);
    for (const hook of hooks) {
      expect(hook, `крючок «${hook}» — BEM-форма спеки`).toMatch(
        /^pstr-card(__[a-z-]+)?(--[a-z-]+)?$/,
      );
    }
    for (const selector of layerPstrSelectors()) {
      for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
        if (/^\.pstr/.test(hook)) {
          expect(
            /^\.pstr-card(__[a-z-]+)?(--[a-z-]+)?$/.test(hook),
            `селектор «${selector.trim()}»: крючок «${hook}» — BEM-форма спеки`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('док-паттерн poster-card — источник правды (пин синхронности, прецеденты T17.9/T17.15)', () => {
  it('разметка дока несёт крючки слоя 1:1 (классы разметки без правила — осознанный список)', () => {
    expect(docHtml, 'patterns/poster-card/poster-card.html существует').not.toBe('');
    const doc = docHooks();
    const hooks = layerHookSet();
    for (const hook of doc) {
      expect(
        hooks.has(hook) || MARKERS_WITHOUT_RULES.has(hook),
        `класс «${hook}» разметки дока — крючок слоя или осознанный маркер`,
      ).toBe(true);
    }
    for (const hook of hooks) {
      expect(
        doc.has(hook),
        `крючок слоя «${hook}» представлен в разметке дока (новое правило — новый класс в доке)`,
      ).toBe(true);
    }
  });

  it('канон-разметка: карточка-article со слотами; действие — ссылка с доступным именем; иллюстрация alt=""', () => {
    expect(docHtml, 'тоны канона — все три').toContain('pstr-card--peach');
    expect(docHtml).toContain('pstr-card--navy');
    expect(docHtml).toContain('pstr-card--light');
    expect(
      docHtml,
      "действие — ссылка с aria-label (do/don't: имя действия на доступном имени)",
    ).toMatch(/<a class="pstr-card__action"[^>]*aria-label="/);
    expect(docHtml, "иллюстрация декоративна (do/don't)").toMatch(
      /class="pstr-card__illu"[^>]*alt=""/,
    );
    // Заголовки карточек — h3 (иерархия стенда: h1 каркаса → h2 секции → h3).
    expect(docHtml, 'заголовок карточки — h3 с ролью ui-h3').toMatch(
      /<h3 class="pstr-card__title ui-h3">/,
    );
    expect(docHtml, 'текст карточки — роль ui-body').toMatch(/<p class="pstr-card__text ui-body">/);
  });
});

describe('README паттерна (AC5)', () => {
  const readme = () => {
    try {
      return readFileSync(join(root, 'patterns', 'poster-card', 'README.md'), 'utf8');
    } catch {
      return '';
    }
  };

  it("README с API-таблицей и do/don't (доступное имя, иллюстрация декоративна) на месте", () => {
    const md = readme();
    expect(md, 'patterns/poster-card/README.md существует').not.toBe('');
    expect(md, 'API-таблица есть').toMatch(/\|.*Класс.*\|/);
    expect(md, "do/don't: доступное имя действия").toMatch(/aria-label|доступн/i);
    expect(md, "do/don't: иллюстрация декоративна").toMatch(/alt=""/);
  });
});

describe('adoption в пилоте (T17.18 Scope; пины исходников)', () => {
  it('studentCards build.mjs — разметка pstr-: карточка-article + действие-ссылка', () => {
    expect(pilotBuild, 'шаблон studentCards на классах канона').toContain('pstr-card pstr-card--');
    expect(pilotBuild).toContain('pstr-card__body');
    expect(pilotBuild).toContain('pstr-card__title ui-h3');
    expect(pilotBuild).toContain('pstr-card__text ui-body');
    expect(pilotBuild).toContain('pstr-card__illu');
    expect(pilotBuild, 'действие — ссылка канона (не декоративный span ui-button)').toMatch(
      /<a class="pstr-card__action" href="/,
    );
  });

  it('lnk-card из студентского блока снят; сетка блока — каркас lnk-cards (правила слоя)', () => {
    // Шаблон студенческого блока больше не рендерит lnk-карточки:
    // разметка карточек — pstr-.
    const studentTemplate = pilotBuild.slice(
      pilotBuild.indexOf('const studentCards'),
      pilotBuild.indexOf('const employerLogos'),
    );
    expect(studentTemplate, 'в шаблоне карточек нет lnk-крючков').not.toMatch(/lnk-card/);
  });

  it('тон-строки lnk-card студентского блока сняты из pilot.css (правила тона — в слое)', () => {
    expect(pilotCss, '.lnk-card--peach снят (тон peach — модификатор слоя)').not.toContain(
      '.lnk-card--peach',
    );
    expect(pilotCss, '.lnk-card--navy снят').not.toContain('.lnk-card--navy');
    expect(pilotCss, '.lnk-card--light снят').not.toContain('.lnk-card--light');
  });

  it('lnk-канон слоя не тронут — потребитель «Может быть интересно» (Scope)', () => {
    expect(blockOf(layer, '.lnk-card'), '.lnk-card в слое').toBeTruthy();
    expect(blockOf(layer, '.lnk-card__illu'), '.lnk-card__illu в слое').toBeTruthy();
    expect(blockOf(layer, '.lnk-card__action'), '.lnk-card__action в слое').toBeTruthy();
  });

  it('ценз: гейт чист; семейство pstr- в pilot.css не появляется', () => {
    // Пороги — errata по процедуре census.mjs (батч ритма 01.11 — решение
    // владельца: числа растут паритетными правками, порог = факт);
    // T18.1: 1290→1417 / 723→819 — вариант stu-photo (фото-карточки,
    // pstr- в pilot.css по-прежнему запрещён);
    // T18.2: 1417→1431 / 819→822 — тон-строка карточек mentorship на хуке
    // канона --msh-card-active-bg (блоки msh/vcp — на канонах слоя);
    // T18.3: 1431→1520 / 822→869 — позиционные хуки лент компании
    // cp-company-feed (шаг/низ/nowrap/кламп, высоты фото карточек);
    // T18.4: 1520→1738 / 869→1013 — позиционные хуки career-track ctr-
    // (форма cover-hero на каркасе cvh, чипы/этапы/step-info/тест);
    // T18.5: 1738→1894 / 1013→1089 — позиционные хуки education edu-
    // (форма cover-hero на каркасе cvh, теги-фильтры/hero компаний,
    // карточки к канону оригинала).
    expect(MAX_PILOT_CSS_LINES).toBe(1894);
    expect(MAX_PILOT_CSS_CODE_LINES).toBe(1089);
    expect(MAX_PILOT_JS_LINES).toBe(187);
    const metrics = censusMetrics(pilotCssRaw, pilotJs);
    const gate = runCensusGate(metrics);
    expect(gate.problems, 'гейт ценза чист после adoption').toEqual([]);
    expect(
      metrics.css.families,
      'pstr- в цензе сайт-зоны не появляется (правила в слое)',
    ).not.toContain('pstr');
    expect(pilotCss, 'правил pstr- в pilot.css нет').not.toMatch(/\.pstr/);
  });
});
