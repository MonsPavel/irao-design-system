#!/usr/bin/env node
/**
 * Негативные тесты конфигов линтеров (T1.2, «Testing requirements»).
 *
 * Каждый файл tests/lint-cases/ сопоставлен ожиданию:
 *   expect: 'pass'          — линтер молчит (позитивный контроль исключений:
 *                             hex в tokens/primitives.css, !important в a11y/vi.css);
 *   expect: 'fail', rules   — линтер обязан поймать КАЖДОЕ из перечисленных
 *                             правил с указанной severity ('error'|'warning').
 *
 * Фикстуры исключены из обычного `npm run lint` (см. tests/lint-cases/README.md);
 * единственный их потребитель — этот скрипт (`npm run test:lint`).
 *
 * Выход: отчёт в stdout; код 0 — все ожидания совпали, 1 — расхождения.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = path.join(root, 'tests', 'lint-cases');

/**
 * Реестр ожиданий. Новая фикстура = новая строка здесь + файл в tests/lint-cases/.
 * Поле `rules` — идентификаторы правил линтера (не сообщения).
 */
const EXPECTATIONS = [
  // stylelint: БЭМ, hex-гейт, !important, outline, порядок свойств
  {
    file: 'css/components/ui-button/btn.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['plugin/selector-bem-pattern'],
  },
  {
    file: 'css/components/ui-card/hex.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['scale-unlimited/declaration-strict-value'],
  },
  {
    // Ревью T1.2 (high): сырой hex в цветоносном шорткате background.
    file: 'css/components/ui-card/hex-in-background.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['scale-unlimited/declaration-strict-value'],
  },
  {
    // Ревью T1.2 (high): сырой hex в кастом-свойстве с «color» в имени.
    // declaration-strict-value кастом-свойства не проверяет вовсе —
    // ловит гейт declaration-property-value-allowed-list.
    file: 'css/components/ui-card/hex-in-custom-prop.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['declaration-property-value-allowed-list'],
  },
  {
    // Ревью T1.2 (high): шорткаты из токенов — ложных срабатываний нет.
    file: 'css/components/ui-badge/valid-shorthands.css',
    tool: 'stylelint',
    expect: 'pass',
  },
  {
    // Ревью T1.2 (high, регрессия d8c71fa): сброс тени `none` — не цвет.
    file: 'css/components/ui-badge/shadow-reset.css',
    tool: 'stylelint',
    expect: 'pass',
  },
  {
    file: 'css/components/ui-modal/outline-none.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: [['declaration-property-value-disallowed-list', 'warning']],
  },
  {
    // T2.2: компонент читает примитив напрямую — гейт «компонент читает
    // только слой 2» (ADR-0009, AC T2.2).
    file: 'css/components/ui-button/primitive-ref.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['irao/no-primitive-token-references'],
  },
  {
    file: 'css/components/ui-link/order.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['order/properties-order'],
  },
  {
    file: 'css/base/important.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['declaration-no-important'],
  },
  { file: 'css/tokens/primitives.css', tool: 'stylelint', expect: 'pass' },
  {
    // T2.2: позитивный контроль — semantic.css ссылается на примитивы
    // легитимно (запрет снят только для tokens/).
    file: 'css/tokens/semantic.css',
    tool: 'stylelint',
    expect: 'pass',
  },
  { file: 'css/a11y/vi.css', tool: 'stylelint', expect: 'pass' },
  {
    // T2.4: тема переопределяет примитив (слой 1), несуществующий токен,
    // обычное свойство, селектор компонента — гейт «тема переопределяет
    // только семантический слой» (Implementation requirements T2.4 п.1).
    file: 'css/themes/theme-invalid.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['irao/theme-semantic-overrides'],
  },
  {
    // T2.4: позитивный контроль — валидная «старая» тема (подмножество
    // семантических токенов, значения — ссылки на примитивы). Двойная роль:
    // фикстура совместимости «старая тема + новый токен» (tests/unit/themes.test.js).
    file: 'css/themes/theme-old-compat.css',
    tool: 'stylelint',
    expect: 'pass',
  },
  {
    // Ревью T2.4 (high): сырой rgba/hex в НЕ-цветовом токене темы (тень).
    // Гейт обязан требовать для --ui-shadow-* целый var()-токен или none —
    // иначе сырой цвет утекает в рендер мимо инварианта «hex вне primitives».
    file: 'css/themes/theme-shadow-raw.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['irao/theme-semantic-overrides'],
  },
  // T2.5: mobile-first-гейт медиазапросов. Шкала — константа BREAKPOINTS
  // в stylelint.config.mjs (один источник, дока ссылается:
  // docs/ui-system/architecture/responsive-approach.md); Testing requirements
  // T2.5 — 2 негативных + 5 позитивных значений шкалы.
  {
    // Файл с @media (max-width: 767px) — desktop-first, красный.
    file: 'css/components/ui-card/media-max-width.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['media-feature-name-disallowed-list'],
  },
  {
    // Файл с @media (min-width: 999px) — вне шкалы, красный.
    file: 'css/components/ui-card/media-off-scale.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: ['media-feature-name-value-allowed-list'],
  },
  {
    // Позитивный контроль: все 5 значений шкалы (480/768/1024/1280/1440)
    // в одном файле — гейт молчит.
    file: 'css/components/ui-badge/media-scale.css',
    tool: 'stylelint',
    expect: 'pass',
  },
  // eslint: eqeqeq; шаблон модуля — чист; запрет глобалов
  { file: 'js/eqeq.js', tool: 'eslint', expect: 'fail', rules: ['eqeqeq'] },
  {
    file: 'js/implicit-global.js',
    tool: 'eslint',
    expect: 'fail',
    rules: ['no-implicit-globals'],
  },
  { file: 'js/valid-module.js', tool: 'eslint', expect: 'pass' },
  // html-validate: alt, один h1, label, tabindex; эталонная страница — чиста
  { file: 'html/img-without-alt.html', tool: 'html', expect: 'fail', rules: ['wcag/h37'] },
  { file: 'html/two-h1.html', tool: 'html', expect: 'fail', rules: ['irao/one-h1'] },
  {
    file: 'html/positive-tabindex.html',
    tool: 'html',
    expect: 'fail',
    rules: ['irao/no-positive-tabindex'],
  },
  {
    file: 'html/input-without-label.html',
    tool: 'html',
    expect: 'fail',
    rules: ['input-missing-label'],
  },
  { file: 'html/valid-page.html', tool: 'html', expect: 'pass' },
];

