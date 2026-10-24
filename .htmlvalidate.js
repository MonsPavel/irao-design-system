/**
 * html-validate irao-ui — гейты разметки паттернов (задача T1.2).
 *
 * База: `html-validate:recommended` — валидный HTML5 паттернов и стендов
 * (docs/02-architecture.md §0: «Semantic HTML5, валидный HTML»).
 *
 * Правила a11y/SEO из AC T1.2:
 *  - `wcag/h37` (recommended) — alt обязателен у img;
 *  - `input-missing-label` — label для input (в recommended НЕ входит —
 *    включаем явно; §5 «Формы и валидация»);
 *  - `irao/one-h1` — один h1 на странице (§0: SEO h1→h2→h3). В html-validate 11
 *    встроенного правила нет — кастомное;
 *  - `irao/heading-order` — иерархия заголовков без пропусков уровней
 *    (h1→h3 и т.п. — ошибка; §0: SEO + скринридеры, задача T3.3 — перенос
 *    идеи test_internship_headings.py career-portal). Снижение уровня (h3→h2)
 *    легально. Кастомное — встроенного «no skips» в html-validate 11 нет;
 *  - `irao/no-positive-tabindex` — tabindex > 0 запрещён (WCAG 2.4.3, §5).
 *    Встроенное `no-positive-tabindex` удалено из html-validate 11 — кастомное.
 *  - `irao/link-external-noopener` — внешняя ссылка (`target="_blank"`)
 *    обязана нести `rel` с токеном `noopener` (задача T4.1, AC): без него
 *    целевая страница получает window.opener и может управлять исходной.
 *    В html-validate 11 встроенного правила нет — кастомное.
 *  - `irao/link-accessible-name` — ссылка без доступного имени (icon-only:
 *    нет текста вне aria-hidden-поддеревьев, aria-label/aria-labelledby,
 *    img с alt) — предупреждение (задача T4.1, Implementation requirements
 *    п.3). Дополняет recommended-правило `wcag/h30` (оно ловит только ссылку
 *    совсем без текста и молчит, когда «текст» — декоративный символ под
 *    aria-hidden). Аварийный визуально-скрытый текст проходит гейт (текст
 *    в DOM без aria-hidden), aria-label — тоже.
 *
 * С T4.2: `no-implicit-button-type` (recommended) понижен до `warning` —
 * severity спеки T4.2 (Scope: «тип обязательный (html-validate warning)»).
 * <button> без type по умолчанию submit — в чужой форме клик отправит её;
 * негативная фикстура — tests/lint-cases/html/button-without-type.html.
 *
 * С T13.5 (бэклог-ревью):
 *  - `irao/link-accessible-name` пропускает ссылки без href: якорь-цель —
 *    не ссылка (не в tab-порядке, встроенный wcag/h30 на неё и так молчит),
 *    предупреждение на неё — шум. Пропуск не ослабляет гейт для настоящих
 *    ссылок: позитивный контроль — link-named.html (там же якорь без href);
 *  - `irao/link-external-noopener` сравнивает target без учёта регистра:
 *    `target="_BLANK"` — тот же контекст браузера, bypass «_BLANK без rel»
 *    закрыт (фикстура link-external-noopener-uppercase.html);
 *  - `irao/one-h1` репортит и ОТСУТСТВИЕ h1 (раньше — только дубли): цель —
 *    первый заголовок >1 либо body. Гвард «есть body» отделяет полную
 *    страницу от фрагмента (канонические *.html компонентов тем же конфигом
 *    гоняет lint-html — h1 фрагментам не положен). Фикстура no-h1.html.
 *
 * С T4.6: `irao/img-dimensions` — img без зафиксированного места — ошибка:
 * обязательны атрибуты width/height ИЛИ модификатор `ui-image--ratio-*`
 * (место резервирует aspect-ratio из CSS; спека T4.6: «width/height или
 * aspect-ratio обязательны»). Без зафиксированного места загрузка картинки
 * сдвигает контент (CLS, ТЗ №20); alt закрывает recommended-правило
 * `wcag/h37` (T1.2). Негативная фикстура —
 * tests/lint-cases/html/img-without-dimensions.html, позитивная —
 * img-dimensions-valid.html.
 *
 * С T5.2: `irao/radio-group-fieldset` — радио-ГРУППА (≥2 инпута с общим
 * name) обязана лежать в fieldset с legend — нативные имя и роль group
 * скринридер объявляет сам, без ARIA (спека T5.2: «Группа radio … legend
 * обязателен»; AC). Одиночное радио с уникальным name группой не является
 * и гейтом не ловится (повторяемая единица .ui-radio канонического паттерна
 * легальна сама по себе). Каждый инпут группы проверяется отдельно: у его
 * ближайшего fieldset-предка должен быть ребёнок legend. Негативная
 * фикстура — tests/lint-cases/html/radio-without-fieldset.html, позитивная —
 * radio-group-with-legend.html.
 *
 * С T13.9 (rev T5.2): счёт групп скоупится БЛИЖАЙШИМ form-предком —
 * одноимённые радио из разных форм нативно не связаны (браузер связывает
 * радио только внутри одной формы), глобальный счёт склеивал одиночные
 * радио двух форм в псевдогруппу (фикстура radio-same-name-two-forms.html).
 * Радио без name пропускаются: без name браузер не связывает радио вовсе —
 * пустой ключ счёта собирал безымянные радио в псевдогруппу (фикстура
 * radio-nameless-pair.html).
 *
 * С T6.2: `irao/tabs-id-links` — id-связки tab↔panel в разметке ui-tabs
 * обязательны (спека T6.2, Implementation requirements п.1). Таб-ссылка
 * обязана вести href="#id" на существующую панель (без JS якорь —
 * единственный путь к контенту), таб-кнопка — нести aria-controls на
 * существующий id; панель .ui-tabs__panel обязана быть названа табом
 * (aria-labelledby на .ui-tabs__tab — панель объявляется при переключении).
 * Негативная фикстура — tests/lint-cases/html/tabs-id-links-broken.html,
 * позитивная — tabs-id-links-valid.html.
 *
 * С T7.4: `irao/table-card-data-label` — ячейки таблицы в карточном режиме
 * (`table.ui-table--cards`) обязаны нести непустой data-label (спека T7.4,
 * Implementation requirements п.1): на <md шапка .ui-table__head скрыта,
 * пару «заголовок–значение» читает ::before { content: attr(data-label) } —
 * ячейка без data-label теряет имя значения. Негативная фикстура —
 * tests/lint-cases/html/table-card-missing-label.html, позитивная —
 * table-card-valid.html. Правило шапку (thead) не проверяет: th шапки и
 * есть имена колонок.
 *
 * С T7.5: `irao/loader-text-status` — каждый `.ui-loader` обязан нести
 * `.ui-loader__text` с `role="status"` и непустым текстом (спека T7.5,
 * правило доки: «текст всегда присутствует (не голый спиннер)»).
 * Спиннер декоративен (`aria-hidden`), состояние загрузки скринридеру
 * объявляет только текст-живая-область: голый спиннер или текст без
 * role="status" оставляют пользователя без объявления (Accessibility
 * requirements T7.5). Негативная фикстура —
 * tests/lint-cases/html/loader-missing-text.html, позитивная —
 * loader-valid.html.
 *
 * С T7.4, разметка ui-table-scroll (исключение разметки, не правила):
 * скролл-зона — `<div role="region" tabindex="0" aria-label>` — div, а не
 * нативная section: роль региона задаётся ЯВНЫМ атрибутом role="region" —
 * контракт спеки T7.4 (атрибут тестируем e2e и копипастабелен интегратору).
 * prefer-native-element предлагает section (тот же implicit-регион), слеп к
 * контракту атрибута — перед зоной стоит локальная директива отключения с
 * обоснованием (канонический приём breadcrumbs/role="list"); не снимать
 * вместе с role="region". Демо-высота sticky-зоны стенда ui-table-scroll
 * (`style="max-height: 20rem"`) — no-inline-style отключён локально: в бою
 * высоту зоны задаёт сайт (README ui-table «Геометрия»), в бою inline
 * не нужен.
 *
 * Кастомные правила регистрируются инлайн-плагином (html-validate 11: ключ в
 * plugin.rules — уже полный id правила). Формат файла — CJS: загрузчик конфига
 * html-validate исполняет его в CJS-контексте.
 */
