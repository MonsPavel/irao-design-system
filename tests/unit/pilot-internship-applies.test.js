/**
 * Юнит-пин пилотных страниц стажировки и анкет (T15.4; Testing requirements —
 * «поверхностная проверка compare.mjs», пины до браузерной пробы — практика
 * pilot-company.test.js T15.2 / pilot-education-catalog.test.js T15.3).
 *
 * Поверхность браузера (docHeight/probes/скриншоты/console) даёт compare.mjs
 * на живой паре страниц; здесь — пины исполняемой формы решения:
 *  - build.mjs: страницы internship.html / internship-apply.html /
 *    event-apply.html в PAGES с заголовками оригинала (build.py:772/779/833);
 *    детальная стажировки — общий шаблон internshipDetail из T15.1 (функция
 *    расширяется опциональными salary/company, meta становится опциональной —
 *    у internship__head оригинала даты нет), данные internships.json
 *    internship.items[1] «Стажировка: разработчик» — та же запись, что в
 *    фрагменте оригинала (компания/город/фото internship-2.png совпадают);
 *    CTA → internship-apply.html; карточки internships/practices — ссылки
 *    на internship.html (AC: «карточки → internship.html»; в оригинале
 *    карточка-кнопка открывает модалку направления и детальная из него не
 *    достижима), модалка направления снята вместе со своим JS;
 *  - анкеты — по паттерну vacancy-apply: страница-форма несёт базовые поля
 *    (без --compact — EPIC-15 README: решение T15.6), состав полей оригинала
 *    internship-apply.html (ФИО, пол, дата рождения, телефон, email,
 *    гражданство, вуз, специальность, курс-select, статус образования +
 *    скрытый блок опыта, textarea, согласие); курс — selectField (ui-field
 *    select-вариант формы вакансии — переиспользован, не заведена вторая
 *    форма select; Technical considerations), required-маркировка каноном
 *    ui-field (звёздочка + sr-only пояснение — и на select тоже);
 *    success-ветка — копия паттерна vacancy-apply (мок), aside — мета
 *    заявки; event-apply — короткая форма: email + ошибка каноном
 *    ui-field__error (role="alert", как фрагмент оригинала event-apply.html:15)
 *    + success + aside (Accessibility requirements);
 *  - pilot.js: мок-формы валидируют только видимые обязательные поля
 *    (forms.js оригинала: «скрытые условные ветки не валидируем» — иначе
 *    checkValidity() считает скрытый блок опыта internship-apply и мок
 *    никогда не показывает success); состояние ошибки поля — канон ui-field
 *    (--error на корне + aria-invalid); модалка направления удалена;
 *  - compare.mjs: три страницы в PAGES (AC: compare.json содержит метрики
 *    трёх страниц).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8');
const pilotJs = readFileSync(join(pilotDir, 'pilot.js'), 'utf8');
const internships = JSON.parse(readFileSync(join(pilotDir, 'data', 'internships.json'), 'utf8'));
const events = JSON.parse(readFileSync(join(pilotDir, 'data', 'events.json'), 'utf8'));

/** Тело функции целиком (до следующей секции-комментария `/* ── `): вызовы
 *  helper'ов живут до return-шаблона (практика pilot-education-catalog). */
const sectionBody = (source, name) =>
  source.match(new RegExp(`function ${name}[\\s\\S]*?(?=\\n/\\* ──)`))?.[0] ?? '';

const internshipMainBody = sectionBody(build, 'internshipMain');
const internshipApplyMainBody = sectionBody(build, 'internshipApplyMain');
const eventApplyMainBody = sectionBody(build, 'eventApplyMain');
const internCardBody = sectionBody(build, 'internCard');

/** Общий шаблон детальной из T15.1 (до секции мероприятия). */
const internshipDetailBody =
  build.match(/function internshipDetail[\s\S]*?(?=\n\/\* ──)/)?.[0] ?? '';

