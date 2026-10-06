/**
 * Пин переноса кнопочной части AC2 T2.6 (ревью приёмки T2.6; обновлён T4.2).
 *
 * Критерий «Кнопка (совместно с T4.2): hover — из токенов-пар, active —
 * color-mix на кнопке; visual-эталоны состояний сняты» до T4.2 был записан
 * текстом в tests/e2e/README.md (конвенция tests/README.md: сценарии, чья
 * поверхность ещё не появилась, фиксируются в README и переезжают в код
 * без изменения сути). С реализацией ui-button (T4.2) сценарий исполняется
 * кодом — tests/e2e/ui-button.spec.js (hover-пары, color-mix-active, смена
 * темы); эта секция README остаётся записью сценария с конкретными
 * computed-значениями. Пин не даёт записи потерять конкретику и статус
 * «исполняется» (иначе суб-часть AC2 «потерялась бы» молча).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
let readme = '';
let section = '';

beforeAll(() => {
  readme = readFileSync(join(root, 'tests/e2e/README.md'), 'utf8');
  const start = readme.indexOf('## Сценарий T2.6');
  const next = readme.indexOf('\n## ', start + 1);
  section = readme.slice(start, next === -1 ? undefined : next);
});

describe('T2.6, кнопочная часть AC2 — сценарий исполняется кодом с T4.2', () => {
  it('секция сценария T2.6 присутствует со статусом «исполняется» и ссылкой на e2e ui-button', () => {
    expect(section, 'секции «Сценарий T2.6» нет в tests/e2e/README.md').toContain('Сценарий T2.6');
    expect(section).toContain('Статус: **исполняется**');
    expect(section).toContain('ui-button.spec.js');
    expect(section).toContain('T4.2');
  });

  it('запись конкретна: токены-пары и computed-значения одобренного дизайна', () => {
    expect(section).toContain('--ui-color-primary-hover');
    expect(section).toContain('--ui-color-accent-hover');
    // blue-700 #164b89 и accent-light #f37131 — значения макета, не color-mix.
    expect(section).toContain('rgb(22, 75, 137)');
    expect(section).toContain('rgb(243, 113, 49)');
  });

  it('active записан по конвенции ADR-0010: color-mix 88% базовый + black', () => {
    expect(section).toContain('color-mix(in srgb, var(--ui-color-primary)');
    expect(section).toContain('88%, black)');
    expect(section).toContain('88%');
  });

  it('visual-эталоны привязаны к окружению создания по ADR-0003/0004 (test:docker/CI), не хост', () => {
    expect(section).toContain('test:docker');
    expect(section).toContain('ADR-0003/0004');
  });

  it('общая часть сценария — derived-states.spec.js упомянут', () => {
    expect(section).toContain('derived-states.spec.js');
  });
});