'use strict';

const { definePlugin, Rule } = require('html-validate');

/** Ссылка имеет доступное имя: aria-label/aria-labelledby либо контент.
 *  const-стрелки, не function declarations: файл CJS-script, eslint
 *  no-implicit-globals ловит глобальные function-декларации. */
const hasAccessibleName = (link) => {
  for (const attr of ['aria-label', 'aria-labelledby']) {
    const value = link.getAttribute(attr);
    if (value && value.value.trim() !== '') return true;
  }
  return hasAccessibleContent(link);
};

/** Контент, из которого скринридер возьмёт имя (прозрачная рекурсия). */
const hasAccessibleContent = (node) => {
  for (const child of node.childNodes) {
    // nodeType 3 — TextNode (html-validate: textContent, без .is()).
    if (child.nodeType === 3) {
      if (child.textContent.trim() !== '') return true;
      continue;
    }
    if (child.nodeType !== 1) continue;
    const hidden = child.getAttribute('aria-hidden');
    if (hidden && hidden.value !== 'false') continue;
    if (child.is('img')) {
      const alt = child.getAttribute('alt');
      if (alt && alt.value.trim() !== '') return true;
      continue;
    }
    if (child.is('svg')) {
      const label = child.getAttribute('aria-label');
      if (label && label.value.trim() !== '') return true;
      continue;
    }
    if (hasAccessibleContent(child)) return true;
  }
  return false;
};

