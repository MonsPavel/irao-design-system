/**
 * Юнит-пин ui-alert (задача T4.5; Testing requirements).
 *
 * Поверхность браузера — роли в DOM, закрытие Tab→Enter, axe и эталоны —
 * в tests/e2e/ui-alert.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: warning-пара --ui-color-warning / --ui-color-warning-bg
 *    (Scope T4.5: «info/warning-пары заводим в семантике»; ступени одобренной
 *    оранжевой шкалы — примитивы существовали: --ui-orange-50 = tag-orange-bg
 *    career-portal, --ui-orange-800 = AA-замена T2.3, 4.78:1 на orange-50);
 *  - components/ui-alert/ui-alert.css: box-sizing на корне (ADR-0002);
 *    радиус --ui-radius-md и отступы --ui-space-* (Technical considerations);
 *    4 варианта из семантических пар; hover только под @media (hover: hover)
 *    (EPIC-4: sticky-hover не «залипает» на таче); инварианты — без
 *    !important и hex;
 *  - канонический паттерн: роль выставляется в HTML (Technical considerations
 *    T4.5 — не JS): role="status" на info/success, role="alert" на
 *    warning/error; иконка — svg aria-hidden (смысл дублируется текстом,
 *    WCAG 1.4.1); кнопка закрытия с aria-label и data-хуком;
 *  - стенд showcase/pages/ui-alert: матрица 4×2 + нейтральная база,
 *    без data-ui-check-layout (гейт масштабирования T3.6 не расширяется
 *    без записи в CHECK_STANDS — пин синхронности tests/unit/scaling.test.js);
 *  - 'ui-alert' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - warning-пары в PAIRS tests/contrast/pairs.config.mjs (Implementation
 *    requirements п.3: «пары цветов проходят контраст-скрипт»; гейт T2.3:
 *    каждый цветовой токен — в паре или исключении);
 *  - README компонента: правило выбора role (status vs alert), правило
 *    закрытия живого региона (по явному действию пользователя), do/don't.
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

describe('tokens/semantic.css — warning-пара (Scope T4.5, Implementation requirements п.3)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('текст/иконка warning: --ui-color-warning = var(--ui-orange-800) (AA-ступень оранжевой шкалы T2.3)', () => {
    // Примитив --ui-orange-800 = AA-замена --tag-orange-text (T2.3): 4.78:1 на
    // orange-50 — единственная ступень оранжевой шкалы, проходящая порог 4.5
    // на своём bg (orange-700 давал 4.40:1); новое значение шкалы не вводим.
    expect(source).toMatch(/--ui-color-warning:\s*var\(--ui-orange-800\);/);
  });

  it('фон warning: --ui-color-warning-bg = var(--ui-orange-50) (пара к error-bg/success-bg/info-bg)', () => {
    // Примитив --ui-orange-50 = career-portal --tag-orange-bg (производная bg
    // оранжевой шкалы) — существующий примитив, новое hex не заводится.
    expect(source).toMatch(/--ui-color-warning-bg:\s*var\(--ui-orange-50\);/);
  });
});

describe('components/ui-alert/ui-alert.css — база (Technical considerations T4.5, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-alert', 'ui-alert.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define alert — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define alert */')).toBe(true);
  });

  it('.ui-alert: box-sizing; флекс иконка+тело; отступы и радиус — токены', () => {
    const block = blockOf(css, '.ui-alert');
    expect(block, 'правило .ui-alert найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('gap: var(--ui-space-3);');
    expect(block).toContain('align-items: flex-start;');
    // Отступы — spacing-токены; радиус — --ui-radius-md (Technical considerations).
    expect(block).toContain('padding: var(--ui-space-4);');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
  });

  it('база без модификатора — нейтральное сообщение (пара text-on-surface-muted гейта T2.3)', () => {
    const block = blockOf(css, '.ui-alert');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('color: var(--ui-color-text);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — алерт растёт по контенту (32px-база T3.6)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-alert/ui-alert.css — варианты (Scope: пары из слоя 2)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-alert', 'ui-alert.css'), 'utf8'),
  );

  it('четыре варианта — bg+цвет из готовых семантических пар', () => {
    const expected = {
      '.ui-alert--info': ['background-color: var(--ui-color-info-bg);', 'color: var(--ui-color-info);'],
      '.ui-alert--success': [
        'background-color: var(--ui-color-success-bg);',
        'color: var(--ui-color-success);',
      ],
      '.ui-alert--warning': [
        'background-color: var(--ui-color-warning-bg);',
        'color: var(--ui-color-warning);',
      ],
      '.ui-alert--error': [
        'background-color: var(--ui-color-error-bg);',
        'color: var(--ui-color-error);',
      ],
    };
    for (const [selector, declarations] of Object.entries(expected)) {
      const block = blockOf(css, selector);
      expect(block, `правило ${selector} найдено`).toBeTruthy();
      for (const declaration of declarations) {
        expect(block, `${selector}: ${declaration}`).toContain(declaration);
      }
    }
  });
});

