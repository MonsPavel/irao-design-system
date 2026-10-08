/**
 * Юнит-пин ui-pagination (задача T6.3; Testing requirements).
 *
 * Поверхность браузера — стенд (showcase/pages/ui-pagination: полный/короткий/
 * краевые варианты), семантика aria-current, Tab-порядок, недоступные стрелки,
 * touch-цели, axe/эталоны — в tests/e2e/ui-pagination.spec.js; здесь — пины
 * исполняемой формы решения:
 *  - components/ui-pagination/ui-pagination.css: box-sizing на корнях
 *    (ADR-0002); touch-цели 44px токеном --ui-pagination-size (2.75rem,
 *    career-portal components.css:240/261, перенос «как есть»; 44px вне шкалы
 *    отступов §3.2 — прецедент --ui-card-gap); текущая — семантика
 *    :where([aria-current='page']) без вклада в специфичность (прецедент
 *    aria-selected ui-tabs T6.2 и aria-current ui-dropdown T6.1, взамен
 *    is-active career-portal); hover — пара одобренного дизайна
 *    --ui-color-surface-hover (.pagination__page:hover components.css:250)
 *    под (hover: hover) (ADR-0010, EPIC-4), у текущей hover-поверхность не
 *    меняется (одобренный дизайн: is-active сильнее hover по порядку каскада);
 *    disabled — :disabled + --ui-opacity-disabled (career-portal
 *    components.css:269) и pointer-events: none, правило ПОСЛЕ hover;
 *    типографика small токенами (career-portal fs-small-regular/fw-small);
 *    flex-wrap: wrap в мобильной базе — перенос длинного списка страниц на
 *    узких экранах (в career-portal кейса «много страниц» не было);
 *  - канонический паттерн ui-pagination.html: nav[aria-label="Пагинация"]
 *    (Technical considerations), текущая — span + aria-current="page"
 *    (Implementation requirements п.2), доступные имена стрелок
 *    («Предыдущая страница»/«Следующая страница» — Technical considerations),
 *    имена страниц «Страница N» (WCAG 2.4.4: голая цифра — слабое имя),
 *    декоративный глиф стрелки и «…» — aria-hidden; недоступная стрелка —
 *    button[disabled] (решение по нативной семантике, Open Questions задачи
 *    закрыты в README; career-portal `<a disabled>` — невалиден);
 *  - без JS-модуля (пагинация — ссылки, работает без JS по построению):
 *    data-ui-* в разметке нет;
 *  - инварианты системы: без !important, без hex, без inline-стилей (VI §5);
 *  - стенд: четыре навигации-сценария с разведёнными aria-label
 *    (axe landmark-unique), без data-ui-check-layout (гейт масштабирования
 *    T3.6 не расширяется без записи в CHECK_STANDS);
 *  - 'ui-pagination' в COMPONENTS showcase/build.mjs — CSS в
 *    dist/ui-core.min.css;
 *  - bitrix/snippets/pagination.php согласован с README и паттерном
 *    (окно страниц с «…», aria-current, button[disabled], экранирование);
 *  - README компонента: решение по недоступным стрелкам зафиксировано.
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

describe('components/ui-pagination/ui-pagination.css — база (ADR-0002, перенос career-portal)', () => {
  const path = join(root, 'components', 'ui-pagination', 'ui-pagination.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define pagination — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define pagination */')).toBe(true);
  });

  it('.ui-pagination: box-sizing; flex-лента с gap 8px (career-portal components.css:233) и переносом строк в базе (мобильный кейс «много страниц»)', () => {
    const block = blockOf(css, '.ui-pagination');
    expect(block, 'правило .ui-pagination найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('gap: var(--ui-space-2);');
    expect(block).toContain('flex-wrap: wrap;');
  });

  it('.ui-pagination__page: box-sizing; touch-цель 44px токеном --ui-pagination-size (min-геометрия — рост с 32px-базой T3.6); типографика small; радиус sm', () => {
    const block = blockOf(css, '.ui-pagination__page');
    expect(block, 'правило .ui-pagination__page найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('min-width: var(--ui-pagination-size);');
    expect(block).toContain('min-height: var(--ui-pagination-size);');
    expect(block).toContain('padding: 0 var(--ui-space-3);');
    expect(block).toContain('border-radius: var(--ui-radius-sm);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('font-weight: var(--ui-fw-small);');
    expect(block).toContain('color: var(--ui-color-text);');
    expect(block).toContain('text-decoration: none;');
    // Переход — токен (career-portal: background + color, components.css:247);
    // формат prettier — построчный, проверяем по частям значения.
    expect(block).toContain('background-color var(--ui-transition),');
    expect(block).toContain('color var(--ui-transition);');
  });

  it("текущая страница — семантика :where([aria-current='page']) без вклада в специфичность: заливка primary + text-on-dark (career-portal components.css:252, взамен is-active)", () => {
    const block = blockOf(css, ".ui-pagination__page:where([aria-current='page'])");
    expect(block, 'правило текущей страницы найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    // is-active career-portal не переносится: семантика aria-current —
    // единственный источник правды (прецедент aria-selected ui-tabs T6.2).
    expect(css, 'класс is-active не заводится').not.toContain('is-active');
  });

  it('.ui-pagination__arrow: box-sizing; 44×44 touch-цель; единая коробка a/button (сброс нативной кнопки)', () => {
    const block = blockOf(css, '.ui-pagination__arrow');
    expect(block, 'правило .ui-pagination__arrow найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('min-width: var(--ui-pagination-size);');
    expect(block).toContain('min-height: var(--ui-pagination-size);');
    expect(block).toContain('padding: 0;');
    expect(block).toContain('border: 0;');
    expect(block).toContain('background-color: transparent;');
    expect(block).toContain('border-radius: var(--ui-radius-sm);');
    expect(block).toContain('color: var(--ui-color-text);');
  });

  it('hover — пара одобренного дизайна (--ui-color-surface-hover, components.css:250/268) только под (hover: hover); текущая и disabled hover-поверхность не меняют', () => {
    const media = css.match(/@media \(hover: hover\)\s*\{[\s\S]*?\n\}/);
    expect(media, 'hover-правила под hover-гвардом (EPIC-4: sticky-hover)').toBeTruthy();
    const pageHover = blockOf(media[0], ".ui-pagination__page:not([aria-current='page']):hover");
    expect(
      pageHover,
      'hover страницы исключает текущую (одобренный визуал: is-active не мигает blue-100)',
    ).toBeTruthy();
    expect(pageHover).toContain('background-color: var(--ui-color-surface-hover);');
    const arrowHover = blockOf(media[0], '.ui-pagination__arrow:hover');
    expect(arrowHover, 'hover стрелки найден').toBeTruthy();
    expect(arrowHover).toContain('background-color: var(--ui-color-surface-hover);');
    expect(
      css.replace(media[0], ''),
      'hover вне гварда не дублируется (sticky-hover на таче)',
    ).not.toContain('.ui-pagination__page:hover');
    expect(css.replace(media[0], '')).not.toContain('.ui-pagination__arrow:hover');
  });

  it('disabled стрелки — :disabled + токен --ui-opacity-disabled (career-portal components.css:269) + pointer-events: none; правило ПОСЛЕ hover (порядок каскада)', () => {
    const block = blockOf(css, '.ui-pagination__arrow:disabled');
    expect(block, 'правило :disabled найдено').toBeTruthy();
    expect(block).toContain('opacity: var(--ui-opacity-disabled);');
    expect(block).toContain('pointer-events: none;');
    const disabledAt = css.indexOf('.ui-pagination__arrow:disabled');
    const hoverAt = css.indexOf('@media (hover: hover)');
    expect(
      disabledAt,
      'disabled-правило после hover-блока (T4.2: порядок каскада)',
    ).toBeGreaterThan(hoverAt);
  });

  it('.ui-pagination__ellipsis: box-sizing (новый элемент — в career-portal «…» не было)', () => {
    const block = blockOf(css, '.ui-pagination__ellipsis');
    expect(block, 'правило .ui-pagination__ellipsis найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002); фиксированных высот нет', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонический паттерн (components/ui-pagination/ui-pagination.html)', () => {
  const path = join(root, 'components', 'ui-pagination', 'ui-pagination.html');
  const html = readFileSync(path, 'utf8');

  /** Открывающий тег целиком (пины атрибутов устойчивы к переносам prettier). */
  const tagOf = (source, tag) => {
    const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 's'));
    return match ? match[0] : '';
  };

  it('nav[aria-label="Пагинация"] — лендмарка с конвенционным именем (Technical considerations)', () => {
    const navTag = tagOf(html, 'nav');
    expect(navTag).toContain('class="ui-pagination"');
    expect(navTag).toContain('aria-label="Пагинация"');
  });

  it('текущая страница — span + aria-current="page" (не ссылка, Implementation requirements п.2)', () => {
    const currentTag =
      html.match(/<span[^>]*ui-pagination__page[^>]*aria-current="page"[^>]*>/s)?.[0] ?? '';
    expect(currentTag, 'текущая — span с aria-current="page"').toBeTruthy();
    expect(html, 'aria-current не на ссылках (текущая без href)').not.toMatch(
      /<a[^>]*aria-current/,
    );
  });

  it('стрелки-ссылки с доступными именами (Technical considerations): «Предыдущая/Следующая страница», глиф — svg aria-hidden', () => {
    const arrowLink = html.match(/<a[^>]*ui-pagination__arrow[^>]*>/s)?.[0] ?? '';
    expect(arrowLink, 'доступная стрелка — ссылка с именем').toContain(
      'aria-label="Следующая страница"',
    );
    expect(html).toContain('aria-label="Предыдущая страница"');
    expect(html, 'глиф стрелки декоративен').toContain('<svg aria-hidden="true"');
  });

  it('страницы-ссылки с именами «Страница N» (WCAG 2.4.4: голая цифра — слабое имя)', () => {
    expect(html).toContain('aria-label="Страница 2"');
    expect(html).toMatch(/aria-label="Страница \d+"/);
  });

  it('недоступная стрелка — button[disabled] (решение зафиксировано в README; career-portal <a disabled> невалиден)', () => {
    const disabledTag = html.match(/<button[^>]*ui-pagination__arrow[^>]*>/s)?.[0] ?? '';
    expect(disabledTag, 'недоступная стрелка — button').toBeTruthy();
    expect(disabledTag).toContain('disabled');
    expect(disabledTag).toContain('type="button"');
    expect(disabledTag).toContain('aria-label="Предыдущая страница"');
  });

  it('«…» — span aria-hidden (декоративный указатель пропуска)', () => {
    const ellipsisTag = html.match(/<span[^>]*ui-pagination__ellipsis[^>]*>/s)?.[0] ?? '';
    expect(ellipsisTag).toContain('class="ui-pagination__ellipsis"');
    expect(ellipsisTag).toContain('aria-hidden="true"');
    expect(html).toContain('…');
  });

  it('JS-модуля у компонента нет: data-ui-* хуков в разметке нет (пагинация работает без JS по построению)', () => {
    // Проверяем РАЗМЕТКУ, а не прозу комментариев (в шапке паттерна
    // «data-ui-*» упоминается словами).
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    expect(markup).not.toContain('data-ui-');
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-pagination/index.html)', () => {
  const stand = readFileSync(
    join(root, 'showcase', 'pages', 'ui-pagination', 'index.html'),
    'utf8',
  );

  it('стенд содержит четыре навигации-сценария: полный, короткий, первая страница, последняя страница (AC)', () => {
    for (const id of ['uipag-full', 'uipag-short', 'uipag-first', 'uipag-last']) {
      expect(stand, id).toContain(`id="${id}"`);
    }
  });

  it('aria-label с конвенционным именем «Пагинация»; лендмарки стенда разведены (axe landmark-unique)', () => {
    const labels = [...stand.matchAll(/aria-label="(Пагинация[^"]*)"/g)].map((m) => m[1]);
    expect(labels.length, 'четыре навигации с конвенционной основой имени').toBe(4);
    expect(new Set(labels).size, 'имена уникальны — лендмарки различимы').toBe(labels.length);
    for (const label of labels) {
      expect(label.startsWith('Пагинация'), `конвенция имени: ${label}`).toBe(true);
    }
  });

  it('краевые сценарии: у первой disabled-стрелка назад, у последней — вперёд; aria-current в разметке', () => {
    expect(stand).toContain('aria-current="page"');
    expect(
      (stand.match(/<button[^>]*disabled[^>]*>/g) ?? []).length,
      'две недоступные стрелки (первая/последняя)',
    ).toBe(2);
    expect(stand).toContain('aria-hidden="true"');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(stand).not.toContain('data-ui-check-layout');
  });
});

describe('токен и подключение (DoD T6.3)', () => {
  it('токен touch-цели в слое 2: --ui-pagination-size: 2.75rem (44px, career-portal components.css:240/261)', () => {
    const semantic = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');
    expect(semantic).toContain('--ui-pagination-size: 2.75rem;');
    expect(semantic).toMatch(/career-portal: components\.css:240\/261[\s\S]*--ui-pagination-size/);
  });

  it("'ui-pagination' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-pagination'[^\]]*\]/);
  });
});

describe('PHP-сниппет (bitrix/snippets/pagination.php) согласован с компонентом (AC)', () => {
  const path = join(root, 'bitrix', 'snippets', 'pagination.php');
  const snippet = existsSync(path) ? readFileSync(path, 'utf8') : '';

  it('файл существует; разметка и a11y-семантика совпадают с паттерном', () => {
    expect(existsSync(path), 'сниппет на месте').toBe(true);
    expect(snippet).toContain('ui-pagination');
    expect(snippet).toContain('aria-current="page"');
    expect(snippet).toContain('aria-label');
    expect(snippet).toContain('Предыдущая страница');
    expect(snippet).toContain('Следующая страница');
    expect(snippet).toContain('Страница ');
    expect(snippet).toContain('ui-pagination__page');
    expect(snippet).toContain('ui-pagination__arrow');
    expect(snippet).toContain('ui-pagination__ellipsis');
    expect(snippet).toContain('aria-hidden="true"');
    expect(snippet).toContain('disabled');
  });

  it('окно страниц с «…»: расчёт пропусков присутствует (первая/последняя всегда, окно у текущей, «…» при разрыве > 1)', () => {
    expect(snippet).toContain('renderUiPagination');
    expect(snippet).toMatch(/\$total\b/);
    expect(snippet).toMatch(/\$current\b/);
    expect(snippet).toMatch(/#PAGE#/);
    expect(snippet).toMatch(/aria-hidden="true">…</);
  });

  it('безопасность вывода: URL и label экранируются (htmlspecialchars)', () => {
    expect(snippet).toContain('htmlspecialchars');
  });

  it('сниппет внесён в список bitrix/snippets/README.md', () => {
    const readme = readFileSync(join(root, 'bitrix', 'snippets', 'README.md'), 'utf8');
    expect(readme).toContain('pagination.php');
  });
});

describe('дока (DoD T6.3)', () => {
  it('README ui-pagination: решение по недоступным стрелкам, aria-current, имена стрелок, touch-цель, Bitrix-сниппет', () => {
    const readme = readFileSync(join(root, 'components', 'ui-pagination', 'README.md'), 'utf8');
    for (const keyword of [
      'aria-current="page"',
      'button[disabled]',
      'Предыдущая страница',
      'Следующая страница',
      '44',
      'pagination.php',
      '«…»',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });
});
