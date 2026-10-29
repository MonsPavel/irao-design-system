/**
 * Гейт селекторов паттерн-слоя (T17.1, Implementation requirements п.2 —
 * «stylelint-правило/проверка в сборке»): селекторы слоя — только
 * канонические префиксы lpp-|dpp-|fpp-|lnk-|lgo-|tlp-|nvp|hsp-|ftp-|hro|mrq|mdl|cvh
 * (lnk-/lgo- — лендинг-связки nav-карточек и ленты логотипов, T17.9; tlp- —
 * таймлайн, T17.10; nvp — поднавигация разделов, T17.11; hsp-/ftp- — каркасы
 * шапки/подвала, T17.13; hro/mrq/mdl/cvh — лендинг-композиции hero/adv-marquee/
 * медиа-сетки/cover-hero, T17.15; потомки — компоненты ui-*), ID и чужие
 * namespace-крючки запрещены — защита от превращения слоя в свалку.
 *
 * Ревью T17.1 (high): прежний инлайн-гейт в selfChecks матчил /([^{}]+)\{/
 * БЕЗ флага /g — проверялось только ПЕРВОЕ правило слоя, чужой префикс в
 * любом другом проходил сборку. Гейт вынесен в этот модуль (чистая функция,
 * без побочных эффектов — импортируется и сборкой showcase/build.mjs, и
 * юнит-пинами tests/unit/patterns-layer.test.js): разбор ВСЕХ правил через
 * matchAll, группы селекторов (через запятую) проверяются по отдельности.
 *
 * Проверяются и правила внутри @media (прелюдия селектором не считается);
 * комментарии срезаются до разбора — упоминания классов в прозе не ловятся.
 *
 * @param {string} css — исходник слоя (patterns/patterns.css), как есть.
 * @returns {string[]} — список проблем (пустой массив = гейт пройден).
 */
export function patternLayerProblems(css) {
  const code = css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const problems = [];

  // Прелюдии at-rule (@media … {) срезаются до разбора: иначе тело матча
  // /([^{}]+)\{([^}]*)\}/ поглощает вложенное '{' первого правила внутри
  // блока, и media-правила выпадают из проверки (поймано тестом «правила
  // ВНУТРИ @media»). Селекторы '@' не начинают — замена безопасна.
  const flat = code.replace(/@[^{}]*\{/g, '{');

  // Разбивка группы селекторов по запятым ВЕРХНЕГО уровня: запятые внутри
  // функциональных псевдоклассов (:is(.a, .b) — канон восстановления ролей
  // на заливке, T17.9) группу не рвут (наивный split(',') ломал :is() на
  // «селекторы» .ui-h2/… без крючка слоя).
  const splitGroup = (selector) => {
    const parts = [];
    let depth = 0;
    let current = '';
    for (const char of selector) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts;
  };

  // Глобальный матч ВСЕХ правил: matchAll по «селектор {» — после среза
  // прелюдий правила внутри @media матчатся наравне с верхнеуровневыми.
  const rules = [...flat.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const selectors = rules
    .map((match) => match[1])
    .flatMap(splitGroup)
    .map((selector) => selector.trim())
    .filter((selector) => selector !== '');

  if (selectors.length === 0) {
    problems.push('паттерн-слой пуст — связки не перенесены');
    return problems;
  }

  for (const selector of selectors) {
    const hooks = selector.match(/\.[a-z][a-z0-9_-]*/g) ?? [];
    // Блок-классы таймлайна (tlp, T17.10), поднавигации (nvp, T17.11) и
    // лендинг-композиций (mrq/mdl/cvh, T17.15; hro — голый блок с BEM-
    // элементами __*, по образцу dpp) — голые `tlp`/`nvp`/`mrq`/`mdl`/`cvh`/
    // `hro` (примеры спек), у остальных паттернов блок несёт суффикс
    // (lpp-row): префикс обязан продолжаться дефисом, модификатором __ или
    // закончиться на нём.
    if (
      !hooks.some((hook) =>
        /^\.(lpp|dpp|fpp|lnk|lgo|tlp|nvp|hsp|ftp|hro|mrq|mdl|cvh)(?:-|__|$)/.test(hook),
      )
    ) {
      problems.push(
        `селектор слоя без крючка lpp-/dpp-/fpp-/lnk-/lgo-/tlp-/nvp/hsp-/ftp-/hro/mrq/mdl/cvh: «${selector}»`,
      );
    }
    for (const hook of hooks) {
      if (
        !/^\.(?:ui-|(?:lpp|dpp|fpp|lnk|lgo|tlp|nvp|hsp|ftp|hro|mrq|mdl|cvh)(?:-|__|$))/.test(hook)
      ) {
        problems.push(
          `чужой крючок «${hook}» в селекторе слоя: «${selector}» (только lpp-|dpp-|fpp-|lnk-|lgo-|tlp-|nvp|hsp-|ftp-|hro|mrq|mdl|cvh + ui-потомки)`,
        );
      }
    }
    if (/#[a-zA-Z]/.test(selector)) {
      problems.push(`ID-селектор в слое: «${selector}» (02-architecture §1)`);
    }
  }
  return problems;
}
