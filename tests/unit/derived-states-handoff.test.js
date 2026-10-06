/**
 * Пин переноса кнопочной части AC2 T2.6 (ревью приёмки T2.6).
 *
 * Критерий «Кнопка (совместно с T4.2): hover — из токенов-пар, active —
 * color-mix на кнопке; visual-эталоны состояний сняты» физически не исполним,
 * пока нет ui-button (T4.2 не реализована: components/ — только README.md), а
 * visual-эталоны пишутся только в контейнере/CI (ADR-0004). По конвенции
 * tests/README.md («сценарии, чья поверхность ещё не появилась, фиксируются
 * в tests/e2e/README.md текстом; при появлении инфраструктуры переезжают
 * в код без изменения сути») сценарий записан в tests/e2e/README.md —
 * секция «Сценарий T2.6, кнопочная часть». Прецедент пина — T2.4 в
 * tests/unit/themes.test.js: тест не даёт записи потерять конкретику,
 * иначе суб-часть AC2 останется «неподтверждённой» молча навсегда.
 * Закрытие критерия — при приёмке T4.2.
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

describe('T2.6, кнопочная часть AC2 — запись в tests/e2e/README.md до T4.2', () => {
  it('секция сценария T2.6 присутствует со статусом «ожидает поверхности» (ui-button — T4.2)', () => {
    expect(section, 'секции «Сценарий T2.6» нет в tests/e2e/README.md').toContain(
      'Сценарий T2.6',
    );
    expect(section).toContain('Статус: **ожидает поверхности**');
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
    expect(section).toContain('color-mix(in srgb, var(--ui-color-primary) 88%, black)');
    expect(section).toContain('88%');
  });

  it('visual-эталоны привязаны к окружению создания по ADR-0004 (test:docker/CI), не хост', () => {
    expect(section).toContain('test:docker');
    expect(section).toContain('ADR-0004');
  });

  it('общая часть сценария уже в коде — derived-states.spec.js упомянут', () => {
    expect(section).toContain('derived-states.spec.js');
  });
});
