/**
 * Юнит-пины T7.6 — паттерн «Header» (patterns/header/): контракт копируемой
 * разметки шапки сайта, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T7.6, Scope + Implementation requirements):
 *  - patterns/header/header.html — skip-link (T3.5) + <header> (banner) +
 *    nav-лендмарки с УНИКАЛЬНЫМИ aria-label + dropdown (T6.1, навигационное
 *    назначение — nav/ul/li/a, без menu-роли) + логотип (T4.6: alt/имя,
 *    размеры) + кнопка VI (T9.1: data-ui-vi-toggle, в шапке на каждой
 *    странице) + поиск (триггер-ссылка к диалогу search-overlay, T7.6);
 *  - паттерн самодостаточен: диалог поиска включён в сниппет (пара
 *    «триггер в шапке — диалог в конце body»);
 *  - связующие стили паттерна живут <style>'ом стенда, НЕ в dist;
 *    значения — только токены --ui-*.
 * Поверхность браузера (лендмарки, dropdown, VI, axe, эталоны) —
 * tests/e2e/pattern-header.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'header', 'header.html');
const readmePath = join(root, 'patterns', 'header', 'README.md');

describe('patterns/header/header.html — контракт эталонной сборки (Scope T7.6)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('skip-link (T3.5) — первый элемент сниппета, до <header> (WCAG 2.4.1)', () => {
    const skip = pattern.indexOf('<a class="ui-skip-link" href="#main">');
    const header = pattern.indexOf('<header');
    expect(skip, 'skip-link на месте (канон ui-skip-link)').toBeGreaterThan(-1);
    expect(header, 'шапка на месте').toBeGreaterThan(-1);
    expect(
      skip,
      'skip-link раньше шапки — первый интерактивный элемент (T3.5)',
    ).toBeLessThan(header);
  });

  it('<header> — один banner-лендмарка снппета; на странице сайта — до <main>', () => {
    const headers = pattern.match(/<header\b/g) ?? [];
    expect(headers.length, 'ровно одна шапка в сниппете').toBe(1);
  });

  it('nav-лендмарки с уникальными aria-label (Accessibility requirements)', () => {
    const navs = pattern.match(/<nav\b[^>]*aria-label="([^"]+)"[^>]*>/g) ?? [];
    expect(navs.length, 'навигаций минимум две (основная и дополнительная)').toBeGreaterThanOrEqual(
      2,
    );
    const labels = navs.map((nav) => (nav.match(/aria-label="([^"]+)"/) ?? [])[1]);
    expect(new Set(labels).size, 'aria-label навигаций уникальны').toBe(labels.length);
    for (const label of labels) {
      expect(label.trim().length, 'aria-label непустой').toBeGreaterThan(0);
    }
  });

  it('dropdown (T6.1) — навигационное назначение: nav/ul/li/a, без menu-роли', () => {
    const dropdown = pattern.match(/<div[^>]*class="[^"]*ui-dropdown[^"]*"[^>]*data-ui-dropdown[^>]*>/);
    expect(dropdown, 'хук data-ui-dropdown на месте (модуль T6.1)').toBeTruthy();
    expect(pattern, 'триггер — button.ui-dropdown__trigger').toContain(
      'class="ui-dropdown__trigger"',
    );
    const menu = pattern.match(/<nav[^>]*class="[^"]*ui-dropdown__menu[^"]*"[^>]*>/) ?? [''];
    expect(menu[0], 'меню навигации — nav (не role="menu": ссылки-переходы)').toContain('<nav');
    expect(pattern, 'список ссылок ul/li').toMatch(/<ul[^>]*class="[^"]*ui-dropdown__list/);
    expect(pattern).toMatch(/<li><a[^>]*class="[^"]*ui-dropdown__item/);
    expect(pattern, 'меню без hidden в разметке — раскрыто без JS (PE, T6.1)').not.toContain(
      'ui-dropdown__menu" hidden',
    );
  });

  it('логотип — ссылка на главную с доступным именем (T4.6: alt/имя, размеры — README)', () => {
    const logo = pattern.match(/<a\b[^>]*class="[^"]*hdp-logo[^"]*"[^>]*>[\s\S]*?<\/a>/) ?? [''];
    expect(logo[0], 'логотип-ссылка на месте').not.toBe('');
    expect(logo[0], 'href — главная страница').toMatch(/href="(?:\/|index\.html)"/);
    const name =
      (logo[0].match(/aria-label="([^"]+)"/) ?? [])[1] ??
      logo[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(name.length, 'у ссылки-логотипа есть доступное имя').toBeGreaterThan(0);
  });

  it('кнопка VI (T9.1) — data-ui-vi-toggle в дополнительной навигации, aria-pressed', () => {
    const vi = pattern.match(/<button\b[^>]*data-ui-vi-toggle[^>]*>/) ?? [''];
    expect(vi[0], 'кнопка VI в шапке (README ui-vi: кнопка живёт в шапке)').not.toBe('');
    expect(vi[0], 'type="button" — не сабмит чужой формы').toContain('type="button"');
    expect(vi[0], 'состояние режима — aria-pressed (синхронизирует модуль)').toContain(
      'aria-pressed="false"',
    );
  });

  it('поиск — триггер-ссылка к диалогу search-overlay (T7.6): id-связка в том же сниппете', () => {
    const trigger = pattern.match(/<a\b[^>]*data-ui-modal-target="([^"]+)"[^>]*>/) ?? [''];
    expect(trigger[0], 'триггер поиска — ссылка (переход без JS)').not.toBe('');
    const id = (trigger[0].match(/data-ui-modal-target="([^"]+)"/) ?? [])[1];
    expect(id, 'триггер ссылается на id').toBeTruthy();
    const dialog = pattern.match(new RegExp(`<dialog\\b[^>]*id="${id}"[^>]*>`)) ?? [''];
    expect(dialog[0], 'диалог с этим id есть в сниппете (самодостаточность)').not.toBe('');
    expect(trigger[0], 'href — страница результатов (деградация)').toContain('href="/search/"');
  });

  it('диалог поиска в сниппете — контракт ui-modal (data-ui-modal, open в разметке)', () => {
    const dialog = pattern.match(/<dialog\b[^>]*data-ui-modal[^>]*>/) ?? [''];
    expect(dialog[0], 'диалог с хуком модуля на месте').not.toBe('');
    expect(dialog[0], 'в разметке открыт (деградация без JS, К9 ADR-0011)').toMatch(/\bopen\b/);
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

describe('patterns/header/README.md — дока паттерна (AC: правила ленмарк, Bitrix-заметки)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('правила ленмарк/заголовков: banner на уровне body, до main, после skip-link (AC)', () => {
    expect(readme, 'место шапки — уровень body').toContain('body');
    expect(readme, 'порядок каркаса: skip-link → header → main').toMatch(/skip-link/);
    expect(readme, 'главная страница — после шапки').toContain('main');
  });

  it('правило aria-label навигаций: уникальные имена (Accessibility requirements)', () => {
    expect(readme, 'уникальные aria-label навигаций').toContain('aria-label');
    expect(readme, 'правило уникальности').toMatch(/уник/i);
  });

  it('Bitrix-заметки: где стилизовать меню — bitrix:menu (AC, Scope)', () => {
    expect(readme, 'компонент меню Bitrix').toContain('bitrix:menu');
  });

  it('кнопка VI задокументирована: data-ui-vi-toggle, ui-vi.min.css последним (T9.1)', () => {
    expect(readme, 'хук кнопки VI').toContain('data-ui-vi-toggle');
    expect(readme, 'подключение ui-vi (CSS последним в каскаде)').toContain('ui-vi.min.css');
  });

  it('связка с search-overlay (T7.6): диалог в конце body', () => {
    expect(readme, 'диалог поиска — пара к триггеру шапки').toContain('search-overlay');
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/header.html', () => {
  it('build.mjs читает patterns/header/header.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'header', 'header.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'header.html'`);
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('стенд ставит паттерн-шапку на уровень body (banner-лендмарка честная), служебная шапка каркаса выключена', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/header'));
    expect(block, 'паттерн идёт до main (preMain)').toContain('preMain');
    expect(block, 'служебная шапка каркаса выключена (две banner — нарушение axe)').toContain(
      'frameHeader: false',
    );
  });
});
