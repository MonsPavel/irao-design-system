# ui-checkbox

Чекбокс: label-обёртка нативного `input[type="checkbox"]` и текста. Задача
T5.2. Источник — `.checkbox` career-portal (components.css:190–207) и паттерн
согласия internship-apply.html:100–103: инпут 20px прижат к верху (длинный
текст согласия переносится под себя), `accent-color` красит отметку токеном
primary. Галочку рисует браузер — кастомные коробки и подмены инпута
запрещены: нативность даёт клавиатуру и скринридера «из коробки» (принципы
ТЗ №16/17). Обвязка и состояния — `ui-field` (T5.1).

## API

| Что | Значение |
|---|---|
| Блок `.ui-checkbox` | `label`-корень: flex-строка, инпут прижат к верху (`align-items: flex-start`), шаг `--ui-space-3` (12px одобренного `.checkbox`) |
| Элемент `.ui-checkbox__input` | нативный инпут: 20px (`--ui-control-size`), `accent-color: var(--ui-color-primary)`; `appearance`/`opacity` не трогаются |
| Групповая раскладка | чекбоксы блочные — соседние `.ui-checkbox + .ui-checkbox` складываются в колонку с шагом `--ui-space-3` |
| JS | модуля нет — переключение нативное (клик, Space) |
| Токены | `--ui-control-size` (20px, career-portal components.css:203), `--ui-space-3`; `accent-color` — `--ui-color-primary` |

```html
<!-- согласие: текст с вложенной ссылкой + ошибка обвязки -->
<div class="ui-field ui-field--required ui-field--error">
  <label class="ui-checkbox">
    <input class="ui-checkbox__input" type="checkbox" id="consent" name="consent"
           required aria-invalid="true" aria-describedby="consent-error">
    <span>Я даю <a class="ui-link" href="/privacy/">согласие на обработку персональных
      данных</a><span class="ui-field__req"><span aria-hidden="true">*</span><span
      class="ui-field__req-text">обязательное поле</span></span></span>
  </label>
  <p class="ui-field__error" id="consent-error" role="alert">Без согласия отклик отправить нельзя</p>
</div>
```

## Ссылка внутри label (паттерн согласия)

Ссылка на политику — обычная `<a class="ui-link">` внутри label: браузер не
применяет активацию label к кликам по интерактивным элементам, поэтому
ссылка кликабельна, а чекбокс не переключается (e2e-пин —
`tests/e2e/ui-forms.spec.js`). Ссылка вне label не нужна.

## Состояния и a11y

- **default** — галочка `accent-color`-ом primary; клик по тексту
  переключает, **Space** переключает фокусированный чекбокс — без JS.
- **error** — на обвязке: `ui-field--error` показывает `__error`
  (`role="alert"`), инпут несёт `aria-describedby` на его id.
  Текст ошибки кладите **вне** label — иначе он станет частью accessible
  name чекбокса, и скринридер зачитает ошибку как имя.
- **disabled** — нативный атрибут: не фокусируется, не переключается;
  приглушение рисует браузер (своего визуала у блока нет).
- required — нативный `required` + маркер `__req` (звёздочка aria-hidden +
  текст «обязательное поле» скринридеру — паттерн T5.1).
- Группа чекбоксов — независимые варианты: каждый со своим именем; общее
  имя (массив значений) — легальный нативный паттерн, но html-validate
  `form-dup-name` в проекте-потребителе потребует настройки
  (`shared: ['radio', 'checkbox']`) — решается на стороне сайта.
- VI-режим: цветов вне токенов нет (§5); `accent-color` перекрашивает
  vi.css (T9.1).

## Do / Don't

- **Do**: нативный инпут первым ребёнком label, текст следом.
- **Do**: ссылку политики — `<a class="ui-link">` внутри label.
- **Don't**: прятать инпут (`opacity: 0`, `display: none`, `appearance: none`
  + своя коробка) — класс D аудита career-portal: теряются клавиатура,
  скринридер и нативный рендер тем.
- **Don't**: текст ошибки внутри label — он попадёт в имя чекбокса.
- **Don't**: красить обязательность только звёздочкой — смысл дублирует
  скринридер-текст `__req-text`.

## Известные границы

- групповой обёртки-компонента (аналог ui-radio-group) нет — чекбоксы
  независимы и складываются колонкой сами; потребность в групповой
  семантике — fieldset/legend на стороне сайта (гейт на чекбоксы не
  заведён — требований нет);
- switch-переключателей нет (Out of scope T5.2; появятся — отдельный
  модификатор по тому же нативному паттерну);
- визуал disabled-текста (приглушение подписи) не задан одобренным
  дизайном; пересмотр — design-decision владельца.
