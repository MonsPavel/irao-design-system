/**
 * Юнит-пин ui-card (задача T4.4; Testing requirements).
 *
 * Поверхность браузера — варианты, паттерн карточки-ссылки (Tab-порядок,
 * фокус по всей площади, клик-зоны), hover-гвард hasTouch, axe и эталоны —
 * в tests/e2e/ui-card.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: пара «рамка при наведении» --ui-color-border-hover
 *    (career-portal .card--hover components.css:123, #B9C6DE → --ui-slate-300;
 *    семантическое имя — решение №1 таблицы диффов: «имена заведут задачи
 *    компонентов») и gap слотов --ui-card-gap (pages.css:42, 14px — вне шкалы
 *    §3.2, перенос «как есть») (Implementation requirements п.1: «значения —
 *    из токенов»);
 *  - components/ui-card/ui-card.css: box-sizing на корне (ADR-0002); позиция
 *    relative — точка позиционирования растянутой ссылки; flex-колонка слотов
 *    без фиксированных высот (Technical considerations: при 32px-масштабе
 *    карточка растёт по контенту); hover — ТОЛЬКО под @media (hover: hover)
 *    (Context: sticky-hover «залипает» на таче);
 *  - паттерн stretched link: ::after с inset 0 растягивает контент-ссылку на
 *    карточку; фокус-обводка по всей карточке (focus-тройка токенов), локальная
 *    обводка ссылки заменена (focus-policy.md «Правило для компонентов» —
 *    stylelint-гейт outline-none с обоснованием); вложенные интерактивы
 *    подняты position: relative; z-index (паттерн nested-interactive, Scope);
 *  - инварианты системы: без !important, без hex;
 *  - канонический паттерн: карточка-ссылка со слотами и вложенной кнопкой,
 *    без inline-стилей (VI-инвариант §5);
 *  - стенд showcase/pages/ui-card: варианты + слоты + карточка-ссылка с
 *    вложенной кнопкой, без data-ui-check-layout (гейт масштабирования T3.6
 *    не расширяется без записи в CHECK_STANDS — пин синхронности
 *    tests/unit/scaling.test.js);
 *  - 'ui-card' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - --ui-color-border-hover в EXCEPTIONS tests/contrast/pairs.config.mjs —
 *    декоративная рамка (гейт T2.3: каждый цветовой токен — в паре или
 *    исключении);
 *  - README компонента: паттерн карточки-ссылки (DoD), nested-interactive,
 *    контентные карточки — EPIC-8/T8.1, media — T4.6.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('tokens/semantic.css — карточечные токены (Implementation requirements T4.4 п.1)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('hover-рамка карточки: --ui-color-border-hover = var(--ui-slate-300) (career-portal .card--hover components.css:123)', () => {
    // .card--hover:hover { border-color: #B9C6DE; … } — примитив --ui-slate-300
    // существовал с T2.1, семантическое имя — решение №1 таблицы диффов (T4.4).
    expect(source).toMatch(/--ui-color-border-hover:\s*var\(--ui-slate-300\);/);
  });

  it('gap слотов: --ui-card-gap = 0.875rem (14px career-portal pages.css:42, вне шкалы §3.2 — перенос «как есть»)', () => {
    expect(source).toMatch(/--ui-card-gap:\s*0\.875rem;/);
  });
});

describe('components/ui-card/ui-card.css — база (Implementation requirements T4.4 п.3, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-card', 'ui-card.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define card — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define card */')).toBe(true);
  });

  it('.ui-card: box-sizing; relative (точка ::after); flex-колонка; отступы — токены', () => {
    const block = blockOf(css, '.ui-card');
    expect(block, 'правило .ui-card найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: relative;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('gap: var(--ui-card-gap);');
    // Паддинг 24px = --ui-space-5 (padding .vac-card career-portal pages.css:43).
    expect(block).toContain('padding: var(--ui-space-5);');
  });

  it('.ui-card: рамка/радиус/фон — токены (career-portal .card components.css:115–120)', () => {
    const block = blockOf(css, '.ui-card');
    expect(block).toContain('background-color: var(--ui-color-surface);');
    expect(block).toContain('border: var(--ui-border-width) solid var(--ui-border-color);');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
    // career-portal .card: transition border-color, box-shadow (--transition).
    // Формат не пиним — репо-стиль prettier'а переносит список (как в ui-button).
    expect(block).toMatch(/transition:\s*\n?\s*border-color var\(--ui-transition\),/);
    expect(block).toContain('box-shadow var(--ui-transition);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — карточка растёт по контенту (Technical considerations, 32px-база T3.6)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-card/ui-card.css — модификаторы (Scope T4.4: --hover, --filled)', () => {
  const path = join(root, 'components', 'ui-card', 'ui-card.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('--filled: фон и рамка surface-muted (career-portal .card--filled components.css:127)', () => {
    const block = blockOf(css, '.ui-card--filled');
    expect(block, 'правило .ui-card--filled найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('border-color: var(--ui-color-surface-muted);');
  });

  it('все :hover-правила — ТОЛЬКО внутри @media (hover: hover) (Context: sticky-hover на таче)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    const beforeMedia = css.slice(0, mediaIndex);
    expect(beforeMedia, 'до media-обёртки :hover-селекторов нет').not.toContain(':hover');
    const mediaBlock = css.slice(mediaIndex);
    expect(mediaBlock).toContain('.ui-card--hover:hover');
    expect(mediaBlock).toContain('.ui-card--link:hover .ui-card__link');
  });

  it('--hover: рамка --ui-color-border-hover + тень --ui-shadow-md (career-portal components.css:122–125, Technical considerations)', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    const block = blockOf(mediaBlock, '.ui-card--hover:hover');
    expect(block).toContain('border-color: var(--ui-color-border-hover);');
    expect(block).toContain('box-shadow: var(--ui-shadow-md);');
  });

  it('hover карточки-ссылки перекрашивает контент-ссылку в primary (career-portal pages.css:53)', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    const block = blockOf(mediaBlock, '.ui-card--link:hover .ui-card__link');
    expect(block).toContain('color: var(--ui-color-primary);');
  });
});

