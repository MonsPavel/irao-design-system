/**
 * Юнит-пин типографики (задача T3.3; Testing requirements).
 *
 * Поверхность браузера — computed-размеры ролей, иерархия заголовков на всех
 * страницах showcase, 32px-сценарий, эталоны — в tests/e2e/typography.spec.js;
 * здесь — пины исполняемой формы решения:
 *  - base/typography.css: класс роли задаёт fs/lh/fw/letter-spacing ЦЕЛИКОМ
 *    из тройки токенов T2.2 (Implementation requirements T3.3 п.1);
 *    body-дефолты страницы (font/color/bg) — из токенов; ui-text--muted;
 *    списки ui-list (маркеры/отступы); ui-address-минимум;
 *  - «классы, а не теги» (Technical considerations): теги h1–h6/p файлом не
 *    стилизуются — класс против legacy `h1 { … }`; text-wrap: pretty/balance
 *    не используется (нет в матрице браузеров); без @media — mobile-first
 *    лестница живёт в токенах (T2.2);
 *  - html-validate-гейт иерархии: irao/heading-order в .htmlvalidate.js
 *    (один h1 уже был — irao/one-h1; пропуск уровня h2→h4 — ошибка) +
 *    негативная фикстура в реестре test:lint;
 *  - стенд типографики: все роли × ui-list × ui-address + длинные RU-слова;
 *    build.mjs генерирует stands/typography.html;
 *  - дока «Роли типографики» (Definition of Done: роли и когда какую
 *    использовать).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/**
 * Роль → суффикс тройки токенов (tokens/semantic.css, T2.2) и letter-spacing
 * класса: заголовки — −0.02em (перенос макета career-portal: page-title,
 * section__title), текстовые роли — normal.
 */
const ROLES = [
  ['ui-h1', 'h1', '-0.02em'],
  ['ui-h2', 'h2', '-0.02em'],
  ['ui-h3', 'h3', '-0.02em'],
  ['ui-h4', 'h4', '-0.02em'],
  ['ui-h5', 'h5', '-0.02em'],
  ['ui-h6', 'h6', '-0.02em'],
  ['ui-lead', 'lead', 'normal'],
  ['ui-body', 'body', 'normal'],
  ['ui-small', 'small', 'normal'],
  ['ui-caption', 'caption', 'normal'],
  ['ui-micro', 'micro', 'normal'],
];

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('base/typography.css — классы ролей (Scope T3.3)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'typography.css'), 'utf8'));

  it('файл существует (входит в ui-core — сборка не предупреждает о пропуске)', () => {
    expect(existsSync(join(root, 'base', 'typography.css'))).toBe(true);
  });

  it.each(ROLES)(
    '%s — fs/lh/fw/letter-spacing целиком из тройки токенов T2.2 (Implementation requirements п.1)',
    (cls, role, ls) => {
      const block = blockOf(css, `.${cls}`);
      expect(block, `правило .${cls} найдено`).toBeTruthy();
      expect(block).toContain(`font-size: var(--ui-fs-${role});`);
      expect(block).toContain(`line-height: var(--ui-lh-${role});`);
      expect(block).toContain(`font-weight: var(--ui-fw-${role});`);
      expect(block).toContain(`letter-spacing: ${ls};`);
    },
  );

  it('классы, а не теги: h1–h6/p тегами не стилизуются (защита от legacy `h1 { … }`)', () => {
    expect(css).not.toMatch(/(?:^|\n)h[1-6]\s*\{/);
    expect(css).not.toMatch(/(?:^|\n)p\s*\{/);
  });

  it('.ui-text--muted — цвет muted-токена слоя 2', () => {
    const block = blockOf(css, '.ui-text--muted');
    expect(block, 'правило .ui-text--muted найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-muted);');
  });

  it('text-wrap: pretty/balance не используется (Technical considerations T3.3)', () => {
    expect(css).not.toContain('text-wrap');
  });

  it('без @media: mobile-first лестница размеров живёт в токенах (T2.2), не в классах', () => {
    expect(css).not.toContain('@media');
  });
});

describe('base/typography.css — body-дефолты страницы (Scope T3.3)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'typography.css'), 'utf8'));
  const body = blockOf(css, 'body');

  it('body: шрифт/размер/веса/цвет/фон — из токенов слоя 2 (порт career-portal css/base.css:60)', () => {
    expect(body, 'правило body найдено').toBeTruthy();
    expect(body).toContain('font-family: var(--ui-font-family);');
    expect(body).toContain('font-size: var(--ui-fs-body);');
    expect(body).toContain('line-height: var(--ui-lh-body);');
    expect(body).toContain('font-weight: var(--ui-fw-body);');
    expect(body).toContain('color: var(--ui-color-text);');
    expect(body).toContain('background-color: var(--ui-color-surface);');
  });

  it('переносы длинных RU-слов не рвут макет: overflow-wrap на body (AC 32px-сценария)', () => {
    expect(body).toContain('overflow-wrap: break-word;');
  });
});

