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
    file: 'css/components/ui-modal/outline-none.css',
    tool: 'stylelint',
    expect: 'fail',
    rules: [['declaration-property-value-disallowed-list', 'warning']],
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
  { file: 'css/a11y/vi.css', tool: 'stylelint', expect: 'pass' },
  // eslint: eqeqeq; шаблон модуля — чист
  { file: 'js/eqeq.js', tool: 'eslint', expect: 'fail', rules: ['eqeqeq'] },
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

console.log('== SUMMARY ==');
console.log(
  failures === 0 ? 'RESULT: все ожидания lint-cases совпали' : `RESULT: расхождений: ${failures}`,
);
process.exit(failures === 0 ? 0 : 1);
