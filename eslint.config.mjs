/**
 * eslint irao-ui — гейты JS (задача T1.2; docs/02-architecture.md §9, JS lint).
 *
 * Правила:
 *  - `js.configs.recommended` — базовый набор ошибок;
 *  - `eqeqeq` — строгое `===` (§9: «ошибки, ===»);
 *  - `no-implicit-globals` — запрет глобального scope: модуль объявляет только
 *    `window.IraoUI.<name>`, всё остальное — внутри IIFE (§2 принцип 1,
 *    контракт docs/templates/module-template.js — повторная инициализация и
 *    изоляция от legacy-скриптов сайтов).
 *
 * Среды (flat config: languageOptions.globals вместо env):
 *  - код компонентов — классические браузерные скрипты: система поставляется
 *    без транспиляции и без ES-модулей на сайтах (§1 принцип 2, §6.4 п.3);
 *  - tools/**, showcase/**, tests/contrast/** — Node + ESM (скрипты
 *    репозитория, dev-only);
 *  - tests/** — тестовый код: e2e Playwright-харнесс (браузерные глобалы,
 *    хелперам нужны и Node-глобалы process.env) и unit Vitest+jsdom
 *    (window/document из globals.browser; describe/it/expect — vitest).
 *
 * Нативный JS без TS — сознательное решение (docs/06-implementation-plan.md §7).
 *
 * Негативные фикстуры tests/lint-cases/** исключены из основного прогона
 * через global ignores (globalIgnores ниже); их линтит tools/run-lint-cases.mjs
 * через экспорт `configForLintCases` (единый источник правил — без дрейфа).
 */
import js from '@eslint/js';
import globals from 'globals';

const sharedRules = Object.freeze({
  ...js.configs.recommended.rules,
  eqeqeq: ['error', 'always'],
  'no-implicit-globals': 'error',
});

/**
 * Глобальные исключения (не линтим вовсе):
 *  - tests/lint-cases/** — негативные фикстуры, единственный их потребитель —
 *    tools/run-lint-cases.mjs (экспорт configForLintCases ниже). Global ignores
 *    в flat config абсолютны и не переопределяются дописыванием блоков —
 *    поэтому раннер грузит только configForLintCases (overrideConfigFile: true),
 *    и этот блок на него не действует;
 *  - машинные артефакты воркфлоу — зеркалит .gitignore;
 *  - dist/** и showcase/dist/** — машинный вывод build.mjs, не исходники
 *    (та же логика, что "!dist/**" в lint:css — гейты написаны для
 *    исходников). История: с T5.5 минификатор (esbuild compress) легально
 *    сжимает typeof/null-сравнения модулей до `'function'==typeof x` /
 *    `x!=null` — eqeqeq не должен оценивать бандл (ревью гейта
 *    `npm run build && npm run lint`, регрессия-пин — tests/unit/
 *    lint-artifacts.test.js).
 */
const globalIgnores = {
  ignores: [
    'tests/lint-cases/**',
    '**/.zcode/**',
    '**/.playwright-mcp/**',
    'dist/**',
    'showcase/dist/**',
  ],
};

/** Конфиги линтеров в корне: CJS-файлы (загрузчики исполняют их в CJS). */
const rootConfigs = {
  files: ['.htmlvalidate.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
    globals: { ...globals.node },
  },
  rules: sharedRules,
};

/**
 * Код компонентов: классический браузерный скрипт (IIFE, window.IraoUI).
 *
 * Ревью T1.2 (high): tests/** исключён блок-level `ignores`, а НЕ negated-
 * паттерном в `files` — в ESLint 10 negation в `files` не исключает файлы,
 * блок матчил всё, и стоя последним задавал sourceType 'module' всем .js,
 * делая no-implicit-globals инертным. `ignores` рядом с `files` —
 * документированный способ исключить пути из конкретного блока.
 */
const componentScripts = {
  files: ['**/*.js'],
  ignores: ['tests/**'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
    globals: { ...globals.browser },
  },
  rules: sharedRules,
};

/** Инструменты репозитория: Node + ESM. */
const toolingScripts = {
  files: ['tools/**/*.mjs', 'showcase/**/*.mjs', 'tests/contrast/**/*.mjs'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: { ...globals.node },
  },
  rules: sharedRules,
};

/** Тесты (с T1.4 — Playwright-харнесс; T1.6 добавит Vitest): модули, среда
 * браузер + Node. Node-глобалы нужны харнесс-хелперам (process.env
 * IRAO_SNAPSHOTS — гейт создания эталонов ADR-0004) и будущим unit-тестам
 * (jsdom-окружение Витеста живёт под Node). lint-cases исключены
 * globalIgnores (см. выше), поэтому negation здесь не нужен. */
const testScripts = {
  files: ['tests/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node },
  },
  rules: sharedRules,
};

/**
 * Негативные фикстуры: НЕ входят в default-экспорт (основной `eslint .`
 * их не видит), экспортируются для tools/run-lint-cases.mjs.
 */
const configForLintCases = {
  files: ['tests/lint-cases/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
    globals: { ...globals.browser },
  },
  rules: sharedRules,
};

export { configForLintCases };
export default [globalIgnores, rootConfigs, componentScripts, toolingScripts, testScripts];
