#!/usr/bin/env node
/**
 * pilot/career-portal/build.mjs — сборка пилотного клона career-portal
 * на компонентах irao-ui (EPIC-пилот «клон реального сайта»).
 *
 * Что делает:
 *  1. читает мок-данные data/*.json (копия data/ оригинала);
 *  2. генерирует 20 страниц в pilot/career-portal/dist/ — разметка
 *     СОБРАНА ИЗ КОМПОНЕНТОВ ДС (ui-button/ui-card/ui-field/ui-form/
 *     ui-modal/ui-tabs/ui-accordion/ui-select/ui-dropdown/ui-tag/
 *     ui-breadcrumbs/ui-pagination/ui-error/ui-vi + роли типографики и
 *     layout-примитивы base/);
 *  3. копирует рантайм ДС из dist/ (ui-core.min.css, ui-vi.min.css,
 *     ui.min.js, fonts/) в dist/ds/ и ассеты оригинала из эталонного
 *     чекаута career-portal (--ref, дефолт ../career-portal относительно
 *     корня ДС) в dist/assets/ — картинки в git не попадают.
 *
 * Блоки без аналога в ДС (hero, production, directions, holding, employers,
 * why-us, students, video, media, team, cta-mail, шапка/подвал, таймлайн,
 * page-head, строка вакансии) собраны как СТЫК СТОРОНЫ САЙТА
 * (pilot.css, префикс cp-) — ровно так, как это предписывает архитектура
 * (02-architecture §7: связки — зона сайта). Эти блоки — главные кандидаты
 * в доработки ДС по итогам сравнения (REPORT.md). Чипы (T14.8), табы-пилюли
 * и начальный выбор (T14.9), заголовок страницы (T14.2) и CTA-пилюля
 * (T14.4) с эпика EPIC-14 живут в ДС — пилот использует их напрямую.
 *
 * Запуск:  node pilot/career-portal/build.mjs [--ref <путь-к-career-portal>]
 * Перед запуском нужен собранный dist/ ДС:  npm run build
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PILOT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PILOT, '..', '..');
const DIST = join(ROOT, 'dist');
const OUT = join(PILOT, 'dist');

// Эталонный чекаут career-portal (ассеты): CLI --ref или соседний с ДС каталог.
const refIndex = process.argv.indexOf('--ref');
const REF = resolve(
  ROOT,
  refIndex !== -1 ? process.argv[refIndex + 1] : '../career-portal-clone-ref',
);

if (!existsSync(join(DIST, 'ui-core.min.css'))) {
  console.error('dist/ui-core.min.css не найден — сначала соберите ДС: npm run build');
  process.exit(1);
}
if (!existsSync(join(REF, 'assets'))) {
  console.error(
    `Ассеты оригинала не найдены: ${REF} — укажите чекаут career-portal через --ref <путь>`,
  );
  process.exit(1);
}

/* ── данные (копия data/*.json оригинала) ── */

const DATA = join(PILOT, 'data');
const readJson = (name) => JSON.parse(readFileSync(join(DATA, `${name}.json`), 'utf8'));
const VAC = readJson('vacancies');
const INT = readJson('internships');
const EVT = readJson('events');
const ART = readJson('articles');
const EDU = readJson('educat');
const TRK = readJson('tracks');
const COMP = readJson('companies');

/* ── утилиты ── */

const esc = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** дата data (dd.mm.yyyy | dd.mm.yy) → ISO для datetime-атрибутов <time> */
const isoDate = (date) => {
  const [day, month, year] = date.split('.');
  return `${year.length === 2 ? `20${year}` : year}-${month}-${day}`;
};

const ARROW =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** глиф «Назад» пагинации (канон ui-pagination, как ARROW для «Вперёд»);
 *  потребители — education-catalog (T15.3, была CATALOG_ARROW_LEFT) и
 *  events (T15.5) — обе страницы оригинала со стрелками .pagination. */
const ARROW_LEFT =
  '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8H3M8 3L3 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ARROW_UP_RIGHT =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12L12 4M6 4h6v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const PLACE_PIN =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 14.5s5-4.12 5-8a5 5 0 1 0-10 0c0 3.88 5 8 5 8Z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6.3" r="1.8" stroke="currentColor" stroke-width="1.5"/></svg>';

const CAL =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3.5" width="12" height="10.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h12M5.5 1.5v3.5M10.5 1.5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

const CHEVRON =
  '<svg class="ui-dropdown__icon" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

/** уникальные id в пределах страницы */
let uid = 0;
const nextId = (prefix) => `cp-${prefix}-${(uid += 1)}`;

/* ── переиспользуемые фрагменты разметки (компоненты ДС) ── */

/** ui-field: текстовое поле (T5.1). compact — модификатор плотной высоты
 *  анкет-модалок (T14.6: min-height 48px на __input/__select; textarea
 *  высоту не меняет), потребитель — applyForm в модалке (T15.6). */
function field({
  label,
  name,
  type = 'text',
  required = false,
  placeholder = '',
  hint = '',
  id,
  compact = false,
}) {
  const fieldId = id || nextId(name);
  const hintId = hint ? ` aria-describedby="${fieldId}-hint"` : '';
  const hintHtml = hint
    ? `\n    <p class="ui-field__hint" id="${fieldId}-hint">${esc(hint)}</p>`
    : '';
  return `<div class="ui-field${compact ? ' ui-field--compact' : ''}${required ? ' ui-field--required' : ''}">
  <label class="ui-field__label" for="${fieldId}">${esc(label)}${required ? ` <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>` : ''}</label>
  <input class="ui-field__input" type="${type}" id="${fieldId}" name="${name}"${required ? ' required' : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${hintId}>${hintHtml}
</div>`;
}

/** ui-field + ui-select: нативный select с кастомным listbox (T7.3) */
function selectField({
  label,
  name,
  options,
  selected = '',
  required = false,
  pill = false,
  ariaLabel,
  compact = false,
}) {
  const fieldId = nextId(name);
  const opts = options
    .map((option, index) => {
      const isObject = typeof option === 'object';
      const value = isObject ? option.value : '';
      const text = isObject ? option.label : option;
      // selected получает РОВНО одна опция: у объектов — совпадение value
      // или пустой placeholder при пустом selected; у строковых списков
      // ([плейсхолдер, ...]) — только первая (index === 0). Раньше selected
      // получала каждая строковая опция: нативный select брал последнюю,
      // и триггер пилюли показывал не плейсхолдер («Все регионы»), а
      // последний пункт списка (баг видел и сайдбар vacancies, и форму
      // отклика «Образование» вместо «Выберите»).
      const isSelected = isObject
        ? value === selected || (!value && !selected)
        : !selected && index === 0;
      return `<option value="${esc(value)}"${isSelected ? ' selected' : ''}>${esc(text)}</option>`;
    })
    .join('');
  const select = `<select class="ui-field__select" id="${fieldId}" name="${name}"${required ? ' required' : ''}${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}${pill ? ' data-ui-select="wrap"' : ' data-ui-select'}>${opts}</select>`;
  if (pill) {
    // пилюля фильтра: геометрию рисует сайт (cp-pill), триггер растягивается.
    // Подпись поля — label[for] РЯДОМ с обёрткой (канон ui-select после
    // ревью T7.3: имя получают и нативный select, и построенный триггер —
    // пара APG listbox-button); в оригинале видимых подписей нет —
    // label визуально скрыт (cp-vh). Без label — прежний режим с
    // aria-label (сайдбар вакансий, EPIC-14).
    const labelHtml = label ? `<label class="cp-vh" for="${fieldId}">${esc(label)}</label>\n` : '';
    return `${labelHtml}<div class="cp-pill">${select}</div>`;
  }
  return `<div class="ui-field${compact ? ' ui-field--compact' : ''}${required ? ' ui-field--required' : ''}">
  <label class="ui-field__label" for="${fieldId}">${esc(label)}${required ? ` <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>` : ''}</label>
  ${select}
</div>`;
}

/** ui-radio-group (T5.2) */
function radioGroup({ label, name, options, required = false }) {
  const groupId = nextId(name);
  const radios = options
    .map(([text, value], index) =>
      `<label class="ui-radio"><input class="ui-radio__input" type="radio" name="${name}" value="${esc(value)}"${index === 0 ? ' checked' : ''}></label>`.replace(
        '</label>',
        `${esc(text)}</label>`,
      ),
    )
    .join('\n      ');
  return `<div class="ui-field${required ? ' ui-field--required' : ''}">
  <fieldset class="ui-radio-group">
    <legend class="ui-radio-group__legend">${esc(label)}${required ? ' <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>' : ''}</legend>
    <div class="ui-radio-group__row">
      ${radios}
    </div>
  </fieldset>
</div>`;
}

/** «пилюля со стрелкой» оригинала (.pill-btn) → ui-button--pill (T14.4) */
function pillButton(text, { target } = {}) {
  return `<button class="ui-button ui-button--pill" type="button"${target ? ` data-ui-modal-target="${target}"` : ''}><span class="ui-button__label">${esc(text)}</span><span class="ui-button__icon" aria-hidden="true">${ARROW}</span></button>`;
}

/** ui-breadcrumbs (T4.7) с микроразметкой BreadcrumbList.
 *  Элемент [label, href]: href-строка — ссылка; '' — текущая страница
 *  (span aria-current="page", ровно один на цепочку); null — промежуточный
 *  пункт без ссылки (plain span, как в оригинале career-portal). */
function breadcrumbs(items) {
  const list = items
    .map(([label, href], index) => {
      const position = index + 1;
      const current = href
        ? `<a class="ui-breadcrumbs__link" itemprop="item" href="${esc(href)}"><span itemprop="name">${esc(label)}</span></a>`
        : `<span class="ui-breadcrumbs__current" itemprop="name"${href === '' ? ' aria-current="page"' : ''}>${esc(label)}</span>`;
      return `    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      ${current}
      <meta itemprop="position" content="${position}">
    </li>`;
    })
    .join('\n');
  return `<nav class="ui-breadcrumbs cp-breadcrumbs" aria-label="Хлебные крошки">\n  <ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https://schema.org/BreadcrumbList">\n${list}\n  </ol>\n</nav>`;
}

/** строка «найти по списку» (оригинал .vac-find vacancies.html:278–281 и
 *  .events-search-bar events-search.html:153–156): форма + ui-field
 *  type=search + кнопка сабмита; нативный GET без JS — работа фильтра зона
 *  бэкенда (Out of scope T15.5). Общий helper vacancies и events-search
 *  (T15.5, Technical considerations: events-search — единственный второй
 *  потребитель панели, дублирования не плодить); вариант кнопки —
 *  параметр: vacancies — accent «Найти», events-search — primary «найти»
 *  (оригинал). role="search" на обеих — канон поисковой формы WAI (в
 *  оригинале role стоит только на vacancies — их недосмотр). */
function findBar({ action, placeholder, label, text, variant = 'accent' }) {
  return `<form class="cp-find-bar" action="${esc(action)}" method="get" role="search">
  <div class="ui-field">
    <input class="ui-field__input" type="search" name="q" placeholder="${esc(placeholder)}" aria-label="${esc(label)}">
  </div>
  <button class="ui-button ui-button--${variant}" type="submit">${esc(text)}</button>
</form>`;
}

/** строка вакансии (оригинал .vac-row, build.py:69–86): ui-card + связка
 *  сайт-зоны lpp-row (канон ветки «строки» list-page, T14.10; приёмка T16.5).
 *  Заголовок — роль ui-h6 (T16.12: канон «заголовок карточки списков» —
 *  20/500 и цвет текста, роль цвет не задаёт; ui-h4 давал 28px на lg —
 *  REPORT §8.2 №6, замер fs 20 vs 28) с ОБЫЧНОЙ ссылкой внутри: класс
 *  ui-link снят (fs 28/underline/primary — отклонение), кликабельная зона —
 *  поле заголовка, как в оригинале (.vac-row__title a); overlay
 *  ui-card--link не включается — пилюля остаётся независимой целью.
 *  data-* — паритет оригинала для мок-фильтрации js/filters.js
 *  (build.py:72–79): region/city/spec/segment/company/exp/position (первое
 *  слово титула — split по пробелу: в JS split() без аргумента отдаёт
 *  строку целиком, канон — .trim().split(/\s+/)[0], как Python str.split()), accessible «1»/«0», salary — только цифры, date yyyymmdd. */
function vacancyRow(v) {
  return `<article class="ui-card ui-card--hover cp-vac-row" data-region="${esc(v.region)}" data-city="${esc(v.city)}" data-spec="${esc(v.specialization)}" data-segment="${esc(v.segment)}" data-company="${esc(v.company)}" data-exp="${esc(v.experience)}" data-position="${esc(v.title.trim().split(/\s+/)[0])}" data-accessible="${v.accessible ? '1' : '0'}" data-salary="${esc(v.salary.replace(/\D/g, ''))}" data-date="${esc(v.date.split('.').reverse().join(''))}">
  <div class="cp-vac-row__main">
    <h2 class="ui-h6 cp-vac-row__title"><a href="vacancy.html">${esc(v.title)}</a></h2>
    <span class="cp-vac-row__place ui-small">${PLACE_PIN}${esc(v.place)}</span>
    <p class="cp-vac-row__short ui-small">${esc(v.short)}</p>
    <time class="cp-vac-row__date ui-small" datetime="${esc(v.date.split('.').reverse().join('-'))}">${CAL}${esc(v.date)}</time>
  </div>
  ${pillButton('откликнуться', { target: 'cp-apply-dialog' })}
</article>`;
}

/** статус регистрации события → текст и тинт ui-tag (правило карточки:
 *  «открыта» → зелёный «Регистрация», «Завершено» → серый, иное — оранжевый) */
function regTag(e) {
  if (/открыта/.test(e.reg)) return { text: 'Регистрация', variant: 'green' };
  if (/Завершено/.test(e.reg)) return { text: 'Завершено', variant: 'gray' };
  return { text: e.reg, variant: 'orange' };
}

/** Тег заголовка карточки: только строка h1–h6, иначе дефолт h3.
 *  Защита идиомы `.map(eventCard)`: map передаёт (элемент, индекс) —
 *  числовой индекс не имеет права стать тегом (регрессия сборки 24.10:
 *  `<0 class="ui-h6">` в dist при `map(eventCard)`). Вид заголовка несёт
 *  роль ui-h6 (T16.12: канон карточки списков 20/500), тег — семантика
 *  страницы (канон base/typography.css: «h1→h2→h3 без пропусков»);
 *  события-search/каталог собираются с 'h2'. */
const cardHeading = (headingTag) => (/^h[1-6]$/.test(headingTag ?? '') ? headingTag : 'h3');

/** карточка события (оригинал .event-card): ui-card--link + теги.
 *  headingTag (T15.9, axe heading-order): дефолт h3 — на events.html
 *  карточки идут после секций h2 «Предстоящие/Прошедшие», выдача
 *  events-search собирается с 'h2' (карточка — сразу за h1 страницы). */
