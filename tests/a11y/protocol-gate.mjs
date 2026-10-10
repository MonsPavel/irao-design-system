#!/usr/bin/env node
/**
 * Гейт полноты/подписи протокола скринридеров (T9.2; приёмка — AC «протокол
 * заполнен на 100% матрицы и подписан», DoD «протокол подписан»).
 *
 * Протокол (docs/ui-system/a11y/screen-reader-protocol.md) — ручной артефакт:
 * автоматизация скринридеров — Out of scope спринта. Гейт делает условие
 * действительности прогона (§6 протокола) машинно проверяемым: релиз T12.1
 * обязан запускать его и получать exit 0. Состояние на ветке T9.2 — «ожидает
 * ручного прогона» (exit 1): это ЧЕСТНЫЙ статус, а не провал структуры.
 *
 * Логика — tests/a11y/protocol-gate-lib.mjs (юнит-пин —
 * tests/unit/protocol-gate.test.js): незаполненная ячейка = «—» в data-строке
 * матрицы §3 или таблицы подписи §6; плюс структурные проверки (разделы,
 * минимум строк матрицы).
 *
 * Аргументы:
 *  --protocol <file>  путь протокола (дефолт docs/ui-system/a11y/screen-reader-protocol.md);
 *  --min-matrix <n>   минимум строк матрицы (дефолт 30; текущая матрица — 35).
 *
 * Выход: сводка в stdout; код 0 — протокол заполнен и подписан (гейт релиза
 * пройден); 1 — заполнен не полностью/нет подписи (ожидает ручного прогона);
 * 2 — структурные ошибки (нет разделов/урезана матрица).
 */
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateProtocolCompleteness } from './protocol-gate-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const options = {
    protocol: join(root, 'docs/ui-system/a11y/screen-reader-protocol.md'),
    'min-matrix': 30,
  };
  for (let i = 2; i < argv.length; i += 2) {
    const flag = typeof argv[i] === 'string' ? argv[i].slice(2) : '';
    if (!(flag in options) || argv[i + 1] === undefined) {
      throw new Error(
        `неизвестный или неполный аргумент: ${argv[i]} (доступны: --protocol --min-matrix)`,
      );
    }
    options[flag] = isAbsolute(argv[i + 1]) ? argv[i + 1] : join(root, argv[i + 1]);
  }
  return options;
}

const options = parseArgs(process.argv);
const markdown = readFileSync(options.protocol, 'utf8');
const result = evaluateProtocolCompleteness(markdown, {
  minMatrixRows: Number(options['min-matrix']),
});

console.log('== Гейт протокола скринридеров (T9.2, подпись — §6 протокола) ==');
console.log(`протокол: ${options.protocol}`);
console.log(
  `строк матрицы: ${result.matrixRows}; незаполненных ячеек: ${result.pendingCells.length}`,
);
for (const error of result.errors) {
  console.log(`FAIL структура: ${error}`);
}
for (const cell of result.pendingCells.slice(0, 10)) {
  console.log(`ОЖИДАЕТ: строка ${cell.line} (${cell.rowId}) — колонка «${cell.column}»`);
}
if (result.pendingCells.length > 10) {
  console.log(`… и ещё ${result.pendingCells.length - 10} незаполненных ячеек`);
}

if (result.errors.length) {
  console.log('RESULT: СТРУКТУРНЫЕ ОШИБКИ — гейт не применим (см. сводку)');
  process.exit(2);
}
if (result.pendingCells.length) {
  console.log(
    'RESULT: ПРОТОКОЛ НЕ ЗАПОЛНЕН/НЕ ПОДПИСАН — ожидает ручного прогона ' +
      '(NVDA + VoiceOver; автоматизация скринридеров — Out of scope T9.2)',
  );
  process.exit(1);
}
console.log('RESULT: OK — протокол заполнен на 100% матрицы и подписан (§6)');
