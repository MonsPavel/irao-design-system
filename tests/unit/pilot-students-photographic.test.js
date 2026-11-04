/**
 * Юнит-пин T18.1 — вторая секция «Школьникам и студентам» (фото-карточки,
 * .students--photographic оригинала) в билде главной и снятие лишней
 * cp-why-us с варианта 2 (Testing requirements п.2 — «пин-тест на presence
 * секций: index — 2 students, index-2 — 0 why-us»; практика пинов
 * исходников — pilot-photo-sections.test.js T17.3, поведенческий пин
 * чистой функции из исходника — pilot-education-catalog.test.js T15.3).
 *
 * Поверхность:
 *  - build.mjs: indexMain — ДВЕ секции students подряд: иллюстрированная
 *    (канон pstr, T17.18 — не тронута) + photographic (каркас ui-card--media
 *    по Implementation requirements п.1, фото из dist/assets, головка с
 *    пилюлей «подробнее» — v1-форма оригинала index.html:550-553);
 *  - applyVariant2 (1:1 apply_variant2 build.py:585-608 + :942):
 *    illustrated скрыт (hidden), id="students" переехал на photographic
 *    (--v2), ссылка «подробнее» → «все мероприятия», cp-why-us СНЯТА
 *    (в v2 оригинала секции нет — index-2.html:413-451 отсутствует, вместо
 *    неё mentorship/vacancy-capsule — T18.2); заголовок v2 остаётся
 *    «Школьникам и студентам» (index-2.html:501) — прежняя подмена
 *    «Найди свою команду» снята (текст второй vacancy-capsule — T18.2);
 *  - compare.mjs: BLOCK_PROBES index — пара photographic (AC: высота
 *    секции ≤ ±8px от 926px оригинала), index-2 — пара students теперь
 *    меряет photographic--v2 (id переехал; 778px оригинала);
 *  - pilot.css: вариант photographic — сайт-зона ПОКА (вынос в слой —
 *    T18.17); семейство stu- (имя по стыку, конвенция T18.17): cp- нельзя
 *    (ценз T17.16 — новое cp-семейство «students» вне allowlist, пороги
 *    семейств не трогаем), pstr- в pilot.css нельзя (пин T17.18,
 *    poster-card.test.js — правила постера живут в слое);
 *  - ценз: новых cp-семейств 0, allowlist/MAX_CP_FAMILIES не тронуты
 *    (потолки строк — errata по процедуре census.mjs: файл был ровно на
 *    1290/723, правила физически живут в pilot.css — пин факта в
 *    pilot-census-gate.test.js).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CP_FAMILIES,
  MAX_CP_FAMILIES,
  censusMetrics,
  runCensusGate,
} from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(pilotCssRaw);
const pilotJs = readFileSync(join(pilotDir, 'pilot.js'), 'utf8').replace(/\r\n/g, '\n');

/** Шаблон indexMain (исходник, с интерполяциями — пины разметки). */
const indexTemplate = build.match(/function indexMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';

/** Исполняемая копия чистой applyVariant2 из исходника build.mjs
 *  (build.mjs — скрипт с верхнеуровневыми побочками, импортом не берётся —
 *  тело вырезается и исполняется, практика buildOptions T15.3). */
const applyVariant2 = (() => {
  const start = build.indexOf('function applyVariant2');
  const end = build.indexOf('function index2Main');
  expect(start, 'applyVariant2 в build.mjs').toBeGreaterThan(-1);
  expect(end, 'index2Main после applyVariant2').toBeGreaterThan(start);
  return new Function(`return (${build.slice(start, end)});`)();
})();

/** Секция шаблона от маркера до закрывающего </section> (внутри секций
 *  students/why-us вложенных <section> нет). */
const sliceSection = (from, marker) => {
  const start = from.indexOf(marker);
  const end = from.indexOf('</section>', start) + '</section>'.length;
  return start === -1 ? '' : from.slice(start, end);
};

/** Фикстура v2-преобразования: реальные блоки шаблона в порядке страницы
 *  (why-us → students illustrated → students photographic). */
const fixture = [
  sliceSection(indexTemplate, '<section class="ui-section ui-section--photo cp-why-us">'),
  sliceSection(indexTemplate, '<section class="ui-section" id="students">'),
  sliceSection(indexTemplate, '<section class="ui-section stu-photo">'),
].join('\n');

describe('build.mjs — index: две секции students подряд (T18.1 Goal)', () => {
  it('photographic присутствует ровно один раз и идёт ПОСЛЕ иллюстрированной', () => {
    expect(indexTemplate, 'секция photographic в разметке главной').toContain(
      '<section class="ui-section stu-photo">',
    );
    expect(
      (indexTemplate.match(/<section class="ui-section stu-photo">/g) ?? []).length,
      'ровно одна photographic',
    ).toBe(1);
    const illustrated = indexTemplate.indexOf('<section class="ui-section" id="students">');
    const photographic = indexTemplate.indexOf('<section class="ui-section stu-photo">');
    expect(illustrated, 'иллюстрированная раньше photographic').toBeGreaterThan(-1);
    expect(photographic).toBeGreaterThan(illustrated);
  });

  it('иллюстрированная секция не тронута (Out of scope — канон pstr T17.18)', () => {
    expect(indexTemplate).toContain('<section class="ui-section" id="students">');
    expect((indexTemplate.match(/pstr-card pstr-card--/g) ?? []).length).toBe(3);
  });

  it('грид секции — 3 колонки; головка — роль ui-h2 + пилюля «подробнее» (v1-форма оригинала)', () => {
    const section = sliceSection(indexTemplate, '<section class="ui-section stu-photo">');
    expect(section).toContain('<div class="ui-grid stu-photo__grid">');
    expect(section).toContain('<div class="stu-photo__head">');
    expect(section).toContain('<h2 class="ui-h2">Школьникам и студентам</h2>');
    // href practices.html — результат преобразования build.py:942 на v1
    // (в шаблон заложена сразу форма оригинала index.html:505)
    expect(section).toContain(
      '<a class="stu-photo__more" href="practices.html">подробнее',
    );
  });
});

describe('build.mjs — фото-карточки на каркасе ui-card--media (Implementation requirements п.1)', () => {
  const section = sliceSection(indexTemplate, '<section class="ui-section stu-photo">');

  it('три карточки ui-card--media + вариант stu-photo-card', () => {
    expect((section.match(/class="ui-card ui-card--media stu-photo-card"/g) ?? []).length).toBe(3);
  });

  it('фото — из ассетов оригинала dist/assets, декоративные (alt="", lazy)', () => {
    for (const photo of ['students-photo-1.jpg', 'students-photo-2.jpg', 'students-photo-3.jpg']) {
      expect(section, `фото ${photo} в разметке`).toContain(`assets/images/${photo}`);
    }
    for (const img of section.match(/<img class="stu-photo-card__photo"[^>]*>/g) ?? []) {
      expect(img, 'alt="" — декоративное').toContain('alt=""');
      expect(img, 'loading="lazy"').toContain('loading="lazy"');
    }
  });

  it('тело карточки — роли типографики (ui-h3/ui-body), действие — канон слоя pstr-card__action', () => {
    expect(section).toContain('<div class="stu-photo-card__body">');
    expect(section).toContain('class="stu-photo-card__title ui-h3"');
    expect(section).toContain('class="stu-photo-card__text ui-body"');
    // Действие — та же круглая кнопка-стрелка, что у постерных карточек:
    // канон слоя (52px, right/bottom 20, hover scale) + пара white хуками.
    expect(section).toMatch(/<a class="pstr-card__action stu-photo-card__action" href="/);
    expect(section).toMatch(/aria-label="Подробнее: [^"]+"/);
  });
});

describe('applyVariant2 — index-2: 0 why-us, photographic --v2 (behavioral пин)', () => {
  it('фикстура собрана из реальных блоков шаблона (санити)', () => {
    expect(fixture).toContain('cp-why-us');
    expect(fixture).toContain('<section class="ui-section" id="students">');
    expect(fixture).toContain('<section class="ui-section stu-photo">');
  });

  it('why-us снята вместе с панелью вакансий #vacancies (в v2 — vacancy-capsule, T18.2)', () => {
    const v2 = applyVariant2(fixture);
    expect(v2, 'секции why-us нет').not.toContain('cp-why-us');
    expect(v2, 'панель вакансий ушла вместе с секцией').not.toContain('id="vacancies"');
    expect(v2, 'остальные блоки не задеты').toContain('Школьникам и студентам');
  });

  it('illustrated скрыт (hidden), id="students" переехал на photographic --v2 (1:1 build.py:593-596)', () => {
    const v2 = applyVariant2(fixture);
    expect(v2).toContain('<section class="ui-section" hidden>');
    expect(v2).not.toContain('<section class="ui-section" id="students">');
    expect(v2).toContain('<section class="ui-section stu-photo stu-photo--v2" id="students">');
  });

  it('ссылка шапки — «все мероприятия» (build.py:942 is_v2); подмена заголовка «Найди свою команду» снята (index-2.html:501)', () => {
    const v2 = applyVariant2(fixture);
    expect(v2).toContain('href="practices.html">все мероприятия');
    expect(v2).not.toContain('>подробнее');
    expect(v2, 'заголовок секции v2 — «Школьникам и студентам»').toContain(
      '<h2 class="ui-h2">Школьникам и студентам</h2>',
    );
    expect(v2, 'текст capsule — не задача T18.1 (T18.2)').not.toContain('Найди свою команду');
  });

  it('состав фото-карточек v2 не меняется (3 карточки на месте)', () => {
    const v2 = applyVariant2(fixture);
    expect((v2.match(/stu-photo-card"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('compare.mjs — BLOCK_PROBES на photographic (AC: Δ секции ≤ 8px)', () => {
  it('index.html: пара .students--photographic → .stu-photo', () => {
    const indexProbes = compare.match(/'index\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';
    expect(indexProbes).toContain("['students-photo', '.students--photographic', '.stu-photo']");
  });

  it('index-2.html: пара students теперь меряет photographic--v2 (id переехал, 778px оригинала)', () => {
    const v2Probes = compare.match(/'index-2\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';
    expect(v2Probes).toContain("['students', '.students--photographic', '#students']");
  });
});

describe('pilot.css — вариант photographic в сайт-зоне ПОКА (вынос в слой — T18.17)', () => {
  it('ритм секции: 140/72 (students.css:2); вариант 2 — 72/72 (students.css:5)', () => {
    expect(blockOf(pilotCss, '.stu-photo')).toContain('padding: 8.75rem 0 4.5rem;');
    expect(blockOf(pilotCss, '.stu-photo--v2')).toContain('padding: 4.5rem 0;');
  });

  it('грид: шаг 36px «как есть» (students.css:42), 3 колонки от lg (≤1023 — колонка, students.css:171)', () => {
    const grid = blockOf(pilotCss, '.stu-photo__grid');
    expect(grid).toContain('gap: 2.25rem;');
    const lg = pilotCss.match(/@media \(min-width: 1024px\) \{[^@]*?\.stu-photo__grid\s*\{([^}]*)\}/);
    expect(lg?.[1] ?? '', '3 колонки — ступень 1024').toContain(
      'grid-template-columns: repeat(3, minmax(0, 1fr));',
    );
  });

  it('пилюля «подробнее»: 52px pill 14/500 (students.css:23-35), hover — под (hover: hover) (EPIC-4)', () => {
    const more = blockOf(pilotCss, '.stu-photo__more');
    expect(more).toContain('height: 3.25rem;');
    expect(more).toContain('border-radius: var(--ui-radius-pill);');
    expect(more).toContain('color: var(--ui-color-primary);');
    const hoverZone = pilotCss.slice(pilotCss.indexOf('.stu-photo__more:hover'));
    expect(pilotCss.slice(0, pilotCss.indexOf('.stu-photo__more:hover')), 'hover вне media — нет').not.toContain(
      '.stu-photo__more:hover',
    );
    expect(hoverZone).toMatch(/@media \(hover: hover\)/);
    expect(blockOf(pilotCss, '.stu-photo__more:hover')).toContain(
      'background-color: var(--ui-color-surface-hover);',
    );
  });

  it('карточка: заливка primary (students.css:62), без рамки ui-card, радиус md; лестница 380/440/600 (students.css:88/172/179)', () => {
    const card = blockOf(pilotCss, '.stu-photo-card');
    expect(card).toContain('background-color: var(--ui-color-primary);');
    expect(card).toContain('border: 0;');
    expect(card).toContain('border-radius: var(--ui-radius-md);');
    expect(card).toContain('min-height: 23.75rem;');
    const md = pilotCss.match(/@media \(min-width: 768px\) \{[^@]*?\.stu-photo-card \{([^}]*)\}/);
    expect(md?.[1] ?? '', '440px — ступень 768').toContain('min-height: 27.5rem;');
    const lg = pilotCss.match(/@media \(min-width: 1024px\) \{[^@]*?\.stu-photo-card \{([^}]*)\}/);
    expect(lg?.[1] ?? '', '600px — ступень 1024').toContain('min-height: 37.5rem;');
  });

  it('тело поверх фото (z-пара), текст on-dark (students.css:82/113/121)', () => {
    const body = blockOf(pilotCss, '.stu-photo-card__body');
    expect(body).toContain('position: relative;');
    expect(body).toContain('z-index: 1;');
    expect(body).toContain('flex-direction: column;');
    expect(pilotCss).toMatch(
      /\.stu-photo-card__title,\n\.stu-photo-card__text \{[^}]*color: var\(--ui-color-text-on-dark\);/,
    );
  });

  it('фото: абсолют от 220px, object-fit fill, радиус 24 сверху + clip-path (students.css:63-70); квирки nth 223/222 (students.css:71-79)', () => {
    const photo = blockOf(pilotCss, '.stu-photo-card__photo');
    expect(photo).toContain('position: absolute;');
    expect(photo).toContain('top: 13.75rem;');
    expect(photo).toContain('object-fit: fill;');
    expect(photo).toContain('border-radius: var(--ui-radius-lg) var(--ui-radius-lg) 0 0;');
    expect(photo).toContain(
      'clip-path: inset(0 round var(--ui-radius-lg) var(--ui-radius-lg) 0 0);',
    );
    const nth1 = blockOf(pilotCss, '.stu-photo-card:nth-child(1) .stu-photo-card__photo');
    expect(nth1).toContain('top: 13.9375rem;');
    expect(nth1).toContain('width: calc(100% - 1px);');
    const nth2 = blockOf(pilotCss, '.stu-photo-card:nth-child(2) .stu-photo-card__photo');
    expect(nth2).toContain('top: 13.875rem;');
    expect(nth2).toContain('width: calc(100% + 2px);');
  });

  it('вариант 2: карточки 520px поверх лестницы (students.css:81)', () => {
    expect(blockOf(pilotCss, '.stu-photo--v2 .stu-photo-card')).toContain(
      'min-height: 32.5rem;',
    );
  });

  it('инварианты сайт-зоны: без !important, без новых hex (спец-тинты hero-тегов — единственное исключение)', () => {
    expect(pilotCss).not.toContain('!important');
    const hexes = [...pilotCss.matchAll(/#([0-9a-f]{3,8})\b/gi)].map((m) => m[1]);
    expect(
      hexes.every((hex) => ['3142ff', '31ff76', 'ff3134'].includes(hex.toLowerCase())),
      `сырые цвета в pilot.css — только спец-тинты hero-тегов (найдено: ${hexes.join(', ')})`,
    ).toBe(true);
  });
});

describe('ценз T17.16 — семейство stu- не создаёт cp-семейства (Scope: «пороги не бить»)', () => {
  it('фактические pilot.css/pilot.js проходят гейт; families без «students» и без «pstr»', () => {
    const metrics = censusMetrics(pilotCssRaw, pilotJs);
    const gate = runCensusGate(metrics);
    expect(gate.problems, 'гейт ценза чист').toEqual([]);
    expect(metrics.css.families, 'семейства students в цензе нет').not.toContain('students');
    expect(metrics.css.families, 'pstr — слой, в цензе сайт-зоны не появляется').not.toContain(
      'pstr',
    );
  });

  it('пороги семейств не тронуты (allowlist 30, MAX_CP_FAMILIES 30)', () => {
    expect(MAX_CP_FAMILIES).toBe(30);
    expect(ALLOWED_CP_FAMILIES).toHaveLength(30);
    expect(ALLOWED_CP_FAMILIES, 'семейство students в allowlist не появляется').not.toContain(
      'students',
    );
  });
});
