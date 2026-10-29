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
 *      MAX_PILOT_CSS_LINES 1040 — сырые строки файлы (деградация запрещена);
 *      MAX_PILOT_CSS_CODE_LINES 600 — цель эпика «≤600 строк ритма/
 *      раскладок» в метрике кода сайт-зоны (без комментариев/пустых);
 *      MAX_PILOT_JS_LINES 187 — JS пилота (карусель/галерея — в dist);
 *      MAX_CP_FAMILIES 30 + ALLOWED_CP_FAMILIES — новые cp-визуальные
 *      блоки запрещены (гейт «новых cp-визуальных блоков 0»).
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

describe('пороги ценза — числа зафиксированы по факту итога T17.16', () => {
  it('пороги — явные числа (Implementation requirements п.1: не «меньше»)', () => {
    expect(MAX_PILOT_CSS_LINES).toBe(1040);
    expect(MAX_PILOT_CSS_CODE_LINES).toBe(600);
    expect(MAX_PILOT_JS_LINES).toBe(187);
    expect(MAX_CP_FAMILIES).toBe(30);
    expect(ALLOWED_CP_FAMILIES).toHaveLength(30);
  });

  it.skipIf(!existsSync(join(pilotDir, 'pilot.css')))(
    'фактические pilot.css/pilot.js проходят гейт: 0 проблем, новых cp-визуальных блоков 0',
    () => {
      const metrics = censusMetrics(readSource('pilot.css'), readSource('pilot.js'));
      const gate = runCensusGate(metrics);
      expect(gate.problems).toEqual([]);
      expect(gate.newBlocks).toEqual([]);
      // машиночитаемые факты ценза для REPORT §11.4 (ценз после):
      expect(metrics.css.lines).toBe(1040);
      expect(metrics.css.codeLines).toBe(519);
      expect(metrics.css.selectors).toBe(106);
      expect(metrics.css.families).toHaveLength(30);
      expect(metrics.js.lines).toBe(187);
    },
  );
});

describe('compare.mjs — гейт ценза подключен в тот же запуск (T17.16 Scope)', () => {
  it('compare.mjs импортирует census.mjs и гонит гейт до браузерного прогона', () => {
    expect(compare).toContain("from './census.mjs'");
    expect(compare).toContain('runCensusGate');
    const censusCall = compare.indexOf('runCensusGate');
    const browserLaunch = compare.indexOf('chromium.launch()');
    expect(censusCall).toBeGreaterThan(-1);
    expect(browserLaunch).toBeGreaterThan(-1);
    expect(censusCall).toBeLessThan(browserLaunch);
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

  it('числа §11.2 воспроизводятся census-методом на 922b505: 2022 строки, js 243 (кроме «228 селекторов»)', () => {
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
  });

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
