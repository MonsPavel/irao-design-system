# Focus visible: почему так

Задача T3.2, исполняемая форма [ADR-0001](../../adr/0001-focus-visible-specificity.md).
Глобальная гарантия системы: на любой странице, куда подключён `ui-core.min.css`,
клавиатурный фокус виден на каждом интерактивном элементе — включая страницы,
где после системы подключён legacy-CSS вида `a { outline: none }`
(WCAG 2.4.7 «Focus Visible»; DoD всех интерактивных компонентов ссылается сюда).

## Правило (`base/focus.css`)

```css
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
[tabindex]:focus-visible {
  outline: var(--ui-focus-width) solid var(--ui-focus-color);
  outline-offset: var(--ui-focus-offset);
}
```

## Почему так

1. **Список селекторов, а не `:where(...)`** — главный урок ADR-0001. Вариант
   `:where(a, button, …):focus-visible` даёт нулевую специфичность и проигрывает
   tag-правилу `a { outline: none }` (0-0-1) по порядку каскада: ui-core грузится
   **первым**, legacy-CSS сайта — после него. Список «элемент + псевдокласс»
   даёт каждой декларации 0-1-1 — победа независимо от порядка подключения.
   Это сознательное исключение из правила «специфичность одного класса»
   (02-architecture §1, принцип 4): правило задаёт гарантированный глобальный
   минимум, компоненты стилизуют фокус своими классами поверх него.
2. **`:focus-visible`, а не `:focus`** — стандартное поведение «фокус с
   клавиатуры»: мышиный фокус сознательно не подсвечивается (наведение и так
   видно, а обводка на каждый клик — шум). Проверка именно клавиатурная:
   Tab-обход в e2e.
3. **Значения — focus-тройка токенов слоя 2** (T2.2, источник — career-portal
   `pages.css:52`): `--ui-focus-color` → `--ui-color-primary`, `--ui-focus-width`
   3px, `--ui-focus-offset` 2px. Тема переопределяет `--ui-focus-color` — фокус
   меняется без правки `base/` (сквозной e2e с T2.4 в
   `tests/e2e/focus.spec.js`).
4. **`outline-offset: 2px`** — обводка рисуется вне элемента: видна на
   заполненных фонах, где outline вплотную к границе сливается с фоном.

## Правило для компонентов (EPIC-4+)

- DoD каждого интерактивного компонента ссылается сюда: фокус-состояние
  компонента стилизуется его классами **поверх** гарантированного минимума;
  убирать обводку без замены нельзя — stylelint-гейт
  `declaration-property-value-disallowed-list` ловит `outline: none`/`0`
  (warning до конца EPIC-4, затем error; негативная фикстура —
  `tests/lint-cases/css/components/ui-modal/outline-none.css`).
- Замена обводки допустима, но видимый индикатор обязан оставаться:
  проверяется Tab-обходом и axe-правилами фокуса на стенде компонента.
  Исполненный пример — паттерн «карточка-ссылка» ui-card (T4.4): локальная
  обводка ссылки заменена контуром `::after` по всей карточке
  (`components/ui-card/ui-card.css`, источник — career-portal pages.css:52);
  e2e-пин замены и видимости контура — `tests/e2e/ui-card.spec.js`
  (`outline-style` ссылки `none` + `::after` ≥ 3px solid при фокусе).

## Как расширить список

Новый интерактивный тег, не покрытый списком (изменения платформы, новый
элемент HTML), — ответственность владельца этой задачи (Implementation
requirements T3.2 п.3), в один PR:

1. добавить `селектор:focus-visible` в список `base/focus.css`;
2. обновить пин списка в `tests/unit/focus.test.js` (`ADR_TARGETS`);
3. добавить элемент на стенд `showcase/pages/base/index.html` — Tab-обход
   `tests/e2e/focus.spec.js` обязан встретить каждую цель списка;
4. записать решение здесь (этот список — часть контракта ADR-0001).

## Проверка

- e2e Tab-обход стенда `base`: у каждого сфокусированного элемента computed
  `outline-width` ≥ 2px — `tests/e2e/focus.spec.js` (стенд генерирует
  `showcase/build.mjs` из `showcase/pages/base/index.html`).
- e2e «legacy-атака»: инжект `a { outline: none }` после ui-core (и до него —
  порядок не важен) — computed `outline-width` в фокусе ≥ 2px.
- Скриншот focus-состояния — эталон только из контейнера/CI (ADR-0004).
- Расширенная атака на ключевых компонентах — T11.1 (EPIC-11).
