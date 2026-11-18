/**
 * Юнит-пин гейта ценза сайт-зоны пилота (T17.16 — закрывающая: ценз
 * полноты и гейт; Testing requirements — «сам гейт ценза = тест задачи»,
 * практика pilot-link-gate.test.js T15.9 — чистая функция + CLI-обёртка
 * + подключение в compare до браузеров).
 *
 * Поверхность:
 *  - pilot/career-portal/census.mjs: censusMetrics — чистая функция ценза
 *    (строки wc, код без комментариев, cp-селекторы, cp-семейства, JS);
 *    упоминания cp-* в комментариях не считаются (пин разметки — ревью
 *    T17.14: e673879); runCensusGate — чистый гейт над порогами.
 *  - Пороги — явные числа по факту итога T17.16 (Implementation
 *    requirements п.1: «не „меньше“, а конкретное значение»; деградация —
 *    проблема гейта → exit 1 в CLI и в compare):
 *      MAX_PILOT_CSS_LINES 1894 — сырые строки файла (деградация
 *      запрещена); errata 31.10: 1040 → 1162 → 1169 → 1290 (батчи
 *      паритета + «все страницы» — v2-модификаторы); errata T18.1:
 *      1290 → 1417 (вариант фото-карточек students--photographic —
 *      сайт-зона stu-photo ПОКА, вынос в слой — T18.17; файл был ровно
 *      на потолке); errata T18.2: 1417 → 1431 (тон-строка активной
 *      карточки mentorship на хуке канона --msh-card-active-bg — блоки
 *      msh/vcp на канонах паттерн-слоя); errata T18.3: 1431 → 1520
 *      (позиционные хуки лент компании cp-company-feed); errata T18.4:
 *      1520 → 1738 (позиционные хуки career-track ctr- — форма
 *      cover-hero на каркасе cvh, вид чипов/этапов/step-info/теста);
 *      errata T18.5: 1738 → 1894 (позиционные хуки education edu- —
 *      форма cover-hero на каркасе cvh, группа тегов-фильтров, hero
 *      компаний, шапки/сетки; карточки к канону оригинала); errata
 *      T18.6: 1894 → 2128 (позиционные хуки лендингов int-) — факт
 *      порога в census.mjs: 2138 (ревью T18.6: слот/img большой
 *      карточки, +10 строк); errata T18.9: 2138 → 2272 (позиционные
 *      хуки хвоста cmp-/ev-/ia- — ритм companies, обложка/фильтры/
 *      лента событий events, карточная форма анкеты internship-apply);
 *      T18.10: вынос обложки в слой (канон php) — файл сжался
 *      2272 → 2250, потолок НЕ двигается (прецедент T17.18
 *      «пороги не двигаются»); T18.11: вынос строки табов + ссылок
 *      (канон tnv) — 2250 → 2231, потолок не двигается; T18.12: вынос
 *      тёмной секции why-us (канон whu) — 2231 → 2108, потолок не
 *      двигается; T18.13: вынос раскладок карусели production (канон
 *      prd) — 2108 → 1818, потолок не двигается; T18.14: вынос сетки
 *      направлений и холдинга (каноны dir/hld) — 1818 → 1722, потолок
 *      не двигается; T18.15: вынос company-семейств (каноны
 *      dpp-stats/dpp-adv/dpp-section-title/dpp-banner + lpp-card) —
 *      1722 → 1648, потолок не двигается;
 *      MAX_PILOT_CSS_CODE_LINES 1089 — цель эпика в метрике кода
 *      сайт-зоны; errata 31.10: 600 → 618 → 622 → 723; errata T18.1:
 *      723 → 819 (тот же курс); errata T18.2: 819 → 822; errata T18.3:
 *      822 → 869; errata T18.4: 869 → 1013; errata T18.5: 1013 → 1089;
 *      errata T18.6: 1089 → 1217; ревью T18.6: 1217 → 1222; errata
 *      T18.9: 1222 → 1297 (тот же курс); T18.10: вынос обложки —
 *      сжатие 1297 → 1269, потолок не двигается (прецедент T17.18);
 *      T18.11: 1269 → 1252; T18.12: вынос why-us — 1252 → 1142,
 *      потолок не двигается; T18.13: вынос production — 1142 → 911;
 *      T18.14: вынос directions/holding — 911 → 820, потолок не
 *      двигается; T18.15: вынос company-семейств — 820 → 765, потолок
 *      не двигается;
 *      MAX_PILOT_JS_LINES 187 — JS пилота (карусель/галерея — в dist);
 *      MAX_CP_FAMILIES 30 + ALLOWED_CP_FAMILIES — новые cp-визуальные
 *      блоки запрещены (гейт «новых cp-визуальных блоков 0»); T18.15:
 *      allowlist 23 → 18 (5 company-семейств ушли — вынос в слой,
 *      судьба — REPORT §11.4).
 *  - compare.mjs: гейт подключен в тот же запуск до браузерного прогона
 *    (Scope: «подключение — в запуск compare, как гейт ссылок T15.9»).
 *  - Базлайн ценза §11.4 REPORT — пре-эпик дерево 922b505 (последняя
 *    пре-эпик правка 24.10 23:56, содержимое = 6b92906~1): числа §11.2
 *    воспроизводятся этим методом (2022 строки, js 243), кроме «228
 *    селекторов» (census-метод: 276 вхождений / 233 уникальных) — пин
 *    синхронности REPORT (ревью T17.16: якорь базлайна fd27e46 был
 *    неверен, Δ занижали эффект эпика; практика пинов синхронности —
 *    T17.10 errata).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CP_FAMILIES,
  MAX_CP_FAMILIES,
  MAX_PILOT_CSS_CODE_LINES,
  MAX_PILOT_CSS_LINES,
  MAX_PILOT_JS_LINES,
  censusMetrics,
  runCensusGate,
} from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

/** Тело исходника с нормализацией CRLF (рабочая копия Windows — см.
 *  tests/unit/link.test.js). */
