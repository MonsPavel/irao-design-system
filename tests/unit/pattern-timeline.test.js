/**
 * Юнит-пины T14.11 — паттерн «таймлайн этапов» (patterns/timeline/):
 * правила сборки композиции «этапы процесса» + mini-эталон (3–4 этапа на ol:
 * нумерованная точка, заголовок h3, текст; соединительная линия на ::after
 * связок; мобильная деградация в колонку). Источник композиции — steps_html +
 * .timeline career-portal (build.py:484, css/pages.css:1096) — переносится
 * КОМПОЗИЦИЯ, не стили (прецедент паттерна-композиции — landing-section T8.3).
 *
 * Исполняемая форма решения (спека T14.11, Scope + Technical considerations):
 *  - этап — li (flex-колонка): точка с ВИДИМЫМ номером (не content: counter —
 *    скринридер читает текст точки; нумерация ol дублирует — list-style: none
 *    + role="list" по конвенции .htmlvalidate.js) + h3 + текст;
 *  - соединительная линия — декоративная, на псевдоэлементе связок (в a11y-
 *    дерево не попадает, смысла не несёт);
 *  - мобильная деградация в колонку (min-width 1024 — горизонтальный ряд,
 *    мобильный mobile-first);
 *  - новый CSS в системе запрещён (patterns/README): связки tl-* живут
 *    <style> паттерна на токенах — зона сайта, в dist не попадает.
 * Поверхность браузера (axe, колонка 375 без hscroll, эталоны 4 вьюпортов
 * в контейнере — ADR-0004) — tests/e2e/pattern-timeline.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'timeline', 'timeline.html');
const readmePath = join(root, 'patterns', 'timeline', 'README.md');

/** Разметка без связующих <style> (для пинов порядка DOM). */
const markupOf = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '');

