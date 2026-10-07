/**
 * Юнит-пины T5.2 — нативный select, checkbox, radio.
 *
 * Задача строится на обвязке ui-field (T5.1): «select/checkbox/radio
 * используют ту же обвязку и те же модификаторы» (README ui-field). Источник
 * — career-portal components.css:144–227 (.field__select, .checkbox,
 * .radio-row, .radio); исполняемая форма решения:
 *  - components/ui-field/ui-field.css: .ui-field__select в общей коробке
 *    контролов; appearance: none; стрелка — ::after обёртки __select-wrap:
 *    mask-image по svg БЕЗ цвета (alpha-маска), цвет — background-color
 *    var(--ui-color-text-muted): data-URI не читает var(), поэтому цветной
 *    hex в URI (%23…) нарушил бы инвариант «hex только в primitives»
 *    (рендз-замечание T5.2 high); никаких подмен нативного списка
 *    (opacity/position — Implementation requirements п.1);
 *    select в правилах focus/error/disabled — те же модификаторы, что у
 *    input/textarea;
 *  - components/ui-checkbox/: label-обёртка input+текст (клик по тексту
 *    переключает), accent-color из токена primary, групповая раскладка;
 *  - components/ui-radio/ + components/ui-radio-group/: ярлык и группа
 *    fieldset/legend + раскладка radio-row (flex wrap gap 24px);
 *  - токены слоя 2: --ui-control-size (20px обоих инпутов), --ui-radio-gap
 *    (10px, вне шкалы — перенос «как есть»), стрелка select — новые токены;
 *  - html-validate: правило irao/radio-group-fieldset — радио-группа без
 *    fieldset/legend является ошибкой (AC); фикстуры — tests/lint-cases/html/.
 * Поверхность браузера (Space/стрелки/select нативно, ссылка в label,
 * связность aria, axe, эталоны) — tests/e2e/ui-forms.spec.js.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело правила, селектор которого стоит после закрытой скобки — не
 *  продолжение списка селекторов предыдущего правила. */
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

/** CSS-инварианты компонента: без !important/hex (vi-инвариант §5) — hex ловится
 * и в процентно-кодированной форме (%23… в data-URI, слепое пятно сырого
 * /#[0-9a-f]{3,8}/ — ревью T5.2), без media и :hover (одобренным дизайном не
 * заданы), без ссылок на примитивы. */
const expectSystemInvariants = (css) => {
  expect(css).not.toContain('!important');
  expect(css, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-f]{3,8}\b/i);
  expect(css, 'процентно-кодированный hex в data-URI — тот же инвариант').not.toMatch(
    /%23[0-9a-f]{3,8}\b/i,
  );
  expect(css, 'media-запросов нет — mobile-first база без изломов').not.toContain('@media');
  expect(css, 'собственных hover-правил нет (в career-portal их нет)').not.toContain(':hover');
  const families = [
    'blue',
    'gray',
    'red',
    'green',
    'orange',
    'slate',
    'purple',
    'peach',
    'white',
    'black',
  ];
  expect(css, 'ссылки на примитивы запрещены вне tokens/ (ADR-0009)').not.toMatch(
    new RegExp(`var\\(--ui-(?:${families.join('|')})-[0-9]`),
  );
};

