/**
 * Юнит-тест слоя 1 «примитивы» — tokens/primitives.css (задача T2.1).
 *
 * Машинная форма приёмки T2.1:
 *  1. файл — один :root, только кастом-свойства `--ui-*` (ADR-0009: слой 1 —
 *     «сырые» имена значений, без селекторов компонентов);
 *  2. КАЖДЫЙ цвет career-portal (css/variables.css + захардкоженные hex/rgba
 *     в components.css/pages.css) отражён в конкретный примитив — исполняемая
 *     форма таблицы соответствия «career-portal значение → примитив»
 *     (AC T2.1, дублирует humans-таблицу docs/ui-system/architecture/
 *     tokens-career-portal-mapping.md);
 *  3. нейтральная шкала серых 100–900 и статусные шкалы red/green/orange
 *     с производными bg полны (Scope T2.1);
 *  4. у каждого примитива — комментарий происхождения непосредственно над
 *     объявлением (career-portal / новый / исправлен — Implementation
 *     requirements T2.1 п.1).
 *
 * «hex только здесь» гейтится stylelint (T1.2: declaration-strict-value с
 * path-исключением tokens/primitives.css; негативные кейсы — tests/lint-cases/
 * css/components/ui-card/hex*.css, прогон `npm run test:lint`) — здесь не
 * дублируется. Проверка вычислимости var-цепочек — e2e-слой T2.2.
 *
 * Значения career-portal сравниваются цветово (rgb/alpha), а не строкой:
 * источник пишет hex в верхнем регистре (#152A4F) и rgba(0, 40, 86, 0.10),
 * примитивы — в нижнем и с нормализованной альфой (0.1).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const primitivesSource = readFileSync(
  join(import.meta.dirname, '../../tokens/primitives.css'),
  'utf8',
);

/**
 * Полный словарь цветов career-portal (эталон одобренного дизайна, макет
 * CP_Ревью; репозиторий read-only): hex из css/variables.css + захардкоженные
 * значения из components.css/pages.css (аудит 01 §3: #D6D6D6, #B9C6DE,
 * #C4CDDC; стеклянные поверхности; цветовая составляющая теней).
 * `token` — примитив, в который значение обязано отразиться (T2.1).
 */
const CAREER_PORTAL_COLORS = [
  // css/variables.css — основная палитра
  { value: '#002856', source: '--color-primary', token: '--ui-blue-800' },
  { value: '#152A4F', source: '--color-primary-deep', token: '--ui-blue-750' },
  { value: '#F26722', source: '--color-accent', token: '--ui-orange-500' },
  { value: '#F37131', source: '--color-accent-light', token: '--ui-orange-400' },
  { value: '#F28B00', source: '--color-accent-bright', token: '--ui-orange-300' },
  { value: '#1F1F1F', source: '--color-text', token: '--ui-black' },
  { value: '#808080', source: '--color-text-muted', token: '--ui-gray-600' },
  { value: '#FFFFFF', source: '--color-text-on-dark, --color-surface', token: '--ui-white' },
  { value: '#8F9CBF', source: '--color-text-on-dark-muted', token: '--ui-slate-400' },
  { value: '#F1F5FE', source: '--color-surface-blue-50', token: '--ui-blue-50' },
  { value: '#E8EEFE', source: '--color-surface-blue-100', token: '--ui-blue-100' },
  { value: '#164B89', source: '--color-blue-700, --color-blue-800', token: '--ui-blue-700' },
  { value: '#FFD3B7', source: '--color-peach-100', token: '--ui-peach-100' },
  { value: '#FFCEAC', source: '--color-peach-200', token: '--ui-peach-200' },
  { value: '#FFAB72', source: '--color-peach-300', token: '--ui-peach-300' },
  { value: '#511D59', source: '--color-plum', token: '--ui-purple-900' },
  { value: 'rgba(255, 255, 255, 0.8)', source: '--glass-light', token: '--ui-white-80' },
  { value: 'rgba(255, 255, 255, 0.1)', source: '--glass-dark', token: '--ui-white-10' },
  { value: 'rgba(0, 40, 86, 0.5)', source: '--glass-blue', token: '--ui-blue-800-50' },
  // css/variables.css — статусы и палитра тегов
  { value: '#D8402C', source: '--color-error', token: '--ui-red-600' },
  { value: '#FFF6F4', source: '--color-error-bg', token: '--ui-red-50' },
  { value: '#1E7A34', source: '--color-success, --tag-green-text', token: '--ui-green-700' },
  { value: '#DDF3E1', source: '--color-success-bg, --tag-green-bg', token: '--ui-green-50' },
  { value: '#FFE3D3', source: '--tag-orange-bg', token: '--ui-orange-50' },
  { value: '#B34A10', source: '--tag-orange-text', token: '--ui-orange-700' },
  { value: '#F0F1F3', source: '--tag-gray-bg', token: '--ui-gray-100' },
  { value: '#F5F8FC', source: '--color-page-head-bg', token: '--ui-slate-50' },
  { value: '#E8EEF6', source: '--color-page-head-border', token: '--ui-slate-100' },
  // css/components.css + css/pages.css — захардкоженные вне токенов
  {
    value: '#D6D6D6',
    source: 'components.css:117, pages.css:182 — рамка карточки',
    token: '--ui-gray-300',
  },
  {
    value: '#B9C6DE',
    source: 'components.css:123 — hover-рамка карточки',
    token: '--ui-slate-300',
  },
  {
    value: '#C4CDDC',
    source: 'components.css:22, pages.css:526 — разделители',
    token: '--ui-slate-200',
  },
  {
    value: 'rgba(255, 255, 255, 0.9)',
    source: 'pages.css:164 — фон sticky-шапки',
    token: '--ui-white-90',
  },
  {
    value: 'rgba(255, 255, 255, 0.75)',
    source: 'pages.css:620 — подпись на тёмном',
    token: '--ui-white-75',
  },
  {
    value: 'rgba(241, 245, 254, 0.55)',
    source: 'components.css:359 — hover dd__trigger',
    token: '--ui-blue-50-55',
  },
  {
    value: 'rgba(0, 40, 86, 0.55)',
    source: 'pages.css:478 — оверлей баннера',
    token: '--ui-blue-800-55',
  },
  {
    value: 'rgba(0, 40, 86, 0.16)',
    source: 'components.css:375 — цвет тени dropdown',
    token: '--ui-blue-800-16',
  },
  {
    value: 'rgba(0, 40, 86, 0.10)',
    source: 'components.css:124 — цвет тени карточки',
    token: '--ui-blue-800-10',
  },
];