describe('patterns/timeline/timeline.html — mini-эталон (Scope T14.11)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('эталон — секция каркаса: ui-section + ui-container + заголовок-роль h2 (aria-labelledby)', () => {
    const section = pattern.match(/<section[^>]*id="tl-demo"[^>]*>/) ?? [''];
    expect(section[0], 'секция эталона — ui-section (ритм T3.4)').toContain('ui-section');
    expect(section[0], 'секция именована aria-labelledby').toContain('aria-labelledby');
    expect(markupOf(pattern), 'эталон несёт контейнер (ui-container)').toContain('ui-container');
    expect(
      markupOf(pattern).match(/<h2\b[^>]*ui-h2[^>]*>/),
      'заголовок секции — роль ui-h2 («классы, а не теги», T3.3)',
    ).toBeTruthy();
  });

  it('таймлайн — ol: 4 этапа, каждый — точка с видимым номером + h3 + текст', () => {
    const ol = pattern.match(/<ol\b[^>]*class="[^"]*\btl\b[^"]*"[^>]*>/) ?? [''];
    expect(ol[0], 'этапы — семантика ol (список шагов «N из M»)').not.toBe('');
    const stages = markupOf(pattern).match(/<li class="tl__stage">/g) ?? [];
    expect(
      stages.length,
      'mini-эталон — 3–4 этапа на ol (Scope): 4 шага практики пилота',
    ).toBeGreaterThanOrEqual(3);
    expect(stages.length, 'mini-эталон — не больше 4 этапов (Scope)').toBeLessThanOrEqual(4);
    const dots = markupOf(pattern).match(/<span class="tl__dot">/g) ?? [];
    expect(dots.length, 'точка на каждом этапе').toBe(stages.length);
    const headings = markupOf(pattern).match(/<h3\b[^>]*ui-h3[^>]*>/g) ?? [];
    expect(headings.length, 'заголовок этапа — роль ui-h3 (h2 секции → h3, без пропусков)').toBe(
      stages.length,
    );
    const texts = markupOf(pattern).match(/<p\b[^>]*ui-small[^>]*>/g) ?? [];
    expect(texts.length, 'текст этапа — роль ui-small (fs-small оригинала)').toBe(stages.length);
  });

  it('номер этапа — видимый текст в точке (не counter, не aria-hidden)', () => {
    const dots = markupOf(pattern).match(/<span class="tl__dot">([^<]*)<\/span>/g) ?? [];
    expect(dots.length, 'точки с текстом есть').toBeGreaterThanOrEqual(3);
    for (const [i, dot] of dots.entries()) {
      const inner = dot.replace(/<[^>]*>/g, '');
      expect(inner.trim(), `номер точки №${i + 1} — видимый текст`).toMatch(/^\d+$/);
    }
    expect(
      markupOf(pattern),
      'точка НЕ aria-hidden: номер — контент (WCAG 1.3.1), скринридер читает текст точки',
    ).not.toMatch(/class="tl__dot"[^>]*aria-hidden/);
  });

  it('ol несёт role="list" + inline-директиву html-validate (конвенция .htmlvalidate.js)', () => {
    const ol = pattern.match(/<ol\b[^>]*>/) ?? [''];
    expect(
      ol[0],
      'role="list": reset снимает list-style — Safari/VoiceOver теряет роль списка (конвенция ui-breadcrumbs)',
    ).toContain('role="list"');
    expect(
      pattern,
      'inline-директива html-validate перед ol (no-redundant-role, prefer-native-element слепы к Safari-багу)',
    ).toContain('html-validate-disable-next no-redundant-role, prefer-native-element');
  });

  it('связки tl-* на токенах: box-sizing (ADR-0002), без hex, без !important, без inline-стилей', () => {
    expect(pattern, 'связки живут <style> паттерна, не в dist (зона сайта)').toContain('<style>');
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'связки паттерна именованы tl-*').toContain('.tl');
    // ADR-0002: box-sizing на корне каждой связки-блока.
    expect(
      style[1].match(/\.tl\s*\{[^}]*\}/)?.[0] ?? '',
      'box-sizing: border-box на корне блока .tl (ADR-0002)',
    ).toContain('box-sizing: border-box');
    expect(
      style[1].match(/\.tl__stage\s*\{[^}]*\}/)?.[0] ?? '',
      'box-sizing: border-box на .tl__stage (ADR-0002)',
    ).toContain('box-sizing: border-box');
    expect(
      style[1].match(/\.tl__dot\s*\{[^}]*\}/)?.[0] ?? '',
      'box-sizing: border-box на .tl__dot (ADR-0002)',
    ).toContain('box-sizing: border-box');
    // Фон точки/линии — семантика surface-hover (= --color-surface-blue-100
    // оригинала), номер — primary: каркас композиции только на токенах.
    expect(style[1], 'фон точки — --ui-color-surface-hover (blue-100 оригинала)').toMatch(
      /background-color:\s*var\(--ui-color-surface-hover\)/,
    );
    expect(style[1], 'номер точки — --ui-color-primary (пара оригинала, контраст 12.9:1)').toMatch(
      /color:\s*var\(--ui-color-primary\)/,
    );
    expect(style[1], 'hex в связках запрещён (инвариант системы)').not.toMatch(
      /#[0-9a-fA-F]{3,8}\b/,
    );
    expect(style[1], '!important в связках запрещён (инвариант системы)').not.toContain(
      '!important',
    );
    const markup = markupOf(pattern);
    expect(markup, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });

  it('соединительная линия — на ::after связки этапа, декоративная, только в ряду', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(
      style[1],
      'линия — псевдоэлемент связки этапа (::after), не отдельный элемент DOM (Scope)',
    ).toMatch(/\.tl__stage:not\(:last-child\)::after/);
    expect(
      style[1],
      'высотa линии — 2px оригинала (.timeline__track)',
    ).toMatch(/height:\s*2px/);
    expect(
      style[1],
      'линия лежит ПОД точкой: точка несёт z-index 1 (линия заходит за круг, как track оригинала)',
    ).toMatch(/\.tl__dot\s*\{[^}]*z-index:\s*1/);
    expect(
      style[1],
      'линия существует только в горизонтальном ряду: правило ::after внутри media 1024 ' +
        '(в мобильной колонке линии нет — как track оригинала, прячась на узких вьюпортах)',
    ).toMatch(/@media \(min-width: 1024px\)[\s\S]*\.tl__stage:not\(:last-child\)::after/);
  });

  it('mobile-first: горизонтальный ряд — min-width 1024 из шкалы брейкпоинтов, база — колонка', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(
      style[1],
      'горизонтальный ряд появляется от lg (1024) — как в оригинале (деградация ≤1024)',
    ).toMatch(/@media \(min-width: 1024px\)/);
    const media = (style[1].match(/@media[^{]+/g) ?? []).map((m) => m.trim());
    for (const query of media) {
      expect(query, `media-запрос «${query}» — mobile-first min-width из шкалы T2.5`).toMatch(
        /^@media \(min-width: (?:480|768|1024|1280|1440)px\)$/,
      );
    }
    expect(
      style[1].match(/\.tl\s*\{[^}]*\}/)?.[0] ?? '',
      'база .tl — колонка (flex-direction: column), ряд — надстройка media',
    ).toContain('flex-direction: column');
  });

  it('эталон — фрагмент: h1 в самом файле нет (h1 несёт каркас стенда)', () => {
    expect(markupOf(pattern), 'в эталоне-фрагменте h1 нет').not.toContain('<h1');
  });

  it('только классы ui-* и связки tl-* (новых компонентов паттерн не вводит)', () => {
    const classes = [...markupOf(pattern).matchAll(/class="([^"]+)"/g)]
      .flatMap(([, value]) => value.split(/\s+/))
      .filter(Boolean);
    const foreign = classes.filter(
      (cls) =>
        cls !== 'ui-showcase-stand__note' && !cls.startsWith('ui-') && !cls.startsWith('tl'),
    );
    expect(
      foreign,
      `все классы эталона — ui-* либо связки tl-* (найдено: ${foreign.join(', ')})`,
    ).toEqual([]);
  });
});

