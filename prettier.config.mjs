/**
 * prettier irao-ui — единый стиль кода (задача T1.2, «prettier + editorconfig»).
 *
 * `.editorconfig` читается prettier автоматически (отступы, финальный перевод
 * строки, кодировка) — дублируем только то, чего там нет.
 *
 * `endOfLine: 'auto'`, а не `lf`: в репозитории Windows-разработка с
 * `core.autocrlf=true` — рабочая копия в CRLF, prettier с `lf` красил бы
 * каждый файл после свежего чекаута. В git-хранилище файлы нормализованы в LF
 * (autocrlf), на CI Linux-чекаут тоже LF — «auto» сохраняет конец строки
 * каждого файла как есть и не создаёт шума.
 *
 * Область действия — код (css/js/mjs/json/html): прозу (*.md) prettier не
 * форматирует, см. .prettierignore.
 */

/** @type {import("prettier").Config} */
const config = {
  endOfLine: 'auto',
  printWidth: 100,
  tabWidth: 2,
  singleQuote: true,
};

export default config;