/** На странице должен быть ровно один h1. */
class OneH1 extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      const headings = event.document.querySelectorAll('h1');
      for (let i = 1; i < headings.length; i += 1) {
        this.report(
          headings[i],
          'На странице должен быть один <h1>: SEO-иерархия h1→h2→h3 (02-architecture §0).',
        );
      }
      // T13.5 (rev T3.3): отсутствие h1 тоже нарушение — страница без
      // заголовка первого уровня проходила гейт молча (дубли ловились, ноль —
      // нет). Цель репорта — первый заголовок >1; если заголовков нет вовсе —
      // body. Гвард «в документе есть body» отличает ПОЛНУЮ страницу от
      // фрагмента: канонические *.html компонентов (tools/lint-html.mjs гоняет
      // их тем же конфигом) — куски разметки без каркаса, h1 им не положен;
      // страницы полигона все начинаются с h1 (проверено прогоном).
      if (headings.length > 0) return;
      const body = event.document.querySelectorAll('body')[0];
      if (!body) return;
      const firstHeading = event.document.querySelectorAll('h2, h3, h4, h5, h6')[0];
      this.report(
        firstHeading ?? body,
        'На странице нет <h1>: страница обязана начинаться с заголовка первого уровня — SEO-иерархия h1→h2→h3 (02-architecture §0).',
      );
    });
  }
}

/** Положительный tabindex запрещён — ломает естественный порядок фокуса. */
class NoPositiveTabindex extends Rule {
  setup() {
    this.on('element:ready', (event) => {
      // html-validate 11: getAttribute возвращает объект атрибута, значение — в .value
      const attr = event.target.getAttribute('tabindex');
      const value = attr && typeof attr === 'object' ? attr.value : attr;
      if (value !== null && value !== undefined && Number(value) > 0) {
        this.report(
          event.target,
          'Положительный tabindex запрещён: ломает порядок фокуса (WCAG 2.4.3).',
        );
      }
    });
  }
}

/** Иерархия заголовков без пропусков: h1→h3 и т.п. — ошибка (T3.3). */
class HeadingOrder extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      let previous = 0;
      for (const heading of event.document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        const level = Number(heading.tagName[1]);
        if (previous !== 0 && level > previous + 1) {
          this.report(
            heading,
            `Пропуск уровня заголовков: h${previous} → h${level} — иерархия h1→h2→h3 без пропусков (SEO + скринридеры, 02-architecture §0).`,
          );
        }
        previous = level;
      }
    });
  }
}

/** Внешняя ссылка (target="_blank") обязана нести rel с токеном noopener (T4.1). */
class LinkExternalNoopener extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const link of event.document.querySelectorAll('a')) {
        const target = link.getAttribute('target');
        // Регистр значения не влияет на контекст браузера: "_BLANK" — тот же
        // "blank" (T13.5, rev T4.1 — сравнение без учёта регистра).
        if (!target || target.value.toLowerCase() !== '_blank') continue;
        const rel = link.getAttribute('rel');
        const tokens = rel ? rel.value.trim().split(/\s+/) : [];
        if (tokens.includes('noopener')) continue;
        this.report(
          link,
          'Внешняя ссылка с target="_blank" обязана нести rel="noopener" (T4.1): без него целевая страница получает window.opener и может управлять исходной (tabnabbing).',
        );
      }
    });
  }
}

