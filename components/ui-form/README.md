# ui-form

Форма как целое: адаптивная раскладка полей, двухколоночный лейаут с боковой
колонкой, сводная ошибка (`role="alert"`), success-состояние, легенда
обязательных полей и **JS-модуль клиентской валидации** `IraoUI.form` (T5.5) —
прогрессивное усиление: без JS форма полностью функциональна (нативная
валидация, ТЗ №14). Задачи T5.4/T5.5 переносят `.form-page`/`.form-grid`/
`.form-aside`/`.form-success` career-portal (css/pages.css:174–228) и
`js/forms.js` в mobile-first и неймспейс `IraoUI`; серверный контракт ошибок —
T5.6. Поля — `ui-field` (T5.1) и его семейство.

## API

| Что | Значение |
|---|---|
| Блок `.ui-form` | контейнер формы (на `<form>`): флекс-колонка блоков с шагом `--ui-space-5` (24px одобренного `.form-card`) |
| Элемент `.ui-form__grid` | сетка полей: 1 колонка на mobile → **2 от md** (768); gap — токен `--ui-form-grid-gap` (20px одобренного `.form-grid`, вне шкалы §3.2 — перенос «как есть»); треки `minmax(0, 1fr)` — длинное слово не распирает колонку |
| Поле на все колонки | `ui-field--wide` (T5.1): `grid-column: 1 / -1` — textarea, согласие, группы; вне grid-родителя инертно |
| Элемент `.ui-form__layout` | лейаут формы: стек на мобиле → 2 колонки **от lg** (1024): `minmax(0, 1fr) var(--ui-form-aside-width)` (400px одобренного `.form-page`), gap `--ui-space-7` (48px точно) |
| Элемент `.ui-form__main` | основная колонка: держит `__grid` и `__actions` одним блоком лейаута; data-хук сайта для свапа состояния — `data-ui-form-body` (демо стенда; контракт свапа — сайт/T5.5) |
| Элемент `.ui-form__aside` | боковая колонка (в разметке — `<aside>` с `aria-labelledby`): фон `--ui-color-surface-muted`, радиус md, от lg — `position: sticky; top: var(--ui-space-5)` (одобренный `.form-aside`; в стеке — статична); внутри — `__aside-title` (цвет primary), `__aside-text`, список пар `__aside-list` (класс на `<dl>`) → `__aside-row > __aside-label + __aside-value` |
| Элемент `.ui-form__summary` | сводная ошибка: **`role="alert"`** (немедленное объявление при появлении после сабмита) + **`tabindex="-1"`** (цель фокуса); фон `--ui-color-error-bg`; внутри — `__summary-title` (цвет `--ui-color-error`) и `__summary-list` — список ссылок на id полей; до момента скрыт атрибутом `hidden` |
| Ссылки summary | реальные `href="#id"` полей: переход фокуса по хэшу нативен во всех браузерах матрицы (проверено e2e chromium/firefox/webkit); доопределение краевых случаев (например, цель появляется скриптом) — фокус-скрипт T5.5 (Implementation requirements T5.4 п.2) |
| Элемент `.ui-form__success` | блок успеха: фон `--ui-color-success-bg`, gap `--ui-space-3` (12px одобренного), паддинг `--ui-space-5` (дифф 28 → 24, как в ui-card); до момента — `hidden`; работает и без JS (серверный рендер success-страницы — вариант Bitrix) |
| Элемент `.ui-form__success-title` | заголовок успеха (цвет `--ui-color-success`), **`tabindex="-1"` в разметке** — цель фокуса после показа |
| Элемент `.ui-form__success-actions` | CTA-лента (ui-button/ui-link; переносимая — паттерн `ui-error__actions`) |
| Элемент `.ui-form__footnote` | легенда обязательных полей: типографика — роль разметки (`ui-small ui-text--muted`); текст «… — обязательные поля» |
| Элемент `.ui-form__req` | маркер footnote — цвет акцента одобренного `.req` (пара `ui-field__req`); декоративен (`aria-hidden="true"`) — смысл несёт текст footnote (WCAG 1.4.1) |
| Токены | `--ui-form-grid-gap`, `--ui-form-aside-width` (новые, T5.4); `--ui-space-*`, `--ui-radius-md`, `--ui-color-{error,success}[-bg]`, `--ui-color-{primary,accent,text-muted}`; новых примитивов задача не вводила |

