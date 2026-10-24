/**
 * Юнит-пин промо-блока «бегущие строки» (T16.15; Testing requirements —
 * пины исполняемой формы решения до браузерной пробы — практика
 * pilot-media-filters.test.js T16.14 / pilot-vac-rows.test.js T16.5).
 *
 * Канон — `.adv-marquee` оригинала (pages.css:1058–1081): светлый блок
 * blue-50 с радиусом карточки 16, четыре uppercase-строки 18/13/40/18
 * fw 500 ls 0.02em color primary (--bar/--sm/--xl — по биркам
 * internships.html:247–250). Сайт-зона (DS-компонента нет и не требуется):
 * 40/18/13 — литералы «как есть», вне шкалы ДС (Implementation
 * requirements п.1); uppercase через CSS — контент строчный (a11y).
 *
 * Поверхность браузера (computed original/clone 1440px) — probe-пара
 * `marquee-line` в compare.mjs, проба до/после (.zcode/accept-t1615-*.json)
 * и скрин-пары internships/practices; здесь — пины разметки build.mjs
 * (internshipsMain — общий шаблон обеих страниц), сайт-зоны pilot.css
 * (токены --ui-*, box-sizing ADR-0002, без hex/!important) и пробы.
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

/** Тело internshipsMain целиком (до `}` в начале строки — общий шаблон
 *  internships.html/practices.html, блок marquee живёт в нём). */
const internshipsMainBody = build.match(/function internshipsMain[\s\S]*?\n\}\n/)?.[0] ?? '';

describe('build.mjs — бирки строк marquee по ролям оригинала (T16.15 Scope)', () => {
  it('лента: подписи --bar (18px), мелкая --sm (13px), базовая крупная --xl (40px) — internships.html:247–250', () => {
    expect(internshipsMainBody).toContain(
      '<span class="cp-adv-marquee__line cp-adv-marquee__line--bar">Группа «Интер РАО»</span>',
    );
    expect(internshipsMainBody).toMatch(
      /cp-adv-marquee__line cp-adv-marquee__line--sm">оплачиваемые программы/,
    );
    expect(internshipsMainBody).toMatch(
      /cp-adv-marquee__line cp-adv-marquee__line--xl">НАЧНИ КАРЬЕРУ/,
    );
    expect(internshipsMainBody).toMatch(
      /cp-adv-marquee__line cp-adv-marquee__line--bar">опыт · наставники/,
    );
  });

  it('базовый класс строки без «голых» вхождений: каждая строка несёт модификатор размера (замер 40/18/13, REPORT §9.1 №6)', () => {
    const lines = internshipsMainBody.match(/<span class="cp-adv-marquee__line[^"]*">/g) ?? [];
    expect(lines.length).toBe(4);
    for (const line of lines) {
      expect(line, `модификатор у ${line}`).toMatch(/cp-adv-marquee__line--(bar|sm|xl)/);
    }
  });

  it('aria-hidden ленты сохранён (визуальная типографика — дубликат смысла, контент строчный)', () => {
    expect(internshipsMainBody).toContain('<div class="cp-adv-marquee__type" aria-hidden="true">');
  });
});

describe('pilot.css — блок и строки по канону .adv-marquee (pages.css:1058–1081)', () => {
  it('блок: светлый фон --ui-color-surface-muted (blue-50), отступы/гэп 48 (--ui-space-7), колонки 1.2fr 1fr, радиус 16 (--ui-radius-md), box-sizing ADR-0002', () => {
    const block = blockOf(pilotCss, '.cp-adv-marquee');
    expect(block, '.cp-adv-marquee найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('grid-template-columns: 1.2fr 1fr;');
    expect(block).toContain('gap: var(--ui-space-7);');
    expect(block).toContain('padding: var(--ui-space-7);');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block, 'белый текст на dark снят (REPORT §9.1 №6)').not.toContain('text-on-dark');
    expect(block, 'bg primary (тёмный) снят').not.toContain(
      'background-color: var(--ui-color-primary)',
    );
  });

  it('лента: гэп 12px (--ui-space-3 — pages.css:1068) и min-width: 0', () => {
    const type = blockOf(pilotCss, '.cp-adv-marquee__type');
    expect(type).toContain('gap: var(--ui-space-3);');
    expect(type).toContain('min-width: 0;');
  });

  it('строка-база: color primary, fw 500 (--ui-fw-body-bold), ls 0.02em, uppercase через CSS (a11y: контент строчный)', () => {
    const line = blockOf(pilotCss, '.cp-adv-marquee__line');
    expect(line).toContain('color: var(--ui-color-primary);');
    expect(line).toContain('font-weight: var(--ui-fw-body-bold);');
    expect(line).toContain('letter-spacing: 0.02em;');
    expect(line).toContain('text-transform: uppercase;');
  });

  it('размеры «как есть» (вне шкалы ДС — Implementation requirements п.1): --bar 18, --sm 13 × fw-small, --xl 40/1.15/ls 0', () => {
    const bar = blockOf(pilotCss, '.cp-adv-marquee__line--bar');
    expect(bar).toContain('font-size: 1.125rem;');
    const sm = blockOf(pilotCss, '.cp-adv-marquee__line--sm');
    expect(sm).toContain('font-size: 0.8125rem;');
    expect(sm).toContain('font-weight: var(--ui-fw-small);');
    const xl = blockOf(pilotCss, '.cp-adv-marquee__line--xl');
    expect(xl).toContain('font-size: 2.5rem;');
    expect(xl).toContain('line-height: 1.15;');
    expect(xl).toContain('letter-spacing: 0;');
    expect(xl).toContain('white-space: normal;');
    expect(xl, 'роль ui-h3 снята (42/500 — замер раунда 4)').not.toContain('--ui-fs-h3');
  });

  it('в зоне marquee нет hex и !important (инварианты системы; hex только в tokens/primitives.css)', () => {
    const start = pilotCss.indexOf('.cp-adv-marquee {');
    const end = pilotCss.indexOf('.cp-timeline');
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — probe-пара marquee-line (T16.15; REPORT §9.2: пик раунда 4 гейтится машинно)', () => {
  it('пара .adv-marquee__line--xl → .cp-adv-marquee__line--xl: fs/fw/color/ls/tt + высота (rect); первое вхождение — internships.html', () => {
    expect(compare).toContain("name: 'marquee-line'");
    expect(compare).toContain("original: '.adv-marquee__line--xl'");
    expect(compare).toContain("pilot: '.cp-adv-marquee__line--xl'");
    expect(compare).toMatch(/name:\s*'marquee-line'[\s\S]{0,400}?rect:\s*true/);
  });
});