describe('components/ui-alert/ui-alert.css — слоты (Scope: __icon, __body, __close)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-alert', 'ui-alert.css'), 'utf8'),
  );

  it('__icon: 24px (--ui-space-5), цвет — currentColor из разметки (CSS-цвет сознательно не задаётся)', () => {
    const block = blockOf(css, '.ui-alert__icon');
    expect(block, 'правило .ui-alert__icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('flex: none;');
    expect(block).toContain('width: var(--ui-space-5);');
    expect(block).toContain('height: var(--ui-space-5);');
    expect(block, 'цвет задаёт fill/stroke svg в разметке').not.toMatch(/color:/);
  });

  it('__body: колонка сообщений с шагом --ui-space-2; растёт — прижимает __close к правому краю', () => {
    const block = blockOf(css, '.ui-alert__body');
    expect(block, 'правило .ui-alert__body найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('flex-grow: 1;');
    expect(block).toContain('gap: var(--ui-space-2);');
  });

  it('__close: кнопка-иконка 32px (--ui-space-6), наследует цвет варианта, сброс кнопки', () => {
    const block = blockOf(css, '.ui-alert__close');
    expect(block, 'правило .ui-alert__close найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: center;');
    expect(block).toContain('flex: none;');
    expect(block).toContain('width: var(--ui-space-6);');
    expect(block).toContain('height: var(--ui-space-6);');
    expect(block).toContain('border-radius: var(--ui-radius-sm);');
    expect(block).toContain('background-color: transparent;');
    expect(block).toContain('color: inherit;');
    expect(block).toContain('cursor: pointer;');
  });

  it('__close-icon: 16px (--ui-space-4) — глиф × внутри кнопки', () => {
    const block = blockOf(css, '.ui-alert__close-icon');
    expect(block, 'правило .ui-alert__close-icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: var(--ui-space-4);');
    expect(block).toContain('height: var(--ui-space-4);');
  });

  it('все :hover-правила — ТОЛЬКО внутри @media (hover: hover) (Context: sticky-hover на таче)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    const beforeMedia = css.slice(0, mediaIndex);
    expect(beforeMedia, 'до media-обёртки :hover-селекторов нет').not.toContain(':hover');
    const block = blockOf(css.slice(mediaIndex), '.ui-alert__close:hover');
    expect(block, 'правило hover кнопки закрытия найдено').toBeTruthy();
    // Производное состояние без одобренного дизайна — color-mix 88% + black
    // (CONTRIBUTING, §3.2): над currentColor варианта.
    expect(block).toContain('color: color-mix(in srgb, currentColor 88%, black);');
  });
});

describe('канонический паттерн (components/ui-alert/ui-alert.html) — роли и закрытие', () => {
  const html = readFileSync(join(root, 'components', 'ui-alert', 'ui-alert.html'), 'utf8');

  it('роли в HTML-паттерне (Technical considerations: role выставляет интегратор, не JS)', () => {
    // info/success — вежливое объявление, warning/error — немедленное.
    expect((html.match(/role="status"/g) ?? []).length, 'role="status" — info и success').toBe(2);
    expect((html.match(/role="alert"/g) ?? []).length, 'role="alert" — warning и error').toBe(2);
  });

  it('иконка варианта — svg aria-hidden: смысл дублируется текстом (WCAG 1.4.1)', () => {
    const icons = [...html.matchAll(/<svg[^>]*class="ui-alert__icon"[^>]*>/g)].map((m) => m[0]);
    expect(icons.length, 'иконки в паттерне есть').toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon, `${icon}`).toContain('aria-hidden="true"');
    }
  });

  it('кнопка закрытия: type="button", aria-label, data-хук (JS не вешается на стилевые классы)', () => {
    const buttons = [...html.matchAll(/<button[^>]*class="ui-alert__close"[^>]*>/g)].map(
      (m) => m[0],
    );
    expect(buttons.length, 'закрываемые примеры в паттерне есть').toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button, `${button}`).toContain('type="button"');
      expect(button, `${button}`).toContain('data-ui-alert-close');
      expect(button, `${button}`).toContain('aria-label="Закрыть"');
    }
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-alert/index.html) — матрица 4×2 (AC)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-alert', 'index.html'), 'utf8');

  it('стенд существует: 4 варианта × (статичный / закрываемый) + нейтральная база', () => {
    for (const id of [
      'ui-alert-info',
      'ui-alert-success',
      'ui-alert-warning',
      'ui-alert-error',
      'ui-alert-info-close',
      'ui-alert-success-close',
      'ui-alert-warning-close',
      'ui-alert-error-close',
      'ui-alert-base',
    ]) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it('демо-скрипт стенда вешается на data-хук, не на стилевой класс (§2 «Namespace»)', () => {
    expect(html).toContain('[data-ui-alert-close]');
    expect(html).not.toContain("querySelectorAll('.ui-alert__close')");
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-alert' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-alert'[^\]]*\]/);
  });

  it('warning-пары в PAIRS pairs.config.mjs — проходят контраст-гейт T2.3 (Implementation requirements п.3)', () => {
    const config = readFileSync(join(root, 'tests', 'contrast', 'pairs.config.mjs'), 'utf8');
    expect(config).toMatch(/id:\s*'warning-on-warning-bg'/);
    expect(config).toMatch(/id:\s*'warning-on-surface'/);
    // Пара — на семантические токены, не на примитивы (правило конфига T2.3).
    expect(config).toMatch(/fg:\s*'--ui-color-warning',\s*\n\s*bg:\s*'--ui-color-warning-bg'/);
    expect(config).not.toMatch(/token:\s*'--ui-color-warning/);
  });

  it('таблица диффов: warning-пара записана в «Новые» tokens-career-portal-mapping.md', () => {
    const mapping = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'tokens-career-portal-mapping.md'),
      'utf8',
    );
    expect(mapping).toContain('--ui-color-warning[-bg]');
  });

  it('README компонента: правило выбора role, правило закрытия, WCAG 1.4.1, потребители T5.4/T4.8', () => {
    const readme = readFileSync(join(root, 'components', 'ui-alert', 'README.md'), 'utf8');
    expect(readme).toContain('role="status"');
    expect(readme).toContain('role="alert"');
    expect(readme).toContain('явным действием');
    expect(readme).toContain('1.4.1');
    expect(readme).toContain('T5.4');
    expect(readme).toContain('T4.8');
    expect(readme).toContain('aria-label');
  });
});