/** Строка без комментариев — для структурных проверок. */
const stripped = primitivesSource.replace(/\/\*[\s\S]*?\*\//g, '');

/** Все объявления файла: Map «имя токена → значение строкой». */
function parseDeclarations(css) {
  const declarations = new Map();
  for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(name, value.trim());
  }
  return declarations;
}

const declarations = parseDeclarations(stripped);

/** Цвет строкой → {r, g, b, a}; hex (#rgb/#rrggbb) и rgb()/rgba(). */
function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((d) => d + d)
            .join('')
        : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

function sameColor(a, b) {
  return !!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 1e-9;
}

describe('tokens/primitives.css — структура слоя 1 (ADR-0009)', () => {
  it('файл — ровно один блок :root, без других селекторов', () => {
    expect(stripped.trim()).toMatch(/^:root\s*\{[\s\S]*\}$/);
  });

  it('все объявления — кастом-свойства с неймспейсом --ui-', () => {
    expect(declarations.size).toBeGreaterThan(0);
    for (const name of declarations.keys()) {
      expect(name).toMatch(/^--ui-[a-z0-9-]+$/);
    }
  });

  it('имена токенов уникальны (дублей шкалы нет)', () => {
    const names = [...stripped.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('каждый примитив — комментарий происхождения (career-portal/новый/исправлен)', () => {
    const lines = primitivesSource.split('\n');
    lines.forEach((line, index) => {
      if (!/^\s*--ui-[a-z0-9-]+\s*:/.test(line)) return;
      let previous = index - 1;
      while (previous >= 0 && lines[previous].trim() === '') previous -= 1;
      expect(lines[previous], `нет комментария над ${line.trim()}`).toMatch(/^\s*\/\*/);
      expect(lines[previous], `нет происхождения над ${line.trim()}`).toMatch(
        /career-portal|новый|исправлен/,
      );
    });
  });
});

describe('tokens/primitives.css — полнота отражения career-portal (AC T2.1)', () => {
  it.each(CAREER_PORTAL_COLORS)('$source → $token', ({ value, token }) => {
    const actual = declarations.get(token);
    expect(actual, `примитив ${token} не найден`).toBeDefined();
    expect(
      sameColor(parseColor(actual), parseColor(value)),
      `${token}: ${actual} не совпадает с career-portal ${value}`,
    ).toBe(true);
  });

  it('дубликат career-portal --color-blue-700/--color-blue-800 (#164B89) отражён одним примитивом', () => {
    // В career-portal две переменные с одним значением #164B89; в слое 1
    // значение — одна сущность шкалы (--ui-blue-700). Семантический слой
    // разведёт смыслы в T2.2. Проверяем, что значение в палитре ровно одно.
    const target = parseColor('#164B89');
    const carriers = [...declarations.values()].filter((value) =>
      sameColor(parseColor(value), target),
    );
    expect(carriers).toHaveLength(1);
  });
});

describe('tokens/primitives.css — шкалы (Scope T2.1)', () => {
  it('нейтральная серая шкала 100–900 полна', () => {
    const grays = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => `--ui-gray-${step}`);
    for (const name of grays) {
      expect(declarations.get(name), `${name} отсутствует`).toBeDefined();
    }
  });

  it('статусные шкалы red/green/orange — с производными bg', () => {
    const statusTokens = [
      '--ui-red-50',
      '--ui-red-600',
      '--ui-green-50',
      '--ui-green-700',
      '--ui-orange-50',
      '--ui-orange-300',
      '--ui-orange-400',
      '--ui-orange-500',
      '--ui-orange-700',
    ];
    for (const name of statusTokens) {
      expect(declarations.get(name), `${name} отсутствует`).toBeDefined();
    }
  });

  it('базовые якоря 02-architecture §3.1 присутствуют (контракт для T2.2)', () => {
    const anchors = [
      '--ui-blue-800',
      '--ui-blue-700',
      '--ui-orange-500',
      '--ui-gray-100',
      '--ui-gray-600',
      '--ui-white',
      '--ui-black',
    ];
    for (const name of anchors) {
      expect(declarations.get(name), `${name} отсутствует`).toBeDefined();
    }
  });
});
