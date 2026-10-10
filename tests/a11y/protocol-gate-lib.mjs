/**
 * Чистая логика гейта полноты/подписи протокола скринридеров (T9.2; юнит-пин —
 * tests/unit/protocol-gate.test.js). CLI-обёртка — tests/a11y/protocol-gate.mjs.
 *
 * Предмет — приёмка T9.2/действительность прогона по §6 самого протокола:
 * «прогон действителен, когда заполнены ВСЕ ячейки матрицы и подпись».
 * Незаполненная ячейка — «—» (em-dash) в любой data-строке таблицы: строки
 * матрицы §3 (колонки «Факт NVDA»/«Факт VO»/«Статус») и таблицы подписи §6.
 * Раздел «Расхождения» (§5) без находок — пустое ТЕЛО таблицы (без
 * строк-плейсхолдеров); «—» в data-строках любого раздела — незаполненность.
 *
 * Markdown ограничен структурой docs/ui-system/a11y/screen-reader-protocol.md:
 * таблицы с шапкой + разделителем (| --- |), data-строки начинаются с «|».
 * Разделитель и строки-заголовки ячейками не считаются.
 */

/** Строка — разделитель таблицы (| --- | --- |). */
function isSeparatorRow(line) {
  return /^\|[\s:|-]+\|?$/.test(line.trim());
}

/** Ячейки строки таблицы (между «|», трим); пустая строка → []. */
function cellsOf(line) {
  if (!line.trim().startsWith('|')) return [];
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Оценить полноту протокола.
 * @param {string} markdown содержимое протокола
 * @param {{minMatrixRows?: number}} [options] минимум строк матрицы (защита от
 *   урезания; дефолт 0 — чистая функция без политики, минимум задаёт CLI:
 *   текущая матрица T9.2 насчитывает 35 строк, гейт требует ≥ 30)
 * @returns {{complete: boolean, errors: string[], pendingCells: Array<{line: number,
 *   column: string, rowId: string}>, matrixRows: number}}
 */
export function evaluateProtocolCompleteness(markdown, options = {}) {
  const minMatrixRows = options.minMatrixRows ?? 0;
  const lines = markdown.split(/\r?\n/);
  const errors = [];

  if (!lines.some((line) => line.startsWith('## 3.'))) {
    errors.push('нет раздела матрицы «## 3.»');
  }
  if (!lines.some((line) => line.startsWith('## 6.'))) {
    errors.push('нет раздела подписи прогона «## 6.»');
  }

  let headers = [];
  let matrixRows = 0;
  const pendingCells = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSeparatorRow(line)) continue;
    const cells = cellsOf(line);
    if (cells.length === 0) {
      headers = [];
      continue;
    }
    // Шапка таблицы: следующая строка — разделитель.
    if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      headers = cells;
      continue;
    }
    // Строка матрицы сценариев: якорь «буква+номер» (D1…V4).
    if (/^[A-Z]\d+$/.test(cells[0])) {
      matrixRows++;
      cells.forEach((cell, index) => {
        if (cell === '—') {
          pendingCells.push({
            line: i + 1,
            column: headers[index] ?? `колонка ${index + 1}`,
            rowId: cells[0],
          });
        }
      });
    } else if (headers[0] === 'Поле' && cells.includes('—')) {
      // Таблица подписи §6 (шапка «Поле | Значение»).
      cells.forEach((cell, index) => {
        if (cell === '—') {
          pendingCells.push({
            line: i + 1,
            column: headers[index] ?? `колонка ${index + 1}`,
            rowId: cells[0] || `строка ${i + 1}`,
          });
        }
      });
    }
  }

  if (matrixRows < minMatrixRows) {
    errors.push(`строк матрицы ${matrixRows} — меньше минимума ${minMatrixRows} (урезание?)`);
  }

  return {
    complete: errors.length === 0 && pendingCells.length === 0,
    errors,
    pendingCells,
    matrixRows,
  };
}
