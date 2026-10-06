/**
 * Юнит-тест слоя 2 «семантика» — tokens/semantic.css (задача T2.2).
 *
 * Машинная форма приёмки T2.2:
 *  1. структура — :root-блоки и mobile-first media-переопределения, без
 *     селекторов компонентов (ADR-0009: слой 2 — только токены);
 *  2. типографика — тройки fs/lh/fw для всех ролей §3.2, значения в rem,
 *     мобильная лестница из media-правил career-portal (767 → база,
 *     1023 → ≥768px; «рост к lg» — Implementation requirements T2.2 п.1);
 *  3. шкалы §3.2: spacing 1–8 (4–64), радиусы, тени (геометрия career-portal),
 *     z-лестница 70/100/150/200/300/400, transitions 0.15/0.25/0.4,
 *     контейнеры 90rem + 16/24/32;
 *  4. focus-тройка ADR-0001 (career-portal pages.css:52: outline 3px
 *     primary, offset 2px);
 *  5. каждая ссылка var() вычислима (цель — слой 1 или слой 2), цветовые
 *     семантические токены — ровно один var() (AC «ссылается только на
 *     примитивы/семантику»; исполняющий гейт — stylelint, здесь статика);
 *  6. гейт «компонент читает только слой 2» активен: в stylelint-конфиге
 *     есть правило запрета var(--ui-<семейство>-*) вне tokens/, и его список
 *     семейств покрывает ВСЕ семейства primitives.css (иначе новый примитив
 *     молча выпадает из запрета).
 *
 * Прогон полноты стенда и порядка каскада dist — tokens-stand.test.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import stylelintConfig from '../../stylelint.config.mjs';
import { FAMILIES as PRIMITIVE_FAMILIES } from '../../tools/stylelint/no-primitive-token-references.mjs';

const root = join(import.meta.dirname, '../..');
const semanticSource = readFileSync(join(root, 'tokens/semantic.css'), 'utf8');
const primitivesSource = readFileSync(join(root, 'tokens/primitives.css'), 'utf8');

/** Строка без блочных комментариев — для структурных проверок. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Все объявления файла: Map «имя токена → значение строкой» (база :root). */
function parseDeclarations(css) {
  const declarations = new Map();
  for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(name, value.trim());
  }
  return declarations;
}

/** База :root без media-блоков (иначе последнее переопределение побеждает). */
function parseBaseDeclarations(css) {
  const withoutMedia = css.replace(/@media\s*\(min-width:\s*\d+px\)\s*\{[\s\S]*?\n\}/g, '');
  return parseDeclarations(withoutMedia);
}

/** Media-переопределения: [{ min, name, value }] из блоков @media (min-width: Npx). */
function parseMediaDeclarations(css) {
  const overrides = [];
  for (const [, min, block] of css.matchAll(
    /@media\s*\(min-width:\s*(\d+)px\)\s*\{([\s\S]*?)\n\}/g,
  )) {
    for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      overrides.push({ min: Number(min), name, value: value.trim() });
    }
  }
  return overrides;
}

/** rem-строка «Nrem» → px при базе 16. */
const remToPx = (value) => {
  const match = value.match(/^(-?[\d.]+)rem$/);
  expect(match, `значение ${value} — не rem`).not.toBeNull();
  return Number(match[1]) * 16;
};

const stripped = stripComments(semanticSource);
const declarations = parseBaseDeclarations(stripped);
const mediaOverrides = parseMediaDeclarations(stripped);
const primitiveNames = [...parseBaseDeclarations(stripComments(primitivesSource)).keys()];

/** Семейство примитива по имени: --ui-blue-800-10 → blue, --ui-white → white. */
function familyOf(name) {
  let stem = name.replace(/^--ui-/, '');
  while (/\d/.test(stem)) stem = stem.replace(/-?\d[\d.]*/, '');
  return stem;
}