```html
<!-- минимальная форма: grid + actions + footnote (обвязка полей — ui-field) -->
<form class="ui-form" action="/apply/" method="post">
  <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
    <h2 class="ui-h4 ui-form__summary-title">В форме 2 ошибки</h2>
    <ul class="ui-form__summary-list">
      <li><a class="ui-link" href="#apply-name">Укажите имя и фамилию</a></li>
      <li><a class="ui-link" href="#apply-email">Исправьте адрес e-mail</a></li>
    </ul>
  </div>
  <div class="ui-form__grid">
    <div class="ui-field ui-field--required">…</div>
    <div class="ui-field ui-field--required">…</div>
    <div class="ui-field ui-field--wide">…</div>
  </div>
  <div class="ui-form__actions">
    <button class="ui-button ui-button--primary" type="submit">Отправить</button>
  </div>
  <p class="ui-small ui-text--muted ui-form__footnote">
    <span class="ui-form__req" aria-hidden="true">*</span> — обязательные поля
  </p>
</form>
```

## Правила фокуса (паттерны для T5.5/T5.6)

Смена состояния формы не должна терять пользователя (WCAG 3.3.1, фокус-менеджмент).
Задача фиксирует два правила; их исполняет JS-сторона (T5.5 — клиент, T5.6 —
inline-сниппет после перезагрузки), компонент даёт для этого разметку:

1. **Появилась сводная ошибка → фокус на `.ui-form__summary`.** Показ — снятие
   `hidden` (узел вставлен/раскрыт): `role="alert"` объявляет содержимое
   немедленно, программный фокус (`tabindex="-1"`) ставит пользователя в
   начало списка ошибок. Дальше — ссылки на поля.
2. **Успех → фокус на `.ui-form__success-title`.** Заголовок несёт
   `tabindex="-1"` в разметке, поэтому паттерн работает **и без JS** — сервер
   рендерит success-страницу сразу видимой, inline-сниппет переводит фокус
   после загрузки (вариант Bitrix). Свап «body скрыть / success показать» —
   логика сайта/T5.5 (демо стенда делает его по хуку `data-ui-form-body`).

Скроллирование к сфокусированному блоку браузер выполняет сам
(`scrollIntoView` из career-portal `js/forms.js` не требуется).

## JS-модуль: IraoUI.form (клиентская валидация, T5.5)

Модуль активируется на **`form[data-ui-form]`** и только усиливает нативную
форму: при инициализации он ставит форме `novalidate` — **в разметке
`novalidate` нет**, без JS браузерная валидация работает как есть (ТЗ №14;
«сервер — источник истины, JS — UX»). Порт `js/forms.js` career-portal:
чистые функции правил, контракт ошибок T5.6, фокус-менеджмент, события.

### Правила (из нативных атрибутов + data-расширения)

| Правило | Источник | Сообщение по умолчанию (RU) |
|---|---|---|
| Обязательное | `required` | «Заполните это поле»; чекбокс — «Отметьте этот пункт», радио — «Выберите вариант» (состояние ГРУППЫ: отмечен хотя бы один radio того же name), файл — «Прикрепите файл» |
| E-mail | `type="email"` | «Исправьте адрес e-mail» (регэксп career-portal, значение сверяется после trim); пустое опциональное поле проходит — с JS форма не строже, чем без JS (нативная семантика) |
| Формат | `pattern` | «Исправьте формат значения» (нативная семантика: значение сверяется целиком, пустое проходит, битый регэксп игнорируется) |
| Минимум символов | `minlength` | «Используйте не менее N символов» (пустое значение проходит) |
| Размер файла | `data-ui-max-size="байты"` | «Файл слишком большой — максимум 1 МБ» (лимит называется человекуемо) |
| Валидатор сайта | `data-ui-validate="имя"` | «Исправьте значение поля» (см. «Точки расширения») |