/** @returns {Map<string, Array<{ruleId: string, severity: string|number, message: string}>>} */
async function lintWithStylelint(files) {
  // stylelint 17: ESM-экспорт — API в default (named export `lint` отсутствует).
  const stylelint = (await import('stylelint')).default;
  const configModule = await import(pathToFileURL(path.join(root, 'stylelint.config.mjs')).href);

  const result = await stylelint.lint({ files, config: configModule.default, configBasedir: root });

  const messagesByFile = new Map();
  for (const fileResult of result.results) {
    messagesByFile.set(
      path.resolve(fileResult.source ?? ''),
      fileResult.warnings.map((w) => ({ ruleId: w.rule, severity: w.severity, message: w.text })),
    );
  }
  return messagesByFile;
}

/** @returns {Map<string, Array<{ruleId: string, severity: number, message: string}>>} */
async function lintWithEslint(files) {
  const { ESLint } = await import('eslint');
  const { configForLintCases } = await import(
    pathToFileURL(path.join(root, 'eslint.config.mjs')).href
  );

  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [configForLintCases],
  });
  const results = await eslint.lintFiles(files.map((f) => path.relative(root, f)));

  const messagesByFile = new Map();
  for (const fileResult of results) {
    messagesByFile.set(
      path.resolve(fileResult.filePath),
      fileResult.messages.map((m) => ({
        ruleId: m.ruleId,
        severity: m.severity,
        message: m.message,
      })),
    );
  }
  return messagesByFile;
}

/** @returns {Map<string, Array<{ruleId: string, severity: number, message: string}>>} */
async function lintWithHtmlValidate(files) {
  const { HtmlValidate } = require('html-validate');
  const config = require(path.join(root, '.htmlvalidate.js'));
  const htmlvalidate = new HtmlValidate(config);

  const messagesByFile = new Map();
  for (const file of files) {
    const report = await htmlvalidate.validateFile(file);
    const messages = report.results.flatMap((r) => r.messages);
    messagesByFile.set(
      path.resolve(file),
      messages.map((m) => ({ ruleId: m.ruleId, severity: m.severity, message: m.message })),
    );
  }
  return messagesByFile;
}

const severityName = (s) => (s === 1 || s === 'warning' ? 'warning' : 'error');

let failures = 0;
const report = (line) => {
  console.log(line);
  if (line.startsWith('FAIL') || line.startsWith('ERROR')) failures += 1;
};

const groups = {
  stylelint: EXPECTATIONS.filter((e) => e.tool === 'stylelint'),
  eslint: EXPECTATIONS.filter((e) => e.tool === 'eslint'),
  html: EXPECTATIONS.filter((e) => e.tool === 'html'),
};

