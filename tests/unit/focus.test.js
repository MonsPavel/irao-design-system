/**
 * Юнит-пин политики фокуса (задача T3.2, ADR-0001; Testing requirements).
 *
 * Поверхность браузера — Tab-обход, legacy-атака, смена темы — в
 * tests/e2e/focus.spec.js; здесь — пины файлов и исполняемой формы решения:
 *  - base/focus.css: точный список селекторов «элемент + :focus-visible»
 *    ADR-0001 (включая summary и [tabindex]) и значения focus-тройки T2.2;
 *    никаких !important (инвариант системы) и никаких сырых цветов;
 *  - порядок каскада: base/focus.css в CSS_CORE_ORDER showcase/build.mjs —
 *    после reset/fonts, до typography (система грузится первой, ADR-0001);
 *  - стенд base — поверхность e2e: showcase/pages/base/index.html содержит
 *    все 7 целей политики, build.mjs генерирует из него stands/base.html;
 *  - дока «Focus visible: почему так» — ссылка на ADR-0001 и правило
 *    расширения списка новым тегом (Implementation requirements T3.2 п.3).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** Список целей политики — дословно ADR-0001 (и 02-architecture §5). */
const ADR_TARGETS = ['a', 'button', 'input', 'select', 'textarea', 'summary', '[tabindex]'];

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('base/focus.css — глобальная политика :focus-visible (ADR-0001)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'focus.css'), 'utf8'));

  it('файл существует (входит в ui-core — сборка не предупреждает о пропуске)', () => {
    expect(existsSync(join(root, 'base', 'focus.css'))).toBe(true);
  });

  it('список селекторов — точный по ADR-0001: 7 целей, каждая с :focus-visible', () => {
    const rule = css.match(/([^{]+)\{\s*outline:\s*var\(--ui-focus-width\)/);
    expect(rule, 'правило политики с outline из токенов найдено').toBeTruthy();
    const selectors = rule[1].trim().split(/\s*,\s*/);
    expect(selectors).toEqual(ADR_TARGETS.map((target) => `${target}:focus-visible`));
  });

  it('значения — focus-тройка токенов слоя 2 (T2.2), outline-offset на месте', () => {
    expect(css).toMatch(/outline:\s*var\(--ui-focus-width\)\s+solid\s+var\(--ui-focus-color\);/);
    expect(css).toMatch(/outline-offset:\s*var\(--ui-focus-offset\);/);
  });

  it('никаких !important (инвариант системы: только a11y/vi.css) и никакого hex', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('порядок каскада — base/focus.css в CSS_CORE_ORDER showcase/build.mjs', () => {
  const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');

  it('base/focus.css — после reset/fonts, до typography (система грузится первой)', () => {
    const order = build.match(/const CSS_CORE_ORDER = \[([\s\S]*?)\];/);
    expect(order, 'CSS_CORE_ORDER найден').toBeTruthy();
    const paths = [...order[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const focus = paths.indexOf('base/focus.css');
    expect(focus, 'base/focus.css есть в CSS_CORE_ORDER').toBeGreaterThanOrEqual(0);
    expect(focus).toBeGreaterThan(paths.indexOf('base/fonts.css'));
    expect(focus).toBeLessThan(paths.indexOf('base/typography.css'));
  });

  it('стенд base генерируется из showcase/pages/base/index.html в stands/base.html', () => {
    expect(build).toContain('showcase/pages/base/index.html');
    expect(build).toMatch(/stands['",\s]+['"]base\.html/);
  });
});

describe('стенд base — поверхность e2e (все 7 целей политики на одной странице)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'base', 'index.html'), 'utf8');

  it('разметка содержит a[href], button, input, select, textarea, summary, [tabindex="0"]', () => {
    expect(stand).toMatch(/<a\s[^>]*href=/);
    expect(stand).toMatch(/<button\b/);
    expect(stand).toMatch(/<input\b/);
    expect(stand).toMatch(/<select\b/);
    expect(stand).toMatch(/<textarea\b/);
    expect(stand).toMatch(/<summary\b/);
    expect(stand).toMatch(/tabindex="0"/);
  });

  it('никаких положительных tabindex (WCAG 2.4.3; гейт .htmlvalidate.js дублирует)', () => {
    const positives = [...stand.matchAll(/tabindex="(\d+)"/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n > 0);
    expect(positives).toEqual([]);
  });
});

describe('дока «Focus visible: почему так» (Scope T3.2)', () => {
  const doc = readFileSync(
    join(root, 'docs', 'ui-system', 'architecture', 'focus-policy.md'),
    'utf8',
  );

  it('существует, ссылается на ADR-0001, перечисляет цели политики', () => {
    expect(doc).toContain('0001-focus-visible-specificity.md');
    for (const target of ADR_TARGETS) {
      expect(doc).toContain(target);
    }
  });

  it('записывает правило расширения списка новым тегом (Implementation requirements п.3)', () => {
    expect(doc).toContain('Как расширить список');
  });
});

describe('e2e-сценарий legacy-атаки записан (Scope T3.2)', () => {
  const spec = readFileSync(join(root, 'tests', 'e2e', 'focus.spec.js'), 'utf8');

  it('tests/e2e/focus.spec.js содержит инжект a { outline: none } после ui-core', () => {
    expect(spec).toContain('outline: none');
  });
});
