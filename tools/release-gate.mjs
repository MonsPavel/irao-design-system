#!/usr/bin/env node
/**
 * Релизный гейт (T12.1) — CLI поверх tools/release-gate-lib.mjs (юнит-пин —
 * tests/unit/release-gate.test.js).
 *
 * Проверяет для тега релиза:
 *   1. запись в CHANGELOG.md (Keep a Changelog, ADR-0007) — нет записи →
 *      релиз красный;
 *   2. версию package.json = тегу (баннеры dist = тег — T1.3, автобампа нет).
 *
 * Шаг джобы gates release.yml (блокирующий, только на тегах
 * `refs/tags/v*`; репетиция workflow_dispatch гейт тега пропускает).
 * Режим --extract печатает тело записи тега — release notes GitHub Release
 * (джоба release перед `gh release create --notes-file`): публикация без
 * записи changelog невозможна по построению.
 *
 * Аргументы:
 *  --tag <vX.Y.Z>    тег релиза (дефолт — env GITHUB_REF_NAME: на CI это ref,
 *                    локально задаётся явно);
 *  --changelog <p>   путь CHANGELOG.md (дефолт <root>/CHANGELOG.md);
 *  --package <p>     путь package.json (дефолт <root>/package.json);
 *  --extract         печатать тело записи тега (release notes) вместо сводки.
 *
 * Выход: код 0 — гейт пройден (или notes напечатаны); 1 — гейт не пройден
 * (список причин в stdout); 2 — ошибки вызова/чтения.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateRelease, extractReleaseNotes } from './release-gate-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = {
    tag: process.env.GITHUB_REF_NAME ?? '',
    changelog: join(root, 'CHANGELOG.md'),
    package: join(root, 'package.json'),
    extract: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--extract') {
      options.extract = true;
      continue;
    }
    const value = argv[i + 1];
    if ((flag === '--tag' || flag === '--changelog' || flag === '--package') && value) {
      const key = flag.slice(2);
      // --tag — имя тега, не путь; --changelog/--package — пути (относительные
      // разрешаются от корня репозитория, как в tests/a11y/protocol-gate.mjs).
      options[key] = key === 'tag' ? value : isAbsolute(value) ? value : join(root, value);
      i += 1;
      continue;
    }
    throw new Error(
      `неизвестный или неполный аргумент: «${flag}» (доступны: --tag --changelog --package --extract)`,
    );
  }
  return options;
}

function readText(path, what) {
  if (!existsSync(path)) return '';
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`release-gate: не удалось прочитать ${what} (${path}): ${err.message}`);
    process.exit(2);
  }
}

try {
  const options = parseArgs(process.argv);
  const changelog = readText(options.changelog, 'CHANGELOG.md');
  let pkgVersion = '';
  try {
    pkgVersion = JSON.parse(readText(options.package, 'package.json')).version ?? '';
  } catch {
    pkgVersion = ''; // пакет не читается — гейт сообщит о несовпадении
  }

  const result = evaluateRelease(options.tag, changelog, pkgVersion);

  if (options.extract) {
    const notes = extractReleaseNotes(changelog, options.tag);
    if (!result.ok) {
      console.error('== ГЕЙТ РЕЛИЗА НЕ ПРОЙДЕН (извлечение notes отменено) ==');
      for (const error of result.errors) console.log(`FAIL: ${error}`);
      process.exit(1);
    }
    if (!notes.ok) {
      console.error(`== RELEASE NOTES: ${notes.errors.join('; ')} ==`);
      process.exit(1);
    }
    process.stdout.write(`${notes.notes}\n`);
    process.exit(0);
  }

  console.log('== Релизный гейт (T12.1: changelog ADR-0007 + версия = тегу T1.3) ==');
  console.log(`тег: ${options.tag || '— (не задан)'}`);
  console.log(`changelog: ${options.changelog}`);
  console.log(`версия package.json: ${pkgVersion || '— (не читается)'}`);
  for (const error of result.errors) console.log(`FAIL: ${error}`);
  if (!result.ok) {
    console.log('RESULT: РЕЛИЗ ЗАБЛОКИРОВАН — см. FAIL выше');
    process.exit(1);
  }
  console.log('RESULT: гейт пройден');
  process.exit(0);
} catch (err) {
  console.error(`release-gate: ${err.message}`);
  process.exit(2);
}
