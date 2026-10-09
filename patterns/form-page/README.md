# Паттерн «Страница формы» (T8.3)

Референс страницы-формы с информационной колонкой — перенос композиции
`career-portal` (`src/pages/vacancy-apply.html` + `.form-aside*` из
`build.py render_vacancy_apply`) на компоненты системы. Эталонная сборка
целиком: [`form-page.html`](form-page.html) — она же стенд
`/showcase/dist/stands/patterns/form-page.html` (генерируется
`showcase/build.mjs`).

Собирается **без нового CSS системы**: только компоненты (`ui-form` T5.4,
`ui-field` T5.1, `ui-checkbox` T5.2, `ui-button`, `ui-breadcrumbs` T4.7,
`ui-link`) и роли типографики T3.3. Связующие стили — зона сайта (в бою —
`template_styles.css`; на стенде — `<style>` рядом, не в `dist`); связки
именуются `fpp-*`. Если какой-то связке понадобится место в системе —
поднимается вопрос о компоненте (Scope T8.3), а не о расширении паттерна.

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Крошки | `ui-breadcrumbs` | T4.7; текущая страница («Отклик») — `span` + `aria-current="page"` |
| page-head | h1 «Отклик» (`ui-h1`) + lead (`ui-lead`) | подроли типографики T3.3 |
| Форма | `ui-form` (T5.4) + поля `ui-field`/`ui-checkbox` | `data-ui-form` — хук модуля `IraoUI.form` (T5.5); в разметке нет `novalidate` |
| Aside-сводка | `ui-form__aside`: title/text/rows | перенос `form-aside` career-portal; возврат к вакансии — `ui-button`-ссылка |
| Полный форма-цикл | ветки T5.6, встроенные в страницу | живая форма → «серверный ответ» (pre-rendered + inline-фокус) → success |

## Решение: aside-сводка — до формы в порядке чтения (Implementation requirements п.1)

Спека оставляла выбор («после формы — или до») за UX-логикой. Решение
паттерна, зафиксированное эталоном: **сводка вакансии идёт ДО формы на всех
вьюпортах** — `<aside class="ui-form__aside">` стоит в DOM **раньше**
`ui-form__main`.

- **UX**: пользователь сначала видит, на какую вакансию откликается (заголовок,
  короткий текст, пары «метка — значение»), потом заполняет длинную анкету;
  ссылка «Вернуться к вакансии» доступна до начала заполнения.
- **A11y**: DOM-порядок = порядок чтения скринридера = порядок фокуса на всех
  вьюпортах (Accessibility requirements T8.3). Никакого CSS-перепорядочивания:
  на мобильном стеке aside естественно оказывается над формой.
- **Десктоп (одобренная раскладка career-portal)**: от lg (1024) связка сайта
  ставит aside в правую колонку grid'а через `grid-column` — DOM не
  переставляется, порядок чтения не зависит от вьюпорта:

```css
@media (min-width: 1024px) {
  .fpp-form .ui-form__main {
    grid-column: 1;
    grid-row: 1;
  }

  .fpp-form .ui-form__aside {
    grid-column: 2;
    grid-row: 1;
  }
}
```

Автоплейсмент grid'а иначе разложил бы DOM-порядок (aside, main) в колонки
«aside слева, форма справа» — `grid-column` возвращает одобренную раскладку
«форма слева, aside (`--ui-form-aside-width`, 400px) справа». Sticky aside —
работа компонента `ui-form` (только ≥ lg, одобренный `top: 24px`).

## Разметка

Копируйте блоки из [`form-page.html`](form-page.html) (он же — живой стенд).
Ключевые решения:

### page-head: крошки → h1 «Отклик» → lead

```html
<nav class="ui-breadcrumbs" aria-label="Хлебные крошки">…</nav>
<h1 class="ui-h1">Отклик на вакансию</h1>
<p class="ui-lead">Заполните анкету — компания рассмотрит отклик…</p>
```

Крошки — до page-head (конвенция паттернов T8.2); текущая страница — `span`
с `aria-current="page"`, не ссылка. Заголовок страницы — единственный h1
(гейт `irao/one-h1`); lead — подроль `ui-lead`.

### Форма + aside-сводка (перенос form-aside)

