/**
 * Юнит-пины T14.11 — паттерн «таймлайн этапов» (patterns/timeline/):
 * правила сборки композиции «этапы процесса» + mini-эталон (3–4 этапа на ol:
 * нумерованная точка, заголовок h3, текст; соединительная линия на ::after
 * связок; мобильная деградация в колонку). Источник композиции — steps_html +
 * .timeline career-portal (build.py:484, css/pages.css:1096).
 *
 * Adoption T17.10: связки tlp-* переехали из <style> дока (T14.11 — «зона
 * сайта») в ПАТТЕРН-СЛОЙ patterns/patterns.css → dist/ui-patterns.css
 * (вариант A T17.1; прецедент list/detail/form T17.1, лендинг-связок T17.9).
 * Значения перенесены 1:1 (включая «как есть»-литералы с комментариями-
 * источниками, прецедент pilot.css); док-HTML остаётся источником правды —
 * его разметка несёт те же классы.
 *
 * Исполняемая форма решения (спеки T14.11 + T17.10):
 *  - этап — li (flex-колонка): точка с ВИДИМЫМ номером (не content: counter —
 *    скринридер читает текст точки; нумерация ol дублирует — list-style: none
 *    + role="list" по конвенции .htmlvalidate.js) + h3 + текст;
 *  - соединительная линия — декоративная, на псевдоэлементе связок (в a11y-
 *    дерево не попадает, смысла не несёт);
 *  - мобильная деградация в колонку (min-width 1024 — горизонтальный ряд,
 *    мобильный mobile-first);
 *  - связки tlp-* живут в слое; <style> в док-HTML больше нет; стенд
 *    patterns/timeline подключает слой (withPatterns — T17.10).
 * Поверхность браузера (axe, колонка 375 без hscroll, эталоны 4 вьюпортов
 * в контейнере — ADR-0004) — tests/e2e/pattern-timeline.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'timeline', 'timeline.html');
const readmePath = join(root, 'patterns', 'timeline', 'README.md');
const layerPath = join(root, 'patterns', 'patterns.css');

/** Разметка дока без связующих стилей (для пинов порядка DOM). */
const markupOf = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '');

