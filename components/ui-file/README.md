# ui-file

Доступный файловый инпут: кнопка-лейбл + визуально-скрытый нативный
`input[type="file"]` (sr-only клипом), значение выбора с `role="status"`,
доступная кнопка сброса. Задача T5.3 закрывает класс D аудита career-portal:
`.field__file input { display: none }` (css/pages.css:242) прятал нативный
контрол — стилизованная кнопка не замещала клавиатуру и скринридера.
Источник визуала — одобренный `.field__file` (css/pages.css:231–244:
флекс-коробка, gap 12px, 52px, фон surface-blue-50, радиус sm) и кнопка
`.btn--light` (components.css:92–93). Обвязка и состояния ошибки — `ui-field`
(T5.1).

## Правило системы: нативный контрол никогда не прячется

**На нативных контролах форм запрещены `display: none` и `visibility: hidden`
(а также `opacity: 0`-подмены и снятие из tab-порядка).** Такие приёмы убирают
контрол из tab-порядка и a11y-дерева — клавиатура и скринридер теряют поле
(анти-пример career-portal выше). Единственный разрешённый способ визуального
скрытия живого контрола — **sr-only-клип** (классический паттерн):

```css
.ui-file__input {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  white-space: nowrap;
  clip-path: inset(50%);
}
```

Контрол остаётся в tab-порядке, именуется скринридером, отправляется с формой.
Для не-интерактивных текстов (например, `ui-field__req-text`) достаточно
`clip-path: inset(50%)` — там клавиатурная достижимость не нужна.

## API

| Что | Значение |
|---|---|
| Блок `.ui-file` | коробка `.field__file`: flex (перенос длинного имени), gap `--ui-space-3` (12px), `min-height: var(--ui-field-height)` (52px одобренного; не `height` — 32px-база T3.6), padding `--ui-space-1 --ui-space-4` (4px 16px), фон `--ui-color-surface-muted`, радиус `--ui-radius-sm` |
| Элемент `.ui-file__button` | кнопка-лейбл — **единственный `label` инпута**: клик открывает выбор нативно, без JS; визуал `.btn--light` (подпись primary, pill, hover `--ui-color-surface-hover`); высота — `calc(var(--ui-field-height) - var(--ui-space-2))` (52px минус вертикальный паддинг коробки) |
| Элемент `.ui-file__input` | нативный `input[type="file"]`, sr-only клипом (см. правило выше); `accept`, `required`, `disabled` — нативные атрибуты |
| Элемент `.ui-file__button-text` | подпись кнопки («прикрепить файл» — паттерн career-portal) |
| Элемент `.ui-file__value` | значение выбора: «Файл не выбран» / «Выбран файл: имя, размер»; **`role="status"` в разметке** — обновление озвучивается скринридером |
| Элемент `.ui-file__reset` | кнопка «Убрать файл»: нативный `button type="button"`, скрыта (`hidden`) до выбора; очищает инпут и возвращает на него фокус |
| Элемент `.ui-file__hint` | accept-подсказка и ограничения (типы/размер) внутри коробки; визуал `.field__file-hint`; связь — `aria-describedby` инпута |
| JS-хук | `data-ui-file` на `.ui-file` — модуль `IraoUI.file` (значение, сброс, `form.reset`); без JS поле работает нативно, обратной связи «выбран/сброс» нет |
| JS API | `IraoUI.file.init()`, `IraoUI.file.selector`, `IraoUI.file.formatSize(bytes)` — чистый форматтер «245 КБ» / «1,5 МБ» (ru) |
| Токены | `--ui-field-height`, `--ui-space-*`, `--ui-radius-sm/pill`, `--ui-color-surface-muted/hover`, `--ui-color-primary/text/muted`, focus-тройка, `--ui-opacity-disabled`; новых токенов задача не вводила |

```html
<!-- полный паттерн: обязательное поле с ошибкой (обвязка ui-field, T5.1) -->
<div class="ui-field ui-field--required ui-field--error">
  <span class="ui-field__label" id="resume-label">
    Резюме
    <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>
  </span>
  <div class="ui-file" data-ui-file>
    <label class="ui-file__button">
      <input class="ui-file__input" type="file" id="resume" name="resume"
             accept=".doc,.docx,.pdf" required aria-invalid="true"
             aria-labelledby="resume-label" aria-describedby="resume-hint resume-error">
      <span class="ui-file__button-text">прикрепить файл</span>
    </label>
    <p class="ui-file__value" role="status">Файл не выбран</p>
    <button class="ui-file__reset" type="button" hidden>Убрать файл</button>
    <span class="ui-file__hint" id="resume-hint">doc, docx, pdf — до 5 Мб; файл не обязателен</span>
  </div>
  <p class="ui-field__error" id="resume-error" role="alert">Прикрепите резюме в формате doc, docx или pdf</p>
</div>
```

## Один label: имя поля через aria-labelledby

Кнопка-лейбл — обёртка-`label` вокруг инпута (активация кликом работает
нативно, без JS). Второй `label` (например, `ui-field__label` с `for`) дал бы
полю **две** метки — axe `form-field-multiple-labels` (неопределённость
accessible name в AT). Поэтому:

- имя поля задаёт **текст обвязки** — `<span class="ui-field__label" id="…">`
  (класс тот же, визуал идентичен label-полям T5.1);
- инпут ссылается на него `aria-labelledby="…"`;
- `aria-describedby` ведёт на `ui-file__hint` и `ui-field__error` (списком).

