/**
 * html-validate irao-ui — гейты разметки паттернов (задача T1.2).
 *
 * База: `html-validate:recommended` — валидный HTML5 паттернов и стендов
 * (docs/02-architecture.md §0: «Semantic HTML5, валидный HTML»).
 *
 * Правила a11y/SEO из AC T1.2:
 *  - `wcag/h37` (recommended) — alt обязателен у img;
 *  - `input-missing-label` — label для input (в recommended НЕ входит —
 *    включаем явно; §5 «Формы и валидация»);
 *  - `irao/one-h1` — один h1 на странице (§0: SEO h1→h2→h3). В html-validate 11
 *    встроенного правила нет — кастомное;
 *  - `irao/heading-order` — иерархия заголовков без пропусков уровней
 *    (h1→h3 и т.п. — ошибка; §0: SEO + скринридеры, задача T3.3 — перенос
 *    идеи test_internship_headings.py career-portal). Снижение уровня (h3→h2)
 *    легально. Кастомное — встроенного «no skips» в html-validate 11 нет;
 *  - `irao/no-positive-tabindex` — tabindex > 0 запрещён (WCAG 2.4.3, §5).
 *    Встроенное `no-positive-tabindex` удалено из html-validate 11 — кастомное.
 *  - `irao/link-external-noopener` — внешняя ссылка (`target="_blank"`)
 *    обязана нести `rel` с токеном `noopener` (задача T4.1, AC): без него
 *    целевая страница получает window.opener и может управлять исходной.
 *    В html-validate 11 встроенного правила нет — кастомное.
 *  - `irao/link-accessible-name` — ссылка без доступного имени (icon-only:
 *    нет текста вне aria-hidden-поддеревьев, aria-label/aria-labelledby,
 *    img с alt) — предупреждение (задача T4.1, Implementation requirements
 *    п.3). Дополняет recommended-правило `wcag/h30` (оно ловит только ссылку
 *    совсем без текста и молчит, когда «текст» — декоративный символ под
 *    aria-hidden). Аварийный визуально-скрытый текст проходит гейт (текст
 *    в DOM без aria-hidden), aria-label — тоже.
 *
 * С T4.2: `no-implicit-button-type` (recommended) понижен до `warning` —
 * severity спеки T4.2 (Scope: «тип обязательный (html-validate warning)»).
 * <button> без type по умолчанию submit — в чужой форме клик отправит её;
 * негативная фикстура — tests/lint-cases/html/button-without-type.html.
 *
 * С T4.6: `irao/img-dimensions` — img без зафиксированного места — ошибка:
 * обязательны атрибуты width/height ИЛИ модификатор `ui-image--ratio-*`
 * (место резервирует aspect-ratio из CSS; спека T4.6: «width/height или
 * aspect-ratio обязательны»). Без зафиксированного места загрузка картинки
 * сдвигает контент (CLS, ТЗ №20); alt закрывает recommended-правило
 * `wcag/h37` (T1.2). Негативная фикстура —
 * tests/lint-cases/html/img-without-dimensions.html, позитивная —
 * img-dimensions-valid.html.
 *
 * С T5.2: `irao/radio-group-fieldset` — радио-ГРУППА (≥2 инпута с общим
 * name) обязана лежать в fieldset с legend — нативные имя и роль group
 * скринридер объявляет сам, без ARIA (спека T5.2: «Группа radio … legend
 * обязателен»; AC). Одиночное радио с уникальным name группой не является
 * и гейтом не ловится (повторяемая единица .ui-radio канонического паттерна
 * легальна сама по себе). Каждый инпут группы проверяется отдельно: у его
 * ближайшего fieldset-предка должен быть ребёнок legend. Негативная
 * фикстура — tests/lint-cases/html/radio-without-fieldset.html, позитивная —
 * radio-group-with-legend.html.
 *
 * Кастомные правила регистрируются инлайн-плагином (html-validate 11: ключ в
 * plugin.rules — уже полный id правила). Формат файла — CJS: загрузчик конфига
 * html-validate исполняет его в CJS-контексте.
 */
'use strict';

const { definePlugin, Rule } = require('html-validate');