/** Ссылка без доступного имени (icon-only) — предупреждение (T4.1, п.3). */
class LinkAccessibleName extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const link of event.document.querySelectorAll('a')) {
        // Якорь-цель без href — не ссылка: не в tab-порядке, роли link у неё
        // нет, имя скринридер не объявляет (T13.5, rev T4.1 — предупреждение
        // на такие якоря — шум; встроенный wcag/h30 ограничен ссылками и так
        // молчит). Пропуск не ослабляет гейт для настоящих ссылок —
        // позитивный контроль link-named.html остаётся в lint-cases.
        if (!link.getAttribute('href')) continue;
        if (hasAccessibleName(link)) continue;
        this.report(
          link,
          'У ссылки нет доступного имени: icon-only ссылка обязана нести aria-label или визуально-скрытый текст (T4.1, Implementation requirements п.3).',
        );
      }
    });
  }
}

/** Img без зафиксированного места — CLS при загрузке (T4.6, AC). */
class ImgDimensions extends Rule {
  setup() {
    this.on('element:ready', (event) => {
      if (!event.target.is('img')) return;
      const width = event.target.getAttribute('width');
      const height = event.target.getAttribute('height');
      if (width && height && width.value.trim() !== '' && height.value.trim() !== '') return;
      // Второй легитимный путь (спека T4.6: «width/height или aspect-ratio»):
      // место резервирует CSS-класс ui-image--ratio-* (aspect-ratio из шкалы).
      const cls = event.target.getAttribute('class');
      const classValue = cls ? cls.value : '';
      if (/(?:^|\s)ui-image--ratio-[-a-z0-9]+(?:\s|$)/.test(classValue)) return;
      this.report(
        event.target,
        'У <img> нет зафиксированного места: обязательны атрибуты width/height ИЛИ класс ui-image--ratio-* (место резервирует aspect-ratio) — иначе загрузка картинки сдвигает контент (CLS, T4.6).',
      );
    });
  }
}

/** Радио-группа (≥2 радио с общим name в одном form-скоупе) обязана лежать
 *  в fieldset с legend (T5.2). С T13.9: скоуп — ближайший form-предок
 *  (одноимённые радио разных форм не связаны), радио без name — пропуск.
 *  Осознанная граница (T13.9-бэклог): группировка по АТРИБУТУ form
 *  (`<input form="f1">` вне формы — form owner по HTML-спеке) не
 *  учитывается — такие одноимённые радио не посчитаются группой
 *  (false negative в пользу тишины); спека T5.2 требовала именно
 *  «ближайший form-предок». */
class RadioGroupFieldset extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      // Ближайший form-предок радио (элемент form или null вне форм) — скоуп
      // счёта: браузер связывает радио в группу только внутри одной формы.
      const formScopeOf = (radio) => {
        let ancestor = radio.parent;
        while (ancestor) {
          if (ancestor.is('form')) return ancestor;
          ancestor = ancestor.parent;
        }
        return null;
      };
      const radios = [...event.document.querySelectorAll('input[type="radio"]')];
      // Радио без name пропускаются (T13.9): браузер не связывает их в
      // группу (клик не снимает соседа), общего имени и роли group нет —
      // пустой ключ счёта собирал безымянные радио в псевдогруппу.
      const named = [];
      const countByScope = new Map(); // скоуп (form | null) → Map<name, count>
      for (const radio of radios) {
        const name = radio.getAttribute('name');
        if (!name || name.value.trim() === '') continue;
        const scope = formScopeOf(radio);
        const byName = countByScope.get(scope) ?? new Map();
        byName.set(name.value, (byName.get(name.value) ?? 0) + 1);
        countByScope.set(scope, byName);
        named.push({ radio, scope, name: name.value });
      }
      // Группа = имя, встречающееся в ОДНОМ скоупе ≥2 раз; одиночное имя —
      // не группа (одноимённые одиночки разных форм — разные скоупы, T13.9).
      for (const { radio, scope, name } of named) {
        if ((countByScope.get(scope)?.get(name) ?? 0) < 2) continue;
        // Ближайший fieldset-предок обязан нести legend прямым ребёнком.
        let ancestor = radio.parent;
        let closestFieldset = null;
        while (ancestor) {
          if (ancestor.is('fieldset')) {
            closestFieldset = ancestor;
            break;
          }
          ancestor = ancestor.parent;
        }
        const hasLegend =
          closestFieldset !== null &&
          closestFieldset.childNodes.some((child) => child.nodeType === 1 && child.is('legend'));
        if (hasLegend) continue;
        this.report(
          radio,
          'Радио-группа (общий name) обязана лежать в <fieldset> с <legend>: нативные имя и роль группы — без ARIA (T5.2).',
        );
      }
    });
  }
}

