/**
 * Юнит-пин ui-stat (задача T17.4; Testing requirements).
 *
 * Поверхность браузера — computed-пары вариантов на стенде, контраст
 * (on-dark-пары), axe и эталоны 375/768/1280/1440 — в
 * tests/e2e/ui-stat.spec.js; здесь — пины исполняемой формы решения:
 *  - components/ui-stat/ui-stat.css: база — флекс-колонка с gap/паддингами/
 *    радиусом md (ADR-0002: box-sizing на корне), поверхность — токен-хук
 *    --ui-stat-surface с дефолтом primary (Notes: кастомизация поверхностью
 *    без fork'а для вторых потребителей), текст — text-on-dark;
 *  - типографика значения — НЕ компонентом (Implementation requirements
 *    п.2: размер несёт роль ui-h2/ui-h4 в разметке; «визуал ≠ семантика»,
 *    typography-roles): __value перекрашивает роль в text-on-dark
 *    (заголовочные роли красят в --ui-color-heading, на тёмной плашке
 *    нечитаемо — прецедент .cp-company-stats__value пилота);
 *  - варианты поверхностей (Scope): --glass (glass-dark + рамка
 *    text-on-dark-muted, на фото), --filled (primary, геометрия оригинала
 *    pages.css:806 — 20/24, шаг 0), --deep (surface-blue-deep, 24/20,
 *    шаг 12); подпись на тёмном — on-dark-muted (канон Context), у
 *    --glass/--deep — text-on-dark оригинала (holding desc / adv text);
 *  - сноска __note — fs-micro + on-dark-muted: прозрачность 0.72
 *    пилота «maps на on-dark-muted» (Context — прецедент AA-замены
 *    white-75% из T15.2);
 *  - инварианты системы: без !important, без hex, только токены слоя 2;
 *  - канонический паттерн (Implementation requirements п.1/п.4): `<ul>` из
 *    `<li class="ui-stat">`, значение с ролью ui-h2, сноска опциональна;
 *  - 'ui-stat' в COMPONENTS showcase/build.mjs → CSS в dist/ui-core.min.css;
 *    presence-пин dist (Testing requirements: регресс сборки) — как у
 *    ui-vh (tests/unit/visually-hidden.test.js);
 *  - стенд showcase/pages/ui-stat: матрица вариантов + сноска + подложка
 *    фото для --glass;
 *  - пилот: 10 инстансов трёх вариантов (holding 3×--glass, company-stats
 *    3×--filled, company-adv 4×--deep), правила плашек .cp-holding__stat* /
 *    .cp-company-stats__item|__value|__label / .cp-company-adv__item|__title
 *    сняты из pilot.css (сетки-раскладки остаются сайт-зоной).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildForUnitTests } from '../helpers/unit-build.mjs';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('components/ui-stat/ui-stat.css — база (Scope T17.4, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-stat', 'ui-stat.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define stat — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define stat */')).toBe(true);
  });

  it('.ui-stat: box-sizing; flex-колонка; gap 8; паддинги 16/24; радиус md', () => {
    const block = blockOf(css, '.ui-stat');
    expect(block, 'правило .ui-stat найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    // Ритм holding (пилот .cp-holding__stat, pilot.css:449–458): шаг 8 = space-2.
    expect(block).toContain('gap: var(--ui-space-2);');
    // Канон паддингов Context: «16/24» — нижняя ступень диапазона.
    expect(block).toContain('padding: var(--ui-space-4) var(--ui-space-5);');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
  });

  it("поверхность — токен-хук --ui-stat-surface, дефолт primary (Notes: кастомизация без fork'а)", () => {
    const block = blockOf(css, '.ui-stat');
    expect(block).toContain('background-color: var(--ui-stat-surface, var(--ui-color-primary));');
    // on-dark-пары цветов в компоненте (Scope): текст корня — text-on-dark.
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('типографика значения — НЕ компонентом (Implementation requirements п.2): ни fs, ни fw, ни lh в правиле __value', () => {
    const block = blockOf(css, '.ui-stat__value');
    expect(block, 'правило .ui-stat__value найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    // Роль (ui-h2/ui-h4) красит в --ui-color-heading — на тёмной плашке
    // нечитаемо: элемент перекрашивает в on-dark (прецедент .cp-company-stats__value).
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    for (const forbidden of ['font-size', 'font-weight', 'line-height', 'letter-spacing']) {
      expect(block, `${forbidden} — размер несёт роль в разметке`).not.toContain(forbidden);
    }
  });

  it('__label: подпись on-dark-muted (канон Context), box-sizing', () => {
    const block = blockOf(css, '.ui-stat__label');
    expect(block, 'правило .ui-stat__label найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('color: var(--ui-color-text-on-dark-muted);');
  });

  it('__note: сноска fs-micro + on-dark-muted — прозрачность 0.72 пилота maps на токен (Context)', () => {
    const block = blockOf(css, '.ui-stat__note');
    expect(block, 'правило .ui-stat__note найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('font-size: var(--ui-fs-micro);');
    expect(block).toContain('color: var(--ui-color-text-on-dark-muted);');
    expect(block, 'прозрачность заменена токеном-парой, не дублируется').not.toContain('opacity');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('components/ui-stat/ui-stat.css — варианты поверхностей (Scope T17.4)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-stat', 'ui-stat.css'), 'utf8'),
  );

  it('--glass: стекло glass-dark + рамка on-dark-muted, паддинг 16 «как есть» (пилот pilot.css:449)', () => {
    const block = blockOf(css, '.ui-stat--glass');
    expect(block, 'правило .ui-stat--glass найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-glass-dark);');
    expect(block).toContain(
      'border: var(--ui-border-width) solid var(--ui-color-text-on-dark-muted);',
    );
    expect(block).toContain('padding: var(--ui-space-4);');
  });

  it('--glass: подпись on-dark — оригинал holding desc (src/blocks/holding/holding.css)', () => {
    const block = blockOf(css, '.ui-stat--glass .ui-stat__label');
    expect(block, 'правило подписи --glass найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('--filled: primary (поверхность базы/хука), геометрия оригинала pages.css:806 — 20/24, шаг 0', () => {
    const block = blockOf(css, '.ui-stat--filled');
    expect(block, 'правило .ui-stat--filled найдено').toBeTruthy();
    // Плашка 20/24 «как есть» (20px вне шкалы §3.2 — прецедент --ui-field-pad-inline).
    expect(block).toContain('padding: 1.25rem var(--ui-space-5);');
    // Оригинал не задаёт шаг между значением и подписью — перенос «как есть».
    expect(block).toContain('gap: 0;');
    // Поверхность — primary через дефолт хука базы: вариант её не дублирует.
    expect(block).not.toContain('background-color');
  });

  it('--deep: surface-blue-deep, 24/20 «как есть» (pages.css:815), шаг 12', () => {
    const block = blockOf(css, '.ui-stat--deep');
    expect(block, 'правило .ui-stat--deep найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-surface-blue-deep);');
    expect(block).toContain('padding: var(--ui-space-5) 1.25rem;');
    expect(block).toContain('gap: var(--ui-space-3);');
  });

  it('--deep: подпись on-dark — оригинал .company-adv__text (pages.css:818)', () => {
    const block = blockOf(css, '.ui-stat--deep .ui-stat__label');
    expect(block, 'правило подписи --deep найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('цвета вариантов — только существующие токены слоя 2 (Implementation requirements п.3)', () => {
    const allowed = new Set([
      '--ui-color-glass-dark',
      '--ui-color-primary',
      '--ui-color-surface-blue-deep',
      '--ui-color-text-on-dark',
      '--ui-color-text-on-dark-muted',
      '--ui-stat-surface',
    ]);
    for (const match of css.matchAll(/var\((--ui-[a-z0-9-]+)/g)) {
      if (match[1].startsWith('--ui-space') || match[1].startsWith('--ui-')) {
        // полный набор проверяется составом правил выше; здесь — цветовой:
      }
    }
    const colorVars = [
      ...css.matchAll(/var\((--ui-(?:stat-surface|color|white|blue|slate)[a-z0-9-]*)/g),
    ].map((m) => m[1]);
    expect(colorVars.length, 'цветовые ссылки есть').toBeGreaterThan(0);
    for (const token of colorVars) {
      expect(allowed, `${token} — токен из одобренного набора T17.4`).toContain(token);
    }
  });
});

describe('канонический паттерн (components/ui-stat/ui-stat.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-stat', 'ui-stat.html'), 'utf8');

  it('семантика списка: <ul> из <li class="ui-stat"> (Implementation requirements п.1)', () => {
    expect(html).toMatch(/<ul[^>]*>\s*<li class="ui-stat/);
    expect(html.match(/<li class="ui-stat/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('значение несёт роль ui-h2, размер — не компонентом (Implementation requirements п.2/п.4)', () => {
    expect(html).toMatch(/class="ui-stat__value ui-h2"/);
  });

  it('элементы: значение + подпись, сноска опциональна (Goal)', () => {
    expect(html).toContain('ui-stat__value');
    expect(html).toContain('ui-stat__label');
    expect(html).toContain('ui-stat__note');
  });

  it('варианты в каноне: --glass на фото (первый потребитель — статы холдинга)', () => {
    expect(html).toContain('ui-stat--glass');
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-stat/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-stat', 'index.html'), 'utf8');

  it('стенд существует и показывает матрицу: база + --glass + --filled + --deep', () => {
    for (const id of ['ui-stat-default', 'ui-stat-glass', 'ui-stat-filled', 'ui-stat-deep']) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it('--glass живёт на фото-подложке (Scope: «стекло на фото»)', () => {
    expect(html).toContain('id="ui-stat-glass-backdrop"');
    expect(html).toMatch(/<img\b[^>]*>/);
  });

  it('кастомизация поверхностью: демо токен-хука --ui-stat-surface (Notes)', () => {
    expect(html).toContain('--ui-stat-surface');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и дист (DoD, Testing requirements)', () => {
  // presence-пин читает собранный dist: воркер дожидается билда прогона
  // (tests/helpers/unit-build.mjs, T13.7) — в свежем CI-чекауте dist ещё нет,
  // и параллельный билдер tokens-stand/themes мог не успеть (флак ENOENT,
  // CI 40212544247).
  beforeAll(async () => {
    await buildForUnitTests(root);
  }, 60000);

  it("'ui-stat' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    // Пин точнее card-прецедента: в комментариях списка COMPONENTS есть ']'
    // (ui-pagination: button[disabled]) — регэксп «до закрывающей скобки»
    // не пересекает хвост списка.
    expect(build).toMatch(/'ui-stat',\s*\/\/ T17\.4/);
  });

  it('presence-пин dist: .ui-stat доезжает до сайтов в ui-core.min.css (регресс сборки)', () => {
    const core = readFileSync(join(root, 'dist', 'ui-core.min.css'), 'utf8');
    expect(core).toContain('.ui-stat');
    expect(core).toContain('.ui-stat--glass');
    expect(core).toContain('.ui-stat--filled');
    expect(core).toContain('.ui-stat--deep');
  });

  it('метаданные док-страницы showcase/docs/ui-stat.mjs (шаблон T10.1, прогон T10.2)', () => {
    expect(existsSync(join(root, 'showcase', 'docs', 'ui-stat.mjs'))).toBe(true);
  });

  it('README: варианты поверхностей, роль значения, токен-хук --ui-stat-surface (DoD)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-stat', 'README.md'), 'utf8');
    expect(readme).toContain('--ui-stat-surface');
    expect(readme).toContain('--glass');
    expect(readme).toContain('--filled');
    expect(readme).toContain('--deep');
    expect(readme).toMatch(/ui-h2|роль/);
    for (const section of [
      '## API',
      '## Клавиатура и a11y',
      "## Do / Don't",
      '## Известные границы',
    ]) {
      expect(readme, `секция ${section}`).toContain(section);
    }
  });
});

describe('пилот: 10 инстансов на компоненте, правила плашек сняты (Scope T17.4)', () => {
  const pilotDir = join(root, 'pilot', 'career-portal');
  const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
  const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

  it('holding: 3 стата --glass, значение — роль ui-h2, сноска __note (Implementation requirements п.4)', () => {
    expect(build.match(/class="ui-stat ui-stat--glass"/g)?.length ?? 0).toBe(3);
    expect(build.match(/class="ui-stat__value ui-h2"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('company: 3 факта --filled (значение ui-h2 + подпись ui-small), 4 преимущества --deep (значение ui-h4)', () => {
    expect(build.match(/class="ui-stat ui-stat--filled"/g)?.length ?? 0).toBe(3);
    expect(build.match(/class="ui-stat ui-stat--deep"/g)?.length ?? 0).toBe(4);
    expect(build).toMatch(/class="ui-stat__value ui-h2"/);
    expect(build).toMatch(/class="ui-h4 ui-stat__value"/);
    expect(build).toMatch(/class="ui-small ui-stat__label"/);
  });

  it('сняты правила плашек: .cp-holding__stat*, .cp-company-stats__item/__value/__label, .cp-company-adv__item/__title', () => {
    for (const selector of [
      '.cp-holding__stat',
      '.cp-holding__stat-value',
      '.cp-holding__stat-note',
      '.cp-company-stats__item',
      '.cp-company-stats__value',
      '.cp-company-stats__label',
      '.cp-company-adv__item',
      '.cp-company-adv__title',
    ]) {
      expect(blockOf(pilotCss, selector), `${selector} снято из pilot.css`).toBeFalsy();
    }
  });

  it('сетки-раскладки остаются сайт-зоной (Out of scope: раскладка — ui-grid/сайт)', () => {
    for (const selector of ['.cp-holding__stats', '.cp-company-stats', '.cp-company-adv']) {
      expect(blockOf(pilotCss, selector), `${selector} — сетка остаётся`).toBeTruthy();
    }
  });
});

describe('пилот: REPORT синхронен с фактом T17.4 (ревью high: рассинхрон доки и кода)', () => {
  const report = readFileSync(join(root, 'pilot', 'career-portal', 'REPORT.md'), 'utf8');

  it('§3.4: высота пилотного holding — 603 после T17.4 (618 устарело; compare 25.10, probe до/после)', () => {
    expect(report).toMatch(/\|\s*holding\s*\|\s*798\s*\|\s*603\s*\|/);
    expect(report, 'старая высота 618 из таблицы убрана').not.toMatch(
      /\|\s*holding\s*\|\s*798\s*\|\s*618\s*\|/,
    );
  });

  it('§3.3: mapping-запись осознанного отклонения — lh значения 1.35→1.1 (роль ui-h2), строка 81→66px, блок −15px вне порога ±4px', () => {
    expect(report, 'lh 1.35→1.1 зафиксирован').toMatch(/1[.,]35\s*→\s*1[.,]1\b/);
    expect(report, 'строка значения 81→66px').toMatch(/81\s*→\s*66/);
    expect(report, 'дельта блока 618→603').toMatch(/618\s*→\s*603/);
    expect(report, 'ссылка на задачу T17.4').toMatch(/T17\.4/);
  });
});