```html
<form class="ui-form" method="post" action="/vacancy-apply/" data-ui-form>
  <div class="ui-form__summary" role="alert" tabindex="-1" hidden>…</div>
  <div class="ui-form__layout">
    <aside class="ui-form__aside" aria-labelledby="apply-aside-title">
      <h2 class="ui-h4 ui-form__aside-title" id="apply-aside-title">Ведущий инженер…</h2>
      <p class="ui-body ui-form__aside-text">АО «Интер РАО – Электрогенерация», Москва…</p>
      <dl class="ui-form__aside-list">
        <div class="ui-form__aside-row">
          <dt class="ui-small ui-text--muted ui-form__aside-label">Опыт работы</dt>
          <dd class="ui-small ui-form__aside-value">От 3 лет</dd>
        </div>
      </dl>
      <a class="ui-button ui-button--outline" href="/vacancy/123/">Вернуться к вакансии</a>
    </aside>
    <div class="ui-form__main" data-ui-form-body>
      <div class="ui-form__grid">…поля ui-field…</div>
      <div class="ui-form__actions">…</div>
      <p class="ui-small ui-text--muted ui-form__footnote">…</p>
    </div>
  </div>
</form>
```

- `summary` — **первым ребёнком** `.ui-form` (читается до полей — правило
  Do компонента); до момента скрыта атрибутом `hidden`.
- Aside — семантический `<aside>` с `aria-labelledby` на заголовок панели
  (именованная complementary-область); пары «метка — значение» — `dl`-семантика.
- **Возврат к вакансии — ссылка**, а не кнопка: переход работает без JS;
  вид действия даёт `ui-button` (link-button).
- Поля — `ui-field` (T5.1); файл резюме — `data-ui-max-size` в байтах (T5.3);
  обязательность — `required` + `ui-field--required`; легенда — `__footnote`.
- Дисклеймер ПД (контекст T8.3): обязательный чекбокс согласия (`ui-checkbox`).
  Ссылки на текст согласия и Политику — в `ui-field__hint` **вне** подписи
  поля: клик по ссылке внутри `label` переключал бы чекбокс.

### Полный форма-цикл: стенд T5.6 встраивается в страницу

Эталон несёт все ветки цикла одной страницей (якоря-состояния для e2e и
visual; в бою это разные загрузки одной страницы):

1. **Живая форма** (выше) — без JS работает нативной валидацией (ТЗ №14),
   с JS её предваряет модуль `IraoUI.form` (T5.5).
2. **«Серверный ответ»** — сервер вернул форму с вводом пользователя и
   ошибками: разметка та же, что у клиентской валидации (контракт T5.6:
   `ui-field--error` + `aria-invalid="true"` + `aria-describedby`, суффикс id
   `-error`, сводная видимая с `role="alert"`); фокус на сводную ставит
   inline-сниппет — копия `irao_ui_form_focus_script()` из
   `bitrix/snippets/form-error-render.php`.
3. **Success** — success-блок рендерится сразу видимым (без JS, вариант
   Bitrix); заголовок несёт `tabindex="-1"` — цель фокуса сниппета; CTA-лента
   (`ui-form__success-actions`) ведёт к списку вакансий (паттерн T8.1).

Правило цикла (T5.6): **серверная валидация всегда включена** — JS только
улучшает UX.

## A11y

- **Порядок чтения: крошки → h1 → aside-сводка → поля формы** — DOM-порядок =
  смысловой на всех вьюпортах (решение выше); aside — именованная
  complementary-область, доступна скринридеру до формы.
- **Фокус-порядок формы естественный** (Accessibility requirements T8.3):
  порядок Tab = порядок DOM (сводка, если показана → aside-ссылка «Вернуться»
  → поля → actions); `novalidate` в разметке нет — без JS форма валидируется
  браузером; никакого `tabindex > 0` (гейт `irao/no-positive-tabindex`).
- **Смена состояния не теряет пользователя** (правила фокуса T5.4): появилась
  сводная ошибка → фокус на `__summary` (`role="alert"` + `tabindex="-1"`);
  success → фокус на `__success-title` (`tabindex="-1"`).
- Заголовки: h1 → h2 (aside, ветки цикла) → h3 (заголовки сводных/успеха
  веток) — без пропусков (гейт `irao/heading-order`).
- Ссылки согласия — вне `label` чекбокса (см. выше).

## Bitrix-заметки (AC: шаблон формы отклика, сверка aside с данными элемента)