/** Элемент имеет заданный класс (значение атрибута class — регэксп по границе). */
const hasClass = (node, className) => {
  const attr = node.getAttribute('class');
  const value = attr ? attr.value : '';
  return new RegExp(`(?:^|\\s)${className}(?:\\s|$)`).test(value);
};

/** Ячейка лежит в thead (предок-таблица разметки, без браузерного
 *  ре-парентинга — структура DOM повторяет исходник). */
const insideThead = (cell) => {
  let ancestor = cell.parent;
  while (ancestor) {
    if (ancestor.is('thead')) return true;
    ancestor = ancestor.parent;
  }
  return false;
};

/** Элемент по id внутри документа (attr-селектор с guarding-проверкой имени —
 *  без CSS.escape, которого нет в контексте конфига). */
const byId = (doc, id) => {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) return null;
  const found = doc.querySelectorAll(`[id="${id}"]`);
  return found.length ? found[0] : null;
};

/** T6.2: id-связки tab↔panel в разметке ui-tabs обязательны
 *  (Implementation requirements п.1). Таб-ссылка ведёт href="#id" на
 *  существующую панель (без JS якорь — единственный путь к панели), таб-кнопка
 *  несёт aria-controls; панель названа табом (aria-labelledby на
 *  .ui-tabs__tab) — панель объявляется скринридеру при переключении. */
class TabsIdLinks extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      const doc = event.document;
      for (const tab of doc.querySelectorAll('.ui-tabs__tab')) {
        if (tab.is('a')) {
          const href = tab.getAttribute('href');
          const value = href ? href.value : '';
          const id = value.startsWith('#') ? value.slice(1) : '';
          if (!id || !byId(doc, id)) {
            this.report(
              tab,
              'Таб-ссылка .ui-tabs__tab обязана вести href="#id" на существующую панель: id-связка tab↔panel обязательна, без JS ссылка — единственный путь к панели (T6.2).',
            );
          }
          continue;
        }
        const controls = tab.getAttribute('aria-controls');
        const id = controls ? controls.value : '';
        if (!id || !byId(doc, id)) {
          this.report(
            tab,
            'Таб-кнопка .ui-tabs__tab обязана нести aria-controls на существующую панель: id-связка tab↔panel обязательна (T6.2).',
          );
        }
      }
      for (const panel of doc.querySelectorAll('.ui-tabs__panel')) {
        const labelledby = panel.getAttribute('aria-labelledby');
        const value = labelledby ? labelledby.value.trim() : '';
        const namedByTab = value.split(/\s+/).some((id) => {
          const el = id ? byId(doc, id) : null;
          return el !== null && hasClass(el, 'ui-tabs__tab');
        });
        if (!namedByTab) {
          this.report(
            panel,
            'Панель .ui-tabs__panel обязана быть названа табом: aria-labelledby с id элемента .ui-tabs__tab — панель объявляется при переключении (T6.2).',
          );
        }
      }
    });
  }
}

/** T7.4: ячейки таблицы в карточном режиме (.ui-table--cards) обязаны нести
 *  непустой data-label (Implementation requirements п.1). На <md шапка
 *  .ui-table__head скрыта (display: none), имя значения читает
 *  ::before { content: attr(data-label) } — ячейка без data-label теряет пару
 *  «заголовок–значение», данные карточки остаются безымянными. */