function eventCard(e, headingTag) {
  // Теги на фото — тинты вариантов 28px, как в оригинале (events.html:270/302;
  // pages.css:573 только позиционирует). Модификатор ui-tag--on-photo (T16.10)
  // остаётся API ДС без пилотного применения — «белый на primary, 40px»
  // оригинала относится к фильтр-тегам (реклассификация REPORT §3.3, ревью
  // T16.10); применение поверх фото — решение владельца.
  const reg = regTag(e);
  return `<article class="ui-card ui-card--hover ui-card--link cp-event-card">
  <a class="ui-card__link" href="event.html">
    <div class="cp-event-card__photo-wrap">
      <img class="cp-event-card__photo" src="${esc(e.image)}" alt="" loading="lazy">
      <span class="ui-tag ui-tag--${reg.variant}">${esc(reg.text)}</span>
    </div>
    <div class="cp-event-card__body">
      <time class="cp-event-card__date ui-small ui-text--muted" datetime="${esc(isoDate(e.date))}">${esc(e.date)}</time>
      <${cardHeading(headingTag)} class="ui-h6">${esc(e.title)}</${cardHeading(headingTag)}>
      <p class="cp-event-card__meta">
        <span class="ui-tag ui-tag--blue">${esc(e.city)}</span>
        <span class="ui-tag ui-tag--gray">${esc(e.format)}</span>
      </p>
    </div>
  </a>
</article>`;
}

/** карточка статьи (оригинал .article-card): ui-card--link + точка-тег.
 *  Заголовок — мини-тайтл 14/500 (T16.12): .article-card__title оригинала —
 *  fs-small/fw-small (media.css/pages.css:608); роль ui-small на семантике
 *  заголовка — канон «визуал ≠ семантика» (typography-roles.md), один выбор
 *  с mediaHomeCard (решение по review спеки T16.12). */
function articleCard(a) {
  // Тег на фото — тинт варианта + точка, как .media__tag оригинала
  // (media.css:72–87); ui-tag--on-photo — API ДС без пилотного применения
  // (реклассификация REPORT §3.3, ревью T16.10).
  const dot =
    { статья: 'ui-tag--blue', видео: 'ui-tag--orange', подкаст: 'ui-tag--green' }[a.type] ||
    'ui-tag--blue';
  return `<article class="ui-card ui-card--hover ui-card--link cp-article-card">
  <a class="ui-card__link" href="article.html">
    <div class="cp-article-card__photo-wrap">
      <img class="cp-article-card__photo" src="${esc(a.image)}" alt="" loading="lazy">
      <span class="ui-tag ${dot}"><span class="ui-tag__icon" aria-hidden="true"></span>${esc(a.type)}</span>
    </div>
    <h3 class="ui-small cp-article-card__title">${esc(a.title)}</h3>
  </a>
  <time class="cp-article-card__date ui-small ui-text--muted">${esc(a.date)}</time>
</article>`;
}

/** карточка направления практики/стажировки → детальная internship.html
 *  (T15.4, AC: «карточки → internship.html»; в оригинале карточка-кнопка
 *  открывает модалку направления — build.py:90, и детальная из него не
 *  достижима; спека T15.4 решает: карточка ведёт на страницу) */
function internCard(i) {
  return internLinkCard(i, 'internship.html');
}

/** связанная практика/стажировка в статье (оригинал render_internship_related:
 *  та же карточка ссылкой на раздел, без модалки; build.py:107–116;
 *  T16.12: заголовок — ui-h6 20/500 (.dir-card__title), шорт — muted
 *  (.dir-card__short)) */
function internLinkCard(i, href) {
  const paid = i.paid ? '<span class="ui-tag ui-tag--orange">оплачиваемая</span>' : '';
  return `<a class="ui-card ui-card--hover cp-intern-card" href="${esc(href)}">
  <p>${paid}</p>
  <h3 class="ui-h6">${esc(i.title)}</h3>
  <p class="ui-small ui-text--muted">${esc(i.short)}</p>
</a>`;
}

/** карточка стажёра (T16.12: имя — ui-h6 20/500, шорт — muted) */
function internPerson(p, photo) {
  const tags = p.tags.map((tag) => `<span class="ui-tag ui-tag--blue">${esc(tag)}</span>`).join('');
  return `<article class="ui-card ui-card--hover cp-intern-person">
  <img class="cp-intern-person__photo" src="${esc(photo)}" alt="" loading="lazy">
  <div class="cp-intern-person__body">
    <p class="ui-h6">${esc(p.name)}</p>
    <p>${tags}</p>
    <p class="ui-small ui-text--muted">${esc(p.short)}</p>
  </div>
</article>`;
}

/** карточка организации (целевое обучение; T16.12: заголовок — ui-h6 20/500
 *  color-text — наследование, шорт — muted) */
function orgCard(o) {
  return `<article class="ui-card ui-card--hover cp-org-card">
  <h3 class="ui-h6">${esc(o.name)}</h3>
  <p class="ui-small ui-text--muted">${esc(o.short)}</p>
  <p class="cp-org-card__meta">
    <span class="ui-tag ui-tag--blue">${esc(o.type)}</span>
    <span class="ui-tag ui-tag--gray">${esc(o.city)}</span>
  </p>
</article>`;
}

/** карточка предложения целевого обучения. headingTag (T15.9, axe
 *  heading-order): дефолт h3 — education.html/event.html несут секции
 *  h2 перед карточками; каталог education-catalog собирается с 'h2'
 *  (первый offer — сразу за h1 страницы). T16.12: направление —
 *  ui-h6--primary (20/500, .offer-card__direction оригинала), шорт —
 *  color-text без muted (.offer-card__short). */
function offerCard(o, headingTag) {
  return `<article class="ui-card ui-card--hover cp-offer-card">
  <div class="cp-offer-card__head">
    <${cardHeading(headingTag)} class="ui-h6 ui-h6--primary">${esc(o.direction)}</${cardHeading(headingTag)}>
    <time class="cp-offer-card__date ui-small ui-text--muted">${esc(o.date)}</time>
  </div>
  <p class="ui-small">${esc(o.short)}</p>
  <p>
    <span class="ui-tag ui-tag--blue">${esc(o.orgTag)}</span>
    <span class="ui-tag ui-tag--gray">${esc(o.form)}</span>
  </p>
  <p class="cp-offer-card__meta ui-small">${esc(o.company)} · ${esc(o.city)}</p>
  <div class="cp-offer-card__footer">
    <!-- базовая accent-кнопка 52px оригинала (раунд 2: probe height 52→32
         при --sm, прочие стили совпали; T15.6 снял --sm) -->
    <a class="ui-button ui-button--accent" href="https://trudvsem.ru/" target="_blank" rel="noopener">сайт «Работа России»</a>
  </div>
</article>`;
}

/** карточка преимущества (залитая; T16.12: заголовок — ui-h6--primary
 *  (.adv-card__title оригинала), текст — color-text без muted
 *  (.adv-card__text)) */
function advCard(a) {
  return `<article class="ui-card ui-card--filled">
  <h3 class="ui-h6 ui-h6--primary">${esc(a.title)}</h3>
  <p class="ui-small">${esc(a.text)}</p>
</article>`;
}

/** ui-accordion--faq (T6.4) */
function faq(items) {
  const html = items
    .map(
      (item, index) => `<details class="ui-accordion__item"${index === 0 ? ' open' : ''}>
  <summary class="ui-accordion__q">${esc(item.q)}
    <svg class="ui-accordion__icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6l5 4 5-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </summary>
  <div class="ui-accordion__a"><div class="ui-accordion__a-inner">${esc(item.a)}</div></div>
</details>`,
    )
    .join('\n');
  return `<h2 class="ui-h2">Вопросы и ответы</h2>\n<div class="ui-accordion ui-accordion--faq">\n${html}\n</div>`;
}

/** таймлайн этапов (сайт-зона — в ДС нет; T16.12: заголовок — ui-h6 20/500
 *  color-text (.timeline__title), текст — muted (.timeline__text)) */
function timeline(steps) {
  return steps
    .map(
      (step, index) => `<div class="cp-timeline__stage">
  <div class="cp-timeline__dot">${index + 1}</div>
  <div class="ui-h6">${esc(step.title)}</div>
  <p class="ui-small ui-text--muted">${esc(step.text)}</p>
</div>`,
    )
    .join('\n');
}

/* ── каркас страницы ── */

function headerHtml({ staticHeader = false }) {
  const modifier = staticHeader ? ' cp-header--static' : '';
  return `<header class="cp-header${modifier}">
  <div class="ui-container cp-header__inner">
    <nav class="cp-header__menu cp-header__menu--left" aria-label="Основное меню">
      <!-- Пункты навигации — ui-link--nav (T16.3): fs-small/fw-small, без
           подчёркивания, hover opacity — пара .header__link оригинала. -->
      <a class="ui-link ui-link--nav" href="vacancies.html">Вакансии</a>
      <div class="ui-dropdown" data-ui-dropdown>
        <button class="ui-dropdown__trigger" type="button" id="cp-sections-trigger">
          Школьникам и студентам
          ${CHEVRON}
        </button>
        <nav class="ui-dropdown__menu" id="cp-sections-menu" aria-label="Школьникам и студентам">
          <ul class="ui-dropdown__list">
            <li><a class="ui-dropdown__item" href="practices.html">Стажировки и практики</a></li>
            <li><a class="ui-dropdown__item" href="education.html">Целевое обучение</a></li>
            <li><a class="ui-dropdown__item" href="events.html">Каталог мероприятий</a></li>
            <li><a class="ui-dropdown__item" href="career-track.html">Карьерный трек</a></li>
          </ul>
        </nav>
      </div>
      <a class="ui-link ui-link--nav" href="media.html">Медиа</a>
    </nav>

    <a class="cp-header__logo" href="index.html" aria-label="Интер РАО ЕЭС — на главную">
      <img src="assets/icons/logo-header.svg" alt="Интер РАО ЕЭС — энергии для успеха" width="105" height="100">
    </a>

    <nav class="cp-header__menu cp-header__menu--right" aria-label="Дополнительное меню">
      <button class="cp-header__vi" type="button" data-ui-vi-toggle aria-pressed="false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.4" stroke="currentColor" stroke-width="2"/></svg>
        <span>Версия для слабовидящих</span>
      </button>
      <a class="ui-link ui-link--nav" href="index.html#contacts">Контакты</a>
      <a class="cp-header__search ui-link ui-link--nav" href="vacancies.html" data-ui-modal-target="cp-search-dialog">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Поиск
      </a>
    </nav>
  </div>
</header>`;
}

function viPanelHtml() {
  return `<div class="ui-vi-bar" data-ui-vi-panel hidden>
  <div class="ui-vi-bar__inner">
    <div class="ui-vi-group" role="group" aria-label="Размер шрифта">
      <span class="ui-vi-group__label">Шрифт</span>
      <div class="ui-vi-seg">
        <button class="ui-vi-seg__btn ui-vi-seg__btn--sm" type="button" data-ui-vi-set="size:sm" aria-pressed="false" aria-label="Мелкий шрифт">A</button>
        <button class="ui-vi-seg__btn ui-vi-seg__btn--md" type="button" data-ui-vi-set="size:md" aria-pressed="true" aria-label="Средний шрифт">A</button>
        <button class="ui-vi-seg__btn ui-vi-seg__btn--lg" type="button" data-ui-vi-set="size:lg" aria-pressed="false" aria-label="Крупный шрифт">A</button>
      </div>
    </div>
    <div class="ui-vi-group" role="group" aria-label="Цвета сайта">
      <span class="ui-vi-group__label">Цвета</span>
      <div class="ui-vi-seg">
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="theme:baw" aria-pressed="true" title="Чёрным по белому" aria-label="Чёрным по белому"><span class="ui-vi-swatch ui-vi-swatch--baw" aria-hidden="true">Аа</span></button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="theme:wb" aria-pressed="false" title="Белым по чёрному" aria-label="Белым по чёрному"><span class="ui-vi-swatch ui-vi-swatch--wb" aria-hidden="true">Аа</span></button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="theme:bb" aria-pressed="false" title="Синим по голубому" aria-label="Синим по голубому"><span class="ui-vi-swatch ui-vi-swatch--bb" aria-hidden="true">Аа</span></button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="theme:beige" aria-pressed="false" title="Бежевым по коричневому" aria-label="Бежевым по коричневому"><span class="ui-vi-swatch ui-vi-swatch--beige" aria-hidden="true">Аа</span></button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="theme:green" aria-pressed="false" title="Зелёным на тёмно-коричневом" aria-label="Зелёным на тёмно-коричневому"><span class="ui-vi-swatch ui-vi-swatch--green" aria-hidden="true">Аа</span></button>
      </div>
    </div>
    <div class="ui-vi-group" role="group" aria-label="Изображения">
      <span class="ui-vi-group__label">Изображения</span>
      <div class="ui-vi-seg">
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="img:on" aria-pressed="true">обычные</button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="img:gray" aria-pressed="false">чёрно-белые</button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="img:off" aria-pressed="false">выкл</button>
      </div>
    </div>
    <div class="ui-vi-group" role="group" aria-label="Межбуквенный интервал">
      <span class="ui-vi-group__label">Интервал</span>
      <div class="ui-vi-seg">
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="kern:normal" aria-pressed="true">обычный</button>
        <button class="ui-vi-seg__btn" type="button" data-ui-vi-set="kern:wide" aria-pressed="false">широкий</button>
      </div>
    </div>
    <button class="ui-vi-exit" type="button" data-ui-vi-toggle>Обычная версия сайта</button>
  </div>
</div>`;
}

function footerHtml() {
  return `<footer class="cp-footer" id="contacts">
  <div class="ui-container cp-footer__inner">
    <a class="cp-footer__logo" href="index.html" aria-label="Интер РАО ЕЭС — на главную">
      <img src="assets/icons/logo-footer.svg" alt="Интер РАО ЕЭС" width="137" height="131">
    </a>

    <!-- Ссылки футера (T16.4) — ui-link--nav (T16.3): fs-small/fw-small 14/500,
         без подчёркивания (пункты навигации в nav-структуре, WCAG 1.4.1);
         цвет в покое и :visited фиксирует сайт-зона pilot.css (visited
         оригинал не задаёт — потемнения нет), hover — accent оригинала
         (footer.css:43,76) -->
    <nav aria-label="Меню подвала">
      <ul class="cp-footer__links">
        <li><a class="cp-footer__link ui-link ui-link--nav" href="vacancies.html">Вакансии</a></li>
        <li><a class="cp-footer__link ui-link ui-link--nav" href="internships.html">Школьникам и студентам</a></li>
        <li><a class="cp-footer__link ui-link ui-link--nav" href="media.html">Медиа</a></li>
        <li><a class="cp-footer__link ui-link ui-link--nav" href="#">Политика конфиденциальности</a></li>
        <li><a class="cp-footer__link ui-link ui-link--nav" href="#">Правила обработки персональных данных</a></li>
      </ul>
    </nav>

    <div class="cp-footer__contacts">
      <address class="cp-footer__contact">
        <span class="cp-footer__contact-label">Адрес</span>
        <span>ул. Большая Пироговская, д. 27, стр. 1, г. Москва, Россия, 119435</span>
      </address>
      <div class="cp-footer__contact-group">
        <div class="cp-footer__contact">
          <span class="cp-footer__contact-label">Телефон</span>
          <a class="cp-footer__contact-link ui-link ui-link--nav" href="tel:+74956648840">+7 495 664-88-40</a>
        </div>
        <div class="cp-footer__contact">
          <span class="cp-footer__contact-label">Email</span>
          <a class="cp-footer__contact-link ui-link ui-link--nav" href="mailto:career@interrao.ru">career@interrao.ru</a>
        </div>
      </div>
    </div>

    <div class="cp-footer__right">
      <ul class="cp-footer__socials">
        <li><a class="cp-footer__social" href="#" aria-label="ВКонтакте"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.7 17.4c-4.9 0-7.7-3.4-7.8-9h2.5c.1 4.2 1.9 5.9 3.4 6.3V8.4h2.3v3.6c1.4-.2 2.9-1.8 3.4-3.6h2.3c-.4 2.2-2 3.9-3.1 4.5 1.1.6 2.9 2 3.6 4.5h-2.6c-.5-1.7-1.9-3-3.7-3.2v3.2h-.3z"/></svg></a></li>
        <li><a class="cp-footer__social" href="#" aria-label="Одноклассники"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.8a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8zM6.4 7.2a5.6 5.6 0 1111.2 0 5.6 5.6 0 01-11.2 0zm1.2 7.3c1.3.5 2.8.8 4.4.8 1.6 0 3-.3 4.4-.8l.8 1.8c-1 .4-2 .7-3.2.8l2.9 4.2-1.8 1.2-3.1-4.5-3.1 4.5-1.8-1.2 2.9-4.2c-1.2-.1-2.2-.4-3.2-.8l.8-1.8z"/></svg></a></li>
        <li><a class="cp-footer__social" href="#" aria-label="Rutube"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h10.5A5.5 5.5 0 0120 9.5c0 2.6-1.8 4.8-4.2 5.4L20 20h-4l-3.8-4.8H8V20H4V4zm4 3.6v4h6.3a2 2 0 000-4H8z"/></svg></a></li>
      </ul>
      <p class="ui-small">© 1998–2026, ПАО «Интер РАО»</p>
    </div>
  </div>
</footer>`;
}

