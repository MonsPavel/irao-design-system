/**
 * Юнит-пины T11.1 — пакет сниппетов, чек-лист первого подключения,
 * integration-guide и html-validate «чистого стенда» (AC + Implementation
 * requirements).
 *
 * Исполняемая форма:
 *  - bitrix/snippets/: header-php.snippet.php (полная версия: UI_VERSION,
 *    Asset::addCss core→(тема)→vi, addJs в конец, preload до ShowHead,
 *    data-ui-theme опционально — вынесен в theme-connect.php),
 *    theme-connect.php (опциональная тема: файл после core, атрибут на
 *    <html>), json-data.php (данные для JS: application/json +
 *    data-ui-<имя>-data, json_encode с JSON_HEX_TAG — защита от вылезания
 *    из <script>, XSS); breadcrumbs/pagination/form-error-render — пины
 *    своих задач (fonts/skip-link/breadcrumbs/pagination/form-server-contract),
 *    здесь — сборка.
 *  - bitrix/first-connect-checklist.md — исполняемый чек-лист «первое
 *    подключение»: 9 пунктов раздела 6 плана 06, синхрон с ним (один
 *    источник) и ссылки на сниппеты.
 *  - bitrix/integration-guide.md — living doc: все сниппеты, чек-лист,
 *    каталог исключений legacy-атаки (tests/e2e/legacy-attack.spec.js),
 *    стадии миграции, обновление версии.
 *  - «Чистый стенд» (Implementation requirements п.1): сборка вывода
 *    сниппетов в одну страницу, прогнанная html-validate с конфигом
 *    репозитория (AC «html-validate/линт сниппетов зелёные»); PHP на
 *    машине сборки нет — рендер-фикстура сэмулирована, её неотрывность от
 *    PHP-исходников пинят маркеры (тот же приём, что form-server-contract
 *    со стендом integration/form-full-cycle).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..', '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

const headerPhp = read('bitrix', 'snippets', 'header-php.snippet.php');
const themeConnect = read('bitrix', 'snippets', 'theme-connect.php');
const jsonData = read('bitrix', 'snippets', 'json-data.php');
const snippetsReadme = read('bitrix', 'snippets', 'README.md');
const checklist = read('bitrix', 'first-connect-checklist.md');
const guide = read('bitrix', 'integration-guide.md');
const plan06 = read('docs', '06-implementation-plan.md');

describe('bitrix/snippets/header-php.snippet.php — полная версия (T11.1 Scope)', () => {
  it('пин версии: const UI_VERSION — единственное место правки при обновлении', () => {
    expect(headerPhp).toContain("const UI_VERSION = '0.1.0'");
    expect(headerPhp).toContain('Обновление = правка этой строки');
  });

  it('порядок CSS: ui-core → (тема опциональна, строка закомментирована) → ui-vi; сайт — после', () => {
    const coreIdx = headerPhp.indexOf("addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css')");
    const themeIdx = headerPhp.indexOf(
      "addCss('/local/ui/' . UI_VERSION . '/themes/theme-corp.css')",
    );
    const viIdx = headerPhp.indexOf("addCss('/local/ui/' . UI_VERSION . '/ui-vi.min.css')");
    expect(coreIdx, 'ui-core подключён').toBeGreaterThan(-1);
    expect(viIdx, 'ui-vi подключён').toBeGreaterThan(coreIdx);
    // data-ui-theme опционально (Scope): в MVP строки темы НЕТ в активном
    // коде — только закомментированный образец; порядок сниппета — после core.
    const activeTheme = headerPhp
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && line.includes('themes/theme-'));
    expect(activeTheme, 'активной строки темы в header.php нет (опциональна)').toEqual([]);
    expect(themeIdx, 'образец темы присутствует закомментированным').toBeGreaterThan(coreIdx);
  });

  it('JS в конец (addJs с true) — readyState-guard модулей закрывает позднюю загрузку', () => {
    expect(headerPhp).toContain("addJs('/local/ui/' . UI_VERSION . '/ui.min.js', true)");
    expect(headerPhp).toContain('readyState-guard');
  });

  it('preload шрифтов до CSS-каскада Bitrix (до ShowHead) — Technical considerations T11.1', () => {
    const preloadIdx = headerPhp.indexOf('rel="preload"');
    const showHeadIdx = headerPhp.indexOf('$APPLICATION->ShowHead()');
    expect(preloadIdx).toBeGreaterThan(-1);
    expect(showHeadIdx).toBeGreaterThan(preloadIdx);
    expect(headerPhp).toContain('golos-400-cyr.woff2');
    expect(headerPhp).toContain('golos-500-cyr.woff2');
    expect(headerPhp).toContain('crossorigin');
  });

  it('skip-link — первый элемент body; цель <main id="main" tabindex="-1"> документирована', () => {
    expect(headerPhp).toMatch(/<body[^>]*>\s*<a class="ui-skip-link" href="#main">/);
    expect(headerPhp).toContain('<main id="main" tabindex="-1">');
  });
});

describe('bitrix/snippets/theme-connect.php — опциональная тема (T11.1 Scope)', () => {
  it("функции под guard'ом function_exists — повторное включение безопасно", () => {
    const guards = themeConnect.match(/function_exists\(/g) ?? [];
    const declarations = themeConnect.match(/^\s*function irao_ui_/gm) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(declarations.length);
    expect(declarations.length, 'два хелпера: url и атрибут').toBe(2);
  });

  it('URL темы: /local/ui/{version}/themes/theme-<имя>.css, имя экранируется', () => {
    expect(themeConnect).toContain("'/local/ui/' . UI_VERSION . '/themes/theme-'");
    expect(themeConnect).toContain('rawurlencode');
  });

  it('атрибут data-ui-theme на <html>, значение = имя файла без theme-/.css (фиксация T2.4)', () => {
    expect(themeConnect).toContain('data-ui-theme="%s"');
    expect(themeConnect).toContain('htmlspecialchars');
    expect(themeConnect).toContain('на <html>');
  });

  it('порядок каскада: файл темы СТРОГО после core, до template_styles.css', () => {
    expect(themeConnect).toMatch(/ПОСЛЕ ui-core[\s\S]{0,120}template_styles\.css/s);
  });

  it('в MVP тема не подключается: сниппет явно фиксирует «не используется»', () => {
    expect(themeConnect).toContain('в MVP');
  });
});

describe('bitrix/snippets/json-data.php — JSON-данные для JS (T11.1 Scope, ADR-0008 п.2)', () => {
  it('контракт разметки: <script type="application/json" data-ui-<имя>-data>', () => {
    expect(jsonData).toContain('application/json');
    expect(jsonData).toContain("sprintf('data-ui-%s-data'");
  });

  it('XSS-флаги json_encode обязательны: JSON_HEX_TAG и JSON_UNESCAPED_UNICODE в коде сниппета', () => {
    for (const flag of [
      'JSON_HEX_TAG',
      'JSON_UNESCAPED_UNICODE',
      'JSON_HEX_AMP',
      'JSON_HEX_APOS',
      'JSON_HEX_QUOT',
    ]) {
      expect(jsonData, `флаг ${flag} в сниппете`).toContain(flag);
    }
  });

  it('алгоритм флагов не даёт данным вылезти из <script> (эмуляция json_encode сниппета)', () => {
    // Эмуляция PHP json_encode с флагами сниппета (JSON_HEX_TAG/AMP/APOS/QUOT):
    // < > & ' " внутри строк → \u00XX. Структурные кавычки JSON.stringify
    // оставляет — как PHP с HEX-флагами (экранируются только кавычки значений).
    const phpJsonEncode = (value) =>
      JSON.stringify(value).replace(
        /[<>&'"]/g,
        (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`,
      );

    const payload = { title: '</script><script>alert(1)</script>' };
    const json = phpJsonEncode(payload);
    const emitted = '<script type="application/json" data-ui-tabs-data>' + json + '</script>';

    // В эмитированной разметке ровно ОДНА закрывающая пара <script> —
    // payload не открыл и не закрыл тег.
    expect(emitted.match(/<\/script>/gi) ?? []).toHaveLength(1);
    expect(emitted.match(/<script/gi) ?? []).toHaveLength(1);
    // JSON остался валидным: обратная замена возвращает исходные данные.
    const parsed = JSON.parse(
      json.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
    );
    expect(parsed).toEqual(payload);
  });

  it('деградация: json_encode=false → «null» (без 500-й страницы)', () => {
    expect(jsonData).toContain("$json === false ? 'null' : $json");
  });
});

describe('ревью T11.1 (high): json-data.php — имя данных в позиции ИМЕНИ атрибута', () => {
  // htmlspecialchars — экранировщик ЗНАЧЕНИЙ атрибутов: пробел и '=' он не
  // трогает. $name же попадает в позицию ИМЕНИ атрибута без кавычек
  // (json-data.php: '<script type="application/json" ' . $attr . …), поэтому
  // враждебное имя 'x src=https://evil.tld/a.js' собирает
  // <script type="application/json" data-ui-x src=https://evil.tld/a.js-data>:
  // HTML-токенизатор режет по пробелу — второй атрибут src= тянет внешний
  // скрипт, который загрузится и исполнится (inline-тело при наличии src
  // игнорируется). Фикс — ВАЛИДАЦИЯ имени гейтом /^[a-z][a-z0-9-]*$/i с
  // подменой на 'invalid' (заодно закрывает $name='' → data-ui--data):
  // для контекста имени атрибута экранирование не работает, работает гейт.

  /** htmlspecialchars с ENT_QUOTES — как в сниппете (контекст ЗНАЧЕНИЯ). */
  const escapeHtmlAttr = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  /** Гейт и fallback извлекаются из PHP-исходника — зеркало не дрейфует. */
  const gateMatch = jsonData.match(
    /preg_match\(\s*'(\/\^\[a-z\]\[a-z0-9-\]\*\$\/i)'\s*,\s*\(string\)\s*\$name\s*\)\s*\)\s*\{\s*\$name\s*=\s*'([^']+)'/,
  );
  const [, phpPattern, fallback] = gateMatch ?? [];
  const nameGate = phpPattern
    ? new RegExp(
        phpPattern.slice(1, phpPattern.lastIndexOf('/')),
        phpPattern.slice(phpPattern.lastIndexOf('/') + 1),
      )
    : null;

  /** Эмуляция сборки атрибута сниппетом (гейт → sprintf data-ui-%s-data). */
  const emitAsSnippetDoes = (name) => {
    let safe = String(name);
    if (!nameGate || !nameGate.test(safe)) {
      safe = fallback ?? 'invalid';
    }
    return `<script type="application/json" data-ui-${escapeHtmlAttr(safe)}-data>`;
  };

  it('враждебное имя не порождает второго атрибута src= (фикс ревью)', () => {
    const emitted = emitAsSnippetDoes('x src=https://evil.tld/a.js');
    expect(emitted, 'второй атрибут src= не появился').not.toContain('src=');
    expect(emitted, 'враждебное имя подменено на invalid').toBe(
      '<script type="application/json" data-ui-invalid-data>',
    );
  });

  it('пустое имя не собирает пустой data-ui--data', () => {
    expect(emitAsSnippetDoes('')).toBe('<script type="application/json" data-ui-invalid-data>');
  });

  it('легитимное имя проходит гейт как прежде', () => {
    expect(emitAsSnippetDoes('tabs')).toBe('<script type="application/json" data-ui-tabs-data>');
  });

  it('сниппет валидирует имя гейтом /^[a-z][a-z0-9-]*$/i с подменой на invalid (маркер фикса)', () => {
    expect(jsonData).toMatch(
      /preg_match\(\s*'\/\^\[a-z\]\[a-z0-9-\]\*\$\/i'\s*,\s*\(string\)\s*\$name/,
    );
    expect(jsonData).toContain("$name = 'invalid'");
    // Зеркало собрано из реальных значений исходника (гейт + fallback).
    expect(nameGate, 'гейт извлечён из исходника').toBeInstanceOf(RegExp);
    expect(fallback, 'fallback извлечён из исходника').toBe('invalid');
  });
});

