/**
 * Юнит-пин T18.2 — сборка mentorship и vacancy-capsule ×2 на index-2
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.2-index2-mentorship-capsule.md; практика пинов исходников —
 * pilot-students-photographic.test.js T18.1).
 *
 * Поверхность:
 *  - build.mjs: indexMain (v1) БЕЗ mentorship/capsule (оригинал index.html
 *    их не несёт — build.py PAGES.index); index2Main = applyVariant2 +
 *    вставки позиций v2 (INDEX_FRAGS index-2, build.py:573-590): mentorship
 *    + капсула «Найди своё призвание» — после employers (lgo), капсула
 *    «Найди свою команду» — перед cta-mail (contacts-block). Разметка —
 *    каноны паттерн-слоя msh/vcp (каркас на примитиве ui-section--photo —
 *    VI-инвариант, Implementation requirements п.2); данные — мок
 *    index-2.html:413-451/691-698;
 *  - applyVariant2: замену «Найди свою команду» (build.py:605-607) не
 *    выполняет — тексты капсул запечены позициями (T18.1-пин «not.toContain»
 *    остаётся на его фикстуре из трёх секций, без капсул);
 *  - compare.mjs: BLOCK_PROBES index-2 — пары mentorship (.mentorship →
 *    .msh) и vacancy-capsule (.vacancy-capsule → .vcp; первая капсула —
 *    querySelector-first, вторая — тот же канон) (AC: Δ блока ≤ 8px);
 *  - pilot.css: тон активной карточки rail — одобренная строка градиента
 *    E88A2C→D9A441 (mentorship.css:90) на хуке канона --msh-card-active-bg
 *    (прецедент спец-тинов hero-тегов T17.15; hex в ДС не едет — гейт слоя);
 *    новых cp-семейств 0 (правило не несёт cp-крючка);
 *  - ценз T17.16: гейт чист; семейства cp- не менялись (28).
 *
 * Поверхность браузера (presence 1/2, docHeight/Δ блоков) — compare-прогон
 * и DOM-проба .zcode/accept-t182-*.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CP_FAMILIES,
  censusMetrics,
  runCensusGate,
} from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(pilotCssRaw);
const pilotJs = readFileSync(join(pilotDir, 'pilot.js'), 'utf8').replace(/\r\n/g, '\n');

/** Шаблон indexMain (исходник, с интерполяциями). */
const indexTemplate = build.match(/function indexMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';

/** Секция шаблона вокруг маркера (от ближайшего <section до первого
 *  </section>; маркеры — заголовки/классы секций без вложенных section). */
const sectionAround = (marker) => {
  const idx = indexTemplate.indexOf(marker);
  if (idx === -1) return '';
  const start = indexTemplate.lastIndexOf('<section', idx);
  const end = indexTemplate.indexOf('</section>', idx) + '</section>'.length;
  return start === -1 || end === -1 ? '' : indexTemplate.slice(start, end);
};

/** Фикстура страницы v1 из РЕАЛЬНЫХ секций шаблона в порядке следования
 *  (lgo → why-us → students → stu-photo → … → team → cta-mail): indexMain
 *  — стаб для исполняемой копии index2Main (вся страница целиком тянет
 *  верхнеуровневые данные/билдеры build.mjs — практика фикстуры
 *  pilot-students-photographic.test.js). */
const fixture = [
  sectionAround('Популярные работодатели'),
  sectionAround('cp-why-us'),
  sectionAround('<section class="ui-section" id="students">'),
  sectionAround('<section class="ui-section stu-photo">'),
  sectionAround('Стань частью нашей большой команды'),
  sectionAround('Нет подходящей вакансии?'),
].join('\n');

/** Исполняемая копия билдеров T18.2 (MENTORSHIP/mentorshipMain/
 *  vacancyCapsuleMain) + applyVariant2 + index2Main из исходника build.mjs
 *  (build.mjs — скрипт с верхнеуровневыми побочками, импортом не берётся;
 *  indexMain подставляется стабом-фикстурой). */
const index2Main = (() => {
  const t182Start = build.indexOf('/* ── mentorship/vacancy-capsule (T18.2)');
  const indexMainStart = build.indexOf('function indexMain()');
  const applyStart = build.indexOf('function applyVariant2');
  const idx2End = build.indexOf('const PAGES');
  expect(t182Start, 'блок билдеров T18.2 в build.mjs').toBeGreaterThan(-1);
  expect(indexMainStart, 'indexMain после билдеров').toBeGreaterThan(t182Start);
  expect(applyStart, 'applyVariant2 в build.mjs').toBeGreaterThan(-1);
  expect(idx2End, 'PAGES после index2Main').toBeGreaterThan(applyStart);
  const builders = build.slice(t182Start, indexMainStart);
  const variant = build.slice(applyStart, idx2End);
  return new Function('indexMain', `${builders}\n${variant}\nreturn index2Main;`)(() => fixture);
})();

/** Тело билдера по имени функции (исходник, с интерполяциями). */
const fnBody = (name) =>
  build.match(new RegExp(`function ${name}\\([^)]*\\)[\\s\\S]*?\\n\\}`))?.[0] ?? '';

/** Исходник блока T18.2 (данные MENTORSHIP + билдеры): пины данных — мок
 *  оригинала index-2.html:413-451. */
const t182Source = build.slice(
  build.indexOf('/* ── mentorship/vacancy-capsule (T18.2)'),
  build.indexOf('function indexMain()'),
);

describe('build.mjs — index (v1) без mentorship/capsule (блоки только у v2)', () => {
  it('шаблон главной не несёт msh/vcp-разметки (оригинал index.html: PAGES без mentorship/vacancy-capsule)', () => {
    expect(indexTemplate, 'msh в шаблоне v1 нет').not.toContain('msh');
    expect(indexTemplate, 'vcp в шаблоне v1 нет').not.toContain('vcp');
    expect(indexTemplate, 'капсульных текстов нет').not.toContain('Найди своё призвание');
    expect(indexTemplate).not.toContain('Найди свою команду');
  });
});

describe('build.mjs — билдер наставничества на каноне msh (Implementation requirements п.2)', () => {
  const builder = fnBody('mentorshipMain');

  it('билдер есть; секция — ui-section--photo msh (VI-инвариант: фото-фон через примитив, не голым IMG)', () => {
    expect(builder, 'билдер mentorshipMain найден').not.toBe('');
    expect(builder).toContain('<section class="ui-section ui-section--photo msh">');
    expect(builder).toContain('<div class="ui-section__bg" aria-hidden="true">');
    expect(builder).not.toMatch(/<section class="[^"]*"[^>]*>\s*<img/);
  });

  it('слои канона: __bg с blend-фоном bg-elektro.jpg, mask-фото msh__photo (mentorship.png), декоративные aria-hidden', () => {
    expect(builder).toContain('assets/images/bg-elektro.jpg');
    expect(builder).toContain('<div class="msh__photo" aria-hidden="true">');
    expect(t182Source, 'фото mask-слоя — мок оригинала').toContain(
      "photo: 'assets/images/mentorship.png'",
    );
    expect(builder.match(/aria-hidden="true"/g)?.length ?? 0, 'два декоративных слоя').toBe(2);
    for (const img of builder.match(/<img[^>]*>/g) ?? []) {
      expect(img, `img декоративный (alt=""): ${img.slice(0, 60)}`).toContain('alt=""');
      expect(img, `lazy: ${img.slice(0, 60)}`).toContain('loading="lazy"');
    }
  });

  it('внутренняя сетка msh__inner + роли ui-h2/ui-lead; заголовок/текст — мок оригинала (index-2.html:421-422)', () => {
    expect(builder).toContain('<div class="ui-container msh__inner">');
    expect(t182Source).toContain("title: 'Наставничество в&nbsp;реальном времени'");
    expect(t182Source).toContain('Преуспеть в&nbsp;профессии поможет опытный наставник');
  });

  it('rail: 4 карточки канона msh__card, активная — вторая (--active — BEM-модификатор канона), thumb из ассетов', () => {
    expect(builder).toContain(
      '<section class="msh__rail" aria-label="Карточки направлений наставничества" tabindex="0">',
    );
    expect(t182Source, '4 карточки в данных').toMatch(
      /cards:\s*\[[\s\S]*?tag-photo-1\.png[\s\S]*?mentorship\.png[\s\S]*?job-card-1\.png[\s\S]*?job-card-2\.png[\s\S]*?\]/,
    );
    expect(t182Source.match(/active: true/g)?.length, 'ровно одна активная в данных').toBe(1);
    const activeIdx = t182Source.indexOf('active: true');
    expect(activeIdx, 'активная — вторая в данных').toBeGreaterThan(
      t182Source.indexOf('tag-photo-1.png'),
    );
    expect(activeIdx).toBeLessThan(t182Source.indexOf('job-card-1.png'));
    expect(builder).toContain('msh__card--active');
    expect(builder).toContain('class="msh__card-title"');
    expect(builder).toContain('class="msh__card-thumb"');
  });
});

describe('build.mjs — билдер капсулы на каноне vcp (данные — мок index-2.html:444-451)', () => {
  const builder = fnBody('vacancyCapsuleMain');

  it('билдер vacancyCapsuleMain(label); секция — ui-section vcp + ui-container vcp__inner', () => {
    expect(builder, 'билдер капсулы найден').not.toBe('');
    expect(builder).toMatch(/function vacancyCapsuleMain\(/);
    expect(builder).toContain('<section class="ui-section vcp">');
    expect(builder).toContain('<div class="ui-container vcp__inner">');
  });

  it('label + btn на vcp-крючках, href vacancies.html, текст кнопки «Все 144 вакансии» (v2), стрелка 20×20 оригинала', () => {
    expect(builder).toContain('<a class="vcp__label" href="vacancies.html">${label}</a>');
    expect(builder).toContain('<a class="vcp__btn" href="vacancies.html">Все 144 вакансии');
    expect(builder, 'svg стрелки капсулы 20×20 (index-2.html:448)').toContain(
      'width="20" height="20" viewBox="0 0 20 20"',
    );
    expect(builder).toContain('aria-hidden="true"');
  });
});

describe('build.mjs — index2Main: позиции оригинала (AC: блоки на позициях)', () => {
  const html = index2Main();

  it('порядок v2: lgo → mentorship → капсула «призвание» → students (hidden) → stu-photo --v2 → … → team → капсула «команда» → contacts-block', () => {
    const lgo = html.indexOf('<section class="ui-section lgo lgo--mosaic">');
    const mentorship = html.indexOf('<section class="ui-section ui-section--photo msh">');
    const capsule1 = html.indexOf('Найди своё призвание');
    const studentsHidden = html.indexOf('<section class="ui-section" hidden>');
    const stuPhoto = html.indexOf(
      '<section class="ui-section stu-photo stu-photo--v2" id="students">',
    );
    const team = html.indexOf('<img class="cp-team__photo"');
    const capsule2 = html.indexOf('Найди свою команду');
    const cta = html.indexOf('<section class="ui-section" id="contacts-block">');
    for (const [name, index] of [
      ['lgo', lgo],
      ['mentorship', mentorship],
      ['capsule1', capsule1],
      ['students hidden', studentsHidden],
      ['stu-photo v2', stuPhoto],
      ['team', team],
      ['capsule2', capsule2],
      ['cta-mail', cta],
    ]) {
      expect(index, `${name} на странице`).toBeGreaterThan(-1);
    }
    expect(mentorship, 'mentorship после employers').toBeGreaterThan(lgo);
    expect(capsule1, 'капсула 1 после mentorship').toBeGreaterThan(mentorship);
    expect(studentsHidden, 'students после капсулы 1').toBeGreaterThan(capsule1);
    expect(stuPhoto).toBeGreaterThan(studentsHidden);
    expect(capsule2, 'капсула 2 после team').toBeGreaterThan(team);
    expect(cta, 'cta-mail после капсулы 2').toBeGreaterThan(capsule2);
  });

  it('presence: mentorship 1 шт, капсулы 2 шт (Implementation requirements п.3); why-us по-прежнему нет', () => {
    expect(
      html.match(/<section class="ui-section ui-section--photo msh">/g)?.length,
      'mentorship 1',
    ).toBe(1);
    expect(html.match(/<section class="ui-section vcp">/g)?.length, 'капсулы 2').toBe(2);
    expect(html, 'why-us в v2 нет (T18.1)').not.toContain('cp-why-us');
  });

  it('капсулы не несут id="vacancies" (панель ушла вместе с why-us — T18.1; оригинал index-2 без якоря)', () => {
    expect(html).not.toContain('id="vacancies"');
  });

  it('index (v1) не меняется: index2Main не мутирует шаблон v1 (v1 — без msh/vcp)', () => {
    expect(indexTemplate).not.toContain('msh__rail');
    expect(indexTemplate).not.toContain('vcp__inner');
  });
});

describe('compare.mjs — BLOCK_PROBES index-2 на msh/vcp (AC: Δ блока ≤ 8px)', () => {
  const v2Probes = compare.match(/'index-2\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';

  it('пары mentorship (.mentorship → .msh) и vacancy-capsule (.vacancy-capsule → .vcp)', () => {
    expect(v2Probes).toContain("['mentorship', '.mentorship', '.msh']");
    expect(v2Probes).toContain("['vacancy-capsule', '.vacancy-capsule', '.vcp']");
  });

  it('прежние пары v2 не тронуты (T18.1: students → #students)', () => {
    expect(v2Probes).toContain("['students', '.students--photographic', '#students']");
  });
});

describe('pilot.css — тон активной карточки на хуке канона (без новых cp-семейств)', () => {
  it('--msh-card-active-bg: одобренный градиент E88A2C→D9A441 (mentorship.css:90) строкой сайт-зоны', () => {
    const hook = pilotCss.match(/\.msh__card \{[^}]*\}/)?.[0] ?? '';
    expect(hook, 'строка хука в pilot.css').not.toBe('');
    expect(hook).toMatch(
      /--msh-card-active-bg:\s*linear-gradient\(100deg,\s*#e88a2c 0%,\s*#d9a441 100%\);/,
    );
  });

  it('хук не создаёт cp-семейства (селектор на каноне слоя, не cp-)', () => {
    const metrics = censusMetrics(pilotCssRaw, pilotJs);
    expect(metrics.css.families, 'семейств mentorship/capsule в цензе нет').not.toContain(
      'mentorship',
    );
    // errata T18.3: семейство company-feed (позиционные хуки лент компании)
    // — 28 → 29
    expect(metrics.css.families).toHaveLength(29);
  });
});

describe('ценз T17.16 — гейт чист после сборки блоков', () => {
  it('фактические pilot.css/pilot.js проходят гейт; новых cp-визуальных блоков 0', () => {
    const metrics = censusMetrics(pilotCssRaw, pilotJs);
    const gate = runCensusGate(metrics);
    expect(gate.problems, 'гейт ценза чист').toEqual([]);
    expect(gate.newBlocks, 'новых cp-семейств 0').toEqual([]);
    // errata T18.3: allowlist расширен семейством company-feed — 30 → 31
    expect(ALLOWED_CP_FAMILIES, 'allowlist — errata T18.3').toHaveLength(31);
  });
});
