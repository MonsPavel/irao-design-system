# ui-breadcrumbs

Хлебные крошки: навигация «где я» — упорядоченный список `nav > ol > li` с
микроразметкой schema.org BreadcrumbList и `aria-current="page"` на текущей
странице. Задача T4.7. Перенос `.breadcrumbs` career-portal
(components.css:9–32): caption-типографика, muted-цвет, hover → accent,
разделитель «/», на ≤767 — горизонтальная лента со скрытым скроллбаром.

## API

| Что | Значение |
|---|---|
| Блок `.ui-breadcrumbs` | на `<nav aria-label="Хлебные крошки">` — лендмарка навигации; имя — конвенция career-portal, не меняйте (скринридер озвучивает её при входе в крошки) |
| Элемент `.ui-breadcrumbs__list` | на `<ol role="list">` — flex-лента; `role="list"` защищает семантику списка от `list-style: none` (Safari ≤13 удалял роль) — «шаг N из M» бесплатно |
| Элемент `.ui-breadcrumbs__item` | на `<li>` — каждый уровень; цепочка — `[itemprop="itemListElement"] itemscope itemtype="https://schema.org/ListItem"` |
| Элемент `.ui-breadcrumbs__link` | на `<a itemprop="item">` — уровень-ссылка; имя уровня — в `<span itemprop="name">` внутри ссылки |
| Элемент `.ui-breadcrumbs__current` | на `<span itemprop="name" aria-current="page">` — текущая страница: не ссылка, не остановка Tab |
| Позиция | `<meta itemprop="position" content="N">` внутри каждого li — автонумерация с 1 (генератор — PHP-сниппет) |
| Разделитель | CSS-псевдоэлемент `.ui-breadcrumbs__item + .ui-breadcrumbs__item::before` (content «/», `--ui-color-divider`) — в тексте ссылок и разметке его нет |
| JS | не требуется (CSS-компонент) |
| Токены | `--ui-fs/--ui-fw-caption`, `--ui-color-text-muted`, `--ui-color-divider`, `--ui-color-accent`, `--ui-space-2`, `--ui-transition` |

```html
<nav class="ui-breadcrumbs" aria-label="Хлебные крошки">
  <ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https://schema.org/BreadcrumbList">
    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a class="ui-breadcrumbs__link" itemprop="item" href="/"><span itemprop="name">Главная</span></a>
      <meta itemprop="position" content="1" />
    </li>
    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a class="ui-breadcrumbs__link" itemprop="item" href="/vacancies/"><span itemprop="name">Вакансии</span></a>
      <meta itemprop="position" content="2" />
    </li>
    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span class="ui-breadcrumbs__current" itemprop="name" aria-current="page">Стажировка в ИРАО</span>
      <meta itemprop="position" content="3" />
    </li>
  </ol>
</nav>
```

## Микроразметка BreadcrumbList (ТЗ №7)

- **Формат — microdata** (itemscope/itemprop в HTML), по схеме Google
  (developers.google.com/search/docs/appearance/structured-data/breadcrumb):
  работает без JS, выживает в Bitrix-шаблонах и попадает в поисковый сниппет
  («главная › раздел › страница»). JSON-LD-дубль не нужен: две разметки одной
  цепочки — риск расхождения.
- **Обязательные свойства**: `itemListElement` (≥ 2 элементов); в каждом
  ListItem — `position` и `name`; `item` (URL) — у всех уровней, кроме
  последнего (для него Google берёт URL текущей страницы).
- **Проверка**: локальный парсер-тест — `tests/e2e/ui-breadcrumbs.spec.js`
  (позиции 1..N последовательно, имена непустые, item у предков); разовая
  проверка на развёрнутой странице — Google Rich Results Test / Search Console
  (валидация живого URL со схемами Google недоступна из локального прогона).
- **Порядок = DOM-порядок**: цепочка строится от «Главной» к текущей, позиции
  монотонны; порядок чтения скринридера совпадает с визуальным.

## Построение цепочки в шаблонах

Цепочка — ответственность шаблона; компонент только рендерит. Готовый
генератор — `bitrix/snippets/breadcrumbs.php` (`renderUiBreadcrumbs()` из
`$arResult`), правила те же в любой разметке:

