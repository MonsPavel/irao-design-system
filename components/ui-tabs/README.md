# ui-tabs

Табы по паттерну [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) с
**automatic-активацией** (фокус и выбор вместе): roving tabindex, стрелки
←/→ и Home/End, `Tab` с активного таба уходит в панель. Без JS все панели
видимы, табы — ссылки на якоря панелей. Задача T6.2. Источник — `tracks.js`
career-portal (карьерные треки: таб-кнопки с `is-active`, данные карьерных
треков из `<script type="application/json">`): модель выбора и визуал
перенесены, добавлен полный клавиатурный паттерн APG и деградация.

## API

| Что | Значение |
|---|---|
| Блок | `.ui-tabs` — корень инстанса, хук модуля — `data-ui-tabs` на нём же |
| Элемент `.ui-tabs__list` | лента табов; модуль ставит `role="tablist"` |
| Элемент `.ui-tabs__tab` | таб: `<a href="#panel-id">` (канонический паттерн — деградация без JS) или `<button type="button" aria-controls="panel-id">` (JS-гарантированный контекст); модуль ставит `role="tab"`, `aria-selected`, roving `tabindex` |
| Элемент `.ui-tabs__panel` | панель: `<section aria-labelledby="tab-id">`; модуль ставит `role="tabpanel"`, `tabindex="0"` (цель Tab) и `hidden` неактивным |
| Состояние | активный таб — `aria-selected="true"` (ставит модуль); CSS-стиль активного — `:where([aria-selected='true'])`, класса-дубля нет |
| JS | `IraoUI.tabs`: `init()`, `selector`; хук разметки — `data-ui-tabs`; повторный `init()` инициализирует инстансы, отрендеренные после загрузки |
| Событие | `irao-ui:tabs-select` на корне (`bubbles: true`) — на смене выбора после инициализации (стартовый выбор события не диспатчит) |
| Токены | `--ui-button-height`, `--ui-button-border-width`, `--ui-radius-pill`, `--ui-color-{primary, primary-hover, text-on-dark}`, `--ui-fs-small`/`--ui-fw-small`/`--ui-lh-small`, `--ui-space-3/4/5/6`, `--ui-transition`; focus-тройка ADR-0001 |

```html
<div class="ui-tabs" data-ui-tabs>
  <div class="ui-tabs__list">
    <a class="ui-tabs__tab" href="#track-college" id="track-college-tab">Я учусь в колледже</a>
    <a class="ui-tabs__tab" href="#track-university" id="track-university-tab">
      Я учусь в университете
    </a>
  </div>
  <section class="ui-tabs__panel" id="track-college" aria-labelledby="track-college-tab">
    <p>Ступени карьерного трека колледжа…</p>
  </section>
  <section class="ui-tabs__panel" id="track-university" aria-labelledby="track-university-tab">
    <p>Ступени карьерного трека университета…</p>
  </section>
</div>
```

**id-связки tab↔panel обязательны** (Implementation requirements п.1, гейт
html-validate `irao/tabs-id-links`): таб-ссылка ведёт `href="#id"` на
существующую панель, панель названа табом (`aria-labelledby`). Модуль ищет
панель по `href` (или `aria-controls` у кнопок); инстанс без связки не
инициализируется (`console.warn`, соседи живы).

## Деградация без JS

В разметке **нет** `hidden` на панелях, **нет** ролей `tablist/tab/tabpanel`,
`tabindex`, `aria-selected`/`aria-controls` — их ставит модуль при
инициализации (тот же приём, что `novalidate` в ui-form T5.5 и `aria-expanded`
в ui-dropdown T6.1). Без JS: все панели видимы (потери контента нет — AC),
табы-ссылки работают якорями, панели названы табами через `aria-labelledby`.
Рендер из JSON — зона сайта: без клиентского рендера сайт обязан отдать
разметку сервером (PHP-шаблон) или использовать статический паттерн.

## Клавиатура — чек-лист APG tabs (проверено e2e)

| Действие | Поведение |
|---|---|
| `←` / `→` | **automatic-активация**: фокус и выбор переходят вместе, с зацикливанием (рекомендация APG для простых списков — проще для скринридеров; зафиксировано как решение спеки) |
| `Home` / `End` | первый / последний таб (automatic) |
| `Tab` | с активного таба — в **активную панель** (roving tabindex: у активного таба `tabindex="0"`, у остальных `−1`; скрытые панели из обхода исключены `hidden`) |
| `Shift+Tab` | из панели — назад на активный таб |
| Клик | выбрать таб; якорный прыжок ссылки отменяется (`href` нужен только деградации) |
| Старт | первый таб выбран при инициализации (порядок разметки = порядок выбора) |

