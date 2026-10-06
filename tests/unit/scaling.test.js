/**
 * Юнит-пин гейта масштабирования (задача T3.6; Testing requirements).
 *
 * Поверхность браузера (zoom 200% / 32px-база, пороги поломок, чувствительность)
 * — tests/e2e/scaling.spec.js; здесь — исполняемая форма контракта:
 *  - синхронизация «стенды с маркерами data-ui-check-layout ↔ CHECK_STANDS»
 *    в обе стороны (Implementation requirements T3.6 п.1): стенд, размеченный
 *    маркерами, обязан быть в гейте, и наоборот — иначе гейт молча теряет
 *    поверхность или проверяет несуществующий стенд;
 *  - порог перекрытия 2px и виды проверок в спеке (Implementation
 *    requirements T3.6 п.2);
 *  - реализация сценариев: зум через CDP, 32px через addStyleTag
 *    (Technical considerations T3.6);
 *  - README тестов документирует контракт и пороги (AC 3);
 *  - подключение к nightly + release (AC 2): гейт едет полным прогоном
 *    матриц, падение блокирует релиз — контракт закреплён и в
 *    tools/validate-workflows.mjs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const spec = () => readFileSync(join(root, 'tests', 'e2e', 'scaling.spec.js'), 'utf8');

/** CHECK_STANDS из спека (источник истины списка ключевых стендов). */
const checkStands = () => {
  const match = spec().match(/const CHECK_STANDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  expect(match, 'CHECK_STANDS объявлен в tests/e2e/scaling.spec.js').toBeTruthy();
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
};

/** Все источники стендов полигона: showcase/pages/<name>/index.html и канонические
 * паттерны components/<name>/<name>.html (generateShowcase showcase/build.mjs). */
const standSources = () => {
  const sources = [];
  const pagesDir = join(root, 'showcase', 'pages');
  for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const index = join(pagesDir, entry.name, 'index.html');
    if (existsSync(index)) sources.push({ name: entry.name, file: index });
  }
  const componentsDir = join(root, 'components');
  for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ui-')) continue;
    const pattern = join(componentsDir, entry.name, `${entry.name}.html`);
    if (existsSync(pattern)) sources.push({ name: entry.name, file: pattern });
  }
  return sources;
};

describe('контракт data-ui-check-layout (Implementation requirements T3.6 п.1)', () => {
  it('стенды с маркерами ↔ CHECK_STANDS — множества совпадают в обе стороны', () => {
    const marked = standSources()
      .filter(({ file }) => readFileSync(file, 'utf8').includes('data-ui-check-layout'))
      .map(({ name }) => name)
      .sort();
    expect(marked, 'каждый размеченный стенд — в гейте; каждый стенд гейта — размечен').toEqual(
      [...checkStands()].sort(),
    );
  });

  it.each(['base', 'typography', 'layout'])(
    'ключевой стенд Scope T3.6 «%s» размечен и в CHECK_STANDS',
    (name) => {
      expect(checkStands(), `${name} — в CHECK_STANDS`).toContain(name);
      const source = standSources().find((s) => s.name === name);
      expect(source, `источник стенда ${name} найден`).toBeTruthy();
      const count = readFileSync(source.file, 'utf8').split('data-ui-check-layout').length - 1;
      expect(count, `стенд ${name}: маркеров больше одного (гейт не пустой)`).toBeGreaterThan(1);
    },
  );
});

describe('сценарии и пороги в спеке (Implementation requirements T3.6 п.2)', () => {
  it('порог перекрытия — 2px, и он один (константа спеки прокидывается в чекер)', () => {
    const text = spec();
    expect(text).toMatch(/const OVERLAP_THRESHOLD_PX = 2;/);
    expect(text).toMatch(
      /const THRESHOLD = threshold; \/\/ px — порог перекрытия из OVERLAP_THRESHOLD_PX/,
    );
    expect(text).toMatch(/}, OVERLAP_THRESHOLD_PX\);/);
  });

  it('зум — через CDP Emulation.setDeviceMetricsOverride; 32px — через addStyleTag', () => {
    const text = spec();
    expect(text).toContain('setDeviceMetricsOverride');
    expect(text).toContain('font-size: 32px !important');
    expect(text).toContain('addStyleTag');
  });

  it('чекер ловит все четыре вида поломок: hscroll, clip, overlap, contract', () => {
    const text = spec();
    for (const kind of ['hscroll', 'clip', 'overlap', 'contract']) {
      expect(text, `вид поломки «${kind}» в чекере`).toContain(`kind: '${kind}'`);
    }
  });

  it('clip — только режущие значения hidden/clip; скроллируемый контент не флагается', () => {
    const text = spec();
    // Ревью T3.6 (high): предикат «overflow !== visible» флагал overflow
    // auto/scroll с достижимым прокруткой контентом — против собственного
    // контракта (README «что считать поломкой», шапка спеки).
    expect(text).toContain("['hidden', 'clip'].includes(cs.overflowY)");
    expect(text).toContain("['hidden', 'clip'].includes(cs.overflowX)");
    expect(text, 'предикат «любой не-visible» в чекере не остаётся').not.toContain("!== 'visible'");
    // Overlap меряет ВИДИМЫЕ ректы: скролл-контент под скролл/clip-предком
    // не «наезжает» на внешние узлы (visualBox).
    expect(text).toContain('const visualBox =');
  });

  it('зум-сценарий помечен chromium-only (CDP), 32px — все браузеры матрицы', () => {
    const text = spec();
    expect(text).toMatch(/project\.name !== 'chromium'/);
    expect(text).toContain('test.skip');
  });
});