function searchDialogHtml() {
  return `<dialog class="ui-modal ui-modal--full" id="cp-search-dialog" open data-ui-modal aria-labelledby="cp-search-title">
  <button class="ui-modal__close" type="button" aria-label="Закрыть">
    <svg class="ui-modal__icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
  <h2 class="ui-modal__title ui-h3" id="cp-search-title">Поиск по сайту</h2>
  <div class="ui-modal__body">
    <form action="vacancies.html" method="get" role="search">
      <div class="ui-field">
        <label class="ui-field__label" for="cp-search-query">Поисковый запрос</label>
        <input class="ui-field__input" type="search" id="cp-search-query" name="q" placeholder="Например: стажировка в Москве" autocomplete="off">
      </div>
      <p><button class="ui-button ui-button--primary" type="submit">Найти</button></p>
    </form>
  </div>
</dialog>`;
}

/** каркас документа */
function page({ title, main, staticHeader = true, bodyClass = '' }) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="Пилотный клон career-portal на компонентах irao-ui">
  <link rel="preload" href="ds/fonts/golos-400-cyr.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="ds/fonts/golos-500-cyr.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="ds/ui-core.min.css">
  <link rel="stylesheet" href="ds/ui-vi.min.css">
  <link rel="stylesheet" href="pilot.css">
</head>
<body class="cp-page${bodyClass ? ` ${bodyClass}` : ''}">
<a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>
${viPanelHtml()}
${headerHtml({ staticHeader })}
<main id="main" tabindex="-1">
${main}
</main>
${footerHtml()}
${searchDialogHtml()}
<script src="ds/ui.min.js" defer></script>
<script src="pilot.js" defer></script>
</body>
</html>
`;
}

/* ── формы отклика ── */

/** анкета отклика ( ui-form, T5.4) — используется на странице и в модалке.
 *  compact (T15.6): в модалке поля несут ui-field--compact (T14.6 — 48px
 *  на input/select, как .apply-form .field__input pages.css:1208 оригинала);
 *  textarea высоту не меняет (канон T14.6), радио/файл/согласие вне
 *  модификатора. Страница-форма (vacancy-apply) несёт базовые 52px —
 *  EPIC-15 README: решение T15.6. */
function applyForm({ id, note, compact = false }) {
  return `<form class="ui-form" action="#${id}" method="post" data-cp-form novalidate>
  <div class="ui-form__layout">
    <div class="ui-form__main">
      <div class="ui-form__grid" data-cp-form-body>
        ${field({ label: 'Фамилия', name: 'lastname', required: true, compact })}
        ${field({ label: 'Имя', name: 'firstname', required: true, compact })}
        ${field({ label: 'Отчество', name: 'middlename', compact })}
        ${radioGroup({
          label: 'Пол',
          name: 'gender',
          options: [
            ['Мужской', 'm'],
            ['Женский', 'f'],
          ],
          required: true,
        })}
        ${field({ label: 'Дата рождения', name: 'birthday', required: true, placeholder: 'ДД.ММ.ГГГГ', compact })}
        ${field({ label: 'Телефон', name: 'phone', type: 'tel', required: true, placeholder: '+7 (___) ___-__-__', compact })}
        ${field({ label: 'Email', name: 'email', type: 'email', required: true, placeholder: 'you@example.ru', id: `${id}-email`, compact })}
        ${field({ label: 'Гражданство', name: 'citizenship', required: true, compact })}
        ${selectField({ label: 'Образование', name: 'education', required: true, options: [{ label: 'Выберите', value: '' }, 'Высшее', 'Среднее профессиональное'], compact })}
        ${field({ label: 'Учебное заведение', name: 'university', required: true, compact })}
        ${field({ label: 'Факультет / специальность', name: 'faculty', required: true, compact })}
        ${field({ label: 'Год окончания обучения', name: 'gradyear', required: true, placeholder: '2024', compact })}
        <div class="ui-field ui-field--wide">
          <label class="ui-field__label" for="${id}-about">Дополнительная информация</label>
          <textarea class="ui-field__textarea" id="${id}-about" name="about" placeholder="Расскажите о релевантном опыте"></textarea>
          <p class="ui-field__hint" id="${id}-about-hint">Здесь можно написать про курсы, специальности или что-то важное о себе.</p>
        </div>
        <div class="ui-field ui-field--wide">
          <span class="ui-field__label" id="${id}-resume-label">Резюме (файлом/ссылкой)</span>
          <div class="ui-file" data-ui-file>
            <label class="ui-file__button">
              <input class="ui-file__input" type="file" id="${id}-resume" name="resume" accept=".docx,.pdf" aria-labelledby="${id}-resume-label ${id}-resume-button-text">
              <span class="ui-file__button-text" id="${id}-resume-button-text">прикрепить файл</span>
            </label>
            <p class="ui-file__value" role="status">Файл не выбран</p>
            <button class="ui-file__reset" type="button" hidden>Убрать файл</button>
            <span class="ui-file__hint" id="${id}-resume-hint">Максимальный размер файла до 4 Мб. Разрешённые форматы: .docx .pdf</span>
          </div>
        </div>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-checkbox">
          <input class="ui-checkbox__input" type="checkbox" name="agreement" required>
          <span>Ознакомлен(а) с <a class="ui-link" href="#">Политикой конфиденциальности</a>. Продолжая формирование анкеты-резюме, я соглашаюсь на обработку персональных данных.</span>
        </label>
      </div>
      <div class="ui-form__actions">
        <button class="ui-button ui-button--accent" type="submit">отправить отклик</button>
      </div>
    </div>
  </div>
  <div class="ui-form__success" data-cp-form-success hidden>
    <h2 class="ui-h4 ui-form__success-title" tabindex="-1">Спасибо, мы получили Ваш отклик!</h2>
    <p class="ui-body ui-form__success-text">${esc(note)}</p>
    <div class="ui-form__success-actions">
      <a class="ui-button ui-button--outline" href="index.html">вернуться на главную</a>
    </div>
  </div>
</form>`;
}

function applyDialogHtml() {
  return `<dialog class="ui-modal ui-modal--md" id="cp-apply-dialog" open data-ui-modal aria-labelledby="cp-apply-title">
  <button class="ui-modal__close" type="button" aria-label="Закрыть">
    <svg class="ui-modal__icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
  <h2 class="ui-modal__title ui-h3" id="cp-apply-title">Анкета отклика</h2>
  <div class="ui-modal__body">
    ${applyForm({ id: 'cp-apply', note: 'Ответим на почту, как только закончим его рассматривать.', compact: true })}
  </div>
</dialog>`;
}

/* ── главная страница ── */

const PRODUCTION_SLIDES = [
  {
    title: 'Производство',
    text: 'Вклад каждого сотрудника на производстве — это основа нашего успеха. Нам важно, чтобы каждый чувствовал свою значимость и был уверен в завтрашнем дне.',
    photo: 'assets/images/worker-production.png',
    fit: 'contain',
    count: '25 вакансий',
  },
  {
    title: 'Женские вакансии на производстве',
    text: 'Мы создаём комфортные условия для работы женщин на производстве: удобный график, современное оборудование и поддержка команды.',
    photo: 'assets/images/carousel-woman.png',
    fit: 'contain',
    count: '13 вакансий',
  },
  {
    title: 'Административная работа',
    text: 'Организационная поддержка ключевых процессов компании. Работа в команде профессионалов и широкие возможности для развития.',
    photo: 'assets/images/carousel-openspace.png',
    fit: 'cover',
    count: '16 вакансий',
  },
  {
    title: 'Металлообработка',
    text: 'Работа на современном высокотехнологичном оборудовании. Стабильная занятость и достойная оплата труда.',
    photo: 'assets/images/media-8.jpg',
    fit: 'cover',
    count: '8 вакансий',
  },
  {
    title: 'IT сфера',
    text: 'Цифровые решения для энергетики: разработка, поддержка и развитие информационных систем компании.',
    photo: 'assets/images/carousel-itman.png',
    fit: 'contain',
    count: '10 вакансий',
  },
];

const DIRECTIONS = [
  'Электрогенерация',
  'Теплогенерация',
  'Энергосбыт, ЕРЦП, НЭСК',
  'Инжиниринг',
  'Энергомашиностроение',
  'Сервисные компании',
  'ИТ',
  'Управляющая компания',
];

const DIRECTIONS_DATA = [
  {
    title: 'Электрогенерация',
    subtitle: 'Электрогенерация Группы «Интер РАО»',
    text: 'Производство электрической энергии — основа энергетической системы страны.',
    photos: [
      'assets/images/popup-teplogen.jpg',
      'assets/images/media-main.jpg',
      'assets/images/factory-big.jpg',
    ],
  },
  {
    title: 'Теплогенерация',
    subtitle: 'Теплогенерация Группы «Интер РАО»',
    text: 'Теплогенерация Группы «Интер РАО» — это 6 крупных региональных энергокомпаний, 22 электростанции.',
    photos: [
      'assets/images/popup-teplogen.jpg',
      'assets/images/about-holding.jpg',
      'assets/images/factory-big.jpg',
    ],
  },
  {
    title: 'Энергосбыт, ЕРЦП, НЭСК',
    subtitle: 'Энергосбыт Группы «Интер РАО»',
    text: 'Продажа электрической и тепловой энергии потребителям по всей стране.',
    photos: [
      'assets/images/popup-teplogen.jpg',
      'assets/images/carousel-openspace.png',
      'assets/images/about-holding.jpg',
    ],
  },
  {
    title: 'Инжиниринг',
    subtitle: 'Инжиниринг Группы «Интер РАО»',
    text: 'Комплексные инженерные решения для объектов энергетики.',
    photos: [
      'assets/images/popup-teplogen.jpg',
      'assets/images/factory-big.jpg',
      'assets/images/about-holding.jpg',
    ],
  },
  {
    title: 'Энергомашиностроение',
    subtitle: 'Энергомашиностроение Группы «Интер РАО»',
    text: 'Производство и сервисное обслуживание энергетического оборудования.',
    photos: [
      'assets/images/factory-big.jpg',
      'assets/images/popup-teplogen.jpg',
      'assets/images/about-holding.jpg',
    ],
  },
  {
    title: 'Сервисные компании',
    subtitle: 'Сервисные компании Группы «Интер РАО»',
    text: 'Обеспечение деятельности предприятий Группы: ремонт, логистика, сервис.',
    photos: [
      'assets/images/about-holding.jpg',
      'assets/images/factory-big.jpg',
      'assets/images/popup-teplogen.jpg',
    ],
  },
  {
    title: 'ИТ',
    subtitle: 'ИТ Группы «Интер РАО»',
    text: 'Цифровые продукты и решения для энергетической отрасли.',
    photos: [
      'assets/images/carousel-openspace.png',
      'assets/images/media-main.jpg',
      'assets/images/about-holding.jpg',
    ],
  },
  {
    title: 'Управляющая компания',
    subtitle: 'Управляющая компания Группы «Интер РАО»',
    text: 'Стратегическое управление и развитие Группы «Интер РАО».',
    photos: [
      'assets/images/carousel-openspace.png',
      'assets/images/about-holding.jpg',
      'assets/images/factory-big.jpg',
    ],
  },
];

const WHY_US = [
  {
    photo: 'assets/images/tag-photo-1.png',
    title: 'Ответственное отношение к каждому',
    text: 'Стабильная, прозрачная заработная плата, премия по итогам года, ежегодная индексация, ДМС и телемедицина',
  },
  {
    photo: 'assets/images/job-card-1.png',
    title: 'Лучшие возможности для роста',
    text: 'Более 100 образовательных программ, корпоративный университет, тренинги, курсы, обмен опытом, доступ к корпоративной библиотеке',
  },
  {
    photo: 'assets/images/mentorship.png',
    title: 'Наставничество в реальном времени',
    text: 'Пресуспеть в профессии поможет опытный наставник: получить мгновенную обратную связь, научиться на практике реальных ситуаций, влиться в коллектив',
  },
  {
    photo: 'assets/images/job-card-2.png',
    title: 'Личная самореализация',
    text: 'Более 70 сообществ по интересам и мероприятий: от волонтёрства, спорта и музыки до книжных клубов, шахматных турниров и творческих конкурсов',
  },
];

const STUDENTS = [
  {
    tone: 'peach',
    btn: 'orange',
    title: 'Стажировки и практики',
    text: 'Стажировки и практики — уникальный шанс получить опыт в энергетике!',
    illu: 'assets/images/students-illu-boy.png',
    href: 'practices.html',
  },
  {
    tone: 'navy',
    btn: 'white',
    title: 'Целевое обучение',
    text: 'Проходи целевое обучение, чтобы влиться в профессию, и получай поддержку на старте своей карьеры',
    illu: 'assets/images/students-illu-teacher2.png',
    href: 'education.html',
  },
  {
    tone: 'light',
    btn: 'navy',
    title: 'Карьерный трек',
    text: 'Найди лучшие возможности для профессионального роста вместе с нами!',
    illu: 'assets/images/students-illu-career2.png',
    href: 'career-track.html',
  },
];

const MEDIA_HOME = [
  {
    image: 'assets/images/media-1.jpg',
    type: 'статья',
    caption: 'Студенты приступили к практике в компаниях Группы «Интер РАО»',
    desc: 'Молодые люди приобретают опыт по основным для компании направлениям: энергетика, тепловая автоматика, техническая диагностика, водоподготовка и экологическая станция, сети и подстанции, тепловые сети',
    date: '28.02.26',
  },
  {
    image: 'assets/images/media-2.jpg',
    type: 'видео',
    caption: 'Диагрузка по обществу «Интер РАО» — 50 лет работы в энергетике',
    date: '28.02.26',
  },
  {
    image: 'assets/images/media-3.jpg',
    type: 'статья',
    caption: 'АО «Интер RAO ЕЭС» запустила уникальный производственный комплекс',
    date: '18.02.26',
  },
  {
    image: 'assets/images/media-4.jpg',
    type: 'статья',
    caption: 'Модернизация Кировской ТЭЦ-3',
    date: '18.02.26',
  },
  {
    image: 'assets/images/media-5.jpg',
    type: 'статья',
    caption: 'Модернизация Киришской ГРЭС',
    date: '18.02.26',
  },
  {
    image: 'assets/images/media-6.jpg',
    type: 'подкаст',
    caption: '«Интер RAO» подводит итоги 2025 года',
    date: '28.02.26',
  },
  {
    image: 'assets/images/media-7.jpg',
    type: 'видео',
    caption: '«Интер RAO» поддерживает спорт в регионах',
    date: '28.02.26',
  },
  {
    image: 'assets/images/media-8.jpg',
    type: 'видео',
    caption: 'Энергоблоки в работе: репортаж с площадки',
    date: '28.02.26',
  },
  {
    image: 'assets/images/media-9.jpg',
    type: 'подкаст',
    caption: 'Тепло для городов: как работает ТЭЦ',
    date: '18.02.26',
  },
];

function mediaHomeCard(card, extraClass = '') {
  // Тег на фото — тинт варианта + точка, как в articleCard (маркер
  // реклассификации REPORT §3.3 — ревью T16.10: on-photo в пилоте не
  // применяется). Заголовок (ветка с desc) — мини-тайтл 14/500, один выбор
  // с articleCard (T16.12); дата — muted (.media__card-date оригинала).
  const dot = { статья: 'ui-tag--blue', видео: 'ui-tag--orange', подкаст: 'ui-tag--green' }[
    card.type
  ];
  return `<article class="ui-card ui-card--hover ui-card--link cp-media-card${extraClass}">
  <a class="ui-card__link" href="article.html">
    <div class="cp-article-card__photo-wrap">
      <img class="cp-article-card__photo" src="${esc(card.image)}" alt="" loading="lazy">
      <span class="ui-tag ${dot}"><span class="ui-tag__icon" aria-hidden="true"></span>${esc(card.type)}</span>
    </div>
    ${card.desc ? `<h3 class="ui-small cp-article-card__title">${esc(card.caption)}</h3>\n    <p class="ui-small ui-text--muted cp-article-card__date">${esc(card.date)}</p>` : `<p class="cp-article-card__title">${esc(card.caption)}</p>\n    <time class="cp-article-card__date ui-small ui-text--muted">${esc(card.date)}</time>`}
  </a>