describe('tokens/semantic.css — структура слоя 2 (ADR-0009)', () => {
  it('файл состоит только из :root-блоков, @media-обёрток и объявлений (без селекторов компонентов)', () => {
    const lines = stripped
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const allowed =
        /^:root\s*\{$/.test(line) ||
        /^@media\s*\(min-width:\s*\d+px\)\s*\{$/.test(line) ||
        line === '}' ||
        /^--[a-z0-9-]+\s*:\s*[^;]+;$/.test(line);
      expect(allowed, `чужая для слоя 2 строка: ${line}`).toBe(true);
    }
  });

  it('все объявления — кастом-свойства --ui-; имена базы уникальны; media-override без базы невозможен', () => {
    expect(declarations.size).toBeGreaterThan(0);
    const baseNames = [...declarations.keys()];
    for (const name of baseNames) {
      expect(name).toMatch(/^--ui-[a-z0-9-]+$/);
    }
    // Media-переопределения ПОВТОРЯЮТ имена базы сознательно (mobile-first) —
    // уникальны только базовые имена; каждый override обязан иметь базу.
    expect(new Set(baseNames).size).toBe(baseNames.length);
    for (const override of mediaOverrides) {
      expect(declarations.has(override.name), `override без базы: ${override.name}`).toBe(true);
    }
  });

  it('media-переопределения — только min-width из шкалы 768/1024 (mobile-first, T2.5)', () => {
    expect(mediaOverrides.length).toBeGreaterThan(0);
    for (const override of mediaOverrides) {
      expect([768, 1024]).toContain(override.min);
    }
    const mins = [...new Set(mediaOverrides.map((o) => o.min))];
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });

  it('у каждого токена — комментарий происхождения (career-portal/новый/02-architecture)', () => {
    const lines = semanticSource.split('\n');
    lines.forEach((line, index) => {
      if (!/^\s*--ui-[a-z0-9-]+\s*:/.test(line)) return;
      let previous = index - 1;
      while (previous >= 0 && lines[previous].trim() === '') previous -= 1;
      expect(lines[previous], `нет комментария над ${line.trim()}`).toMatch(/^\s*\/\*/);
      expect(lines[previous], `нет происхождения над ${line.trim()}`).toMatch(
        /career-portal|новый|02-architecture/,
      );
    });
  });

  it('каждая ссылка var() вычислима: цель определена в слое 1 или слое 2', () => {
    const defined = new Set([...primitiveNames, ...declarations.keys()]);
    const references = [...stripped.matchAll(/var\((--[\w-]+)[),]/g)].map((m) => m[1]);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(defined.has(reference), `ссылка на неопределённый токен ${reference}`).toBe(true);
    }
  });

  it('цветовые семантические токены — ровно один var() (AC «только примитивы/семантика»)', () => {
    for (const [name, value] of declarations) {
      if (!/color/.test(name)) continue;
      expect(value, `${name}: ${value} — не одиночный var()`).toMatch(/^var\(--ui-[a-z0-9-]+\)$/);
    }
  });
});