describe('bitrix/first-connect-checklist.md — исполняемый чек-лист (Implementation requirements п.2)', () => {
  const items = checklist.match(/^- \[ \] \*\*\d+\. /gm) ?? [];

  it('ровно 9 пунктов-галочек — 9 констрейнтов раздела 6 плана 06', () => {
    expect(items).toHaveLength(9);
  });

  it('синхрон с планом 06 (один источник): каждый констрейнт узнаваем по формулировке', () => {
    const section6 = plan06.slice(
      plan06.indexOf('## 6. Migration strategy'),
      plan06.indexOf('## 7. CI/CD'),
    );
    // Ключевые слова каждого из 9 пунктов плана — в чек-листе.
    for (const marker of [
      'Порядок каскада',
      'Специфичность',
      'box-sizing',
      'эскалации',
      'Запретные обёртки',
      'Смешение',
      'Глобалы base минимальны',
      'Пин версии',
      'Журнал конфликтов',
    ]) {
      expect(section6, `пункт «${marker}» есть в плане 06 §6`).toContain(marker);
      expect(checklist, `пункт «${marker}» отражён в чек-листе`).toContain(marker);
    }
  });

  it('пункты ссылаются на сниппеты и гайд — исполнимая страница', () => {
    expect(checklist).toContain('snippets/header-php.snippet.php');
    expect(checklist).toContain('integration-guide.md');
    expect(checklist).toContain('legacy-attack.spec.js');
    expect(checklist).toMatch(/\[docs\/06-implementation-plan\.md §6\]/);
  });

  it('a11y-сущность атаки — фокус (Accessibility requirements T11.1): в чек-листе п.2', () => {
    expect(checklist).toContain('Tab-обход');
    expect(checklist).toContain('ADR-0001');
  });
});

