/**
 * Юнит-пины ui-field (задача T5.1; Testing requirements).
 *
 * ui-field — основа всех контролов форм (P0, критический путь): обвязка
 * label/hint/error + input/textarea со всеми состояниями, доступными без JS.
 * Источник — .field* career-portal (components.css:130–187); исполняемая
 * форма решения:
 *  - components/ui-field/ui-field.css: box-sizing на корне и контроле
 *    (ADR-0002, Implementation requirements п.2); только токены слоя 2;
 *    без !important/hex (VI-инвариант §5); высота — min-height, не height
 *    (Implementation requirements п.1 — переживает 32px-сценарий T3.6;
 *    textarea без фикс. высоты); focus-паттерн поля (bg+border) — фирменный
 *    паттерн, дополняющий глобальный outline base/focus.css (ADR-0001),
 *    outline: none запрещён; без media-запросов и :hover (одобренным
 *    дизайном не заданы);
 *  - канонический паттерн ui-field.html: «ошибка — визуал и aria в одном
 *    паттерне» (Implementation requirements п.3) — копипаст даёт доступный
 *    результат: label for↔id, hint+error в aria-describedby, aria-invalid,
 *    required-маркер не только цветом (звёздочка aria-hidden + текст
 *    «обязательное поле» скринридеру, WCAG 1.4.1), role="alert" на ошибке
 *    (паттерн 02-architecture §6.3);
 *  - стенд: типы input × textarea × состояния; БЕЗ data-ui-check-layout
 *    (гейт T3.6 не расширяется без CHECK_STANDS — пин tests/unit/scaling.test.js);
 *  - подключение: 'ui-field' в COMPONENTS showcase/build.mjs; геометрические
 *    токены полей — в tokens/semantic.css с происхождением + строки в таблице
 *    диффов (tokens-career-portal-mapping.md);
 *  - дока README: placeholder ≠ label, autocomplete-рекомендации (WCAG 1.3.5),
 *    required-паттерн.
 * Поверхность браузера (связность, 32px, axe, эталоны) —
 * tests/e2e/ui-field.spec.js.
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

/** Тело правила, селектор которого стоит после закрытой скобки — не
 *  продолжение списка селекторов предыдущего правила (иначе
 *  «,\n.ui-field__textarea {» общего правила контролов ловится как
 *  отдельное правило textarea). */
