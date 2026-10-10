/**
 * Юнит-пин гейта полноты/подписи протокола скринридеров (T9.2, приёмка:
 * AC «протокол заполнен на 100% матрицы и подписан» обязан быть машинно
 * проверяемым артефактом релиза T12.1).
 *
 * Гейт — чистая функция evaluateProtocolCompleteness(markdown): незаполненная
 * ячейка — это «—» в любой data-строке таблицы (матрица §3 и подпись §6);
 * НО негеитивный кейс: текущий протокол на ветке содержит 105 незаполненных
 * ячеек матрицы и 6 полей подписи — гейт обязан это видеть (состояние
 * «ожидает ручного прогона», а не «завершен»).
 */
import { describe, expect, it } from 'vitest';
import { evaluateProtocolCompleteness } from '../../tests/a11y/protocol-gate-lib.mjs';

/** Мини-протокол: 2 сценария, подпись заполнена. */
const COMPLETE = `# Протокол

## 3. Матрица

| # | Сценарий | Ожидание | Пин | Факт NVDA | Факт VO | Статус |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Tab | кнопка, свернуто | spec | PASS: кнопка свернуто | PASS | PASS |
| D2 | Enter | развернуто | spec | PASS | PASS | PASS |

## 5. Расхождения

| Сценарий | SR | Факт | Ожидание | Решение |
| --- | --- | --- | --- | --- |

## 6. Подпись прогона

| Поле | Значение |
| --- | --- |
| SHA полигона | abc1234 |
| Исполнитель | Иванов И.И. |
`;

/** Тот же протокол с незаполненной ячейкой факта. */
const PENDING = COMPLETE.replace('PASS: кнопка свернуто', '—');

describe('гейт протокола скринридеров: полнота и подпись', () => {
  it('заполненный протокол с подписью — complete, 0 незаполненных ячеек', () => {
    const result = evaluateProtocolCompleteness(COMPLETE);
    expect(result.complete).toBe(true);
    expect(result.pendingCells).toEqual([]);
    expect(result.matrixRows).toBe(2);
  });

  it('НЕГАТИВНЫЙ КЕЙС: ячейка «—» в колонке факта — не complete, ячейка локализована', () => {
    const result = evaluateProtocolCompleteness(PENDING);
    expect(result.complete).toBe(false);
    expect(result.pendingCells).toHaveLength(1);
    expect(result.pendingCells[0].column).toBe('Факт NVDA');
    expect(result.pendingCells[0].rowId).toBe('D1');
  });

  it('незаполненная подпись («—» в §6) — не complete', () => {
    const result = evaluateProtocolCompleteness(COMPLETE.replace('| abc1234 |', '| — |'));
    expect(result.complete).toBe(false);
    expect(result.pendingCells[0].column).toBe('Значение');
  });

  it('отсутствие разделов матрицы/подписи — структурная ошибка', () => {
    const result = evaluateProtocolCompleteness('# Только заголовок\n');
    expect(result.complete).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('минимум строк матрицы (защита от урезания) — опция minMatrixRows', () => {
    const result = evaluateProtocolCompleteness(COMPLETE, { minMatrixRows: 5 });
    expect(result.complete).toBe(false);
    expect(result.errors.some((e) => e.includes('5'))).toBe(true);
  });
});
