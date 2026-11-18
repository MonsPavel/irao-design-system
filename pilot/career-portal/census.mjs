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
 *  - MAX_PILOT_CSS_LINES = 2272 — сырые строки pilot.css (текущий порог;
 *    эволюция в errata-цепочке ниже). Errata 31.10:
 *    1040 → 1162 (production/directions) → 1169 (раунд 7) → 1237 (батч
 *    «все страницы»: v2-модификаторы cp-production--v2/cp-holding--compact)
 *    → 1290 (батч ритма 01.11); → 1417 (T18.1: вариант фото-карточек
 *    students--photographic — сайт-зона stu-photo ПОКА, вынос в слой —
 *    T18.17); → 1431 (T18.2: тон-строка активной карточки mentorship на
 *    хуке канона --msh-card-active-bg — блоки v2 msh/vcp на канонах
 *    паттерн-слоя, сайт-зоне осталась только цветовая строка; правка по
 *    процедуре errata); → 1520 (T18.3: позиционные хуки лент компании
 *    cp-company-feed — шаг 36px/низ 56px, nowrap/кламп/типографика «как
 *    есть» строк вакансий, фиксированные высоты фото карточек и галереи
 *    против aspect-канона ui-card--media); → 1738 (T18.4: позиционные хуки
 *    career-track ctr- — форма cover-hero на каркасе cvh, вид чипов/этапов/
 *    step-info/теста «как есть» pages.css:676–792; каркасы — ДС/слой cvh/
 *    ui-chip/ui-button/роли); → 1894 (T18.5: позиционные хуки education
 *    edu- — форма cover-hero на каркасе cvh, группа тегов-фильтров, hero
 *    компаний, шапки/сетки «как есть» pages.css:953–967/217/796–803/11/827;
 *    карточки к канону оригинала — cp-org-card/cp-offer-card паддинг 24,
 *    cp-adv-grid шаг 24, пары заголовков карточек lh 1.3/без трекинга роли, flex-shrink: 0 кнопке шапки); → 2128 (T18.6: позиционные хуки
 *    лендингов стажировок/практик int- — ритм секций pad 40/титулы mb 32/
 *    контейнеры pad 40, форма cover-hero на каркасе cvh, шапка/чипы/сетка
 *    направлений, композиция марки mrq — колонка/фото 260, карточки
 *    стажёров 4/3, лента мероприятий events-feature 2fr/1fr «как есть»
 *    pages.css:336/341/68/1009–1054/1083–1146/565–581/1150–1171); → 2272
 *    (T18.9: позиционные хуки точечного хвоста cmp-/ev-/ia- — ритм грида
 *    сегментов companies (шапка 16/40, титулы 32, сетки 36/48), обложка
 *    cover-hero (align-items: flex-start pages.css:955) + лента фильтров +
 *    карточка события 16/220 на сетке 36 events, карточная форма анкеты
 *    internship-apply (паддинг 36, радио-строки 52); каркасы — ДС/слой,
 *    источники pages.css:9/14/36–41/347/565–581/953–969/367–375 + inline
 *    страниц); → T18.10 (вынос обложки страниц в слой: пара cp-page-head/
 *    cp-page-subtitle снята из разметки и pilot.css — канон php слоя;
 *    дубликаты базы канона сняты — хуки .cmp-head и низ .edu-offer-head;
 *    обложка events переведена с cp-page-head на каркас cvh; семейства
 *    page-head/page-subtitle ушли из allowlist — судьба «вынос в слой»,
 *    REPORT §11.4); → T18.11 (вынос строки табов + ссылок в слой: пара
 *    cp-tabs-row/cp-tabs-links и хуки .int-tabs .cp-tabs-row сняты из
 *    разметки и pilot.css — канон tnv слоя; семейства tabs-row/tabs-links
 *    ушли из allowlist — судьба «вынос в слой», REPORT §11.4); → T18.12
 *    (вынос тёмной секции why-us в слой: пара cp-why-us целиком — секция/
 *    top/title/row/стекло-карточки/hover — и ступени 1023/767 сняты из
 *    разметки и pilot.css — канон whu слоя; семейство why-us ушло из
 *    allowlist — судьба «вынос в слой», REPORT §11.4); T18.13: вынос
 *    раскладок карусели production (канон prd поверх ui-carousel) —
 *    2108 → 1818, потолок не двигается; T18.14: вынос сетки направлений
 *    и холдинга (каноны dir/hld) — 1818 → 1722; T18.15: вынос
 *    company-семейств (каноны dpp-stats/dpp-adv/dpp-section-title/
 *    dpp-banner + lpp-card) — 1722 → 1648; T18.16: вынос панели «Найди
 *    свою вакансию» и контента модалки направления (каноны vcs/dmd) —
 *    1648 → 1599; T18.17: батч cp-остатков (7 выносов в слой —
 *    mtb/ofc-card/org-card/cnv/adv-grid/evt-feature/tm + 5 «остаётся
 *    сайт-зоне» на не-cp именах) — 1599 → 1441; закрывающая T18.18:
 *    итог эпика — сырые 1441, потолки-пороги НЕ понижаются (файл сжался;
 *    прецедент «пороги не двигаются» T17.18/T18.10–T18.17; переход ценза
 *    «порога-потолка» на убывающий гейт — решение владельца, Out of scope
 *    EPIC-18 — README эпика; факты итога — REPORT §11.6); любой рост
 *    сверх — деградация сайт-зоны. Errata 18.11 (батч бэклога):
 *    1441 → 1448 — комментарии-девиации хуков ctr-steps/company-feed
 *    (документация принятых отклонений; код 580 и порог 2272 не тронуты);
 *  - MAX_PILOT_CSS_CODE_LINES = 869 — цель эпика (README EPIC-17 AC) в
 *    метрике кода сайт-зоны. Errata 31.10: 600 → 618 → 622 → 675 (батч
 *    «все страницы») → 723 (батч ритма 01.11) → 819 (T18.1) → 822 (T18.2 —
 *    тот же курс: одна тон-строка + каркас правила) → 869 (T18.3 — хуки
 *    ленты компании, тот же курс) → 1013 (T18.4 — хуки career-track, тот же
 *    курс) → 1089 (T18.5 — хуки education + канон карточек, тот же курс) →
 *    1217 (T18.6 — хуки лендингов стажировок, тот же курс) → 1222 (ревью T18.6: слот/img большой карточки events-feature без аспекта/фикс-высоты, +2 строки) →
 *    1297 (T18.9 — хуки хвоста cmp-/ev-/ia-, тот же курс: ритм companies,
 *    обложка/фильтры/лента событий events, карточная форма анкеты
 *    internship-apply); T18.10: вынос обложки — 1297 → 1269, потолок не
 *    двигается; T18.11: вынос строки табов — 1269 → 1252; T18.12: вынос
 *    why-us — 1252 → 1142; T18.13: вынос production — 1142 → 911;
 *    T18.14: вынос directions/holding — 911 → 820; T18.15: вынос
 *    company-семейств — 820 → 765; T18.16: вынос vacancy-search/dir-modal —
 *    765 → 715; T18.17: батч cp-остатков — 715 → 580; закрывающая T18.18:
 *    итог эпика — код 580 (цель T17.16 «≤600» снова выполнена с запасом),
 *    потолок не понижается (см. выше);
 *  - MAX_PILOT_JS_LINES = 187 — строки pilot.js на закрытие эпика;
 *  - MAX_CP_FAMILIES = 30 и ALLOWED_CP_FAMILIES — семейства ценза «после»:
 *    появление семейства вне списка = новый cp-визуальный блок = ошибка
 *    (правило CONTRIBUTING: новый визуальный блок клона — задача ДС).
 *    T18.1: правила варианта students--photographic названы stu- (не cp-) —
 *    новых cp-семейств не создаёт; pstr- в pilot.css запрещён пином T17.18.
 *    T18.2: mentorship/vacancy-capsule — каноны msh/vcp паттерн-слоя, хук
 *    тон-строки назван msh__card (не cp-) — семейства не менялись (28).
 *    T18.3: семейство company-feed — позиционные хуки лент компании
 *    (шаг/низ/высоты фото), модификаторы --vac…--photos — крючки проб; не
 *    новый визуальный блок (каркасы лент — ui-grid/ui-card/lpp-row/cp-
 *    intern-card), занесён в allowlist по процедуре errata.
 *    T18.10: семейства page-head/page-subtitle УШЛИ из allowlist — вынос
 *    обложки страниц в слой (канон php), снятие пары cp-page-head/
 *    cp-page-subtitle из разметки и pilot.css (судьба семейств — REPORT
 *    §11.4).
 *    T18.11: семейства tabs-row/tabs-links УШЛИ из allowlist — вынос
 *    строки табов + ссылок в слой (канон tnv), снятие пары
 *    cp-tabs-row/cp-tabs-links и хуков .int-tabs .cp-tabs-row из разметки
 *    и pilot.css (судьба семейств — REPORT §11.4).
 *    T18.12: семейство why-us УШЛО из allowlist — вынос тёмной секции
 *    со стеклом в слой (канон whu), снятие пары cp-why-us и ступеней
 *    1023/767 из разметки и pilot.css; панель вакансий внутри секции —
 *    сайт-зона vacancy-search остаётся (вынос — T18.16) (судьба семейств —
 *    REPORT §11.4).
 *    T18.13: семейство production УШЛО из allowlist — вынос раскладок
 *    карусели production v1/v2 в слой (канон prd поверх ui-carousel),
 *    снятие пары cp-production целиком — база/--v1-координаты/--v2/табы/
 *    стрелки и ступени 1023 (photo-hide) — из разметки и pilot.css;
 *    поведение карусели — компонент ui-carousel (T17.7, dist) (судьба
 *    семейств — REPORT §11.4).
 *    T18.14: семейства directions/holding УШЛИ из allowlist — вынос сетки
 *    направлений и холдинга в слой (каноны dir/hld; компакт-вариант v2 —
 *    модификатор hld--compact), снятие пар cp-directions/cp-holding целиком
 *    — базы/элементы/hover и группы ступеней 1023/767 — из разметки и
 *    pilot.css; модалка направления — сайт-зона dir-modal остаётся (вынос —
 *    T18.16) (судьба семейств — REPORT §11.4).
 *    T18.15: семейства company-stats/company-adv/company-title/
 *    company-banner/company-card УШЛИ из allowlist — вынос company-семейств
 *    в слой (каноны dpp-stats/dpp-adv/dpp-section-title/dpp-banner — секция
 *    dpp; карточка выдачи — канон lpp-card — list-page), снятие пар
 *    cp-company-stats/cp-company-title/cp-company-adv/cp-company-banner
 *    (базы/элементы __body/__title/__text) и cp-company-card + ступени
 *    1023/767 сеток из разметки и pilot.css; ленты компании — семейство
 *    company-feed остаётся (позиционные хуки T18.3) (судьба семейств —
 *    REPORT §11.4).
 *    T18.16: семейства vacancy-search/dir-modal УШЛИ из allowlist — вынос
 *    панели «Найди свою вакансию» и контента модалки направления в слой
 *    (каноны vcs — list-page; dmd — dpp, поверх ui-modal), снятие пар
 *    cp-vacancy-search (обёртка/плитка/лента + ширина пилюли на потомке
 *    ui-select--pill + ступень 1023) и cp-dir-modal (фото/навигация +
 *    мёртвые база-сетка/__tasks стажировочной модалки T15.4 + ступень
 *    1023) из разметки и pilot.css (судьба семейств — REPORT §11.4).
 *    T18.17: 15 семейств УШЛИ из allowlist — батч cp-остатков сайт-зоны:
 *    media-toolbar/offer-card/org-card/catalog-nav/events-nav/adv-grid/
 *    events-feature/team — вынос в слой (каноны mtb/ofc-card/org-card/
 *    cnv/adv-grid/evt-feature/tm, гейт префиксов расширен); hero/
 *    article-card/intern-card/vac-main/page — судьба «тон-строка/позиция —
 *    остаётся сайт-зоне» (Implementation requirements п.1 — тон — бренд-
 *    слой; сокращение cp-хуков — не-cp имена hero-tone--, article-date,
 *    intern-card, vac-main, site-page — конвенция stu-, ctr-, msh__card);
 *    event-card/intern-person — висячие входы снятых семейств (T17.5 —
 *    ui-card--media, правил/разметки нет); allowlist = ['company-feed'] —
 *    позиционно-необходимый минимум (позиционные хуки лент T18.3); cta-mail
 *    в allowlist не был (снято T17.8 — ui-card--cta) — судьба строкой,
 *    REPORT §11.4. Закрывающая T18.18: судьбы всех 30 семейств ценза
 *    закрыты — 23 «вынос в слой», 5 «остаётся сайт-зоне», 2 «снято ранее»
 *    (сводная таблица «Судьба 30 семейств — после» — REPORT §11.6);
 *    пины порогов/фактов — tests/unit/pilot-census-gate.test.js.
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

