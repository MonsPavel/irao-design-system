/**
 * Реальная сборка для юнит-тестов, которым нужны артефакты dist (T2.2 —
 * tokens-stand.test.js, T2.4 — themes.test.js): оба файла в beforeAll порождают
 * `node showcase/build.mjs`, а Vitest гоняет файлы параллельными воркерами —
 * rmSync одного билдера попадал в окно чтения другого (флак ENOENT на
 * dist/ui-core.min.css и showcase/dist/stands/tokens.html; воспроизведено и
 * локализовано при ревью-фиксе T10.1).
 *
 * Два механизма (T13.7 — «единственный билд на прогон»):
 *  1. ШТАМП-мемоизация: после успешной сборки пишется штамп
 *     node_modules/.irao-unit-build.stamp; воркер пропускает сборку, если
 *     штамп свежее НОВЕЙШЕГО mtime исходников (make-style freshness — dist
 *     актуален, пересборка не нужна). Итог: ОДНА сборка на npm run test:unit
 *     вместо двух (быстрее) и нет rmSync под читающим воркером (флак устранён
 *     по построению, а не только сужен).
 *  2. Лок на файле: создание openSync(LOCK, 'wx') атомарно — параллельные
 *     первые воркеры (штампа ещё нет) собирают строго по очереди; проверка
 *     свежести штампа повторяется ВНУТРИ лока. Страхователь от протухшего
 *     замка (убитый процесс): замок старше 5 минут считается брошенным.
 *
 * Гонка — между юнит-воркерами одного прогона (npm run test:unit); воркеры —
 * отдельные процессы (pool forks), поэтому внутрипроцессный mutex недостаточен.
 * Штамп и лок живут в node_modules (в git не входят).
 */
import { execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { execPath } from 'node:process';

const LOCK_FILENAME = '.irao-unit-build.lock';
const STAMP_FILENAME = '.irao-unit-build.stamp';
const LOCK_STALE_MS = 5 * 60_000;
const WAIT_STEP_MS = 250;
const WAIT_MAX_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Каталоги-артефакты/служебные: не источники сборки (после правки пересборка не нужна). */
const NON_SOURCE = new Set([
  '.git',
  '.zcode',
  'coverage',
  'coverage-json',
  'dist',
  'node_modules',
  'nul',
  'playwright-report',
  'test-results',
]);

/** Новейший mtime файлов дерева (источники сборки) — артефакты исключены. */
function latestSourceMtimeMs(dir) {
  let latest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (NON_SOURCE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, latestSourceMtimeMs(full));
    } else if (entry.isFile()) {
      latest = Math.max(latest, statSync(full).mtimeMs);
    }
  }
  return latest;
}

/** Свежесть сборки: штамп существует, новее новейшего исходника и ключевые
 *  артефакты на месте. Проверка артефактов — «самолечение»: при ручной чистке
 *  dist/showcase-dist между прогонами свежий штамп давал no-op и тесты падали
 *  ENOENT (T13.7-бэклог: штамп-мемоизация убила самолечение). */
function buildIsUpToDate(root, stampPath) {
  try {
    const artifactsExist =
      existsSync(join(root, 'dist', 'ui-core.min.css')) &&
      existsSync(join(root, 'showcase', 'dist', 'stands', 'tokens.html'));
    if (!artifactsExist) return false;
    return statSync(stampPath).mtimeMs > latestSourceMtimeMs(root);
  } catch {
    return false; // штампа нет — собираем
  }
}

function lockIsStale(lockPath) {
  try {
    return Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS;
  } catch {
    return false; // файла нет — снимать нечего
  }
}

async function acquire(lockPath) {
  const deadline = Date.now() + WAIT_MAX_MS;
  while (Date.now() < deadline) {
    if (existsSync(lockPath) && lockIsStale(lockPath)) {
      try {
        unlinkSync(lockPath);
      } catch {
        // снял параллельный ожидатель — попробуем захватить снова
      }
    }
    try {
      closeSync(openSync(lockPath, 'wx'));
      return;
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') throw error;
      await sleep(WAIT_STEP_MS);
    }
  }
  throw new Error(`unit-build: не дождались блокировки сборки (${lockPath})`);
}

/**
 * Гарантировать актуальные dist + showcase/dist: сборка ТОЛЬКО если штампа
 * нет или он старее исходников; иначе — no-op (артефакты уже на месте).
 * root — корень репозитория (у вызывающих тестов уже посчитан).
 */
export async function buildForUnitTests(root) {
  const lockPath = join(root, 'node_modules', LOCK_FILENAME);
  const stampPath = join(root, 'node_modules', STAMP_FILENAME);
  await acquire(lockPath);
  try {
    // Повторная проверка ВНУТРИ лока: пока ждали, параллельный воркер мог
    // собрать и оштамповать — второй раз rmSync+сборка не нужны.
    if (buildIsUpToDate(root, stampPath)) {
      return;
    }
    execFileSync(execPath, ['showcase/build.mjs'], { cwd: root, stdio: 'pipe' });
    writeFileSync(stampPath, String(Date.now()));
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      // замок уже снят страхователем
    }
  }
}
