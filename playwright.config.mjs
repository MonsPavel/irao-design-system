/**
 * Playwright-харнесс irao-ui (задача T1.4; 02-architecture §9, ADR-0004).
 *
 * Проекты:
 *  - `chromium` — PR-проект: `npm test` гоняет только его (матрица PR —
 *    chromium, 02-architecture §10);
 *  - `firefox`, `webkit` — матрица nightly/release: `npm run test:matrix`
 *    (браузеры ставятся `npx playwright install firefox webkit`).
 *
 * Сервер: локальный `showcase/serve.mjs` (без кэша) на корне репозитория;
 * тесты ходят по сгенерированному полигону `/showcase/dist/`. Сборка полигона —
 * не здесь, а в скриптах `test`/`test:matrix`/`test:docker` (в контейнере
 * сборка выполняется на хосте: esbuild — платформенный бинарник).
 *
 * Скриншот-эталоны (ADR-0004): пишутся только в окружении создания —
 * контейнере/CI (`IRAO_SNAPSHOTS=1`, см. tests/helpers/harness.js) — в
 * tests/visual/__screenshots__/<spec>/<name>--<viewport>.png; порог сравнения
 * нулевой: контейнер-паритет даёт бинарное совпадение, любой дифф значим.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT) || 8080;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // Только spec-файлы харнесса: lint-cases — не тесты, unit появится в T1.6.
  testMatch: '**/*.spec.js',
  // Гейт масштабирования T3.6 (tests/e2e/scaling.spec.js) — ночной/релизный,
  // не PR (решение спеки T3.6: «в nightly и релизе, не в PR (скорость)»):
  // PR-джобы ci.yml e2e/visual стартуют с IRAO_SCALING=off и спек исключается;
  // ночные/релизные матрицы и локальные прогоны (npm test, test:matrix) гоняют
  // его всегда. Пины — tests/unit/scaling.test.js.
  testIgnore: process.env.IRAO_SCALING === 'off' ? '**/scaling.spec.js' : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: 'test-results',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    // Страницы на русском; фиксация локали делает форматирование дат/чисел
    // одинаковым во всех окружениях (маскировка дат — FIXED_TIME в харнессе).
    locale: 'ru-RU',
    trace: 'retain-on-failure',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Контейнер-паритет (ADR-0004) даёт бинарное совпадение — порог нулевой.
      threshold: 0,
      maxDiffPixels: 0,
      maxDiffPixelRatio: 0,
    },
  },
  // Эталоны — в tests/visual/ (каталог эталонов по 02-architecture §7),
  // независимо от того, из какого каталога запущен тест.
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{testFileName}/{arg}{ext}',
  webServer: {
    command: 'node showcase/serve.mjs',
    url: `${baseURL}/showcase/dist/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Матрица nightly/release (02-architecture §10): не участвует в PR-гейте.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