describe('components/ui-card/ui-card.css — слоты (Scope T4.4: __media/__title/__body/__footer)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-card', 'ui-card.css'), 'utf8'),
  );

  it('каждый слот объявлен и несёт box-sizing (ADR-0002)', () => {
    for (const slot of ['media', 'title', 'body', 'footer']) {
      const block = blockOf(css, `.ui-card__${slot}`);
      expect(block, `слот .ui-card__${slot} найден`).toBeTruthy();
      expect(block).toContain('box-sizing: border-box;');
    }
  });

  it('__footer прижат к низу растянутой карточки (сетка списковых страниц: margin-top auto)', () => {
    const block = blockOf(css, '.ui-card__footer');
    expect(block).toContain('margin-top: auto;');
  });
});

describe('components/ui-card/ui-card.css — паттерн карточки-ссылки (Scope: stretched link)', () => {
  const path = join(root, 'components', 'ui-card', 'ui-card.css');
  const raw = readFileSync(path, 'utf8');
  const css = stripCssComments(raw);

  it('контент-ссылка: цвет наследуется, подчёркивание выключено (career-portal pages.css:50 — доступное имя = текст ссылки)', () => {
    const block = blockOf(css, '.ui-card--link .ui-card__link');
    expect(block, 'правило .ui-card--link .ui-card__link найдено').toBeTruthy();
    expect(block).toContain('color: inherit;');
    expect(block).toContain('text-decoration: none;');
  });

  it('::after с inset 0 растягивает ссылку на карточку (career-portal pages.css:51)', () => {
    const block = blockOf(css, '.ui-card--link .ui-card__link::after');
    expect(block, 'правило ::after найдено').toBeTruthy();
    expect(block).toContain("content: '';");
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
  });

  it('фокус — обводка по всей карточке на focus-тройке токенов (career-portal pages.css:52, ADR-0001)', () => {
    const block = blockOf(css, '.ui-card--link .ui-card__link:focus-visible::after');
    expect(block, 'правило :focus-visible::after найдено').toBeTruthy();
    expect(block).toContain('outline: var(--ui-focus-width) solid var(--ui-focus-color);');
    expect(block).toContain('outline-offset: var(--ui-focus-offset);');
  });

  it('локальная обводка ссылки заменена (focus-policy.md): outline none только с disable-комментарием и правилом-заменой', () => {
    const block = blockOf(css, '.ui-card--link .ui-card__link:focus-visible');
    expect(block, 'правило-замена найдено').toBeTruthy();
    expect(block).toContain('outline: none;');
    // Гейт outline-none (stylelint) с обоснованием — без комментария линт
    // шумит warning'ом, а «убийство» фокуса без замены — нарушение ADR-0001.
    expect(raw).toMatch(
      /stylelint-disable-next-line declaration-property-value-disallowed-list[^\n]*::after/,
    );
    // Замена обязана существовать РЯДОМ (см. предыдущий тест) — это пин пары.
  });

  it('вложенные интерактивы подняты над растянутой ссылкой (паттерн nested-interactive, career-portal pages.css:69/83)', () => {
    const block = blockOf(css, '.ui-card--link :is(a, button):not(.ui-card__link)');
    expect(block, 'правило подъёма интерактивов найдено').toBeTruthy();
    expect(block).toContain('position: relative;');
    expect(block).toContain('z-index: 1;');
  });
});