1. **Ровно одна лендмарка на страницу.** Если крошки дублируются (мобильная
   версия отдельным блоком) — второй nav обязан иметь своё aria-label:
   axe требует уникальности пар «роль + имя» (на демо-стенде лендмарки
   разведены суффиксами, в продукте — конвенция «Хлебные крошки»).
2. **Текущая страница — span, не ссылка.** Ссылка «на себя» — мусорная
   остановка Tab и ложный aria-current; `aria-current="page"` ставится
   ровно один раз на цепочку.
3. **«Главная → Раздел без ссылки → Текущая».** Уровень без собственной
   страницы (подраздел-фильтр, группировка) — `span` с `itemprop="name"`
   без `itemprop="item"` и без `aria-current`:

   ```html
   <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
     <span itemprop="name">Каталог материалов</span>
     <meta itemprop="position" content="2" />
   </li>
   ```

   Schema.org это допускает, но Google Rich Results может предупредить о
   пропущенном `item` у не-последнего уровня. Если URL у уровня существует —
   давайте ссылку; это предупреждение, а не ошибка, цепочка останется валидной.
4. **Экранируйте названия.** Уровни приходят из инфоблоков/меню — в шаблоне
   выводите через `htmlspecialchars` (в сниппете уже сделано).
5. **Пустая цепочка — без пустого nav.** На главной странице крошки не
   выводятся вовсе.

## Bitrix

- **Нативный `bitrix:breadcrumb` существует** — заменять его не нужно:
  сниппет `bitrix/snippets/breadcrumbs.php` показывает оба пути — обернуть
  его `$arResult` (`TITLE`/`LINK`) в разметку ui-breadcrumbs (шаблон
  компонента в 6 строк) или сгенерировать цепочку самому из массива.
- Вертикальный ритм страницы «шапка → крошки → заголовок» (в career-portal
  `padding: 20px 0 24px` внутри `.breadcrumbs`) — ответственность шаблона
  страницы, не компонента: в разметке крошки кладутся в контейнер с
  отступами layout-примитивов (паттерн детали — T8.2).
- Каскад legacy-CSS: `.ui-breadcrumbs__link` задаёт цвет и `text-decoration`
  явно — глобальные стили ссылок сайта крошки не перекрашивают.

## Do / Don't

- **Do**: одна цепочка на страницу, от «Главной» к текущей; позиции 1..N без
  пропусков; текущая — span + `aria-current="page"`.
- **Do**: на длинных цепочках держите первое и последнее звенья короткими —
  на мобильной ленте они остаются видимыми при прокрутке.
- **Don't**: разделитель «/» в тексте ссылок или отдельным span в DOM —
  имя уровня должно оставаться чистым (микроразметка + скринридер);
  разделитель рисует CSS.
- **Don't**: делать текущую страницу ссылкой или вешать `aria-current` на
  несколько элементов.
- **Don't**: прятать крошки от скринридера (`aria-hidden`) и рисовать их
  заново отдельным блоком — это навигация, лендмарка nav обязательна.
- **Don't**: возвращать подчёркивание ссылок «для единообразия с ui-link» —
  approved design крошек без подчёркивания; различимость даёт навигационный
  контекст (лендмарка nav + список + подпись лендмарки), а hover-пара
  `--ui-color-accent` одобрена владельцем дизайна. Отклонение от правила
  «подчёркнутая всегда» ui-link (WCAG 1.4.1) осознанное и зафиксировано здесь.

## Известные границы

- **Усечение длинных цепочек «…» не заведено** (Out of scope T4.7).
  Паттерн расширения, если появится потребность: сжимать средние уровни в
  кнопку «…» с выпадающим списком пропущенных уровней (APG Breadcrumb) —
  это интерактив с фокус-менеджментом и клавиатурой, отдельная задача;
  микроразметка при свёртывании должна сохранять полные цепочки (позиции —
  исходные).
- Скролл-лента скрывает скроллбар на всех ширинах — на md+ она
  деактивируется (`overflow-x: visible`, перенос), скрытие не заметно;
  индикатор «листаемо» в approved design не предусмотрен (лимит паттерна).
- Стилизация текущей страницы (жирность/цвет) в approved design отсутствует
  — компонент её сознательно не заводит; потребность — design-decision
  владельца дизайна.