/** Пороги — факт итога T17.16 + errata 31.10 (см. шапку). Изменение числа —
 *  осознанная правка ценза вместе с юнит-пином и REPORT §11.4, не «подгонка». */
export const MAX_PILOT_CSS_LINES = 2272;
export const MAX_PILOT_CSS_CODE_LINES = 1297;
export const MAX_PILOT_JS_LINES = 187;
export const MAX_CP_FAMILIES = 30;

/** Семейства сайт-зоны после T18.17 (позиционно-необходимый минимум,
 *  REPORT §11.4): ленты компании — позиционные хуки T18.3 (шаг/низ,
 *  типографика «как есть», фикс-высоты фото) — судьба «остаётся сайт-зоне».
 *  Судьбы остальных семейств батча cp-остатков T18.17 (строкой, REPORT
 *  §11.4): media-toolbar/offer-card/org-card/catalog-nav/events-nav/
 *  adv-grid/events-feature/team — вынос в слой (каноны mtb/ofc-card/
 *  org-card/cnv/adv-grid/evt-feature/tm); hero/article-card/intern-card/
 *  vac-main/page — «остаётся сайт-зоне» (тон-строки/позиции, сокращение
 *  cp-хуков — не-cp имена hero-tone--, article-date, intern-card,
 *  vac-main, site-page — конвенция stu-, ctr-, msh__card); event-card/intern-person —
 *  снято T17.5 (ui-card--media, правил/разметки нет); cta-mail — снято
 *  T17.8 (ui-card--cta). Новое семейство = новый cp-визуальный блок =
 *  ошибка гейта. */
export const ALLOWED_CP_FAMILIES = ['company-feed'];

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
