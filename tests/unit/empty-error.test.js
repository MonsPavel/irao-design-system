/**
 * Юнит-пины паттернов ui-empty / ui-error (задача T4.8; Testing requirements).
 *
 * T4.8 — паттерны, а не тяжёлые компоненты (анти-overengineering): минимальный
 * CSS поверх существующих примитивов (типографика, button, link). Пины
 * исполняемой формы решения:
 *  - components/ui-empty/ui-empty.css и components/ui-error/ui-error.css:
 *    box-sizing на корнях (ADR-0002); только токены слоя 2; минимальность —
 *    без media-запросов (адаптивность дают flex-wrap и поток) и без :hover
 *    (в паттернах нет собственных интерактивных элементов — CTA несут свои
 *    hover-правила в ui-button/ui-link); без !important/hex (VI-инвариант §5);
 *    без фиксированных высот текстовых узлов; полностраничный вариант
 *    ui-error--page переносит min-height: 50vh одобренного .page-404
 *    (career-portal pages.css:667) — база (inline) без min-height;
 *  - канонические паттерны ui-empty.html / ui-error.html: правило заголовков
 *    спеки (пустое состояние — h2, страница уже имеет h1; 404 — h1) —
 *    сквозная html-validate-проверка (irao/one-h1, irao/heading-order)
 *    исполняется npm run lint:html по этим же файлам; CTA обязательны
 *    (хотя бы одно действие из паттерна); медиа-слот декоративен
 *    (svg aria-hidden), состояние объясняется текстом; без tabindex
 *    (появляется в потоке, фокус не ловит — Technical considerations);
 *    полностраничный 404 — без крошек, только nav-минимум действий;
 *  - стенды трёх состояний: showcase/pages/ui-empty (пустой список),
 *    showcase/pages/ui-error (ошибка загрузки, inline), showcase/pages/
 *    error-404 (полностраничный 404); без data-ui-check-layout (гейт T3.6
 *    не расширяется без записи в CHECK_STANDS);
 *  - подключение: 'ui-empty'/'ui-error' в COMPONENTS showcase/build.mjs —
 *    CSS в dist/ui-core.min.css; стенд error-404 собирается сборщиком
 *    без служебного h1 каркаса (заголовок страницы несёт паттерн);
 *  - дока: правила текстов (нет вины пользователя, есть следующее действие,
 *    когда retry-кнопка/когда просто ссылка) и правила заголовков — в README.
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

/** Открывающий тег целиком (пины атрибутов устойчивы к переносам prettier). */
const tagOf = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 's'));
  return match ? match[0] : '';
};