describe('base/typography.css — списки и адрес (Scope T3.3)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'typography.css'), 'utf8'));

  it('.ui-list — маркеры disc/decimal, отступы из шкалы spacing, ритм пунктов', () => {
    expect(blockOf(css, '.ui-list')).toContain('padding-left: var(--ui-space-5);');
    expect(blockOf(css, '.ui-list li + li')).toContain('margin-top: var(--ui-space-2);');
    expect(blockOf(css, 'ul.ui-list')).toContain('list-style: disc;');
    expect(blockOf(css, 'ol.ui-list')).toContain('list-style: decimal;');
  });

  it('.ui-address-минимум: без браузерного курсива', () => {
    const block = blockOf(css, '.ui-address');
    expect(block, 'правило .ui-address найдено').toBeTruthy();
    expect(block).toContain('font-style: normal;');
  });

  it('никаких !important (инвариант системы: только a11y/vi.css) и никакого hex', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('html-validate: иерархия заголовков (Implementation requirements T3.3 п.2)', () => {
  const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');

  it('кастомное правило irao/heading-order зарегистрировано и включено как error', () => {
    expect(config).toContain("'irao/heading-order'");
    expect(config).toMatch(/['"]irao\/heading-order['"]\s*:\s*'error'/);
  });

  it('негативная фикстура «пропуск уровня» есть и стоит в реестре test:lint', () => {
    expect(existsSync(join(root, 'tests', 'lint-cases', 'html', 'heading-skip.html'))).toBe(true);
    const cases = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(cases).toContain("file: 'html/heading-skip.html'");
    expect(cases).toContain("'irao/heading-order'");
  });
});

describe('стенд типографики (Implementation requirements T3.3 п.3)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'typography', 'index.html'), 'utf8');

  it('все 11 ролей и ui-text--muted представлены образцами', () => {
    for (const [cls] of ROLES) {
      expect(stand).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`));
    }
    expect(stand).toMatch(/class="[^"]*\bui-text--muted\b[^"]*"/);
  });

  it('у каждой роли показаны значения токенов (--ui-fs-*)', () => {
    for (const [, role] of ROLES) {
      expect(stand).toContain(`--ui-fs-${role}`);
    }
  });

  it('списки ul/ol.ui-list и ui-address на стенде', () => {
    expect(stand).toMatch(/<ul[^>]*class="[^"]*\bui-list\b[^"]*"/);
    expect(stand).toMatch(/<ol[^>]*class="[^"]*\bui-list\b[^"]*"/);
    expect(stand).toMatch(/<address[^>]*class="[^"]*\bui-address\b[^"]*"/);
  });

  it('длинные RU-слова — образец переноса (AC: переносы не рвут макет)', () => {
    expect(stand).toMatch(/сельскохозяйственный/i);
  });
});

describe('сборка: стенд typography в полигоне showcase', () => {
  const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');

  it('build.mjs генерирует stands/typography.html из showcase/pages/typography/index.html', () => {
    expect(build).toContain("'typography'");
    expect(build).toMatch(/stands['",\s]+['"]typography\.html/);
  });
});

describe('дока «Роли типографики» (Definition of Done T3.3)', () => {
  const doc = readFileSync(
    join(root, 'docs', 'ui-system', 'architecture', 'typography-roles.md'),
    'utf8',
  );

  it('существует; перечисляет все роли и модификатор muted', () => {
    for (const [cls] of ROLES) {
      expect(doc).toContain(cls);
    }
    expect(doc).toContain('ui-text--muted');
  });

  it('записана в реестр деливераблов architecture/README.md', () => {
    const registry = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'README.md'),
      'utf8',
    );
    expect(registry).toContain('typography-roles.md');
  });
});

describe('e2e-сценарии записаны (Testing requirements T3.3)', () => {
  const spec = readFileSync(join(root, 'tests', 'e2e', 'typography.spec.js'), 'utf8');

  it('tests/e2e/typography.spec.js проверяет computed-размеры и 32px-сценарий', () => {
    expect(spec).toContain('getPropertyValue');
    expect(spec).toContain("fontSize = '32px'");
  });
});
