#!/usr/bin/env node
/**
 * Контраст-гейт AA (задача T2.3) — CI-шаг, mandatory PR-гейт (06 §7).
 *
 * Разбирает tokens/primitives.css + tokens/semantic.css, по конфигу пар
 * «использование → фон» (tests/contrast/pairs.config.mjs) вычисляет контраст
 * WCAG 2.1 и сверяет с порогами AA. Красный прогон дают:
 *  - AA-нарушения (пара ниже порога своего уровня);
 *  - пробелы покрытия (цветовой токен слоя 2 без пары и без исключения);
 *  - ошибки конфига (неизвестные/дублирующиеся токены, циклы var(), альфа
 *    без подложки в паре).
 *
 * Markdown-отчёт пишется ВСЕГДА (и при красном прогоне) — артефакт CI.
 *
 * Аргументы:
 *  --tokens <dir>    каталог токенов (по умолчанию <root>/tokens);
 *  --config <file>   файл конфига пар (по умолчанию tests/contrast/pairs.config.mjs);
 *  --report <file>   путь markdown-отчёта (по умолчанию dist/contrast-report.md).
 *
 * Выход: отчёт + сводка в stdout; код 0 — все пары ≥ порогов, покрытие полное;
 * 1 — нарушения/пробелы/ошибки конфига.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { declarationsFromTokenFile, evaluateContrast, THRESHOLDS } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @returns {{ tokens: string, config: string, report: string }} */
function parseArgs(argv) {
  const options = {
    tokens: join(root, 'tokens'),
    config: join(root, 'tests/contrast/pairs.config.mjs'),
    report: join(root, 'dist/contrast-report.md'),
  };
  for (let i = 2; i < argv.length; i += 2) {
    const flag = argv[i];
    const key = typeof flag === 'string' ? flag.slice(2) : '';
    if (!(key in options) || argv[i + 1] === undefined) {
      throw new Error(
        `неизвестный или неполный аргумент: ${flag} (доступны: --tokens --config --report)`,
      );
    }
    options[key] = isAbsolute(argv[i + 1]) ? argv[i + 1] : join(root, argv[i + 1]);
  }
  return options;
}

const ratioText = (ratio) => `${ratio.toFixed(2)}:1`;

/** Markdown-отчёт прогона (артефакт CI). */
function renderReport({ result, tokensDir, configFile }) {
  const lines = [
    '# Контраст-отчёт irao-ui (WCAG 2.1 AA — 1.4.3, 1.4.11)',
    '',
    `- Токены: \`${tokensDir}\` (слой 1 + слой 2, var()-цепочки resolve до примитивов)`,
    `- Конфиг: \`${configFile}\``,
    `- Пороги: обычный текст ≥ ${THRESHOLDS.text}:1, крупный ≥ ${THRESHOLDS.large}:1, некстовые ≥ ${THRESHOLDS['non-text']}:1`,
    `- Проверено пар: ${result.rows.length}; AA-нарушений: ${result.violations.length}; исключений: ${result.exceptions.length}`,
    `- Покрытие: каждый цветовой токен слоя 2 — в паре или в осознанном исключении (пробелов: ${result.coverageGaps.length})`,
    '',
    '## Пары «использование → фон»',
    '',
    '| Использование | fg | bg | Контраст | Порог | Статус |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of result.rows) {
    lines.push(
      `| ${row.id} — ${row.usage} | \`${row.fgToken}\` ${row.fgValue} | \`${row.bgToken}\` ${row.bgValue} | ${ratioText(row.ratio)} | ${row.threshold} | ${row.pass ? 'OK' : '**FAIL**'} |`,
    );
  }
  lines.push(
    '',
    '## Исключения (осознанные, с обоснованием)',
    '',
    '| Токен | Обоснование |',
    '| --- | --- |',
  );
  for (const exception of result.exceptions) {
    lines.push(`| \`${exception.token}\` | ${exception.reason} |`);
  }
  if (result.violations.length) {
    lines.push(
      '',
      '## AA-НАРУШЕНИЯ',
      '',
      '| Пара | fg | bg | Фактический | Порог |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const row of result.violations) {
      lines.push(
        `| ${row.id} | \`${row.fgToken}\` ${row.fgValue} | \`${row.bgToken}\` ${row.bgValue} | ${ratioText(row.ratio)} | ${row.threshold} |`,
      );
    }
  }
  if (result.coverageGaps.length) {
    lines.push(
      '',
      '## Пробелы покрытия (цветовой токен слоя 2 без пары и без исключения)',
      '',
      ...result.coverageGaps.map((name) => `- \`${name}\``),
    );
  }
  if (result.configErrors.length) {
    lines.push('', '## Ошибки конфига', '', ...result.configErrors.map((error) => `- ${error}`));
  }
  return lines.join('\n');
}

const options = parseArgs(process.argv);

const primitives = declarationsFromTokenFile(
  readFileSync(join(options.tokens, 'primitives.css'), 'utf8'),
  'primitive',
);
const semantic = declarationsFromTokenFile(
  readFileSync(join(options.tokens, 'semantic.css'), 'utf8'),
  'semantic',
);
const { PAIRS, EXCEPTIONS } = await import(pathToFileURL(options.config).href);

const result = evaluateContrast({ primitives, semantic, pairs: PAIRS, exceptions: EXCEPTIONS });

mkdirSync(dirname(options.report), { recursive: true });
writeFileSync(
  options.report,
  `${renderReport({ result, tokensDir: options.tokens, configFile: options.config })}\n`,
);

console.log('== Контраст-гейт AA (T2.3) ==');
console.log(
  `пар: ${result.rows.length}; AA-нарушений: ${result.violations.length}; пробелов покрытия: ` +
    `${result.coverageGaps.length}; ошибок конфига: ${result.configErrors.length}`,
);
for (const row of result.violations) {
  console.log(
    `FAIL ${row.id}: ${row.fgToken} ${row.fgValue} на ${row.bgToken} ${row.bgValue} = ` +
      `${ratioText(row.ratio)} < ${row.threshold}:1`,
  );
}
for (const gap of result.coverageGaps) {
  console.log(`FAIL coverage: цветовой токен ${gap} без пары и без исключения`);
}
for (const error of result.configErrors) {
  console.log(`FAIL config: ${error}`);
}
console.log(`отчёт: ${options.report}`);

if (result.violations.length || result.coverageGaps.length || result.configErrors.length) {
  console.log('RESULT: AA-НАРУШЕНИЯ — гейт красный (см. отчёт)');
  process.exit(1);
}
console.log('RESULT: OK — все проверенные пары ≥ порогов AA');
