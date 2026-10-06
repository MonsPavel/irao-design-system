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
 *  - tests/** — тестовый код под jsdom: пакет `globals` с v17 отдельного
 *    окружения jsdom не имеет; window/document входят в `globals.browser`,
 *    которого jsdom-харнесс достаточно. Витест-глобалы (describe/it/expect)
 *    добавит T1.6 вместе с харнессом.
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
 *  - машинные артефакты воркфлоу — зеркалит .gitignore.
 */
const globalIgnores = {
  ignores: ['tests/lint-cases/**', '**/.zcode/**', '**/.playwright-mcp/**'],
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

/** Тесты (харнесс подключает T1.4/T1.6): модули, среда jsdom. lint-cases
 * исключены globalIgnores (см. выше), поэтому negation здесь не нужен. */
const testScripts = {
  files: ['tests/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: { ...globals.browser },
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