Текст **любого** правила поля переопределяется атрибутом
**`data-ui-error="текст"`** на контроле. Скрытые ветки (предок `[hidden]`) и
`disabled`-поля не валидируются (перенос career-portal; нативная валидация про
`[hidden]` не знает — настоящая скрытая ветка сайта обязана нести `disabled`).
Поле без обвязки `ui-field` получает только aria-контракт (без визуала);
ошибки всех полей — по контракту T5.6: `ui-field--error` на обвязке,
`aria-invalid="true"`, id ошибки дописывается в `aria-describedby` (hint
сохраняется), текст — в `ui-field__error` (создаётся при отсутствии,
`role="alert"`).

### Поведение

- **ошибка на `change`/`blur`** (после ухода с поля), **снятие на `input`** —
  модель career-portal: пользователь не наказывается на середине ввода;
  ошибки radio-группы синхронны: aria-invalid на каждом radio группы, один
  текст `ui-field__error` обвязки, одна запись в summary; выбор варианта
  снимает ошибку со всей группы;
- **сабмит с ошибками**: `preventDefault`, ошибки рендерятся на всех полях,
  сводная ошибка `.ui-form__summary` (T5.4) заполняется заголовком «В форме N
  ошибк(и/ок)» и ссылками `href="#id-поля"` на сообщения, показывается и
  **получает фокус**; если разметка без summary — фокус на первое невалидное
  поле (WCAG 3.3.1); клик по ссылке summary переводит фокус на поле
  (доопределение паттерна T5.4 для браузеров без хэш-фокуса);
- **валидный сабмит модуль ПРОПУСКАЕТ** (`preventDefault` не вызывается):
  страница перезагружается, сервер рендерит success/ошибки по контракту
  T5.6; повторная отправка блокируется до перезагрузки, кнопка сабмита —
  `is-loading` + `aria-busy="true"` (интеграция с ui-button, T4.2).

### События (для сайтов)

| Событие | Когда | `detail` |
|---|---|---|
| `irao-ui:form-invalid` | сабмит с ошибками (после рендера и фокуса) | `{ errors: [{ field, message }] }` |
| `irao-ui:form-valid` | сабмит прошёл валидацию (модуль его пропускает) | — |

События всплывают (`bubbles`) — слушайте на форме или на `document`.

### Точки расширения

- **Кастомное правило** — реестр `IraoUI.form.validators`: сайт пишет
  `IraoUI.form.validators.phone = function (field) { … }` и помечает поле
  `data-ui-validate="phone"`. Возврат: `true` — валидно; `false` —
  невалидно (сообщение по умолчанию); строка — невалидно с этим текстом.
  Кастомные правила бизнес-логики в модуль не встроены сознательно.
- **AJAX-отправка** — сайт отменяет навигацию своим `submit`-обработчиком
  (`event.preventDefault()`), слушает `irao-ui:form-valid`, отправляет данные
  сам и снимает состояние кнопки вызовом **`IraoUI.form.unlock(form)`**
  (без AJAX `unlock` не нужен — страницу перезагружает сервер).

### Публичное API

`IraoUI.form = { init, selector, checkRequired, checkEmail, checkPattern,
checkMinLength, checkFileSize, formatBytes, validateField, validators,
unlock }` — функции правил чистые и переиспользуемы сайтами; `validateField`
принимает контрол и возвращает сообщение или `null`.

## Состояния

- **база** — поля в grid, actions, footnote; summary/success скрыты (`hidden`).
- **ошибки** (клиент T5.5 или сервер T5.6): summary видим с `role="alert"`;
  у поля — `ui-field--error` + `aria-invalid="true"` + `aria-describedby`
  (контракт единый с T5.6). Ссылки summary дублируют тексты ошибок полей.
- **успех**: success видим, фокус на заголовке; форма скрыта свапом
  (`data-ui-form-body` → `hidden`) либо заменена success-страницей.

## Адаптив

Mobile-first, media только `min-width` из шкалы T2.5 (гейт stylelint):

| Ширина | `ui-form__grid` | `ui-form__layout` |
|---|---|---|
| < 768 | 1 колонка | стек (aside под полями) |
| 768–1023 | 2 колонки | стек |
| ≥ 1024 (lg) | 2 колонки | main + aside 400px, aside sticky |

## Клавиатура и a11y

- порядок Tab = порядок DOM: summary (если показана) → поля → actions;
  никакого `tabindex > 0`;
