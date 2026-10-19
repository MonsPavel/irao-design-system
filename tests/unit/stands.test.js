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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

describe('компонентные имена → поверхность стенда (пин T13.9)', () => {
  // build.mjs standBody: расширенный стенд showcase/pages/<имя>/index.html,
  // иначе канонический паттерн components/<имя>/<имя>.html (из него
  // генерируется стенд <имя>.html). Нет ни того ни другого — сборка лишь
  // предупреждает в лог, стенд компонента пуст (в зелёном прогоне
  // предупреждение незаметно): пин роняет юнит-прогон раньше.
  it('у каждого каталога components/ui-* есть pages/<имя>/index.html или канонический <имя>.html', () => {
    const dirs = readdirSync(join(root, 'components'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('ui-'))
      .map((entry) => entry.name);
    expect(dirs.length, 'компонентные каталоги на месте').toBeGreaterThan(0);
    for (const name of dirs) {
      const hasPage = existsSync(join(root, 'showcase', 'pages', name, 'index.html'));
      const hasPattern = existsSync(join(root, 'components', name, `${name}.html`));
      expect(
        hasPage || hasPattern,
        `${name}: нет ни showcase/pages/${name}/index.html, ни components/${name}/${name}.html — стенд полигона пуст`,
      ).toBe(true);
    }
  });
});

describe('COMPONENTS (showcase/build.mjs) ↔ стенды полигона (пин соответствия, T13.7)', () => {
  /**
   * История пина (замечание T9.1): матрица «тема × стенды» в ui-vi.spec.js
   * держала захардкоженный EPIC_4_5_STANDS — дубликат COMPONENTS; при
   * добавлении компонента матрица молча теряла покрытие. С T9.2 список
   * выводится из дискавери (helpers/stands.js) — дубликата больше нет; этот
   * пин держит соответствие двух оставшихся списков: каталог компонента
   * components/ui-… без строки в COMPONENTS — CSS не попадает в ui-core
   * (сборка лишь предупреждает — в зелёном прогоне предупреждение незаметно),
   * строка без каталога — мёртвая запись. Несоответствие роняет тест.
   */
  const COMPONENTS_EXCEPTION = 'ui-vi'; // паттерн панели: CSS вне ui-core (осознанно, README ui-vi)

  it('каталоги components/ui-* = COMPONENTS (с задокументированным исключением ui-vi)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const declaredBlock = build.match(/const COMPONENTS = \[([\s\S]*?)\n\];/)?.[1] ?? '';
    const declared = [...declaredBlock.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);

    expect(declared.length, 'список COMPONENTS распознан из build.mjs').toBeGreaterThan(0);
    expect(new Set(declared).size, 'в COMPONENTS нет дублей').toBe(declared.length);

    // Сторона каталогов — readdirSync(components/) (та же дискавери, что в
    // listStands): в listStands входят и спец-стенды showcase/pages/ui-*
    // (ui-table-scroll/ui-table-cards — страницы, не компоненты).
    const dirs = readdirSync(join(root, 'components'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('ui-'))
      .map((entry) => entry.name)
      .sort();
    const expected = dirs.filter((name) => name !== COMPONENTS_EXCEPTION);

    expect(
      [...declared].sort(),
      'COMPONENTS ≠ каталоги компонентов: молчаливый дрейф полигона/сборки',
    ).toEqual(expected);

    // Связь со стендами полигона: каждый компонент COMPONENTS имеет стенд
    // (и тем самым входит в матрицу «тема × стенды» автоматически).
    const stands = listStands();
    for (const name of declared) {
      expect(stands, `компонент ${name} без стенда полигона`).toContain(name);
    }
  });
});
