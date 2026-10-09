/**
 * Юнит-пины T8.3 — паттерн «Страница формы» (patterns/form-page/):
 * контракт копируемой разметки, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T8.3, Scope + Implementation requirements):
 *  - patterns/form-page/form-page.html — эталонная сборка страницы-формы
 *    (vacancy-apply career-portal) БЕЗ нового CSS системы: крошки (T4.7) +
 *    h1 «Отклик» + lead; форма ui-form (T5.4) с aside-сводкой вакансии
 *    (ui-form__aside: title/text/rows — перенос form-aside) и возвратом к
 *    вакансии; полный форма-цикл (стенд T5.6 встраивается сюда): живая
 *    форма (без JS — нативная валидация, с JS — IraoUI.form), ветка
 *    «серверный ответ» (pre-rendered ошибки по контракту T5.6 + inline-
 *    сниппет фокуса) и ветка success;
 *  - решение «aside на мобиле» (Implementation requirements п.1, Accessibility
 *    requirements): сводка вакансии — ДО формы в порядке чтения на ВСЕХ
 *    вьюпортах (DOM: aside раньше main); от lg site-glue ставит aside в
 *    правую колонку grid'а (grid-column), порядок чтения не меняется;
 *  - связующие стили паттерна (fpp-*) живут <style>'ом стенда, НЕ в dist;
 *    значения — только токены --ui-*, media — только min-width шкалы T2.5.
 * Поверхность браузера (форма-цикл с JS/без, server-состояния, фокус, axe,
 * адаптив, эталоны) — tests/e2e/pattern-form-page.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'form-page', 'form-page.html');
const readmePath = join(root, 'patterns', 'form-page', 'README.md');

/** Разметка без связующих <style> (для пинов порядка DOM). */
const markupOf = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '');