Скринридер объявляет: «Резюме, обязательное поле — кнопка выбора файла».
Клик по тексту обвязки диалог не открывает — аффорданс один: кнопка.

## Состояния

- **пусто** — значение «Файл не выбран», кнопка сброса скрыта (`hidden`).
- **выбран** — `ui-file__value`: «Выбран файл: имя, размер» (`formatSize`:
  Б/КБ/МБ/ГБ, дробь через запятую); кнопка «Убрать файл» появляется;
  `role="status"` озвучивает обновление. Повторный выбор обновляет значение;
  отмена диалога (Escape) `change` не даёт — состояние не меняется.
- **ошибка** — обвязка `ui-field--error` + `aria-invalid="true"` +
  `aria-describedby` (hint + error); переключение — за валидацией (T5.5) и
  серверным рендером (T5.6).
- **disabled** — нативный атрибут: диалог не открывается, Tab пропускает;
  гаснет видимый аффорданс — кнопка-лейбл (`:has(.ui-file__input:disabled)`,
  токен `--ui-opacity-disabled`; аналог затемнения инпута в ui-field),
  значение и подсказка остаются полноконтрастными (axe color-contrast
  учитывает opacity предка — информационный текст затемнять нельзя).

## Клавиатура и a11y

- **Tab** достигает sr-only-инпута (нативный порядок DOM); **Enter/Space**
  открывают диалог выбора.
- Видимый фокус: обводку рисует кнопка-лейбл через
  `:has(.ui-file__input:focus-visible)` — focus-тройка токенов (ADR-0001);
  собственный outline инпута невидим за клипом, но не гасится.
- После клика по кнопке-лейблу `activeElement` — инпут (нативная активация
  label; поведение зафиксировано e2e).
- Сброс (клик или Enter на «Убрать файл») возвращает фокус на инпут — кнопка
  исчезает, фокус не теряется в body.
- Значение выбора — `role="status"` (живая область, polite): имя и размер
  файла объявляются сразу после выбора.
- Контраст: подпись primary на surface-muted, hint muted, значение text —
  пары гейта T2.3 (`npm run test:contrast`).

## Без JS и form.reset

Прогрессивное улучшение: без `ui-file.js` (и `data-ui-file`) поле полностью
рабочее — Tab, диалог, отправка файла нативны; недоступны только обратная
связь «выбран» и кнопка сброса (нативный file-инпут не очищается без JS).
С нативным `form.reset()` значение поля очищается, но `change` не возникает —
модуль перерисовывает значение после события `reset` формы.

## Do / Don't

- **Do**: `data-ui-file` на каждой копии `.ui-file`; уникальные `id` инпута,
  label-текста, hint и error на странице.
- **Do**: ограничения (типы/размер) — в `ui-file__hint` + нативный `accept`
  (`.doc,.docx,.pdf` — паттерн career-portal); серверная проверка первична.
- **Don't**: `display: none` / `visibility: hidden` / `opacity: 0` на
  нативном инпуте (или любом контроле форм) — анти-паттерн career-portal,
  класс D аудита; только sr-only-клип.
- **Don't**: второй `label` с `for` на инпут — две метки ломают
  `form-field-multiple-labels` (axe); имя поля — через `aria-labelledby`.
- **Don't**: текст ошибки внутрь `.ui-file` — он станет частью контекста
  кнопки; ошибка живёт в обвязке `ui-field` и связывается `aria-describedby`.
- **Don't**: стилизовать значения inline-стилями или hex — темы и VI-режим
  (инвариант §5).

## Bitrix (шаблон)

```php
<div class="ui-field <?= $errors['resume'] ? 'ui-field--error' : '' ?>">
  <span class="ui-field__label" id="apply-resume-label">Резюме</span>
  <div class="ui-file" data-ui-file>
    <label class="ui-file__button">
      <input class="ui-file__input" type="file" id="apply-resume" name="resume"
             accept=".doc,.docx,.pdf" required
             aria-labelledby="apply-resume-label"
             <?= $errors['resume'] ? 'aria-invalid="true" aria-describedby="apply-resume-error"' : '' ?>>
      <span class="ui-file__button-text">прикрепить файл</span>
    </label>
    <p class="ui-file__value" role="status">Файл не выбран</p>
    <button class="ui-file__reset" type="button" hidden>Убрать файл</button>
    <span class="ui-file__hint">doc, docx, pdf — до 5 Мб; файл не обязателен</span>
  </div>
  <?php if ($errors['resume']): ?>
    <p class="ui-field__error" id="apply-resume-error" role="alert"><?= $errors['resume'] ?></p>
  <?php endif; ?>
</div>
```

## Известные границы

- мультизагрузка (`multiple`) и drag&drop — Out of scope T5.3 (требований
  нет; паттерн расширяется сайтом: `multiple` + свой рендер списка на том же
  `role="status"`);
- прогресс загрузки — зона сайта;
- без JS кнопка «Убрать файл» недоступна — нативное ограничение file-инпута
  (очистка только скриптом); поле при этом продолжает работать;
- `:has()` — evergreen-матрица (прецедент стрелки select T5.2); в браузерах
  без `:has()` фокус-обводка кнопки и гашение disabled не сработают —
  деградация косметическая, клавиатура не страдает (глобальный outline
  инпута остаётся);
- правило размера файла — за валидационным модулем T5.5;
- VI-перекраска функционально не проверялась в этой задаче — T9.1.