describe('components/ui-field/ui-field.css — ui-field__select (T5.2)', () => {
  const path = join(root, 'components', 'ui-field', 'ui-field.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('select в общей коробке контролов: та же геометрия, что input/textarea', () => {
    const block = blockOf(css, '.ui-field__input,\n.ui-field__select,\n.ui-field__textarea');
    expect(block, 'select входит в общее правило контролов').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: 100%;');
    expect(block).toContain('min-height: var(--ui-field-height);');
    expect(block).toContain('padding: var(--ui-space-1) var(--ui-space-5);');
    expect(block).toContain('border: var(--ui-border-width) solid transparent;');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('color: var(--ui-color-text);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
  });

  it('.ui-field__select: appearance none, стрелке оставлено место; стрелка НЕ фоном select (data-URI не читает var())', () => {
    const block = blockOfStandalone(css, '.ui-field__select');
    expect(block, 'правило select найдено').toBeTruthy();
    expect(block, 'appearance: none — Technical considerations T5.2').toContain(
      'appearance: none;',
    );
    expect(
      block,
      'стрелке нужно место: правый паддинг больше левого (текст не наезжает на индикатор)',
    ).toContain('padding-right: var(--ui-space-6);');
    expect(
      block,
      'стрелка НЕ фоном select: цвет в data-URI нарушил бы инвариант «hex только в primitives» (ревью T5.2) — она на обёртке',
    ).not.toContain('background-image');
  });

  it('стрелка select — ::after обёртки __select-wrap: mask-image БЕЗ цвета + background-color из токена (токен-перекрашиваемая, ревью T5.2)', () => {
    const wrap = blockOf(css, '.ui-field__select-wrap');
    expect(wrap, 'обёртка вокруг select (псевдоэлементы на <select> не работают)').toBeTruthy();
    expect(wrap).toContain('box-sizing: border-box;');
    expect(wrap).toContain('position: relative;');
    expect(wrap).toContain('display: block;');

    const arrow = blockOf(css, '.ui-field__select-wrap::after');
    expect(arrow, 'правило стрелки найдено').toBeTruthy();
    expect(arrow).toContain('content: "";');
    expect(arrow).toContain('position: absolute;');
    expect(arrow, 'отступ от правого края — токен').toContain(
      'right: var(--ui-field-select-arrow-offset);',
    );
    expect(arrow).toContain('width: var(--ui-field-select-arrow-size);');
    expect(arrow).toContain('height: var(--ui-field-select-arrow-size);');
    expect(arrow, 'клики проходят сквозь стрелку к select').toContain('pointer-events: none;');
    expect(
      arrow,
      'цвет стрелки — токен слоя 2: переопределение темы и vi.css (T9.1) перекрашивают',
    ).toContain('background-color: var(--ui-color-text-muted);');
    expect(arrow, 'форма стрелки — svg-маска').toContain('mask-image: url("data:image/svg+xml,');
    expect(
      arrow,
      'в data-URI маски нет ЦВЕТА — ни hex, ни процентно-кодированного, ни ключевых слов: маска альфа-режимом берёт только форму (currentColor как нейтральная краска пути цветом не является — инвариант ADR-0009 §1)',
    ).not.toMatch(
      /%23[0-9a-f]{3,8}|#[0-9a-f]{3,8}|='(?:black|white|red|green|blue|gray|grey|transparent)'/i,
    );
  });

  it('disabled: стрелка гаснет вместе с полем (:has — стрелка вне select, нативное затемнение её не красит)', () => {
    const dim = blockOf(css, '.ui-field__select-wrap:has(.ui-field__select:disabled)::after');
    expect(dim, 'приглушение стрелки disabled-поля').toBeTruthy();
    expect(dim).toContain('opacity: var(--ui-opacity-disabled);');
  });

  it('нативный select не подменяется (Implementation requirements п.1): без opacity/position/pointer-events/display-деклараций', () => {
    const block = blockOfStandalone(css, '.ui-field__select');
    expect(
      block,
      'opacity/position/display/pointer-events-деклараций нет (background-position — не в счёт)',
    ).not.toMatch(/(?:^|;)\s*(?:opacity|position|display|pointer-events)\s*:/);
  });

  it('select в правилах focus/error/disabled — те же модификаторы, что у input/textarea', () => {
    const focus = blockOf(
      css,
      '.ui-field__input:focus-visible,\n.ui-field__select:focus-visible,\n.ui-field__textarea:focus-visible',
    );
    expect(focus, 'focus-правило со select').toBeTruthy();
    expect(focus).toContain('background-color: var(--ui-color-surface);');
    expect(focus).toContain('border-color: var(--ui-color-primary);');

    const error = blockOf(
      css,
      '.ui-field--error .ui-field__input,\n.ui-field--error .ui-field__select,\n.ui-field--error .ui-field__textarea',
    );
    expect(error, 'error-правило со select').toBeTruthy();
    expect(error).toContain('border-color: var(--ui-color-error);');
    expect(error).toContain('background-color: var(--ui-color-error-bg);');

    const disabled = blockOf(
      css,
      '.ui-field__input:disabled,\n.ui-field__select:disabled,\n.ui-field__textarea:disabled',
    );
    expect(disabled, 'disabled-правило со select').toBeTruthy();
    expect(disabled).toContain('opacity: var(--ui-opacity-disabled);');
  });

  it('инварианты системы: без !important/hex/media/:hover и примитивов слоя 1', () => {
    expectSystemInvariants(css);
  });
});