describe('tokens/semantic.css — типографика (rem, лестница career-portal)', () => {
  /** Роли §3.2 и тройки career-portal css/variables.css (lh/fw десктопа). */
  const ROLES = {
    h1: { lh: '1.1', fw: '400' },
    h2: { lh: '1.1', fw: '400' },
    h3: { lh: '1.3', fw: '500' },
    h4: { lh: '1.25', fw: '500' },
    // h5/h6 — новых ролей в career-portal нет: значения = существующие ступени
    // одобренной шкалы (lead 1.5rem, body 1.25rem на lg), полнота списка §3.2.
    h5: { lh: '1.25', fw: '500' },
    h6: { lh: '1.25', fw: '500' },
    lead: { lh: '1.35', fw: '400' },
    body: { lh: '1.35', fw: '400' },
    small: { lh: '1.35', fw: '500' },
    caption: { lh: '1.1', fw: '500' },
    micro: { lh: '1.35', fw: '400' },
  };

  /** Mobile-лестница career-portal (css/base.css media 767/1023 + база) в px. */
  const LADDER_PX = {
    h1: { base: 34, 768: 48, 1024: 80 },
    h2: { base: 28, 768: 40, 1024: 60 },
    h3: { base: 24, 768: 30, 1024: 42 },
    h4: { base: 20, 1024: 28 },
    h5: {},
    h6: {},
    lead: { base: 18, 1024: 24 },
    body: { base: 16, 768: 18, 1024: 20 },
  };

  it('для каждой роли §3.2 есть тройка --ui-fs-*/--ui-lh-*/--ui-fw-*', () => {
    for (const [role, triple] of Object.entries(ROLES)) {
      expect(declarations.get(`--ui-fs-${role}`), `--ui-fs-${role} отсутствует`).toBeDefined();
      expect(declarations.get(`--ui-lh-${role}`), `--ui-lh-${role} отсутствует`).toBe(triple.lh);
      expect(declarations.get(`--ui-fw-${role}`), `--ui-fw-${role} отсутствует`).toBe(triple.fw);
    }
  });

  it('все --ui-fs-* — в rem (осба масштабирования, T3.6)', () => {
    for (const [name, value] of declarations) {
      if (!name.startsWith('--ui-fs-')) continue;
      expect(value, `${name}: ${value}`).toMatch(/^[\d.]+rem$/);
    }
  });

  it('лестница fs = career-portal: база (≤767) → ≥768 → ≥1024, монотонный рост', () => {
    for (const [role, steps] of Object.entries(LADDER_PX)) {
      const base = declarations.get(`--ui-fs-${role}`);
      if (steps.base !== undefined) {
        expect(remToPx(base), `--ui-fs-${role} база`).toBe(steps.base);
      }
      for (const override of mediaOverrides.filter((o) => o.name === `--ui-fs-${role}`)) {
        expect(remToPx(override.value), `--ui-fs-${role} @${override.min}`).toBe(
          steps[override.min],
        );
      }
      // Монотонность: база ≤ 768 ≤ 1024.
      const numeric = [
        ...(steps.base !== undefined ? [steps.base] : []),
        ...mediaOverrides.filter((o) => o.name === `--ui-fs-${role}`).map((o) => remToPx(o.value)),
      ];
      expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
    }
  });

  it('семейство шрифтов: Golos Text + фолбэк-стек §3.2; моно — новый токен', () => {
    expect(declarations.get('--ui-font-family')).toContain('Golos Text');
    expect(declarations.get('--ui-font-family')).toContain('Arial');
    expect(declarations.get('--ui-font-family')).toContain('sans-serif');
    expect(declarations.get('--ui-font-family-mono')).toBeDefined();
  });
});

describe('tokens/semantic.css — шкалы §3.2', () => {
  it('spacing 1–8 = 4/8/12/16/24/32/48/64 в rem', () => {
    const scale = [4, 8, 12, 16, 24, 32, 48, 64];
    scale.forEach((px, index) => {
      const name = `--ui-space-${index + 1}`;
      expect(remToPx(declarations.get(name)), `${name}`).toBe(px);
    });
  });

  it('радиусы none/sm/md/lg/pill: 0, 8 (small), 16 (card), 24 (big), 100 (pill) career-portal', () => {
    expect(declarations.get('--ui-radius-none')).toBe('0');
    expect(remToPx(declarations.get('--ui-radius-sm'))).toBe(8);
    expect(remToPx(declarations.get('--ui-radius-md'))).toBe(16);
    expect(remToPx(declarations.get('--ui-radius-lg'))).toBe(24);
    expect(remToPx(declarations.get('--ui-radius-pill'))).toBe(100);
  });

  it('тени: md/lg — геометрия career-portal (карточка 0 12px 32px, dropdown 0 16px 40px)', () => {
    expect(declarations.get('--ui-shadow-md')).toBe('0 0.75rem 2rem var(--ui-blue-800-10)');
    expect(declarations.get('--ui-shadow-lg')).toBe('0 1rem 2.5rem var(--ui-blue-800-16)');
    // Тень карточки — одобренное значение career-portal через лестницу.
    expect(declarations.get('--ui-shadow-card')).toBe('var(--ui-shadow-md)');
    expect(declarations.get('--ui-shadow-sm')).toMatch(
      /^0 [\d.]+rem [\d.]+rem var\(--ui-[a-z0-9-]+\)$/,
    );
  });

  it('z-лестница 70/100/150/200/300/400 (фиксирует плавающие 70/200 career-portal)', () => {
    const ladder = {
      '--ui-z-dropdown': '70',
      '--ui-z-sticky': '100',
      '--ui-z-header': '150',
      '--ui-z-overlay': '200',
      '--ui-z-modal': '300',
      '--ui-z-vi': '400',
    };
    for (const [name, value] of Object.entries(ladder)) {
      expect(declarations.get(name), `${name}`).toBe(value);
    }
  });

  it('переходы fast/base/slow = 0.15/0.25/0.4s ease (база — career-portal --transition)', () => {
    expect(declarations.get('--ui-transition-fast')).toBe('0.15s ease');
    expect(declarations.get('--ui-transition')).toBe('0.25s ease');
    expect(declarations.get('--ui-transition-slow')).toBe('0.4s ease');
  });

  it('контейнеры: max 90rem (1440), паддинги 16/24/32 по брейкпоинтам', () => {
    expect(declarations.get('--ui-container-max')).toBe('90rem');
    expect(remToPx(declarations.get('--ui-container-pad'))).toBe(16);
    expect(remToPx(declarations.get('--ui-container-pad-md'))).toBe(24);
    expect(remToPx(declarations.get('--ui-container-pad-lg'))).toBe(32);
  });

  it('рамки: width 1px, цвет — примитив; разделители — slate-200', () => {
    expect(declarations.get('--ui-border-width')).toBe('1px');
    expect(declarations.get('--ui-border-color')).toMatch(/^var\(--ui-[a-z0-9-]+\)$/);
    expect(declarations.get('--ui-color-divider')).toBe('var(--ui-slate-200)');
  });
});

