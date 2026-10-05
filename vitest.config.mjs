/**
 * Vitest irao-ui — юнит-слой для DOM-независимой JS-логики (задача T1.6;
 * docs/02-architecture.md §9, «Unit JS — Vitest (+jsdom)»).
 *
 * Границы (конвенция — tests/README.md):
 *  - сюда: чистая логика модулей (парсинг, валидация, VI-состояния) и лёгкие
 *    DOM-проверки guard'ов (jsdom достаточен);
 *  - не сюда: DOM-поведение компонентов — это Playwright (T1.4), его конфиг
 *    ляжет рядом (playwright.config.mjs). Чтобы глоб-ы инструментов не
 *    пересекались: юнит-тесты живут ТОЛЬКО в каталоге tests/unit (include
 *    ниже), Playwright-сценарии — в tests/e2e/. T1.4 обязан ограничить свой
 *    testDir каталогом tests/e2e — дефолтный testMatch Playwright цепляет
 *    файлы *.test.js по всему репозиторию.
 *
 * environment 'jsdom' — на будущих потребителей (T5.5 валидация, T9.1 VI):
 * глобальные window/document для «чистая функция + лёгкая DOM-проверка».
 * Изолированные window/document на тест создаются в самих тестах через
 * `new JSDOM(...)` — нужно для проверки контракта module-template, где
 * readyState и набор элементов задаются per-test.
 *
 * Coverage-пороги сознательно не вводятся (Out of scope T1.6) — появятся,
 * когда будет что мерить.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
    // Тишина в выводе не нужна: CI nightly грузит лог как отчёт.
    reporters: ['default'],
  },
});
