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
 *  - `irao/no-positive-tabindex` — tabindex > 0 запрещён (WCAG 2.4.3, §5).
 *    Встроенное `no-positive-tabindex` удалено из html-validate 11 — кастомное.
 *
 * Кастомные правила регистрируются инлайн-плагином (html-validate 11: ключ в
 * plugin.rules — уже полный id правила). Формат файла — CJS: загрузчик конфига
 * html-validate исполняет его в CJS-контексте.
 */
'use strict';

const { definePlugin, Rule } = require('html-validate');

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

module.exports = {
  extends: ['html-validate:recommended'],
  plugins: [
    definePlugin({
      name: 'irao',
      rules: {
        'irao/one-h1': OneH1,
        'irao/no-positive-tabindex': NoPositiveTabindex,
      },
    }),
  ],
  rules: {
    'irao/one-h1': 'error',
    'irao/no-positive-tabindex': 'error',
    'input-missing-label': 'error',
  },
};
