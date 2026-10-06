/**
 * Библиотека контраст-гейта AA (задача T2.3) — чистые функции без зависимостей.
 *
 * Потребители: tests/contrast/check.mjs (CI-шаг) и tests/unit/contrast.test.js.
 * Формула — WCAG 2.1 relative luminance (1.4.3 контраст текста, 1.4.11
 * некстовых): контраст = (L1 + 0.05) / (L2 + 0.05), каналы sRGB → линейные
 * через (c + 0.055)/1.055 ^ 2.4 (порог 0.03928 → c/12.92).
 *
 * Токены разбираются парсером стенда (showcase/tokens-stand.mjs — единый
 * контракт формата файлов tokens/*.css): var()-цепочки слоя 2 resolve
 * рекурсивно до hex/rgba слоя 1. Цвет с альфой (rgba с a < 1) без подложки
 * не вычислим — такой токен обязан быть осознанным исключением в конфиге
 * (tests/contrast/pairs.config.mjs), а не парой.
 *
 * Пороги AA: обычный текст ≥ 4.5:1 (level: 'text'), крупный ≥ 24px или
 * ≥ 19px bold ≥ 3:1 (level: 'large'), некстовые (контуры фокуса, индикаторы)
 * ≥ 3:1 (level: 'non-text').
 */
import { parseTokensFile } from '../../showcase/tokens-stand.mjs';

/** WCAG AA: порог по уровню роли (учёт «крупности» — Implementation requirements T2.3 п.2). */
export const THRESHOLDS = Object.freeze({ text: 4.5, large: 3, 'non-text': 3 });