describe('README тестов документирует контракт и пороги (AC 3)', () => {
  const readme = () => readFileSync(join(root, 'tests', 'e2e', 'README.md'), 'utf8');

  it('контракт маркеров, сценарии и механика зума названы', () => {
    const text = readme();
    for (const needle of [
      'data-ui-check-layout',
      'tests/e2e/scaling.spec.js',
      'CHECK_STANDS',
      'setDeviceMetricsOverride',
      '32px',
    ]) {
      expect(text, `README упоминает «${needle}»`).toContain(needle);
    }
  });

  it('пороги «что считать поломкой» перечислены (2px, обрезка, hscroll)', () => {
    const text = readme();
    expect(text, 'порог перекрытия 2px').toContain('2px');
    expect(text, 'горизонтальный скролл').toContain('scrollWidth');
    expect(text, 'обрезка контента').toContain('scrollHeight');
  });

  it('запуск ночной + релиз (не PR) и блокировка релиза задокументированы', () => {
    const text = readme();
    expect(text).toContain('nightly');
    expect(text).toContain('release');
  });
});

describe('подключение к nightly + release (AC 2; Scope T3.6)', () => {
  it('nightly: полный прогон матрицы несёт гейт (упоминание scaling.spec.js)', () => {
    const nightly = readFileSync(join(root, '.github', 'workflows', 'nightly.yml'), 'utf8');
    expect(nightly, 'e2e-matrix ночи гоняет playwright').toContain('npx playwright test');
    expect(nightly, 'шапка/джоба ссылаются на гейт масштабирования').toContain('scaling.spec.js');
  });

  it('release: полный прогон матрицы несёт гейт (упоминание scaling.spec.js)', () => {
    const release = readFileSync(join(root, '.github', 'workflows', 'release.yml'), 'utf8');
    expect(release, 'матрица релиза гоняет playwright').toContain('npx playwright test');
    expect(release, 'шапка/джоба ссылаются на гейт масштабирования').toContain('scaling.spec.js');
  });

  it('валидатор воркфлоу закрепляет: матрица release обязана гонять playwright', () => {
    const validator = readFileSync(join(root, 'tools', 'validate-workflows.mjs'), 'utf8');
    expect(validator).toContain('матрица release: нет прогона npx playwright test');
  });

  it('решение спеки «не в PR»: PR-джобы ci.yml e2e и visual исключают гейт', () => {
    // Ревью T3.6 (high): PR-джобы ci.yml (e2e, visual) гоняют полный suite —
    // без явного исключения scaling.spec.js исполнялся бы на каждый PR,
    // вопреки решению спеки (Context: «в nightly и релизе, не в PR»).
    const ci = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
    const count = ci.split("IRAO_SCALING: 'off'").length - 1;
    expect(count, 'обе PR-джобы с playwright (e2e и visual) помечены IRAO_SCALING: off').toBe(2);
  });

  it('nightly и release гейт НЕ исключают: IRAO_SCALING в этих воркфлоу нет', () => {
    for (const file of ['nightly.yml', 'release.yml']) {
      const text = readFileSync(join(root, '.github', 'workflows', file), 'utf8');
      expect(text, `${file}: гейт едет в матрице безусловно`).not.toContain('IRAO_SCALING');
    }
  });

  it('playwright.config: спек гейта выключается только явным IRAO_SCALING=off', () => {
    const config = readFileSync(join(root, 'playwright.config.mjs'), 'utf8');
    expect(config, 'условие на env-флаг').toMatch(/IRAO_SCALING\s*===\s*'off'/);
    expect(config, 'testIgnore целясь в scaling.spec.js').toContain("'**/scaling.spec.js'");
  });
});
