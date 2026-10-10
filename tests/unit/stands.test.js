/**
 * Юнит-пин списка стендов полигона (вспомогательный tests/helpers/stands.js,
 * задача T9.2: финальный VI-прогон и axe-обход по ВСЕМ страницам).
 *
 * Гарантии:
 *  - список непуст, без дублей, имена — контракт openStand (harness):
 *    сегменты [a-z][a-z0-9-]*, вложенность через «/»;
 *  - сгенерированный стенд «tokens» (showcase/tokens-stand.mjs) в списке;
 *  - паттерны присутствуют с префиксом patterns/, интеграция — integration/;
 *  - базовые стенды из канонических паттернов (дискавери = сборка,
 *    showcase/build.mjs discoverComponents) в списке;
 *  - каждый пункт списка имеет источник: каталог showcase/pages/<name>/,
 *    components/<name>/ или patterns/<name>/ (dist не читаем — он
 *    генерируется сборкой).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listStands } from '../../tests/helpers/stands.js';

const root = join(import.meta.dirname, '../..');

describe('список стендов полигона (helpers/stands)', () => {
  const stands = listStands();

  it('непуст, без дублей, имена — контракт openStand', () => {
    expect(stands.length).toBeGreaterThan(30);
    expect(new Set(stands).size).toBe(stands.length);
    for (const name of stands) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*$/);
    }
  });

  it('сгенерированный стенд tokens и служебные семейства на месте', () => {
    expect(stands).toContain('tokens');
    for (const prefix of ['patterns/', 'integration/']) {
      expect(
        stands.some((name) => name.startsWith(prefix)),
        prefix,
      ).toBe(true);
    }
    // Базовые стенды из канонических паттернов (без каталога showcase/pages):
    // дискавери списка = дискавери сборки полигона (discoverComponents).
    for (const canonical of [
      'ui-badge',
      'ui-checkbox',
      'ui-radio',
      'ui-radio-group',
      'ui-skip-link',
    ]) {
      expect(stands, canonical).toContain(canonical);
    }
  });

  it('каждому стенду соответствует источник в репозитории', () => {
    for (const name of stands) {
      // tokens генерируется showcase/tokens-stand.mjs (файл, не каталог);
      // у остальных источник — каталог pages/components/patterns.
      const source = name.startsWith('patterns/')
        ? `patterns/${name.slice('patterns/'.length)}`
        : name === 'tokens'
          ? 'showcase/tokens-stand.mjs'
          : existsSync(join(root, `showcase/pages/${name}`))
            ? `showcase/pages/${name}`
            : `components/${name}`;
      expect(existsSync(join(root, source)), `${name}: нет источника ${source}`).toBe(true);
    }
  });
});
