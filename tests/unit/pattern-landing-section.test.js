/**
 * Юнит-пины T8.3 — паттерн «Landing-секция» (patterns/landing-section/):
 * правила сборки лендинг-секций из системных примитивов + mini-эталон
 * из трёх секций (светлая / тёмная / с-фоном).
 *
 * Исполняемая форма решения (спека T8.3, Scope + Technical considerations):
 *  - секция = ui-section + ui-container + заголовок-роль (h2) + сетка
 *    карточек (ui-grid--3 + ui-card) — каркас из готовых примитивов;
 *  - тёмная секция: фон — семантика --ui-color-primary-deep (surface-inverse-
 *    пара), текст — on-dark-пары токенов (--ui-color-text-on-dark[-muted]);
 *    все пары on-dark проходят контраст-гейт T2.3 (npm run test:contrast);
 *  - full-bleed внутри контейнера (правила T4.6): отрицательные margin от
 *    container-pad (токенизированные ступени --ui-container-pad{-md,-lg}),
 *    изображение — ui-image--cover + ui-image--ratio-* (фиксация места);
 *  - правило границы «система / сайт» — в README паттерна и CONTRIBUTING
 *    (итог EPIC-8): контент и уникальный дизайн секции — сайт; каркас
 *    (секция/сетка/типографика/карточки/кнопки) — система.
 * Поверхность браузера (3 секции, on-dark computed-цвета, bleed-геометрия,
 * axe, адаптив, эталоны) — tests/e2e/pattern-landing-section.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'landing-section', 'landing-section.html');
const readmePath = join(root, 'patterns', 'landing-section', 'README.md');

/** Разметка без связующих <style> (для пинов порядка DOM). */
const markupOf = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '');

describe('patterns/landing-section/landing-section.html — mini-эталон из 3 секций (Scope T8.3)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('три секции-варианта на одном стенде: светлая → тёмная → с-фоном', () => {
    const markup = markupOf(pattern);
    const anchors = ['id="lsp-light"', 'id="lsp-dark"', 'id="lsp-image"'];
    const indexes = anchors.map((marker) => markup.indexOf(marker));
    for (let i = 0; i < anchors.length; i += 1) {
      expect(indexes[i], `якорь «${anchors[i]}» на месте`).toBeGreaterThan(-1);
    }
    for (let i = 1; i < indexes.length; i += 1) {
      expect(indexes[i], `секция «${anchors[i]}» в DOM позже «${anchors[i - 1]}»`).toBeGreaterThan(
        indexes[i - 1],
      );
    }
  });

  it('каркас каждой секции: ui-section + ui-container + заголовок-роль h2 (aria-labelledby)', () => {
    for (const id of ['lsp-light', 'lsp-dark', 'lsp-image']) {
      const section = pattern.match(new RegExp(`<section[^>]*id="${id}"[^>]*>`)) ?? [''];
      expect(section[0], `секция ${id} — ui-section`).toContain('ui-section');
      expect(section[0], `секция ${id} именована через aria-labelledby`).toContain(
        'aria-labelledby',
      );
    }
    const containers = pattern.match(/class="[^"]*ui-container[^"]*"/g) ?? [];
    expect(
      containers.length,
      'каждая секция несёт контейнер (3 секции + фон-секция при вложенном контейнере)',
    ).toBeGreaterThanOrEqual(3);
    const headings = pattern.match(/<h2\b[^>]*ui-h2[^>]*>/g) ?? [];
    expect(
      headings.length,
      'заголовок-роль ui-h2 в каждой секции (3 секции)',
    ).toBeGreaterThanOrEqual(3);
  });

  it('сетки карточек: ui-grid--3 + ui-card--hover ui-card--link; заголовки карточек — h3', () => {
    const grids = pattern.match(/class="ui-grid ui-grid--3[^"]*"/g) ?? [];
    expect(grids.length, 'сетка --3 в секциях (светлая и тёмная)').toBeGreaterThanOrEqual(2);
    const cards = pattern.match(/ui-card--link/g) ?? [];
    expect(cards.length, 'карточки — паттерн карточки-ссылки T4.4').toBeGreaterThanOrEqual(3);
    const cardTitles = pattern.match(/<h3 class="ui-h3 ui-card__title">/g) ?? [];
    expect(
      cardTitles.length,
      'заголовки карточек — h3 (у секции есть h2: h2 → h3 без пропусков, T8.2-прецедент)',
    ).toBeGreaterThanOrEqual(3);
  });

  it('тёмная секция: фон — семантика primary-deep (Technical considerations), текст — on-dark-пары', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(
      style[1],
      'фон тёмной секции — --ui-color-primary-deep (surface-inverse-пара, Technical considerations)',
    ).toMatch(/--ui-color-primary-deep/);
    expect(style[1], 'текст на тёмном — --ui-color-text-on-dark (пара гейта T2.3)').toMatch(
      /--ui-color-text-on-dark/,
    );
    expect(
      style[1],
      'вторичный текст на тёмном — --ui-color-text-on-dark-muted (пара гейта T2.3)',
    ).toMatch(/--ui-color-text-on-dark-muted/);
    // Карточки на тёмном — светлые ui-card: их текст остаётся в паре
    // text-on-surface (контраст-гейт), перекраска карточек не требуется.
    const dark = pattern.match(/id="lsp-dark"[\s\S]*?(?=id="lsp-image")/) ?? [''];
    expect(dark[0], 'в тёмной секции карточки — обычные светлые ui-card').toContain('ui-card');
  });

  it('full-bleed внутри контейнера (Technical considerations): отрицательные margin от container-pad', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(
      style[1],
      'база — отрицательный margin от --ui-container-pad (токенизированный, не «-16px»)',
    ).toMatch(/calc\(-1 \* var\(--ui-container-pad\)\)/);
    expect(style[1], 'ступень md — --ui-container-pad-md (768)').toMatch(
      /@media \(min-width: 768px\)[\s\S]*?var\(--ui-container-pad-md\)/,
    );
    expect(style[1], 'ступень lg — --ui-container-pad-lg (1024)').toMatch(
      /@media \(min-width: 1024px\)[\s\S]*?var\(--ui-container-pad-lg\)/,
    );
  });

  it('изображение full-bleed — по правилам T4.6: ui-image--cover + ui-image--ratio + размеры + lazy', () => {
    const img = pattern.match(/<img\b[^>]*class="[^"]*ui-image[^"]*"[^>]*>/) ?? [''];
    expect(img[0], 'изображение секции — компонент ui-image (T4.6)').not.toBe('');
    expect(img[0], 'кадрирование — object-fit: cover').toContain('ui-image--cover');
    expect(img[0], 'место зафиксировано aspect-ratio из шкалы (--ratio-16-9)').toContain(
      'ui-image--ratio-16-9',
    );
    expect(img[0], 'атрибуты width/height обязательны (гейт irao/img-dimensions)').toMatch(
      /width="\d+"[^>]*height="\d+"|height="\d+"[^>]*width="\d+"/,
    );
    expect(img[0], 'вне первого экрана — loading="lazy"').toContain('loading="lazy"');
  });

  it('связующие стили паттерна — только токены, без hex и !important (граница «showcase, не dist»)', () => {
    expect(pattern, 'связки живут <style> стенда, не в dist').toContain('<style>');
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'hex в связках запрещён (инвариант системы)').not.toMatch(
      /#[0-9a-fA-F]{3,8}\b/,
    );
    expect(style[1], '!important в связках запрещён (инвариант системы)').not.toContain(
      '!important',
    );
    expect(style[1], 'связки паттерна именованы lsp-*').toContain('.lsp-');
  });

  it('media в связках — только min-width из шкалы брейкпоинтов T2.5', () => {
    const styles = pattern.match(/<style>([\s\S]*?)<\/style>/g) ?? [];
    const media = (styles.join('').match(/@media[^{]+/g) ?? []).map((m) => m.trim());
    for (const query of media) {
      expect(query, `media-запрос «${query}» — mobile-first min-width`).toMatch(
        /^@media \(min-width: (?:480|768|1024|1280|1440)px\)$/,
      );
    }
    expect(media.length, 'ступени md и lg bleed-отступов заданы').toBeGreaterThanOrEqual(2);
  });

  it('без inline-стилей (инвариант системы: перекраска vi.css накрывает всё)', () => {
    const markup = markupOf(pattern);
    expect(markup, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });

  it('уникальный дизайн секций НЕ тащится в систему: декоративные приёмы — связки lsp-*', () => {
    // Никаких новых компонентов: только классы ui-* и связки lsp-* (зона сайта).
    const classes = [...markupOf(pattern).matchAll(/class="([^"]+)"/g)]
      .flatMap(([, value]) => value.split(/\s+/))
      .filter(Boolean);
    const foreign = classes.filter(
      (cls) =>
        cls !== 'ui-showcase-stand__note' && !cls.startsWith('ui-') && !cls.startsWith('lsp-'),
    );
    expect(
      foreign,
      `все классы эталона — ui-* либо связки lsp-* (найдено: ${foreign.join(', ')})`,
    ).toEqual([]);
  });
});

