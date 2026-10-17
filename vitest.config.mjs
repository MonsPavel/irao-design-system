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
 * Coverage-пороги сознательно не вводятся (Out of scope T1.6). Инструмент
 * появился с T13.4 (замечание бэклога T5.5 medium: AC «покрытие ≥ 90%» файла
 * задачи T5.5 не было измерено): `npm run test:coverage` меряет точечно
 * components/ui-form/ui-form.js — самый нагруженный JS-модуль системы; число
 * фиксируется в отчёте задачи (не гейт: порогов нет).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
    // Тишина в выводе не нужна: CI nightly грузит лог как отчёт.
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      // Точечное измерение (Scope T13.4): по модулю клиентской валидации.
      // Расширять — осознанно, с числом в отчёте соответствующей задачи.
      include: ['components/ui-form/ui-form.js'],
    },
  },
});
