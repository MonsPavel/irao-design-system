/**
 * stylelint-плагин irao-ui: запрет «not» перед min-width (ревью T2.5, high).
 *
 * Пара встроенных гейтов T2.5 (media-feature-name-disallowed-list +
 * media-feature-name-value-allowed-list, см. правило 8 в stylelint.config.mjs)
 * слепа к negation-формам: `@media not (min-width: 768px)` и
 * `@media not all and (min-width: 768px)` несут имя фичи min-width
 * (disallowed-list молчит — он запрещает width/max-width/height, а min-width
 * разрешён) и значение из шкалы (value-allowed-list молчит). Семантика же
 * этих запросов — «width < Npx», то есть desktop-first max-width-паттерн
 * career-portal, переносить который задача T2.5 запрещает; механическая
 * «инверсия той же сетки» (767 → 768−1 и т.п.), предписанная докой
 * «Адаптивный подход», записывается именно так и до плагина проходила
 * весь конфиг зелёным (проверено: npx stylelint на фикстуре → exit 0).
 *
 * Правило: в параметрах @media «not» не может стоять непосредственно перед
 * min-width — с точностью до квалификатора `all and` и скобок группы
 * (`not (min-width: …)`, `not all and (min-width: …)`, `not ((min-width: …))`).
 * Формы, где «not» отрицает НЕ min-width, легальны и не ловятся: регэксп
 * требует `min-width` сразу после not/`all and` — `not screen and
 * (min-width: …)` (отрицание типа носителя) и
 * `(min-width: 768px) and not (prefers-reduced-motion: reduce)` (отрицание
 * неширинной фичи) проходят. Легитимного «not min-width» в системе нет:
 * мобильная база пишется без media, рост — в положительном
 * `(min-width: Npx)` (дока docs/ui-system/architecture/responsive-approach.md).
 *
 * Почему плагин, а не более общая проверка negation'а любых width-фич:
 * `not (max-width: …)` уже красный по имени фичи (disallowed-list), а
 * negation неширинных фич (prefers-*) — вне предмета шкалы T2.5; до общего
 * гейта negation'ов — если понадобится — отдельным решением (ревью).
 *
 * Подключение: правило 9 в stylelint.config.mjs (глобально, primary true);
 * негативный контроль — tests/lint-cases/css/components/ui-card/
 * media-not-min-width.css (`npm run test:lint`).
 */
import stylelint from 'stylelint';

const ruleName = 'irao/no-negated-min-width';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (params) =>
    `Медиазапрос «@media ${params}»: «not» перед min-width запрещён — семантика «width < Npx» повторяет ` +
    `desktop-first max-width (T2.5); мобильная база без media + рост в положительном (min-width: Npx) ` +
    `(дока docs/ui-system/architecture/responsive-approach.md)`,
});

/**
 * «not» непосредственно перед min-width: квалификатор `all and` и скобки
 * группы допускаются между ними. Без /i: имена media-фич регистронезависимы
 * (CSS), опечатки вида NOT(MIN-WIDTH) — тоже нарушение формы.
 */
const NEGATED_MIN_WIDTH = /not\s*(?:all\s+and\s+)?(?:\(\s*)+min-width\b/i;

const ruleFunction = (primary) => (root, result) => {
  // Схема [true]: правило без настроек, включается глобально (правило 9
  // в stylelint.config.mjs).
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true],
  });
  if (!validOptions) return;

  root.walkAtRules((atRule) => {
    // at-keyword регистронезависим в CSS (@MEDIA валиден) — сравниваем в нижнем регистре.
    if (atRule.name.toLowerCase() !== 'media') return;
    if (!NEGATED_MIN_WIDTH.test(atRule.params)) return;
    stylelint.utils.report({
      ruleName,
      result,
      node: atRule,
      word: atRule.params,
      message: messages.rejected(atRule.params),
    });
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default stylelint.createPlugin(ruleName, ruleFunction);
