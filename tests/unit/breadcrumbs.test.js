/**
 * Юнит-пин ui-breadcrumbs (задача T4.7; Testing requirements).
 *
 * Поверхность браузера — стенд (showcase/pages/ui-breadcrumbs — 3 уровня,
 * длинные названия/лента, уровень без ссылки), микроразметка/aria-current/
 * Tab/axe/эталоны — в tests/e2e/ui-breadcrumbs.spec.js; здесь — пины
 * исполняемой формы решения:
 *  - components/ui-breadcrumbs/ui-breadcrumbs.css: box-sizing на корнях
 *    (ADR-0002); мобильная лента как mobile-first база с ростом в
 *    min-width: 768 (шкала T2.5; инверсия desktop-first max-width:767
 *    career-portal); скрытый скроллбар с сохранённой функциональностью;
 *    разделитель — псевдоэлемент ::before соседнего li (--ui-color-divider,
 *    токен заведён под крошки в T2.2); hover — пара одобренного дизайна
 *    accent под (hover: hover) (ADR-0010, EPIC-4); типографика caption
 *    токенами (career-portal fs/fw-caption);
 *  - канонический паттерн ui-breadcrumbs.html: nav[aria-label] > ol > li,
 *    микроразметка BreadcrumbList/ListItem (position/name/item), текущая —
 *    span + aria-current="page", role="list" против Safari-потери семантики;
 *  - инварианты системы: без !important, без hex, без inline-стилей (VI §5);
 *  - стенд: три навигации с разведёнными aria-label (axe landmark-unique),
 *    без data-ui-check-layout (гейт масштабирования T3.6 не расширяется без
 *    записи в CHECK_STANDS);
 *  - 'ui-breadcrumbs' в COMPONENTS showcase/build.mjs — CSS в
 *    dist/ui-core.min.css;
 *  - bitrix/snippets/breadcrumbs.php согласован с README и паттерном
 *    (BreadcrumbList, aria-label, aria-current, экранирование htmlspecialchars);
 *  - README компонента: построение цепочки в шаблонах (вкл. «Главная → Раздел
 *    без ссылки → Текущая»), Rich Results, усечение как расширение.
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

describe('components/ui-breadcrumbs/ui-breadcrumbs.css — база (ADR-0002, перенос career-portal)', () => {
  const path = join(root, 'components', 'ui-breadcrumbs', 'ui-breadcrumbs.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define breadcrumbs — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define breadcrumbs */')).toBe(true);
  });

  it('.ui-breadcrumbs: box-sizing; типографика caption одобренного дизайна — токенами fs/fw', () => {
    const block = blockOf(css, '.ui-breadcrumbs');
    expect(block, 'правило .ui-breadcrumbs найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('font-size: var(--ui-fs-caption);');
    expect(block).toContain('font-weight: var(--ui-fw-caption);');
    expect(block).toContain('color: var(--ui-color-text-muted);');
  });

  it('.ui-breadcrumbs__list: box-sizing; flex-лента с gap-токеном; сброс UA-оформления ol', () => {
    const block = blockOf(css, '.ui-breadcrumbs__list');
    expect(block, 'правило .ui-breadcrumbs__list найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('gap: var(--ui-space-2);');
    expect(block).toContain('margin: 0;');
    expect(block).toContain('padding: 0;');
    expect(block).toContain('list-style: none;');
  });

  it('mobile-first лента: база — nowrap + overflow-x auto + hidden scrollbar (career-portal ≤767), рост — min-width: 768 (шкала T2.5)', () => {
    const base = blockOf(css, '.ui-breadcrumbs__list');
    expect(base, 'база (мобильная): лента').toContain('flex-wrap: nowrap;');
    expect(base, 'база (мобильная): скролл').toContain('overflow-x: auto;');
    expect(base, 'база (мобильная): переноса нет — white-space nowrap').toContain(
      'white-space: nowrap;',
    );
    expect(base, 'скроллбар скрыт, функциональность ленты сохранена').toContain(
      'scrollbar-width: none;',
    );

    const media = css.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\}\s*\}/);
    expect(media, 'media-правило min-width: 768px (шкала брейкпоинтов)').toBeTruthy();
    const mdBlock = blockOf(media[0], '.ui-breadcrumbs__list');
    expect(mdBlock, 'md+: перенос цепочки').toContain('flex-wrap: wrap;');
    expect(mdBlock, 'md+: скролл не активен').toContain('overflow-x: visible;');
    expect(mdBlock, 'md+: перенос разрешает многострочные названия').toContain(
      'white-space: normal;',
    );
  });

  it('разделитель — псевдоэлемент ::before соседнего li (не в тексте ссылок), цвет — --ui-color-divider', () => {
    const block = blockOf(css, '.ui-breadcrumbs__item + .ui-breadcrumbs__item::before');
    expect(block, 'правило разделителя найдено').toBeTruthy();
    expect(block).toContain("content: '/';");
    expect(block).toContain('color: var(--ui-color-divider);');
  });

  it('.ui-breadcrumbs__link: box-sizing; явный muted-цвет (устойчив к legacy-стилям сайта), без подчёркивания (одобренный дизайн), transition — токен', () => {
    const block = blockOf(css, '.ui-breadcrumbs__link');
    expect(block, 'правило .ui-breadcrumbs__link найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('color: var(--ui-color-text-muted);');
    expect(block).toContain('text-decoration: none;');
    expect(block).toContain('transition: color var(--ui-transition);');
  });

  it('hover — пара одобренного дизайна (--ui-color-accent, ADR-0010) только под (hover: hover)', () => {
    const media = css.match(/@media \(hover: hover\)\s*\{[\s\S]*?\n\}/);
    expect(media, 'hover-правило под hover-гвардом (EPIC-4: sticky-hover)').toBeTruthy();
    const hoverBlock = blockOf(media[0], '.ui-breadcrumbs__link:hover');
    expect(hoverBlock).toBeTruthy();
    expect(hoverBlock).toContain('color: var(--ui-color-accent);');
    expect(
      css.replace(media[0], ''),
      'hover вне гварда не дублируется (sticky-hover на таче)',
    ).not.toContain('.ui-breadcrumbs__link:hover');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002); фиксированных высот нет', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонический паттерн (components/ui-breadcrumbs/ui-breadcrumbs.html)', () => {
  const path = join(root, 'components', 'ui-breadcrumbs', 'ui-breadcrumbs.html');
  const html = readFileSync(path, 'utf8');

  it('nav[aria-label] > ol[role="list"] > li — семантика упорядоченного списка (Scope)', () => {
    expect(html).toMatch(/<nav class="ui-breadcrumbs" aria-label="Хлебные крошки">/);
    expect(html).toMatch(
      /<ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https:\/\/schema\.org\/BreadcrumbList">/,
    );
    expect(html).toMatch(
      /<li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https:\/\/schema\.org\/ListItem">/,
    );
  });

  it('микроразметка ListItem: itemprop="item" на a, name в span, position в meta (паттерн Google)', () => {
    expect(html).toMatch(/<a class="ui-breadcrumbs__link" itemprop="item" href="[^"]+"/);
    expect(html).toContain('<span itemprop="name">');
    expect(html).toMatch(/<meta itemprop="position" content="[12]">/);
  });

  it('текущая страница — span + aria-current="page" (не ссылка), position последнего уровня', () => {
    expect(html).toMatch(
      /<span class="ui-breadcrumbs__current" itemprop="name" aria-current="page">/,
    );
    expect(html).toMatch(/<meta itemprop="position" content="3">/);
    expect(html, 'текущая без href (не ссылка)').not.toMatch(
      /aria-current="page"[^>]*href|href[^>]*aria-current="page"/,
    );
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-breadcrumbs/index.html)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-breadcrumbs', 'index.html'), 'utf8');

  it('стенд содержит три навигации-сценария: базовая 3 уровня, длинные названия, уровень без ссылки (AC)', () => {
    for (const id of ['ui-breadcrumbs-basic', 'ui-breadcrumbs-long', 'ui-breadcrumbs-unlinked']) {
      expect(stand, id).toContain(`id="${id}"`);
    }
  });

  it('aria-label с конвенционным именем «Хлебные крошки»; лендмарки стенда разведены (axe landmark-unique)', () => {
    const labels = [...stand.matchAll(/aria-label="(Хлебные крошки[^"]*)"/g)].map((m) => m[1]);
    expect(labels.length, 'три навигации с конвенционной основой имени').toBe(3);
    expect(new Set(labels).size, 'имена уникальны — лендмарки различимы').toBe(labels.length);
    for (const label of labels) {
      expect(label.startsWith('Хлебные крошки'), `конвенция имени: ${label}`).toBe(true);
    }
  });

  it('aria-current="page" в разметке стенда; микроразметка BreadcrumbList присутствует', () => {
    expect(stand).toContain('aria-current="page"');
    expect(stand).toContain('https://schema.org/BreadcrumbList');
    expect(stand).toContain('https://schema.org/ListItem');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(stand).not.toContain('data-ui-check-layout');
  });
});

describe('PHP-сниппет (bitrix/snippets/breadcrumbs.php) согласован с компонентом (AC)', () => {
  const path = join(root, 'bitrix', 'snippets', 'breadcrumbs.php');
  const snippet = readFileSync(path, 'utf8');

  it('файл существует; микроразметка и a11y-семантика совпадают с паттерном', () => {
    expect(existsSync(path), 'сниппет на месте').toBe(true);
    expect(snippet).toContain('https://schema.org/BreadcrumbList');
    expect(snippet).toContain('https://schema.org/ListItem');
    expect(snippet).toContain('aria-label="Хлебные крошки"');
    expect(snippet).toContain('aria-current="page"');
    expect(snippet).toContain('ui-breadcrumbs__');
    expect(snippet).toContain('itemprop="position"');
    expect(snippet).toContain('itemprop="name"');
    expect(snippet).toContain('itemprop="item"');
  });

  it('безопасность вывода: пользовательские данные экранируются (htmlspecialchars)', () => {
    expect(snippet).toContain('htmlspecialchars');
  });

  it('генерация из массива $arResult (bitrix:menu / цепочка навигации) — для интеграторов, без зависимостей', () => {
    expect(snippet).toContain('$arResult');
  });

  it('сниппет внесён в список bitrix/snippets/README.md', () => {
    const readme = readFileSync(join(root, 'bitrix', 'snippets', 'README.md'), 'utf8');
    expect(readme).toContain('breadcrumbs.php');
  });
});

describe('подключение и дока (DoD T4.7)', () => {
  it("'ui-breadcrumbs' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-breadcrumbs'[^\]]*\]/);
  });

  it('README ui-breadcrumbs: построение цепочки в шаблонах (вкл. уровень без ссылки), Rich Results, усечение как расширение', () => {
    const readme = readFileSync(join(root, 'components', 'ui-breadcrumbs', 'README.md'), 'utf8');
    for (const keyword of [
      'BreadcrumbList',
      'aria-current="page"',
      'Rich Results',
      'Раздел без ссылки',
      'bitrix:breadcrumb',
      'усечение',
      'position',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });
});
