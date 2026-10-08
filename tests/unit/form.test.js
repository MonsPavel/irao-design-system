/**
 * Юнит-пины T5.4 — ui-form: раскладка, сводная ошибка, success.
 *
 * Источники — career-portal pages.css:174–228 (.form-page, .form-grid,
 * .form-aside*, .form-success) и success-свап js/forms.js; исполняемая форма
 * решения:
 *  - components/ui-form/ui-form.css: mobile-first инверсия (стек — база,
 *    2 колонки grid'а от md 768, лейаут с aside от lg 1024); треки
 *    minmax(0, 1fr) — Implementation requirements п.1; media только
 *    min-width из шкалы T2.5; gap grid'а 20px и ширина aside 400px —
 *    новые токены слоя 2 «как есть» (прецедент --ui-card-gap);
 *  - сводная ошибка: role="alert" и tabindex="-1" — В РАЗМЕТКЕ (появление
 *    после сабмита объявляется немедленно; фокус — паттерн для T5.5/T5.6);
 *    фон/цвет — пары --ui-color-error[-bg];
 *  - success: заголовок несёт tabindex="-1" в разметке — паттерн работает
 *    без JS (серверный рендер — вариант Bitrix); фон --ui-color-success-bg;
 *  - легенда обязательных: маркер __req декоративен (aria-hidden), смысл —
 *    в тексте footnote (WCAG 1.4.1);
 *  - JS-модуля у компонента нет (Out of scope — T5.5/T5.6); 'ui-form' в
 *    COMPONENTS showcase/build.mjs; дока README с правилами фокуса.
 * Поверхность браузера (computed-колонки 375/768/1024/1440, фокус summary/
 * success, ссылки на поля, axe, эталоны) — tests/e2e/ui-form.spec.js.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки.
 *  \r\n → \n: рабочая копия Windows (core.autocrlf=true) отдаёт CRLF. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело единственного @media (min-width: Npx) файла. */
