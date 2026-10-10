/**
 * Список стендов полигона — единый источник для сквозных прогонов (задача
 * T9.2): финальная VI-матрица «тема × все стенды» (tests/e2e/ui-vi.spec.js)
 * и axe-обход всех страниц (tests/a11y/stands-sweep.spec.js).
 *
 * Источник — та же дискавери, что у сборки полигона (showcase/build.mjs,
 * discoverComponents + генерация stands/): dist/ не читаем (генерируется, в
 * git не входит). Стенд полигона — это:
 *  - каталог showcase/pages/<name>/ → расширенный стенд <name>.html
 *    (вложенность integration/form-full-cycle → integration/form-full-cycle.html);
 *  - каталог components/ui-<name>/ без расширенного стенда → базовый стенд,
 *    сгенерированный из канонического паттерна (CONTRIBUTING; примеры —
 *    ui-checkbox, ui-radio, ui-radio-group, ui-skip-link, ui-badge);
 *  - каталог patterns/<name>/ → стенд patterns/<name>.html (T7.x);
 *  - стенд tokens — генератор showcase/tokens-stand.mjs (константа списка).
 * Имена объединяются: расширенный стенд и канонический паттерн носят одно
 * имя. Новый компонент/каталог = новый стенд = автоматический вход в оба
 * сквозных прогона; юнит-пин — tests/unit/stands.test.js.
 *
 * Корень репозитория — process.cwd(): оба потребителя стартуют npm-скриптами
 * из корня (npm test / test:unit — 02-architecture §10). import.meta здесь
 * нельзя: Playwright транслирует спеки в CJS (конвенция harness.js —
 * ESM-синтаксис в .js без "type": "module").
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Стенды, которых нет ни как каталога pages, ни как компонента (генераторы). */
const GENERATED = ['tokens'];

/** Каталоги showcase/pages, не являющиеся стендами (служебные обвязки). */
const NON_STAND = new Set(['integration']);

/** Имена стендов полигона, отсортированные (детерминизм прогонов). */
export function listStands() {
  const root = process.cwd();
  const pages = readdirSync(join(root, 'showcase/pages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      if (NON_STAND.has(entry.name)) {
        // Вложенные стенды (integration/form-full-cycle) — с префиксом.
        return readdirSync(join(root, 'showcase/pages', entry.name), { withFileTypes: true })
          .filter((nested) => nested.isDirectory())
          .map((nested) => `${entry.name}/${nested.name}`);
      }
      return [entry.name];
    });
  const components = readdirSync(join(root, 'components'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('ui-'))
    .map((entry) => entry.name);
  const patterns = readdirSync(join(root, 'patterns'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `patterns/${entry.name}`);
  return [...new Set([...GENERATED, ...pages, ...components, ...patterns])].sort();
}