</article>`;
}

function indexMain() {
  const productionSlidesJson = JSON.stringify(PRODUCTION_SLIDES);
  const directionsJson = JSON.stringify(DIRECTIONS_DATA);
  const directionsGrid = DIRECTIONS.map(
    (name, index) => `      <li>
        <button class="cp-directions__card" type="button" data-cp-direction="${index}">
          <img class="cp-directions__icon" src="assets/icons/dir-${index + 1}.svg" alt="" width="76" height="76" loading="lazy">
          <span class="cp-directions__name">${esc(name)} ${ARROW_UP_RIGHT}</span>
        </button>
      </li>`,
  ).join('\n');

  const whyCards = WHY_US.map(
    (card, index) => `      <article class="cp-why-us__card">
        <img class="cp-why-us__card-photo" src="${esc(card.photo)}" alt="" loading="lazy">
        <h3 class="ui-h4">${esc(card.title)}</h3>
        <p class="ui-small">${esc(card.text)}</p>
        <span class="cp-why-us__card-num" aria-hidden="true">0${index + 1}</span>
      </article>`,
  );

  const studentCards = STUDENTS.map(
    (card) => `      <article class="cp-students__card cp-students__card--${card.tone}">
        <div>
          <h3 class="ui-h4">${esc(card.title)}</h3>
          <p class="ui-small">${esc(card.text)}</p>
        </div>
        <img class="cp-students__card-illu" src="${esc(card.illu)}" alt="" loading="lazy">
        <a class="cp-students__card-btn cp-students__card-btn--${card.btn}" href="${esc(card.href)}" aria-label="Подробнее: ${esc(card.title)}">${ARROW}</a>
      </article>`,
  ).join('\n');

  const employerLogos = Array.from(
    { length: 11 },
    (_, index) =>
      `      <img class="cp-employers__card" src="assets/logos/employer-2086-${1830 + index}.png" alt="Работодатель Группы" width="197" height="108" loading="lazy">`,
  ).join('\n');

  const mediaCards = [
    mediaHomeCard(MEDIA_HOME[0], ' cp-media-card--big'),
    `      <div class="cp-media__lead">
        <h3 class="ui-h4">${esc(MEDIA_HOME[0].caption)}</h3>
        <time class="ui-small ui-text--muted">19.02.26</time>
        <p class="ui-small">Молодые люди приобретают опыт по основным для компании направлениям: электро-, теплоэнергетика и техника; энергетическое машиностроение; электрические станции, сети и системы; тепловые электрические станции.</p>
        <a class="ui-link" href="media.html">Подробнее ${ARROW}</a>
      </div>`,
    ...MEDIA_HOME.slice(1).map((card) => mediaHomeCard(card)),
  ].join('\n');

  const stepperTabs = PRODUCTION_SLIDES.map(
    (
      slide,
      index,
    ) => `    <li><button class="cp-production__tab" type="button" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}">
      <span class="cp-production__tab-num">${index + 1}</span>
      <span class="cp-production__tab-body">
        <span class="cp-production__tab-title">${esc(slide.title)}</span>
        <span class="cp-production__tab-count">${esc(slide.count)}</span>
      </span>
    </button></li>`,
  ).join('\n');

  return `<section class="cp-hero">
  <div class="cp-hero__bg" aria-hidden="true">
    <img src="assets/images/hero-city-1.png" alt="" loading="eager">
  </div>
  <div class="cp-hero__content">
    <h1 class="cp-hero__title ui-h1">Зажигай свет и&nbsp;дари тепло вместе с&nbsp;нами</h1>
    <form class="cp-hero__search" action="vacancies.html" method="get" role="search">
      <svg class="cp-hero__search-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="17" cy="17" r="11" stroke="currentColor" stroke-width="2.4"/><path d="M26 26l8 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      <div class="ui-field">
        <input class="ui-field__input" type="search" name="q" placeholder="Введите название вакансии" aria-label="Поиск вакансий">
      </div>
      <a class="cp-hero__search-all" href="vacancies.html">Все вакансии</a>
    </form>
  </div>
  <div class="cp-hero__tags">
    <span class="ui-tag cp-hero__tag cp-hero__tag--violet">Стабильная компания</span>
    <span class="ui-tag cp-hero__tag cp-hero__tag--sand">Масштаб задач</span>
    <span class="ui-tag cp-hero__tag cp-hero__tag--green">Работа со смыслом</span>
    <span class="ui-tag cp-hero__tag cp-hero__tag--rose">Сильная команда</span>
  </div>
</section>

<section class="cp-production" data-cp-production>
  <div class="cp-production__bg" aria-hidden="true">
    <img src="assets/images/factory-big.jpg" alt="" loading="lazy">
  </div>
  <div class="cp-production__glow" aria-hidden="true"></div>
  <img class="cp-production__photo" src="assets/images/worker-production.png" alt="Сотрудник на производстве" width="585" height="674" data-cp-production-photo loading="lazy">
  <div class="cp-production__body">
    <h2 class="cp-production__title ui-h2" data-cp-production-title>Производство</h2>
    <p class="cp-production__text ui-lead" data-cp-production-text>Вклад каждого сотрудника на&nbsp;производстве&nbsp;— это основа нашего успеха. Нам важно, чтобы каждый чувствовал свою значимость и&nbsp;был уверен в&nbsp;завтрашнем дне.</p>
    <p><a class="ui-button ui-button--light" href="vacancies.html" data-cp-production-link>Подробнее о вакансии</a></p>
  </div>
  <button class="cp-production__arrow cp-production__arrow--prev" type="button" data-cp-production-prev aria-label="Предыдущий слайд">
    <svg width="25" height="50" viewBox="0 0 25 50" fill="none" aria-hidden="true"><path d="M23 2L3 25l20 23" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <button class="cp-production__arrow cp-production__arrow--next" type="button" data-cp-production-next aria-label="Следующий слайд">
    <svg width="25" height="50" viewBox="0 0 25 50" fill="none" aria-hidden="true"><path d="M2 2l20 23L2 48" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <script type="application/json" data-cp-production-slides>${productionSlidesJson.replaceAll('</', '<\\/')}</script>
  <ul class="cp-production__stepper" role="tablist" aria-label="Направления производства">
${stepperTabs}
  </ul>
</section>

<section class="ui-section" id="directions">
  <div class="ui-container">
    <h2 class="ui-h2">Направления деятельности</h2>
    <ul class="cp-directions__grid" data-cp-directions>
${directionsGrid}
    </ul>
  </div>
  <script type="application/json" data-cp-directions-data>${directionsJson.replaceAll('</', '<\\/')}</script>
</section>

<dialog class="ui-modal ui-modal--md" id="cp-direction-dialog" open data-ui-modal aria-labelledby="cp-direction-dialog-title">
  <button class="ui-modal__close" type="button" aria-label="Закрыть">
    <svg class="ui-modal__icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
  <h2 class="ui-modal__title ui-h3" id="cp-direction-dialog-title" data-cp-dir-title>Направление</h2>
  <div class="ui-modal__body">
    <img class="cp-directions__photo" src="assets/images/popup-teplogen.jpg" alt="" data-cp-dir-photo width="590" height="400">
    <div class="cp-directions__nav">
      <button class="ui-button ui-button--light ui-button--sm" type="button" data-cp-dir-prev aria-label="Предыдущее фото">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14 8H3M8 3L3 8l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="ui-button ui-button--light ui-button--sm" type="button" data-cp-dir-next aria-label="Следующее фото">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M8 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <p class="ui-h5" data-cp-dir-subtitle>Направление</p>
    <p class="ui-body" data-cp-dir-text>Описание направления.</p>
    <p><a class="ui-button ui-button--primary" href="vacancies.html">Смотреть вакансии</a></p>
  </div>
</dialog>

<section class="cp-holding">
  <div class="cp-holding__bg" aria-hidden="true">
    <img src="assets/images/about-holding.jpg" alt="" loading="lazy">
  </div>
  <div class="ui-container cp-holding__inner">
    <h2 class="cp-holding__title ui-h2">Один из крупнейших энергетических холдингов России</h2>
    <ul class="cp-holding__stats">
      <li class="cp-holding__stat">
        <span class="cp-holding__stat-value">50%</span>
        <span>молодых специалистов получают карьерное продвижение в&nbsp;течение 2-х лет после старта работы в&nbsp;Группе</span>
        <span class="cp-holding__stat-note">* по данным агрегированного мониторинга в&nbsp;области трудоустройства и&nbsp;развития выпускников</span>
      </li>
      <li class="cp-holding__stat">
        <span class="cp-holding__stat-value">60+</span>
        <span>тысяч человек работают в&nbsp;Группе</span>
        <span class="cp-holding__stat-note">* по данным годового отчёта Группы за&nbsp;2024&nbsp;год</span>
      </li>
      <li class="cp-holding__stat">
        <span class="cp-holding__stat-value">Топ-20</span>
        <span>крупнейших компаний РФ по&nbsp;чистой прибыли</span>
        <span class="cp-holding__stat-note">* по данным Forbes за&nbsp;2024&nbsp;год</span>
      </li>
    </ul>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Популярные работодатели Группы</h2>
    <div class="cp-employers__grid">
${employerLogos}
    </div>
  </div>
</section>

<section class="cp-why-us">
  <div class="cp-why-us__bg" aria-hidden="true">
    <img src="assets/images/bg-elektro.jpg" alt="" loading="lazy">
  </div>
  <div class="ui-container cp-why-us__inner">
    <div class="cp-why-us__top">
      <h2 class="cp-why-us__title ui-h2">Работа в&nbsp;«Интер РАО»&nbsp;— это участие в&nbsp;развитии одной из&nbsp;ключевых отраслей страны</h2>
${whyCards[0]}
    </div>
    <div class="cp-why-us__row">
${whyCards.slice(1).join('\n')}
    </div>
  </div>
</section>

<div id="vacancies" class="ui-section">
  <div class="ui-container">
    <div class="cp-vacancy-search__wrap">
      <form class="cp-vacancy-search__panel" action="vacancies.html" method="get" aria-label="Поиск вакансии">
        <h2 class="ui-h3">Найди свою вакансию</h2>
        <div class="cp-vacancy-search__fields">
          ${selectField({ name: 'city', ariaLabel: 'Город', options: ['Город', 'Москва', 'Санкт-Петербург', 'Екатеринбург'], pill: true })}
          ${selectField({ name: 'position', ariaLabel: 'Должность', options: ['Должность', 'Инженер', 'Электромонтёр', 'Специалист'], pill: true })}
          ${selectField({ name: 'experience', ariaLabel: 'Опыт', options: ['Опыт', 'Без опыта', 'От 1 года', 'От 3 лет'], pill: true })}
          <button class="ui-button ui-button--accent" type="submit">найти</button>
        </div>
      </form>
      <a class="cp-vacancy-search__all" href="vacancies.html">
        <span>Все 140 вакансий</span>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M8 26L26 8M12 8h14v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
  </div>
</div>

<section class="ui-section" id="students">
  <div class="ui-container">
    <h2 class="ui-h2">Школьникам и студентам</h2>
    <div class="cp-students__grid">
${studentCards}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Видео о работе в компании</h2>
    <button class="cp-video__player" type="button">
      <img class="cp-video__poster" src="assets/images/video-poster-irao.jpg" alt="" loading="lazy">
      <span class="cp-video__overlay" aria-hidden="true"></span>
      <span class="cp-video__play" aria-hidden="true">
        <svg width="26" height="30" viewBox="0 0 26 30" fill="none"><path d="M25 15L1.5 28.856L1.5 1.144L25 15Z" fill="currentColor"/></svg>
      </span>
      <span class="cp-video__time">24:23</span>
    </button>
  </div>
</section>

<section class="ui-section" id="media">
  <div class="ui-container">
    <h2 class="ui-h2">Медиа о работе в компании</h2>
    <div class="cp-media__grid">
${mediaCards}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Стань частью нашей большой команды</h2>
    <img class="cp-team__photo" src="assets/images/team-wide.jpg" alt="Команда Интер РАО" loading="lazy">
  </div>
</section>

<section class="ui-section" id="contacts-block">
  <div class="ui-container">
    <div class="cp-cta-mail__card">
      <h2 class="ui-h2">Нет подходящей вакансии?</h2>
      <p class="ui-lead">Расскажи о себе — возможно, мы ищем именно тебя!</p>
      <p><a class="cp-cta-mail__email ui-link" href="mailto:career@interrao.ru">career@interrao.ru</a></p>
    </div>
  </div>
</section>