describe('tokens/semantic.css — focus-тройка (ADR-0001)', () => {
  it('color → primary, width 3px, offset 2px (career-portal pages.css:52)', () => {
    expect(declarations.get('--ui-focus-color')).toBe('var(--ui-color-primary)');
    expect(declarations.get('--ui-focus-width')).toBe('3px');
    expect(declarations.get('--ui-focus-offset')).toBe('2px');
  });
});

describe('tokens/semantic.css — hover-пары одобренного дизайна (T2.6, ADR-0010)', () => {
  /** Примитивы отдельно: пара обязана указывать на значение макета, не пересчитывать его. */
  const primitiveDeclarations = parseBaseDeclarations(stripComments(primitivesSource));

  it('primary-hover = var(--ui-blue-700) — пара одобренного дизайна, не color-mix', () => {
    // career-portal: .btn--primary:hover { background: var(--color-blue-700) }
    // (components.css:80); значение макета не пересчитывается (Scope T2.6:
    // «одобренный визуал не пересчитывается», ADR-0010).
    expect(declarations.get('--ui-color-primary-hover')).toBe('var(--ui-blue-700)');
  });

  it('accent-hover = var(--ui-orange-400) — пара одобренного дизайна, не color-mix', () => {
    // career-portal: .btn--accent:hover { background: var(--color-accent-light) }
    // (components.css:83); #F37131 = примитив --ui-orange-400.
    expect(declarations.get('--ui-color-accent-hover')).toBe('var(--ui-orange-400)');
  });

  it('значения пар — примитивы одобренного дизайна без пересчёта (#164b89 / #f37131)', () => {
    expect(primitiveDeclarations.get('--ui-blue-700')).toBe('#164b89');
    expect(primitiveDeclarations.get('--ui-orange-400')).toBe('#f37131');
  });
});

describe('гейт «компонент читает только слой 2» (AC T2.2)', () => {
  const RULE_ID = 'irao/no-primitive-token-references';

  it('правило активно в stylelint.config.mjs и получает список семейств плагина', () => {
    const options = stylelintConfig.rules[RULE_ID];
    expect(options, 'правило не подключено в rules конфига').toBeDefined();
    expect(options[0]).toEqual(PRIMITIVE_FAMILIES);
  });

  it('список семейств покрывает ВСЕ семейства primitives.css (без лишних)', () => {
    const primitiveFamilies = new Set(primitiveNames.map((name) => familyOf(name)));
    expect(new Set(PRIMITIVE_FAMILIES)).toEqual(primitiveFamilies);
  });

  it('действие правила исключено для tokens/ (override в конфиге)', () => {
    const override = stylelintConfig.overrides.find((entry) =>
      entry.files.includes('**/tokens/**'),
    );
    expect(override, 'нет override для tokens/').toBeDefined();
    expect(override.rules[RULE_ID]).toBeNull();
  });
});