/** Цвет строкой → {r, g, b, a}; hex (#rgb/#rrggbb) и rgb()/rgba(). */
export function parseColor(value) {
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

/** Цвет → нормализованный hex #rrggbb (для отчёта; альфа < 1 — ошибка). */
export function normalizeColor(color) {
  if (color.a < 1) {
    throw new Error(
      `альфа-цвет rgba(${color.r}, ${color.g}, ${color.b}, ${color.a}) без подложки не вычислим — ` +
        `токену нужна пара с непрозрачным значением или осознанное исключение в конфиге`,
    );
  }
  const channel = (c) => c.toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

/** Относительная светлота WCAG 2.1 (каналы 0–255 → 0–1). */
export function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Коэффициент контраста WCAG: (L1 + 0.05) / (L2 + 0.05), 1…21. Принимает
 * цвета объектами parseColor или строками hex/rgb (для прямых проверок). */
export function contrastRatio(colorA, colorB) {
  const a = typeof colorA === 'string' ? parseColor(colorA) : colorA;
  const b = typeof colorB === 'string' ? parseColor(colorB) : colorB;
  if (!a || !b) throw new Error(`аргумент не цвет: ${!a ? 'A' : 'B'}`);
  if (a.a < 1 || b.a < 1) {
    throw new Error('альфа-цвет без подложки не вычислим (см. normalizeColor)');
  }
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * var()-цепочка токена → нормализованный непрозрачный цвет.
 * @param {string} name имя токена (--ui-*)
 * @param {Map<string, string>} declarations все объявления слоёв 1–2
 * @param {string[]} chain путь обхода (защита от циклов)
 */
export function resolveTokenColor(name, declarations, chain = []) {
  if (chain.includes(name)) {
    throw new Error(`цикл в var()-цепочке: ${[...chain, name].join(' → ')}`);
  }
  const value = declarations.get(name);
  if (value === undefined) {
    throw new Error(`неизвестный токен ${name} — нет ни в слое 1, ни в слое 2`);
  }
  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/);
  if (reference) {
    return resolveTokenColor(reference[1], declarations, [...chain, name]);
  }
  const color = parseColor(value);
  if (!color) {
    throw new Error(`значение ${name} = «${value}» не разбирается как hex/rgb-цвет`);
  }
  return normalizeColor(color);
}

/**
 * Объявления файла токенов «имя → значение» (парсер стенда — единый контракт;
 * у цветовых токенов media-лестницы нет, берётся база :root).
 * @param {string} source содержимое tokens/*.css
 * @param {'primitive'|'semantic'} layer слой ADR-0009
 * @returns {Map<string, string>}
 */
export function declarationsFromTokenFile(source, layer) {
  const { byName } = parseTokensFile(source, layer);
  return new Map([...byName].map(([name, token]) => [name, token.value]));
}

/**
 * Проверка конфига пар против карт объявлений слоёв 1–2.
 *
 * Полнота (Implementation requirements T2.3 п.1): каждый ЦВЕТОВОЙ токен слоя 2
 * (имя содержит «color») обязан быть в паре или в осознанном исключении —
 * новый цвет без пары делает прогон красным (coverageGaps).
 *
 * @param {object} input
 * @param {Map<string, string>} input.primitives слой 1
 * @param {Map<string, string>} input.semantic слой 2
 * @param {Array<{id: string, fg: string, bg: string, level: string, usage: string}>} input.pairs
 * @param {Array<{token: string, reason: string}>} input.exceptions
 * @param {{text: number, large: number, 'non-text': number}} [input.thresholds]
 * @returns {{
 *   rows: Array<{id: string, usage: string, level: string, fgToken: string, fgValue: string,
 *                bgToken: string, bgValue: string, ratio: number, threshold: number, pass: boolean}>,
 *   violations: rows (pass === false),
 *   coverageGaps: string[],
 *   configErrors: string[],
 *   exceptions: Array<{token: string, reason: string}>,
 * }}
 */
export function evaluateContrast({
  primitives,
  semantic,
  pairs,
  exceptions,
  thresholds = THRESHOLDS,
}) {
  const declarations = new Map([...primitives, ...semantic]);
  const isColorToken = (name) => name.includes('color');
  const configErrors = [];

  const rows = [];
  const paired = new Set();
  const seenIds = new Set();
  for (const pair of pairs) {
    if (seenIds.has(pair.id)) configErrors.push(`дубль id пары: ${pair.id}`);
    seenIds.add(pair.id);
    if (!(pair.level in thresholds)) {
      configErrors.push(`${pair.id}: неизвестный уровень порога «${pair.level}»`);
    }
    for (const side of ['fg', 'bg']) {
      if (!declarations.has(pair[side])) {
        configErrors.push(`${pair.id}: ${side}-токен ${pair[side]} не определён в слоях 1–2`);
      }
    }
    paired.add(pair.fg);
    paired.add(pair.bg);

    let fgValue;
    let bgValue;
    try {
      fgValue = resolveTokenColor(pair.fg, declarations);
      bgValue = resolveTokenColor(pair.bg, declarations);
    } catch (error) {
      configErrors.push(`${pair.id}: ${error.message}`);
      continue;
    }
    const threshold = thresholds[pair.level];
    if (threshold === undefined) continue;
    const ratio = contrastRatio(parseColor(fgValue), parseColor(bgValue));
    rows.push({
      id: pair.id,
      usage: pair.usage,
      level: pair.level,
      fgToken: pair.fg,
      fgValue,
      bgToken: pair.bg,
      bgValue,
      ratio,
      threshold,
      pass: ratio >= threshold,
    });
  }

  /** @type {Array<{token: string, reason: string}>} */
  const exceptionRows = [];
  const exceptionTokens = new Set();
  for (const exception of exceptions) {
    if (!declarations.has(exception.token)) {
      configErrors.push(`исключение для неизвестного токена ${exception.token}`);
      continue;
    }
    if (!semantic.has(exception.token) || !isColorToken(exception.token)) {
      configErrors.push(`исключение ${exception.token} — не цветовой токен слоя 2`);
      continue;
    }
    if (paired.has(exception.token)) {
      configErrors.push(`исключение ${exception.token} также используется в паре`);
    }
    exceptionTokens.add(exception.token);
    exceptionRows.push(exception);
  }

  const semanticColorTokens = [...semantic.keys()].filter(isColorToken);
  const coverageGaps = semanticColorTokens.filter(
    (name) => !paired.has(name) && !exceptionTokens.has(name),
  );

  return {
    rows,
    violations: rows.filter((row) => !row.pass),
    coverageGaps,
    configErrors,
    exceptions: exceptionRows,
  };
}
