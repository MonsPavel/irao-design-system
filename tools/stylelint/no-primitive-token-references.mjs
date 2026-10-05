/**
 * stylelint-плагин irao-ui: гейт «компонент читает только слой 2»
 * (ADR-0009, задача T2.2, AC T2.2).
 *
 * Запрещает ссылки на примитивы слоя 1 (`var(--ui-blue-800)`, `var(--ui-gray-100)`…)
 * в любом значении — в свойствах и в значениях кастом-свойств — ВНЕ tokens/.
 * Семантический слой tokens/semantic.css ссылается на примитивы легитимно:
 * в stylelint.config.mjs действие правила снято override'ом для всех файлов
 * каталога tokens. Позитивный контроль —
 * tests/lint-cases/css/tokens/semantic.css, негативный —
 * tests/lint-cases/css/components/ui-button/primitive-ref.css (`npm run test:lint`).
 *
 * Почему локальный плагин, а не declaration-property-value-disallowed-list:
 * тот id уже занят outline-гейтом ADR-0001 (warning до конца EPIC-4), а
 * severity у одного правила один — отдельное правило даёт независимый error
 * без трогання осознанного решения T1.2. Семейства — экспорт FAMILIES:
 * stylelint.config.mjs передаёт его в опции правила, а юнит-тест
 * tests/unit/tokens-semantic.test.js сверяет список со всеми семействами
 * primitives.css — новый примитив вне этих семейств не соберёт запрет молча,
 * а упадёт тестом.
 */
import stylelint from 'stylelint';

/**
 * Семейства примитивов слоя 1 (tokens/primitives.css): --ui-<семейство>[-шаг…].
 * Синхронизировано с primitives.css юнит-тестом (см. шапку файла).
 */
export const FAMILIES = [
  'black',
  'blue',
  'gray',
  'green',
  'orange',
  'peach',
  'purple',
  'red',
  'slate',
  'white',
];

const ruleName = 'irao/no-primitive-token-references';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (reference) =>
    `Примитив ${reference} читается вне tokens/ — компонентам и темам доступен только слой 2 tokens/semantic.css (ADR-0009, T2.2)`,
});

const ruleFunction = (primary) => (root, result) => {
  // Схема [String]: primary — строка или массив строк (имена семейств).
  // Проверено на stylelint 17.16: [[String]] (массив массивов) опции
  // ['blue', …] не принимает.
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [String],
  });
  if (!validOptions) return;

  const primitivePattern = new RegExp(`^--ui-(?:${primary.join('|')})(?:-[a-z0-9]+)*$`);

  root.walkDecls((decl) => {
    for (const match of decl.value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (primitivePattern.test(match[1])) {
        stylelint.utils.report({
          ruleName,
          result,
          node: decl,
          word: match[1],
          message: messages.rejected(match[1]),
        });
      }
    }
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default stylelint.createPlugin(ruleName, ruleFunction);
