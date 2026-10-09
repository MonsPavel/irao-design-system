/**
 * Юнит-пины T7.6 — паттерн «Search overlay» (patterns/search-overlay/):
 * контракт копируемой разметки, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T7.6, Scope + Implementation requirements):
 *  - patterns/search-overlay/search-overlay.html — полноэкранный диалог поиска
 *    на базе ui-modal (T7.2, модификатор --full): фокус в поле при открытии
 *    (сниппет сайта по событию irao-ui:modal-open — модуль даёт первый фокус
 *    закрывающей кнопке), Escape/restore/trap/aria-modal даёт платформа
 *    (showModal) + модуль; форма поиска — нативный GET (без JS работает как
 *    переход на страницу результатов);
 *  - триггер — ССЫЛКА data-ui-modal-target: без JS срабатывает href, с JS
 *    модуль снимает переход и открывает диалог (README ui-modal);
 *  - связующие стили паттерна живут <style>'ом стенда, НЕ в dist;
 *    значения — только токены --ui-*.
 * Поверхность браузера (полный диалог-чек как T7.2, axe, эталоны) —
 * tests/e2e/pattern-search-overlay.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'search-overlay', 'search-overlay.html');
const readmePath = join(root, 'patterns', 'search-overlay', 'README.md');

describe('patterns/search-overlay/search-overlay.html — контракт эталонной сборки (Scope T7.6)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('диалог — ui-modal --full на <dialog> с data-ui-modal и aria-labelledby (T7.2)', () => {
    const dialog = pattern.match(/<dialog\b[^>]*>/) ?? [''];
    expect(dialog[0], 'диалог на месте').not.toBe('');
    expect(dialog[0], 'класс ui-modal --full (полноэкранный поиск)').toContain('ui-modal--full');
    expect(dialog[0], 'JS-хук data-ui-modal (модуль T7.2)').toContain('data-ui-modal');
    const labelledby = dialog[0].match(/aria-labelledby="([^"]+)"/) ?? [];
    expect(labelledby[1], 'aria-labelledby ведёт на заголовок').toBeTruthy();
    expect(pattern, `цель aria-labelledby — .ui-modal__title с id ${labelledby[1]}`).toContain(
      `id="${labelledby[1]}"`,
    );
    expect(pattern).toMatch(/class="[^"]*ui-modal__title/);
  });

  it('деградация без JS: диалог открыт в разметке (open), модуль снимет его (К9 ADR-0011)', () => {
    const dialog = pattern.match(/<dialog\b[^>]*>/) ?? [''];
    expect(dialog[0], 'атрибут open в разметке — контент доступен инлайн').toMatch(/\bopen\b/);
  });

  it('__close — первый элемент панели с именем «Закрыть» (контракт ui-modal)', () => {
    const close = pattern.match(
      /<dialog\b[^>]*>[\s\n]*<button[^>]*class="[^"]*ui-modal__close[^"]*"[^>]*>/,
    );
    expect(close, '__close — первый элемент панели').toBeTruthy();
    expect(close[0], 'доступное имя закрывающей кнопки').toContain('aria-label="Закрыть"');
    expect(close[0], 'кнопка без сабмита (type="button")').toContain('type="button"');
  });

  it('форма поиска — нативный GET с role="search": без JS работает как переход', () => {
    const form = pattern.match(/<form\b[^>]*>[\s\S]*?<\/form>/) ?? [''];
    expect(form[0], 'форма поиска на месте').not.toBe('');
    expect(
      form[0],
      'method="get" — переход на страницу результатов (Implementation req)',
    ).toContain('method="get"');
    expect(form[0], 'action — страница результатов сайта').toContain('action="/search/"');
    expect(form[0], 'роль search — лендмарка поиска (правила ленмарк)').toContain('role="search"');
    const input = pattern.match(/<input\b[^>]*type="search"[^>]*>/) ?? [''];
    expect(input[0], 'нативный input type="search"').toBeTruthy();
    expect(input[0], 'имя параметра GET — name="q" (career-portal)').toContain('name="q"');
  });

  it('поле подписано label[for] (html-validate input-missing-label; placeholder — не label)', () => {
    const input = pattern.match(/<input\b[^>]*type="search"[^>]*>/) ?? [''];
    const id = (input[0].match(/id="([^"]+)"/) ?? [])[1];
    expect(id, 'у поля есть id').toBeTruthy();
    const label = pattern.match(new RegExp(`<label[^>]*for="${id}"[^>]*>[\\s\\S]*?</label>`)) ?? [
      '',
    ];
    expect(label[0], 'подпись label[for] связана с полем').not.toBe('');
  });

  it('триггер — ссылка data-ui-modal-target: без JS срабатывает href (деградация ui-modal)', () => {
    const trigger = pattern.match(/<a\b[^>]*data-ui-modal-target="([^"]+)"[^>]*>/) ?? [''];
    expect(trigger[0], 'триггер — ссылка (переход без JS)').not.toBe('');
    expect(trigger[0], 'href ведёт на страницу результатов').toContain('href="/search/"');
    const dialog = pattern.match(/<dialog\b[^>]*id="([^"]+)"[^>]*>/) ?? [];
    expect(trigger[0], 'data-ui-modal-target ведёт на id диалога этого же сниппета').toContain(
      `data-ui-modal-target="${dialog[1]}"`,
    );
  });

  it('сниппет фокуса в поле: подписка на irao-ui:modal-open (модуль даёт первый фокус __close)', () => {
    expect(pattern, 'inline-сниппет стенда').toContain('<script>');
    expect(pattern, 'событие открытия модуля — точка расширения сайта').toContain(
      'irao-ui:modal-open',
    );
    const input = pattern.match(/<input\b[^>]*type="search"[^>]*>/) ?? [''];
    const id = (input[0].match(/id="([^"]+)"/) ?? [])[1];
    expect(pattern, 'сниппет переносит фокус в поле поиска').toContain(`getElementById('${id}')`);
    expect(pattern, 'фокус переносится только при наличии поля (guard)').toContain('focus()');
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
  });

  it('без inline-стилей (инвариант системы: перекраска vi.css накрывает всё)', () => {
    expect(pattern, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });
});

describe('patterns/search-overlay/README.md — дока паттерна (AC: Bitrix-заметки, диалог-чек)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('состав паттерна: ui-modal --full, GET-форма, фокус в поле, триггер-ссылка', () => {
    for (const marker of ['ui-modal--full', 'method="get"', 'irao-ui:modal-open', '/search/']) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
  });

  it('диалог-чек T7.2 задокументирован (trap/Escape/restore/aria-modal — AC)', () => {
    for (const marker of ['Escape', 'aria-modal', 'фокус']) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
  });

  it('Bitrix-заметки: где держать диалог и как связать с шаблоном (AC)', () => {
    expect(readme, 'размещение диалога в шаблоне сайта').toContain('</body>');
    expect(readme, 'поиск — штатный bitrix:search').toMatch(/bitrix:search/);
  });

  it('деградация без JS: форма — переход, триггер — ссылка (Implementation requirements)', () => {
    expect(readme, 'без JS форма отправляется переходом').toContain('без JS');
    expect(readme, 'триггер — ссылка на страницу поиска').toContain('href');
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/search-overlay.html', () => {
  it('build.mjs читает patterns/search-overlay/search-overlay.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'search-overlay', 'search-overlay.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'search-overlay.html'`);
    // Стенд вложенный (stands/patterns/…): рантайм на два уровня выше.
    expect(collapsed).toContain(`rel: '../..'`);
  });
});