const blockOfStandalone = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`\\}\\n\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Открывающий тег целиком (пины атрибутов устойчивы к переносам prettier). */
const tagOf = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 's'));
  return match ? match[0] : '';
};

describe('components/ui-field/ui-field.css — обвязка и контролы (T5.1)', () => {
  const path = join(root, 'components', 'ui-field', 'ui-field.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define field — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define field */')).toBe(true);
  });

  it('.ui-field: box-sizing (ADR-0002); колонка обвязки — шаг --ui-space-2 (career-portal gap 8px)', () => {
    const block = blockOf(css, '.ui-field');
    expect(block, 'правило .ui-field найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('gap: var(--ui-space-2);');
  });

  it('.ui-field--wide: во всю ширину grid-родителя (в grid; потребитель — ui-form-grid, T5.4)', () => {
    const block = blockOf(css, '.ui-field--wide');
    expect(block, 'правило .ui-field--wide найдено').toBeTruthy();
    expect(block).toContain('grid-column: 1 / -1;');
  });

  it('контролы: box-sizing (ADR-0002), min-height — НЕ height (32px-сценарий T3.6), фон surface-muted и прозрачная рамка одобренного .field', () => {
    const block = blockOf(css, '.ui-field__input,\n.ui-field__textarea');
    expect(block, 'общее правило контролов найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: 100%;');
    expect(block).toContain('min-height: var(--ui-field-height);');
    expect(block, 'фиксированной height нет — только min-height (Implementation requirements п.1)').not.toMatch(
      /(?:^|;)\s*height:\s/,
    );
    expect(block).toContain('padding: var(--ui-space-1) var(--ui-space-5);');
    expect(block).toContain('border: var(--ui-border-width) solid transparent;');
    expect(block).toContain('border-radius: var(--ui-radius-sm);');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('color: var(--ui-color-text);');
    expect(block).toContain('font-family: var(--ui-font-family);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('line-height: var(--ui-lh-small);');
    expect(block).toContain('transition:');
  });

  it('.ui-field__textarea: свой min-height (120px одобренного), resize: vertical, без фикс. высоты', () => {
    const block = blockOfStandalone(css, '.ui-field__textarea');
    expect(block, 'правило .ui-field__textarea найдено').toBeTruthy();
    expect(block).toContain('min-height: var(--ui-field-textarea-min-height);');
    expect(block).toContain('padding: var(--ui-field-textarea-padding-y) var(--ui-space-5);');
    expect(block).toContain('resize: vertical;');
    expect(block, 'textarea без фикс. высоты (Implementation requirements п.1)').not.toMatch(
      /(?:^|;)\s*(?:height|max-height):\s/,
    );
  });

  it('focus-visible — фирменный bg-swap + рамка primary (career-portal .field__input:focus), outline не запрещается (ADR-0001)', () => {
    const block = blockOf(css, '.ui-field__input:focus-visible,\n.ui-field__textarea:focus-visible');
    expect(block, 'правило фокуса найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-surface);');
    expect(block).toContain('border-color: var(--ui-color-primary);');
    expect(css, 'outline: none в компоненте нет — глобальная политика ADR-0001 не гасится').not.toMatch(
      /outline[^:]*:\s*(?:none|0)/,
    );
  });

  it('placeholder: приглушённый токен и плотный (opacity 1 — контраст-пара muted-on-surface-muted T2.3 предполагает непрозрачный цвет)', () => {
    const block = blockOf(
      css,
      '.ui-field__input::placeholder,\n.ui-field__textarea::placeholder',
    );
    expect(block, 'правило placeholder найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-muted);');
    expect(block).toContain('opacity: 1;');
  });

  it('.ui-field--error: рамка error + фон error-bg (одобренный .field--error); текст ошибки — fs-micro, error, скрыт вне --error', () => {
    const input = blockOf(css, '.ui-field--error .ui-field__input,\n.ui-field--error .ui-field__textarea');
    expect(input, 'правило ошибки контролов найдено').toBeTruthy();
    expect(input).toContain('border-color: var(--ui-color-error);');
    expect(input).toContain('background-color: var(--ui-color-error-bg);');

    const text = blockOf(css, '.ui-field__error');
    expect(text, 'правило текста ошибки найдено').toBeTruthy();
    expect(text).toContain('display: none;');
    expect(text).toContain('color: var(--ui-color-error);');
    expect(text).toContain('font-size: var(--ui-fs-micro);');

    const shown = blockOf(css, '.ui-field--error .ui-field__error');
    expect(shown, 'ошибка показывается в --error').toBeTruthy();
    expect(shown).toContain('display: block;');
  });

  it('.ui-field__hint: приглушённый micro-текст (элемент системы — в career-portal хинта нет)', () => {
    const block = blockOf(css, '.ui-field__hint');
    expect(block, 'правило hint найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-muted);');
    expect(block).toContain('font-size: var(--ui-fs-micro);');
  });

  it('состояния: disabled — затемнение --ui-opacity-disabled (прецедент ui-button); readonly — без правки значений, курсор default', () => {
    const disabled = blockOf(css, '.ui-field__input:disabled,\n.ui-field__textarea:disabled');
    expect(disabled, 'правило disabled найдено').toBeTruthy();
    expect(disabled).toContain('opacity: var(--ui-opacity-disabled);');

    const readonly = blockOf(css, '.ui-field__input:read-only,\n.ui-field__textarea:read-only');
    expect(readonly, 'правило readonly найдено').toBeTruthy();
    expect(readonly).toContain('cursor: default;');
  });

  it('required-маркер: __req — акцентный (career-portal .req); __req-text визуально скрыт без display:none (текст для скринридера)', () => {
    const req = blockOf(css, '.ui-field__req');
    expect(req, 'правило маркера найдено').toBeTruthy();
    expect(req).toContain('color: var(--ui-color-accent);');

    const reqText = blockOf(css, '.ui-field__req-text');
    expect(reqText, 'правило скрытого текста найдено').toBeTruthy();
    expect(reqText).toContain('position: absolute;');
    expect(reqText).toContain('clip-path: inset(50%);');
    expect(reqText, 'display:none убрал бы текст из a11y-дерева').not.toContain('display: none');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, §5); media и :hover отсутствуют (одобренным дизайном не заданы)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css, 'media-запросов нет — mobile-first база без изломов').not.toContain('@media');
    expect(css, 'собственных hover-правил нет (в career-portal их нет)').not.toContain(':hover');
  });

  it('компонент читает только слой 2: ни одной ссылки на примитивы слоя 1 (гейт ADR-0009, T2.2)', () => {
    const families = ['blue', 'gray', 'red', 'green', 'orange', 'slate', 'purple', 'peach', 'white', 'black'];
    const primitiveRef = new RegExp(`var\\(--ui-(?:${families.join('|')})-[0-9]`);
    expect(css, 'ссылки на примитивы запрещены вне tokens/').not.toMatch(primitiveRef);
  });
});

describe('tokens/semantic.css — геометрия полей (слой 2, T5.1)', () => {
  const semantic = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it.each([
    ['--ui-field-height', '3.25rem', 'components.css:148'],
    ['--ui-field-textarea-min-height', '7.5rem', 'components.css:161'],
    ['--ui-field-textarea-padding-y', '0.875rem', 'components.css:162'],
  ])('%s = %s перенесён «как есть» (px → rem, происхождение зафиксировано)', (token, value, origin) => {
    expect(semantic, `${token} объявлен`).toMatch(new RegExp(`${token.replace(/-/g, '\\-')}:\\s*${value.replace('.', '\\.')};`));
    expect(semantic, `у ${token} комментарий происхождения (гейт tokens-semantic)`).toContain(origin);
  });

  it('ui-field.css читает только эти токены (значения не дублируются в компоненте)', () => {
    const css = stripCssComments(readFileSync(join(root, 'components', 'ui-field', 'ui-field.css'), 'utf8'));
    for (const token of ['--ui-field-height', '--ui-field-textarea-min-height', '--ui-field-textarea-padding-y']) {
      expect(css, `${token} используется компонентом`).toContain(`var(${token})`);
    }
  });

  it('таблица диффов фиксирует перенос (tokens-career-portal-mapping.md)', () => {
    const mapping = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'tokens-career-portal-mapping.md'),
      'utf8',
    );
    for (const token of ['--ui-field-height', '--ui-field-textarea-min-height', '--ui-field-textarea-padding-y']) {
      expect(mapping, `${token} — строка в таблице диффов`).toContain(token);
    }
  });
});

describe('канонический паттерн ui-field (components/ui-field/ui-field.html)', () => {
  const path = join(root, 'components', 'ui-field', 'ui-field.html');
  const html = readFileSync(path, 'utf8');

  it('корень .ui-field с модификаторами --required и --error (полный доступный паттерн ошибки)', () => {
    const divTag = tagOf(html, 'div');
    expect(divTag).toContain('class="ui-field ui-field--required ui-field--error"');
  });

  it('label for ↔ id поля (связность, AC); required-маркер: звёздочка aria-hidden + текст «обязательное поле» скринридеру', () => {
    const labelTag = tagOf(html, 'label');
    expect(labelTag, 'label связан for-атрибутом').toMatch(/for="([^"]+)"/);

    const inputTag = tagOf(html, 'input');
    const inputId = inputTag.match(/id="([^"]+)"/)?.[1];
    const labelFor = labelTag.match(/for="([^"]+)"/)?.[1];
    expect(labelFor, 'for указывает на id поля').toBe(inputId);

    expect(html).toContain('class="ui-field__req"');
    expect(html, 'видимая звёздочка декоративна (смысл — текстом)').toMatch(
      /ui-field__req"[^>]*>\s*<span aria-hidden="true">\*<\/span>/,
    );
    const reqText = html.match(/ui-field__req-text">([^<]+)</)?.[1];
    expect(reqText, 'текст маркера для скринридера').toBe('обязательное поле');
  });

  it('ошибка — визуал и aria в одном паттерне: aria-invalid, aria-describedby (hint+error), role="alert", id ошибки', () => {
    const inputTag = tagOf(html, 'input');
    expect(inputTag, 'aria-invalid="true" при ошибке').toContain('aria-invalid="true"');

    const describedby = inputTag.match(/aria-describedby="([^"]+)"/)?.[1] ?? '';
    const hintId = html.match(/class="ui-field__hint"[^>]*id="([^"]+)"/)?.[1]
      ?? html.match(/id="([^"]+)"[^>]*class="ui-field__hint"/)?.[1];
    const errorId = html.match(/class="ui-field__error"[^>]*id="([^"]+)"/)?.[1]
      ?? html.match(/id="([^"]+)"[^>]*class="ui-field__error"/)?.[1];
    expect(hintId, 'id хинта есть').toBeTruthy();
    expect(errorId, 'id ошибки есть').toBeTruthy();
    expect(describedby, 'aria-describedby ведёт и на hint, и на error (список)').toContain(hintId);
    expect(describedby).toContain(errorId);

    const errorText = html.match(/class="ui-field__error"[^>]*>([^<]+)</)?.[1]?.trim();
    expect(errorText, 'текст ошибки непуст (объявляется скринридером)').toBeTruthy();
    expect(html, 'role="alert" — вставленная ошибка объявляется (02-architecture §6.3)').toMatch(
      /class="ui-field__error"[^>]*role="alert"|role="alert"[^>]*class="ui-field__error"/,
    );
  });

  it('поле нативно: required, autocomplete (WCAG 1.3.5 — не отключать), placeholder ≠ label', () => {
    const inputTag = tagOf(html, 'input');
    expect(inputTag).toContain('required');
    expect(inputTag, 'autocomplete не отключён (off запрещён политикой)').toMatch(/autocomplete="(?!off)/);
    expect(inputTag).toMatch(/placeholder="([^"]+)"/);

    const labelText = (html.match(/<label[^>]*>([\s\S]*?)<\/label>/)?.[1] ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const placeholder = inputTag.match(/placeholder="([^"]+)"/)?.[1];
    expect(labelText, 'placeholder ≠ label (правило доки)').not.toBe(placeholder);
  });

  it('появляется в потоке: без tabindex, без inline-стилей (VI §5)', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд и подключение (Scope T5.1)', () => {
  it('стенд ui-field (showcase/pages/ui-field/index.html): типы input × textarea × состояния × --wide в сетке', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-field', 'index.html'), 'utf8');
    for (const type of ['text', 'email', 'tel', 'password', 'date', 'number']) {
      expect(stand, `тип ${type} продемонстрирован`).toContain(`type="${type}"`);
    }
    expect(stand, 'textarea продемонстрирована').toContain('ui-field__textarea');
    expect(stand, 'состояние error').toContain('ui-field--error');
    expect(stand, 'состояние disabled').toMatch(/ui-field__input[^>]*disabled|disabled[^>]*ui-field__input/);
    expect(stand, 'состояние readonly').toMatch(/ui-field__input[^>]*readonly|readonly[^>]*ui-field__input/);
    expect(stand, '--wide в grid продемонстрирован').toContain('ui-field--wide');
    expect(stand, 'сетка layout-примитива (T3.4) как grid-родитель').toContain('ui-grid--2');
    expect(stand, 'гейт T3.6 не расширяется без CHECK_STANDS').not.toContain('data-ui-check-layout');
  });

  it("'ui-field' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-field'[^\]]*\]/);
  });
});

describe('дока компонента (DoD T5.1)', () => {
  const readme = () => readFileSync(join(root, 'components', 'ui-field', 'README.md'), 'utf8');

  it('README: placeholder-политика, autocomplete-рекомендации, required-паттерн, связность aria', () => {
    const text = readme();
    for (const keyword of [
      'placeholder',
      'autocomplete',
      'обязательное поле',
      'aria-describedby',
      'aria-invalid',
      'min-height',
      'resize: vertical',
      'ui-field--wide',
      '32px',
      'ui-field__error',
    ]) {
      expect(text, keyword).toContain(keyword);
    }
  });
});
