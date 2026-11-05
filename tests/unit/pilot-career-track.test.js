/**
 * Юнит-пин T18.4 — career-track.html: три секции и кнопка обложки
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.4-career-track-sections.md; практика пинов исходников —
 * pilot-students-photographic.test.js T18.1, pilot-mentorship-capsule
 * .test.js T18.2, pilot-company.test.js T15.2).
 *
 * Поверхность:
 *  - build.mjs: careerTrackMain — обложка на каркасе cvh (канон слоя,
 *    T17.15) с CTA ui-button--primary «смотреть треки» (Implementation
 *    requirements п.2: базовый вид 52px, урок T15.6 — не --sm), поднавигация
 *    subnav, ТРИ секции в порядке оригинала career-track.html:147–265:
 *    треки (#tracks: track-tabs + track-chips + имя трека + steps-bar +
 *    step-info — начальный рендер js/tracks.js:19–63 из мока data/tracks.json),
 *    тест на профориентацию (интро + скрытые quiz/result — career-track
 *    .html:187–217), статьи «Может быть интересно» (4 ui-card--media);
 *  - compare.mjs: BLOCK_PROBES career-track — пары блоков (обложка 399,
 *    секция треков 810, тест 551, лента статей 500 оригинала);
 *  - pilot.css: позиционные хуки ctr- (конвенция не-cp имени сайт-зоны,
 *    прецедент stu- T18.1: ценз T17.16 — семейства/allowlist не меняются);
 *    тон точки этапа — одобренный литерал на хуке кастом-свойства
 *    --ctr-step-dot-bg (прецедент --msh-card-active-bg T18.2); без !important;
 *  - ценз: гейт чист (пороги строк подняты errata по процедуре census.mjs —
 *    файл был ровно на потолке 1520/869, прецедент T18.1).
 *
 * Поверхность браузера (docHeight Δ≤60, кнопка ≤4px, блок-пробы) —
 * compare-прогон и DOM-проба .zcode/accept-t184-probe.mjs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { censusMetrics, runCensusGate } from '../../pilot/career-portal/census.mjs';

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
const tracks = JSON.parse(readFileSync(join(pilotDir, 'data', 'tracks.json'), 'utf8'));

/** Разметка careerTrackMain() (один return-шаблон; CRLF нормализуется). */
const trackHtml = (
  build.match(/function careerTrackMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? ''
).replace(/\r\n/g, '\n');

/** Тело careerTrackMain() целиком (до следующей секции build.mjs) — пины
 *  data-driven частей смотрят на код сборки из мока. */
const trackFn = build.slice(
  build.indexOf('function careerTrackMain'),
  build.indexOf('/* ── компании группы'),
);

const firstTab = tracks.tabs[0];
const firstTrack = firstTab.tracks[0];

describe('build.mjs — обложка career-track (T18.4 Goal п.1)', () => {
  it('каркас — канон cvh слоя (T17.15) с хуком позиции, cp-page-head снят', () => {
    expect(trackHtml).toContain('<div class="cvh ctr-cover">');
    expect(trackHtml, 'page-head — прежний каркас без кнопки').not.toContain('cp-page-head');
  });

  it('CTA обложки — ui-button--primary «смотреть треки» на #tracks (оригинал career-track.html:152; базовый вид 52px — урок T15.6, не --sm)', () => {
    expect(trackHtml).toContain(
      '<a class="ui-button ui-button--primary" href="#tracks">смотреть треки</a>',
    );
    expect(trackHtml).not.toContain('ui-button--primary--sm');
    expect(trackHtml).not.toContain('ui-button--sm');
  });

  it('заголовок/подзаголовок — текст оригинала (career-track.html:150–151), подзаголовок на паре cp-page-subtitle × ui-lead', () => {
    expect(trackHtml).toContain('<h1 class="ui-page-title">Карьерные треки</h1>');
    expect(trackHtml).toContain(
      'Просмотрите карьерные траектории в компаниях Группы «Интер РАО»: от первой ступени до руководителя направления.',
    );
    expect(trackHtml).toMatch(/class="cp-page-subtitle ui-lead"/);
  });

  it('поднавигация разделов — subnav (tabs-pill оригинала, career-track.html:155–161)', () => {
    expect(trackHtml).toContain("${subnav('career-track.html')}");
  });
});

describe('build.mjs — секция треков #tracks (T18.4 Goal п.2, каркас career-track.html:166–185)', () => {
  it('секция существует с id="tracks" — цель CTA обложки', () => {
    expect(trackHtml).toContain('<section class="ui-section" id="tracks">');
  });

  it('track-tabs: две кнопки ui-button--outline из вкладок мока, первая активна (is-active — state оригинала career-track.html:169–170)', () => {
    expect(trackHtml).toContain('<div class="ctr-tabs">');
    expect(trackFn).toContain('TRK.tabs.map(');
    expect(trackFn).toContain(
      '`      <button class="ui-button ui-button--outline${index === 0 ? \' is-active\' : \'\'}" type="button">${esc(tab.name)}</button>`',
    );
  });

  it('track-chips — группа ui-chip (канон фильтра T14.8) из треков активной вкладки мока; активный чип — aria-pressed="true" (канон состояния ui-chip, мок-переключение pilot.js)', () => {
    expect(trackHtml).toContain('<div class="ui-chip ctr-chips" data-cp-filter-group>');
    expect(trackFn).toContain('activeTab.tracks.map(');
    expect(trackFn).toContain(
      '`        <button class="ui-chip__pill" type="button" aria-pressed="${index === 0 ? \'true\' : \'false\'}">${esc(track.name)}</button>`',
    );
    expect(firstTab.tracks.length).toBeGreaterThan(1);
  });

  it('имя трека — h2 ui-h3 из мока (JS-наполнение оригинала server-side: начальный рендер js/tracks.js:20)', () => {
    expect(trackHtml).toContain('<h2 class="ui-h3 ctr-name">${esc(activeTrack.name)}</h2>');
  });

  it('steps-bar: пилюли этапа из мока (имя ui-caption + длительность ui-micro; первая is-active — начальный рендер js/tracks.js:34–42)', () => {
    expect(trackHtml).toContain('<div class="ctr-steps">');
    expect(trackFn).toContain('activeTrack.steps.map(');
    expect(trackFn).toContain(
      '`      <button class="ctr-step${index === 0 ? \' is-active\' : \'\'}" type="button">',
    );
    expect(trackFn).toContain('<span class="ctr-step__dot" aria-hidden="true"></span>');
    expect(trackFn).toContain('<span class="ctr-step__name ui-caption">${esc(step.name)}</span>');
    expect(trackFn).toContain(
      '<span class="ctr-step__duration ui-micro">${esc(step.duration)}</span>',
    );
    expect(firstTrack.steps.length).toBe(4);
  });

  it('step-info: 5 строк label/value с подписями оригинала и значениями этапа мока (js/tracks.js:44–57)', () => {
    for (const label of [
      "'Должность', activeStep.position",
      "'Задачи', activeStep.desc",
      "'Образование', activeStep.education",
      "'Повышение квалификации', activeStep.growth",
      "'Соцпакет', activeStep.benefits",
    ]) {
      expect(trackFn).toContain(label);
    }
    expect(trackFn).toContain(
      '<span class="ctr-info__label ui-micro ui-text--muted">${label}</span>',
    );
    expect(trackFn).toContain('<span class="ctr-info__value ui-body">${esc(value)}</span>');
  });
});

describe('build.mjs — секция теста (T18.4, каркас career-track.html:187–217)', () => {
  it('заголовок секции — ui-h3 («.section-title--h3» оригинала: fs-h3 42/1.3)', () => {
    expect(trackHtml).toContain('<h2 class="ui-h3 ctr-title">Тест на профориентацию</h2>');
  });

  it('интро: фото + заголовок/текст/кнопка из мока test.intro (JS-наполнение оригинала server-side: js/tracks.js:112–115)', () => {
    expect(trackHtml).toMatch(/<div class="ctr-test">\s*<img class="ctr-test-photo"/);
    expect(trackHtml).toContain('src="${esc(TRK.test.intro.image)}" alt=""');
    expect(trackHtml).toContain('<h3 class="ui-h3">${esc(TRK.test.intro.title)}</h3>');
    expect(trackHtml).toContain('<p class="ctr-test-text ui-body">${esc(TRK.test.intro.text)}</p>');
    expect(trackHtml).toContain(
      '<button class="ui-button ui-button--primary" type="button">${esc(TRK.test.intro.button)}</button>',
    );
    expect(tracks.test.intro.title).toBe('Тест на профориентацию');
    expect(tracks.test.intro.button).toBe('пройти тест');
  });

  it('quiz/result — в разметке скрыты (hidden), как в оригинале career-track.html:200–214', () => {
    expect(trackHtml).toMatch(/<div class="ctr-quiz" hidden>/);
    expect(trackHtml).toMatch(/<div class="ctr-result" hidden>/);
  });
});

describe('build.mjs — секция статей (T18.4, каркас career-track.html:219–265)', () => {
  it('заголовок «Может быть интересно» (текст оригинала career-track.html:221) + ui-grid--4 из 4 статей (ART.items[:4])', () => {
    expect(trackHtml).toContain('<h2 class="ui-h3 ctr-title">Может быть интересно</h2>');
    expect(trackHtml).toContain('<div class="ui-grid ui-grid--4">');
  });

  it('прежняя композиция снята: «Материалы по теме» и ui-tabs с панелями треков больше не собираются', () => {
    expect(trackHtml).not.toContain('Материалы по теме');
    expect(trackHtml).not.toContain('data-ui-tabs');
    expect(trackHtml).not.toContain('ui-tabs__panel');
  });
});

describe('compare.mjs — блок-пробы career-track (T18.4, практика T18.3)', () => {
  it('BLOCK_PROBES career-track.html: пары обложки/секций (cover 399 / tracks 810 / test 551 / articles 500 оригинала)', () => {
    expect(compare).toMatch(/'career-track\.html':\s*\[/);
    expect(compare).toContain("['ctr-cover', '.cover-hero', '.ctr-cover']");
    expect(compare).toContain("['ctr-tracks', '#tracks', '#tracks']");
    expect(compare).toContain("['ctr-test', '.test', '.ctr-test']");
    expect(compare).toContain("['ctr-articles', '.cards-grid--4', '.ui-grid--4']");
  });
});

describe('pilot.css — позиционные хуки ctr- (T18.4 Scope: без новых cp-сущностей)', () => {
  it('хуки названы ctr- (не cp-): семейства ценза не меняются (прецедент stu- T18.1)', () => {
    expect(pilotCss).toContain('.ctr-cover');
    expect(pilotCss).not.toMatch(/^\.cp-ctr/m);
  });

  it('обложка: форма cover-hero оригинала (pages.css:953–959) — паддинг 64/56 «как есть», фон/радиус токенами, шаг 20; подзаголовок 640px (pages.css:965); кнопка +16px (pages.css:967)', () => {
    const cover = blockOf(pilotCss, '.ctr-cover');
    expect(cover).toContain('padding: 4rem 3.5rem');
    expect(cover).toContain('gap: 1.25rem');
    expect(cover).toContain('var(--ui-color-surface-muted)');
    expect(cover).toContain('var(--ui-radius-md)');
    expect(blockOf(pilotCss, '.ctr-cover .cp-page-subtitle')).toContain('max-width: 40rem');
    expect(blockOf(pilotCss, '.ctr-cover .ui-button')).toContain('margin-top: var(--ui-space-4)');
  });

  it('секция обложки — без верхнего ритма ui-section (оригинал: section style="padding-top: 0", career-track.html:147)', () => {
    expect(blockOf(pilotCss, '.ctr-lead')).toContain('padding-top: 0');
  });

  it('чипы треков: паддинг 10/24, без рамки, тон blue-50/primary (pages.css:682–692); активный — пара ui-chip (aria-pressed)', () => {
    const pill = blockOf(pilotCss, '.ctr-chips .ui-chip__pill');
    expect(pill).toContain('padding: 0.625rem 1.5rem');
    expect(pill).toContain('border: 0');
    expect(pill).toContain('var(--ui-color-surface-muted)');
    expect(pill).toContain('var(--ui-color-primary)');
    expect(pill).toContain('line-height: normal');
  });

  it('активный чип трека — пара канона ui-chip (заливка primary/подпись on-dark, pages.css:692 .track-chip.is-active): хук-пара 0-3-0 старше тон-хука 0-2-0, иначе :where-канон 0-1-0 перебит (ревью T18.4: замер dist — активный неотличим от неактивного)', () => {
    const active = blockOf(pilotCss, ".ctr-chips .ui-chip__pill[aria-pressed='true']");
    expect(active, 'заливка primary').toContain('background-color: var(--ui-color-primary)');
    expect(active, 'подпись on-dark').toContain('color: var(--ui-color-text-on-dark)');
    expect(active, 'рамка primary').toContain('border-color: var(--ui-color-primary)');
  });

  it('этапы: пилюля 14/16 blue-50/radius-sm, активная blue-100 + тень accent «как есть» (pages.css:696–727); точка — одобренный литерал #C4CDDC на хуке --ctr-step-dot-bg (прецедент --msh-card-active-bg T18.2)', () => {
    const step = blockOf(pilotCss, '.ctr-step');
    expect(step).toContain('padding: 0.875rem 1rem');
    expect(step).toContain('var(--ui-color-surface-muted)');
    expect(step).toContain('var(--ui-radius-sm)');
    const stepActive = blockOf(pilotCss, '.ctr-step.is-active');
    expect(stepActive).toContain('var(--ui-color-surface-hover)');
    expect(blockOf(pilotCss, '.ctr-steps')).toContain(
      '--ctr-step-ring: inset 0 0 0 2px var(--ui-color-accent)',
    );
    const dot = blockOf(pilotCss, '.ctr-step__dot');
    expect(dot).toContain('background-color: var(--ctr-step-dot-bg');
    expect(pilotCss).toContain('--ctr-step-dot-bg: #c4cddc');
  });

  it('step-info: паддинг 28, шаг 20, blue-50, radius-md (pages.css:728–734); значение 1.4 «как есть»', () => {
    const info = blockOf(pilotCss, '.ctr-info');
    expect(info).toContain('padding: 1.75rem');
    expect(info).toContain('gap: 1.25rem');
    expect(blockOf(pilotCss, '.ctr-info__value')).toContain('line-height: 1.4');
  });

  it('тест: интро — сетка 480px/1fr от lg (single column — мобильная база; pages.css:737–747, 788), шаг 48 (pages.css:740 — токен space-7; ревью T18.4: space-6 давал 32px вместо 48), фото 240→320, текст 1.45 «как есть»', () => {
    const test = blockOf(pilotCss, '.ctr-test');
    expect(test).toContain('padding: 2rem');
    expect(test).toContain('gap: var(--ui-space-7)');
    expect(test).toContain('grid-template-columns: minmax(0, 1fr)');
    const media = pilotCss.match(
      /@media \(min-width: 1024px\)\s*\{[^@]*?\.ctr-test\s*\{[\s\S]*?\}/,
    );
    expect(media, 'сетка 480px/1fr — ступень lg').not.toBeNull();
    expect(media[0]).toContain('480px minmax(0, 1fr)');
    expect(blockOf(pilotCss, '.ctr-test-photo')).toContain('height: 15rem');
    const photoMedia = pilotCss.match(
      /@media \(min-width: 1024px\)\s*\{[^@]*?\.ctr-test-photo\s*\{[\s\S]*?\}/,
    );
    expect(photoMedia[0]).toContain('height: 20rem');
    expect(blockOf(pilotCss, '.ctr-test-text')).toContain('line-height: 1.45');
  });

  it('без !important и без сырых цветов в цветовых свойствах (инварианты слой-гейтов)', () => {
    const ctrBlock = pilotCss.slice(pilotCss.indexOf('.ctr-lead'));
    expect(ctrBlock).not.toContain('!important');
    expect(ctrBlock).toMatch(/var\(--ui-/);
  });
});

describe('ценз T17.16 — гейт чист после errata T18.4 (потолки строк, семейства не менялись)', () => {
  it('пороги строк подняты errata по процедуре census.mjs (последний ход — T18.5: education edu-; файл был ровно на 1738/1013, прецедент T18.4)', async () => {
    const census = readFileSync(join(pilotDir, 'census.mjs'), 'utf8');
    expect(census).toMatch(/MAX_PILOT_CSS_LINES = 18\d\d/);
    expect(census).toMatch(/MAX_PILOT_CSS_CODE_LINES = 10\d\d/);
    expect(census).toContain('T18.4');
  });

  it('фактические pilot.css/pilot.js проходят гейт: 0 проблем, новых cp-семейств 0', () => {
    const js = readFileSync(join(pilotDir, 'pilot.js'), 'utf8');
    const metrics = censusMetrics(pilotCssRaw.replace(/\r\n/g, '\n'), js.replace(/\r\n/g, '\n'));
    const gate = runCensusGate(metrics);
    expect(gate.problems).toEqual([]);
    expect(gate.newBlocks).toEqual([]);
  });
});