describe('patterns/landing-section/README.md — правила секций и граница «система / сайт» (AC)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('формула секции: ui-section + контейнер + заголовок-роль + сетка карточек', () => {
    for (const marker of ['ui-section', 'ui-container', 'ui-grid', 'ui-card']) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
    expect(readme, 'заголовок секции — роль типографики («классы, а не теги»)').toContain('ui-h2');
  });

  it('правило границы (итог EPIC-8): контент/уникальный дизайн — сайт, каркас — система', () => {
    expect(readme, 'контент и уникальный дизайн секции — зона сайта').toContain('сайт');
    expect(readme, 'каркас (секция/сетка/типографика/карточки/кнопки) — система').toContain(
      'система',
    );
    expect(readme, 'нового CSS в системе нет (граница паттернов)').toContain('CSS');
  });

  it('тёмные секции: on-dark-пары токенов проходят контраст-гейт T2.3', () => {
    expect(readme, 'пары on-dark названы').toContain('on-dark');
    expect(readme, 'контраст-гейт — npm run test:contrast (T2.3)').toContain('test:contrast');
  });

  it('full-bleed: отрицательные margin от container-pad, токенизированные ступени', () => {
    expect(readme, 'приём full-bleed задокументирован').toContain('container-pad');
    expect(readme, 'изображение — правила T4.6 (--cover/--ratio)').toContain('ui-image');
  });

  it("Do / Don't: уникальный дизайн секций не переносится в систему", () => {
    expect(readme, "Do/Don't секция есть").toContain("Don't");
    expect(readme, 'герой-блоки/уникальные макеты — зона сайтов (Out of scope)').toContain(
      'сайтов',
    );
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/landing-section.html', () => {
  it('build.mjs читает patterns/landing-section/landing-section.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'landing-section', 'landing-section.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'landing-section.html'`);
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('каркас стенда БЕЗ служебного h1: секции лендинга несут h2 (лендинг-секция не страница)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/landing-section'));
    expect(block).toContain('Без служебного h1');
  });
});