describe('components/ui-card/ui-card.css — CTA-карточка (T17.8: --cta + --primary/--accent/--row)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-card', 'ui-card.css'), 'utf8'),
  );

  it('--cta: центр-композиция и ритм — pad 48/24 (space-7/space-5), шаг space-3, радиус lg', () => {
    const block = blockOf(css, '.ui-card--cta');
    expect(block, 'правило .ui-card--cta найдено').toBeTruthy();
    expect(block).toContain('align-items: center;');
    expect(block).toContain('gap: var(--ui-space-3);');
    expect(block).toContain('padding: var(--ui-space-7) var(--ui-space-5);');
    expect(block).toContain('border-radius: var(--ui-radius-lg);');
    expect(block).toContain('text-align: center;');
  });

  it.each([
    ['--primary', '--ui-color-primary'],
    ['--accent', '--ui-color-accent'],
  ])(
    '--cta%s: поверхность токеном %s + on-dark-пара текста компонентом (Implementation requirements п.1)',
    (variant, token) => {
      const block = blockOf(css, `.ui-card--cta${variant}`);
      expect(block, `правило .ui-card--cta${variant} найдено`).toBeTruthy();
      expect(block).toContain(`background-color: var(${token});`);
      expect(block).toContain(`border-color: var(${token});`);
      expect(block).toContain('color: var(--ui-color-text-on-dark);');
    },
  );

  it('заголовочные роли на заливке — on-dark (цвет роли heading = primary, на primary-заливке невидим; on-dark-пара — компонентом)', () => {
    // Селекторы длинные — prettier держит их по одному на строку; пин —
    // на наличие обоих селекторов и объявления в правиле между ними.
    expect(css).toMatch(
      /\.ui-card--cta--primary :is\(\.ui-h1, \.ui-h2, \.ui-h3, \.ui-h4, \.ui-h5, \.ui-page-title\)/,
    );
    expect(css).toMatch(
      /\.ui-card--cta--accent :is\(\.ui-h1, \.ui-h2, \.ui-h3, \.ui-h4, \.ui-h5, \.ui-page-title\)/,
    );
    const start = css.indexOf('.ui-card--cta--primary :is(');
    const end = css.indexOf('.ui-card--cta--row', start);
    const rule = css.slice(start, end);
    expect(rule).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('--row: space-between со слотом действия; ритм плитки — pad space-5 (cp-vacancy-search__all)', () => {
    const block = blockOf(css, '.ui-card--cta--row');
    expect(block, 'правило .ui-card--cta--row найдено').toBeTruthy();
    expect(block).toContain('flex-direction: row;');
    expect(block).toContain('justify-content: space-between;');
    expect(block).toContain('padding: var(--ui-space-5);');
    expect(block).toContain('text-align: start;');
  });

  it('инварианты CTA-блока: без !important и hex (наследуются от файла — контроль на подмножестве)', () => {
    const ctaIndex = css.indexOf('.ui-card--cta');
    const ctaSection = css.slice(ctaIndex, css.indexOf('.ui-card__media', ctaIndex));
    expect(ctaSection).not.toContain('!important');
    expect(ctaSection).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('канон CTA (components/ui-card/ui-card.html, T17.8)', () => {
  const html = readFileSync(join(root, 'components', 'ui-card', 'ui-card.html'), 'utf8');

  it('primary-центр: h2/lead/ui-link--on-dark внутри ui-card--cta--primary (пример канона спеки)', () => {
    expect(html).toContain('ui-card--cta ui-card--cta--primary');
    expect(html).toMatch(/ui-link--on-dark/);
  });

  it('accent-row: ссылка-плашка со слотом действия (span ui-h4 + svg aria-hidden)', () => {
    expect(html).toContain('ui-card--cta--accent ui-card--cta--row');
    expect(html).toMatch(/<span class="ui-h4">[^<]+<\/span>/);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>/);
  });
});

describe('стенд — CTA-секция (showcase/pages/ui-card/index.html, T17.8)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-card', 'index.html'), 'utf8');

  it('эталонные id: primary-центр и accent-row', () => {
    for (const id of ['ui-card-cta-primary', 'ui-card-cta-accent-row']) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('пилот (T17.8): CTA-плашки на модификаторе, правила сняты', () => {
  const pilotCss = readFileSync(join(root, 'pilot', 'career-portal', 'pilot.css'), 'utf8');
  const build = readFileSync(join(root, 'pilot', 'career-portal', 'build.mjs'), 'utf8');

  it('правила cp-cta-mail__card/email и cp-vacancy-search__all сняты (~25 строк)', () => {
    expect(pilotCss).not.toContain('.cp-cta-mail__card');
    expect(pilotCss).not.toContain('.cp-cta-mail__email');
    expect(pilotCss).not.toContain('.cp-vacancy-search__all');
  });

  it('email-карточка — ui-card--cta--primary, плитка вакансий — accent + row на <a>', () => {
    expect(build).toMatch(/class="ui-card ui-card--cta ui-card--cta--primary"/);
    expect(build).toMatch(/class="ui-card ui-card--cta ui-card--cta--accent ui-card--cta--row"/);
    // email-ссылка — ролями (ui-h2) + готовый контрол ui-link--on-dark
    expect(build).toMatch(/class="ui-h2 ui-link ui-link--on-dark"/);
  });

  it('тело баннера компании — CTA-центр-композиция (bare --cta, оверлей — за T17.3)', () => {
    expect(build).toMatch(/class="cp-company-banner__body ui-card ui-card--cta"/);
  });

  it('compare-проба cta-mail ведёт на модификатор (прецедент video-block: селектор на компонент)', () => {
    const compare = readFileSync(join(root, 'pilot', 'career-portal', 'compare.mjs'), 'utf8');
    expect(compare).toMatch(/\['cta-mail', '\.cta-mail', '\.ui-card--cta--primary'\]/);
  });
});

describe('errata AC ±4px (T17.8, решение владельца 26.10 — эскалация dwfq-25c6ee50-1)', () => {
  it('файл задачи несёт errata-примечание под AC compare: осознанный допуск +11px для cta-mail', () => {
    const task = readFileSync(
      join(root, 'docs', 'ui-system', 'epics', 'EPIC-17-ds-full-coverage', 'T17.8-cta-card.md'),
      'utf8',
    );
    expect(task, 'errata-примечание под AC ±4px').toMatch(
      /Errata[\s\S]*допуск \+11px[\s\S]*275→286/,
    );
  });

  it('REPORT §3.4 синхронен: cta-mail — осознанный допуск со ссылкой на errata, vacancy-search — в пороге', () => {
    const report = readFileSync(join(root, 'pilot', 'career-portal', 'REPORT.md'), 'utf8');
    const ctaRow = report.match(/\| cta-mail \| 364 \| [^\n]*\|/);
    expect(ctaRow, 'строка cta-mail в таблице высот').toBeTruthy();
    expect(ctaRow[0]).toContain('286');
    expect(ctaRow[0]).toContain('+11');
    expect(ctaRow[0]).toContain('errata');
    const vacRow = report.match(/\| vacancy-search \| 310 \| [^\n]*\|/);
    expect(vacRow, 'строка vacancy-search в таблице высот').toBeTruthy();
    expect(vacRow[0]).toContain('дельта миграции 0');
  });
});

describe('axe-реестр (T17.8): on-dark текст accent-варианта — известное исключение', () => {
  it('строка KNOWN_AXE_EXCEPTIONS для .ui-card--cta--accent (harness.js, как ui-video__play)', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    const entry = harness.match(
      /\{\s*id:\s*'color-contrast',[\s\S]*?\.ui-card--cta--accent[\s\S]*?\}/,
    );
    expect(entry, 'запись реестра найдена').toBeTruthy();
    expect(entry[0], 'обоснование записано').toContain('reason:');
    expect(entry[0], 'lookahead: не матчит более длинное имя класса').toContain('(?![\\w-])');
  });

  it('токен-уровень уже покрыт: пара on-dark-on-accent в pairs.config.mjs (T2.6/ADR-0010)', () => {
    const config = readFileSync(join(root, 'tests', 'contrast', 'pairs.config.mjs'), 'utf8');
    expect(config).toContain("id: 'on-dark-on-accent'");
  });

  it("README компонента: CTA-модификатор и do/don't (один призыв, действующее слово)", () => {
    const readme = readFileSync(join(root, 'components', 'ui-card', 'README.md'), 'utf8');
    expect(readme).toContain('ui-card--cta');
    expect(readme).toMatch(/один призыв/i);
  });
});

describe('канонический паттерн (components/ui-card/ui-card.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-card', 'ui-card.html'), 'utf8');

  it('карточка-ссылка: модификатор --link, растянутая ссылка __link, слоты и вложенная кнопка', () => {
    expect(html).toContain('ui-card--link');
    expect(html).toContain('ui-card__link');
    for (const slot of ['ui-card__media', 'ui-card__title', 'ui-card__body', 'ui-card__footer']) {
      expect(html, `слот ${slot}`).toContain(slot);
    }
    expect(html).toMatch(/<button[^>]*class="[^"]*ui-button/);
  });

  it('модификатор --hover в паттерне (перенос .card--hover)', () => {
    expect(html).toContain('ui-card--hover');
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-card/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-card', 'index.html'), 'utf8');

  it('стенд существует и показывает матрицу: база + --hover + --filled', () => {
    for (const id of ['ui-card-default', 'ui-card-hover', 'ui-card-filled']) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it('слоты и карточка-ссылка с вложенной кнопкой на стенде (AC)', () => {
    expect(html).toContain('id="ui-card-slots"');
    expect(html).toContain('id="ui-card-link"');
    expect(html).toContain('id="ui-card-link-title"');
    expect(html).toContain('id="ui-card-link-button"');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-card' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-card'[^\]]*\]/);
  });

  it('--ui-color-border-hover в EXCEPTIONS pairs.config.mjs — декоративная рамка (гейт T2.3)', () => {
    const config = readFileSync(join(root, 'tests', 'contrast', 'pairs.config.mjs'), 'utf8');
    const exception = config.match(/\{\s*token:\s*'--ui-color-border-hover'[\s\S]*?\}/);
    expect(exception, 'исключение для hover-рамки найдено').toBeTruthy();
    expect(exception[0], 'обоснование записано').toContain('reason:');
  });

  it('README компонента: паттерн карточки-ссылки, nested-interactive, контентные карточки — T8.1, media — T4.6', () => {
    const readme = readFileSync(join(root, 'components', 'ui-card', 'README.md'), 'utf8');
    expect(readme).toMatch(/карточка-ссылка|stretched/i);
    expect(readme).toContain('nested-interactive');
    expect(readme).toContain('ui-card--link');
    expect(readme).toContain('T8.1');
    expect(readme).toContain('T4.6');
  });
});