describe('patterns/form-page/form-page.html — контракт эталонной сборки (Scope T8.3)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('page-head: крошки → h1 «Отклик» → lead (Scope: крошки + h1 + lead)', () => {
    const h1 = pattern.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? [];
    expect(h1, 'ровно один h1 — страница формы (гейт irao/one-h1)').toHaveLength(1);
    expect(h1[0], 'h1 — «Отклик» (Context: h1 «Отклик» career-portal)').toContain('Отклик');
    const markup = markupOf(pattern);
    expect(markup.indexOf('ui-breadcrumbs'), 'крошки в DOM раньше h1 (T4.7)').toBeGreaterThan(-1);
    expect(markup.indexOf('ui-breadcrumbs')).toBeLessThan(markup.indexOf('<h1'));
    expect(pattern, 'lead-подзаголовок page-head — роль ui-lead (T3.3)').toMatch(
      /<p class="[^"]*ui-lead/,
    );
  });

  it('форма — ui-form (T5.4) с data-ui-form; в разметке НЕТ novalidate (ветка без JS)', () => {
    const form = pattern.match(/<form\b[^>]*id="fpp-form"[^>]*>/) ?? [''];
    expect(form[0], 'живая форма на месте').not.toBe('');
    expect(form[0], 'форма — блок ui-form').toContain('ui-form');
    expect(form[0], 'хук модуля IraoUI.form (T5.5)').toContain('data-ui-form');
    expect(form[0], 'без JS браузерная валидация работает (ТЗ №14)').not.toContain('novalidate');
    expect(form[0], 'method="post" — форма отклика уходит на сервер').toContain('method="post"');
  });

  it('сводная ошибка — первый ребёнок .ui-form: role="alert", tabindex="-1", скрыта до момента', () => {
    const summary = pattern.match(/<div class="ui-form__summary"[^>]*id="fpp-summary"[^>]*>/) ?? [
      '',
    ];
    expect(summary[0], 'summary на месте').not.toBe('');
    expect(summary[0], 'немедленное объявление (T5.4)').toContain('role="alert"');
    expect(summary[0], 'цель фокуса при показе (T5.4)').toContain('tabindex="-1"');
    expect(summary[0], 'до момента скрыта атрибутом hidden').toContain('hidden');
    expect(pattern, 'summary — ПЕРВЫЙ ребёнок .ui-form (читается до полей, Do ui-form)').toMatch(
      /<form\b[^>]*id="fpp-form"[^>]*>\s*<div class="ui-form__summary"/,
    );
  });

  it('раскладка: .ui-form__layout содержит <aside class="ui-form__aside"> (перенос form-aside)', () => {
    expect(pattern, 'лейаут T5.4 — ui-form__layout').toContain('ui-form__layout');
    expect(pattern, 'основная колонка — ui-form__main').toContain('ui-form__main');
    const aside = pattern.match(/<aside\b[^>]*class="[^"]*ui-form__aside[^"]*"[^>]*>/) ?? [''];
    expect(aside[0], 'aside — семантический <aside> с aria-labelledby').not.toBe('');
    expect(aside[0]).toContain('aria-labelledby');
  });

  it('aside-сводка вакансии: title/text/rows (форма-aside career-portal) + возврат к вакансии', () => {
    for (const el of [
      'ui-form__aside-title',
      'ui-form__aside-text',
      'ui-form__aside-list',
      'ui-form__aside-row',
      'ui-form__aside-label',
      'ui-form__aside-value',
    ]) {
      expect(pattern, `элемент aside-сводки «${el}» на месте (T5.4)`).toContain(el);
    }
    const back = pattern.match(/<a\b[^>]*id="fpp-aside-back"[^>]*>[\s\S]*?<\/a>/) ?? [''];
    expect(back[0], 'возврат к вакансии — ссылка (работает без JS)').not.toBe('');
    expect(back[0], 'возврат выглядит действием — ui-button (link-button)').toContain('ui-button');
  });

  it('решение «aside на мобиле» (Implementation requirements п.1): сводка ДО формы в порядке чтения', () => {
    const markup = markupOf(pattern);
    const asideIdx = markup.indexOf('ui-form__aside');
    const mainIdx = markup.indexOf('ui-form__main');
    expect(
      asideIdx,
      'aside-сводка в DOM РАНЬШЕ формы (Accessibility requirements)',
    ).toBeGreaterThan(-1);
    expect(
      mainIdx,
      'основная колонка (поля) после сводки — UX-логика: вакансия до анкеты',
    ).toBeGreaterThan(-1);
    expect(asideIdx, 'DOM-порядок = порядок чтения на всех вьюпортах').toBeLessThan(mainIdx);
  });

  it("от lg site-glue ставит aside в правую колонку grid'а (grid-column), не двигая DOM", () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'плейсмент колонок — в связках паттерна (lg, 1024)').toMatch(
      /@media \(min-width: 1024px\)/,
    );
    expect(style[1], 'main — колонка 1 (форма слева, одобренная раскладка)').toMatch(
      /\.ui-form__main\s*\{[^}]*grid-column:\s*1/,
    );
    expect(style[1], 'aside — колонка 2 (сводка справа, как form-page career-portal)').toMatch(
      /\.ui-form__aside\s*\{[^}]*grid-column:\s*2/,
    );
  });

  it('поля формы: required, e-mail, файл с лимитом, согласие на обработку ПД (Context)', () => {
    expect(pattern, 'обязательные поля — required + ui-field--required').toContain(
      'ui-field--required',
    );
    expect(pattern, 'e-mail — type="email"').toContain('type="email"');
    expect(pattern, 'резюме — файловый инпут с лимитом data-ui-max-size (T5.3)').toContain(
      'data-ui-max-size',
    );
    expect(pattern, 'дисклеймер ПД — чекбокс согласия (Context T8.3)').toContain('ui-checkbox');
    expect(pattern, 'согласие обязательное').toMatch(/ui-checkbox__input"[\s\S]{0,400}?required/);
    expect(pattern, 'легенда обязательных полей — footnote T5.4').toContain('ui-form__footnote');
  });

  it('полный форма-цикл (стенд T5.6 встраивается): ветка «серверный ответ» по контракту T5.6', () => {
    expect(pattern, 'секция ветки «серверный ответ» — якорь-состояние').toContain(
      'id="fpp-server"',
    );
    const serverSummary = pattern.match(
      /<div class="ui-form__summary"[^>]*id="fpp-server-summary"[^>]*>/,
    ) ?? [''];
    expect(serverSummary[0], 'серверная сводная рендерится ВИДИМОЙ (без hidden)').not.toContain(
      'hidden',
    );
    expect(serverSummary[0], 'role="alert" + tabindex="-1" (контракт T5.6)').toContain(
      'role="alert"',
    );
    expect(pattern, 'ссылки серверной summary ведут на id полей').toMatch(
      /href="#fpp-srv-[a-z-]+"[^>]*>/,
    );
    expect(pattern, 'поле с ошибкой — ui-field--error (тот же интерфейс, что клиент)').toContain(
      'ui-field--error',
    );
    expect(pattern, 'aria-invalid="true" (контракт T5.6)').toContain('aria-invalid="true"');
    expect(pattern, 'id ошибки — суффикс -error (единый с модулем T5.5)').toMatch(
      /id="fpp-srv-[a-z-]+-error"/,
    );
    expect(pattern, 'текст ошибки поля — role="alert"').toMatch(
      /class="ui-field__error"[^>]*role="alert"/,
    );
    // Inline-сниппет фокуса — точная копия irao_ui_form_focus_script() (T5.6):
    // работает без модулей, guard по hidden — чистая загрузка фокус не крадёт.
    expect(pattern, 'inline-сниппет фокуса на серверную summary').toContain(
      "getElementById('fpp-server-summary')",
    );
    expect(pattern, 'сниппет гвардит по hidden').toContain('!el.hidden');
  });

  it('ветка success: видимая ui-form__success, заголовок — цель фокуса, CTA-лента', () => {
    expect(pattern, 'секция ветки success — якорь-состояние').toContain('id="fpp-success"');
    const successTitle = pattern.match(/<(h[23456])[^>]*ui-form__success-title[^>]*>/) ?? [''];
    expect(successTitle[0], 'заголовок успеха на месте').not.toBe('');
    expect(successTitle[0], 'tabindex="-1" — фокус после показа (T5.4, без JS)').toContain(
      'tabindex="-1"',
    );
    expect(pattern, 'CTA-лента успеха — ui-form__success-actions').toContain(
      'ui-form__success-actions',
    );
  });

  it('порядок чтения: крошки → h1 → живая форма → «серверный ответ» → success', () => {
    const markup = markupOf(pattern);
    const order = [
      'ui-breadcrumbs',
      'id="fpp-title"',
      'id="fpp-form"',
      'id="fpp-server"',
      'id="fpp-success"',
    ];
    const indexes = order.map((marker) => markup.indexOf(marker));
    for (let i = 0; i < order.length; i += 1) {
      expect(indexes[i], `якорь «${order[i]}» на месте`).toBeGreaterThan(-1);
    }
    for (let i = 1; i < indexes.length; i += 1) {
      expect(
        indexes[i],
        `«${order[i]}» в DOM позже «${order[i - 1]}» (DOM-порядок = смысловой)`,
      ).toBeGreaterThan(indexes[i - 1]);
    }
  });

  it('связующие стили паттерна — только токены, без hex и !important (граница «showcase, не dist»)', () => {
    expect(pattern, 'связки живут <style> стенда, не в dist').toContain('<style>');
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'hex в связках запрещён (инвариант системы)').not.toMatch(
      /#[0-9a-fA-F]{3,8}\b/,
    );
    expect(style[1], '!important в связках запрещён (инвариант системы)').not.toContain(
      '!important',
    );
    expect(style[1], 'связки паттерна именованы fpp-*').toContain('.fpp-');
  });

  it('media в связках — только min-width из шкалы брейкпоинтов T2.5', () => {
    const styles = pattern.match(/<style>([\s\S]*?)<\/style>/g) ?? [];
    const media = (styles.join('').match(/@media[^{]+/g) ?? []).map((m) => m.trim());
    for (const query of media) {
      expect(query, `media-запрос «${query}» — mobile-first min-width`).toMatch(
        /^@media \(min-width: (?:480|768|1024|1280|1440)px\)$/,
      );
    }
    expect(media.length, 'плейсмент aside — единственный media-запрос связок').toBeGreaterThan(0);
  });

  it('без inline-стилей (инвариант системы: перекраска vi.css накрывает всё)', () => {
    const markup = markupOf(pattern);
    expect(markup, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });
});