/** Ссылка имеет доступное имя: aria-label/aria-labelledby либо контент.
 *  const-стрелки, не function declarations: файл CJS-script, eslint
 *  no-implicit-globals ловит глобальные function-декларации. */
const hasAccessibleName = (link) => {
  for (const attr of ['aria-label', 'aria-labelledby']) {
    const value = link.getAttribute(attr);
    if (value && value.value.trim() !== '') return true;
  }
  return hasAccessibleContent(link);
};

/** Контент, из которого скринридер возьмёт имя (прозрачная рекурсия). */
const hasAccessibleContent = (node) => {
  for (const child of node.childNodes) {
    // nodeType 3 — TextNode (html-validate: textContent, без .is()).
    if (child.nodeType === 3) {
      if (child.textContent.trim() !== '') return true;
      continue;
    }
    if (child.nodeType !== 1) continue;
    const hidden = child.getAttribute('aria-hidden');
    if (hidden && hidden.value !== 'false') continue;
    if (child.is('img')) {
      const alt = child.getAttribute('alt');
      if (alt && alt.value.trim() !== '') return true;
      continue;
    }
    if (child.is('svg')) {
      const label = child.getAttribute('aria-label');
      if (label && label.value.trim() !== '') return true;
      continue;
    }
    if (hasAccessibleContent(child)) return true;
  }
  return false;
};

/** На странице должен быть ровно один h1. */
class OneH1 extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      const headings = event.document.querySelectorAll('h1');
      for (let i = 1; i < headings.length; i += 1) {
        this.report(
          headings[i],
          'На странице должен быть один <h1>: SEO-иерархия h1→h2→h3 (02-architecture §0).',
        );
      }
    });
  }
}

/** Положительный tabindex запрещён — ломает естественный порядок фокуса. */
class NoPositiveTabindex extends Rule {
  setup() {
    this.on('element:ready', (event) => {
      // html-validate 11: getAttribute возвращает объект атрибута, значение — в .value
      const attr = event.target.getAttribute('tabindex');
      const value = attr && typeof attr === 'object' ? attr.value : attr;
      if (value !== null && value !== undefined && Number(value) > 0) {
        this.report(
          event.target,
          'Положительный tabindex запрещён: ломает порядок фокуса (WCAG 2.4.3).',
        );
      }
    });
  }
}

/** Иерархия заголовков без пропусков: h1→h3 и т.п. — ошибка (T3.3). */
class HeadingOrder extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      let previous = 0;
      for (const heading of event.document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        const level = Number(heading.tagName[1]);
        if (previous !== 0 && level > previous + 1) {
          this.report(
            heading,
            `Пропуск уровня заголовков: h${previous} → h${level} — иерархия h1→h2→h3 без пропусков (SEO + скринридеры, 02-architecture §0).`,
          );
        }
        previous = level;
      }
    });
  }
}

/** Внешняя ссылка (target="_blank") обязана нести rel с токеном noopener (T4.1). */
class LinkExternalNoopener extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const link of event.document.querySelectorAll('a')) {
        const target = link.getAttribute('target');
        if (!target || target.value !== '_blank') continue;
        const rel = link.getAttribute('rel');
        const tokens = rel ? rel.value.trim().split(/\s+/) : [];
        if (tokens.includes('noopener')) continue;
        this.report(
          link,
          'Внешняя ссылка с target="_blank" обязана нести rel="noopener" (T4.1): без него целевая страница получает window.opener и может управлять исходной (tabnabbing).',
        );
      }
    });
  }
}

/** Ссылка без доступного имени (icon-only) — предупреждение (T4.1, п.3). */
class LinkAccessibleName extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const link of event.document.querySelectorAll('a')) {
        if (hasAccessibleName(link)) continue;
        this.report(
          link,
          'У ссылки нет доступного имени: icon-only ссылка обязана нести aria-label или визуально-скрытый текст (T4.1, Implementation requirements п.3).',
        );
      }
    });
  }
}