describe('data — запись «Стажировка: разработчик» (детальная привязана к ней)', () => {
  it('internships.json internship.items[1] — та же запись, что фрагмент оригинала (company/город/фото internship-2.png), данные байт-в-байт оригинала', () => {
    const item = internships.internship.items[1];
    expect(item.title).toBe('Стажировка: разработчик');
    expect(item.company).toBe('ООО «Интер РАО – ИТ»');
    expect(item.city).toBe('Москва');
    expect(item.schedule).toBe('Гибридный график');
    expect(item.study).toBe('Информационные технологии');
    expect(item.paid).toBe(true);
    expect(item.image).toBe('assets/images/internship-2.png');
  });

  it('events.json upcoming[0] — то же мероприятие, что фрагмент event-apply ( aside заявки берёт Дата/Город/Формат из data)', () => {
    const event = events.upcoming[0];
    expect(event.title).toBe('День открытых дверей в «Интер РАО – Электрогенерация»');
    expect(event.date).toBe('28.09.2026');
    expect(event.city).toBe('Санкт-Петербург');
    expect(event.format).toBe('Очно');
  });
});

describe('build.mjs — три страницы в PAGES (T15.4 Scope; заголовки build.py:772/779/833)', () => {
  it('internship.html / internship-apply.html / event-apply.html в PAGES', () => {
    expect(build).toMatch(/\{\s*file: 'internship.html',/);
    expect(build).toMatch(/\{\s*file: 'internship-apply.html',/);
    expect(build).toMatch(/\{\s*file: 'event-apply.html',/);
    expect(build).toContain(`title: 'Стажировка: разработчик — Портал карьеры Интер РАО'`);
    expect(build).toContain(`title: 'Заявка на стажировку — Портал карьеры Интер РАО'`);
    expect(build).toContain(`title: 'Заявка на мероприятие — Портал карьеры Интер РАО'`);
  });

  it('порядок страниц — по оригиналу build.py: internship+apply между practices и education; event-apply между event и media', () => {
    const pages = compare.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
    void pages; // порядок проверяется в блоке compare.mjs ниже; здесь — build
    const buildPages = build.match(/const PAGES = \[([\s\S]*?)\n\];/)?.[1] ?? '';
    const order = [...buildPages.matchAll(/file: '([a-z-]+\.html)'/g)].map((m) => m[1]);
    expect(order.indexOf('internship.html')).toBeGreaterThan(order.indexOf('practices.html'));
    expect(order.indexOf('internship-apply.html')).toBeGreaterThan(
      order.indexOf('internship.html'),
    );
    expect(order.indexOf('internship-apply.html')).toBeLessThan(order.indexOf('education.html'));
    expect(order.indexOf('event-apply.html')).toBeGreaterThan(order.indexOf('event.html'));
    expect(order.indexOf('event-apply.html')).toBeLessThan(order.indexOf('media.html'));
  });
});

describe('build.mjs — internship.html: общий шаблон детальной T15.1 (Scope)', () => {
  it('страница собирается функцией internshipMain через internshipDetail — функция переиспользуется, не дублируется (комментарий шаблона T15.1)', () => {
    expect(internshipMainBody).toContain('internshipDetail({');
    expect(internshipDetailBody).toContain('function internshipDetail');
  });

  it('шаблон расширен опциональными salary/company, meta опционален (у internship__head оригинала даты нет); событийный вывод не меняется — time рендерится только при meta', () => {
    expect(internshipDetailBody).toMatch(/meta\s*\?/);
    expect(internshipDetailBody).toMatch(/salary\s*\?/);
    expect(internshipDetailBody).toMatch(/company\s*\?/);
  });

  it('данные — из internships.json items[1] (Implementation requirements п.1), не литералы', () => {
    expect(internshipMainBody).toContain('INT.internship.items[1]');
  });

  it('крошки: Главная → «Стажировки» (internships.html) → текущая (aria-current даёт helper — ровно один на цепочку, Implementation requirements п.2)', () => {
    expect(internshipMainBody).toContain(`['Главная', 'index.html']`);
    expect(internshipMainBody).toContain(`['Стажировки', 'internships.html']`);
    expect(internshipMainBody).toMatch(/\['Стажировка: разработчик', ''\]/);
  });

  it('шапка-тройка оригинала: теги (оплачиваемая/график/направление), зарплатная вилка, компания ссылкой на company.html (internship.html:7–13)', () => {
    expect(internshipMainBody).toContain("text: 'Оплачиваемая'");
    expect(internshipMainBody).toContain("variant: 'orange'");
    expect(internshipMainBody).toContain("salary: 'от 60 000 ₽'");
    expect(internshipMainBody).toMatch(
      /company: \{\s*text: i\.company,\s*href: 'company\.html',?\s*\}/,
    );
  });

  it('секции оригинала: «Примеры задач» (список) и «Детальное описание» (два абзаца фрагмента, internship.html:18–32)', () => {
    expect(internshipMainBody).toContain('Примеры задач');
    expect(internshipMainBody).toContain('Разработка внутренних сервисов Группы «Интер РАО»');
    expect(internshipMainBody).toContain('Интеграция систем по REST API');
    expect(internshipMainBody).toContain('Написание модульных тестов и участие в код-ревью');
    expect(internshipMainBody).toContain('Работа с базами данных и оптимизация запросов.');
    expect(internshipMainBody).toContain('Детальное описание');
    expect(internshipMainBody).toContain(
      'Стажировка в команде разработки ИТ-систем Группы «Интер РАО».',
    );
    expect(internshipMainBody).toContain('График гибридный: 2 дня в офисе, остальное — удалённо.');
  });

  it('фото — из data (internship-2.png), alt по контенту (практика T15.1)', () => {
    expect(internshipMainBody).toMatch(/src: i\.image/);
    expect(internshipMainBody).toMatch(/alt: i\.title/);
  });

  it('aside «О стажировке»: мета из data, CTA → internship-apply.html, примечание о повторной подаче (internship.html:35–61)', () => {
    expect(internshipMainBody).toContain("title: 'О стажировке'");
    for (const row of ['Компания', 'Город', 'Регион', 'Направление подготовки', 'Формат']) {
      expect(internshipMainBody, `строка aside «${row}»`).toContain(`'${row}'`);
    }
    expect(internshipMainBody).toMatch(/href: 'internship-apply\.html'/);
    expect(internshipMainBody).toContain('Повторная подача заявки на эту стажировку невозможна.');
  });
});

describe('build.mjs — карточки internships/practices → internship.html (AC)', () => {
  it('карточка направления — ссылка на internship.html (переиспользует internLinkCard), не кнопка с модалкой', () => {
    expect(internCardBody).toContain("internLinkCard(i, 'internship.html')");
    expect(internCardBody, 'карточка больше не кнопка с data-cp-intern').not.toContain(
      'data-cp-intern',
    );
  });

  it('модалка направления снята с internships/practices (её содержимое перенесено на детальную); данные-обработчик в pilot.js удалён', () => {
    expect(build).not.toContain('cp-intern-dialog');
    expect(pilotJs).not.toContain('cp-intern-dialog');
    expect(pilotJs).not.toContain('data-cp-intern');
  });
});

describe('build.mjs — internship-apply.html: анкета по паттерну vacancy-apply (Scope)', () => {
  it('крошки: Главная → «Стажировки» (internships.html) → «Заявка» (текущая; build.py:781)', () => {
    expect(internshipApplyMainBody).toContain(`['Главная', 'index.html']`);
    expect(internshipApplyMainBody).toContain(`['Стажировки', 'internships.html']`);
    expect(internshipApplyMainBody).toMatch(/\['Заявка', ''\]/);
  });

  it('h1 — ui-page-title «Заявка на стажировку» (Out of scope: form-card__title fs-h3 не переносится — клон несёт канон 60px)', () => {
    expect(internshipApplyMainBody).toMatch(/<h1 class="ui-page-title">Заявка на стажировку<\/h1>/);
  });

  it("состав полей — по оригиналу internship-apply.html (Implementation requirements п.1: имена оригинала); поля helper'ов несут name в параметрах, инлайн-радио/согласие — в разметке", () => {
    for (const name of [
      'lastname',
      'firstname',
      'middlename',
      'gender',
      'birth',
      'phone',
      'email',
      'citizenship',
      'university',
      'speciality',
      'course',
      'lastjob',
      'lastpos',
      'period',
    ]) {
      expect(internshipApplyMainBody, `поле name='${name}' из оригинала`).toContain(
        `name: '${name}'`,
      );
    }
    // textarea — инлайн (прецедент applyForm: отдельного textarea-helper нет)
    expect(internshipApplyMainBody).toContain('name="extra"');
    for (const name of ['edustatus', 'hasexp', 'consent']) {
      expect(internshipApplyMainBody, `инлайн-поле name='${name}' из оригинала`).toContain(
        `name="${name}"`,
      );
    }
  });

  it('курс — selectField (ui-field select-вариант формы вакансии; Technical considerations: не заводить вторую форму select), опции оригинала', () => {
    expect(internshipApplyMainBody).toContain('selectField({');
    expect(internshipApplyMainBody).toContain("label: 'Курс обучения'");
    for (const option of ['Выберите', '1 курс', '2 курс', '3 курс', '4 курс', 'Магистратура']) {
      expect(
        internshipApplyMainBody,
        `опция «${option}» оригинала (internship-apply.html:59–61)`,
      ).toContain(`'${option}'`);
    }
    expect(
      internshipApplyMainBody,
      'нативный select в анкете не рукописный — только через helper',
    ).not.toContain('ui-field__select');
  });

  it('страница-форма несёт базовые поля 52px — compact из анкет-модалок не применяется (EPIC-15 README: решение T15.6)', () => {
    expect(internshipApplyMainBody).not.toContain('compact');
    expect(eventApplyMainBody).not.toContain('compact');
  });

  it('required-маркировка каноном ui-field — звёздочка + sr-only пояснение, в том числе на select (helper selectField доработан, vacancy-apply получает то же)', () => {
    expect(internshipApplyMainBody).toMatch(/required: true/);
    const selectFieldBody = build.slice(
      build.indexOf('function selectField'),
      build.indexOf('function radioGroup'),
    );
    expect(selectFieldBody, 'пилюля и поле делят один канон маркера').toContain('ui-field__req');
    expect(selectFieldBody).toContain('ui-field__req-text');
  });

  it('условный блок опыта скрыт по умолчанию — как в оригинале (internship-apply.html:71; forms.js оригинала не переключает его)', () => {
    expect(internshipApplyMainBody).toContain('data-experience-fields hidden');
  });

  it('success-ветка — копия паттерна vacancy-apply: заголовок с tabindex="-1" (цель фокуса), текст оригинала, возврат к списку стажировок', () => {
    expect(internshipApplyMainBody).toMatch(/data-cp-form-success hidden/);
    expect(internshipApplyMainBody).toMatch(
      /ui-form__success-title" tabindex="-1">Заявка отправлена</,
    );
    expect(internshipApplyMainBody).toContain(
      'Компания рассмотрит заявку и свяжется с вами по телефону или email в течение 10 рабочих дней.',
    );
    expect(internshipApplyMainBody).toContain(
      'Повторная подача заявки на эту стажировку невозможна.',
    );
    expect(internshipApplyMainBody).toMatch(/href="internships\.html">К списку стажировок</);
  });

  it('aside — мета заявки: заголовок и текст из data, строки «Направление подготовки»/«Длительность», возврат к стажировке (internship-apply.html:115–127)', () => {
    expect(internshipApplyMainBody).toMatch(/aria-labelledby/);
    expect(internshipApplyMainBody).toContain('ui-form__aside');
    expect(internshipApplyMainBody).toContain('Направление подготовки');
    expect(internshipApplyMainBody).toContain('Длительность');
    expect(internshipApplyMainBody).toMatch(/href="internship\.html">вернуться к стажировке</);
  });
});

describe('build.mjs — event-apply.html: короткая форма (Scope; CTA event.html из T15.1)', () => {
  it('крошки: Главная → «Мероприятия» (events.html) → «Заявка» (текущая; build.py:834)', () => {
    expect(eventApplyMainBody).toContain(`['Главная', 'index.html']`);
    expect(eventApplyMainBody).toContain(`['Мероприятия', 'events.html']`);
    expect(eventApplyMainBody).toMatch(/\['Заявка', ''\]/);
  });

  it('h1 — ui-page-title «Заявка на мероприятие»; мета-строка из data (title/date/city events.json upcoming[0])', () => {
    expect(eventApplyMainBody).toMatch(/<h1 class="ui-page-title">Заявка на мероприятие<\/h1>/);
    expect(eventApplyMainBody).toContain('Мероприятие: <strong>');
    expect(eventApplyMainBody).toMatch(/EVT\.upcoming\[0\]/);
  });

  it('email + ошибка каноном ui-field__error (role="alert", текст фрагмента) — слот в разметке, вне --error скрыт CSS ДС (event-apply.html:12–16)', () => {
    expect(eventApplyMainBody).toMatch(/type: 'email'|type="email"/);
    expect(eventApplyMainBody).toContain('ui-field__error');
    expect(eventApplyMainBody).toMatch(/role="alert"[^>]*>Укажите корректный email</);
  });

  it('согласие и submit «подать заявку»; success с текстом оригинала и возвратом к списку мероприятий', () => {
    expect(eventApplyMainBody).toContain('name="consent"');
    expect(eventApplyMainBody).toMatch(/>подать заявку</);
    expect(eventApplyMainBody).toMatch(/data-cp-form-success hidden/);
    expect(eventApplyMainBody).toContain(
      'Мы отправим подтверждение и детали посещения на указанный email.',
    );
    expect(eventApplyMainBody).toMatch(/href="events\.html">К списку мероприятий</);
  });

  it('aside — мета заявки из data (Дата/Город/Формат), возврат к мероприятию (event-apply.html:33–48)', () => {
    expect(eventApplyMainBody).toContain('>Дата</dt>');
    expect(eventApplyMainBody).toContain('>Город</dt>');
    expect(eventApplyMainBody).toContain('>Формат</dt>');
    expect(eventApplyMainBody).toMatch(/href="event\.html">вернуться к мероприятию</);
  });
});

describe('pilot.js — мок-формы видят только видимые поля (T15.4; forms.js оригинала)', () => {
  it('валидация пропускает скрытые условные ветки (closest("[hidden]")) — иначе checkValidity() считал бы скрытый блок опыта internship-apply и success не наступил бы никогда', () => {
    expect(pilotJs).toMatch(/closest\('\[hidden\]'\)/);
  });

  it('select: выбор проверяется индексом (у опций selectField клана value="" — плейсхолдер всегда первая опция); проверка «непустого value» считала бы выбранный курс пустым', () => {
    expect(pilotJs).toMatch(/selectedIndex > 0/);
  });

  it('состояние ошибки — канон ui-field: --error на корне поля + aria-invalid на контроле; первое невалидное видимое поле получает фокус', () => {
    expect(pilotJs).toContain('ui-field--error');
    expect(pilotJs).toContain('aria-invalid');
    expect(pilotJs).toMatch(/firstError/);
  });

  it('сабмит всегда мок (preventDefault) — отправки на сервер нет, как в forms.js оригинала', () => {
    const handler = pilotJs.match(/data-cp-form[\s\S]*?\}\);/)?.[0] ?? '';
    expect(handler).toContain('preventDefault()');
  });
});

describe('compare.mjs — страницы в PAGES (AC: compare.json содержит метрики трёх страниц)', () => {
  it('internship/apply/event-apply включены в compare-прогон (порядок оригинала build.py)', () => {
    const pages = compare.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
    const order = [...pages.matchAll(/'([a-z-]+\.html)'/g)].map((m) => m[1]);
    for (const page of ['internship.html', 'internship-apply.html', 'event-apply.html']) {
      expect(order, `${page} в PAGES`).toContain(page);
    }
    expect(order.indexOf('internship.html')).toBeGreaterThan(order.indexOf('practices.html'));
    expect(order.indexOf('internship-apply.html')).toBeLessThan(order.indexOf('education.html'));
    expect(order.indexOf('event-apply.html')).toBeGreaterThan(order.indexOf('event.html'));
    expect(order.indexOf('event-apply.html')).toBeLessThan(order.indexOf('media.html'));
  });
});
