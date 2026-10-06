#!/usr/bin/env node
/**
 * `npm run test:docker` — прогон Playwright в контейнере (задача T1.4, ADR-0004).
 *
 * Контракт контейнер-паритета: локально и в CI тесты выполняются в одном
 * официальном образе `mcr.microsoft.com/playwright:vX-jammy` (пин — в
 * package.json, поле iraoUi.playwrightImage, версия обязана совпадать с
 * версией @playwright/test). Эталоны, созданные здесь, бинарно совпадают с
 * CI — поэтому обёртка выставляет IRAO_SNAPSHOTS=1 (гейт записи эталонов,
 * tests/helpers/harness.js). Хост-прогоны `npm test` эталоны не пишут.
 *
 * Шаги:
 *  1. проверка инструмента (docker или podman) и соответствия версий
 *     образа и @playwright/test;
 *  2. `npm run build` НА ХОСТЕ — dist/showcase детерминированы (баннер
 *     версия+sha, без меток времени), а esbuild — платформенный бинарник,
 *     linux-версии в Windows-node_modules нет, поэтому внутри контейнера
 *     сборка не выполняется;
 *  3. контейнер с примонтированным репозиторием: `playwright test <аргументы>`.
 *
 * Аргументы передаются насквозь: `npm run test:docker -- --update-snapshots`
 * или `npm run test:docker -- tests/e2e/showcase-index.spec.js`.
 *
 * Лицензионная оговорка ADR-0004: Docker Desktop в крупной компании платен;
 * бесплатные пути — Podman или docker-ce в WSL2. Инструмент выбирается
 * автоматически (IRAO_CONTAINER_TOOL переопределяет), контракт один — образ.
 * Если контейнер недоступен — fallback: CI-джоба update-snapshots (T1.5).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'package.json'));

function fail(message) {
  console.error(`test:docker: ${message}`);
  process.exit(1);
}

function readPinnedImage() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const image = pkg.iraoUi?.playwrightImage;
  if (!image) fail('в package.json нет iraoUi.playwrightImage — пин образа обязателен (ADR-0004)');
  return image;
}

/** Пин не должен разойтись с версией Playwright: vX.Y.Z-jammy === @playwright/test. */
function assertImageMatchesPlaywright(image) {
  const tag = image.match(/:v(\d+\.\d+\.\d+)-/);
  const pwVersion = require('@playwright/test/package.json').version;
  if (!tag) fail(`тег образа «${image}» без версии vX.Y.Z-jammy`);
  if (tag[1] !== pwVersion) {
    fail(
      `версия образа ${tag[1]} не совпадает с @playwright/test ${pwVersion} — ` +
        'обновите их вместе (смена образа = перегенерация эталонов, ADR-0004)',
    );
  }
}

function detectTool() {
  const forced = process.env.IRAO_CONTAINER_TOOL;
  const candidates = forced ? [forced] : ['docker', 'podman'];
  for (const tool of candidates) {
    const probe = spawnSync(tool, ['--version'], { encoding: 'utf8', shell: false });
    if (probe.status === 0) return tool;
  }
  fail(
    'не найден docker/podman. Бесплатные пути — Podman Desktop или docker-ce в WSL2 ' +
      '(ADR-0004); пока контейнера нет, эталоны обновляет CI-джоба update-snapshots (T1.5)',
  );
}

console.log(`test:docker: сборка dist + showcase на хосте (детерминированная, без меток времени)`);
const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (build.status !== 0) fail('сборка не удалась — тесты в контейнере не запускались');

const image = readPinnedImage();
assertImageMatchesPlaywright(image);
const tool = detectTool();

const testArgs = process.argv.slice(2);
const args = [
  'run',
  '--rm',
  '--init',
  '--ipc=host', // рекомендация Playwright: маленький /dev/shm валит chromium
  '-e',
  'IRAO_SNAPSHOTS=1', // окружение создания эталонов (ADR-0004)
  '-v',
  `${ROOT}:/work`,
  '-w',
  '/work',
  ...(process.stdout.isTTY ? ['-t'] : []),
  image,
  'node',
  'node_modules/playwright/cli.js',
  'test',
  // PR-проект chromium — дефолт (ADR-0004: PR-матрица — chromium; эталоны
  // пишет только он). Аргументы насквозь, chromium добавляется, если проект
  // не указан явно:
  //   npm run test:docker                                → chromium
  //   npm run test:docker -- --update-snapshots          → chromium + перегенерация
  //   npm run test:docker -- --project=firefox           → матрица без chromium
  ...(testArgs.some((arg) => arg === '--project' || arg.startsWith('--project=') || arg === '-p')
    ? testArgs
    : [...testArgs, '--project=chromium']),
];

console.log(`test:docker: ${tool} run … ${image}`);
const run = spawnSync(tool, args, { cwd: ROOT, stdio: 'inherit', shell: false });
process.exit(run.status ?? 1);
