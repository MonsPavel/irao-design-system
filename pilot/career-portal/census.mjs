#!/usr/bin/env node
/**
 * pilot/career-portal/census.mjs — гейт ценза сайт-зоны пилота career-portal
 * (T17.16 — закрывающая EPIC-17: ценз полноты и гейт).
 *
 * Закрывает количественную цель эпика механизмом: фиксирует состояние
 * сайт-зоны на момент закрытия эпика числами и не даёт ей размыться первым
 * же новым блоком (Context T17.16 — «без гейта полнота размоется первым же
 * новым блоком — нужен явный стоп-правило»).
 *
 * Метрики (Implementation requirements T17.16 п.1 — «wc/селекторный
 * подсчёт pilot.css/pilot.js»):
 *  - строки — wc -l (число \n; файлы под prettier всегда с завершающим \n);
 *  - код сайт-зоны — строки без блочных комментариев и пустых: файловые
 *    комментарии пилота — несущая документация (источники значений,
 *    прецеденты, решения) по дисциплине паттернов ДС, поэтому цель эпика
 *    «pilot.css ≤ 600 строк ритма/раскладок конкретных страниц» гейтится
 *    в этой метрике (строка сверху порога — деградация);
 *  - cp-селекторы — селекторы правил (прелюдии до «{», разбитые по
 *    запятым), содержащие `.cp-`; упоминания cp-* в комментариях не
 *    считаются (пин разметки — ревью T17.14, e673879);
 *  - cp-семейства — блок имена классов cp-* со срезом по `__`/`--`
 *    (`.cp-hero__tag--sand` → `hero`), уникальные, отсортированные;
 *    механический носитель цензовой таблицы «блок → судьба» (REPORT §11.4);
 *  - JS пилота — строки wc (карусель/галерея — в dist/ui.min.js с T17.7).
 *
 * Пороги — явные числа по факту итога T17.16 (Implementation requirements
 * п.1 — «не „меньше“, а конкретное значение»; деградация — exit 1):
 *  - MAX_PILOT_CSS_LINES = 1040 — сырые строки pilot.css на закрытие эпика;
 *    любой рост — деградация сайт-зоны;
 *  - MAX_PILOT_CSS_CODE_LINES = 600 — цель эпика (README EPIC-17 AC) в
 *    метрике кода сайт-зоны; факт итога 519;
 *  - MAX_PILOT_JS_LINES = 187 — строки pilot.js на закрытие эпика;
 *  - MAX_CP_FAMILIES = 30 и ALLOWED_CP_FAMILIES — семейства ценза «после»:
 *    появление семейства вне списка = новый cp-визуальный блок = ошибка
 *    (правило CONTRIBUTING: новый визуальный блок клона — задача ДС).
 *
 * Логика — чистые функции censusMetrics/runCensusGate (юнит-пин —
 * tests/unit/pilot-census-gate.test.js); CLI — тонкая обёртка. Запуск:
 *
 *   node pilot/career-portal/census.mjs
 *
 * Тот же гейт выполняет compare.mjs до браузерного прогона, сразу после
 * гейта ссылок (Scope T17.16: «подключение — в запуск compare (до
 * браузеров, как гейт ссылок T15.9)»). Выход: 0 — гейт пройден (0 проблем);
 * 1 — деградация/новый cp-блок/файлы не найдены.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));

/** Пороги — факт итога T17.16 (см. шапку). Изменение числа — осознанная
 *  правка ценза вместе с юнит-пином и REPORT §11.4, не «подгонка». */
export const MAX_PILOT_CSS_LINES = 1040;
export const MAX_PILOT_CSS_CODE_LINES = 600;
export const MAX_PILOT_JS_LINES = 187;
export const MAX_CP_FAMILIES = 30;

/** Семейства сайт-зоны на закрытие эпика (ценз после, REPORT §11.4):
 *  ритм/раскладки страниц, тоны/тон-строки и хуки проб — классификация
 *  каждой судьбы в REPORT §11.4; новое семейство = новый cp-визуальный
 *  блок = ошибка гейта. */
export const ALLOWED_CP_FAMILIES = [
  'adv-grid',
  'article-card',
  'catalog-nav',
  'company-adv',
  'company-banner',
  'company-card',
  'company-stats',
  'company-title',
  'dir-modal',
  'directions',
  'event-card',
  'events-feature',
  'events-nav',
  'hero',
  'holding',
  'intern-card',
  'intern-person',
  'media-toolbar',
  'offer-card',
  'org-card',
  'page',
  'page-head',
  'page-subtitle',
  'production',
  'tabs-links',
  'tabs-row',
  'team',
  'vac-main',
  'vacancy-search',
  'why-us',
];

/** wc -l — число \n (файлы под prettier всегда с завершающим \n). */
const wcLines = (text) => (text.match(/\n/g) ?? []).length;