describe('bitrix/integration-guide.md — living doc (синхрон с T10.3)', () => {
  it('все сниппеты пакета в гайде (один источник: сниппеты = файлы bitrix/snippets/)', () => {
    for (const snippet of [
      'header-php.snippet.php',
      'theme-connect.php',
      'json-data.php',
      'breadcrumbs.php',
      'pagination.php',
      'form-error-render.php',
    ]) {
      expect(guide, `гайд ссылается на ${snippet}`).toContain(snippet);
      expect(snippetsReadme, `snippets/README перечисляет ${snippet}`).toContain(snippet);
    }
  });

  it('чек-лист первого подключения в гайде — исполнимая форма констрейнтов', () => {
    expect(guide).toContain('first-connect-checklist.md');
    expect(guide).toContain('9 пунктов');
  });

  it('каталог стойких исключений legacy-атаки зафиксирован и синхронен e2e', () => {
    expect(guide).toContain('Стойкость под legacy-атакой');
    expect(guide).toContain('tests/e2e/legacy-attack.spec.js');
    // Исключение №1 (карточка-ссылка, ::after) и №2 (роли-классы) — те же
    // формулировки, что в шапке спеки.
    expect(guide).toContain('::after');
    expect(guide).toContain('классы, а не теги');
  });

  it('стадии миграции и обновление версии — разделы гайда', () => {
    expect(guide).toContain('Миграция legacy → UI System');
    expect(guide).toContain('Обновление версии');
    expect(guide).toContain('UI_VERSION');
    expect(guide).toContain('T11.4');
  });

  it('серверный контракт ошибок (T5.6) сохранён при переработке гайда', () => {
    expect(guide).toContain('Серверные ошибки форм');
    expect(guide).toContain('form-error-render.php');
    expect(guide).toContain('на сервере всегда');
  });
});