- summary — `role="alert"`: появляется после попытки сабмита и объявляется
  немедленно (Technical considerations T5.4); ссылки внутри — обычные
  ui-link (клавиатура и фокус — нативные);
- `<aside>` с `aria-labelledby` — именованная complementary-область;
  строки «label/value» — `<dl>`-семантика (список — элемент `__aside-list`:
  класс носит ресет UA-отступов dl/dt/dd — ADR-0002, вид определяет
  компонент, не браузер и не чужой CSS legacy-сайта);
- легенда обязательных — текстом, не только цветом: звёздочка декоративна
  (`aria-hidden`), смысл несёт видимый текст footnote;
- контраст пар (error-bg/error, success-bg/success, surface-muted/*) —
  гейт T2.3 (`npm run test:contrast`), axe — гейт e2e.

## Do / Don't

- **Do**: summary — первым ребёнком `.ui-form` (читается до полей); одна
  сводная ошибка на форму; тексты ссылок summary — конкретные («Исправьте
  адрес e-mail», не «Ошибка»).
- **Do**: `hidden` до момента на summary/success — атрибутом (гарантия
  base/reset.css: `[hidden]` бьёт любые display-правила).
- **Don't**: не заменяйте `role="alert"` на `role="status"` — сводная ошибка
  требует немедленного объявления (пары статус-сообщений — README ui-alert).
- **Don't**: не кладите summary внутрь `.ui-form__grid` — она не поле.
- **Don't**: не рисуйте звёздочку обязательности цветом без текста footnote
  и `aria-hidden` — дублирование смысла текстом обязательно (WCAG 1.4.1).
- **Don't**: логика валидации — только в модуле `ui-form.js` (`IraoUI.form`,
  T5.5) и коде сайта; в разметку/стили компонента и демо-скрипты стендов
  JS-поведение не встраивается (JS-хуки — только `data-ui-*`, ADR-0005).

## Bitrix (шаблон)

```php
<?php /** серверный рендер после перезагрузки: те же классы и aria, что у
        клиентской валидации (контракт T5.6); фокус на summary — inline-сниппет.
        Экранирование вывода ОБЯЗАТЕЛЬНО: $message/$field могут содержать
        пользовательские данные (XSS) — часть контракта T5.6. */
$charset = defined('SITE_CHARSET') ? SITE_CHARSET : 'UTF-8';
?>
<form class="ui-form" method="post" action="/local/ajax/apply.php">
  <?php if (!empty($arResult['FORM_ERRORS'])): ?>
    <div class="ui-form__summary" role="alert" tabindex="-1">
      <h2 class="ui-h4 ui-form__summary-title">
        В форме <?= count($arResult['FORM_ERRORS']) ?> ошибк(и)
      </h2>
      <ul class="ui-form__summary-list">
        <?php foreach ($arResult['FORM_ERRORS'] as $field => $message): ?>
          <?php $anchor = rawurlencode((string) $field); ?>
          <li><a class="ui-link"
                 href="#apply-<?= $anchor ?>"><?= htmlspecialchars((string) $message, ENT_QUOTES, $charset) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </div>
  <?php endif; ?>
  <div class="ui-form__grid">…поля (ui-field, ошибка — контракт T5.6)…</div>
  <div class="ui-form__actions">
    <button class="ui-button ui-button--primary" type="submit">Отправить</button>
  </div>
  <p class="ui-small ui-text--muted ui-form__footnote">
    <span class="ui-form__req" aria-hidden="true">*</span> — обязательные поля
  </p>
</form>
```

## Известные границы

- sticky aside — только ≥ lg; между 768 и 1023 форма одноколоночная, а сетка
  полей уже двухколоночная (одобренное поведение career-portal);
- `--ui-form-grid-gap` (20px) и `--ui-form-aside-width` (400px) — вне шкалы
  §3.2, перенос «как есть» (прецедент `--ui-card-gap`); пересмотр —
  design-decision владельца дизайна;
- многошаговые формы/визард — Out of scope (нет требований);
- валидация, события, блокировка сабмита — модуль `IraoUI.form` (T5.5,
  секция выше); серверный контракт и интеграционный стенд «форма целиком» —
  T5.6; VI-перекраска — T9.1.
