# ui-field

Поле формы: обвязка label / required-маркер / hint / error и контролы
`input` (text, email, tel, password, date, number) и `textarea`. Задача T5.1 —
основа всех контролов форм: select/checkbox/radio (T5.2), file (T5.3) и
раскладка (T5.4) используют ту же обвязку и те же модификаторы. Источник —
`.field*` career-portal (components.css:130–187): флекс-колонка, label 14/500,
контрол 52px с bg surface-muted и прозрачной рамкой, focus → белый фон + рамка
primary, `--error` → рамка error + фон error-bg, текст ошибки fs-micro.
Система добавляет: hint, связность aria, состояния disabled/readonly,
требование «масштаб шрифта не режет поле».

## API

| Что | Значение |
|---|---|
| Блок `.ui-field` | корень: флекс-колонка, шаг `--ui-space-2` (8px одобренного `.field`) |
| Модификатор `.ui-field--error` | состояние ошибки: рамка/фон контролов (`--ui-color-error`/`--ui-color-error-bg`) + показ `__error` |
| Модификатор `.ui-field--required` | хук разметки «поле обязательное»: на корне; видимый маркер — элемент `__req` (собственных стилей у модификатора нет) |
| Модификатор `.ui-field--wide` | поле на все колонки grid-родителя (`grid-column: 1 / -1`); потребитель — раскладка [ui-form](doc:ui-form) (T5.4), вне grid инертен |
| Элемент `.ui-field__label` | `label` 14/500 (`--ui-fs-small`/`--ui-fw-small`); **обязателен `for` с id контрола** |
| Элемент `.ui-field__req` | маркер обязательности: видимая звёздочка `*` акцентом (одобренный `.req`, components.css:142) |
| Элемент `.ui-field__req-text` | текст «обязательное поле» для скринридера внутри `__req`; визуально скрыт клипом (display:none запрещён) |
| Элемент `.ui-field__input` | контрол: `input` типов text/email/tel/password/date/number |
| Элемент `.ui-field__select` | нативный `select` в коробке поля (T5.2): `appearance: none` (без индикатора запрещено); выпадающий список остаётся нативным |
| Элемент `.ui-field__select-wrap` | обёртка select (обязательна): точка позиционирования стрелки — `::after` с `mask-image` по svg без цвета (alpha-маска) и `background-color: var(--ui-color-text-muted)` — цвет стрелки токен-перекрашиваемый |
| Элемент `.ui-field__textarea` | `textarea`: `min-height` (`--ui-field-textarea-min-height`, 120px), `resize: vertical`, фикс. высоты нет |
| Элемент `.ui-field__hint` | постоянная подсказка (fs-micro, muted); всегда видима, связывается `aria-describedby` |
| Элемент `.ui-field__error` | текст ошибки (fs-micro, `--ui-color-error`); вне `--error` скрыт; `role="alert"` в разметке |
| JS | модуля нет (состояния — в разметке; переключает их валидационный модуль T5.5) |
| Токены | геометрия: `--ui-field-height` (52px → min-height), `--ui-field-textarea-min-height`, `--ui-field-textarea-padding-y` (14px, вне шкалы §3.2 — перенос «как есть»); радиус `--ui-radius-sm`, рамка `--ui-border-width`, цвета — слой 2 |

```html
<!-- ошибка: визуал и aria в одном паттерне — копипаст даёт доступный результат -->
<div class="ui-field ui-field--required ui-field--error">
  <label class="ui-field__label" for="apply-email">
    Служебный e-mail
    <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>
  </label>
  <input class="ui-field__input" type="email" id="apply-email" name="email"
         placeholder="name@example.com" autocomplete="email" required
         aria-invalid="true" aria-describedby="apply-email-hint apply-email-error">
  <p class="ui-field__hint" id="apply-email-hint">Используется для уведомлений о статусе отклика</p>
  <p class="ui-field__error" id="apply-email-error" role="alert">
    Адрес неполный: добавьте домен — name@example.com
  </p>
</div>
```

## Связность (контракт доступности, работает без JS)

- **label обязателен**: `<label class="ui-field__label" for="…">` указывает на
  id контрола — клик по label ставит фокус в поле, скринридер именует поле.
  Скрывать label (например, оставляя только placeholder) запрещено.
