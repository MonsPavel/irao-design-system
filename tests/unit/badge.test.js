/**
 * Юнит-пин ui-badge (задача T4.3; Testing requirements).
 *
 * Поверхность браузера — счётчик на стенде ui-tag (круг, переполнение 99+,
 * правило при 0, accessible name в ссылке) — в tests/e2e/ui-tag.spec.js;
 * здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: --ui-badge-size — новый (в career-portal бейджа
 *    нет); ступень шкалы §3.2;
 *  - components/ui-badge/ui-badge.css: box-sizing на корне (ADR-0002); круг
 *    для одной цифры и pill для «99+» — min-width/min-height + паддинг +
 *    radius-pill; пара primary/text-on-dark (та же, что у .tag--navy);
 *    тройка micro + fw-caption (кегль тегов одобренного дизайна);
 *  - правило при 0 (Implementation requirements п.2, AC «правило badge-при-0
 *    задокументировано»): бейдж при 0 не выводится — атрибут hidden; скрытие
 *    исполняет глобальная гарантия base/reset.css ([hidden] сильнее любых
 *    display-правил, T3.1) — компонент не дублирует её и не может её сломать
 *    (правило с !important);
 *  - правило дублирования (Implementation requirements п.2): aria-hidden="true"
 *    когда значение продублировано текстом рядом; иначе — текст в имени
 *    контрола (правило в доке — README.md компонента);
 *  - инварианты системы: без !important, без hex, без фиксированных высот;
 *  - 'ui-badge' в COMPONENTS — CSS попадает в dist/ui-core.min.css.
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

describe('tokens/semantic.css — бейдж-токены (Implementation requirements T4.3 п.1/п.3)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('размер круга — токен 1.5rem (новый: в career-portal бейджа нет; ступень шкалы §3.2 — 24px)', () => {
    expect(source).toMatch(/--ui-badge-size:\s*1\.5rem;/);
  });
});

describe('components/ui-badge/ui-badge.css — база (ADR-0002, круг и переполнение)', () => {
  const path = join(root, 'components', 'ui-badge', 'ui-badge.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define badge — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define badge */')).toBe(true);
  });

  it('.ui-badge: box-sizing на корне; круг из min-width/min-height токена, центр флексом', () => {
    const block = blockOf(css, '.ui-badge');
    expect(block, 'правило .ui-badge найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: center;');
    expect(block).toContain('min-width: var(--ui-badge-size);');
    expect(block).toContain('min-height: var(--ui-badge-size);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
  });

  it('переполнение «99+»: горизонтальный паддинг из шкалы расширяет pill (мин-ширина не режет контент)', () => {
    const block = blockOf(css, '.ui-badge');
    expect(block).toContain('padding: 0 var(--ui-space-1);');
  });

  it('пара primary/text-on-dark (та же, что у .tag--navy и тёмных секций); тройка micro + fw-caption', () => {
    const block = blockOf(css, '.ui-badge');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    expect(block).toContain('font-size: var(--ui-fs-micro);');
    expect(block).toContain('font-weight: var(--ui-fw-caption);');
    expect(block).toContain('line-height: var(--ui-lh-micro);');
  });

  it('инварианты системы: без !important и hex; фиксированных (px/rem) высот нет', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });

  it('компонент не переопределяет [hidden] — скрытие исполняет глобальная гарантия base/reset.css (T3.1)', () => {
    expect(css, 'у компонента нет собственного [hidden]-правила').not.toContain('[hidden]');
    const reset = readFileSync(join(root, 'base', 'reset.css'), 'utf8');
    expect(reset).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none/);
  });
});

describe('канонический паттерн (components/ui-badge/ui-badge.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-badge', 'ui-badge.html'), 'utf8');

  it('в паттерне есть бейдж; продублированное значение — aria-hidden (Implementation requirements п.2)', () => {
    expect(html).toMatch(/class="ui-badge"/);
    const ariaHidden = [...html.matchAll(/<span[^>]*class="[^"]*ui-badge[^"]*"[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(
      ariaHidden.some((tag) => tag.includes('aria-hidden="true"')),
      'пример с aria-hidden="true" в паттерне есть',
    ).toBe(true);
  });

  it('aria-hidden-пример паттерна продублирован текстом рядом: значение бейджа есть в тексте ссылки вне бейджа (ревью T4.3 high)', () => {
    // aria-hidden скрывает число от скринридера: без дублирующего текста рядом
    // («Уведомления, 3 новых») счёт не озвучивается вовсе — анти-паттерн,
    // который канонический паттерн показывать не имеет права.
    const paragraphs = [...html.matchAll(/<p>[\s\S]*?<\/p>/g)].map(([block]) => block);
    const withAriaHiddenBadge = paragraphs.filter((block) =>
      /<span[^>]*ui-badge[^>]*aria-hidden="true"|<span[^>]*aria-hidden="true"[^>]*ui-badge/.test(
        block,
      ),
    );
    expect(withAriaHiddenBadge.length, 'aria-hidden-пример в паттерне есть').toBeGreaterThan(0);
    for (const block of withAriaHiddenBadge) {
      const value = block.match(/aria-hidden="true"[^>]*>([^<]+)<\/span>/)[1].trim();
      const textOutsideBadges = block.replace(/<span[^>]*>[\s\S]*?<\/span>/g, ' ');
      expect(textOutsideBadges, `текст рядом содержит значение «${value}»`).toContain(value);
    }
  });

  it('правило при 0 показано в паттерне атрибутом hidden', () => {
    expect(html).toMatch(/<span[^>]*class="[^"]*ui-badge[^"]*"[^>]*hidden[^>]*>/);
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html, 'inline-стили в паттерне запрещены').not.toMatch(/<span[^>]*style=/);
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-badge' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-badge'[^\]]*\]/);
  });

  it('README: правило badge-при-0 и правило дублирования значения задокументированы (AC)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-badge', 'README.md'), 'utf8');
    expect(readme).toMatch(/при 0/i);
    expect(readme).toContain('hidden');
    expect(readme).toContain('99+');
    expect(readme).toMatch(/aria-hidden/);
    expect(readme).toMatch(/имя/i);
  });
});