${applyDialogHtml()}`;
}

/* ── вакансии: список ── */

function vacanciesMain() {
  const rows = VAC.items.map(vacancyRow).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Вакансии', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head cp-page-head--split">
      <div>
        <h1 class="ui-page-title">Вакансии</h1>
        <p class="cp-page-subtitle ui-lead">Открытые вакансии компаний Группы «Интер РАО» — от производственных до офисных направлений.</p>
      </div>
      <p class="ui-small ui-text--muted">На сайте ${VAC.total} вакансий</p>
    </div>

    <div class="cp-vac-layout">
      <aside class="cp-vac-side" aria-label="Фильтры вакансий">
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Регион</span>
          ${selectField({ name: 'region', options: ['Все регионы', 'Москва', 'Омская область', 'Санкт-Петербург'], pill: true, ariaLabel: 'Регион' })}
        </div>
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Специализация</span>
          ${selectField({ name: 'direction', options: ['Все направления', 'Электроэнергетика', 'Теплоэнергетика', 'Информационные технологии', 'Экономика и управление', 'Машиностроение', 'Юриспруденция', 'Техносферная безопасность', 'Промышленное и гражданское строительство'], pill: true, ariaLabel: 'Направления' })}
        </div>
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Сегмент бизнеса</span>
          ${selectField({ name: 'segment', options: ['Все сервисы', 'Генерация', 'Инжиниринг', 'Розничный бизнес', 'Сервисы', 'Энергомашиностроение', 'Корпоративный центр'], pill: true, ariaLabel: 'Сервисы' })}
        </div>
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Компания</span>
          ${selectField({ name: 'company', options: ['Все компании', 'ПАО «Интер РАО»', 'АО «Интер РАО – Электрогенерация»', 'АО «Мосэнергосбыт»', 'ООО «Интер РАО – ИТ»', 'ООО «Интер РАО – Цифровые решения»', 'АО «Интер РАО – Инжиниринг»', 'ПАО «Уральский турбинный завод»', 'АО «БашРТС»', 'АО «Интер РАО – ТГК-11»', 'ПАО «Саратовэнерго»', 'АО «Томская генерация»'], pill: true, ariaLabel: 'Компания' })}
        </div>
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Должность</span>
          ${selectField({ name: 'position', options: ['Все должности', 'Ведущий', 'Инженер', 'Специалист', 'Менеджер', 'Аналитик', 'Оператор', 'Электромонтёр', 'Слесарь', 'Юрист'], pill: true, ariaLabel: 'Должность' })}
        </div>
        <div class="cp-vac-side__group">
          ${radioGroup({
            label: 'Опыт',
            name: 'exp',
            options: [
              ['Без опыта', 'none'],
              ['От 1 года', '1y'],
              ['От 3 лет', '3y'],
            ],
          })}
        </div>
        <div class="cp-vac-side__group">
          <label class="ui-checkbox">
            <input class="ui-checkbox__input" type="checkbox" name="accessible">
            <span>Доступно людям с инвалидностью</span>
          </label>
        </div>
        <div class="cp-vac-side__group">
          <span class="cp-vac-side__label">Сортировка</span>
          ${selectField({ name: 'sort', options: ['По дате добавления', 'По зарплате'], pill: true, ariaLabel: 'Сортировка' })}
        </div>
        <!-- «Сбросить» — ui-button--text (T16.7; REPORT §8.2 №6/№8:
             текстовая fs 14/400 underline muted — оригинал .vac-side__reset) -->
        <button class="ui-button ui-button--text" type="button">Сбросить</button>
        <div class="ui-card ui-card--filled cp-vac-side__promo">
          <p class="ui-small">Если ты студент или выпускник — свяжись с нами и получи практику или стажировку в компаниях Группы.</p>
          <a class="ui-button ui-button--primary" href="practices.html">узнать подробнее</a>
        </div>
      </aside>

      <div class="cp-vac-main">
        <!-- панель поиска — общий findBar vacancies/events-search (T15.5,
             Technical considerations: переиспользуемая cp-функция) -->
        ${findBar({
          action: 'vacancies.html',
          placeholder: 'Токарь, карбюраторщик',
          label: 'Поиск вакансий',
          text: 'Найти',
        })}

        <!-- ui-chip (T14.8), ссылочная форма: GET-фильтр как в оригинале,
             активный — aria-current="page" из разметки, JS не нужен -->
        <nav class="ui-chip" aria-label="Направления">
          <a class="ui-chip__pill" href="vacancies.html" aria-current="page">энергетика и электротехника</a>
          <a class="ui-chip__pill" href="vacancies.html">информационные технологии</a>
          <a class="ui-chip__pill" href="vacancies.html">экономика и финансы</a>
          <a class="ui-chip__pill" href="vacancies.html">конструирование</a>
          <a class="ui-chip__pill" href="vacancies.html">общие направления</a>
        </nav>

        <div class="cp-vac-rows">
${rows}
        </div>

        <!-- ui-pagination--bare (T16.6): у оригинала .pagination на списковых
             страницах стрелок нет вовсе (REPORT §8.2 №7, замер 22.10) —
             разметка без ui-pagination__arrow + модификатор --bare;
             стили страниц (44×44, aria-current) не меняются -->
        <nav class="ui-pagination ui-pagination--bare" aria-label="Пагинация: вакансии">
          <span class="ui-pagination__page" aria-current="page">1</span>
          <a class="ui-pagination__page" href="vacancies.html?page=2" aria-label="Страница 2">2</a>
          <a class="ui-pagination__page" href="vacancies.html?page=3" aria-label="Страница 3">3</a>
        </nav>
      </div>
    </div>

    ${applyDialogHtml()}
  </div>
</section>`;
}

/* ── вакансия: детальная ── */