/** Img без зафиксированного места — CLS при загрузке (T4.6, AC). */
class ImgDimensions extends Rule {
  setup() {
    this.on('element:ready', (event) => {
      if (!event.target.is('img')) return;
      const width = event.target.getAttribute('width');
      const height = event.target.getAttribute('height');
      if (width && height && width.value.trim() !== '' && height.value.trim() !== '') return;
      // Второй легитимный путь (спека T4.6: «width/height или aspect-ratio»):
      // место резервирует CSS-класс ui-image--ratio-* (aspect-ratio из шкалы).
      const cls = event.target.getAttribute('class');
      const classValue = cls ? cls.value : '';
      if (/(?:^|\s)ui-image--ratio-[-a-z0-9]+(?:\s|$)/.test(classValue)) return;
      this.report(
        event.target,
        'У <img> нет зафиксированного места: обязательны атрибуты width/height ИЛИ класс ui-image--ratio-* (место резервирует aspect-ratio) — иначе загрузка картинки сдвигает контент (CLS, T4.6).',
      );
    });
  }
}

/** Радио-группа (≥2 радио с общим name) обязана лежать в fieldset с legend (T5.2). */
class RadioGroupFieldset extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      const radios = [...event.document.querySelectorAll('input[type="radio"]')];
      // Группа = имя, встречающееся ≥2 раз; одиночное имя — не группа.
      const countByName = new Map();
      for (const radio of radios) {
        const name = radio.getAttribute('name');
        const key = name ? name.value : '';
        countByName.set(key, (countByName.get(key) ?? 0) + 1);
      }
      for (const radio of radios) {
        const name = radio.getAttribute('name');
        const key = name ? name.value : '';
        if ((countByName.get(key) ?? 0) < 2) continue;
        // Ближайший fieldset-предок обязан нести legend прямым ребёнком.
        let ancestor = radio.parent;
        let closestFieldset = null;
        while (ancestor) {
          if (ancestor.is('fieldset')) {
            closestFieldset = ancestor;
            break;
          }
          ancestor = ancestor.parent;
        }
        const hasLegend =
          closestFieldset !== null &&
          closestFieldset.childNodes.some((child) => child.nodeType === 1 && child.is('legend'));
        if (hasLegend) continue;
        this.report(
          radio,
          'Радио-группа (общий name) обязана лежать в <fieldset> с <legend>: нативные имя и роль группы — без ARIA (T5.2).',
        );
      }
    });
  }
}

module.exports = {
  extends: ['html-validate:recommended'],
  plugins: [
    definePlugin({
      name: 'irao',
      rules: {
        'irao/one-h1': OneH1,
        'irao/heading-order': HeadingOrder,
        'irao/no-positive-tabindex': NoPositiveTabindex,
        'irao/link-external-noopener': LinkExternalNoopener,
        'irao/link-accessible-name': LinkAccessibleName,
        'irao/img-dimensions': ImgDimensions,
        'irao/radio-group-fieldset': RadioGroupFieldset,
      },
    }),
  ],
  rules: {
    'irao/one-h1': 'error',
    'irao/heading-order': 'error',
    'irao/no-positive-tabindex': 'error',
    'irao/link-external-noopener': 'error',
    'irao/link-accessible-name': 'warn',
    'irao/img-dimensions': 'error',
    'irao/radio-group-fieldset': 'error',
    'input-missing-label': 'error',
    // T4.2 (Scope): <button> без явного type — предупреждение (умолчание submit).
    'no-implicit-button-type': 'warn',
  },
  // T4.7, разметка ui-breadcrumbs: <ol role="list"> — защита семантики списка
  // от удаления в Safari/VoiceOver (list-style: none + display:flex на ленте
  // крошек снимают роль; баг актуален, фикс сообщества — role="list").
  // Технические considerations T4.7: ol-семантика даёт скринридеру «шаг N из M»,
  // сохранение закреплено пином listSemantics в tests/e2e/ui-breadcrumbs.spec.js.
  // html-validate считает role="list" на ol избыточным (no-redundant-role) и
  // предлагает «нативный ul» (prefer-native-element — следствие того же
  // атрибута): оба правила слепы к Safari-багу. Root-«overrides» html-validate
  // не поддерживает (SchemaValidationError), поэтому отключение — inline-
  // директивой перед каждым <ol> (канонический паттерн + стенд), с обоснованием
  // рядом. Не снимать вместе с role="list".
};