describe('components/ui-empty/ui-empty.css — минимум поверх примитивов', () => {
  const path = join(root, 'components', 'ui-empty', 'ui-empty.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define empty — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define empty */')).toBe(true);
  });

  it('.ui-empty: box-sizing (ADR-0002); центрированная колонка слотов — токены шкалы', () => {
    const block = blockOf(css, '.ui-empty');
    expect(block, 'правило .ui-empty найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('text-align: center;');
    expect(block).toContain('gap: var(--ui-space-5);');
  });

  it('.ui-empty__media — декоративный слот: без фиксированных размеров (размер — разметке сайта), приглушённый тон токеном', () => {
    const block = blockOf(css, '.ui-empty__media');
    expect(block, 'правило .ui-empty__media найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('flex: none;');
    expect(block).toContain('color: var(--ui-color-text-muted);');
    expect(block, 'слот не навязывает размер иллюстрации').not.toMatch(/width|height/);
  });

  it('.ui-empty__actions: CTA-лента — flex + перенос (адаптив без media), центрирование', () => {
    const block = blockOf(css, '.ui-empty__actions');
    expect(block, 'правило .ui-empty__actions найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-wrap: wrap;');
    expect(block).toContain('gap: var(--ui-space-3);');
    expect(block).toContain('justify-content: center;');
  });

  it('минимальность: ни media-запросов, ни :hover (адаптив — flex-wrap/поток; hover — у CTA в ui-button/ui-link)', () => {
    expect(css, 'media-запросов нет — CSS минимален (анти-overengineering)').not.toContain(
      '@media',
    );
    expect(css, 'собственных hover-правил нет').not.toContain(':hover');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002); фиксированных высот нет', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонический паттерн ui-empty (components/ui-empty/ui-empty.html)', () => {
  const path = join(root, 'components', 'ui-empty', 'ui-empty.html');
  const html = readFileSync(path, 'utf8');

  it('корень .ui-empty; медиа-слот — декоративный svg aria-hidden (иллюстрация не в a11y-дереве)', () => {
    const divTag = tagOf(html, 'div');
    expect(divTag).toContain('class="ui-empty"');
    const svgTag = tagOf(html, 'svg');
    expect(svgTag).toContain('class="ui-empty__media"');
    expect(svgTag).toContain('aria-hidden="true"');
    expect(svgTag).toContain('focusable="false"');
  });

  it('заголовок пустого состояния — h2 (страница уже имеет h1; правило спеки T4.8 п.2)', () => {
    const h2Tag = tagOf(html, 'h2');
    expect(h2Tag, 'заголовок состояния — h2').toBeTruthy();
    expect(h2Tag).toContain('class="ui-empty__title');
    expect(html, 'в паттерне нет собственного h1').not.toMatch(/<h1/);
  });

  it('пояснение — текстовая роль с muted (состояние объясняется текстом, не только иллюстрацией)', () => {
    const pTag = tagOf(html, 'p');
    expect(pTag).toContain('class="ui-empty__text');
    expect(pTag).toContain('ui-body');
    expect(pTag).toContain('ui-text--muted');
  });

  it('CTA обязательны: в .ui-empty__actions есть действие (ui-button или ui-link)', () => {
    const actions = html.match(/<div class="ui-empty__actions">([\s\S]*?)<\/div>/);
    expect(actions, 'слот действий найден').toBeTruthy();
    expect(actions[1], 'хотя бы одно действие (Implementation requirements п.3)').toMatch(
      /<(?:a|button)[\s>]/,
    );
  });

  it('появляется в потоке: без tabindex, без role/aria-live, без inline-стилей (VI §5)', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/aria-live|role="/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('components/ui-error/ui-error.css — inline и полностраничный варианты', () => {
  const path = join(root, 'components', 'ui-error', 'ui-error.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define error — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define error */')).toBe(true);
  });

  it('.ui-error (база = inline в секции): та же колонка слотов; БЕЗ min-height — не растягивается вне страницы', () => {
    const block = blockOf(css, '.ui-error');
    expect(block, 'правило .ui-error найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('text-align: center;');
    expect(block).toContain('gap: var(--ui-space-5);');
    expect(block, 'база без min-height — вертикальность только у --page').not.toContain(
      'min-height',
    );
  });

  it('.ui-error--page: полностраничный вариант переносит min-height: 50vh одобренного .page-404 (career-portal pages.css:667)', () => {
    const block = blockOf(css, '.ui-error--page');
    expect(block, 'правило .ui-error--page найдено').toBeTruthy();
    expect(block).toContain('min-height: 50vh;');
    expect(block).toContain('justify-content: center;');
  });

  it('.ui-error__media/__actions — те же слоты, что у ui-empty (единая структура состояний)', () => {
    const media = blockOf(css, '.ui-error__media');
    expect(media).toBeTruthy();
    expect(media).toContain('box-sizing: border-box;');
    expect(media).toContain('flex: none;');
    expect(media).toContain('color: var(--ui-color-text-muted);');

    const actions = blockOf(css, '.ui-error__actions');
    expect(actions).toBeTruthy();
    expect(actions).toContain('box-sizing: border-box;');
    expect(actions).toContain('display: flex;');
    expect(actions).toContain('flex-wrap: wrap;');
    expect(actions).toContain('justify-content: center;');
  });

  it('минимальность и инварианты: без media/:hover/!important/hex (vi-перекраска, ADR-0002)', () => {
    expect(css, 'media-запросов нет — CSS минимален').not.toContain('@media');
    expect(css, 'собственных hover-правил нет').not.toContain(':hover');
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('канонический паттерн ui-error (components/ui-error/ui-error.html)', () => {
  const path = join(root, 'components', 'ui-error', 'ui-error.html');
  const html = readFileSync(path, 'utf8');

  it('полностраничный вариант: .ui-error--page с h1 (404 — h1; правило спеки T4.8 п.2)', () => {
    const pageTag = tagOf(html, 'div');
    expect(pageTag).toContain('class="ui-error ui-error--page"');
    const h1Tag = tagOf(html, 'h1');
    expect(h1Tag, 'заголовок полностраничного состояния — h1').toBeTruthy();
    expect(h1Tag).toContain('class="ui-error__title');
    expect((html.match(/<h1/g) ?? []).length, 'ровно один h1 в паттерне').toBe(1);
  });

  it('inline-вариант: .ui-error с h2 (в секции страницы, где h1 уже занят страницей)', () => {
    const inlineTag = html.match(/<div class="ui-error"(?:\s[^>]*)?>/);
    expect(inlineTag, 'inline-вариант без --page найден').toBeTruthy();
    const h2Tag = tagOf(html, 'h2');
    expect(h2Tag).toContain('class="ui-error__title');
  });

  it('медиа-слот декоративен; пояснение — текст; состояние объясняется текстом (не только иллюстрацией)', () => {
    const svgTag = tagOf(html, 'svg');
    expect(svgTag).toContain('class="ui-error__media"');
    expect(svgTag).toContain('aria-hidden="true"');
    const pTag = tagOf(html, 'p');
    expect(pTag).toContain('ui-body');
    expect(pTag).toContain('ui-text--muted');
  });

  it('действия обязательны в обоих вариантах (назад/на главную/повторить — хотя бы одно)', () => {
    const actionsBlocks = [...html.matchAll(/<div class="ui-error__actions">([\s\S]*?)<\/div>/g)];
    expect(actionsBlocks.length, 'слот действий у обоих вариантов').toBe(2);
    for (const [, actions] of actionsBlocks) {
      expect(actions, 'хотя бы одно действие (Implementation requirements п.3)').toMatch(
        /<(?:a|button)[\s>]/,
      );
    }
  });

  it('nav-минимум: крошек в полностраничном состоянии нет (Technical considerations T4.8)', () => {
    expect(html).not.toMatch(/<nav/);
    expect(html).not.toMatch(/ui-breadcrumbs/);
  });

  it('появляется в потоке: без tabindex, role/aria-live, inline-стилей (VI §5)', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/aria-live|role="/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенды трёх состояний (Scope T4.8: пустой список / ошибка загрузки / 404)', () => {
  it('стенд ui-empty (showcase/pages/ui-empty/index.html): сценарии пустых состояний с CTA', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-empty', 'index.html'), 'utf8');
    expect(stand, 'корень паттерна на стенде').toContain('class="ui-empty"');
    expect(stand, 'заголовки состояния — h2 на стенде').toContain('ui-empty__title');
    expect(stand, 'CTA ui-button продемонстрирован').toContain('ui-button');
    expect(stand, 'CTA ui-link продемонстрирован').toContain('ui-link');
    expect(stand).not.toContain('data-ui-check-layout');
  });

  it('стенд ui-error (showcase/pages/ui-error/index.html): inline-вариант в секции с retry-действием', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-error', 'index.html'), 'utf8');
    expect(stand, 'inline-вариант').toContain('class="ui-error"');
    expect(stand, 'retry-кнопка продемонстрирована').toContain('Повторить');
    expect(stand, 'граница с ui-alert задокументирована на стенде').toContain('ui-alert');
    expect(stand).not.toContain('data-ui-check-layout');
  });

  it('стенд error-404 (showcase/pages/error-404/index.html): полностраничный 404 — h1 несёт сам паттерн', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'error-404', 'index.html'), 'utf8');
    expect(stand, 'полностраничный вариант').toContain('ui-error--page');
    expect(stand, 'h1 на странице — заголовок состояния').toMatch(/<h1[^>]*ui-error__title/);
    expect(stand, 'действие «На главную» продемонстрировано').toContain('ui-button--primary');
  });
});

describe('подключение и дока (DoD T4.8)', () => {
  it("'ui-empty' и 'ui-error' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-empty'[^\]]*\]/);
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-error'[^\]]*\]/);
  });

  it('стенд error-404 собирается сборщиком без служебного h1 каркаса (h1 несёт паттерн)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build, 'спец-стенд error-404 есть в generateShowcase').toContain('error-404');
    expect(
      build,
      'каркас стенда 404 без <h1>-префикса (в отличие от base/typography/layout)',
    ).not.toMatch(/<h1>error-404<\/h1>/);
  });

  it('README ui-empty: правила текстов и заголовков (нет вины, следующее действие, h2)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-empty', 'README.md'), 'utf8');
    for (const keyword of [
      'нет вины пользователя',
      'следующее действие',
      'h2',
      'ui-empty__media',
      'ui-empty__actions',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });

  it('README ui-error: варианты, retry-правила, h1, nav-минимум, граница с ui-alert', () => {
    const readme = readFileSync(join(root, 'components', 'ui-error', 'README.md'), 'utf8');
    for (const keyword of [
      'нет вины пользователя',
      'следующее действие',
      'Повторить',
      'h1',
      'ui-error--page',
      'крошки',
      'ui-alert',
      '500',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });
});