Страница собирается из двух источников данных: **веб-форма отклика** и
**элемент ИБ вакансии** (aside-сводка).

### Форма отклика — `bitrix:form.result.new`

```php
<?php // Эскиз; копипаст-готовый рендер ошибок — bitrix/snippets/form-error-render.php.
   // Серверная валидация ВСЕГДА включена (правило цикла T5.6): модуль T5.5
   // только предваряет её на клиенте. ?>
<?php if (!empty($arResult['FORM_ERRORS'])): ?>
  <div class="ui-form__summary" role="alert" tabindex="-1">
    <h2 class="ui-h4 ui-form__summary-title">
      В форме <?= count($arResult['FORM_ERRORS']) ?> ошибк(и/ок)
    </h2>
    <ul class="ui-form__summary-list">
      <?php foreach ($arResult['FORM_ERRORS'] as $field => $message): ?>
        <li><a class="ui-link" href="#<?= htmlspecialcharsbx((string) $field) ?>-error"><?= htmlspecialcharsbx((string) $message) ?></a></li>
      <?php endforeach; ?>
    </ul>
  </div>
<?php endif; ?>
<div class="ui-form__layout">
  <?php // aside-сводка — ниже; затем __main с полями $arResult (ui-field):
     // обязательность — REQUIRED, e-mail — type="email", файл — data-ui-max-size;
     // при ошибках — контракт T5.6 (ui-field--error, aria-invalid, id "-error"). ?>
</div>
<?php // Фокус на сводную — irao_ui_form_focus_script('<id сводной>') из сниппета;
   // success-ветка — irao_ui_form_focus_script('<id success-заголовка>'). ?>
```

- `FORM_ERRORS` рендерятся по контракту T5.6 — пользователь видит один
  интерфейс ошибок до и после сабмита (e2e сверяет идентичность
  computed-состояний: `tests/e2e/form-full-cycle.spec.js`).
- Экранирование вывода обязательно (XSS — часть контракта T5.6).

### Aside-сводка — сверка с данными элемента вакансии

Aside рендерится из **свойств элемента ИБ вакансии**, а не из формы: заголовок
— `NAME`, текст — `PREVIEW_TEXT`/`DETAIL_TEXT`, пары «метка — значение» —
`DISPLAY_PROPERTIES` (EXPERIENCE, DIRECTION, EMPLOYMENT…), ссылка возврата —
`DETAIL_PAGE_URL`. Сверяйте значения aside с данными элемента на каждой
загрузке: если вакансия закрыта (`ACTIVE = N`) — страница отклика должна
редиректить на список, а не показывать сводку закрытой вакансии. Один и тот
же элемент питает и детальную страницу (паттерн T8.2, `form-aside`-структура),
и сводку на форме отклика — расхождений быть не должно.

- Связующие стили (`fpp-*`) перенесите в `template_styles.css` сайта —
  источник: `<style>` в [`form-page.html`](form-page.html), значения — только
  токены `--ui-*`.
- Ветки цикла — состояния одной и той же страницы: шаблон рендерит сводную
  (`FORM_ERRORS`) или success-блок по результату сохранения, а не отдельные
  страницы.

## Do / Don't

- **Do**: summary — первым ребёнком `.ui-form`; aside — первым в
  `ui-form__layout` (до формы в порядке чтения); возврат и CTA — ссылками.
- **Do**: полный цикл на странице: сводная ошибка, success и фокус-сниппеты —
  по контракту T5.6 (`bitrix/snippets/form-error-render.php`).
- **Don't**: не переставляйте DOM под вьюпорт (CSS `order`/`direction`) —
  порядок чтения обязан совпадать на мобильном и десктопе; колонки расставляет
  `grid-column` от lg.
- **Don't**: не кладите ссылки внутрь `label` чекбокса согласия — клик по ним
  переключает чекбокс; ссылки — в `ui-field__hint`.
- **Don't**: не дублируйте aside на серверной ветке формы ради «полноты» —
  источник aside (элемент ИБ) и источник ошибок (веб-форма) независимы;
  на ветке ошибок достаточно ввода и сводной (эталон показывает оба варианта).

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-form-page.test.js`.
- Поверхность браузера (форма-цикл с JS/без, server-состояния, фокус, axe,
  адаптив обеих раскладок, 32px-сценарий, эталоны):
  `tests/e2e/pattern-form-page.spec.js`.