/**
 * Ценз текстов pilot.css/pilot.js (чистая функция — юнит-пин).
 *
 * @param {string} css исходник pilot.css
 * @param {string} js исходник pilot.js
 * @returns {{css: {lines: number, codeLines: number, selectors: number,
 *   families: string[]}, js: {lines: number}}}
 */
export function censusMetrics(css, js) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [];
  for (const [, prelude] of withoutComments.matchAll(/([^{}]+)\{/g)) {
    for (const raw of prelude.split(',')) {
      const selector = raw.trim();
      if (selector.includes('.cp-')) selectors.push(selector);
    }
  }
  const families = new Set();
  for (const selector of selectors) {
    for (const [, token] of selector.matchAll(/\.cp-([a-z0-9-]+)/g)) {
      families.add(token.split(/__|--/)[0]);
    }
  }
  return {
    css: {
      lines: wcLines(css),
      codeLines: withoutComments.split('\n').filter((line) => line.trim() !== '').length,
      selectors: selectors.length,
      families: [...families].sort(),
    },
    js: { lines: wcLines(js) },
  };
}

/**
 * Гейт ценза над метриками (чистая функция): новые cp-семейства вне
 * allowlist и превышение любого порога — по проблеме в список.
 *
 * @param {ReturnType<typeof censusMetrics>} metrics
 * @param {{maxCssLines: number, maxCssCodeLines: number, maxJsLines: number,
 *   maxCpFamilies: number, allowedCpFamilies: string[]}} thresholds
 * @returns {{problems: string[], newBlocks: string[]}}
 */
export function runCensusGate(
  metrics,
  thresholds = {
    maxCssLines: MAX_PILOT_CSS_LINES,
    maxCssCodeLines: MAX_PILOT_CSS_CODE_LINES,
    maxJsLines: MAX_PILOT_JS_LINES,
    maxCpFamilies: MAX_CP_FAMILIES,
    allowedCpFamilies: ALLOWED_CP_FAMILIES,
  },
) {
  const { css, js } = metrics;
  const problems = [];
  const newBlocks = css.families.filter((family) => !thresholds.allowedCpFamilies.includes(family));
  for (const family of newBlocks) {
    problems.push(
      `новое cp-семейство «${family}» вне ценза T17.16 — новый визуальный блок клона живёт в ДС (CONTRIBUTING, правило пилота)`,
    );
  }
  if (css.families.length > thresholds.maxCpFamilies) {
    problems.push(`cp-семейств: ${css.families.length} > порога ${thresholds.maxCpFamilies}`);
  }
  if (css.lines > thresholds.maxCssLines) {
    problems.push(
      `pilot.css: ${css.lines} строк > порога ${thresholds.maxCssLines} (деградация сайт-зоны)`,
    );
  }
  if (css.codeLines > thresholds.maxCssCodeLines) {
    problems.push(
      `pilot.css: код ${css.codeLines} строк > порога ${thresholds.maxCssCodeLines} (превышена цель эпика — ≤600 строк ритма/раскладок)`,
    );
  }
  if (js.lines > thresholds.maxJsLines) {
    problems.push(
      `pilot.js: ${js.lines} строк > порога ${thresholds.maxJsLines} (карусель/галерея — в dist)`,
    );
  }
  return { problems, newBlocks };
}

/** CLI-обёртка: выполняется только при прямом запуске файла (практика
 *  check-links.mjs). */
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const paths = {
    css: join(PILOT_DIR, 'pilot.css'),
    js: join(PILOT_DIR, 'pilot.js'),
  };
  for (const [name, path] of Object.entries(paths)) {
    if (!existsSync(path)) {
      console.error(`файл не найден: ${path} — ценз считается по исходникам пилота (${name})`);
      process.exit(1);
    }
  }
  const metrics = censusMetrics(readFileSync(paths.css, 'utf8'), readFileSync(paths.js, 'utf8'));
  const gate = runCensusGate(metrics);
  const codeGoal =
    metrics.css.codeLines <= MAX_PILOT_CSS_CODE_LINES
      ? `цель эпика ≤${MAX_PILOT_CSS_CODE_LINES} кода — выполнена`
      : `цель эпика ≤${MAX_PILOT_CSS_CODE_LINES} кода — НЕ выполнена`;
  console.log(
    `ценз сайт-зоны: pilot.css ${metrics.css.lines} строк (код ${metrics.css.codeLines}, ${codeGoal}), ` +
      `cp-семейств ${metrics.css.families.length} (${metrics.css.selectors} селекторов), ` +
      `JS пилота ${metrics.js.lines} строк (карусель/галерея — в dist)`,
  );
  if (gate.problems.length > 0) {
    console.error(
      `гейт ценза: ${gate.problems.length} проблем:\n` +
        gate.problems.map((problem) => `  ${problem}`).join('\n'),
    );
    process.exit(1);
  }
  console.log(`гейт: новых cp-визуальных блоков 0 (allowlist ${ALLOWED_CP_FAMILIES.length}) — OK`);
}