Выбор фиксируется `aria-selected` (ровно один `true`) и видимостью панелей;
событие `irao-ui:tabs-select` — точка расширения сайта (аналитика, статус-регион).

## A11y

- Полный APG-набор: `role="tablist"` → `role="tab"` (`aria-selected`,
  `aria-controls`), `role="tabpanel"` + `aria-labelledby` (панель объявляется
  при переключении именем таба).
- Roving tabindex: в Tab-порядке один таб (активный); `Tab` не перехватывается
  — переход в панель естественный.
- Панель — `tabindex="0"`: достижима из Tab-обхода (контент панели без
  таб-стопов тоже достижим); фокус панели и табов рисует глобальная политика
  `base/focus.css` (ADR-0001: `a:focus-visible`, `[tabindex]:focus-visible`) —
  компонент outline не гасит и не заменяет.
- Без JS контент всех панелей доступен скринридеру (панели видимы, named
  links'ами) — e2e-проверка no-JS-контекста.
- Контраст: «подпись primary / фон» и «text-on-dark / primary-заливка» — пары
  AA-гейта T2.3; axe чист на исходном и переключённом состояниях.
- Собственных анимаций нет; переходы цветов гасит kill-switch
  `prefers-reduced-motion` (base/reset, DoD EPIC-6).

## JSON-паттерн данных (кейс Bitrix)

Проверенный паттерн career-portal (README «Интеграция в Битрикс» №4,
02-architecture §6.3): данные из инфоблока — `json_encode` в
`<script type="application/json">`, рендер разметки — клиентский шаблон сайта.
**Модуль рендер НЕ выполняет** (данные — зона сайта): он инициализирует
готовую каноническую разметку; после клиентского рендера вызовите
`IraoUI.tabs.init()` повторно (guard повторной инициализации разрешает).

```php
<!-- template.php: данные инфоблока -->
<script type="application/json" data-ui-tabs-data>
  <?= json_encode($tabsFromIblock, JSON_UNESCAPED_UNICODE) ?>
</script>
<div class="ui-tabs" data-ui-tabs id="track-tabs"></div>
<script>
  // Рендер канонического паттерна из JSON (упрощённо; экранирование — на сайте).
  var data = JSON.parse(document.querySelector('script[data-ui-tabs-data]').textContent);
  document.getElementById('track-tabs').innerHTML =
    '<div class="ui-tabs__list">' +
    data.tabs.map(function (t, i) {
      return '<a class="ui-tabs__tab" href="#track-panel-' + i + '" id="track-tab-' + i + '">' +
        t.label + '</a>';
    }).join('') + '</div>' +
    data.tabs.map(function (t, i) {
      return '<section class="ui-tabs__panel" id="track-panel-' + i +
        '" aria-labelledby="track-tab-' + i + '"><p>' + t.text + '</p></section>';
    }).join('');
</script>
```

## Do / Don't

- **Do**: канонический паттерн — табы-ссылки (`<a href="#panel">`): работает
  без JS. Кнопки (`<button aria-controls>`) — только когда JS гарантирован.
- **Do**: панель сразу после ленты табов в DOM — `Tab` с активного таба
  попадает в активную панель только если между ними нет других таб-стопов.
- **Do**: содержимое панели — зона сайта (текст, `ui-card`, списки); компонент
  панель не стилизует.
- **Don't**: не ставьте `hidden`, роли и `aria-selected` в разметку вручную —
  их ставит/снимает модуль; статичный `hidden` убивает деградацию без JS.
- **Don't**: не вкладывайте интерактив внутрь таба; таб — точка выбора, не
  ссылка-переход на другую страницу (для этого — ui-link/ui-breadcrumbs).
- **Don't**: не используйте табы как аккордеон (все панели с важным контентом
  без JS должны быть видимы — для скрытия контента есть ui-accordion, T6.4).

## Известные границы

- Вертикальные табы (модификатор и стрелки ↑/↓) — по потребности (Out of
  scope спеки); при добавлении модуль обязан читать `aria-orientation` и
  обрабатывать ↑/↓ вместо ←/→.
- Глубокие ссылки (`#hash` при загрузке) не обрабатываются — стартовый выбор
  всегда первый таб; по потребности — считывание hash в сайте через
  `IraoUI.tabs.init()` после корректировки порядка разметки.
- RTL-режим (стрелки ←/→ по направлению письма) не обрабатывается — сайты
  системы русскоязычные (LTR).
- Swipe-жесты панелей — Out of scope спеки.
