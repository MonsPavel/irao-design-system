/**
 * Параметризованный хелпер «legacy-атаки» (задача T11.1; констрейнты —
 * раздел 6 плана 06, ADR-0001/0002/0008; расширение атаки T3.2 —
 * tests/e2e/focus.spec.js, где атака ограничена `a { outline: none }`).
 *
 * Пакет токсичных правил эмулирует типовой legacy-CSS реального сайта
 * (аудит ADR-0008: tag-правила, `*`-сбросы, стили форм) и применяется
 * К СУЩЕСТВУЮЩИМ стендам showcase — ровно сценарий подключения «система
 * первой, legacy после»: <style> вставляется последним узлом <head>, после
 * линков ui-core. Обратный порядок (prepend) параметром — фокус-политика
 * ADR-0001 гарантирует победу независимо от порядка (0-1-1 против 0-0-1).
 *
 * Инжекты названного пакета (T11.1, Scope):
 *  - focus-outline   `a { outline: none }`               — фокус-атака (ADR-0001);
 *  - box-sizing      `*, *::before, *::after { … }`      — сброс ADR-0002; форма
 *                    сильнее названной в спеке (`* {…}`): старые normalize
 *                    накрывали и псевдоэлементы, а детали компонентов
 *                    (стрелка select, контур карточки-ссылки) — псевдоэлементы;
 *  - form-controls   `input, textarea, select { … }`     — типовые tag-стили
 *                    форм legacy-сайтов (фикс. высота, рамка, фон, шрифт);
 *  - headings        `h1 { … }`                          — типовые tag-стили
 *                    заголовков; система защищается классами ролей (T3.3);
 *  - lists           `ul { list-style: none; … }`        — типовой legacy-ресет
 *                    списков (совпадает с базовым reset системы).
 *
 * Значения инжектов — «чужой» CSS сайта: hex и жёсткие px здесь Сознательно
 * вне токенов (инвариант «hex только в tokens/primitives.css» действует на
 * CSS системы, а не на эмуляцию атаки; файл — JS-модуль, stylelint его не
 * смотрит). !important в пакет не входит: сценарий «legacy эскалирует» —
 * констрейнт 4 (план 06 §6): страница остаётся на legacy или изолируется,
 * система не отвечает эскалацией — поведенческий контракт, не e2e-пин.
 *
 * Переиспользование в регрессии (Implementation requirements п.3): импортируйте
 * applyLegacyAttack в любую спеку — набор инжектов параметризуется именами
 * из LEGACY_ATTACKS, позиция — 'append' (после ui-core) / 'prepend' (до).
 */

/** Названный пакет токсичных правил: имя → CSS-текст инжекта. */
export const LEGACY_ATTACKS = Object.freeze({
  'focus-outline': 'a { outline: none; }',
  'box-sizing': '*, *::before, *::after { box-sizing: content-box; }',
  'form-controls':
    'input, textarea, select { height: 30px; padding: 2px 6px; border: 1px dashed #999999; ' +
    'border-radius: 0; background: #ffffff; color: #111111; font-size: 12px; }',
  headings: 'h1 { font-size: 18px; font-weight: normal; margin: 0.5em 0; }',
  lists: 'ul { list-style: none; margin: 0; padding: 0; }',
});

/** Имена всех инжектов пакета (порядок стабилен — ключи объекта). */
export const ALL_ATTACKS = Object.freeze(Object.keys(LEGACY_ATTACKS));

/**
 * Применить атаку к странице: один <style> с выбранными инжектами в head.
 *
 * @param {import('@playwright/test').Page} page страница открытого стенда
 * @param {{ injects?: string[], position?: 'append'|'prepend' }} [options]
 *   injects — имена из LEGACY_ATTACKS (по умолчанию весь пакет);
 *   position — 'append' (последний узел head — legacy ПОСЛЕ ui-core, по
 *   умолчанию) или 'prepend' (первый узел — атака ДО ui-core).
 * @returns {Promise<{inHead: boolean, isLast: boolean, isFirst: boolean}>}
 *   факты каскада для пина «атака стоит после/до ui-core».
 */
export async function applyLegacyAttack(page, { injects = ALL_ATTACKS, position = 'append' } = {}) {
  const unknown = injects.filter((name) => !(name in LEGACY_ATTACKS));
  if (unknown.length > 0) {
    throw new Error(
      `applyLegacyAttack: неизвестные инжекты ${unknown.join(', ')} — пакет: ${ALL_ATTACKS.join(', ')}`,
    );
  }

  const css = injects.map((name) => LEGACY_ATTACKS[name]).join('\n');

  return page.evaluate(
    ({ cssText, where }) => {
      const style = document.createElement('style');
      style.setAttribute('data-legacy-attack', '');
      style.textContent = cssText;
      if (where === 'prepend') {
        document.head.prepend(style);
      } else {
        document.head.appendChild(style);
      }
      const attack = document.head.querySelector('style[data-legacy-attack]');
      return {
        inHead: attack !== null,
        isLast: attack === document.head.lastElementChild,
        isFirst: attack === document.head.firstElementChild,
      };
    },
    { cssText: css, where: position },
  );
}