describe('patterns/timeline/README.md — композиция, a11y, Bitrix (AC)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('композиция: ol этапов — точка с номером, h3, текст; ряд/колонка', () => {
    for (const marker of ['ol', 'tl__dot', 'tl__stage', 'ui-h3']) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
    expect(readme, 'горизонтальный ряд и мобильная колонка задокументированы').toContain(
      'колонк',
    );
  });

  it('a11y-правила: ol-семантика, видимые номера, декоративная линия, иерархия', () => {
    expect(readme, 'ol-семантика + role="list" (Safari/VoiceOver) описаны').toContain(
      'role="list"',
    );
    expect(readme, 'видимые номера — правило WCAG 1.3.1').toContain('1.3.1');
    expect(readme, 'линия задокументирована как декоративная').toMatch(
      /лини[ия][^.]*декоратив/i,
    );
    expect(readme, 'иерархия h2 секции → h3 этапов (без пропусков)').toContain('h3');
  });

  it('Bitrix-заметки: этапы из инфоблока, связки → template_styles.css', () => {
    expect(readme, 'Bitrix-заметки есть').toContain('Bitrix');
    expect(readme, 'этапы — элементы инфоблока').toContain('инфоблок');
    expect(readme, 'связки tl-* переносятся в template_styles.css сайта').toContain(
      'template_styles.css',
    );
  });

  it('граница «система / сайт»: контент этапов — сайт, каркас — система; нового CSS нет', () => {
    expect(readme, 'зона сайта названа').toContain('сайт');
    expect(readme, 'нового CSS в системе нет (граница паттернов)').toContain('CSS');
    expect(readme, 'компонент dist не создаётся — второго потребителя нет').toContain(
      'ui-timeline',
    );
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/timeline.html', () => {
  it('build.mjs читает patterns/timeline/timeline.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'timeline', 'timeline.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'timeline.html'`);
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('каркас стенда СО СЛУЖЕБНЫМ h1 (таймлайн — фрагмент; axe page-has-heading-one)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf("'patterns/timeline'"));
    expect(block).toContain('<h1 class="ui-showcase-title">patterns/timeline</h1>');
  });

  it('nav/каталог: patterns/timeline в сайдбаре и в описаниях стенда', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(
      build,
      'patternNames содержит timeline (сайдбар «Паттерны» и каталог)',
    ).toMatch(/'timeline'/);
    expect(
      build,
      'STAND_DESCRIPTIONS описывает patterns/timeline',
    ).toContain(`'patterns/timeline':`);
  });
});
