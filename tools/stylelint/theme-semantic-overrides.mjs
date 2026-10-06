/**
 * stylelint-плагин irao-ui: гейт «тема переопределяет только семантический
 * слой» (ADR-0009, задача T2.4, Implementation requirements T2.4 п.1).
 *
 * Файлы themes/ обязаны быть ровно одним блоком `[data-ui-theme="…"]`
 * (атрибут механизма тем — фиксация T2.4) из одних кастом-свойств, имена
 * которых входят в опцию-список семантических токенов. Ловит четыре класса
 * нарушений:
 *  1. селектор не `[data-ui-theme="…"]` — тема не имеет права стилизовать
 *     классы/теги («Ни одного селектора по классам компонентов», 02-architecture §3.3);
 *  2. обычное (не кастом) свойство — тема переопределяет только токены;
 *  3. кастом-свойство вне семантического слоя — примитивы (слой 1) темы не
 *     переопределяют («Не переопределяются темами», 02-architecture §3.1),
 *     новые/опечатанные имена в темах не вводятся (новый токен — дефолт
 *     в :root слоя 2, правило обратной совместимости ADR-0007/0009);
 *  4. сырой цвет в НЕ-цветовом токене (ревью T2.4, high): готовые цветовые
 *     гейты ловят только имена с «color» (declaration-property-value-allowed-list),
 *     а `--ui-shadow-card: 0 0 1rem rgba(0,0,0,.4)` проходил CLEAN — цвет
 *     утекал в рендер мимо инварианта «hex вне tokens/primitives.css».
 *     Теневые токены (--ui-*shadow*) в темах — целый var()-токен или none
 *     (тени токенизированы, §3.2; тот же контракт, что у свойства box-shadow
 *     в stylelint.config.mjs). Прочие неколоровые токены (radius/space/fs…)
 *     сырье цветов не несут — значения-длины разрешены (например,
 *     `--ui-radius-md: 0.25rem` в theme-test.css).
 *
 * Опция — список имён семантических токенов, считается в stylelint.config.mjs
 * из tokens/semantic.css (плагин не читает файлы): новый токен слоя 2
 * автоматически становится разрешённым для тем, а тест
 * tests/unit/themes.test.js сверяет опцию со всем semantic.css — рассинхрон
 * невозможен молча.
 *
 * Подключение: правила нет в основном `rules` (themes-специфичен), включается
 * override'ом для каталога themes/ в stylelint.config.mjs — там же снят
 * `irao/no-primitive-token-references`: цветовые/теневые значения темы —
 * ссылки на примитивы через var(), неколоровые — сырые длины (radius и т.п.)
 * без цветов (позитивный контроль — tests/lint-cases/css/themes/
 * theme-old-compat.css, негативные — theme-invalid.css и theme-shadow-raw.css,
 * `npm run test:lint`).
 */
import stylelint from 'stylelint';

const ruleName = 'irao/theme-semantic-overrides';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedSelector: (selector) =>
    `Селектор «${selector}» в themes/ запрещён: тема — один блок [data-ui-theme="…"] ` +
    `с переопределением токенов, ни одного селектора по классам/тегам (ADR-0009, T2.4)`,
  rejectedProperty: (property) =>
    `Свойство ${property} в themes/ запрещено: тема переопределяет только кастом-свойства --ui-* (ADR-0009, T2.4)`,
  rejectedToken: (name) =>
    `Токен ${name} не из семантического слоя (tokens/semantic.css): примитивы темы ` +
    `не переопределяют, новые токены вводятся дефолтом в :root слоя 2 (ADR-0009, T2.4)`,
  rejectedShadowValue: (name, value) =>
    `${name}: «${value}» — сырой цвет в тени запрещён: теневой токен темы — целый ` +
    `var(--ui-*) или none (тени токенизированы, §3.2; ревью T2.4)`,
});

/** Единственная допустимая форма селектора темы. */
const THEME_SELECTOR = /^\[data-ui-theme=(?:"[^"]+"|'[^']+')\]$/;

/** Теневой токен: целый var() или none (сырой цвет в тени утекает в рендер). */
const SHADOW_TOKEN_VALUE = /^(?:var\(--ui-[a-z0-9-]+\)|none)$/;
const SHADOW_TOKEN_NAME = /shadow/i;

const ruleFunction = (primary) => (root, result) => {
  // Схема [String]: primary — список имён семантических токенов (считается
  // в stylelint.config.mjs). Проверено на stylelint 17.16: опция-массив строк.
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [String],
  });
  if (!validOptions) return;

  const semanticTokens = new Set(primary);

  root.walkRules((rule) => {
    if (THEME_SELECTOR.test(rule.selector.trim())) return;
    stylelint.utils.report({
      ruleName,
      result,
      node: rule,
      word: rule.selector,
      message: messages.rejectedSelector(rule.selector),
    });
  });

  root.walkDecls((decl) => {
    if (!decl.prop.startsWith('--')) {
      stylelint.utils.report({
        ruleName,
        result,
        node: decl,
        word: decl.prop,
        message: messages.rejectedProperty(decl.prop),
      });
      return;
    }
    if (!semanticTokens.has(decl.prop)) {
      stylelint.utils.report({
        ruleName,
        result,
        node: decl,
        word: decl.prop,
        message: messages.rejectedToken(decl.prop),
      });
      return;
    }
    // П.4 (ревью T2.4): сырой цвет в не-цветовом токене — теневые токены
    // только целым var()-токеном или none; цветовые имена уже закрыты
    // declaration-property-value-allowed-list (var/color-mix/ключевые слова).
    if (SHADOW_TOKEN_NAME.test(decl.prop) && !SHADOW_TOKEN_VALUE.test(decl.value.trim())) {
      stylelint.utils.report({
        ruleName,
        result,
        node: decl,
        word: decl.value,
        message: messages.rejectedShadowValue(decl.prop, decl.value),
      });
    }
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default stylelint.createPlugin(ruleName, ruleFunction);