describe('«чистый стенд» — сборка вывода сниппетов, html-validate (AC)', () => {
  const { HtmlValidate } = require('html-validate');
  const config = require(join(root, '.htmlvalidate.js'));

  // Рендер-фикстуры вывода сниппетов (PHP-исполнение недоступно на машине —
  // неотрывность от исходников пинят маркеры ниже). Сборка = «подключение по
  // quickstart»: header.php → тело страницы с компонентами-сниппетами.
  const skipLinkLine = '<a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>';

  const breadcrumbs = [
    '<nav class="ui-breadcrumbs" aria-label="Хлебные крошки">',
    '  <!-- html-validate-disable-next no-redundant-role, prefer-native-element -->',
    '  <ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https://schema.org/BreadcrumbList">',
    '    <li class="ui-breadcrumbs__item" itemprop="itemListElement"><a class="ui-breadcrumbs__link" itemprop="item" href="/"><span itemprop="name">Главная</span></a><meta itemprop="position" content="1"></li>',
    '    <li class="ui-breadcrumbs__item" itemprop="itemListElement"><span class="ui-breadcrumbs__current" aria-current="page" itemprop="name">Вакансии</span><meta itemprop="position" content="2"></li>',
    '  </ol>',
    '</nav>',
  ].join('\n');

  const jsonDataScript = [
    '<script type="application/json" data-ui-tabs-data>',
    '{"tabs":[{"id":"track","name":"Треки"}]}',
    '</script>',
  ].join('\n');

  const pagination = [
    '<nav class="ui-pagination" aria-label="Постраничная навигация">',
    '  <a class="ui-pagination__arrow" href="/vacancies/?page=1" aria-label="Предыдущая страница"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"></svg></a>',
    '  <a class="ui-pagination__page" href="/vacancies/?page=1" aria-label="Страница 1">1</a>',
    '  <span class="ui-pagination__page" aria-current="page">2</span>',
    '  <a class="ui-pagination__page" href="/vacancies/?page=3" aria-label="Страница 3">3</a>',
    '  <a class="ui-pagination__arrow" href="/vacancies/?page=3" aria-label="Следующая страница"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"></svg></a>',
    '</nav>',
  ].join('\n');

  const formErrors = [
    '<div class="ui-form__summary" id="apply-summary" role="alert" tabindex="-1">',
    '  <h2 class="ui-h4 ui-form__summary-title">В форме 1 ошибка</h2>',
    '  <ul class="ui-form__summary-list">',
    '    <li><a class="ui-link" href="#apply-EMAIL">Укажите e-mail</a></li>',
    '  </ul>',
    '</div>',
    '<script>',
    '(function () {',
    '  var el = document.getElementById("apply-summary");',
    "  if (el && !el.hidden && typeof el.focus === 'function') {",
    '    el.focus();',
    '  }',
    '})();',
    '</script>',
    '<div class="ui-field ui-field--error ui-field--required">',
    '  <label class="ui-field__label" for="apply-EMAIL">E-mail</label>',
    '  <input class="ui-field__input" type="email" id="apply-EMAIL" name="EMAIL" value="" aria-invalid="true" aria-describedby="apply-EMAIL-error">',
    '  <p class="ui-field__error" id="apply-EMAIL-error" role="alert">Укажите e-mail</p>',
    '</div>',
  ].join('\n');

  const cleanStand = [
    '<!DOCTYPE html>',
    '<html lang="ru">',
    '<head>',
    '<meta charset="utf-8">',
    '<link rel="preload" href="/local/ui/0.1.0/fonts/golos-400-cyr.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="/local/ui/0.1.0/fonts/golos-500-cyr.woff2" as="font" type="font/woff2" crossorigin>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Чистый стенд подключения irao-ui (T11.1)</title>',
    '</head>',
    '<body>',
    skipLinkLine,
    '<main id="main" tabindex="-1">',
    '<h1>Вакансии</h1>',
    breadcrumbs,
    jsonDataScript,
    '<form class="ui-form" method="post" action="/local/ajax/apply.php">',
    formErrors,
    '<button class="ui-button ui-button--primary" type="submit">Отправить</button>',
    '</form>',
    pagination,
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');

  /** Тема (theme-connect.php): тот же каркас, атрибут data-ui-theme на <html>. */
  const themedStand = cleanStand.replace(
    '<html lang="ru">',
    '<html lang="ru" data-ui-theme="corp">',
  );

  let report;
  let themedReport;

  beforeAll(async () => {
    const validator = new HtmlValidate(config);
    report = await validator.validateString(cleanStand);
    themedReport = await validator.validateString(themedStand);
  });

  it('страница из вывода сниппетов валидна html-validate с конфигом репозитория', () => {
    const messages = (report.results[0]?.messages ?? []).map(
      (m) => `${m.ruleId} [${m.severity}] ${m.message}`,
    );
    expect(report.valid, `html-validate: ${messages.join('; ') || 'чисто'}`).toBe(true);
    expect(messages, 'без предупреждений (полная чистота стенда)').toEqual([]);
  });

  it('стенд с атрибутом темы (theme-connect) валиден так же', () => {
    const messages = (themedReport.results[0]?.messages ?? []).map((m) => m.ruleId);
    expect(themedReport.valid, messages.join('; ') || 'чисто').toBe(true);
  });

  it('фикстуры неотрывны от PHP-исходников (маркеры синхрона)', () => {
    // header-php: строка skip-link в фикстуре — байт-в-байт строка сниппета.
    expect(headerPhp).toContain(skipLinkLine);
    // header-php: preload-ссылки фикстуры — шаблон сниппета с подставленной версией.
    expect(headerPhp).toContain('/local/ui/<?= UI_VERSION ?>/fonts/golos-400-cyr.woff2');
    expect(headerPhp).toContain('/local/ui/<?= UI_VERSION ?>/fonts/golos-500-cyr.woff2');
    // breadcrumbs: открывающий nav фикстуры — строка сниппета.
    const snippetNav = breadcrumbsPhpLine();
    expect(
      snippetNav,
      'строка \'<nav class="ui-breadcrumbs" aria-label=…\' в breadcrumbs.php',
    ).toBeTruthy();
    expect(breadcrumbs.startsWith(snippetNav)).toBe(true);
    // json-data: атрибут фикстуры — вывод sprintf-паттерна сниппета ('tabs').
    expect(jsonData).toContain("sprintf('data-ui-%s-data'");
    expect(jsonDataScript).toContain('data-ui-tabs-data');
    // form-error-render: summary/ошибка/фокус фикстуры — строки сниппета.
    const formSnippet = read('bitrix', 'snippets', 'form-error-render.php');
    expect(formSnippet).toContain('ui-form__summary" id="%s" role="alert" tabindex="-1"');
    expect(formSnippet).toContain('var el = document.getElementById(%s);');
    // pagination: классы стрелки/страниц фикстуры — строки сниппета.
    const paginationSnippet = read('bitrix', 'snippets', 'pagination.php');
    expect(paginationSnippet).toContain('ui-pagination__arrow');
    expect(paginationSnippet).toContain('aria-current="page"');
    // theme-connect: атрибут фикстуры — вывод irao_ui_theme_attr('corp').
    expect(themeConnect).toContain('data-ui-theme="%s"');
    expect(themedStand).toContain('data-ui-theme="corp"');
  });

  /** Первая строка nav в breadcrumbs.php — источник открывающего тега фикстуры. */
  function breadcrumbsPhpLine() {
    const source = read('bitrix', 'snippets', 'breadcrumbs.php');
    const line = source.split('\n').find((l) => l.includes('\'<nav class="ui-breadcrumbs"'));
    return line?.trim().replace(/^.*?'(?<html><nav[^']*)'.*$/s, '$<html>');
  }
});
