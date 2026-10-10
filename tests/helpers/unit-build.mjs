/**
 * Реальная сборка для юнит-тестов, которым нужны артефакты dist (T2.2 —
 * tokens-stand.test.js, T2.4 — themes.test.js): оба файла в beforeAll порождают
 * `node showcase/build.mjs`, а Vitest гоняет файлы параллельными воркерами —
 * rmSync одного билдера попадал в окно чтения другого (флак ENOENT на
 * dist/ui-core.min.css и showcase/dist/stands/tokens.html; воспроизведено и
 * локализовано при ревью-фиксе T10.1, без нового тест-файла T10.1 гонка
 * воспроизводится на main-поведении).
 *
 * Мьютекс на файле: создание openSync(LOCK, 'wx') атомарно — второй билдер
 * ждёт и собирает ПОСЛЕ первого (сборка идемпотентна, её повтор безопасен).
 * Страхователь от протухшего замка (убитый процесс): замок старше 5 минут
 * считается брошенным и снимается.
 *
 * Гонка — между юнит-воркерами одного прогона (npm run test:unit); воркеры —
 * отдельные процессы (pool forks), поэтому внутрипроцессный mutex недостаточен.
 */
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, openSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execPath } from 'node:process';

const LOCK_FILENAME = '.irao-unit-build.lock';
const LOCK_STALE_MS = 5 * 60_000;
const WAIT_STEP_MS = 250;
const WAIT_MAX_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Прогнать полную сборку (dist + showcase/dist) в исключительном доступе.
 * root — корень репозитория (у вызывающих тестов уже посчитан).
 */
export async function buildForUnitTests(root) {
  const lockPath = join(root, 'node_modules', LOCK_FILENAME);
  await acquire(lockPath);
  try {
    execFileSync(execPath, ['showcase/build.mjs'], { cwd: root, stdio: 'pipe' });
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      // замок уже снят страхователем
    }
  }
}