/** Код слоя без комментариев: гейты смотрят на исполняемый код, не на прозу. */
const layerCode = (() => {
  try {
    return readFileSync(layerPath, 'utf8')
      .replace(/\r\n/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  } catch {
    // Красный шаг TDD: слоя ещё нет — пины ниже упадут с понятным сообщением.
    return '';
  }
})();

/** Тело правила слоя по селектору (верхний уровень, до media-тел). */
const blockOf = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = layerCode.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

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

  it('таймлайн — ol.tlp: 4 этапа, каждый — точка с видимым номером + h3 + текст', () => {
    const ol = pattern.match(/<ol\b[^>]*class="[^"]*\btlp\b[^"]*"[^>]*>/) ?? [''];
    expect(ol[0], 'этапы — семантика ol (список шагов «N из M»)').not.toBe('');
    const stages = markupOf(pattern).match(/<li class="tlp__stage">/g) ?? [];
    expect(
      stages.length,
      'mini-эталон — 3–4 этапа на ol (Scope): 4 шага практики пилота',
    ).toBeGreaterThanOrEqual(3);
    expect(stages.length, 'mini-эталон — не больше 4 этапов (Scope)').toBeLessThanOrEqual(4);
    const dots = markupOf(pattern).match(/<span class="tlp__dot">/g) ?? [];
    expect(dots.length, 'точка на каждом этапе').toBe(stages.length);
    const headings = markupOf(pattern).match(/<h3\b[^>]*ui-h6[^>]*>/g) ?? [];
    expect(
      headings.length,
      'заголовок этапа — роль ui-h6 (h3-тег, канон T16.12 «карточка списков»; унификация с пилотом — батч 31.10)',
    ).toBe(stages.length);
    const texts = markupOf(pattern).match(/<p\b[^>]*ui-small[^>]*>/g) ?? [];
    expect(texts.length, 'текст этапа — роль ui-small (fs-small оригинала)').toBe(stages.length);
  });

  it('номер этапа — видимый текст в точке (не counter, не aria-hidden)', () => {
    const dots = markupOf(pattern).match(/<span class="tlp__dot">([^<]*)<\/span>/g) ?? [];
    expect(dots.length, 'точки с текстом есть').toBeGreaterThanOrEqual(3);
    for (const [i, dot] of dots.entries()) {
      const inner = dot.replace(/<[^>]*>/g, '');
      expect(inner.trim(), `номер точки №${i + 1} — видимый текст`).toMatch(/^\d+$/);
    }
    expect(
      markupOf(pattern),
      'точка НЕ aria-hidden: номер — контент (WCAG 1.3.1), скринридер читает текст точки',
    ).not.toMatch(/class="tlp__dot"[^>]*aria-hidden/);
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

  it('эталон — фрагмент: h1 в самом файле нет (h1 несёт каркас стенда)', () => {
    expect(markupOf(pattern), 'в эталоне-фрагменте h1 нет').not.toContain('<h1');
  });

  it('только классы ui-* и связки tlp-* (новых компонентов паттерн не вводит)', () => {
    const classes = [...markupOf(pattern).matchAll(/class="([^"]+)"/g)]
      .flatMap(([, value]) => value.split(/\s+/))
      .filter(Boolean);
    const foreign = classes.filter(
      (cls) =>
        cls !== 'ui-showcase-stand__note' && !cls.startsWith('ui-') && !cls.startsWith('tlp'),
    );
    expect(
      foreign,
      `все классы эталона — ui-* либо связки tlp-* (найдено: ${foreign.join(', ')})`,
    ).toEqual([]);
  });
});

describe('связки tlp-* — в паттерн-слое (adoption T17.10, вариант A)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    pattern = '';
  }

  it('перенос исполнен: <style> в док-HTML больше нет — связки живут в patterns/patterns.css', () => {
    expect(
      pattern.replace(/<!--[\s\S]*?-->/g, ''),
      '<style> перенесён в patterns/patterns.css (упоминания в комментариях — история переноса)',
    ).not.toContain('<style>');
    expect(pattern, 'док называет слой-носитель связок (ui-patterns.css)').toContain(
      'ui-patterns.css',
    );
  });

  it('.tlp — колонка-база: box-sizing (ADR-0002), flex-колонка, шаг этапов space-5 (24px .timeline)', () => {
    const block = blockOf('.tlp');
    expect(block, '.tlp найдено в слое').toBeTruthy();
    expect(block, 'box-sizing: border-box на корне блока (ADR-0002)').toContain(
      'box-sizing: border-box;',
    );
    expect(block, 'база — колонка (мобильная деградация, порядок чтения = DOM)').toContain(
      'flex-direction: column;',
    );
    expect(block, 'шаг этапов 24px — gap .timeline оригинала (space-5)').toContain(
      'gap: var(--ui-space-5);',
    );
  });

  it('.tlp__stage — якорь линии: relative, колонка, шаг внутри этапа space-3 (12px .timeline__stage)', () => {
    const block = blockOf('.tlp__stage');
    expect(block, '.tlp__stage найдено').toBeTruthy();
    expect(block, 'box-sizing: border-box (ADR-0002)').toContain('box-sizing: border-box;');
    expect(block, 'relative — якорь ::after линии').toContain('position: relative;');
    expect(block, 'шаг точки/заголовка/текста 12px — .timeline__stage (space-3)').toContain(
      'gap: var(--ui-space-3);',
    );
  });

  it('.tlp__dot — 56px круг оригинала «как есть», пара surface-hover/primary, вес body-bold', () => {
    const block = blockOf('.tlp__dot');
    expect(block, '.tlp__dot найдено').toBeTruthy();
    expect(block, 'box-sizing: border-box (ADR-0002)').toContain('box-sizing: border-box;');
    expect(block, 'z-index 1 — точка НАД линией').toContain('z-index: 1;');
    expect(
      block,
      '56px круг оригинала — «как есть» вне шкалы (прецедент --ui-button-pad-inline)',
    ).toContain('width: 3.5rem;');
    expect(block).toContain('height: 3.5rem;');
    expect(block, 'форма — круг').toContain('border-radius: 50%;');
    expect(
      block,
      'фон точки — --ui-color-surface-hover (blue-100 оригинала, семантика surface-hover)',
    ).toContain('background-color: var(--ui-color-surface-hover);');
    expect(block, 'номер — primary (контраст ≈12.6:1, гейт AA)').toContain(
      'color: var(--ui-color-primary);',
    );
    expect(block, 'вес номера — fw-body-bold (= 500 .timeline__dot оригинала)').toContain(
      'font-weight: var(--ui-fw-body-bold);',
    );
  });

  it('ряд — от lg (min-width 1024, шкала T2.5); линия — ::after связки, только в ряду', () => {
    // Срез от первого крючка tlp-: первая media 1024 в нём — media таймлайна
    // (база связки идёт до media, мобильный mobile-first).
    const tlpIndex = layerCode.indexOf('.tlp');
    expect(tlpIndex, 'связки tlp- в слое есть').toBeGreaterThan(-1);
    const tlpCode = layerCode.slice(tlpIndex);
    const media = tlpCode.match(/@media \(min-width: 1024px\)\s*\{([\s\S]*?)\n\}/);
    expect(media, 'ступень lg в слое есть').toBeTruthy();
    const tlpInMedia = media[1].match(/\.tlp\s*\{([^}]*)\}/);
    expect(
      tlpInMedia?.[1] ?? '',
      'ряд: grid-auto-flow: column — колонка на каждый этап (число задаёт разметка)',
    ).toContain('grid-auto-flow: column;');
    expect(tlpInMedia?.[1] ?? '').toContain('grid-auto-columns: 1fr;');
    const line = media[1].match(/\.tlp__stage:not\(:last-child\)::after\s*\{([^}]*)\}/);
    expect(line, 'линия — псевдоэлемент связки этапа, кроме последнего').toBeTruthy();
    expect(line?.[1] ?? '', 'толщина линии — 2px track оригинала').toContain('height: 2px;');
    expect(line?.[1] ?? '', 'центр точки: 3.5rem / 2').toContain('top: 1.75rem;');
    expect(line?.[1] ?? '', 'от центра точки — край круга').toContain('left: 1.75rem;');
    expect(line?.[1] ?? '', 'через зазор сетки до следующей точки (right = -gap)').toContain(
      'right: calc(-1 * var(--ui-space-5));',
    );
    expect(line?.[1] ?? '', 'цвет линии — как track оригинала (surface-hover)').toContain(
      'background-color: var(--ui-color-surface-hover);',
    );
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
    for (const marker of ['ol', 'tlp__dot', 'tlp__stage', 'ui-h6']) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
    expect(readme, 'горизонтальный ряд и мобильная колонка задокументированы').toContain('колонк');
  });

  it('связки tlp-* — паттерн-слой ui-patterns.css (adoption T17.10)', () => {
    expect(readme, 'слой-носитель назван').toContain('ui-patterns.css');
    expect(readme, 'префикс канона tlp-').toContain('tlp-');
    expect(readme, 'прецедент слоя (T17.1/T17.9 → T17.10) отражён').toContain('T17.10');
  });

  it('a11y-правила: ol-семантика, видимые номера, декоративная линия, иерархия', () => {
    expect(readme, 'ol-семантика + role="list" (Safari/VoiceOver) описаны').toContain(
      'role="list"',
    );
    expect(readme, 'видимые номера — правило WCAG 1.3.1').toContain('1.3.1');
    expect(readme, 'линия задокументирована как декоративная').toMatch(/лини[ия][^.]*декоратив/i);
    expect(readme, 'иерархия h2 секции → h3 этапов (без пропусков)').toContain('h3');
  });

  it('Bitrix-заметки: этапы из инфоблока, слой подключается шаблоном сайта', () => {
    expect(readme, 'Bitrix-заметки есть').toContain('Bitrix');
    expect(readme, 'этапы — элементы инфоблока').toContain('инфоблок');
    expect(readme, 'подключение слоя — ui-patterns.css в шаблоне сайта').toContain(
      'ui-patterns.css',
    );
  });

  it('граница «система / сайт»: контент этапов — сайт, каркас+связки — система', () => {
    expect(readme, 'зона сайта названа').toContain('сайт');
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
    expect(build, 'patternNames содержит timeline (сайдбар «Паттерны» и каталог)').toMatch(
      /'timeline'/,
    );
    expect(build, 'STAND_DESCRIPTIONS описывает patterns/timeline').toContain(
      `'patterns/timeline':`,
    );
  });
});
