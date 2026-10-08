# ui-form

Форма как целое: адаптивная раскладка полей, двухколоночный лейаут с боковой
колонкой, сводная ошибка (`role="alert"`), success-состояние и легенда
обязательных полей. Задача T5.4 переносит `.form-page`/`.form-grid`/
`.form-aside`/`.form-success` career-portal (css/pages.css:174–228) в
mobile-first и задаёт **паттерны фокуса** для модуля валидации (T5.5) и
серверного контракта Bitrix (T5.6). Поля — `ui-field` (T5.1) и его семейство;
JS-модуля у компонента нет сознательно (логика состояний — T5.5/T5.6).

## API

| Что | Значение |
|---|---|
| Блок `.ui-form` | контейнер формы (на `<form>`): флекс-колонка блоков с шагом `--ui-space-5` (24px одобренного `.form-card`) |
| Элемент `.ui-form__grid` | сетка полей: 1 колонка на mobile → **2 от md** (768); gap — токен `--ui-form-grid-gap` (20px одобренного `.form-grid`, вне шкалы §3.2 — перенос «как есть»); треки `minmax(0, 1fr)` — длинное слово не распирает колонку |
| Поле на все колонки | `ui-field--wide` (T5.1): `grid-column: 1 / -1` — textarea, согласие, группы; вне grid-родителя инертно |
| Элемент `.ui-form__layout` | лейаут формы: стек на мобиле → 2 колонки **от lg** (1024): `minmax(0, 1fr) var(--ui-form-aside-width)` (400px одобренного `.form-page`), gap `--ui-space-7` (48px точно) |
| Элемент `.ui-form__main` | основная колонка: держит `__grid` и `__actions` одним блоком лейаута; data-хук сайта для свапа состояния — `data-ui-form-body` (демо стенда; контракт свапа — сайт/T5.5) |
| Элемент `.ui-form__aside` | боковая колонка (в разметке — `<aside>` с `aria-labelledby`): фон `--ui-color-surface-muted`, радиус md, от lg — `position: sticky; top: var(--ui-space-5)` (одобренный `.form-aside`; в стеке — статична); внутри — `__aside-title` (цвет primary), `__aside-text`, пары `__aside-row > __aside-label + __aside-value` (семантика `<dl>`: `<div>`-обёртки допустимы) |
| Элемент `.ui-form__summary` | сводная ошибка: **`role="alert"`** (немедленное объявление при появлении после сабмита) + **`tabindex="-1"`** (цель фокуса); фон `--ui-color-error-bg`; внутри — `__summary-title` (цвет `--ui-color-error`) и `__summary-list` — список ссылок на id полей; до момента скрыт атрибутом `hidden` |
| Ссылки summary | реальные `href="#id"` полей: переход фокуса по хэшу нативен (chromium/firefox), не переносящие фокус браузеры доопределяются фокус-скриптом T5.5 (Implementation requirements T5.4 п.2) |
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
  строки «label/value» — `<dl>`-семантика;
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
- **Don't**: JS-логика валидации/свапа внутри компонента — модуль T5.5 и
  сайт; компонент — разметка и стили.

## Bitrix (шаблон)

```php
<?php /** серверный рендер после перезагрузки: те же классы и aria, что у
        клиентской валидации (контракт T5.6); фокус на summary — inline-сниппет */ ?>
<form class="ui-form" method="post" action="/local/ajax/apply.php">
  <?php if (!empty($arResult['FORM_ERRORS'])): ?>
    <div class="ui-form__summary" role="alert" tabindex="-1">
      <h2 class="ui-h4 ui-form__summary-title">
        В форме <?= count($arResult['FORM_ERRORS']) ?> ошибк(и)
      </h2>
      <ul class="ui-form__summary-list">
        <?php foreach ($arResult['FORM_ERRORS'] as $field => $message): ?>
          <li><a class="ui-link" href="#apply-<?= $field ?>"><?= $message ?></a></li>
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
- валидация, события, блокировка сабмита — T5.5; серверный контракт и
  интеграционный стенд «форма целиком» — T5.6; VI-перекраска — T9.1.