describe('tokens/semantic.css — геометрия чекбокса/радио/стрелки (слой 2, T5.2)', () => {
  const semantic = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it.each([
    ['--ui-control-size', '1.25rem', 'components.css:203'],
    ['--ui-radio-gap', '0.625rem', 'components.css:215'],
    ['--ui-field-select-arrow-size', '1rem', 'Technical considerations T5.2'],
    ['--ui-field-select-arrow-offset', '0.75rem', 'Technical considerations T5.2'],
  ])('%s = %s объявлен с происхождением', (token, value, origin) => {
    expect(semantic, `${token} объявлен`).toMatch(
      new RegExp(`${token.replace(/-/g, '\\-')}:\\s*${value.replace('.', '\\.')};`),
    );
    expect(semantic, `у ${token} комментарий происхождения`).toContain(origin);
  });

  it('компоненты читают эти токены (значения не дублируются)', () => {
    for (const [file, token] of [
      ['components/ui-checkbox/ui-checkbox.css', 'var(--ui-control-size)'],
      ['components/ui-radio/ui-radio.css', 'var(--ui-control-size)'],
      ['components/ui-radio/ui-radio.css', 'var(--ui-radio-gap)'],
      ['components/ui-field/ui-field.css', 'var(--ui-field-select-arrow-size)'],
      ['components/ui-field/ui-field.css', 'var(--ui-field-select-arrow-offset)'],
    ]) {
      expect(
        stripCssComments(readFileSync(join(root, file), 'utf8')),
        `${file} читает ${token}`,
      ).toContain(token);
    }
  });

  it('таблица диффов фиксирует перенос (tokens-career-portal-mapping.md)', () => {
    const mapping = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'tokens-career-portal-mapping.md'),
      'utf8',
    );
    for (const token of [
      '--ui-control-size',
      '--ui-radio-gap',
      '--ui-field-select-arrow-size',
      '--ui-field-select-arrow-offset',
    ]) {
      expect(mapping, `${token} — строка в таблице диффов`).toContain(token);
    }
  });
});