const mediaBlock = (css, px) =>
  css.match(new RegExp(`@media \\(min-width: ${px}px\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? null;

describe('components/ui-form/ui-form.css — раскладка (T5.4)', () => {
  const path = join(root, 'components', 'ui-form', 'ui-form.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define form — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define form */')).toBe(true);
  });

  it('.ui-form: box-sizing (ADR-0002); контейнер — флекс-колонка с шагом 24px одобренного .form-card', () => {
    const block = blockOf(css, '.ui-form');
    expect(block, 'правило .ui-form найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('gap: var(--ui-space-5);');
  });

  it('.ui-form__grid: minmax(0, 1fr) в базе; 2 колонки только от md 768 («1 колонка mobile → 2 от md»); gap — токен 20px', () => {
    const base = blockOf(css, '.ui-form__grid');
    expect(base).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(base).toContain('gap: var(--ui-form-grid-gap);');

    const md = mediaBlock(css, 768);
    expect(md, '@media (min-width: 768px) найден').toBeTruthy();
    expect(md).toContain('.ui-form__grid');
    expect(md).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
  });

  it('.ui-form__layout: стек в базе; 2 колонки (aside 400px) только от lg 1024; sticky aside — тоже только в lg-media', () => {
    const base = blockOf(css, '.ui-form__layout');
    expect(base).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(base).toContain('gap: var(--ui-space-7);');

    const asideBase = blockOf(css, '.ui-form__aside');
    expect(
      asideBase.includes('position: sticky'),
      'в мобильной базе aside статичен — sticky только на десктопе',
    ).toBe(false);

    const lg = mediaBlock(css, 1024);
    expect(lg, '@media (min-width: 1024px) найден').toBeTruthy();
    expect(lg).toContain('grid-template-columns: minmax(0, 1fr) var(--ui-form-aside-width);');
    expect(lg).toContain('.ui-form__aside');
    expect(lg).toContain('position: sticky;');
    expect(lg).toContain('top: var(--ui-space-5);');
  });

  it('мобильная база без media; media — только min-width из шкалы T2.5 {768, 1024}', () => {
    const used = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(used.length, 'есть media-блоки').toBeGreaterThan(0);
    for (const px of used) {
      expect([768, 1024], `min-width: ${px}px — из шкалы T2.5`).toContain(px);
    }
    expect(css, 'desktop-first max-width не переносится (T2.5)').not.toContain('max-width');
  });

  it('сводная ошибка и success — пары системы: error-bg / success-bg, паддинг 24px (дифф 28→24, как ui-card), радиус md', () => {
    const summary = blockOf(css, '.ui-form__summary');
    expect(summary).toContain('background-color: var(--ui-color-error-bg);');
    expect(summary).toContain('padding: var(--ui-space-5);');
    expect(summary).toContain('border-radius: var(--ui-radius-md);');

    const success = blockOf(css, '.ui-form__success');
    expect(success).toContain('background-color: var(--ui-color-success-bg);');
    expect(success).toContain('gap: var(--ui-space-3);');

    const summaryTitle = blockOf(css, '.ui-form__summary-title');
    expect(summaryTitle).toContain('color: var(--ui-color-error);');
    const successTitle = blockOf(css, '.ui-form__success-title');
    expect(successTitle).toContain('color: var(--ui-color-success);');
  });

  it('aside — одобренный .form-aside: фон surface-muted, gap 16px, sticky-отступ 24px; маркер __req — акцент .req', () => {
    const aside = blockOf(css, '.ui-form__aside');
    expect(aside).toContain('background-color: var(--ui-color-surface-muted);');
    expect(aside).toContain('gap: var(--ui-space-4);');
    expect(aside).toContain('padding: var(--ui-space-5);');

    const req = blockOf(css, '.ui-form__req');
    expect(req).toContain('color: var(--ui-color-accent);');
  });

  it('aside: UA-отступы dl/dt/dd сброшены компонентом (ADR-0002 — класс полностью определяет вид; ревью T5.4 high: dd{margin-inline-start:40px} уезжал из-под метки)', () => {
    // Общий ресет aside-семейства: список размечается элементом __aside-list
    // (класс на <dl>) — голый dl в селекторе не проходит БЭМ-гейт (инвариант
    // «селектор = класс ui-form*»). Ритм строки «метка — значение» несёт gap.
    const reset = css.match(
      /\.ui-form__aside-list,\s*\.ui-form__aside-row,\s*\.ui-form__aside-label,\s*\.ui-form__aside-value\s*\{([^}]*)\}/,
    );
    expect(reset, 'общий ресет отступов aside-семейства найден').toBeTruthy();
    expect(
      reset[1],
      'UA-дефолты dl {margin: 20px 0} / dd {margin-inline-start: 40px} сброшены',
    ).toContain('margin: 0;');
  });

  it('инварианты: без !important и без сырых цветов (гейты stylelint не дублируются — пин на состав)', () => {
    expect(css, '!important только в a11y/vi.css').not.toContain('!important');
    expect(css, 'hex вне tokens/primitives.css запрещён').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('components/ui-form/ui-form.html — канонический паттерн (T5.4)', () => {
  const path = join(root, 'components', 'ui-form', 'ui-form.html');
  const html = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

  it('summary: role="alert" и tabindex="-1" в разметке; список ссылок ведёт на id полей формы', () => {
    expect(html).toContain('class="ui-form__summary" role="alert" tabindex="-1"');
    const links = [...html.matchAll(/class="ui-link" href="#([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect(links.length, 'ссылки summary есть').toBeGreaterThan(0);
    for (const id of links) {
      expect(html.includes(`id="${id}"`), `цель #${id} существует в паттерне`).toBe(true);
    }
  });

  it('success-заголовок несёт tabindex="-1" (паттерн фокуса работает без JS — вариант Bitrix)', () => {
    expect(html).toContain('ui-form__success-title" tabindex="-1"');
  });

  it('легенда обязательных: маркер aria-hidden, смысл в тексте footnote (не только цветом, WCAG 1.4.1)', () => {
    expect(html).toMatch(/class="ui-form__req" aria-hidden="true"/);
    expect(html).toContain('— обязательные поля');
  });

  it('aside-список размечен элементом __aside-list (класс на <dl> — носитель ресета UA-отступов, ADR-0002)', () => {
    expect(html).toContain('<dl class="ui-form__aside-list">');
  });

  it('полная ширина поля в grid — модификатор ui-field--wide (T5.1), сам ui-form никаких --wide не вводит', () => {
    expect(html).toContain('ui-field--wide');
    const css = stripCssComments(
      readFileSync(join(root, 'components', 'ui-form', 'ui-form.css'), 'utf8'),
    );
    expect(css).not.toMatch(/\.ui-form__grid--wide|\.ui-form--wide/);
  });
});

describe('подключение T5.4 в систему', () => {
  it("'ui-form' добавлен в COMPONENTS showcase/build.mjs (CSS попадает в ui-core.min.css)", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/'ui-form',\s*\/\/\s*T5\.4/);
  });

  it('токены слоя 2: --ui-form-grid-gap 20px и --ui-form-aside-width 400px — перенос «как есть» (прецедент --ui-card-gap)', () => {
    const semantic = stripCssComments(readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8'));
    expect(semantic).toContain('--ui-form-grid-gap: 1.25rem;');
    expect(semantic).toContain('--ui-form-aside-width: 25rem;');
  });

  it('стенд — расширенный (showcase/pages/ui-form/): демо-хуки data-ui-form-demo, серверные состояния, без JS-логики валидации', () => {
    const stand = readFileSync(
      join(root, 'showcase', 'pages', 'ui-form', 'index.html'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(stand, 'демо-переключатель summary').toContain('data-ui-form-demo="summary"');
    expect(stand, 'демо-переключатель success').toContain('data-ui-form-demo="success"');
    expect(stand, 'хук свапа body').toContain('data-ui-form-body');
    expect(stand, 'серверный рендер summary').toContain('id="uifo-summary-srv"');
    expect(stand, 'серверный рендер success').toContain('id="uifo-success-srv"');
    expect(
      /novalidate/i.test(stand),
      'novalidate в разметке недопустим — его ставит только модуль T5.5',
    ).toBe(false);
  });
});