const readSource = (name) => readFileSync(join(pilotDir, name), 'utf8').replace(/\r\n/g, '\n');

const compare = readSource('compare.mjs');

/** Базлайн-коммит достижим в этом клоне? На CI actions/checkout по умолчанию
 *  shallow (fetch-depth: 1) — история до 24.10 не выкачивается, `git show
 *  922b505:…` падает («Command failed») и красит юнит на зелёном коде
 *  (nightly 30.10 validate + CI Unit с 4402c92). Локальный клон полный —
 *  пин исполняется; на shallow-чекоуте тест честно скипается (прецедент
 *  пилотного пина T13.7 it.skipIf: поверхность недостижима — не имитируем). */
const baselineReachable = (() => {
  try {
    execFileSync('git', ['cat-file', '-e', '922b505^{commit}'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('ценз сайт-зоны — censusMetrics (T17.16 Implementation requirements п.1)', () => {
  it('модуль гейта — pilot/career-portal/census.mjs (по образцу check-links.mjs: логика — чистая функция)', () => {
    expect(existsSync(join(pilotDir, 'census.mjs'))).toBe(true);
    expect(typeof censusMetrics).toBe('function');
    expect(typeof runCensusGate).toBe('function');
  });

  it('метрики: строки wc, код без комментариев/пустых, cp-селекторы, cp-семейства, JS', () => {
    const css = [
      '/* шапка снята: .cp-header__menu — упоминание в комментарии не считается */',
      '',
      '.cp-page { color: var(--ui-color-text); }',
      '.cp-page-head,',
      '.cp-other__x { gap: 4px; }',
      '@media (max-width: 1023px) {',
      '  .cp-other__x { grid-template-columns: 1fr; }',
      '}',
      '',
    ].join('\n');
    const m = censusMetrics(css, 'let a = 1;\nlet b = 2;\n');
    // строки — wc -l (файлы под prettier всегда с завершающим \n)
    expect(m.css.lines).toBe(8);
    // код: строки 3–8 (комментарий и пустые — мимо)
    expect(m.css.codeLines).toBe(6);
    // селекторы с .cp-: cp-page, cp-page-head, cp-other__x (база + ступень)
    expect(m.css.selectors).toBe(4);
    // семейства: срез по __/--, уникальные, отсортированы
    expect(m.css.families).toEqual(['other', 'page', 'page-head']);
    expect(m.js.lines).toBe(2);
  });

  it('тон-строки/шимы сайт-зоны без префикса cp- — вне подсчёта семейств (гейт — про cp-визуальные блоки)', () => {
    const css = [
      '.hsp__action { gap: 0.625rem; }',
      '.ftp .ui-link { color: var(--ui-color-text); }',
      '.lnk-card--navy { --lnk-card-bg: var(--ui-color-primary); }',
      '.lpp-side > .ui-button--text { flex-shrink: 0; }',
      '',
    ].join('\n');
    const m = censusMetrics(css, '');
    expect(m.css.selectors).toBe(0);
    expect(m.css.families).toEqual([]);
  });
});

describe('гейт ценза — runCensusGate (порог числом; деградация — проблема)', () => {
  const metrics = (css, js) => censusMetrics(css, js);
  const thresholds = {
    maxCssLines: 10,
    maxCssCodeLines: 5,
    maxJsLines: 3,
    maxCpFamilies: 2,
    allowedCpFamilies: ['page', 'hero'],
  };

  it('в порогах и семейства из allowlist — 0 проблем (новых cp-визуальных блоков 0)', () => {
    const gate = runCensusGate(
      metrics('.cp-page { color: red; }\n.cp-hero__tag--sand { --b: 1; }\n', 'let a;\n'),
      thresholds,
    );
    expect(gate.problems).toEqual([]);
    expect(gate.newBlocks).toEqual([]);
  });

  it('новое cp-семейство вне allowlist — проблема с именем семейства (гейт «новых блоков 0»)', () => {
    const gate = runCensusGate(
      metrics('.cp-page { color: red; }\n.cp-fresh__x { gap: 4px; }\n', ''),
      thresholds,
    );
    expect(gate.newBlocks).toEqual(['fresh']);
    expect(gate.problems.some((p) => p.includes('fresh'))).toBe(true);
  });

  it('деградация строк css/js и семейств — по проблеме на каждый порог', () => {
    const selectors = ['.cp-page', '.cp-hero__tag--sand', '.cp-other__x'];
    const css =
      Array.from({ length: 12 }, (_, i) => `${selectors[i % 3]} { --i: ${i}; }`).join('\n') + '\n';
    const gate = runCensusGate(metrics(css, 'let a;\nlet b;\nlet c;\nlet d;\n'), thresholds);
    expect(gate.problems.some((p) => p.includes('pilot.css') && p.includes('12'))).toBe(true);
    expect(gate.problems.some((p) => p.includes('pilot.js') && p.includes('4'))).toBe(true);
    expect(gate.problems.some((p) => p.includes('семейств'))).toBe(true);
  });

  it('рост кода сайт-зоны сверх цели эпика (600) — отдельная проблема', () => {
    const body = Array.from({ length: 8 }, (_, i) => `.cp-page { --i: ${i}; }`).join('\n') + '\n';
    const gate = runCensusGate(metrics(body, ''), {
      ...thresholds,
      maxCssLines: 100,
      maxCssCodeLines: 5,
      maxCpFamilies: 10,
    });
    expect(gate.problems.some((p) => p.includes('цель эпика'))).toBe(true);
  });
});

describe('пороги ценза — числа зафиксированы по факту итога T17.16 + errata 31.10/T18.1…T18.18', () => {
  it('пороги — явные числа (Implementation requirements п.1: не «меньше»)', () => {
    expect(MAX_PILOT_CSS_LINES).toBe(2272);
    expect(MAX_PILOT_CSS_CODE_LINES).toBe(1297);
    expect(MAX_PILOT_JS_LINES).toBe(187);
    expect(MAX_CP_FAMILIES).toBe(30);
    // errata T18.17: батч cp-остатков — 15 семейств ушли (7 вынос в слой —
    // каноны mtb/ofc-card/org-card/cnv/adv-grid/evt-feature/tm; 5 «остаётся
    // сайт-зоне» — тон-строки/позиции с сокращением cp-хуков; 2 висячих
    // входа T17.5) — 16 → 1 (позиционно-необходимый минимум: company-feed)
    expect(ALLOWED_CP_FAMILIES).toHaveLength(1);
    expect(ALLOWED_CP_FAMILIES).toEqual(['company-feed']);
    // закрывающая T18.18: итог эпика — сырые 1441 / код 580 / 11 селекторов /
    // 1 семейство; errata 18.11 (батч бэклога): 1448 — комментарии-девиации
    // хуков ctr-steps/company-feed, код 580 без движения; потолки-порогы НЕ
    // понижены (файл сжался — прецедент
    // «пороги не двигаются» T17.18/T18.10–T18.17; переход ценза «порога-
    // потолка» на убывающий гейт — решение владельца, Out of scope EPIC-18:
    // README эпика; факты итога — REPORT §11.6)
    expect(MAX_PILOT_CSS_LINES, 'потолок сырых строк не понижается при сжатии файла').toBe(2272);
    expect(MAX_PILOT_CSS_CODE_LINES, 'потолок кода сайт-зоны не понижается при сжатии файла').toBe(
      1297,
    );
  });

  it.skipIf(!existsSync(join(pilotDir, 'pilot.css')))(
    'фактические pilot.css/pilot.js проходят гейт: 0 проблем, новых cp-визуальных блоков 0',
    () => {
      const metrics = censusMetrics(readSource('pilot.css'), readSource('pilot.js'));
      const gate = runCensusGate(metrics);
      expect(gate.problems).toEqual([]);
      expect(gate.newBlocks).toEqual([]);
      // машиночитаемые факты ценза для REPORT §11.4 («ценз после»);
      // обновлены батчами паритета 31.10 (решение владельца «приведи к
      // оригиналу»): production/directions — сырые 980→1162, код 462→618;
      // раунд 7 — 1162→1169; батч «все страницы» — 1169→1243, 622→678;
      // батч ритма 01.11 — 1243→1290, 678→723, селекторы →134; пороги-потолки 1040/600 → 1169/622
      // (errata в шапке census.mjs + дописи REPORT §11.4); семейства 28;
      // adoption T17.18 (постерные карточки — канон pstr- слоя, тон-строки
      // lnk-card студентского блока сняты из сайт-зоны): сырые 1243→1217,
      // код 678→661; пороги-потолки НЕ двигаются (спека T17.18 «пороги
      // не двигаются»), cp-селекторы/семейства не менялись (lnk-правила
      // не несли cp-крючков);
      // T18.1 (фото-карточки students--photographic — сайт-зона stu-photo
      // ПОКА, вынос в слой — T18.17): сырые 1290→1417, код 723→819;
      // файл был ровно на потолке — errata по процедуре census.mjs,
      // cp-селекторы/семейства не менялись (stu- не cp-);
      // T18.2 (mentorship/vacancy-capsule — каноны msh/vcp паттерн-слоя,
      // сайт-зоне осталась тон-строка активной карточки mentorship на
      // хуке --msh-card-active-bg): сырые 1417→1431, код 819→822;
      // cp-селекторы/семейства не менялись (msh- не cp-);
      // T18.3 (позиционные хуки лент компании cp-company-feed: шаг/низ,
      // nowrap/кламп/типографика «как есть» строк вакансий, высоты фото
      // карточек и галереи): сырые 1431→1517, код 822→867, селекторы
      // 134→147, семейства 28→29 (company-feed — в allowlist по errata,
      // модификаторы --vac…--photos семейства не плодят);
      // T18.4 (позиционные хуки career-track ctr-: форма cover-hero на
      // каркасе cvh, вид чипов/этапов/step-info/теста «как есть»
      // pages.css:676–792; тон точки этапа — литерал на хуке
      // --ctr-step-dot-bg; ревью T18.4: пара-хук активного чипа
      // .ctr-chips .ui-chip__pill[aria-pressed='true'] — :where-канон 0-1-0
      // был перебит тон-хуком 0-2-0): сырые 1520→1738, код 869→1013,
      // селекторы 147→148; семейства/allowlist НЕ менялись (ctr- — не cp-,
      // прецедент stu- T18.1);
      // T18.5 (позиционные хуки education edu-: форма cover-hero на
      // каркасе cvh — прецедент .ctr-cover, группа тегов-фильтров
      // организаций, hero компаний, шапки/сетки «как есть»; карточки к
      // канону оригинала — cp-org-card/cp-offer-card паддинг 24, мета
      // колонкой, cp-adv-grid шаг 24, пары заголовков карточек lh 1.3/без трекинга, flex-shrink: 0 кнопке шапки): сырые 1738→1894, код 1013→1089,
      // селекторы 148→152 (.edu-cover .cp-page-subtitle, новый
      // спан .cp-offer-card__company, пары .cp-org-card/.cp-offer-card × .ui-h6); семейства/allowlist НЕ менялись
      // (edu- — не cp-, прецедент ctr- T18.4);
      // T18.6 (позиционные хуки лендингов стажировок/практик int-: ритм
      // секций pad 40/титулы mb 32/контейнеры pad 40, форма cover-hero на
      // каркасе cvh — прецедент .edu-cover, шапка/чипы/сетка направлений,
      // композиция марки mrq — колонка/фото 260, карточки стажёров 4/3,
      // лента мероприятий events-feature 2fr/1fr «как есть»
      // pages.css:336/341/68/1009–1054/1083–1146/565–581/1150–1171):
      // сырые 1894→2138, код 1089→1222, селекторы 152→167
      // (.cp-events-feature — сетка/карточки/фото/тело × медиа-ступени,
      // .int-sec .cp-adv-grid .ui-card, .int-dir-grid .cp-intern-card ×
      // .ui-h6/.ui-small-кламп канона); семейства/allowlist НЕ менялись
      // (int- — не cp-, прецедент edu- T18.5);
      // T18.7 (row-nowrap канона ведёт слой — md-ступень .lpp-row):
      // дубликаты раскладки сняты из сайт-зоны — хук nowrap лент
      // (.cp-company-feed .lpp-row, T18.3) и ступень 767 wrap:
      // сырые 2138→2136, код 1222→1216, селекторы 167→165; раскладка
      // строки — слой, типографика лент (кламп/lh) остаётся сайт-зоной;
      // семейства/allowlist НЕ менялись;
      // T18.8 — pilot.css/pilot.js не тронуты (правка в каноне слоя и
      // билде): числа без движения;
      // T18.9 (позиционные хуки точечного хвоста cmp-/ev-/ia-: ритм грида
      // сегментов companies — шапка 16/40, титулы 32, сетки 36/48;
      // обложка cover-hero + лента фильтров lpp-filters + карточка
      // события 16/220 на сетке 36 events; карточная форма анкеты
      // internship-apply — паддинг 36/радио-строки 52; каркасы — ДС/слой):
      // сырые 2136→2272, код 1216→1297, селекторы 165→166
      // (.ia-form-card .ui-radio-group__row — единственный новый
      // двухклассовый селектор); семейства/allowlist НЕ менялись
      // (cmp-/ev-/ia- — не cp-, прецедент ctr-/edu-/int-);
      // T18.10 (вынос обложки страниц в слой — канон php: пара
      // cp-page-head/cp-page-subtitle снята из разметки build.mjs и
      // pilot.css — 3 базы + 1 ступень 767 + 4 хука подзаголовков обложек;
      // дубликаты базы канона сняты — .cmp-head и низ .edu-offer-head
      // (хуки сайт-зоны без cp-крючка — ценз их не считал); обложка events
      // переведена на каркас cvh): сырые 2272→2250, код 1297→1269,
      // селекторы 166→158; семейства 29→27 — page-head/page-subtitle ушли
      // из allowlist (судьба «вынос в слой», REPORT §11.4):
      // T18.11 (вынос строки табов + ссылок в слой — канон tnv: пара
      // cp-tabs-row/cp-tabs-links снята из разметки build.mjs и pilot.css —
      // 2 базы + 2 хука .int-tabs .cp-tabs-row (nowrap + маргин ленты —
      // ступень/сброс канона)): сырые 2250→2231, код 1269→1252,
      // селекторы 158→154; семейства 27→25 — tabs-row/tabs-links ушли
      // из allowlist (судьба «вынос в слой», REPORT §11.4):
      // T18.12 (вынос тёмной секции why-us в слой — канон whu: пара
      // cp-why-us целиком — 13 базовых правил + 3 hover-ветки — и ступени
      // 1023/767 (2×2 селектора в группах) сняты из разметки build.mjs и
      // pilot.css; no-op __inner снята — вертикальных паддингов у
      // ui-container нет): сырые 2231→2108, код 1252→1142, селекторы
      // 154→134; семейства 25→24 — why-us ушла из allowlist (судьба
      // «вынос в слой», REPORT §11.4; панель vacancy-search внутри секции
      // — сайт-зона остаётся, вынос T18.16):
      // T18.13 (вынос раскладок карусели production в слой — канон prd
      // поверх ui-carousel: семейство целиком — база/--v1-координаты/
      // --v2/табы/стрелки/номер (~34 селектора) и ступень 1023 photo-hide
      // сняты из разметки build.mjs и pilot.css; поведение — компонент
      // ui-carousel T17.7 в dist): сырые 2108→1818, код 1142→911,
      // селекторы 134→95; семейства 24→23 — production ушла из allowlist
      // (судьба «вынос в слой», REPORT §11.4):
      // T18.14 (вынос сетки направлений и холдинга в слой — каноны dir/hld:
      // пары cp-directions/cp-holding целиком — базы/элементы/hover/компакт
      // и группы ступеней 1023/767 сняты из разметки build.mjs и pilot.css;
      // модалка направления — сайт-зона dir-modal остаётся, вынос T18.16):
      // сырые 1818→1722, код 911→820, селекторы 95→76; семейства 23→21 —
      // directions/holding ушли из allowlist (судьба «вынос в слой»,
      // REPORT §11.4):
      // T18.15 (вынос company-семейств в слой — каноны dpp-stats/dpp-adv/
      // dpp-section-title/dpp-banner (секция dpp) + lpp-card (list-page):
      // пять cp-пар — базы/элементы __body/__title/__text и ступени 1023/767
      // сеток сняты из разметки build.mjs и pilot.css; ленты компании —
      // семейство company-feed остаётся (позиционные хуки T18.3)):
      // сырые 1722→1648, код 820→765, селекторы 76→65; семейства 21→16 —
      // company-stats/company-adv/company-title/company-banner/company-card
      // ушли из allowlist (судьба «вынос в слой», REPORT §11.4):
      // T18.16 (вынос панели «Найди свою вакансию» и контента модалки
      // направления в слой — каноны vcs (list-page)/dmd (dpp, поверх
      // ui-modal): пара cp-vacancy-search — обёртка/плитка/лента + ширина
      // пилюли на потомке ui-select--pill + ступень 1023 — и пара
      // cp-dir-modal — фото/навигация + мёртвые база-сетка/__tasks
      // стажировочной модалки T15.4 + ступень 1023 — сняты из разметки
      // build.mjs и pilot.css):
      // сырые 1648→1599, код 765→715, селекторы 65→55; семейства 16→14 —
      // vacancy-search/dir-modal ушли из allowlist (судьба «вынос в слой»,
      // REPORT §11.4):
      // T18.17 (батч cp-остатков сайт-зоны: 8 семейств — вынос в слой
      // (7 канонов, cnv покрывает пару catalog-nav/events-nav),
      // каноны mtb/ofc-card/org-card/cnv/adv-grid/evt-feature/tm — правила
      // cp-media-toolbar/cp-offer-card/cp-org-card/пара cp-catalog-nav/
      // cp-events-nav/cp-adv-grid (+ ступени 1023/767)/cp-events-feature/
      // cp-team__photo сняты из разметки build.mjs и pilot.css; 5 семейств —
      // судьба «тон-строка/позиция — остаётся сайт-зоне» с сокращением
      // cp-хуков (не-cp имена site-page/hero-tone--*/article-date/
      // intern-card/vac-main — конвенция stu-/ctr-/msh__card);
      // event-card/intern-person — висячие входы снятых семейств T17.5):
      // сырые 1599→1441, код 715→580, селекторы 55→11 (errata приёмки
      // T18.17: после снятия валивших гранул шапки предложения — без них
      // файл 1441/580; числа пинов ниже — факт HEAD); семейства 14→1 —
      // единственное cp-семейство company-feed (позиционные хуки лент T18.3
      // — позиционно-необходимый минимум, судьбы всех — REPORT §11.4):
      // errata 18.11 (батч бэклога): 1441 → 1448 — комментарии-девиации
      // хуков ctr-steps/company-feed, код 580 без движения:
      expect(metrics.css.lines).toBe(1448);
      expect(metrics.css.codeLines).toBe(580);
      expect(metrics.css.selectors).toBe(11);
      // код: см. строку ниже (батч ритма 01.11)
      expect(metrics.css.families).toHaveLength(1);
      expect(metrics.css.families, 'семейства обложки вынесены в слой (T18.10)').not.toContain(
        'page-head',
      );
      expect(metrics.css.families).not.toContain('page-subtitle');
      expect(metrics.css.families, 'семейства строки табов вынесены в слой (T18.11)').not.toContain(
        'tabs-row',
      );
      expect(metrics.css.families).not.toContain('tabs-links');
      expect(metrics.css.families, 'семейство why-us вынесено в слой (T18.12)').not.toContain(
        'why-us',
      );
      expect(metrics.css.families, 'семейство production вынесено в слой (T18.13)').not.toContain(
        'production',
      );
      expect(
        metrics.css.families,
        'семейства directions/holding вынесены в слой (T18.14)',
      ).not.toContain('directions');
      expect(metrics.css.families).not.toContain('holding');
      expect(metrics.css.families, 'пять company-семейств вынесены в слой (T18.15)').not.toContain(
        'company-stats',
      );
      expect(metrics.css.families).not.toContain('company-adv');
      expect(metrics.css.families).not.toContain('company-title');
      expect(metrics.css.families).not.toContain('company-banner');
      expect(metrics.css.families).not.toContain('company-card');
      expect(
        metrics.css.families,
        'панель/модалка направления вынесены в слой (T18.16)',
      ).not.toContain('vacancy-search');
      expect(metrics.css.families).not.toContain('dir-modal');
      expect(
        metrics.css.families,
        'батч cp-остатков: 8 выносов в слой (T18.17) — семейств нет',
      ).not.toContain('media-toolbar');
      expect(metrics.css.families).not.toContain('offer-card');
      expect(metrics.css.families).not.toContain('org-card');
      expect(metrics.css.families).not.toContain('catalog-nav');
      expect(metrics.css.families).not.toContain('events-nav');
      expect(metrics.css.families).not.toContain('adv-grid');
      expect(metrics.css.families).not.toContain('events-feature');
      expect(metrics.css.families).not.toContain('team');
      expect(
        metrics.css.families,
        'батч cp-остатков: 5 «остаётся» — тон-строки/позиции на не-cp именах (T18.17)',
      ).not.toContain('hero');
      expect(metrics.css.families).not.toContain('article-card');
      expect(metrics.css.families).not.toContain('intern-card');
      expect(metrics.css.families).not.toContain('vac-main');
      expect(metrics.css.families).not.toContain('page');
      expect(
        metrics.css.families,
        'ленты компании — сайт-зона T18.3 (позиционный минимум)',
      ).toContain('company-feed');
      expect(metrics.js.lines).toBe(187);
    },
  );
});

describe('compare.mjs — гейт ценза подключен в тот же запуск (T17.16 Scope)', () => {
  it('compare.mjs импортирует census.mjs и гонит гейт до браузерного прогона', () => {
    expect(compare).toContain("from './census.mjs'");
    expect(compare).toContain('runCensusGate');
    // Пин позиции ВЫЗОВА (ревью T17.16: первое вхождение имени матчит
    // импорт — при переносе вызова ниже chromium.launch() пин оставался
    // зелёным); фактически: compare.mjs:80 «const censusGate = runCensusGate(».
    const censusCall = compare.indexOf('const censusGate = runCensusGate');
    const browserLaunch = compare.indexOf('chromium.launch()');
    expect(censusCall).toBeGreaterThan(-1);
    expect(browserLaunch).toBeGreaterThan(-1);
    expect(censusCall).toBeLessThan(browserLaunch);
  });
});

describe('закрывающая T18.18 — BLOCK_PROBES новые макро-блоки (позиции/высоты)', () => {
  it('блок-проба снимает позицию блока (top от начала документа) на обеих сторонах — площадок замера две', () => {
    // compare.mjs: замер блоков — две одинаковые evaluate-площадки
    // (оригинал/пилот), каждая берёт rect.width/height + rect.top+scrollY
    expect(compare.match(/rect\.top \+ window\.scrollY/g)).toHaveLength(2);
    expect(compare).toContain('top: Math.round(rect.top + window.scrollY)');
  });

  it('новые макро-блоки эпика покрыты парами (Goal T18.18: mentorship, vacancy-capsule, students--photographic, ленты company/career-track)', () => {
    // index-2 (T18.2): наставничество + капсула вакансий — каноны msh/vcp;
    // фото-секция students (T18.1, apply_variant2) меряет #students
    expect(compare).toContain("['mentorship', '.mentorship', '.msh']");
    expect(compare).toContain("['vacancy-capsule', '.vacancy-capsule', '.vcp']");
    expect(compare).toContain("['students', '.students--photographic', '#students']");
    // index (T18.1): вторая секция «Школьникам и студентам» — фото-карточки
    expect(compare).toContain("['students-photo', '.students--photographic', '.stu-photo']");
    // company.html (T18.3): шесть лент + два баннера + фото-галерея
    for (const name of [
      'company-vacancies',
      'company-banner',
      'company-internships',
      'company-practices',
      'company-articles',
      'company-banner-2',
      'company-events',
      'company-photos',
    ]) {
      expect(compare).toContain(`'${name}',`);
    }
    // career-track.html (T18.4): обложка / секция треков / тест / статьи
    for (const name of ['ctr-cover', 'ctr-tracks', 'ctr-test', 'ctr-articles']) {
      expect(compare).toContain(`'${name}',`);
    }
  });
});

describe('закрывающая T18.18 — REPORT §11.6/§8.4 синхронны факту (юнит-пин ценза)', () => {
  const report = readSource('REPORT.md');

  it('§11.6: итог ценза в REPORT равен фактическим метрикам файлов (синхронность раздела)', () => {
    const metrics = censusMetrics(readSource('pilot.css'), readSource('pilot.js'));
    expect(metrics.css.lines).toBe(1448);
    expect(metrics.css.codeLines).toBe(580);
    expect(metrics.css.selectors).toBe(11);
    expect(metrics.css.families).toEqual(['company-feed']);
    expect(report).toContain('### 11.6 Раунд 8 (17.11): закрывающий прогон EPIC-18 (T18.18)');
    expect(report).toContain(
      '| pilot.css, сырых строк | 2272 | 1441 | **1441 → 1448** (errata 18.11: батч бэклога — комментарии-девиации хуков ctr-steps/company-feed, порог не тронут) |',
    );
    expect(report).toContain('| pilot.css, код сайт-зоны | 1297 | 580 | **580** |');
    expect(report).toContain('| cp-семейств | 29 | 1 | **1** (`company-feed`) |');
    expect(report).toContain('Пороги-потолки **не понижены**');
  });

  it('§11.6: судьба 30 семейств — таблица после, каждая судьба закрыта', () => {
    expect(report).toContain('Судьба 30 семейств ценза — после');
    const fates = {
      'вынос в слой': [
        'page-head',
        'page-subtitle',
        'tabs-row',
        'tabs-links',
        'why-us',
        'production',
        'directions',
        'holding',
        'company-stats',
        'company-adv',
        'company-title',
        'company-banner',
        'company-card',
        'vacancy-search',
        'dir-modal',
        'media-toolbar',
        'offer-card',
        'org-card',
        'catalog-nav',
        'events-nav',
        'adv-grid',
        'events-feature',
        'team',
      ],
      'остаётся сайт-зоне': ['hero', 'article-card', 'intern-card', 'vac-main', 'page'],
      'снято ранее': ['event-card', 'intern-person'],
    };
    for (const [fate, families] of Object.entries(fates)) {
      for (const family of families) {
        expect(report, `судьба семейства ${family} — «${fate}» в закрывающей таблице`).toMatch(
          new RegExp(`\\| \`${family}\` \\| ${fate} \\|`),
        );
      }
    }
  });

  it('§11.6: docHeight-цель — 38/43 в допуске, 5 страниц с разбором корней, число для STATUS', () => {
    expect(report).toContain('38/43 в допуске ±60');
    expect(report).toContain('максимальный остаток |Δ| = 177');
    // пять страниц вне допуска — все с разбором корня
    expect(report).toContain('| index | 9899 | 9722 | −177 |');
    expect(report).toContain('| vacancies | 3224 | 3048 | −176 |');
    expect(report).toContain('| index-2 | 9002 | 9138 | +136 |');
    expect(report).toContain('| internship | 1658 | 1586 | −72 |');
    expect(report).toContain('| vacancy-4 | 1849 | 1910 | +61 |');
    expect(report).toContain('мок-\n  состояние оригинала');
    expect(report).toContain('дрейф внешней стороны: оригинал 1658');
    expect(report).toContain('errata-кандидат владельцу\n  (декомпозиция T18.8)');
  });

  it('§8.4: решения-отклонения задач эпика — свод присутствует', () => {
    expect(report).toContain('### 8.4 Дополнение T18.18: решения-отклонения задач EPIC-18 (свод)');
    expect(report).toContain('капсула вакансий **без select-фильтров**');
    expect(report).toContain('row-nowrap строки — от md');
    expect(report).toContain('пороги-потолки ценза НЕ понижены при сжатии файла');
    expect(report).toContain('пара employers выровнена на секцию `.lgo`');
  });
});

describe('закрывающая T18.18 — ledger STATUS.md и акт приёмки (AC3/AC4 раунда приёмки)', () => {
  const report = readSource('REPORT.md');
  const status = readFileSync(join(root, 'docs', 'ui-system', 'STATUS.md'), 'utf8').replace(
    /\r\n/g,
    '\n',
  );

  it('STATUS.md, строка T18.18 — done с итоговым числом docHeight-цели и цензом в примечании (AC3)', () => {
    const row = status.match(/\| T18\.18 \| [^\n]+\|/);
    expect(row, 'строка T18.18 в ledger STATUS.md').toBeTruthy();
    expect(
      row[0],
      'статус задачи — done (ledger-коммит закрывающей, прецедент T18.17 dd0ac7d)',
    ).toContain('| T18.18 | done |');
    // число docHeight-цели в примечании (AC3 приёмки): максимальный остаток
    // и доля страниц в допуске — из закрывающего прогона REPORT §11.6
    expect(row[0]).toContain('177');
    expect(row[0]).toContain('38/43');
    // ценз-итог числом (синхронно census.mjs/pilot.css; errata 18.11 —
    // батч бэклога: 1441 → 1448, код 580 без движения)
    expect(row[0]).toContain('1448');
    expect(row[0]).toContain('580');
  });

  it('REPORT §11.6 — акт приёмки владельца записан в репо (AC4)', () => {
    expect(report).toContain('Акт приёмки владельца (раунд 17.11)');
    expect(report).toContain('верифицирован приёмкой');
    expect(report).toContain('Замечания раунда приёмки');
    // прежняя формулировка «подпись вне конвейера» снята — акт записан
    expect(report).not.toContain('подпись приёмки — за владельцем, вне конвейера');
  });
});

describe('базлайн ценза §11.4 — пре-эпик дерево 922b505 (ревью T17.16)', () => {
  /** Содержимое файла пилота на коммите (рабочая копия Windows — CRLF
   *  нормализуется, как в readSource). */
  const showPilot = (ref, name) =>
    execFileSync('git', ['show', `${ref}:pilot/career-portal/${name}`], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }).replace(/\r\n/g, '\n');

  const uniqueSelectors = (css) => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [];
    for (const [, prelude] of withoutComments.matchAll(/([^{}]+)\{/g)) {
      for (const raw of prelude.split(',')) {
        const selector = raw.trim();
        if (selector.includes('.cp-')) selectors.push(selector);
      }
    }
    return new Set(selectors).size;
  };

  it.skipIf(!baselineReachable)(
    'числа §11.2 воспроизводятся census-методом на 922b505: 2022 строки, js 243 (кроме «228 селекторов»)',
    () => {
      const css = showPilot('922b505', 'pilot.css');
      const m = censusMetrics(css, showPilot('922b505', 'pilot.js'));
      expect(m.css.lines).toBe(2022);
      expect(m.css.codeLines).toBe(1402);
      // census-метод: 276 вхождений / 233 уникальных селекторов; «228» §11.2 —
      // иная (не записанная) методика раунда 5
      expect(m.css.selectors).toBe(276);
      expect(uniqueSelectors(css)).toBe(233);
      expect(m.css.families).toHaveLength(64);
      expect(m.js.lines).toBe(243);
    },
  );

  it('REPORT §11.4 синхронен: якорь базлайна — 922b505, ложные утверждения о базлайне сняты', () => {
    const report = readSource('REPORT.md');
    expect(report).toContain('922b505');
    // пересчитанные дельты от пре-эпик дерева (2022/1402/276/64/243 → 1040/519/106/30/187)
    expect(report).toContain('−49%');
    expect(report).toContain('−63%');
    expect(report).toContain('−62%');
    expect(report).toContain('−53%');
    expect(report).toContain('−23%');
    // ревью T17.16: оба утверждения о базлайне были ложными — сняты
    expect(report).not.toContain('файл не менялся с 23.10 до старта эпика');
    expect(report).not.toContain('не воспроизводятся ни на одном коммите');
  });

  it('REPORT §11.4 воспроизводим и не гниёт: доля комментариев = строки − код, счётчика тестов в тексте нет (приёмка T17.16)', () => {
    const report = readSource('REPORT.md');
    // доля комментариев/пустых воспроизводима арифметикой ценза:
    // 1040 сырых − 519 кода (пин выше) = 521 строка = 50%; «~52%» не даёт
    // ни одна методика (ревью приёмки: по строкам 376 = 36%, по символам 68%)
    expect(report).toContain('521');
    expect(report).toContain('50%');
    expect(report).not.toContain('~52%');
    // счётчик тестов рядом с именем модуля гниёт при добавлении пинов
    // (рассинхрон «10/10» при 12 тестах — ревью приёмки): в REPORT его нет
    expect(report).not.toMatch(/pilot-census-gate\.test\.js`\s*\d+\/\d+/);
  });
});