describe('components/ui-checkbox — чекбокс-согласие (T5.2)', () => {
  const cssPath = join(root, 'components', 'ui-checkbox', 'ui-checkbox.css');
  const css = stripCssComments(readFileSync(cssPath, 'utf8'));

  it('ui-checkbox.css: @define checkbox, box-sizing на корне и инпуте (ADR-0002)', () => {
    expect(existsSync(cssPath), 'папка компонента на месте').toBe(true);
    expect(readFileSync(cssPath, 'utf8').startsWith('/** @define checkbox */')).toBe(true);

    const rootBlock = blockOf(css, '.ui-checkbox');
    expect(rootBlock).toContain('box-sizing: border-box;');
    const input = blockOf(css, '.ui-checkbox__input');
    expect(input).toContain('box-sizing: border-box;');
  });

  it('label-обёртка одобренного .checkbox: флекс-строка с прижатым к верху инпутом (длинный текст)', () => {
    const rootBlock = blockOf(css, '.ui-checkbox');
    expect(rootBlock).toContain('display: flex;');
    expect(rootBlock).toContain('align-items: flex-start;');
    expect(rootBlock).toContain('gap: var(--ui-space-3);');
    expect(rootBlock).toContain('cursor: pointer;');
    expect(rootBlock).toContain('color: var(--ui-color-text);');
    expect(rootBlock).toContain('font-size: var(--ui-fs-small);');
    expect(rootBlock, 'line-height 1.35 одобренного .checkbox').toContain(
      'line-height: var(--ui-lh-small);',
    );
  });

  it('нативный инпут: 20px из токена, accent-color из primary, без подмен (нативность — принцип ТЗ №16/17)', () => {
    const input = blockOf(css, '.ui-checkbox__input');
    expect(input).toContain('flex: 0 0 auto;');
    expect(input).toContain('width: var(--ui-control-size);');
    expect(input).toContain('height: var(--ui-control-size);');
    expect(input).toContain('margin: 0;');
    expect(input, 'accent-color — современный нативный путь (Technical considerations)').toContain(
      'accent-color: var(--ui-color-primary);',
    );
    expect(input).toContain('cursor: pointer;');
    expect(input, 'appearance не трогаем — галочка рисует браузер').not.toContain('appearance');
    expect(input, 'нативный инпут не прячется (класс D аудита — не повторяем)').not.toContain(
      'opacity',
    );
  });

  it('групповая раскладка: чекбоксы блочные, соседний ритм — ступень шкалы', () => {
    const stack = blockOf(css, '.ui-checkbox + .ui-checkbox');
    expect(stack, 'соседние чекбоксы складываются с шагом --ui-space-3').toBeTruthy();
    expect(stack).toContain('margin-top: var(--ui-space-3);');
  });

  it('инварианты системы', () => {
    expectSystemInvariants(css);
  });
});

