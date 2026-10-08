/**
 * Юнит-пины T5.6 — серверный контракт ошибок: сниппет Bitrix, стенд
 * integration/form-full-cycle и доки (Testing requirements + AC).
 *
 * Исполняемая форма решения:
 *  - bitrix/snippets/form-error-render.php — копипаст-готовый шаблон вывода
 *    ошибок (bitrix:form.result.new и произвольная форма): сводная
 *    ui-form__summary[role=alert][tabindex=-1], у поля ui-field--error +
 *    aria-invalid="true" + aria-describedby + <p class="ui-field__error"
 *    id="…-error" role="alert"> (суффикс -error единый с клиентским модулем
 *    IraoUI.form, T5.5); экранирование вывода ОБЯЗАТЕЛЬНО (XSS); inline-
 *    сниппет фокуса работает без модулей (Implementation requirements п.3);
 *  - стенд showcase/pages/integration/form-full-cycle/ эмулирует PHP-вывод
 *    статикой; его inline-скрипт — точная копия вывода сниппета (пин
 *    согласованности); четыре ветки — якоря ffc-nojs/ffc-client/ffc-server/
 *    ffc-success;
 *  - доки: компонентный README несёт таблицу «состояние → классы → aria →
 *    фокус» и правило «серверная валидация всегда включена (JS — только
 *    UX)»; integration-guide (черновик T10.3) и bitrix/snippets/README.md
 *    согласованы со сниппетом.
 * Поверхность браузера (4 ветки, идентичность computed-состояний, axe) —
 * tests/e2e/form-full-cycle.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const snippetPath = join(root, 'bitrix', 'snippets', 'form-error-render.php');
const standPath = join(root, 'showcase', 'pages', 'integration', 'form-full-cycle', 'index.html');

const snippet = readFileSync(snippetPath, 'utf8');
const stand = readFileSync(standPath, 'utf8');

describe('bitrix/snippets/form-error-render.php — контракт T5.6 (Scope)', () => {
  it('опорные строки контракта на месте: классы, aria, сводная, фокус', () => {
    for (const marker of [
      'ui-field--error',
      'aria-invalid="true"',
      'aria-describedby',
      '<p class="ui-field__error"',
      'role="alert"',
      'ui-form__summary',
      'tabindex="-1"',
      'ui-link',
    ]) {
      expect(snippet, `сниппет содержит «${marker}»`).toContain(marker);
    }
  });

  it('вывод экранируется: htmlspecialchars c ENT_QUOTES и кодировкой сайта (XSS — часть контракта)', () => {
    // Каждое попадание пользовательских данных в разметку — через
    // htmlspecialchars; кодировка — SITE_CHARSET (сайт может быть не UTF-8).
    expect(snippet).toContain('htmlspecialchars');
    expect(snippet).toContain('ENT_QUOTES');
    expect(snippet).toContain('SITE_CHARSET');
  });

  it('исходные данные — массив ошибок формы: $arResult["FORM_ERRORS"] в примере использования', () => {
    expect(snippet).toContain('FORM_ERRORS');
  });

  it('функции защищены function_exists — повторное включение шаблона Bitrix безопасно', () => {
    const guards = snippet.match(/function_exists\(/g) ?? [];
    const declarations = snippet.match(/^\s*function irao_ui_/gm) ?? [];
    expect(
      guards.length,
      "каждая функция сниппета объявлена под guard'ом function_exists",
    ).toBeGreaterThanOrEqual(declarations.length);
  });

  it('inline-сниппет фокуса: работает без модулей, параметризован id, не крадёт фокус у скрытых', () => {
    // Тело функции irao_ui_form_focus_script (до докблока примера
    // использования): inline <script>, getElementById по аргументу,
    // guard !el.hidden, вызов focus через typeof-проверку.
    const start = snippet.indexOf('function irao_ui_form_focus_script');
    const body = snippet.slice(start, snippet.indexOf('/**', start));
    expect(body, 'сниппет использует inline <script>, а не модуль').toContain('<script>');
    expect(body, 'цель фокуса — параметр (id элемента серверного состояния)').toContain(
      'getElementById',
    );
    expect(body, 'скрытый элемент не получает фокус').toContain('!el.hidden');
  });

  it('heredoc-тело скрипта: guard !el.hidden и typeof-проверка focus — ровно то, что встаёт в стенд', () => {
    const heredoc = snippet.slice(snippet.indexOf('<<<JS') + 5, snippet.lastIndexOf('JS;'));
    expect(heredoc).toContain('el.focus()');
    expect(heredoc).toContain("typeof el.focus === 'function'");
  });
});

describe('стенд integration/form-full-cycle — эмуляция PHP-вывода (Technical considerations)', () => {
  it('четыре ветки — отдельные якоря: ffc-nojs, ffc-client, ffc-server, ffc-success', () => {
    for (const anchor of ['ffc-nojs', 'ffc-client', 'ffc-server', 'ffc-success']) {
      expect(stand, `якорь ветки id="${anchor}"`).toContain(`id="${anchor}"`);
    }
  });

  it('в разметке стенда нет novalidate (AC T5.5 действует на весь полигон)', () => {
    const formTags = stand.match(/<form\b[^>]*>/g) ?? [];
    expect(formTags.length).toBeGreaterThanOrEqual(2);
    for (const tag of formTags) {
      expect(tag, `в разметке ${tag} novalidate нет`).not.toContain('novalidate');
    }
  });

  it('живая форма несёт data-ui-form — ветка 1 (без JS) и ветка 2 (модуль T5.5) на одной форме', () => {
    const liveForm = stand.match(/<form\b[^>]*id="ffc-form"[^>]*>/) ?? [''];
    expect(liveForm[0]).toContain('data-ui-form');
  });

  it('серверная ветка: summary role=alert + tabindex="-1" БЕЗ hidden — PHP рендерит его видимым', () => {
    const summary = stand.match(/<div class="ui-form__summary"[^>]*id="ffc-server-summary"[^>]*>/);
    expect(summary, 'серверный summary на месте').not.toBeNull();
    expect(summary[0]).toContain('role="alert"');
    expect(summary[0]).toContain('tabindex="-1"');
    expect(summary[0], 'серверный рендер не прячет summary за hidden').not.toContain('hidden');
  });

  it('серверные поля: aria-invalid + aria-describedby + <p class="ui-field__error" id="…-error" role="alert"> — суффикс -error единый с модулем T5.5', () => {
    for (const id of ['ffc-srv-name', 'ffc-srv-email', 'ffc-srv-consent']) {
      const control = stand.match(new RegExp(`<(?:input|textarea)[^>]*id="${id}"[^>]*>`, 's'));
      expect(control, `контроль ${id} на месте`).not.toBeNull();
      expect(control[0], `${id}: aria-invalid="true"`).toContain('aria-invalid="true"');
      expect(
        control[0],
        `${id}: aria-describedby ведёт на id ошибки (суффикс -error, как у IraoUI.form)`,
      ).toContain(`${id}-error`);
      const errorText = stand.match(
        new RegExp(`<p class="ui-field__error" id="${id}-error"[^>]*>`),
      );
      expect(errorText, `${id}: текст ошибки role=alert`).not.toBeNull();
      expect(errorText[0]).toContain('role="alert"');
    }
    // hint сохраняется при ошибке (как дописывает модуль): описаны hint И error.
    const email = stand.match(/<input[^>]*id="ffc-srv-email"[^>]*>/s) ?? [''];
    expect(email[0]).toContain('aria-describedby="ffc-srv-email-hint ffc-srv-email-error"');
  });

  it('серверная форма несёт data-ui-form — на реальном сайте модуль инициализируется и после перезагрузки', () => {
    const serverForm = stand.match(/<form\b[^>]*id="ffc-server-form"[^>]*>/) ?? [''];
    expect(serverForm[0]).toContain('data-ui-form');
  });

  it('inline-скрипт стенда — точная копия вывода сниппета (нормализация пробелов и кавычек, id → плейсхолдер)', () => {
    const scriptInStand = stand.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
    expect(scriptInStand, 'на стенде один inline <script> — сниппет фокуса').not.toBeNull();

    const heredocStart = snippet.indexOf('<<<JS') + 5;
    const heredocEnd = snippet.lastIndexOf('JS;');
    const snippetBody = snippet.slice(heredocStart, heredocEnd);

    const normalize = (text) =>
      text
        // Комментарии стенда — пояснение для читателя, не код сниппета.
        .replace(/^[ \t]*\/\/[^\n]*\n/gm, '')
        // Кавычки — стилистика: PHP-строка сниппета и JS стенда равнозначны.
        .replace(/'/g, '"')
        .replace(/%s/g, '@ID@')
        .replace(/getElementById\(\s*(['"])(.*?)\1\s*\)/g, 'getElementById(@ID@)')
        .replace(/\s+/g, '');

    expect(normalize(scriptInStand[1]), 'стенд эмулирует вывод irao_ui_form_focus_script').toBe(
      normalize(snippetBody),
    );
  });

  it('success-ветка: заголовок с tabindex="-1" — цель фокуса серверной success-страницы (правило T5.4)', () => {
    const title = stand.match(/<h[23][^>]*class="[^"]*ui-form__success-title[^"]*"[^>]*>/) ?? [''];
    expect(title[0]).toContain('tabindex="-1"');
  });
});

describe('сборка стенда и харнесс — вложенное имя integration/form-full-cycle', () => {
  it('build.mjs генерирует stands/integration/form-full-cycle.html из showcase/pages/integration/form-full-cycle', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(
      `'showcase', 'pages', 'integration', 'form-full-cycle', 'index.html'`,
    );
    expect(collapsed).toContain(`'stands', 'integration', 'form-full-cycle.html'`);
    // Рантайм на два уровня выше страницы (stands/integration/…): ../..
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('harness openStand допускает вложенное имя стенда (и по-прежнему только безопасные имена)', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    const match = harness.match(/if \(!(\/.+\/)\.test\(name\)\)/);
    expect(match, 'валидация имени в openStand на месте').not.toBeNull();
    const namePattern = new Function(`return ${match[1]};`)();
    expect(namePattern.test('integration/form-full-cycle'), 'вложенное имя проходит').toBe(true);
    expect(namePattern.test('ui-form'), 'плоское имя проходит как раньше').toBe(true);
    expect(namePattern.test('../etc/passwd'), 'пути и прочий мусор отвергаются').toBe(false);
    expect(namePattern.test('a//b'), 'пустой сегмент отвергается').toBe(false);
  });
});

describe('дока контракта (AC: таблица «состояние → классы → aria → фокус»)', () => {
  const readme = readFileSync(join(root, 'components', 'ui-form', 'README.md'), 'utf8');
  const guide = readFileSync(join(root, 'bitrix', 'integration-guide.md'), 'utf8');
  const snippetsReadme = readFileSync(join(root, 'bitrix', 'snippets', 'README.md'), 'utf8');

  it('README ui-form: секция контракта с таблицей состояние → классы → aria → фокус', () => {
    expect(readme).toContain('Серверный контракт ошибок');
    expect(readme).toContain('состояние');
    expect(readme).toContain('классы');
    expect(readme).toContain('aria');
    expect(readme).toContain('фокус');
  });

  it('README ui-form: правило «серверная валидация всегда включена (JS — только UX)»', () => {
    expect(readme).toContain('серверная валидация всегда включена');
  });

  it('README ui-form: суффикс id ошибки -error задокументирован как единый с клиентским модулем', () => {
    expect(readme).toContain('`-error`');
  });

  it('integration-guide (черновик T10.3) согласован: ссылается на сниппет и контракт', () => {
    expect(guide).toContain('form-error-render.php');
    expect(guide).toContain('Серверный контракт ошибок');
  });

  it('bitrix/snippets/README.md перечисляет сниппет', () => {
    expect(snippetsReadme).toContain('form-error-render.php');
  });

  it('README ui-form указывает на интеграционный стенд form-full-cycle', () => {
    expect(readme).toContain('integration/form-full-cycle');
  });
});