describe('patterns/form-page/README.md — дока паттерна (AC: решение, Bitrix-заметки)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('состав паттерна назван: крошки, h1, lead, ui-form, aside-сводка, форма-цикл', () => {
    for (const marker of [
      'крошки',
      'ui-lead',
      'ui-form',
      'ui-form__aside',
      'серверный',
      'success',
    ]) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
  });

  it('решение «aside на мобиле» зафиксировано (Implementation requirements п.1)', () => {
    expect(readme, 'решение: сводка вакансии — ДО формы').toContain('до формы');
    expect(readme, 'основание решения — порядок чтения (a11y)').toContain('порядок чтения');
    expect(readme, 'механика на десктопе: grid-column, DOM не двигается').toContain('grid-column');
  });

  it('Bitrix-заметки (AC): шаблон формы отклика + сверка aside с данными элемента', () => {
    expect(readme, 'компонент формы — bitrix:form.result.new').toContain('bitrix:form.result.new');
    expect(readme, 'aside сверяется с данными элемента (свойства ИБ вакансии)').toContain(
      'свойств',
    );
    expect(readme, 'серверная валидация всегда включена (правило цикла T5.6)').toContain(
      'серверная валидация',
    );
  });

  it('правила фокуса T5.4 воспроизведены: summary → фокус, success → фокус', () => {
    expect(readme, 'фокус на сводную ошибку').toContain('фокус');
    expect(readme, 'фокус на success-заголовок (tabindex="-1")').toContain('tabindex="-1"');
  });

  it("Do / Don't: summary первым ребёнком; aside не дублирует форму", () => {
    expect(readme, "Do/Don't секция есть").toContain("Don't");
    expect(readme, 'summary — первым ребёнком .ui-form').toContain('первым');
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/form-page.html', () => {
  it('build.mjs читает patterns/form-page/form-page.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'form-page', 'form-page.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'form-page.html'`);
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('каркас стенда БЕЗ служебного h1: h1 несёт сам паттерн (гейт irao/one-h1)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/form-page'));
    expect(block).toContain('Без служебного h1');
  });
});