- **hint**: `aria-describedby` контрола содержит id хинта — подсказка
  озвучивается после имени поля.
- **error**: в состоянии `--error` контрол несёт `aria-invalid="true"`, а
  `aria-describedby` — список «hint error»: id текста ошибки. Текст в DOM,
  виден, `role="alert"` — вставленная/обновлённая ошибка объявляется
  скринридером немедленно (паттерн 02-architecture §6.3). Валидационный
  модуль (T5.5) и серверный рендер Bitrix переключают одни и те же атрибуты.
- Серверная ошибка рендерится теми же классами и атрибутами (см. Bitrix
  ниже) — после перезагрузки страницы поле выглядит и звучит как при
  клиентской валидации.

### Required-паттерн

Обязательность выражается тремя вещами сразу:

1. нативный атрибут `required` на контроле (скринридер объявляет,
   `aria-required` дублировать не нужно; валидация — серверная первично);
2. видимый маркер `__req` — звёздочка акцентом; она декоративна
   (`aria-hidden="true"`) — цвет сам по себе смысл не передаёт (WCAG 1.4.1);
3. текст «обязательное поле» для скринридера — `ui-field__req-text` внутри
   маркера (визуально скрыт клипом, в a11y-дереве есть).

Корень помечается модификатором `--required` (хук для стилей/скриптов).
Формулировка при ошибке — «Заполните поле …», не «поле обязательно» (пользователь
уже пытался).

## Placeholder-политика

**placeholder ≠ label.** Placeholder — пример формата (`name@example.com`,
`+7 900 000-00-00`), не подпись и не инструкция:

- placeholder исчезает при вводе — не оставляйте в нём единственную
  подсказку; постоянная подсказка — `ui-field__hint`;
- label всегда видим; поле без видимой подписи — дефект доступности
  (критерий 3.3.2), даже если placeholder есть;
- placeholder красится токеном muted с `opacity: 1` (пара
  `muted-on-surface-muted` контраст-гейта T2.3 предполагает непрозрачный цвет).

## Autocomplete-рекомендации (WCAG 1.3.5)

Автозаполнение не отключается: `autocomplete="off"` запрещён политикой —
браузеры и менеджеры паролей снижают количество ошибок ввода. Рекомендуемые
пары для паттернов:

| Тип поля | autocomplete |
|---|---|
| ФИО | `name`, `given-name`, `family-name` |
| E-mail | `email` |
| Телефон | `tel` |
| Пароль (ввод нового) | `new-password` |
| Пароль (вход) | `current-password` |
| Дата рождения | `bday` |
| Город | `address-level2` |
| Одноразовый код | `one-time-code` |

## Состояния и геометрия

- **default** — bg `--ui-color-surface-muted`, прозрачная рамка (толщина
  `--ui-border-width` зарезервирована — все состояния в одной коробке).
- **focus** — фирменный паттерн career-portal: фон → `--ui-color-surface`,
  рамка → `--ui-color-primary`; на `:focus-visible`. Паттерн **дополняет**
  глобальный outline политики ADR-0001 (base/focus.css) — не заменяет его:
  outline не гасится.
- **error** — модификатор `--error`: рамка/фон контролов `error`/`error-bg`,
  показ `__error`; контраст текста ошибки на белом — 5.10:1, на error-bg —
  4.80:1 (пары гейта T2.3). В состоянии «ошибка + фокус» виз. паттерн поля
  остаётся ошибочным — видимый фокус несёт outline.
- **disabled** — нативный атрибут: не фокусируется и не редактируется; визуал
  — затемнение `--ui-opacity-disabled` (прецедент ui-button).
- **readonly** — нативный атрибут: фокусируется и копируется, значение не
  редактируется; одобренным дизайном визуал не задан — отличие поведенческое
  (+ `cursor: default` как аффорданс-подсказка).
- Высота контролов — `min-height: var(--ui-field-height)` (52px одобренного
  макета): при 32px-базе T3.6 поле растёт вместе с текстом, значение не
  обрезается (e2e-сценарий в `tests/e2e/ui-field.spec.js`). `height`
  запрещён. Textarea: фикс. высоты нет, `min-height`
  `--ui-field-textarea-min-height`, `resize: vertical`; авто-рост — опция
  модуля T5.5.