const linters = {
  stylelint: lintWithStylelint,
  eslint: lintWithEslint,
  html: lintWithHtmlValidate,
};

for (const [tool, expectations] of Object.entries(groups)) {
  if (!expectations.length) continue;
  const absFiles = expectations.map((e) => path.join(casesDir, e.file));
  let messagesByFile;
  try {
    messagesByFile = await linters[tool](absFiles);
  } catch (err) {
    for (const e of expectations) {
      report(`ERROR ${tool} ${e.file}: линтер не запустился: ${err.message.split('\n')[0]}`);
    }
    continue;
  }

  for (const expectation of expectations) {
    const absFile = path.join(casesDir, expectation.file);
    const messages = messagesByFile.get(absFile) ?? [];
    const digest = messages.map(
      (m) => `    ${m.ruleId} [${severityName(m.severity)}] ${m.message.split('\n')[0]}`,
    );

    if (expectation.expect === 'pass') {
      if (messages.length === 0) {
        report(`OK   (pass) ${tool} ${expectation.file}`);
      } else {
        report(
          `FAIL (pass) ${tool} ${expectation.file}: ожидали чистый прогон, получили замечания:`,
        );
        digest.forEach(report);
      }
      continue;
    }

    const missing = expectation.rules.filter((rule) => {
      const [ruleId, severity] = Array.isArray(rule) ? rule : [rule, 'error'];
      return !messages.some((m) => m.ruleId === ruleId && severityName(m.severity) === severity);
    });

    if (missing.length === 0) {
      report(`OK   (fail) ${tool} ${expectation.file}`);
      const unexpected = messages.filter((m) => !expectation.rules.flat().includes(m.ruleId));
      if (unexpected.length) {
        console.log(`     … попутные замечания (не влияют на вердикт):`);
        unexpected.forEach((m) =>
          console.log(
            `       ${m.ruleId} [${severityName(m.severity)}] ${m.message.split('\n')[0]}`,
          ),
        );
      }
    } else {
      report(
        `FAIL (fail) ${tool} ${expectation.file}: не пойманы: ${missing.map((m) => (Array.isArray(m) ? m.join('@') : m)).join(', ')}`,
      );
      digest.forEach(report);
    }
  }
}

// == Разделение сред eslint (DoD T1.2: «env browser + jsdom (тесты)», запрет
// глобалов) ==
// Проверяется ГЛАВНЫЙ конфиг (default export eslint.config.mjs), а не
// configForLintCases: гейт no-implicit-globals работает только в
// sourceType 'script', поэтому регрессия «блок testScripts перебивает среду
// всем файлам» ловится здесь, на resolve-поведении основного конфига.
// История: negated-паттерн в `files` (['tests/**/*.js', '!tests/lint-cases/**'])
// в ESLint 10 не исключает файлы — блок матчит всё, и стоя последним,
// sourceType 'module' побеждал для всех .js; исключение внутри блока —
// через блок-level `ignores` (документированный механизм).
{
  const { ESLint } = await import('eslint');
  const mainEslint = new ESLint({ cwd: root });

  const sourceTypeChecks = [
    {
      name: 'компонентный скрипт — классический (script)',
      file: 'components/example/example.js',
      expected: 'script',
    },
    {
      name: 'unit-тест под jsdom — модуль',
      file: 'tests/unit/example.test.js',
      expected: 'module',
    },
    { name: 'инструмент репозитория — модуль', file: 'tools/example.mjs', expected: 'module' },
  ];
  for (const check of sourceTypeChecks) {
    const config = await mainEslint.calculateConfigForFile(check.file);
    const actual = config?.languageOptions?.sourceType;
    if (actual === check.expected) {
      report(`OK   (config) eslint ${check.name}`);
    } else {
      report(
        `FAIL (config) eslint ${check.name}: ожидали sourceType '${check.expected}', получили '${actual}'`,
      );
    }
  }

  const leakResult = await mainEslint.lintText('var globalLeak = 2;\n', {
    filePath: 'components/example/example.js',
  });
  const leakRules = leakResult[0].messages.map((m) => m.ruleId);
  if (leakRules.includes('no-implicit-globals')) {
    report('OK   (config) eslint no-implicit-globals ловит глобальную var в компонентном скрипте');
  } else {
    report(
      `FAIL (config) eslint no-implicit-globals не сработал на глобальной var в компонентном скрипте (получили: ${leakRules.join(', ') || 'ничего'})`,
    );
  }
}

console.log('== SUMMARY ==');
console.log(
  failures === 0 ? 'RESULT: все ожидания lint-cases совпали' : `RESULT: расхождений: ${failures}`,
);
process.exit(failures === 0 ? 0 : 1);
