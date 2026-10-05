#!/usr/bin/env node
/**
 * `npm run lint:html` — запуск html-validate по исходникам системы (T1.2).
 *
 * Почему не голый CLI: html-validate завершается ошибкой, если по globs нет
 * ни одного файла, а AC T1.2 требует
 * «npm run lint проходит на чистом репо без ошибок» — HTML-паттерны появятся
 * в T1.3+ (showcase). Обёртка ищет *.html в исходных каталогах и:
 *   — нет файлов → печатает пропуск и выходит 0;
 *   — есть → запускает html-validate CLI на найденных файлах.
 *
 * tests/lint-cases/** здесь НЕ проверяется: их гоняет tools/run-lint-cases.mjs
 * (см. tests/lint-cases/README.md). Конфиг правил — .htmlvalidate.js.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Исходные каталоги с разметкой системы (не доки, не фикстуры). */
const SOURCE_DIRS = [
  'a11y',
  'bitrix',
  'components',
  'docs/templates',
  'patterns',
  'showcase',
  'themes',
];

function findHtml(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findHtml(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const htmlFiles = SOURCE_DIRS.flatMap((dir) =>
  existsSync(join(root, dir)) ? findHtml(join(root, dir)) : [],
);

if (htmlFiles.length === 0) {
  console.log('html-validate: HTML-файлов в исходниках пока нет — пропуск (0 файлов).');
  process.exit(0);
}

const bin = join(root, 'node_modules', 'html-validate', 'bin', 'html-validate.js');
const result = spawnSync(process.execPath, [bin, ...htmlFiles.map((f) => relative(root, f))], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