class TableCardDataLabel extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const table of event.document.querySelectorAll('table')) {
        if (!hasClass(table, 'ui-table--cards')) continue;
        for (const cell of table.querySelectorAll('td, th')) {
          // Шапку не проверяем: th шапки и есть имена колонок — data-label
          // повторяет их текст в ячейках ТЕЛА (td и th scope="row").
          if (insideThead(cell)) continue;
          const label = cell.getAttribute('data-label');
          if (label && label.value.trim() !== '') continue;
          this.report(
            cell,
            'Ячейка таблицы в карточном режиме (.ui-table--cards) обязана нести непустой data-label с текстом заголовка колонки: на <md шапка скрыта, пару «заголовок–значение» читает ::before { content: attr(data-label) } — без data-label значение теряет имя (T7.4).',
          );
        }
      }
    });
  }
}

/** T7.5: правило доки «текст всегда присутствует (не голый спиннер)» —
 *  каждый .ui-loader обязан нести .ui-loader__text с role="status" и
 *  непустым текстом. Спиннер декоративен (aria-hidden в разметке),
 *  состояние загрузки скринридеру объявляет только текст-живая-область. */
class LoaderTextStatus extends Rule {
  setup() {
    this.on('dom:ready', (event) => {
      for (const loader of event.document.querySelectorAll('.ui-loader')) {
        const texts = loader.querySelectorAll('.ui-loader__text');
        if (texts.length !== 1) {
          this.report(
            loader,
            'Лоадер .ui-loader обязан нести ровно один .ui-loader__text: правило доки «текст всегда присутствует (не голый спиннер)» — состояние загрузки объявляет текст, спиннер декоративен (T7.5).',
          );
          continue;
        }
        const role = texts[0].getAttribute('role');
        if (!role || role.value !== 'status') {
          this.report(
            texts[0],
            'Текст лоадера .ui-loader__text обязан нести role="status": смена состояния загрузки объявляется живой областью (Accessibility requirements T7.5).',
          );
          continue;
        }
        const hasText = texts[0].childNodes.some(
          (child) => child.nodeType === 3 && child.textContent.trim() !== '',
        );
        if (!hasText) {
          this.report(
            texts[0],
            'Текст лоадера .ui-loader__text обязан быть непустым: текстовая альтернатива обязательна (Accessibility requirements T7.5).',
          );
        }
      }
    });
  }
}

module.exports = {
  extends: ['html-validate:recommended'],
  plugins: [
    definePlugin({
      name: 'irao',
      rules: {
        'irao/one-h1': OneH1,
        'irao/heading-order': HeadingOrder,
        'irao/no-positive-tabindex': NoPositiveTabindex,
        'irao/link-external-noopener': LinkExternalNoopener,
        'irao/link-accessible-name': LinkAccessibleName,
        'irao/img-dimensions': ImgDimensions,
        'irao/radio-group-fieldset': RadioGroupFieldset,
        'irao/tabs-id-links': TabsIdLinks,
        'irao/table-card-data-label': TableCardDataLabel,
        'irao/loader-text-status': LoaderTextStatus,
      },
    }),
  ],
  rules: {
    'irao/one-h1': 'error',
    'irao/heading-order': 'error',
    'irao/no-positive-tabindex': 'error',
    'irao/link-external-noopener': 'error',
    'irao/link-accessible-name': 'warn',
    'irao/img-dimensions': 'error',
    'irao/radio-group-fieldset': 'error',
    'irao/tabs-id-links': 'error',
    'irao/table-card-data-label': 'error',
    'irao/loader-text-status': 'error',
    'input-missing-label': 'error',
    // T4.2 (Scope): <button> без явного type — предупреждение (умолчание submit).
    'no-implicit-button-type': 'warn',
  },
  // T4.7, разметка ui-breadcrumbs: <ol role="list"> — защита семантики списка
  // от удаления в Safari/VoiceOver (list-style: none + display:flex на ленте
  // крошек снимают роль; баг актуален, фикс сообщества — role="list").
  // Технические considerations T4.7: ol-семантика даёт скринридеру «шаг N из M»,
  // сохранение закреплено пином listSemantics в tests/e2e/ui-breadcrumbs.spec.js.
  // html-validate считает role="list" на ol избыточным (no-redundant-role) и
  // предлагает «нативный ul» (prefer-native-element — следствие того же
  // атрибута): оба правила слепы к Safari-багу. Root-«overrides» html-validate
  // не поддерживает (SchemaValidationError), поэтому отключение — inline-
  // директивой перед каждым <ol> (канонический паттерн + стенд), с обоснованием
  // рядом. Не снимать вместе с role="list".
};
