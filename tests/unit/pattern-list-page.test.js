/**
 * Юнит-пины T8.1 — паттерн «Страница списка» (patterns/list-page/):
 * контракт копируемой разметки, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T8.1, Scope + Implementation requirements):
 *  - patterns/list-page/list-page.html — эталонная сборка страницы списка
 *    БЕЗ нового CSS системы: page-head (h1 + счётчик aria-live + lead),
 *    GET-форма фильтров (select-пилюли data-ui-select="wrap" + submit/reset),
 *    сетка ui-grid--3 с карточками (T4.4 + теги T4.3), пагинация (T6.3);
 *    вторая ветка — «ничего не найдено»: счётчик 0 + ui-empty (T4.8) с
 *    кнопкой сброса (ссылка на чистый URL — работает без JS);
 *  - связующие стили паттерна (пилюля фильтра — зона сайта) живут <style>'ом
 *    стенда, НЕ в dist; значения — только токены --ui-*;
 *  - сниппеты Technical considerations в доке: фокус на заголовок результатов
 *    после применения фильтра; счётчик — aria-live="polite";
 *  - Bitrix-заметки в доке (AC): bitrix:news.list — цикл карточек, GET-
 *    параметры фильтров, пагинация $nav.
 * Поверхность браузера (GET-цикл с JS/без, empty-ветка, фокус, axe,
 * иерархия h1→h2, эталоны) — tests/e2e/pattern-list-page.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'list-page', 'list-page.html');
const readmePath = join(root, 'patterns', 'list-page', 'README.md');

describe('patterns/list-page/list-page.html — контракт эталонной сборки (Scope T8.1)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('page-head: один h1 (page-title) с tabindex="-1" — цель фокуса после фильтра', () => {
    const h1 = pattern.match(/<h1\b[^>]*>/g) ?? [];
    expect(h1, 'ровно один h1 — страница списка (гейт irao/one-h1)').toHaveLength(1);
    expect(h1[0], 'h1 несёт tabindex="-1" — программный фокус (сниппет T8.1)').toContain(
      'tabindex="-1"',
    );
  });

  it('счётчик результатов — aria-live="polite" (Technical considerations)', () => {
    expect(pattern, 'счётчик id="lpp-count" на месте').toContain('id="lpp-count"');
    expect(pattern).toMatch(/aria-live="polite"[^>]*>\s*Найдено: 6 вакансий\s*</);
  });

  it('lead-подзаголовок page-head — роль ui-lead', () => {
    expect(pattern).toMatch(/<p class="[^"]*ui-lead/);
  });

  it('фильтры — GET-форма: method="get", submit «Применить» и reset работают без JS', () => {
    const form = pattern.match(/<form\b[^>]*id="lpp-filter"[^>]*>/) ?? [''];
    expect(form[0], 'форма фильтров на месте').not.toBe('');
    expect(form[0], 'method="get" — фильтрация перезагрузкой (Out of scope: AJAX)').toContain(
      'method="get"',
    );
    expect(form[0], 'action ведёт на якорь результатов — скролл к выдаче без JS').toContain(
      'action="#lpp-title"',
    );
    const submit = pattern.match(/<button[^>]*type="submit"[^>]*>[\s\S]*?<\/button>/) ?? [''];
    expect(submit[0], 'submit — ui-button «Применить»').toContain('ui-button');
    expect(submit[0]).toContain('Применить');
    expect(pattern, 'reset формы — нативный type="reset" (без JS)').toContain('type="reset"');
  });

  it('select-пилюли — data-ui-select="wrap" в label-обёртке сайта (замена хака career-portal)', () => {
    const hooks = pattern.match(/data-ui-select="wrap"/g) ?? [];
    expect(
      hooks.length,
      'минимум три фильтра-пилюли (город/направление/опыт)',
    ).toBeGreaterThanOrEqual(3);
    // Каждая пилюля: подпись — label[for] РЯДОМ (имя поля получают и нативный
    // select, и триггер — пара APG listbox-button), обёртка-пилюля содержит
    // ТОЛЬКО select: триггер модуля накрывает обёртку inset:0 целиком.
    for (const id of ['lpp-city', 'lpp-direction', 'lpp-experience']) {
      const select = pattern.match(new RegExp(`<select[^>]*id="${id}"[^>]*>`, 's')) ?? [''];
      expect(select[0], `пилюля ${id}: data-ui-select="wrap"`).toContain('data-ui-select="wrap"');
      const label = pattern.match(new RegExp(`<label[^>]*for="${id}"[^>]*>[\\s\\S]*?</label>`)) ?? [
        '',
      ];
      expect(label[0], `пилюля ${id}: подпись label[for] рядом`).not.toBe('');
    }
    // Первая опция — placeholder с пустым value (пара career-portal).
    const cityBlock = pattern.match(/<select[^>]*id="lpp-city"[\s\S]*?<\/select>/) ?? [''];
    expect(cityBlock[0], 'первая опция пилюли — placeholder value=""').toMatch(
      /<option value=""[^>]*>/,
    );
  });

  it('выдача — сетка ui-grid--3, карточки T4.4 (ссылочные, --hover) с тегами T4.3', () => {
    expect(pattern, 'сетка --3 паттерна (Scope)').toMatch(/class="ui-grid ui-grid--3"/);
    const cards = pattern.match(/ui-card--link/g) ?? [];
    expect(cards.length, 'карточки-ссылки — паттерн T4.4').toBeGreaterThanOrEqual(6);
    expect(pattern, 'теги T4.3 в карточках').toContain('ui-tag ui-tag--');
    // Заголовки карточек — h2 по семантике страницы (h1 → h2 без пропусков),
    // вид — роль ui-h3 («классы, а не теги», T3.3).
    const cardTitles = pattern.match(/<h2 class="ui-h3 ui-card__title">/g) ?? [];
    expect(cardTitles.length, 'заголовки карточек — тег h2 с ролью ui-h3').toBeGreaterThanOrEqual(
      6,
    );
  });

  it('пагинация T6.3 — nav.ui-pagination с именем лендмарки', () => {
    const nav = pattern.match(/<nav[^>]*class="ui-pagination"[^>]*>/) ?? [''];
    expect(nav[0], 'пагинация на месте').not.toBe('');
    expect(nav[0], 'aria-label пагинации (конвенция T6.3)').toContain('aria-label="Пагинация');
  });

  it('empty-ветка: счётчик 0, ui-empty (T4.8) с h2 и кнопкой сброса на чистый URL', () => {
    expect(pattern, 'счётчик пустой выдачи').toMatch(
      /aria-live="polite"[^>]*>\s*Найдено: 0 вакансий\s*</,
    );
    expect(pattern, 'empty-state компонента T4.8').toContain('class="ui-empty"');
    const emptyTitle = pattern.match(/<h2[^>]*class="[^"]*ui-empty__title[^"]*"[^>]*>/) ?? [''];
    expect(emptyTitle[0], 'заголовок состояния — h2 (правило T4.8)').not.toBe('');
    // Сброс — ССЫЛКА на страницу списка без параметров: работает без JS
    // (Implementation requirements п.3), в отличие от client-side reset формы.
    const reset = pattern.match(/<a[^>]*href="list-page.html"[^>]*>[\s\S]*?<\/a\s*>/) ?? [''];
    expect(reset[0], 'сброс empty-ветки — ссылка на чистый URL (GET, без JS)').not.toBe('');
    expect(reset[0], 'сброс выглядит действием — ui-button (link-button)').toContain('ui-button');
  });

  it('порядок чтения: фильтры → результаты (форма в DOM раньше сетки выдачи)', () => {
    expect(
      pattern.indexOf('id="lpp-filter"'),
      'форма фильтров раньше выдачи (Accessibility requirements)',
    ).toBeGreaterThan(-1);
    expect(pattern.indexOf('id="lpp-filter"')).toBeLessThan(pattern.indexOf('ui-grid ui-grid--3'));
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
    expect(style[1], 'пилюля фильтра — зона сайта (именована lpp-*)').toContain('.lpp-pill');
  });

  it('без inline-стилей (инвариант системы: перекраска vi.css накрывает всё)', () => {
    expect(pattern, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });

  it('фокус-сниппет в разметке: параметризован id, исполняется только с применённым фильтром', () => {
    expect(pattern, 'inline-сниппет фокуса на стенде').toContain('<script>');
    expect(pattern).toContain("getElementById('lpp-title')");
    expect(pattern, 'guard: чистая загрузка фокус не крадёт').toContain('URLSearchParams');
  });
});

describe('patterns/list-page/README.md — дока паттерна (AC: Bitrix-заметки, сниппеты)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('состав паттерна: page-head, фильтры, сетка+карточки, пагинация, empty', () => {
    for (const marker of [
      'page-head',
      'фильтр',
      'ui-grid--3',
      'ui-card',
      'ui-pagination',
      'ui-empty',
    ]) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
  });

  it('Bitrix-заметки (AC): news.list, GET-параметры, пагинация $nav', () => {
    expect(readme, 'шаблон цикла — bitrix:news.list').toContain('news.list');
    expect(readme, 'GET-параметры фильтров задокументированы').toContain('$_GET');
    expect(readme, 'пагинация — $nav (NAV_STRING)').toContain('$nav');
  });

  it('сниппеты Technical considerations: фокус на заголовок, счётчик aria-live', () => {
    expect(readme, 'сниппет фокуса после применения фильтра').toContain('focus()');
    expect(readme, 'сниппет счётчика — aria-live polite').toContain('aria-live="polite"');
  });

  it('правила границ: без JS фильтр отправляется кнопкой; AJAX — зона сайта (Out of scope)', () => {
    expect(readme, 'GET-форма работает без JS').toContain('без JS');
    expect(readme, 'AJAX-фильтрация — за границей паттерна').toContain('зона сайта');
  });

  it('сниппет выдачи — h2-заголовки карточек: копипаст из доки не даёт пропуск h1→h3 (ревью high)', () => {
    expect(
      readme,
      'в доке нет <h3 class="ui-h3 ui-card__title">: вставка сниппета на страницу с h1 дала бы пропуск уровня (irao/heading-order)',
    ).not.toContain('<h3 class="ui-h3 ui-card__title">');
    expect(readme, 'канон паттерна — h2 с ролью ui-h3 (семантика страницы, вид — роль)').toContain(
      '<h2 class="ui-h3 ui-card__title">',
    );
    // Пометка об уровне тега — чтобы копирующий не вернул h3 «по канону ui-card».
    expect(readme, 'уровень тега и роль разведены в доке').toContain('уровень тега');
  });

  it('сниппет фокуса гвардит по всем трём фильтрам формы (ревью high: city/direction/experience)', () => {
    expect(
      readme,
      'условие фокуса синхронно с гвардом канона (list-page.html: city+direction+experience)',
    ).toMatch(
      /!empty\(\$_GET\['city'\]\) \|\| !empty\(\$_GET\['direction'\]\) \|\| !empty\(\$_GET\['experience'\]\)/,
    );
  });

  it('Bitrix-эскиз: фокус по всем применённым фильтрам, не только городу (ревью high)', () => {
    expect(readme, 'эскиз экранирует direction').toContain(
      "$sDirection = isset($_GET['direction'])",
    );
    expect(readme, 'эскиз экранирует experience').toContain(
      "$sExperience = isset($_GET['experience'])",
    );
    expect(readme, 'фокус-гвард эскиза покрывает все три фильтра формы паттерна').toMatch(
      /\$sCity !== '' \|\| \$sDirection !== '' \|\| \$sExperience !== ''/,
    );
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/list-page.html', () => {
  it('build.mjs читает patterns/list-page/list-page.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'list-page', 'list-page.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'list-page.html'`);
    // Стенд вложенный (stands/patterns/…): рантайм на два уровня выше.
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('каркас стенда БЕЗ служебного h1: h1 несёт сам паттерн (гейт irao/one-h1)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/list-page'));
    expect(block).toContain('Без служебного h1');
  });
});
