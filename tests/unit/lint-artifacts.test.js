/**
 * Юнит-пин lint-пайплайна (регрессия приёмки T4.4).
 *
 * `npm run lint` обязан быть зелёным на СОБРАННОМ репозитории: сборочные
 * артефакты (dist/, showcase/dist/) — машинный вывод build.mjs, а не исходники
 * системы. Минифицированный ui-core.min.css закономерно содержит ссылки на
 * примитивы (слой 2 склеен в один файл) и !important из a11y/vi.css — гейты
 * stylelint написаны для исходников и на бандле давать «ошибки» не должны.
 * История: dist/ исключён изначально (T1.2), showcase/dist/ — полигон,
 * добавлен при T4.4 (приёмка: stylelint валил артефакт после npm run build).
 * Эмпирическая поверхность пина — команда гейта: `npm run build && npm run
 * lint` → exit 0 (прогон выполняется вручную на собранном репо; юнит-тест
 * пинит исполняемую форму конфигурации, как пинят COMPONENTS/CHECK_STANDS
 * другие тесты каталога).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('lint-пайплайн игнорирует сборочные артефакты (регрессия приёмки T4.4)', () => {
  it('lint:css исключает dist/ и showcase/dist/ (минифицированный бандл — не исходник)', () => {
    const script = pkg.scripts['lint:css'];
    expect(script, 'существующее исключение dist/ сохранено').toContain('"!dist/**"');
    expect(script, 'полигон showcase/dist/ исключён из stylelint').toContain('"!showcase/dist/**"');
  });

  it('.prettierignore покрывает машинные артефакты (секция «Машинные артефакты»)', () => {
    const ignore = readFileSync(join(root, '.prettierignore'), 'utf8');
    expect(ignore).toMatch(/^dist\/$/m);
    expect(ignore).toMatch(/^showcase\/dist\/$/m);
  });
});
