/**
 * Юнит-пин промо-блока «бегущие строки» (T16.15; Testing requirements —
 * пины исполняемой формы решения до браузерной пробы — практика
 * pilot-media-filters.test.js T16.14 / pilot-vac-rows.test.js T16.5).
 *
 * Канон — `.adv-marquee` оригинала (pages.css:1058–1081): светлый блок
 * blue-50 с радиусом карточки 16, четыре uppercase-строки 18/13/40/18
 * fw 500 ls 0.02em color primary (--bar/--sm/--xl — по биркам
 * internships.html:247–250).
 *
 * Миграция T17.15: связка переехала в паттерн-слой — канон `mrq`
 * (patterns/patterns.css → dist/ui-patterns.css, пины значений —
 * tests/unit/landing-compositions.test.js); разметка build.mjs
 * (internshipsMain — общий шаблон обеих страниц) несёт классы канона,
 * сайт-зонные cp-adv-marquee* сняты из pilot.css. Сайт-зоны в блоке нет.
 *
 * Поверхность браузера (computed original/clone 1440px) — probe-пара
 * `marquee-line` в compare.mjs (крючок слоя), проба до/после
 * (.zcode/accept-t1615-*.json) и скрин-пары internships/practices;
 * здесь — пины разметки build.mjs и пробы.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев; CRLF-хост нормализуется (tests/unit/link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

/** Тело internshipsMain целиком (до `}` в начале строки — общий шаблон
 *  internships.html/practices.html, блок marquee живёт в нём). */
const internshipsMainBody = build.match(/function internshipsMain[\s\S]*?\n\}\n/)?.[0] ?? '';

describe('build.mjs — бирки строк marquee по ролям оригинала (T16.15 Scope; классы канона mrq — T17.15)', () => {
  it('лента: подписи --bar (18px), мелкая --sm (13px), базовая крупная --xl (40px) — internships.html:247–250', () => {
    expect(internshipsMainBody).toContain(
      '<span class="mrq__line mrq__line--bar">Группа «Интер РАО»</span>',
    );
    expect(internshipsMainBody).toMatch(/mrq__line mrq__line--sm">оплачиваемые программы/);
    expect(internshipsMainBody).toMatch(/mrq__line mrq__line--xl">НАЧНИ КАРЬЕРУ/);
    expect(internshipsMainBody).toMatch(/mrq__line mrq__line--bar">опыт · наставники/);
  });

  it('базовый класс строки без «голых» вхождений: каждая строка несёт модификатор размера (замер 40/18/13, REPORT §9.1 №6)', () => {
    const lines = internshipsMainBody.match(/<span class="mrq__line[^"]*">/g) ?? [];
    expect(lines.length).toBe(4);
    for (const line of lines) {
      expect(line, `модификатор у ${line}`).toMatch(/mrq__line--(bar|sm|xl)/);
    }
  });

  it('aria-hidden ленты сохранён (визуальная типографика — дубликат смысла, контент строчный)', () => {
    expect(internshipsMainBody).toContain('<div class="mrq__type" aria-hidden="true">');
  });

  it('блок — канон mrq паттерн-слоя; cp-дубликаты из pilot.css сняты (T17.15)', () => {
    expect(internshipsMainBody, 'блок — связка mrq').toContain('<div class="mrq">');
    expect(pilotCss, 'cp-adv-marquee* сняты (канон — слой, T17.15)').not.toContain(
      '.cp-adv-marquee',
    );
  });
});

describe('compare.mjs — probe-пара marquee-line (T16.15; REPORT §9.2: пик раунда 4 гейтится машинно)', () => {
  it('пара .adv-marquee__line--xl → .mrq__line--xl: fs/fw/color/ls/tt + высота (rect); первое вхождение — internships.html', () => {
    expect(compare).toContain("name: 'marquee-line'");
    expect(compare).toContain("original: '.adv-marquee__line--xl'");
    expect(compare, 'проба — на крючке слоя (T17.15)').toContain("pilot: '.mrq__line--xl'");
    expect(compare).toMatch(/name:\s*'marquee-line'[\s\S]{0,400}?rect:\s*true/);
  });
});
