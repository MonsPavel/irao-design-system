#!/usr/bin/env node
/**
 * Ревизия контраста ПРОИЗВОДНЫХ состояний (задача T9.2) — CI-шаг/артефакт.
 *
 * Отдельный прогон к гейту T2.3 (tests/contrast/check.mjs): предмет — пары
 * «подпись/индикатор → фон состояния» (hover/active из токенов-пар и
 * color-mix-конвенции ADR-0010, фокус на тёмных поверхностях). Математика —
 * lib.mjs + derived-lib.mjs (mixInSrgb, округление 8 бит); конфиг —
 * tests/contrast/derived.config.mjs. Красный прогон дают только нарушения
 * БЕЗ осознанного исключения (Implementation requirements T9.2 п.2) и ошибки
 * конфига; известные разрывы одобренного дизайна (акцентный hover, hover
 * крошек, фокус на тёмном) — исключения с обоснованием, факт ratios виден в
 * отчёте.
 *
 * Markdown-отчёт пишется ВСЕГДА (и при красном прогоне) — артефакт CI и
 * evidence a11y-спринта (docs/ui-system/a11y/).
 *
 * Аргументы:
 *  --tokens <dir>    каталог токенов (по умолчанию <root>/tokens);
 *  --config <file>   файл конфига пар (по умолчанию tests/contrast/derived.config.mjs);
 *  --report <file>   путь markdown-отчёта (по умолчанию dist/derived-contrast-report.md).
 *
 * Выход: отчёт + сводка в stdout; код 0 — нарушения только в исключениях,
 * конфиг валиден; 1 — нарушения вне исключений / ошибки конфига.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { declarationsFromTokenFile, THRESHOLDS } from './lib.mjs';
import { evaluateDerivedContrast } from './derived-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @returns {{ tokens: string, config: string, report: string }} */
function parseArgs(argv) {
  const options = {
    tokens: join(root, 'tokens'),
    config: join(root, 'tests/contrast/derived.config.mjs'),
    report: join(root, 'dist/derived-contrast-report.md'),
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

/** Статус строки отчёта: OK / ИСКЛЮЧЕНИЕ / **FAIL**. */
const statusOf = (row) =>
  row.pass
    ? 'OK'
    : row.excepted
      ? `ИСКЛЮЧЕНИЕ (${ratioText(row.ratio)} < ${row.threshold})`
      : '**FAIL**';

/** Markdown-отчёт прогона (артефакт CI). */
function renderReport({ result, tokensDir, configFile }) {
  const lines = [
    '# Производные состояния: контраст-отчёт irao-ui (T9.2 — WCAG 1.4.3/1.4.11)',
    '',
    `- Токены: \`${tokensDir}\` (слой 1 + слой 2; color-mix — по конвенции ADR-0010: in srgb, 88%, black, округление 8 бит)`,
    `- Конфиг: \`${configFile}\``,
    `- Пороги: кнопочные подписи («крупные элементы» чек-листа T9.2) ≥ ${THRESHOLDS.large}:1, ссылки/крошки ≥ ${THRESHOLDS.text}:1, фокус ≥ ${THRESHOLDS['non-text']}:1`,
    `- Проверено пар: ${result.rows.length}; нарушений вне исключений: ${result.violations.length}; исключений: ${result.exceptionRows.length}`,
    '',
    '## Пары «подпись/индикатор → фон состояния»',
    '',
    '| Пара | fg | bg | Контраст | Порог | Статус |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of result.rows) {
    lines.push(
      `| ${row.id} | \`${row.fgValue}\` | \`${row.bgValue}\` | ${ratioText(row.ratio)} | ${row.threshold} | ${statusOf(row)} |`,
    );
  }
  lines.push(
    '',
    '### Использование пар',
    '',
    '| Пара | Уровень | Где живёт в системе |',
    '| --- | --- | --- |',
  );
  for (const row of result.rows) {
    lines.push(`| ${row.id} | ${row.level} | ${row.usage} |`);
  }
  lines.push(
    '',
    '## Исключения (осознанные, с обоснованием — Implementation requirements T9.2 п.2)',
    '',
    '| Пара | Обоснование |',
    '| --- | --- |',
  );
  const reasons = new Map(result.exceptionReasons);
  for (const row of result.exceptionRows) {
    lines.push(`| ${row.id} | ${reasons.get(row.id) ?? '—'} |`);
  }
  if (result.violations.length) {
    lines.push(
      '',
      '## НАРУШЕНИЯ (вне исключений — гейт красный)',
      '',
      '| Пара | fg | bg | Фактический | Порог |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const row of result.violations) {
      lines.push(
        `| ${row.id} | \`${row.fgValue}\` | \`${row.bgValue}\` | ${ratioText(row.ratio)} | ${row.threshold} |`,
      );
    }
  }
  if (result.configErrors.length) {
    lines.push('', '## Ошибки конфига', '', ...result.configErrors.map((error) => `- ${error}`));
  }
  lines.push(
    '',
    '## Границы гейта (осознанные)',
    '',
    '- alpha-производные (hover триггера ui-select — color-mix 55% transparent) не вычислимы без подложки: аффорданс контрола несёт базовый фон (пары T2.3), hover — усиливающий оттенок;',
    '- `color-mix(currentColor 88%, black)` в ui-alert — производная уже гейтнутой пары варианта на светлой поверхности: смешение к чёрному контраст только увеличивает;',
    '- базовые пары «использование → фон» — гейт T2.3 (`tests/contrast/check.mjs`, отчёт `dist/contrast-report.md`).',
    '',
  );
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
const { DERIVED_PAIRS, DERIVED_EXCEPTIONS } = await import(pathToFileURL(options.config).href);

const result = evaluateDerivedContrast({
  primitives,
  semantic,
  pairs: DERIVED_PAIRS,
  exceptions: DERIVED_EXCEPTIONS,
});
// Для отчёта нужны обоснования исключений из конфига (evaluate возвращает id).
result.exceptionReasons = DERIVED_EXCEPTIONS.map((e) => [e.id, e.reason]);

mkdirSync(dirname(options.report), { recursive: true });
writeFileSync(
  options.report,
  `${renderReport({ result, tokensDir: options.tokens, configFile: options.config })}\n`,
);

console.log('== Ревизия контраста производных состояний (T9.2) ==');
console.log(
  `пар: ${result.rows.length}; нарушений вне исключений: ${result.violations.length}; ` +
    `исключений: ${result.exceptionRows.length}; ошибок конфига: ${result.configErrors.length}`,
);
for (const row of result.violations) {
  console.log(
    `FAIL ${row.id}: ${row.fgValue} на ${row.bgValue} = ${ratioText(row.ratio)} < ` +
      `${row.threshold}:1`,
  );
}
for (const row of result.exceptionRows) {
  console.log(
    `ИСКЛЮЧЕНИЕ ${row.id}: ${ratioText(row.ratio)} < ${row.threshold}:1 — обоснование в конфиге`,
  );
}
for (const error of result.configErrors) {
  console.log(`FAIL config: ${error}`);
}
console.log(`отчёт: ${options.report}`);

if (result.violations.length || result.configErrors.length) {
  console.log('RESULT: НАРУШЕНИЯ — прогон красный (см. отчёт)');
  process.exit(1);
}
console.log('RESULT: OK — нарушения только в осознанных исключениях (обоснования в отчёте)');