describe('канонический паттерн ui-checkbox (components/ui-checkbox/ui-checkbox.html)', () => {
  const path = join(root, 'components', 'ui-checkbox', 'ui-checkbox.html');
  const html = readFileSync(path, 'utf8');
  const labelBlock = html.match(/<label[^>]*class="ui-checkbox"[\s\S]*?<\/label>/)?.[0] ?? '';

  it('корень — обвязка ui-field с --required и --error (та же обвязка, T5.1)', () => {
    expect(tagOf(html, 'div')).toContain('class="ui-field ui-field--required ui-field--error"');
  });

  it('label.ui-checkbox оборачивает инпут и текст (клик по тексту переключает нативно)', () => {
    expect(labelBlock, 'label-обёртка есть').toBeTruthy();
    expect(labelBlock).toContain('<input');
    expect(labelBlock).toMatch(/type="checkbox"/);
    expect(labelBlock, 'текст внутри label — не пустой').toMatch(
      /<\/input>|<\/span>|[\u0400-\u04FF]/,
    );
  });

  it('согласие с вложенной ссылкой (Implementation requirements п.3): a внутри label, клик по ссылке не перехватывается label-ом', () => {
    expect(labelBlock, 'ссылка внутри label').toContain('<a class="ui-link"');
    expect(labelBlock, 'ссылка ведёт на документ политики').toMatch(/href="[^"]+"/);
  });

  it('ошибка — визуал и aria в одном паттерне: aria-invalid, aria-describedby на id ошибки, role="alert"', () => {
    const inputTag = tagOf(labelBlock, 'input');
    expect(inputTag).toContain('required');
    expect(inputTag).toContain('aria-invalid="true"');
    const describedby = inputTag.match(/aria-describedby="([^"]+)"/)?.[1] ?? '';
    const errorId = html.match(/class="ui-field__error"[^>]*id="([^"]+)"/)?.[1];
    expect(errorId, 'id ошибки есть').toBeTruthy();
    expect(describedby, 'aria-describedby ведёт на ошибку').toContain(errorId);
    expect(html).toMatch(
      /class="ui-field__error"[^>]*role="alert"|role="alert"[^>]*class="ui-field__error"/,
    );
  });

  it('required-маркер не только цветом: звёздочка aria-hidden + текст скринридеру (паттерн T5.1)', () => {
    expect(labelBlock).toContain('class="ui-field__req"');
    expect(labelBlock).toMatch(/<span aria-hidden="true">\*<\/span\s*>/);
    expect(html.match(/ui-field__req-text">([^<]+)</)?.[1]).toBe('обязательное поле');
  });

  it('появляется в потоке: без tabindex, без inline-стилей (VI §5)', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('components/ui-radio + ui-radio-group (T5.2)', () => {
  const radioCss = stripCssComments(
    readFileSync(join(root, 'components', 'ui-radio', 'ui-radio.css'), 'utf8'),
  );
  const groupCss = stripCssComments(
    readFileSync(join(root, 'components', 'ui-radio-group', 'ui-radio-group.css'), 'utf8'),
  );

  it('ui-radio.css: @define radio; ярлык одобренного .radio — inline-flex, центр, gap из токена', () => {
    expect(
      readFileSync(join(root, 'components', 'ui-radio', 'ui-radio.css'), 'utf8').startsWith(
        '/** @define radio */',
      ),
    ).toBe(true);
    const rootBlock = blockOf(radioCss, '.ui-radio');
    expect(rootBlock).toContain('box-sizing: border-box;');
    expect(rootBlock).toContain('display: inline-flex;');
    expect(rootBlock).toContain('align-items: center;');
    expect(rootBlock, 'gap 10px одобренного .radio (components.css:215)').toContain(
      'gap: var(--ui-radio-gap);',
    );
    expect(rootBlock).toContain('cursor: pointer;');
    expect(rootBlock).toContain('font-size: var(--ui-fs-small);');

    const input = blockOf(radioCss, '.ui-radio__input');
    expect(input).toContain('box-sizing: border-box;');
    expect(input).toContain('width: var(--ui-control-size);');
    expect(input).toContain('height: var(--ui-control-size);');
    expect(input).toContain('margin: 0;');
    expect(input).toContain('accent-color: var(--ui-color-primary);');
    expect(input).toContain('cursor: pointer;');
  });

  it('ui-radio-group.css: @define radio-group; UA-ресет fieldset (поток обвязки, не рисованная рамка)', () => {
    expect(
      readFileSync(
        join(root, 'components', 'ui-radio-group', 'ui-radio-group.css'),
        'utf8',
      ).startsWith('/** @define radio-group */'),
    ).toBe(true);
    const rootBlock = blockOf(groupCss, '.ui-radio-group');
    expect(rootBlock).toContain('box-sizing: border-box;');
    expect(rootBlock).toContain('margin: 0;');
    expect(rootBlock).toContain('padding: 0;');
    expect(rootBlock).toContain('border: none;');
  });

  it('legend — подпись группы в стиле label обвязки (fs-small/fw-small); шаг до ряда — --ui-space-2', () => {
    const legend = blockOf(groupCss, '.ui-radio-group__legend');
    expect(legend).toContain('box-sizing: border-box;');
    expect(legend).toContain('padding: 0;');
    expect(legend).toContain('margin-bottom: var(--ui-space-2);');
    expect(legend).toContain('color: var(--ui-color-text);');
    expect(legend).toContain('font-size: var(--ui-fs-small);');
    expect(legend).toContain('font-weight: var(--ui-fw-small);');
    expect(legend).toContain('line-height: var(--ui-lh-small);');
  });

  it('раскладка radio-row одобренного дизайна: flex wrap gap 24px (components.css:210)', () => {
    const row = blockOf(groupCss, '.ui-radio-group__row');
    expect(row).toContain('box-sizing: border-box;');
    expect(row).toContain('display: flex;');
    expect(row).toContain('flex-wrap: wrap;');
    expect(row, 'gap .radio-row 24px → --ui-space-5').toContain('gap: var(--ui-space-5);');
  });

  it('инварианты системы в обоих файлах', () => {
    expectSystemInvariants(radioCss);
    expectSystemInvariants(groupCss);
  });
});

describe('канонический паттерн ui-radio (components/ui-radio/ui-radio.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-radio', 'ui-radio.html'), 'utf8');

  it('label.ui-radio оборачивает нативный инпут и текст', () => {
    const labelBlock = html.match(/<label[^>]*class="ui-radio"[\s\S]*?<\/label>/)?.[0] ?? '';
    expect(labelBlock, 'label-обёртка есть').toBeTruthy();
    expect(labelBlock).toMatch(
      /<input[^>]*class="ui-radio__input"[^>]*type="radio"|<input[^>]*type="radio"[^>]*class="ui-radio__input"/,
    );
    expect(labelBlock, 'текст ярлыка').toMatch(/[\u0400-\u04FF]/);
  });

  it('единичный ярлык объясняет свою роль в группе: отсылка к ui-radio-group (fieldset/legend)', () => {
    expect(html).toContain('ui-radio-group');
  });

  it('появляется в потоке: без tabindex, без inline-стилей', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('канонический паттерн ui-radio-group (components/ui-radio-group/ui-radio-group.html)', () => {
  const html = readFileSync(
    join(root, 'components', 'ui-radio-group', 'ui-radio-group.html'),
    'utf8',
  );
  const fieldsetTag = tagOf(html, 'fieldset');

  it('группа — fieldset.ui-radio-group с aria-describedby (ошибка связывается с группой — паттерн в доке)', () => {
    expect(fieldsetTag).toContain('class="ui-radio-group"');
    expect(fieldsetTag, 'aria-describedby на fieldset (Accessibility requirements)').toMatch(
      /aria-describedby="[^"]+"/,
    );
  });

  it('legend обязателен и идёт первым ребёнком fieldset (правило доки + html-validate)', () => {
    const legendTag = html.match(/<\/fieldset\s*>\s*<legend[\s\S]*?<\/legend>/)?.[0];
    expect(html).toMatch(/<fieldset[^>]*>\s*<legend/);
    expect(legendTag ?? html.match(/<legend[\s\S]*?<\/legend>/)?.[0]).toContain(
      'class="ui-radio-group__legend"',
    );
  });

  it('ряд __row с ярлыками .ui-radio: ≥2 радио с общим name, один выбран', () => {
    const row = html.match(/<div[^>]*class="ui-radio-group__row"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(row, 'ряд раскладки есть').toBeTruthy();
    const radios = [...row.matchAll(/type="radio"/g)];
    expect(radios.length, 'в группе минимум два радио').toBeGreaterThanOrEqual(2);
    const names = [...row.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(names).size, 'общий name — нативная группа').toBe(1);
    expect(row, 'один вариант выбран по умолчанию').toMatch(/checked/);
    expect(row.match(/class="ui-radio"/g)?.length, 'ярлыки ui-radio').toBeGreaterThanOrEqual(2);
  });

  it('hint и error в списке describedby группы: error видимый текст с role="alert"', () => {
    const describedby = fieldsetTag.match(/aria-describedby="([^"]+)"/)?.[1] ?? '';
    const ids = describedby.split(/\s+/).filter(Boolean);
    expect(ids.length, 'hint и error в describedby').toBeGreaterThanOrEqual(2);
    for (const id of ids) {
      expect(html, `id ${id} существует`).toContain(`id="${id}"`);
    }
    expect(html).toMatch(
      /class="ui-field__error"[^>]*role="alert"|role="alert"[^>]*class="ui-field__error"/,
    );
  });

  it('required-маркер в legend не только цветом; группа нативно required', () => {
    expect(html).toContain('class="ui-field__req"');
    expect(html).toMatch(/type="radio"[^>]*required|required[^>]*type="radio"/);
  });

  it('появляется в потоке: без tabindex, без inline-стилей', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('html-validate: правило irao/radio-group-fieldset (T5.2, AC)', () => {
  const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
  const registry = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');

  it('правило зарегистрировано и включено как error', () => {
    expect(config).toContain("'irao/radio-group-fieldset'");
    expect(config).toMatch(/'irao\/radio-group-fieldset':\s*'error'/);
  });

  it('фикстуры и ожидания в реестре: группа без fieldset/legend — fail; с legend — pass', () => {
    expect(
      existsSync(join(root, 'tests', 'lint-cases', 'html', 'radio-without-fieldset.html')),
    ).toBe(true);
    expect(
      existsSync(join(root, 'tests', 'lint-cases', 'html', 'radio-group-with-legend.html')),
    ).toBe(true);
    expect(registry).toMatch(
      /file:\s*'html\/radio-without-fieldset\.html'[\s\S]*?irao\/radio-group-fieldset/,
    );
    expect(registry).toMatch(
      /file:\s*'html\/radio-group-with-legend\.html'[\s\S]*?expect:\s*'pass'/,
    );
  });
});

describe('стенд и подключение (Scope T5.2)', () => {
  it('стенд ui-field: select/checkbox/radio × состояния (включая error)', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-field', 'index.html'), 'utf8');
    expect(
      stand.match(/class="ui-field__select"/g)?.length,
      'select: default, hint, error, disabled',
    ).toBeGreaterThanOrEqual(3);
    expect(stand, 'select в error-состоянии').toMatch(
      /ui-field--error[\s\S]*?ui-field__select|ui-field__select[\s\S]*?aria-invalid="true"/,
    );
    expect(stand, 'select disabled').toMatch(
      /ui-field__select[^>]*disabled|disabled[^>]*ui-field__select/,
    );
    expect(
      stand.match(/class="ui-checkbox"/g)?.length,
      'чекбокс: согласие и группа',
    ).toBeGreaterThanOrEqual(4);
    expect(stand, 'согласие с вложенной ссылкой').toMatch(
      /class="ui-checkbox"[\s\S]*?<a class="ui-link"/,
    );
    expect(
      stand.match(/class="ui-radio-group"/g)?.length,
      'радио-группы: обычная и error',
    ).toBeGreaterThanOrEqual(2);
    expect(stand.match(/<legend/g)?.length, 'у каждой группы legend').toBeGreaterThanOrEqual(2);
    expect(stand.match(/class="ui-radio"/g)?.length, 'ярлыки радио').toBeGreaterThanOrEqual(4);
    expect(stand, 'ошибка группы связана описанием').toMatch(
      /<fieldset[^>]*aria-describedby="[^"]*"/,
    );
    expect(stand, 'гейт T3.6 не расширяется без CHECK_STANDS').not.toContain(
      'data-ui-check-layout',
    );
  });

  it("'ui-checkbox', 'ui-radio', 'ui-radio-group' в COMPONENTS showcase/build.mjs", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-checkbox'[^\]]*\]/);
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-radio'[^\]]*\]/);
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-radio-group'[^\]]*\]/);
  });
});

describe('дока компонентов (DoD T5.2)', () => {
  it.each([
    [
      'components/ui-checkbox/README.md',
      ['label-обёртка', 'accent-color', 'aria-describedby', 'Space', 'ui-field--error', 'ссылк'],
    ],
    [
      'components/ui-radio/README.md',
      ['label-обёртка', 'accent-color', 'fieldset', 'legend', 'стрелк'],
    ],
    [
      'components/ui-radio-group/README.md',
      ['fieldset', 'legend', 'aria-describedby', 'ui-field--error', 'radio-row', 'role="alert"'],
    ],
  ])('%s: API, состояния, a11y, клавиатура', (file, keywords) => {
    const text = readFileSync(join(root, ...file.split('/')), 'utf8');
    for (const keyword of keywords) {
      expect(text, keyword).toContain(keyword);
    }
  });
});