- Иконки валидации не введены (анти-overengineering): смысл ошибки несёт её
  текст; если сайт добавляет иконку — только декоративную (`aria-hidden`),
  смысл дублируется текстом.

## Клавиатура и a11y

- Tab достигает контролов в порядке DOM; disabled — пропускается нативно,
  readonly — достигается (значение выделяется и копируется).
- Фокус видим всегда: фирменный bg-swap + глобальный outline (ADR-0001).
- Ошибка объявляется: текст в DOM, связан `aria-describedby`, `role="alert"`.
- Контраст: текст, hint, placeholder и значение на error-bg — пары ≥ 4.5:1
  гейта T2.3 (`npm run test:contrast`); e2e пинит computed-пары.
- VI-режим (T9.1): цветов вне токенов нет — перекраска `!important` накроет
  поля как обычные элементы (инвариант §5); функциональная проверка — за T9.1.

## Do / Don't

- **Do**: `<label class="ui-field__label" for="…">` с `for` = id контрола —
  каждая копия паттерна со своей парой id (id уникальны на странице).
- **Do**: hint и error вместе — `aria-describedby="hint-id error-id"`
  (списком, hint первым).
- **Do**: серверную ошибку рендерить тем же паттерном (Bitrix ниже).
- **Don't**: `placeholder` вместо label или как единственная подсказка —
  исчезает при вводе, скринридер не именует поле.
- **Don't**: `autocomplete="off"` — против WCAG 1.3.5 и менеджеров паролей.
- **Don't**: `height` на контролах — 32px-база T3.6 обрежет значение; только
  `min-height`.
- **Don't**: красить ошибку только рамкой/звёздочкой без текста — смысл
  обязан быть в DOM и связан с полем.
- **Don't**: стилизовать поля inline-стилями или hex — ломает темы и
  VI-режим (инвариант §5).

## Bitrix (шаблоны)

Паттерн копируется в `template.php`; серверные ошибки рендерятся теми же
классами и aria-атрибутами, что и клиентские — форма и фронт выглядят
одинаково (паттерн career-portal, 02-architecture §6.3):

```php
<div class="ui-field <?= $errors['email'] ? 'ui-field--error' : '' ?>">
  <label class="ui-field__label" for="apply-email">
    Служебный e-mail<span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>
  </label>
  <input class="ui-field__input" type="email" id="apply-email" name="email"
         value="<?= htmlspecialchars($form['email']) ?>"
         autocomplete="email" required
         <?= $errors['email'] ? 'aria-invalid="true" aria-describedby="apply-email-error"' : '' ?>>
  <?php if ($errors['email']): ?>
    <p class="ui-field__error" id="apply-email-error" role="alert"><?= $errors['email'] ?></p>
  <?php endif; ?>
</div>
```

## Известные границы

- checkbox / radio — отдельные блоки на той же обвязке (T5.2: ui-checkbox,
  ui-radio + ui-radio-group), file — T5.3;
- стрелка select (рендз-замечание T5.2): цвет — `background-color` из
  токена `--ui-color-text-muted` на `::after` обёртки, форма —
  alpha-`mask-image` по svg без цвета (цветной hex в data-URI нарушил бы
  инвариант «hex только в primitives»: stylelint-гейт в url()-строки не
  заглядывает). Тематическая перекраска работает: переопределение
  `--ui-color-text-muted` меняет стрелку. VI-режим: vi.css (T9.1)
  перекрашивает стрелку тем же свойством (`background-color`
  псевдоэлемента), отдельная передача не требуется;
- гашение стрелки disabled-поля — `:has()` (evergreen-матрица);
  в браузерах без `:has()` стрелка disabled-поля остаётся яркой —
  деградация косметическая;
- клиентская валидация (фокус на первую ошибку, live-проверки) — T5.5;
- раскладка форм и сводная ошибка — T5.4, серверный контракт — T5.6;
- визуал readonly-состояния одобренным дизайном не задан (поведенческое
  отличие); пересмотр — design-decision владельца;
- `date`/`number` — нативные контролы браузера: календарная кнопка и
  счётчик рисуются UA и темами не перекрашиваются (сознательно — без
  кастомных пикеров, P2/do-not-build);
- VI-перекраска полей функционально не проверялась в этой задаче — T9.1.