function vacancyMain(v = VAC.items[0]) {
  const requirements = [
    `Опыт работы: ${v.experience.toLowerCase()} — или готовность быстро освоить профиль;`,
    'Профильное техническое или экономическое образование (для рабочих позиций — среднее специальное);',
    'Знание нормативной документации и правил охраны труда в энергетике;',
    'Ответственность, внимательность и готовность работать в команде.',
  ];
  const conditions = [
    'оформление по ТК РФ, белая заработная плата, годовая премия;',
    'ДМС с расширенным покрытием и программа телемедицины;',
    'корпоративное обучение и программы повышения квалификации;',
    'компенсация питания и занятий спортом.',
  ];
  const list = (items) =>
    `<ul class="ui-list">\n${items.map((item) => `  <li>${esc(item)}</li>`).join('\n')}\n</ul>`;
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Вакансии', 'vacancies.html'],
    [v.title, ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <article class="cp-vacancy-page">
      <header class="cp-vacancy-page__head">
        <h1 class="ui-page-title">${esc(v.title)}</h1>
        <!-- зарплата (T16.13): канон — литерал 18px muted (pages.css:271);
             размер — литерал 1.125rem сайт-зоны (18px вне десктоп-шкалы ДС:
             роль ui-lead лестницей ≥1024 даёт 24px и меняла бы одобренное
             значение), цвет — ui-text--muted (AA gray-700, T2.3) -->
        <p class="cp-vacancy-page__salary ui-text--muted">${esc(v.salary)} до вычета налога</p>
        <p class="cp-vacancy-page__place">${PLACE_PIN} ${esc(v.place)}</p>
      </header>

      <div class="cp-vacancy-page__section">
        <!-- подзаголовки секций (T16.13): канон fs-h4-тройка 28/500
             (pages.css, --fs-h4) — роль ui-h4 вместо ui-h3 (42/500) -->
        <h2 class="ui-h4">Что предстоит</h2>
        <p class="ui-body">${esc(v.short)} Работа ведётся на объекте ${esc(v.place)} в составе оперативной команды подразделения, с наставником на период адаптации.</p>
      </div>
      <div class="cp-vacancy-page__section">
        <h2 class="ui-h4">Требования</h2>
        ${list(requirements)}
      </div>
      <div class="cp-vacancy-page__section">
        <h2 class="ui-h4">Условия</h2>
        ${list(conditions)}
      </div>
      <div class="cp-vacancy-page__section">
        <h2 class="ui-h4">Где предстоит работать</h2>
        <div class="cp-vacancy-page__map" role="img" aria-label="Карта: ${esc(v.place)}"></div>
        <p class="ui-body"><b>Адрес:</b> ${PLACE_PIN} ${esc(v.address)}</p>
      </div>

      <footer class="cp-vacancy-page__foot">
        <time class="cp-vacancy-page__date ui-small" datetime="${esc(v.date.split('.').reverse().join('-'))}">${CAL}${esc(v.date)}</time>
        ${pillButton('откликнуться', { target: 'cp-apply-dialog' })}
      </footer>
    </article>

    ${applyDialogHtml()}
  </div>
</section>`;
}

/* ── отклик на вакансию: страница-форма ── */

function vacancyApplyMain(v = VAC.items[0]) {
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Вакансии', 'vacancies.html'],
    [v.title, 'vacancy.html'],
    ['Отклик', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <h1 class="ui-page-title">Отклик на вакансию</h1>
    <div class="ui-form__layout" style="margin-top: var(--ui-space-5);">
      <div class="ui-form__main">
        <p class="ui-small ui-text--muted">Вакансия: <strong>${esc(v.title)}</strong>, ${esc(v.company)}</p>
        <div class="cp-form-wrap">
          ${applyForm({ id: 'va', note: 'Компания рассмотрит ваш отклик и свяжется с вами по телефону или email в течение 10 рабочих дней.' })}
        </div>
      </div>
      <aside class="ui-form__aside" aria-labelledby="va-aside-title">
        <h2 class="ui-h4 ui-form__aside-title" id="va-aside-title">${esc(v.title)}</h2>
        <p class="ui-body ui-form__aside-text">${esc(v.company)}, ${esc(v.city)}. Зарплата ${esc(v.salary)}.</p>
        <dl class="ui-form__aside-list">
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Опыт работы</dt>
            <dd class="ui-form__aside-value">${esc(v.experience)}</dd>
          </div>
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Направление</dt>
            <dd class="ui-form__aside-value">${esc(v.direction)}</dd>
          </div>
        </dl>
        <a class="ui-button ui-button--outline" href="vacancy.html">вернуться к вакансии</a>
      </aside>
    </div>
  </div>
</section>`;
}

/* ── заявка на стажировку: страница-форма (T15.4) ──
   Паттерн vacancy-apply: страница-форма несёт базовые поля 52px (компакт —
   только модалки, решение T15.6), success-ветка — мок без бэкенда. Состав
   полей — оригинал internship-apply.html (build.py:779): ФИО, пол, дата
   рождения, телефон, email, гражданство, вуз, специальность, курс-select,
   статус образования + скрытый блок опыта (в оригинале forms.js его не
   переключает — data-атрибуты без обработчика), textarea, согласие.
   Курс — selectField (ui-field select-вариант формы вакансии — переиспользован,
   вторая форма select не заводится, Technical considerations). Анкета
   привязана к записи items[1] «Стажировка: разработчик» — та же, что
   детальная internship.html. */
function internshipApplyMain(i = INT.internship.items[1]) {
  const reqStar = ` <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span>`;
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Стажировки', 'internships.html'],
    ['Заявка', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <h1 class="ui-page-title">Заявка на стажировку</h1>
    <div class="ui-form__layout" style="margin-top: var(--ui-space-5);">
      <div class="ui-form__main">
        <p class="ui-small ui-text--muted">Стажировка: <strong>${esc(i.title.replace(/^Стажировка:\s*/, ''))}</strong>, ${esc(i.company)}</p>
        <div class="cp-form-wrap">
          <form class="ui-form" action="#ia" method="post" data-cp-form novalidate>
  <div class="ui-form__layout">
    <div class="ui-form__main" data-cp-form-body>
      <div class="ui-form__grid">
        ${field({ label: 'Фамилия', name: 'lastname', required: true, placeholder: 'Иванов' })}
        ${field({ label: 'Имя', name: 'firstname', required: true, placeholder: 'Иван' })}
        ${field({ label: 'Отчество', name: 'middlename', placeholder: 'Иванович' })}
        ${radioGroup({
          label: 'Пол',
          name: 'gender',
          options: [
            ['Мужской', 'm'],
            ['Женский', 'f'],
          ],
          required: true,
        })}
        ${field({ label: 'Дата рождения', name: 'birth', required: true, placeholder: 'ДД.ММ.ГГГГ' })}
        ${field({ label: 'Телефон', name: 'phone', type: 'tel', required: true, placeholder: '+7 (___) ___-__-__' })}
        ${field({ label: 'Email', name: 'email', type: 'email', required: true, placeholder: 'you@example.ru' })}
        ${field({ label: 'Гражданство', name: 'citizenship', required: true, placeholder: 'Российская Федерация' })}
        ${field({ label: 'Учебное заведение', name: 'university', required: true, placeholder: 'Название вуза или колледжа' })}
        ${field({ label: 'Специальность', name: 'speciality', required: true, placeholder: 'Информационные технологии' })}
        ${selectField({
          label: 'Курс обучения',
          name: 'course',
          required: true,
          options: [
            { label: 'Выберите', value: '' },
            '1 курс',
            '2 курс',
            '3 курс',
            '4 курс',
            'Магистратура',
          ],
        })}
        <div class="ui-field ui-field--required ui-field--wide">
          <fieldset class="ui-radio-group">
            <legend class="ui-radio-group__legend">Статус образования${reqStar}</legend>
            <div class="ui-radio-group__row">
              <label class="ui-radio"><input class="ui-radio__input" type="radio" name="edustatus" value="inprogress" required checked data-edu-toggle>В процессе обучения</label>
              <label class="ui-radio"><input class="ui-radio__input" type="radio" name="edustatus" value="finished" data-edu-toggle>Завершил обучение</label>
            </div>
          </fieldset>
        </div>
        <!-- условная ветка «Завершил обучение»: в оригинале скрыта и никогда
             не показывается (forms.js переключатель не реализует,
             internship-apply.html:71) — мок валидирует только видимые поля -->
        <div class="ui-field ui-field--wide" data-experience-fields hidden>
          <div class="ui-form__grid">
            <fieldset class="ui-radio-group">
              <legend class="ui-radio-group__legend">Наличие опыта работы${reqStar}</legend>
              <div class="ui-radio-group__row">
                <label class="ui-radio"><input class="ui-radio__input" type="radio" name="hasexp" value="yes" required>Да</label>
                <label class="ui-radio"><input class="ui-radio__input" type="radio" name="hasexp" value="no" checked>Нет</label>
              </div>
            </fieldset>
            ${field({ label: 'Последнее место работы', name: 'lastjob', required: true, placeholder: 'Название компании' })}
            ${field({ label: 'Должность', name: 'lastpos', required: true, placeholder: 'Должность' })}
            ${field({ label: 'Период работы', name: 'period', required: true, placeholder: '2023–2026' })}
          </div>
        </div>
        <div class="ui-field ui-field--wide">
          <label class="ui-field__label" for="ia-extra">Дополнительная информация</label>
          <textarea class="ui-field__textarea" id="ia-extra" name="extra" placeholder="О чём нам стоит знать"></textarea>
        </div>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-checkbox">
          <input class="ui-checkbox__input" type="checkbox" name="consent" required>
          <span>Я даю <a class="ui-link" href="#">согласие на обработку персональных данных</a> и ознакомлен(а) с <a class="ui-link" href="#">Политикой конфиденциальности</a>${reqStar}</span>
        </label>
      </div>
      <div class="ui-form__actions">
        <button class="ui-button ui-button--accent" type="submit">отправить заявку</button>
      </div>
    </div>
  </div>
  <div class="ui-form__success" data-cp-form-success hidden>
    <h2 class="ui-h4 ui-form__success-title" tabindex="-1">Заявка отправлена</h2>
    <p class="ui-body ui-form__success-text">Компания рассмотрит заявку и свяжется с вами по телефону или email в течение 10 рабочих дней. Повторная подача заявки на эту стажировку невозможна.</p>
    <div class="ui-form__success-actions">
      <a class="ui-button ui-button--outline" href="internships.html">К списку стажировок</a>
    </div>
  </div>
</form>
        </div>
      </div>
      <aside class="ui-form__aside" aria-labelledby="ia-aside-title">
        <h2 class="ui-h4 ui-form__aside-title" id="ia-aside-title">${esc(i.title)}</h2>
        <p class="ui-body ui-form__aside-text">${esc(i.company)}, ${esc(i.city)}. ${esc(i.schedule)}, оплачиваемая стажировка от 60 000 ₽.</p>
        <dl class="ui-form__aside-list">
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Направление подготовки</dt>
            <dd class="ui-form__aside-value">${esc(i.study)}</dd>
          </div>
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Длительность</dt>
            <dd class="ui-form__aside-value">6 месяцев</dd>
          </div>
        </dl>
        <a class="ui-button ui-button--outline" href="internship.html">вернуться к стажировке</a>
      </aside>
    </div>
  </div>
</section>`;
}

/* ── заявка на мероприятие: страница-форма (T15.4) ──
   Короткая форма (e-mail + ошибка + success) — оригинал event-apply.html
   (build.py:832); CTA «подать заявку» с event.html замкнут (T15.1).
   Ошибка поля — канон ui-field__error: слот с role="alert" в разметке
   (текст фрагмента), вне --error скрыт CSS ДС; мок переключает состояние.
   Aside — мета мероприятия из data (время «14:00» в data нет — фрагмент,
   как на event.html T15.1). */
function eventApplyMain(e = EVT.upcoming[0]) {
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Мероприятия', 'events.html'],
    ['Заявка', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <h1 class="ui-page-title">Заявка на мероприятие</h1>
    <div class="ui-form__layout" style="margin-top: var(--ui-space-5);">
      <div class="ui-form__main">
        <p class="ui-small ui-text--muted">Мероприятие: <strong>${esc(e.title)}</strong>, ${esc(e.date)}, ${esc(e.city)}</p>
        <div class="cp-form-wrap">
          <form class="ui-form" action="#ea" method="post" data-cp-form novalidate>
  <div class="ui-form__layout">
    <div class="ui-form__main" data-cp-form-body>
      <div class="ui-field ui-field--required">
        <label class="ui-field__label" for="ea-email">Email <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span></label>
        <input class="ui-field__input" type="email" id="ea-email" name="email" required placeholder="you@example.ru" aria-describedby="ea-email-error">
        <p class="ui-field__error" id="ea-email-error" role="alert">Укажите корректный email</p>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-checkbox">
          <input class="ui-checkbox__input" type="checkbox" name="consent" required>
          <span>Я даю <a class="ui-link" href="#">согласие на обработку персональных данных</a> и ознакомлен(а) с <a class="ui-link" href="#">Политикой конфиденциальности</a> <span class="ui-field__req"><span aria-hidden="true">*</span><span class="ui-field__req-text">обязательное поле</span></span></span>
        </label>
      </div>
      <div class="ui-form__actions">
        <button class="ui-button ui-button--accent" type="submit">подать заявку</button>
      </div>
    </div>
  </div>
  <div class="ui-form__success" data-cp-form-success hidden>
    <h2 class="ui-h4 ui-form__success-title" tabindex="-1">Заявка отправлена</h2>
    <p class="ui-body ui-form__success-text">Мы отправим подтверждение и детали посещения на указанный email. Повторная заявка на участие в этом мероприятии невозможна.</p>
    <div class="ui-form__success-actions">
      <a class="ui-button ui-button--outline" href="events.html">К списку мероприятий</a>
    </div>
  </div>
</form>
        </div>
      </div>
      <aside class="ui-form__aside" aria-labelledby="ea-aside-title">
        <h2 class="ui-h4 ui-form__aside-title" id="ea-aside-title">${esc(e.title)}</h2>
        <dl class="ui-form__aside-list">
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Дата</dt>
            <dd class="ui-form__aside-value">${esc(e.date)}, 14:00</dd>
          </div>
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Город</dt>
            <dd class="ui-form__aside-value">${esc(e.city)}</dd>
          </div>
          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">Формат</dt>
            <dd class="ui-form__aside-value">${esc(e.format)}</dd>
          </div>
        </dl>
        <a class="ui-button ui-button--outline" href="event.html">вернуться к мероприятию</a>
      </aside>
    </div>
  </div>
</section>`;
}

/* ── детальные «internship__*»: общий шаблон (T15.1) ── */

/** Общий шаблон детальной семейства internship__* оригинала
 *  (src/pages/event.html, internship.html — один фрагмент-шаблон):
 *  main-колонка — шапка-тройка (h1 канона детальной ui-page-title + теги +
 *  мета-строка), фото, контент-секции; aside — мета-строки «по образцу
 *  aside вакансии»: ui-form__aside + dl (порт .form-aside ДС, как на
 *  vacancy-apply; .internship__aside оригинала — та же карточка, pages.css:552).
 *  Потребители: event.html (T15.1), internship.html (T15.4 переиспользует
 *  функцию, не дублируя её).
 *  Параметры: crumbs — цепочка breadcrumbs(); title — h1; tags —
 *  [{text, variant}]; meta — {text, datetime} (опционален: у internship__head
 *  даты нет, T15.4); salary — строка «зарплатной вилки» (опционален, T15.4:
 *  span.vacancy__salary оригинала internship.html:12); company — {text,
 *  href} (опционален, T15.4: a.vacancy__company → company.html, строка 13);
 *  photo — {src, alt, width, height}; sections — [{title, html}]; aside —
 *  {title, rows: [[метка, значение]], cta: {text, href}, note}. */
function internshipDetail({ crumbs, title, tags, meta, salary, company, photo, sections, aside }) {
  const tagsHtml = tags
    .map((tag) => `<span class="ui-tag ui-tag--${tag.variant}">${esc(tag.text)}</span>`)
    .join('');
  // хвост шапки-тройки: дата события и/или зарплата+компания стажировки
  // (со сдвигом строки и отступами исходного шаблона — вывод event.html
  // не меняется)
  const headExtra = [
    meta
      ? `\n          <time class="ui-body" datetime="${esc(meta.datetime)}">${esc(meta.text)}</time>`
      : '',
    salary ? `\n          <span class="ui-body">${esc(salary)}</span>` : '',
    company
      ? `\n          <a class="ui-link" href="${esc(company.href)}">${esc(company.text)}</a>`
      : '',
  ].join('');
  const sectionsHtml = sections
    .map(
      (section) => `<div class="cp-detail-section">
  <h2 class="ui-h4">${esc(section.title)}</h2>
  ${section.html}
</div>`,
    )
    .join('\n');
  const rowsHtml = aside.rows
    .map(
      ([label, value]) => `          <div class="ui-form__aside-row">
            <dt class="ui-form__aside-label">${esc(label)}</dt>
            <dd class="ui-form__aside-value">${esc(value)}</dd>
          </div>`,
    )
    .join('\n');
  const asideId = nextId('detail-aside');
  return `${breadcrumbs(crumbs)}
<section class="ui-section">
  <div class="ui-container">
    <div class="ui-form__layout">
      <div class="cp-detail-main">
        <header class="cp-detail-head">
          <h1 class="ui-page-title">${esc(title)}</h1>
          <p class="cp-detail-tags">${tagsHtml}</p>${headExtra}
        </header>
        <img class="ui-image ui-image--cover cp-detail-photo" src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="${photo.width}" height="${photo.height}">
        ${sectionsHtml}
      </div>
      <aside class="ui-form__aside" aria-labelledby="${asideId}">
        <h2 class="ui-h4 ui-form__aside-title" id="${asideId}">${esc(aside.title)}</h2>
        <dl class="ui-form__aside-list">
${rowsHtml}
        </dl>
        <a class="ui-button ui-button--accent" href="${esc(aside.cta.href)}">${esc(aside.cta.text)}</a>
        <p class="ui-micro ui-text--muted">${esc(aside.note)}</p>
      </aside>
    </div>
  </div>
</section>`;
}

/* ── мероприятие: детальная (T15.1) ── */

function eventMain(e = EVT.upcoming[0]) {
  const reg = regTag(e);
  return internshipDetail({
    crumbs: [
      ['Главная', 'index.html'],
      ['Мероприятия', 'events.html'],
      ['День открытых дверей', ''],
    ],
    title: e.title,
    tags: [
      reg,
      { text: e.city, variant: 'blue' },
      { text: e.format, variant: 'gray' },
      { text: e.audience, variant: 'gray' },
    ],
    // строка даты — фрагмент оригинала (время «14:00» в data нет);
    // datetime — из data
    meta: { text: '28 сентября 2026, 14:00', datetime: isoDate(e.date) },
    // alt по контенту (Accessibility requirements): имя события из data
    photo: { src: e.image, alt: e.title, width: 431, height: 431 },
    sections: [
      {
        title: 'Подробное описание',
        html: `<p class="ui-body">Приглашаем студентов технических специальностей на день открытых дверей генерирующей компании Группы «Интер РАО». Вы увидите, как устроена современная станция изнутри: машинный зал, блочный щит управления, лаборатории. Инженеры расскажут о производстве электроэнергии и ответят на вопросы о работе и стажировках в компании.</p>
  <p class="ui-body">Встреча продлится около двух часов: экскурсия по объекту, презентация карьерных возможностей и неформальное общение с молодыми специалистами компании. Вход по предварительной регистрации.</p>`,
      },
      {
        title: 'Кому будет полезно',
        html: `<ul class="ui-list">
    <li>Студентам энергетических и электротехнических специальностей;</li>
    <li>Тем, кто рассматривает стажировки и практики в генерации;</li>
    <li>Всем, кто хочет увидеть энергетическое производство изнутри.</li>
  </ul>`,
      },
    ],
    aside: {
      title: 'Детали',
      rows: [
        ['Регион', e.region],
        ['Город', e.city],
        ['Дата', e.date],
        ['Формат', e.format],
      ],
      // event-apply.html собирается в T15.4 (Out of scope T15.1)
      cta: { text: 'подать заявку', href: 'event-apply.html' },
      note: 'Повторная заявка на участие в этом мероприятии невозможна.',
    },
  });
}

/* ── стажировка: детальная (T15.4) ──
   Оригинал — одна типовая страница internship.html за записью
   «Стажировка: разработчик» (build.py:772; фрагмент internship.html:
   компания/город/фото internship-2.png — это internship.items[1]).
   Остальные стажировки — генеративные повторы (Out of scope). Шаблон —
   общий internshipDetail из T15.1; шапка: теги (paid/schedule/study
   оригинала internship.html:7–10), зарплатная вилка «от 60 000 ₽» и
   компания-ссылка (в data зарплаты нет — фрагмент, как текст секций). */
function internshipMain(i = INT.internship.items[1]) {
  return internshipDetail({
    crumbs: [
      ['Главная', 'index.html'],
      ['Стажировки', 'internships.html'],
      ['Стажировка: разработчик', ''],
    ],
    title: i.title,
    tags: [
      // детальная пишет с заглавной (internship.html:8) против карточек
      { text: 'Оплачиваемая', variant: 'orange' },
      { text: i.schedule, variant: 'blue' },
      { text: i.study, variant: 'gray' },
    ],
    salary: 'от 60 000 ₽',
    company: { text: i.company, href: 'company.html' },
    // alt по контенту (Accessibility requirements): имя стажировки из data
    photo: { src: i.image, alt: i.title, width: 431, height: 431 },
    sections: [
      {
        title: 'Примеры задач',
        html: `<ul class="ui-list">
    <li>Разработка внутренних сервисов Группы «Интер РАО»;</li>
    <li>Интеграция систем по REST API;</li>
    <li>Написание модульных тестов и участие в код-ревью;</li>
    <li>Работа с базами данных и оптимизация запросов.</li>
  </ul>`,
      },
      {
        title: 'Детальное описание',
        html: `<p class="ui-body">Стажировка в команде разработки ИТ-систем Группы «Интер РАО». Вы будете работать в продуктовой команде с опытным наставником: познакомитесь с процессами компании, рабочим стеком (Python, SQL, Git) и стандартами разработки. По итогам стажировки возможно трудоустройство на позицию младшего разработчика.</p>
  <p class="ui-body">График гибридный: 2 дня в офисе, остальное — удалённо. Продолжительность стажировки — 6 месяцев, полгода реальных задач и роста.</p>`,
      },
    ],
    aside: {
      title: 'О стажировке',
      rows: [
        ['Компания', i.company],
        ['Город', i.city],
        ['Регион', i.region],
        ['Направление подготовки', i.study],
        ['Формат', i.schedule],
      ],
      cta: { text: 'подать заявку', href: 'internship-apply.html' },
      note: 'Повторная подача заявки на эту стажировку невозможна.',
    },
  });
}

/* ── стажировки/практики: лендинг ── */

function internshipsMain(set) {
  const data = INT[set];
  const isPractice = set === 'practice';
  const cards = data.items.map(internCard).join('\n');
  const advantages = data.advantages.map(advCard).join('\n');
  const steps = timeline(data.steps);
  const photos = [
    'assets/images/students-photo-1.jpg',
    'assets/images/students-photo-2.jpg',
    'assets/images/students-photo-3.jpg',
    'assets/images/tag-photo-1.png',
  ];
  const interns = data.interns
    .map((person, index) => internPerson(person, person.photo || photos[index % photos.length]))
    .join('\n');
  const events = EVT.upcoming.slice(0, 3).map(eventCard).join('\n');
  const pageTitles = {
    practice: ['Практики', 'практики', 'практику', 'практикантами'],
    internship: ['Стажировки', 'стажировки', 'стажировку', 'стажёрами'],
  };
  const [title, titleLower, titleAcc, who] = pageTitles[set];

  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Школьникам и студентам', null],
    [title, ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-cover-hero">
      <h1 class="ui-page-title">${title}</h1>
      <p class="cp-page-subtitle ui-lead">${esc(data.subtitle)}</p>
      <a class="ui-button ui-button--primary" href="#directions">смотреть ${titleLower}</a>
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <div class="ui-tabs ui-tabs--pill" data-ui-tabs>
      <div class="cp-tabs-row">
        <div class="ui-tabs__list">
          <a class="ui-tabs__tab" href="#cptab-practice" id="cptab-practice-tab"${isPractice ? ' aria-current="page"' : ''}>практика</a>
          <a class="ui-tabs__tab" href="#cptab-internship" id="cptab-internship-tab"${isPractice ? '' : ' aria-current="page"'}>стажировка</a>
        </div>
        <!-- Смешанный набор «табы + ссылки разделов» (tabs-pill оригинала):
             ссылки — вне tablist, отдельным nav (правило ui-tabs); вид табов —
             ui-tabs--pill (T14.9), начальный выбор — aria-current="page"
             из разметки (T14.9): активный таб = раздел страницы, порядок
             табов фиксированный, как в оригинале. -->
        <nav class="cp-tabs-links" aria-label="Другие разделы">
          <a class="ui-link" href="education.html">целевое обучение</a>
          <a class="ui-link" href="career-track.html">карьерный трек</a>
          <a class="ui-link" href="events.html">мероприятия</a>
        </nav>
      </div>
      <section class="ui-tabs__panel" id="cptab-practice" aria-labelledby="cptab-practice-tab">
        <p class="ui-small">Каталог практик — на странице «Практики».</p>
      </section>
      <section class="ui-tabs__panel" id="cptab-internship" aria-labelledby="cptab-internship-tab">
        <p class="ui-small">Каталог стажировок — на странице «Стажировки».</p>
      </section>
    </div>
  </div>
</section>

<section class="ui-section" id="directions">
  <div class="ui-container">
    <h2 class="ui-h2">Выбери свой город и направление</h2>
    <p>${selectField({ name: 'city', options: ['все города', 'Москва', 'Санкт-Петербург', 'Екатеринбург'], pill: true, ariaLabel: 'Город' })}</p>
    <!-- ui-chip (T14.8), кнопочная форма: мок-фильтр, состояние — aria-pressed
         (переключение — один слушатель в pilot.js на data-cp-filter-group) -->
    <div class="ui-chip" role="group" aria-label="Направления" data-cp-filter-group>
      <button class="ui-chip__pill" type="button" aria-pressed="true">все направления</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">экономика и финансы</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">атомная энергетика и энергостроительство</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">электроэнергетика и электрика</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">химические технологии</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">теплоэнергетика и теплотехника</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">конструирование</button>
      <button class="ui-chip__pill" type="button" aria-pressed="false">общие направления</button>
    </div>
    <div class="ui-grid ui-grid--3">
${cards}
    </div>
  </div>
</section>

<!-- карточки направлений ведут на детальную internship.html (T15.4);
     модалка направления снята — её содержимое («Примеры задач») перенесено
     на страницу детальной. Мок-анкета отклика (T15.6, компакт 48px)
     остаётся в каркасе страницы. -->
${applyDialogHtml()}

<section class="ui-section">
  <div class="ui-container">
    <div class="cp-adv-marquee">
      <div class="cp-adv-marquee__type" aria-hidden="true">
        <!-- T16.15: бирки строк — по ролям оригинала (internships.html:247–250):
             подписи --bar (18px), мелкая --sm (13px), базовая крупная --xl (40px) -->
        <span class="cp-adv-marquee__line cp-adv-marquee__line--bar">Группа «Интер РАО»</span>
        <span class="cp-adv-marquee__line cp-adv-marquee__line--sm">оплачиваемые программы для студентов и выпускников по всей России</span>
        <span class="cp-adv-marquee__line cp-adv-marquee__line--xl">НАЧНИ КАРЬЕРУ В ЭНЕРГЕТИКЕ ЕЩЁ ВО ВРЕМЯ УЧЁБЫ</span>
        <span class="cp-adv-marquee__line cp-adv-marquee__line--bar">опыт · наставники · трудоустройство</span>
      </div>
      <div class="cp-adv-marquee__body">
        <img class="cp-adv-marquee__photo" src="${esc(data.advantages_companies.image)}" alt="">
        <p class="ui-body">${esc(data.advantages_companies.text)}</p>
      </div>
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Преимущества прохождения ${titleLower}</h2>
    <div class="cp-adv-grid">
${advantages}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Как попасть на ${titleAcc}</h2>
    <div class="cp-timeline">
${steps}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Познакомьтесь с нашими ${who}</h2>
    <div class="ui-grid ui-grid--3">
${interns}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Наши мероприятия</h2>
    <div class="cp-events-feature">
${events}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    ${faq(INT.faq)}
  </div>
</section>`;
}

/* ── целевое обучение ── */

function educationMain() {
  const orgs = EDU.orgs.map(orgCard).join('\n');
  const advantages = EDU.advantages.map(advCard).join('\n');
  const offers = EDU.offers.slice(0, 3).map(offerCard).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Школьникам и студентам', null],
    ['Целевое обучение', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Целевое обучение</h1>
      <p class="cp-page-subtitle ui-lead">Учись по целевому договору — с гарантированным местом работы в Группе после выпуска.</p>
    </div>
    <nav class="ui-chip" aria-label="Разделы школьникам и студентам">
      <a class="ui-chip__pill" href="practices.html">Практики</a>
      <a class="ui-chip__pill" href="internships.html">Стажировки</a>
      <a class="ui-chip__pill" href="education.html" aria-current="page">Целевое обучение</a>
      <a class="ui-chip__pill" href="career-track.html">Карьерный трек</a>
      <a class="ui-chip__pill" href="events.html">Мероприятия</a>
    </nav>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Организации-партнёры</h2>
    <div class="ui-grid ui-grid--3">
${orgs}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Преимущества целевого обучения</h2>
    <div class="cp-adv-grid">
${advantages}
    </div>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    <h2 class="ui-h2">Предложения</h2>
    <div class="ui-grid ui-grid--3">
${offers}
    </div>
    <p style="margin-top: var(--ui-space-4);"><a class="ui-button ui-button--outline" href="education-catalog.html">Все предложения</a></p>
  </div>
</section>

<section class="ui-section">
  <div class="ui-container">
    ${faq(EDU.faq)}
  </div>
</section>`;
}

/* ── каталог целевого обучения (T15.3) ──

   Первый потребитель связки list-page «сайдбар/панель фильтров» за
   пределами vacancies. Фильтры — 6 нативных select wrap-режимом ui-select
   (пилюли cp-pill, ширина — сайт-зона); подписи — label[for] рядом
   (канон ui-select T7.3, Accessibility requirements). Список предложений —
   те же cp-offer-card, что на education.html (оригинал строит каталог
   тем же offer_card в cards-grid--3, build.py:803); данные educat.json
   целиком (6 предложений). Клиентской фильтрации нет — Out of scope
   (селекты оригинала инертны, как фильтры-сайдбар vacancies).
   Пагинация — ui-pagination СО стрелками: education-catalog — одна из двух
   страниц оригинала, где .pagination содержит pagination__arrow
   (src/pages/education-catalog.html:59–67; vacancies без стрелок — REPORT
   §8.2 №7, поэтому там ui-pagination--bare). Недоступная стрелка —
   button[disabled] (канон T6.3: в оригинале disabled на <a> невалиден). */
const CATALOG_FILTERS = [
  {
    name: 'region',
    label: 'Регион',
    options: ['Все регионы', 'Москва', 'Санкт-Петербург', 'Омская область', 'Свердловская область'],
  },
  {
    name: 'city',
    label: 'Город',
    options: ['Все города', 'Москва', 'Санкт-Петербург', 'Омск', 'Екатеринбург'],
  },
  {
    name: 'direction',
    label: 'Направление подготовки',
    options: ['Все направления', 'Теплоэнергетика', 'Электроэнергетика', 'ИТ', 'Машиностроение'],
  },
  {
    name: 'segment',
    label: 'Сегмент бизнеса',
    options: ['Все сегменты', 'Генерация', 'Розничный бизнес', 'Сервисы', 'Энергомашиностроение'],
  },
  {
    name: 'org',
    label: 'Образовательная организация',
    options: ['Все образовательные организации', 'МЭИ', 'СПбПУ', 'ОмГТУ'],
  },
  {
    name: 'level',
    label: 'Уровень образования',
    options: ['Все уровни', 'Высшее', 'Среднее профессиональное'],
  },
];

function educationCatalogMain() {
  const filters = CATALOG_FILTERS.map(
    (f) => `      ${selectField({ name: f.name, label: f.label, options: f.options, pill: true })}`,
  ).join('\n');
  // Тег h2 заголовков offer-карточек (T15.9, axe heading-order): первый
  // offer следует за h1 страницы без промежуточной секции (как в
  // оригинале) — на education.html карточки остаются h3 (там сетка после
  // секций h2).
  const offers = EDU.offers.map((offer) => offerCard(offer, 'h2')).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Целевое обучение', 'education.html'],
    ['Каталог предложений', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Каталог предложений целевого обучения</h1>
      <p class="cp-page-subtitle ui-lead">Выберите направление подготовки и компанию Группы «Интер РАО» — заявка оформляется на сайте «Работа России».</p>
    </div>

    <div class="cp-catalog-filters">
${filters}
    </div>

    <div class="ui-grid ui-grid--3">
${offers}
    </div>

    <div class="cp-catalog-nav">
      <nav class="ui-pagination" aria-label="Пагинация: каталог обучения">
        <button class="ui-pagination__arrow" type="button" disabled aria-label="Предыдущая страница">${ARROW_LEFT}</button>
        <span class="ui-pagination__page" aria-current="page">1</span>
        <a class="ui-pagination__page" href="education-catalog.html?page=2" aria-label="Страница 2">2</a>
        <a class="ui-pagination__page" href="education-catalog.html?page=3" aria-label="Страница 3">3</a>
        <a class="ui-pagination__arrow" href="education-catalog.html?page=2" aria-label="Следующая страница">${ARROW}</a>
      </nav>
    </div>
  </div>
</section>`;
}

/* ── мероприятия ── */

function eventsMain() {
  const upcoming = EVT.upcoming.map(eventCard).join('\n');
  const past = EVT.past.map(eventCard).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Школьникам и студентам', null],
    ['Мероприятия', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Мероприятия</h1>
      <p class="cp-page-subtitle ui-lead">Дни открытых дверей, экскурсии и чемпионаты Группы «Интер РАО».</p>
    </div>
    <nav class="ui-chip" aria-label="Разделы школьникам и студентам">
      <a class="ui-chip__pill" href="practices.html">Практики</a>
      <a class="ui-chip__pill" href="internships.html">Стажировки</a>
      <a class="ui-chip__pill" href="education.html">Целевое обучение</a>
      <a class="ui-chip__pill" href="career-track.html">Карьерный трек</a>
      <a class="ui-chip__pill" href="events.html" aria-current="page">Мероприятия</a>
    </nav>

    <h2 class="ui-h2">Предстоящие</h2>
    <div class="ui-grid ui-grid--3">
${upcoming}
    </div>

    <h2 class="ui-h2">Прошедшие</h2>
    <div class="ui-grid ui-grid--3">
${past}
    </div>

    <!-- ui-pagination СО стрелками (T15.5): events — вторая из двух страниц
         оригинала, где .pagination содержит pagination__arrow (events.html:
         358–367; vacancies без стрелок — REPORT §8.2 №7, там ui-pagination
         --bare). Недоступная стрелка — button[disabled] (канон T6.3: в
         оригинале disabled на <a> невалиден); мок-пагинация ?page=N без
         бэкенда (Out of scope T15.5). -->
    <div class="cp-events-nav">
      <nav class="ui-pagination" aria-label="Пагинация: мероприятия">
        <button class="ui-pagination__arrow" type="button" disabled aria-label="Предыдущая страница">${ARROW_LEFT}</button>
        <span class="ui-pagination__page" aria-current="page">1</span>
        <a class="ui-pagination__page" href="events.html?page=2" aria-label="Страница 2">2</a>
        <a class="ui-pagination__arrow" href="events.html?page=2" aria-label="Следующая страница">${ARROW}</a>
      </nav>
    </div>
  </div>
</section>`;
}

/* ── поиск мероприятий (T15.5) ──

   «Все мероприятия» навигации оригинала (build.py:817–823): панель поиска —
   общий findBar vacancies (Technical considerations: единственный второй
   потребитель панели, дублирования не плодить), тулбар «Найдено: N» с
   фильтр-тегами — прецедент cp-media-toolbar media.html (активного состояния
   у оригинала нет — events-search.html:158–164, aria-current не ставится),
   выдача — все предстоящие события тем же eventCard, что на events.html
   (оригинал строит страницу тем же events_upcoming(), build.py:821).
   Клиентской фильтрации нет — Out of scope; пагинации на странице нет
   (в оригинале тоже нет). Крошки: «Мероприятия» — ссылка, ровно один
   aria-current (Implementation requirements п.2). */
function eventsSearchMain() {
  // Тег h2 заголовков карточек (T15.9, axe heading-order): выдача идёт
  // прямо за h1 страницы, промежуточной секции h2 нет (как в оригинале)
  // — канон base/typography.css «h1→h2→h3 без пропусков»; на events.html
  // карточки остаются h3 (там перед ними секции h2).
  const cards = EVT.upcoming.map((event) => eventCard(event, 'h2')).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Мероприятия', 'events.html'],
    ['Поиск', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Поиск мероприятий</h1>
    </div>

    ${findBar({
      action: 'events-search.html',
      placeholder: 'Название мероприятия, город или ключевое слово',
      label: 'Поиск мероприятий',
      text: 'найти',
      variant: 'primary',
    })}

    <div class="cp-media-toolbar">
      <span class="ui-tag ui-tag--gray">Найдено: ${EVT.upcoming.length}</span>
      <nav class="ui-chip" aria-label="Фильтры мероприятий">
        <a class="ui-chip__pill" href="events-search.html">Все</a>
        <a class="ui-chip__pill" href="events-search.html">Экскурсии</a>
        <a class="ui-chip__pill" href="events-search.html">Чемпионаты</a>
        <a class="ui-chip__pill" href="events-search.html">Вебинары</a>
      </nav>
    </div>

    <div class="ui-grid ui-grid--3">
${cards}
    </div>
  </div>
</section>`;
}

/* ── медиа-каталог ── */

function mediaMain() {
  const cards = ART.items.map(articleCard).join('\n');
  // Фильтры — теги-ссылки ui-tag--blue × ui-tag--filter (T16.14; канон
  // .tag--blue.filter-tag оригинала, media.html:156 + pages.css:596):
  // активная несёт aria-current="page" — состояние в ARIA (прецедент
  // ui-chip), без JS.
  const rubrics = ART.rubrics
    .map(
      (rubric) =>
        `<a class="ui-tag ui-tag--blue ui-tag--filter" href="media.html">${esc(rubric)}</a>`,
    )
    .join('\n      ');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Медиа', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Медиа</h1>
      <p class="cp-page-subtitle ui-lead">Статьи, видео и подкасты о работе в Группе «Интер РАО»: люди, проекты, технология и профессии энергетики.</p>
    </div>

    <div class="cp-media-toolbar">
      <span class="ui-tag ui-tag--gray">Тип контента:</span>
      <nav class="cp-media-toolbar__group" aria-label="Тип контента">
        <a class="ui-tag ui-tag--blue ui-tag--filter" href="media.html" aria-current="page">Все</a>
        <a class="ui-tag ui-tag--blue ui-tag--filter" href="media.html">статьи</a>
        <a class="ui-tag ui-tag--blue ui-tag--filter" href="media.html">видео</a>
        <a class="ui-tag ui-tag--blue ui-tag--filter" href="media.html">подкасты</a>
      </nav>
      <span class="ui-tag ui-tag--gray cp-media-toolbar__rubrics-label">Рубрики:</span>
      <nav class="cp-media-toolbar__group" aria-label="Рубрики">
      ${rubrics}
      </nav>
    </div>

    <div class="ui-grid ui-grid--4">
${cards}
    </div>
  </div>
</section>`;
}

/* ── статья: детальная (T15.1) ── */

function articleMain(a = ART.items[0]) {
  const dot =
    { статья: 'ui-tag--blue', видео: 'ui-tag--orange', подкаст: 'ui-tag--green' }[a.type] ||
    'ui-tag--blue';
  const relatedVacancies = VAC.items.slice(0, 3).map(vacancyRow).join('\n');
  const relatedPractices = INT.practice.items
    .slice(0, 3)
    .map((item) => internLinkCard(item, 'practices.html'))
    .join('\n');
  const relatedInternships = INT.internship.items
    .slice(0, 3)
    .map((item) => internLinkCard(item, 'internships.html'))
    .join('\n');
  const relatedEducations = EDU.offers.slice(0, 3).map(offerCard).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Медиа', 'media.html'],
    ['Студенты приступили к практике', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <article class="cp-article-page">
      <h1 class="ui-page-title">${esc(a.title)}</h1>
      <p class="cp-article-meta">
        <span class="cp-article-type">${esc(a.type)}</span>
        <time class="ui-small ui-text--muted" datetime="${esc(isoDate(a.date))}">${esc(a.date)}</time>
        <span class="ui-tag ${dot}">${esc(a.rubric)}</span>
      </p>
      <div class="cp-article-gallery">
        <figure class="ui-figure">
          <img class="ui-image ui-image--cover cp-article-gallery__photo" src="${esc(a.image)}" alt="${esc(a.title)}" width="1447" height="824">
        </figure>
        <figure class="ui-figure">
          <img class="ui-image ui-image--cover cp-article-gallery__photo" src="assets/images/students-photo-2.jpg" alt="Студенты на практике в компаниях Группы «Интер РАО»" width="431" height="431">
        </figure>
      </div>
      <div class="cp-article-text">
        <p class="ui-body">Сотни студентов технических специальностей приступили к производственной практике в компаниях Группы «Интер РАО». Молодые люди приобретают опыт по основным для компании направлениям: энергетика, тепловая автоматика, техническая диагностика, водоподготовка и экологическая станция, сети и подстанции, тепловые сети.</p>
        <p class="ui-body">Каждому практиканту закреплён наставник из числа опытных сотрудников: он помогает разобраться в производственных процессах, поставить первую задачу и подготовить отчёт по требованиям учебного заведения.</p>
        <p class="ui-body">Практика в Группе «Интер РАО» — это возможность увидеть, как теория из учебной программы превращается в реальные производственные результаты, и получить приглашение на работу ещё до выпуска.</p>
        <p class="ui-body">Отбор на следующие практики стартует весной: следите за объявлениями в разделе «Школьникам и студентам».</p>
      </div>
    </article>

    <!-- «материалы по теме» — секции related оригинала (build.py:849–863:
         по 3 первых записи каждой сущности); строки вакансий — те же
         cp-vac-rows, карточки — как на internships/education. Триггер
         «откликнуться» остаётся без модалки — как в оригинале, где на
         article.html диалога #vac-apply нет (modals.js:22 — молча выходит). -->
    <div class="cp-article-related">
      <h2 class="ui-h3">Связанные вакансии</h2>
      <div class="cp-vac-rows">
${relatedVacancies}
      </div>
      <h2 class="ui-h3">Связанные практики</h2>
      <div class="ui-grid ui-grid--3">
${relatedPractices}
      </div>
      <h2 class="ui-h3">Связанные стажировки</h2>
      <div class="ui-grid ui-grid--3">
${relatedInternships}
      </div>
      <h2 class="ui-h3">Связанные целевые обучения</h2>
      <div class="ui-grid ui-grid--3">
${relatedEducations}
      </div>
    </div>
  </div>
</section>`;
}

/* ── карьерные треки ── */

function careerTrackMain() {
  const tabs = TRK.tabs
    .map(
      (tab, index) =>
        `      <a class="ui-tabs__tab" href="#cptab-track-${index}" id="cptab-track-${index}-tab">${esc(tab.name)}</a>`,
    )
    .join('\n');
  const panels = TRK.tabs
    .map((tab, index) => {
      const tracks = tab.tracks
        .map(
          (track) => `      <article class="ui-card ui-card--filled">
        <h3 class="ui-h4">${esc(track.name)}</h3>
        <p class="ui-small">${esc(track.steps.map((step) => step.name).join(' → '))}</p>
      </article>`,
        )
        .join('\n');
      return `  <section class="ui-tabs__panel" id="cptab-track-${index}" aria-labelledby="cptab-track-${index}-tab">
    <div class="ui-grid ui-grid--2">
${tracks}
    </div>
  </section>`;
    })
    .join('\n');
  const articles = ART.items.slice(0, 4).map(articleCard).join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Школьникам и студентам', null],
    ['Карьерные треки', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Карьерные треки</h1>
      <p class="cp-page-subtitle ui-lead">Путь от студента до руководителя направления — со всеми ступенями, сроками и требованиями.</p>
    </div>
    <nav class="ui-chip" aria-label="Разделы школьникам и студентам">
      <a class="ui-chip__pill" href="practices.html">Практики</a>
      <a class="ui-chip__pill" href="internships.html">Стажировки</a>
      <a class="ui-chip__pill" href="education.html">Целевое обучение</a>
      <a class="ui-chip__pill" href="career-track.html" aria-current="page">Карьерный трек</a>
      <a class="ui-chip__pill" href="events.html">Мероприятия</a>
    </nav>

    <div class="ui-tabs" data-ui-tabs>
      <div class="ui-tabs__list">
${tabs}
      </div>
${panels}
    </div>

    <h2 class="ui-h2">Материалы по теме</h2>
    <div class="ui-grid ui-grid--4">
${articles}
    </div>
  </div>
</section>`;
}

/* ── компании группы ── */

function companiesMain() {
  const groups = new Map();
  for (const company of COMP.companies) {
    if (!groups.has(company.segment)) groups.set(company.segment, []);
    groups.get(company.segment).push(company.name);
  }
  const sections = [...groups.entries()]
    .map(([segment, names]) => {
      const cards = names
        .map(
          (name) =>
            `        <a class="ui-card ui-card--hover cp-company-card" href="company.html">${esc(name)}</a>`,
        )
        .join('\n');
      return `    <h2 class="ui-h3">${esc(segment)}</h2>
    <div class="ui-grid ui-grid--3">
${cards}
    </div>`;
    })
    .join('\n');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Компании группы', ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-page-head">
      <h1 class="ui-page-title">Компании группы</h1>
      <p class="cp-page-subtitle ui-lead">Работодатели Группы «Интер РАО» — от генерации до сбыта и сервисов.</p>
    </div>
${sections}
  </div>
</section>`;
}

/* ── компания группы: детальная страница (T15.2) ──
   Оригинал — одна типовая страница, фиксированная за компанией
   «АО «Интер РАО – Электрогенерация» (build.py company.html: крошки/h1).
   Имя берём из data/companies.json — первая компания сегмента «Генерация»
   (в байт-в-байт копии данных это та же компания); остальной контент —
   фрагмент оригинала src/pages/company.html без выдумывания: описание,
   3 факта, 4 преимущества, подписи «где мы работаем». Секции «Вакансии/
   Стажировки/Практики компании», лента «Может быть интересно» и второй
   баннер в композицию спеки T15.2 не входят (CTA ведёт на vacancies.html). */
function companyMain() {
  const company = COMP.companies.find((c) => c.segment === 'Генерация');
  return `${breadcrumbs([
    ['Главная', 'index.html'],
    ['Компании группы', 'companies.html'],
    [company.name, ''],
  ])}
<section class="ui-section">
  <div class="ui-container">
    <div class="cp-company-hero">
      <img class="ui-image ui-image--cover cp-company-hero__photo" src="assets/images/internship-1.png" alt="Производство компании ${esc(company.name)}" width="431" height="431" loading="lazy">
      <div class="cp-company-hero__body">
        <h1 class="ui-page-title">${esc(company.name)}</h1>
        <div class="cp-company-hero__text">
          <p class="ui-body">Генерирующая компания Группы «Интер РАО»: электростанции в Санкт-Петербурге и Ленинградской области общей мощностью более 2,5 ГВт.</p>
          <p class="ui-body">Мы производим электрическую и тепловую энергию, развиваем современные технологии генерации и создаём условия для профессионального роста инженеров и специалистов.</p>
        </div>
      </div>
    </div>

    <!-- Факты компании: числа — роль ui-h2 (Scope); цвет на тёмном несёт
         сайт-зона (override роли — пара cp-holding__title). Список —
         семантика фактов (Accessibility requirements). -->
    <ul class="cp-company-stats">
      <li class="cp-company-stats__item">
        <span class="cp-company-stats__value ui-h2">2,5 ГВт</span>
        <span class="cp-company-stats__label ui-small">установленная электрическая мощность</span>
      </li>
      <li class="cp-company-stats__item">
        <span class="cp-company-stats__value ui-h2">500+</span>
        <span class="cp-company-stats__label ui-small">специалистов работают в компании</span>
      </li>
      <li class="cp-company-stats__item">
        <span class="cp-company-stats__value ui-h2">Топ-10</span>
        <span class="cp-company-stats__label ui-small">региональных генерирующих компаний</span>
      </li>
    </ul>

    <h2 class="ui-h3 cp-company-title">Преимущества компании</h2>
    <ul class="cp-company-adv">
      <li class="cp-company-adv__item">
        <h3 class="ui-h4 cp-company-adv__title">Современное производство</h3>
        <p class="ui-small">Новое оборудование и автоматизированные системы управления станциями.</p>
      </li>
      <li class="cp-company-adv__item">
        <h3 class="ui-h4 cp-company-adv__title">Наставничество</h3>
        <p class="ui-small">Программа наставничества для новых сотрудников и молодых специалистов.</p>
      </li>
      <li class="cp-company-adv__item">
        <h3 class="ui-h4 cp-company-adv__title">Обучение и развитие</h3>
        <p class="ui-small">Корпоративный университет, тренинги и компенсация обучения.</p>
      </li>
      <li class="cp-company-adv__item">
        <h3 class="ui-h4 cp-company-adv__title">Стабильность</h3>
        <p class="ui-small">Белая заработная плата, ДМС, соцпакет и гарантии по ТК РФ.</p>
      </li>
    </ul>

    <!-- «Где мы работаем»: приближение подписями (Out of scope T15.2 —
         карта-иллюстрация); пара фото+подпись — ui-figure (подпись
         связана семантически), alt дублирует подпись (подпись не заменяет
         alt — README ui-figure). -->
    <h2 class="ui-h3 cp-company-title">Где мы работаем</h2>
    <div class="cp-company-where">
      <figure class="ui-figure cp-company-where__item">
        <img class="ui-image ui-image--cover cp-company-where__photo" src="assets/images/media-main.jpg" alt="Головной офис компании" width="1447" height="824" loading="lazy">
        <figcaption class="ui-figure__caption ui-small ui-text--muted">Головной офис компании</figcaption>
      </figure>
      <figure class="ui-figure cp-company-where__item">
        <img class="ui-image ui-image--cover cp-company-where__photo" src="assets/images/media-4.jpg" alt="Производственные площадки и станции" width="313" height="208" loading="lazy">
        <figcaption class="ui-figure__caption ui-small ui-text--muted">Производственные площадки и станции</figcaption>
      </figure>
    </div>

    <!-- CTA-баннер (banner-card оригинала): фото — подложка под текстом
         (alt="", README ui-image: подписывать декоративное нечего); кнопка —
         ui-button на vacancies.html (Scope T15.2). -->
    <div class="cp-company-banner">
      <img class="ui-image ui-image--cover cp-company-banner__photo" src="assets/images/internship-3.png" alt="" width="692" height="326" loading="lazy">
      <div class="cp-company-banner__body">
        <h2 class="ui-h2 cp-company-banner__title">Вакансии компании</h2>
        <p class="ui-small cp-company-banner__text">Посмотрите открытые вакансии именно в нашей компании.</p>
        <a class="ui-button ui-button--primary" href="vacancies.html">смотреть вакансии</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ── 404 ── */

function notFoundMain() {
  return `<section class="ui-section">
  <div class="ui-container">
    <div class="ui-error ui-error--page">
      <svg class="ui-error__media" aria-hidden="true" focusable="false" width="48" height="48" viewBox="0 0 24 24">
        <path d="M12 21.5S5.5 15.9 5.5 10.75a6.5 6.5 0 0 1 13 0C18.5 15.9 12 21.5 12 21.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
        <circle cx="12" cy="10.5" r="2.25" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
      </svg>
      <h1 class="ui-error__title ui-h3">Страница не найдена</h1>
      <p class="ui-error__text ui-body ui-text--muted">Такой страницы нет или она была перемещена. Начните с главной — там всё на месте.</p>
      <div class="ui-error__actions">
        <a class="ui-button ui-button--primary" href="index.html">На главную</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ── генерация ── */

const PAGES = [
  {
    file: 'index.html',
    title: 'Портал карьеры Интер РАО — клон на irao-ui',
    main: indexMain(),
    staticHeader: false,
  },
  { file: 'vacancies.html', title: 'Вакансии — Портал карьеры Интер РАО', main: vacanciesMain() },
  {
    file: 'vacancy.html',
    title: 'Ведущий инженер по эксплуатации энергоблоков — Портал карьеры Интер РАО',
    main: vacancyMain(),
  },
  {
    file: 'vacancy-apply.html',
    title: 'Отклик на вакансию — Портал карьеры Интер РАО',
    main: vacancyApplyMain(),
  },
  {
    file: 'internships.html',
    title: 'Стажировки — Портал карьеры Интер РАО',
    main: internshipsMain('internship'),
  },
  {
    file: 'practices.html',
    title: 'Практики — Портал карьеры Интер РАО',
    main: internshipsMain('practice'),
  },
  {
    file: 'internship.html',
    title: 'Стажировка: разработчик — Портал карьеры Интер РАО',
    main: internshipMain(),
  },
  {
    file: 'internship-apply.html',
    title: 'Заявка на стажировку — Портал карьеры Интер РАО',
    main: internshipApplyMain(),
  },
  {
    file: 'education.html',
    title: 'Целевое обучение — Портал карьеры Интер РАО',
    main: educationMain(),
  },
  {
    file: 'education-catalog.html',
    title: 'Каталог предложений целевого обучения — Портал карьеры Интер РАО',
    main: educationCatalogMain(),
  },
  { file: 'events.html', title: 'Мероприятия — Портал карьеры Интер РАО', main: eventsMain() },
  {
    file: 'events-search.html',
    title: 'Поиск мероприятий — Портал карьеры Интер РАО',
    main: eventsSearchMain(),
  },
  {
    file: 'event.html',
    title: 'День открытых дверей — Портал карьеры Интер РАО',
    main: eventMain(),
  },
  {
    file: 'event-apply.html',
    title: 'Заявка на мероприятие — Портал карьеры Интер РАО',
    main: eventApplyMain(),
  },
  { file: 'media.html', title: 'Медиа — Портал карьеры Интер РАО', main: mediaMain() },
  {
    file: 'article.html',
    title: 'Студенты приступили к практике — Портал карьеры Интер РАО',
    main: articleMain(),
  },
  {
    file: 'career-track.html',
    title: 'Карьерные треки — Портал карьеры Интер РАО',
    main: careerTrackMain(),
  },
  {
    file: 'company.html',
    title: 'АО «Интер РАО – Электрогенерация» — Портал карьеры Интер РАО',
    main: companyMain(),
  },
  {
    file: 'companies.html',
    title: 'Компании группы — Портал карьеры Интер РАО',
    main: companiesMain(),
  },
  {
    file: '404.html',
    title: 'Страница не найдена — Портал карьеры Интер РАО',
    main: notFoundMain(),
  },
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'ds'), { recursive: true });

// рантайм ДС
for (const file of ['ui-core.min.css', 'ui-vi.min.css', 'ui.min.js']) {
  cpSync(join(DIST, file), join(OUT, 'ds', file));
}
cpSync(join(DIST, 'fonts'), join(OUT, 'ds', 'fonts'), { recursive: true });

// ассеты оригинала (23 МБ — в git не попадают: pilot/career-portal/dist/ игнорируется)
cpSync(join(REF, 'assets'), join(OUT, 'assets'), { recursive: true });

// стили/скрипты сайт-зоны
cpSync(join(PILOT, 'pilot.css'), join(OUT, 'pilot.css'));
cpSync(join(PILOT, 'pilot.js'), join(OUT, 'pilot.js'));

for (const { file, title, main, staticHeader = true } of PAGES) {
  writeFileSync(join(OUT, file), page({ title, main, staticHeader }));
  console.log(`built ${file}`);
}
console.log(`\nПилот собран: ${OUT}`);
console.log('Сравнение с оригиналом: node pilot/career-portal/compare.mjs');
