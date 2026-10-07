# ui-radio-group

Группа радио-кнопок на нативном `fieldset/legend` с раскладкой `radio-row`
одобренного дизайна. Задача T5.2. Источник — `.radio-row` career-portal
(components.css:210): flex-ряд с переносом и шагом 24px. Группа обязана быть
fieldset с legend — нативные имя («Формат работы») и роль group скринридер
объявляет сам, без единой ARIA-костыли; группа без legend — ошибка
html-validate (`irao/radio-group-fieldset`, T5.2 AC).

## API

| Что | Значение |
|---|---|
| Блок `.ui-radio-group` | `fieldset`-корень: UA-ресет (margin/padding/border сброшены) — группа живёт в потоке обвязки `ui-field` |
| Элемент `.ui-radio-group__legend` | `legend` — подпись группы в стиле label обвязки (fs-small/fw-small одобренного `.field__label`); шаг до ряда `--ui-space-2` |
| Элемент `.ui-radio-group__row` | ряд вариантов: `display: flex; flex-wrap: wrap; gap: var(--ui-space-5)` (24px одобренного `.radio-row`) — длинные ярлыки переносятся |
| Ярлыки | `.ui-radio` (компонент ui-radio) внутри `__row`, общий `name`, один `required` |
| JS | модуля нет — выбор и стрелки нативные |
| Токены | `--ui-space-2` (шаг подписи), `--ui-space-5` (шаг ряда) |

```html
<!-- группа: fieldset/legend + hint/error обвязки; копипаст даёт доступный результат -->
<div class="ui-field ui-field--required ui-field--error">
  <fieldset class="ui-radio-group" aria-describedby="format-hint format-error">
    <legend class="ui-radio-group__legend">
      Формат работы
      <span class="ui-field__req"><span aria-hidden="true">*</span><span
        class="ui-field__req-text">обязательное поле</span></span>
    </legend>
    <div class="ui-radio-group__row">
      <label class="ui-radio">
        <input class="ui-radio__input" type="radio" name="format" value="full" required checked>
        Полная занятость
      </label>
      <label class="ui-radio">
        <input class="ui-radio__input" type="radio" name="format" value="part">
        Частичная занятость
      </label>
    </div>
  </fieldset>
  <p class="ui-field__hint" id="format-hint">Выберите один вариант</p>
  <p class="ui-field__error" id="format-error" role="alert">Выберите формат работы</p>
</div>
```

## Связность ошибки группы (Accessibility requirements T5.2)

- **aria-describedby на fieldset** — список `hint error`: описание связано с
  ГРУППОЙ, а не с отдельной кнопкой; скринридер объявляет его после имени
  группы (legend).
- Ошибка показывается обвязкой: `ui-field--error` (T5.1) отображает
  `__error` — текст с `role="alert"` объявляется при вставке/обновлении.
- `aria-invalid` на fieldset не ставится: нативной групповой aria-invalid
  не существует; серверный контракт ошибки группы — задача T5.6.
- Собственных error-стилей у группы нет: рамки нет, отметки радио нативны —
  блоку нечего красить; сигнал ошибки несёт текст `__error`.

## Клавиатура и a11y

- **Стрелки ←→↑↓** — нативный roving по вариантам группы (без JS/tabindex).
- **Tab** входит в группу один раз (на выбранный вариант) — нативно.
- legend обязателен и первым ребёнком fieldset; required-маркер — в legend
  (звёздочка aria-hidden + скринридер-текст, WCAG 1.4.1).
- Гейт разметки: `irao/radio-group-fieldset` — ≥2 радио с общим `name` вне
  fieldset/legend — ошибка; одиночное радио с уникальным `name` группой не
  является и не ловится (повторяемая единица `.ui-radio` легальна).

## Do / Don't

- **Do**: fieldset/legend для каждой группы; ярлыки ui-radio в `__row`.
- **Do**: hint и error рядом с fieldset внутри обвязки `ui-field`, id в
  `aria-describedby` fieldset (списком, hint первым).
- **Don't**: `div role="radiogroup"` + `aria-labelledby` — нативный
  fieldset/legend уже даёт имя и роль (принцип ТЗ №16/17).
- **Don't**: группа без legend — html-validate красный.
- **Don't**: разные `name` у вариантов одной группы — взаимоисключение
  теряется.

## Известные границы

- групповых чекбоксов это не касается: чекбоксы независимы (ui-checkbox);
- вертикальная раскладка группы (колонкой) не заведена — требований нет;
  ряд `__row` переносится сам (flex-wrap);
- серверная валидация и фокус на первую ошибку группы — T5.5/T5.6.
