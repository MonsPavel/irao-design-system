/**
 * Юнит-пин шрифтов и reset (задача T3.1; Testing requirements).
 *
 * Поверхность e2e — сеть/fonts.check/фолбэк — в tests/e2e/fonts.spec.js;
 * здесь — побайтовые пины переноса и присутствие файлов:
 *  - assets/fonts/: 6 woff2 Golos (400/500/600 × cyr/lat) + OFL-LICENSE.txt —
 *    источник копии dist/fonts (showcase/build.mjs copyFonts);
 *  - base/fonts.css: 6 @font-face, font-display: swap, unicode-range —
 *    байт-в-байт из career-portal (css/base.css:8/16, класс A аудита);
 *  - base/reset.css: правила career-portal (box-sizing, [hidden] !important,
 *    scrollbar-gutter: stable, img, ресет отступов, reduced-motion
 *    kill-switch); !important в файле — ровно 5 (осознанные исключения,
 *    каждое помечено inline-disable с обоснованием);
 *  - preload-сниппет (golos-400-cyr, golos-500-cyr): в каркасе showcase
 *    (генератор showcase/build.mjs; живой DOM — e2e) и в заготовке
 *    bitrix-сниппета;
 *  - правило ADR-0002 «компонент объявляет свой box-sizing» — в CONTRIBUTING
 *    (AC T3.1).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const FONTS = [
  'golos-400-cyr.woff2',
  'golos-400-lat.woff2',
  'golos-500-cyr.woff2',
  'golos-500-lat.woff2',
  'golos-600-cyr.woff2',
  'golos-600-lat.woff2',
];

/**
 * CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки
 * (шапка упоминает @font-face и !important — и это не объявления).
 */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** career-portal css/base.css:8 — кириллица. */
const UNICODE_RANGE_CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
/** career-portal css/base.css:16 — латиница и пунктуация. */
const UNICODE_RANGE_LAT =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

describe('assets/fonts — источник поставки шрифтов (T3.1)', () => {
  it('6 woff2 Golos (400/500/600 × cyr/lat) + OFL-LICENSE.txt на месте', () => {
    for (const name of [...FONTS, 'OFL-LICENSE.txt']) {
      expect(existsSync(join(root, 'assets', 'fonts', name)), name).toBe(true);
    }
  });

  it('OFL-LICENSE.txt — текст SIL OFL 1.1 проекта Golos Text', () => {
    const text = readFileSync(join(root, 'assets', 'fonts', 'OFL-LICENSE.txt'), 'utf8');
    expect(text).toContain('The Golos Text Project Authors');
    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});

describe('base/fonts.css — 6 @font-face Golos Text (порт career-portal)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'fonts.css'), 'utf8'));
  const blocks = css.split('@font-face').slice(1);

  it('ровно 6 @font-face; в каждом — family «Golos Text», normal, font-display: swap', () => {
    expect(blocks).toHaveLength(6);
    for (const block of blocks) {
      expect(block).toContain("font-family: 'Golos Text'");
      expect(block).toContain('font-style: normal');
      expect(block).toContain('font-display: swap');
    }
  });

  it.each([
    ['400', 'cyr'],
    ['400', 'lat'],
    ['500', 'cyr'],
    ['500', 'lat'],
    ['600', 'cyr'],
    ['600', 'lat'],
  ])(
    '%s %s — url() под dist-структуру и unicode-range байт-в-байт из career-portal',
    (weight, subset) => {
      const block = blocks.find(
        (b) =>
          b.includes(`font-weight: ${weight};`) && b.includes(`golos-${weight}-${subset}.woff2`),
      );
      expect(block, `блок ${weight}/${subset} существует`).toBeTruthy();
      expect(block).toContain(`src: url('fonts/golos-${weight}-${subset}.woff2') format('woff2')`);
      // prettier переносит длинное lat-значение — сравниваем значение с
      // нормализованными пробелами: список range-значений байт-в-байт.
      expect(block.replace(/\s+/g, ' ')).toContain(
        `unicode-range: ${subset === 'cyr' ? UNICODE_RANGE_CYR : UNICODE_RANGE_LAT}`,
      );
    },
  );
});

describe('base/reset.css — безопасный глобальный reset (порт career-portal)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'reset.css'), 'utf8'));

  it('универсальный box-sizing: border-box (глобально)', () => {
    expect(css).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box;\s*\}/);
  });

  it('[hidden] всегда сильнее любых display-правил (career-portal как есть)', () => {
    expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
  });

  it('html — scrollbar-gutter: stable (сетка не сдвигается при появлении скролла)', () => {
    expect(css).toMatch(/html\s*\{\s*scrollbar-gutter:\s*stable;\s*\}/);
  });

  it('img — display: block + max-width: 100%', () => {
    expect(css).toMatch(/img\s*\{\s*display:\s*block;\s*max-width:\s*100%;\s*\}/);
  });

  it('ресет отступов career-portal: body, h1–h4/p, ul/ol', () => {
    expect(css).toMatch(/body\s*\{\s*margin:\s*0;\s*\}/);
    expect(css).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*p\s*\{\s*margin:\s*0;\s*\}/);
    expect(css).toMatch(/ul,\s*ol\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*list-style:\s*none;\s*\}/);
  });

  it('глобальный prefers-reduced-motion kill-switch (значения career-portal)', () => {
    const media = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}/);
    expect(media, 'kill-switch присутствует').toBeTruthy();
    const block = media[1];
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(block).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });

  it('!important в base/reset.css — ровно 5 осознанных ([hidden] + 4 kill-switch), лишних нет', () => {
    expect(css.match(/!important/g)).toHaveLength(5);
  });
});

describe('preload-сниппет (golos-400-cyr, golos-500-cyr) — Scope T3.1', () => {
  it('генератор каркаса showcase (showcase/build.mjs) препружаргружает оба шрифта', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toContain('rel="preload"');
    expect(build).toContain('golos-400-cyr.woff2');
    expect(build).toContain('golos-500-cyr.woff2');
    expect(build).toMatch(/as="font"\s+type="font\/woff2"/);
    expect(build).toContain('crossorigin');
  });

  it('заготовка bitrix-сниппета подключает ui-core и препружаргружает оба шрифта', () => {
    const snippetPath = join(root, 'bitrix', 'snippets', 'header-php.snippet.php');
    expect(existsSync(snippetPath), 'bitrix/snippets/header-php.snippet.php существует').toBe(true);
    const snippet = readFileSync(snippetPath, 'utf8');
    expect(snippet).toContain('ui-core.min.css');
    expect(snippet).toContain('rel="preload"');
    expect(snippet).toContain('golos-400-cyr.woff2');
    expect(snippet).toContain('golos-500-cyr.woff2');
  });
});

describe('CONTRIBUTING — правило ADR-0002 (AC T3.1)', () => {
  const contributing = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8');

  it('компонент объявляет свой box-sizing и не полагается на глобальный сброс base/reset.css', () => {
    expect(contributing).toContain('ADR-0002');
    expect(contributing).toMatch(/объявляет\s+свой\s+`?box-sizing/);
    expect(contributing).toContain('base/reset.css');
  });
});
