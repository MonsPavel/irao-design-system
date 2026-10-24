/**
 * Юнит-пин фильтров медиа-каталога (T16.14; Testing requirements —
 * пины исполняемой формы решения до браузерной пробы — практика
 * pilot-vac-rows.test.js T16.5).
 *
 * Канон — `.tag--blue.filter-tag` оригинала (media.html:156–165 + pages.css:596):
 * синие теги-пилюли 40px (bg blue-100, text primary, radius pill, fs 14,
 * fw 500 от .tag --fw-caption, ls 0.02em; активный — inline
 * `background: var(--color-primary); color: #fff` — плашка primary/
 * text-on-dark). ДС-вариант A спеки: модификатор `ui-tag--filter` поверх
 * `ui-tag--blue` — первый потребитель цветного тега в роли фильтра.
 *
 * Поверхность браузера (computed original/clone 1440px) — probe-пара
 * `filter-tag` в compare.mjs и скрин-пара media.html; здесь — пины
 * разметки build.mjs (mediaMain), сайт-зоны pilot.css (токены --ui-*,
 * box-sizing ADR-0002, без hex/!important) и пробы.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев; CRLF-хост нормализуется (tests/unit/link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

/** Тело mediaMain целиком (до `}` в начале строки — вложенные скобки
 *  отступом). Рубрики: articles.json — источник второй группы. */
const mediaMainBody = build.match(/function mediaMain[\s\S]*?\n\}\n/)?.[0] ?? '';

const FILTER_CLASS = 'ui-tag ui-tag--blue ui-tag--filter';

describe('build.mjs — фильтры обеих групп как ui-tag--blue × ui-tag--filter (T16.14 Scope, вариант A)', () => {
  it('«Тип контента»: активный фильтр — ссылка с aria-current="page" (Implementation requirements п.1: состояние через ARIA, как в ui-chip; без JS)', () => {
    expect(mediaMainBody).toContain(
      `<a class="${FILTER_CLASS}" href="media.html" aria-current="page">Все</a>`,
    );
    for (const label of ['статьи', 'видео', 'подкасты']) {
      expect(mediaMainBody).toContain(`<a class="${FILTER_CLASS}" href="media.html">${label}</a>`);
    }
  });

  it('«Рубрики»: та же связка ui-tag--blue ui-tag--filter (одно решение на обе группы; ART.rubrics)', () => {
    expect(mediaMainBody).toMatch(
      /ART\.rubrics[\s\S]*?`<a class="ui-tag ui-tag--blue ui-tag--filter" href="media\.html">/,
    );
  });

  it('чипы в тулбаре сняты: ни nav.ui-chip, ни ui-chip__pill в mediaMain ( REPORT §9.1 №5: белые пилюли 36px — отклонение)', () => {
    expect(mediaMainBody, 'ui-chip__pill не остаётся').not.toContain('ui-chip__pill');
    expect(mediaMainBody, 'nav.ui-chip не остаётся').not.toContain('class="ui-chip"');
  });

  it('подписи групп сохраняют ui-tag--gray (Scope: «Тип контента:»/«Рубрики:» — аннотации 28px, не фильтры)', () => {
    expect(mediaMainBody).toContain('<span class="ui-tag ui-tag--gray">Тип контента:</span>');
    expect(mediaMainBody).toContain('Рубрики:</span>');
    expect(mediaMainBody).toMatch(/class="ui-tag ui-tag--gray[^"]*">Рубрики:</);
  });

  it('фильтр-ссылки без inline-стилей (VI-инвариант §5): активный вид несёт ДС-крючок aria-current, не style="background…"', () => {
    expect(mediaMainBody).not.toMatch(/<a[^>]*style=/);
  });
});

describe('pilot.css — тулбар cp-media-toolbar по канону (T16.14 Scope: минимальный align, зазоры по замеру)', () => {
  it('зазор ленты 12px (--ui-space-3 — .media-toolbar pages.css:594: flex/wrap/gap 12px); выравнивание подписей — центр (оригинал align-self: center на span)', () => {
    const toolbar = blockOf(pilotCss, '.cp-media-toolbar');
    expect(toolbar, '.cp-media-toolbar найдено').toBeTruthy();
    expect(toolbar).toContain('box-sizing: border-box;');
    expect(toolbar).toContain('display: flex;');
    expect(toolbar).toContain('flex-wrap: wrap;');
    expect(toolbar).toContain('gap: var(--ui-space-3);');
    expect(toolbar, 'зазор 8px (--ui-space-2) снят').not.toContain('gap: var(--ui-space-2);');
    expect(toolbar).toContain('align-items: center;');
  });

  it('группа-обёртка nav плоская в ленте (display: contents): перенос фильтров — поэлементный, как у оригинала; nav остаётся именованным landmark-маркером', () => {
    const group = blockOf(pilotCss, '.cp-media-toolbar__group');
    expect(group, '.cp-media-toolbar__group найдено').toBeTruthy();
    expect(group).toContain('display: contents;');
  });

  it('«Рубрики:» — отступ группы 24px (--ui-space-5; оригинал media.html:160 inline margin-left: 24px — без inline-стилей)', () => {
    const label = blockOf(pilotCss, '.cp-media-toolbar__rubrics-label');
    expect(label, 'крючок подписи рубрик найден').toBeTruthy();
    expect(label).toContain('margin-left: var(--ui-space-5);');
  });

  it('в зоне тулбара нет hex и !important (инварианты системы)', () => {
    const start = pilotCss.indexOf('.cp-media-toolbar');
    const end = pilotCss.indexOf('.cp-offer-card');
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — probe-пара filter-tag (T16.14; REPORT §9.2: пик раунда 4 гейтится машинно)', () => {
  it('пара .filter-tag → .ui-tag--filter: bg/цвет/радиус/типографика + высота (rect); первое вхождение на media.html — активный «Все» на обеих сторонах', () => {
    expect(compare).toContain("name: 'filter-tag'");
    expect(compare).toContain("original: '.filter-tag'");
    expect(compare).toContain("pilot: '.ui-tag--filter'");
    expect(compare).toMatch(/name:\s*'filter-tag'[\s\S]{0,400}?rect:\s*true/);
  });
});
