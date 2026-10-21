/**
 * Юнит-пин ui-chip (задача T14.8; Testing requirements).
 *
 * Компонент без JS-модуля: активное состояние приходит из разметки/сервера
 * (как aria-current в ui-breadcrumbs), клики — нативные. Поверхность браузера
 * (axe, клавиатура Tab/Enter, активные состояния, контраст, эталоны) —
 * tests/e2e/chip.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: высота пилюли 36px (--ui-chip-height, career-portal
 *    .chip pages.css:139 — перенос «как есть», 36px вне шкалы §3.2);
 *  - components/ui-chip/ui-chip.css: блок-группа (flex/wrap/gap — .chip-row
 *    pages.css:135, gap 8px на шкале) + элемент-пилюля __pill; box-sizing на
 *    корне обоих (ADR-0002); цвета — только токены слоя 2; min-height вместо
 *    height (прецедент T4.2); типографика — роль small (Scope: fs-small,
 *    fw-small); hover только под (hover: hover) и не на активных (прецедент
 *    ui-pagination); активное состояние — селектор ARIA-атрибутов
 *    [aria-pressed='true'] / [aria-current='page'], НЕ класс (класс is-active
 *    оригинала не переносится, Technical considerations);
 *  - инварианты системы: без !important, без hex, без фиксированных высот;
 *  - канонический паттерн: кнопочная форма (type="button" — гейт
 *    no-implicit-button-type, aria-pressed) и ссылочная (href,
 *    aria-current="page" на активной); группы с доступными именами; без
 *    inline-стилей (VI-инвариант §5);
 *  - стенд showcase/pages/ui-chip: обе формы, активные состояния, длинные
 *    RU-подписи;
 *  - 'ui-chip' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - пары chip-default/chip-active в tests/contrast/pairs.config.mjs —
 *    семантическими токенами (Implementation requirements п.1: контраст
 *    активного/дефолтного состояний в гейте);
 *  - README компонента: границы ui-chip/ui-tag/ui-dropdown, правило активного
 *    состояния (ARIA-атрибут, не класс), touch-компромисс 36px/44px, no-JS
 *    деградация (ссылки работают, кнопки сабмитят форму).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('tokens/semantic.css — чип-токен (Implementation requirements T14.8)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('высота пилюли — токен 2.25rem (36px career-portal .chip pages.css:139)', () => {
    expect(source).toMatch(/--ui-chip-height:\s*2\.25rem;/);
  });
});

describe('components/ui-chip/ui-chip.css — группа и пилюля (ADR-0002)', () => {
  const path = join(root, 'components', 'ui-chip', 'ui-chip.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define chip — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define chip */')).toBe(true);
  });

  it('.ui-chip: box-sizing на корне; группа — flex/wrap/gap 8px (.chip-row pages.css:135, ступень шкалы)', () => {
    const block = blockOf(css, '.ui-chip');
    expect(block, 'правило .ui-chip найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-wrap: wrap;');
    expect(block).toContain('gap: var(--ui-space-2);');
  });

  it('.ui-chip__pill: box-sizing; min-height (не height) из токена; паддинг 0 16px — ступень шкалы', () => {
    const block = blockOf(css, '.ui-chip__pill');
    expect(block, 'правило .ui-chip__pill найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('min-height: var(--ui-chip-height);');
    // Прецедент T4.2: min-height (32px-база T3.6 растит компонент вместе с
    // текстом); фиксированный height запрещён.
    expect(block).not.toMatch(/(?:^|\n)\s*height:\s*var\(--ui-chip-height\);/);
    expect(block).toContain('padding: 0 var(--ui-space-4);');
  });

  it('пилюля — коробка одобренного .chip: рамка #D6D6D6 токенами, радиус pill, фон surface', () => {
    const block = blockOf(css, '.ui-chip__pill');
    expect(block).toContain('border: var(--ui-border-width) solid var(--ui-border-color);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
    expect(block).toContain('background-color: var(--ui-color-surface);');
    expect(block).toContain('color: var(--ui-color-text);');
  });

  it('типографика — роль small (Scope: fs-small, fw-small); font-family объявлен (UA-шрифт кнопки)', () => {
    const block = blockOf(css, '.ui-chip__pill');
    expect(block).toContain('font-family: var(--ui-font-family);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('font-weight: var(--ui-fw-small);');
    expect(block).toContain('line-height: var(--ui-lh-small);');
    expect(block).toContain('text-decoration: none;');
    expect(block).toContain('cursor: pointer;');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — min-height только из токенов (32px-база T3.6)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });

  it('hover — только под (hover: hover), исключает активные состояния (прецедент ui-pagination)', () => {
    // Медиа-блок присутствует и несёт hover-правило пилюли.
    const hoverBlock = css.match(/@media \(hover: hover\)\s*\{[\s\S]*?\n\}/);
    expect(hoverBlock, 'медиа-блок (hover: hover) найден').toBeTruthy();
    expect(hoverBlock[0]).toContain(':hover');
    // Активные (ARIA-атрибуты) из hover исключены — иначе заливка primary
    // мигает подписью primary (нечитаемо), урок is-active career-portal.
    expect(hoverBlock[0]).toContain(":not([aria-pressed='true'])");
    expect(hoverBlock[0]).toContain(":not([aria-current='page'])");
  });

  it('активное состояние — селектор ARIA-атрибутов (:where держит специфичность одноклассовой), правило после hover', () => {
    const block = blockOf(
      css,
      ".ui-chip__pill:where([aria-pressed='true'], [aria-current='page'])",
    );
    expect(block, 'правило активного состояния найдено').toBeTruthy();
    expect(block).toContain('border-color: var(--ui-color-primary);');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    // is-active оригинала не переносится: состояние — ARIA-атрибут
    // (Technical considerations T14.8).
    expect(css).not.toMatch(/\.is-active/);
    // Порядок каскада: hover-блок раньше активного правила (прецедент
    // ui-pagination — решение порядком источника, не специфичностью).
    expect(css.indexOf('@media (hover: hover)')).toBeLessThan(
      css.indexOf(".ui-chip__pill:where([aria-pressed='true'], [aria-current='page'])"),
    );
  });
});

describe('канонический паттерн (components/ui-chip/ui-chip.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-chip', 'ui-chip.html'), 'utf8');

  it('обе формы в паттерне: кнопочная (type="button" + aria-pressed) и ссылочная (href + aria-current)', () => {
    expect(html).toMatch(/<button[^>]*class="ui-chip__pill"[^>]*type="button"/);
    expect(html).toMatch(/aria-pressed="(true|false)"/);
    expect(html).toMatch(/<a[^>]*class="ui-chip__pill"[^>]*href="/);
    expect(html).toMatch(/aria-current="page"/);
  });

  it('кнопки без «голого» aria-pressed: значение всегда true/false (ARIA-логика выбран/не выбран)', () => {
    for (const tag of html.matchAll(/<button[^>]*>/g)) {
      if (!tag[0].includes('aria-pressed')) continue;
      expect(tag[0], `кнопка ${tag[0]}`).toMatch(/aria-pressed="(true|false)"/);
    }
  });

  it('группы чипов несут доступные имена (aria-label)', () => {
    const groups = [...html.matchAll(/<(?:nav|div|form)[^>]*class="ui-chip"[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(groups.length, 'группы в паттерне есть').toBeGreaterThan(0);
    for (const tag of groups) {
      expect(tag, `группа ${tag}`).toContain('aria-label="');
    }
  });

  it('активная — ровно одна на группу (канон: одиночный выбор по умолчанию)', () => {
    const groups = html.split(/<(?:nav|div|form)[^>]*class="ui-chip"/).slice(1);
    for (const group of groups) {
      const pressed = (group.match(/aria-pressed="true"/g) ?? []).length;
      const current = (group.match(/aria-current="page"/g) ?? []).length;
      expect(pressed + current, 'активных чипов в группе не больше одной').toBeLessThanOrEqual(1);
    }
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html, 'inline-стили в паттерне запрещены').not.toMatch(/style=/);
  });
});

describe('стенд (showcase/pages/ui-chip/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-chip', 'index.html'), 'utf8');

  it('стенд существует и показывает обе формы с активными состояниями', () => {
    expect(html).toContain('id="uichip-buttons"');
    expect(html).toContain('id="uichip-links"');
    expect(html).toMatch(/aria-pressed="true"/);
    expect(html).toMatch(/aria-current="page"/);
  });

  it('длинные RU-подписи — отдельная группа (перенос ленты, AC)', () => {
    expect(html).toContain('id="uichip-long"');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-chip' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    // [^\]] здесь недостаточно: комментарии в массиве несут квадратные скобки
    // (ui-pagination — «button[disabled]»), поэтому ленивый матч до `];` —
    // ui-chip добавлен последним элементом массива.
    expect(build).toMatch(/const COMPONENTS = \[[\s\S]*?'ui-chip'[\s\S]*?\];/);
  });

  it('пары chip-default/chip-active в pairs.config.mjs — семантическими токенами (Implementation requirements T14.8 п.1)', () => {
    const config = readFileSync(join(root, 'tests', 'contrast', 'pairs.config.mjs'), 'utf8');
    const def = config.match(/\{\s*id:\s*'chip-default'[\s\S]*?\}/);
    expect(def, 'пара chip-default найдена').toBeTruthy();
    expect(def[0]).toContain("fg: '--ui-color-text'");
    expect(def[0]).toContain("bg: '--ui-color-surface'");
    const active = config.match(/\{\s*id:\s*'chip-active'[\s\S]*?\}/);
    expect(active, 'пара chip-active найдена').toBeTruthy();
    expect(active[0]).toContain("fg: '--ui-color-text-on-dark'");
    expect(active[0]).toContain("bg: '--ui-color-primary'");
  });

  it('README компонента: границы ui-chip/ui-tag/ui-dropdown, правило ARIA-состояния, touch-компромисс, no-JS деградация', () => {
    const readme = readFileSync(join(root, 'components', 'ui-chip', 'README.md'), 'utf8');
    expect(readme).toContain('ui-tag');
    expect(readme).toContain('ui-dropdown');
    expect(readme).toMatch(/aria-pressed/);
    expect(readme).toMatch(/aria-current/);
    expect(readme).toMatch(/44/); // touch-компромисс 36px vs 44px с фиксацией
    expect(readme).toMatch(/без JS|no-JS|Без JS/i);
  });
});
