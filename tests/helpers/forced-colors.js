/**
 * Чистая логика критериев forced-colors e2e (задача T9.2; юнит-пин —
 * tests/unit/forced-colors.test.js). DOM-обвязка (borderOf/expectVisibleBorder)
 * живёт в tests/e2e/forced-colors.spec.js — здесь только чистые функции
 * (конвенция tests/README.md: «Чистая логика — отдельно от DOM-кода»).
 */

/**
 * Цвет непрозрачен: не transparent и альфа > 0, если сериализация её несёт.
 *
 * Chromium сериализует computed-цвет тремя формами (все обязательны к
 * поддержке — ревью ветки T9.2: комма-форма rgba — та, которую браузер реально
 * выдаёт для computed border-color):
 *  - комма-форма без альфы: `rgb(0, 0, 0)` — непрозрачен (альфы нет);
 *  - комма-форма с альфой:  `rgba(0, 0, 0, 0)` — альфа — ПОСЛЕДНИЙ
 *    комма-токен (прозрачен);
 *  - слэш-форма:            `rgb(0 0 0 / 0.5)` — альфа после «/».
 * Всё остальное (системные цвета forced-colors: CanvasText, ButtonBorder…)
 * — непрозрачно: ключевые слова не парсятся как rgba.
 *
 * @param {string} color computed-значение цвета
 * @returns {boolean}
 */
export function isOpaqueColor(color) {
  if (color.toLowerCase() === 'transparent') return false;
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return true; // системное ключевое слово (CanvasText, ButtonBorder…)
  const slashParts = rgba[1].split('/').map((part) => part.trim());
  if (slashParts.length === 2) return Number(slashParts[1]) > 0; // rgb(0 0 0 / a)
  const commaParts = slashParts[0].split(',').map((part) => part.trim());
  // 4 комма-токена = rgba — альфа последняя; 3 = rgb без альфы — непрозрачно.
  return commaParts.length === 4 ? Number(commaParts[3]) > 0 : true;
}
