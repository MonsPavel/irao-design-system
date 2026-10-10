/**
 * Библиотека ревизии контраста ПРОИЗВОДНЫХ состояний (задача T9.2) — чистые
 * функции без зависимостей.
 *
 * Предмет — производные hover/active состояний (T2.6, ADR-0010): пары
 * «подпись/индикатор → фон состояния», где фон — явный токен-пара
 * (--ui-color-primary-hover) или конвенция color-mix(in srgb, токен 88%,
 * black). Расширение контраст-гейта T2.3 (tests/contrast/check.mjs) другим
 * набором пар: те же математика (lib.mjs) и дисциплина «нарушение → фикс или
 * осознанное исключение с обоснованием» (Implementation requirements T9.2 п.2).
 *
 * Пороги (чек-лист T9.2, ADR-0010 п.6):
 *  - кнопочные подписи — «крупные элементы ≥ 3:1» (level: 'large'); подписи
 *    кнопок формально 14px (не WCAG-large) — критерий чек-листа T9.2 сознанно
 *    мягче 4.5:1, разрыв фиксируется исключением, а не порогом;
 *  - ссылки/крошки (текст роли body/small) — обычный текст 4.5:1 ('text');
 *  - фокус — некстовые ≥ 3:1 ('non-text').
 *
 * Смешение — sRGB-каналы: c = P%·base + (100−P)%·with, результат — 8-бит
 * (округление браузера, значение #00234c для 88% blue-800 подтверждено e2e
 * derived-states.spec.js). Цвета с альфой в парах не вычислимы (нужна
 * подложка) — alpha-производные (например, hover триггера ui-select,
 * color-mix 55% transparent) в конфиг не попадают: граница гейта, не баг.
 */
import { contrastRatio, normalizeColor, parseColor, resolveTokenColor } from './lib.mjs';

/** Разрешить спецификацию цвета пары: {token} — var()-цепочка; {mix} —
 * производная {base, percent, with} от токена (with — константа подмешивания,
 * CSS-ключевое слово black = #000000). Возвращает нормализованный hex. */
export function resolveColorSpec(spec, primitives, semantic) {
  if (spec.token !== undefined) {
    return resolveTokenColor(spec.token, new Map([...primitives, ...semantic]));
  }
  const { base, percent, with: withColor } = spec.mix;
  const baseColor = resolveTokenColor(base, new Map([...primitives, ...semantic]));
  return mixInSrgb(baseColor, percent, withColor);
}

/** color-mix(in srgb, base percent%, withColor) — каналы sRGB, результат
 * округляется до 8 бит (сериализация браузера), ответ — hex #rrggbb. */
export function mixInSrgb(base, percent, withColor) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`percent вне 0–100: ${percent}`);
  }
  const a = parseColor(base);
  const b = parseColor(withColor);
  if (!a || !b) throw new Error(`аргумент не цвет: ${!a ? base : withColor}`);
  const share = percent / 100;
  const channel = (x, y) => Math.round(share * x + (1 - share) * y);
  return normalizeColor({
    r: channel(a.r, b.r),
    g: channel(a.g, b.g),
    b: channel(a.b, b.b),
    a: 1,
  });
}

/**
 * Проверка конфига производных пар против карт объявлений слоёв 1–2.
 *
 * @param {object} input
 * @param {Map<string, string>} input.primitives слой 1
 * @param {Map<string, string>} input.semantic слой 2
 * @param {Array<{id: string, level: string, fg: object, bg: object, usage: string}>} input.pairs
 * @param {Array<{id: string, reason: string}>} input.exceptions — id пары, а не токена:
 *   производная — пара «состояние → фон», исключение относится к разрыву пары
 * @param {{text: number, large: number, 'non-text': number}} [input.thresholds]
 * @returns {{
 *   rows: Array<{id: string, usage: string, level: string, threshold: number,
 *                fgValue: string, bgValue: string, ratio: number, pass: boolean,
 *                excepted: boolean}>,
 *   violations: rows (не прошедшие порог БЕЗ исключения),
 *   exceptionRows: rows с исключением (pass не переписывается — факт виден),
 *   configErrors: string[],
 * }}
 */
export function evaluateDerivedContrast({ primitives, semantic, pairs, exceptions, thresholds }) {
  const limits = thresholds ?? { text: 4.5, large: 3, 'non-text': 3 };
  const configErrors = [];

  const seenIds = new Set();
  const rows = [];
  for (const pair of pairs) {
    if (seenIds.has(pair.id)) configErrors.push(`дубль id пары: ${pair.id}`);
    seenIds.add(pair.id);
    if (!(pair.level in limits)) {
      configErrors.push(`${pair.id}: неизвестный уровень порога «${pair.level}»`);
    }
    let fgValue;
    let bgValue;
    try {
      fgValue = resolveColorSpec(pair.fg, primitives, semantic);
    } catch (error) {
      configErrors.push(`${pair.id}: fg — ${error.message}`);
    }
    try {
      bgValue = resolveColorSpec(pair.bg, primitives, semantic);
    } catch (error) {
      configErrors.push(`${pair.id}: bg — ${error.message}`);
    }
    if (fgValue === undefined || bgValue === undefined) continue;
    const ratio = contrastRatio(parseColor(fgValue), parseColor(bgValue));
    rows.push({
      id: pair.id,
      usage: pair.usage,
      level: pair.level,
      threshold: limits[pair.level],
      fgValue,
      bgValue,
      ratio,
      pass: ratio >= limits[pair.level],
      excepted: false,
    });
  }

  const exceptedIds = new Set();
  for (const exception of exceptions) {
    if (!seenIds.has(exception.id)) {
      configErrors.push(`исключение для неизвестной пары ${exception.id}`);
      continue;
    }
    exceptedIds.add(exception.id);
  }
  for (const row of rows) {
    if (exceptedIds.has(row.id)) row.excepted = true;
  }

  return {
    rows,
    violations: rows.filter((row) => !row.pass && !row.excepted),
    exceptionRows: rows.filter((row) => row.excepted),
    configErrors,
  };
}
