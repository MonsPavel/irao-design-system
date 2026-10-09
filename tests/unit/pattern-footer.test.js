/**
 * Юнит-пины T7.6 — паттерн «Footer» (patterns/footer/): контракт копируемой
 * разметки подвала сайта, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T7.6, Scope + Implementation requirements):
 *  - patterns/footer/footer.html — <footer> (contentinfo) + колонки ссылок
 *    (nav-лендмарки с уникальными aria-label) + контакты в <address>
 *    (Technical considerations: address-семантика) + переход кверху;
 *  - icon-only ссылки соцсетей — с aria-label (T4.1);
 *  - связующие стили паттерна живут <style>'ом стенда, НЕ в dist;
 *    значения — только токены --ui-*.
 * Поверхность браузера (лендмарки, address, axe, эталоны) —
 * tests/e2e/pattern-footer.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'footer', 'footer.html');
const readmePath = join(root, 'patterns', 'footer', 'README.md');

describe('patterns/footer/footer.html — контракт эталонной сборки (Scope T7.6)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }
  // Разметка без док-комментариев: литералы «<footer>» в тексте комментариев —
  // не элементы (пины ленмарк считают только разметку).
  const markup = pattern.replace(/<!--[\s\S]*?-->/g, '');

  it('<footer> — один contentinfo-лендмарка сниппета (после main на странице сайта)', () => {
    const footers = markup.match(/<footer\b/g) ?? [];
    expect(footers.length, 'ровно один подвал в сниппете').toBe(1);
  });

  it('колонки ссылок — nav-лендмарки с уникальными aria-label (Accessibility requirements)', () => {
    const navs = pattern.match(/<nav\b[^>]*aria-label="([^"]+)"[^>]*>/g) ?? [];
    expect(navs.length, 'колонки ссылок — навигации (минимум две)').toBeGreaterThanOrEqual(2);
    const labels = navs.map((nav) => (nav.match(/aria-label="([^"]+)"/) ?? [])[1]);
    expect(new Set(labels).size, 'aria-label навигаций уникальны').toBe(labels.length);
  });

  it('списки ссылок — ul/li (семантика списка)', () => {
    expect(pattern).toMatch(/<nav[^>]*>[\s\S]*?<ul[^>]*>[\s\S]*?<li><a/);
  });

  it('контакты — address-семантика (Technical considerations T7.6)', () => {
    const address = pattern.match(/<address\b[^>]*>[\s\S]*?<\/address>/) ?? [''];
    expect(address[0], 'контакты обёрнуты в <address>').not.toBe('');
    expect(address[0], 'адрес — текстом в address').toMatch(/Москва|адрес|ул\./i);
    const tel = pattern.match(/<a\b[^>]*href="tel:[^"]+"[^>]*>/) ?? [''];
    expect(tel[0], 'телефон — ссылка tel:').not.toBe('');
    const mail = pattern.match(/<a\b[^>]*href="mailto:[^"]+"[^>]*>/) ?? [''];
    expect(mail[0], 'e-mail — ссылка mailto:').not.toBe('');
  });

  it('icon-only ссылки соцсетей — с aria-label (T4.1, гейт irao/link-accessible-name)', () => {
    const socials = pattern.match(/<a\b[^>]*class="[^"]*fdp-footer__social[^"]*"[^>]*>/g) ?? [];
    expect(socials.length, 'соцсети на месте').toBeGreaterThanOrEqual(2);
    for (const social of socials) {
      const label = (social.match(/aria-label="([^"]+)"/) ?? [])[1];
      expect(label, `icon-only ссылка ${social.slice(0, 60)}… несёт aria-label`).toBeTruthy();
    }
  });

  it('переход кверху — ссылка на якорь начала страницы (Scope)', () => {
    const top = pattern.match(/<a\b[^>]*class="[^"]*fdp-footer__top[^"]*"[^>]*>/) ?? [''];
    expect(top[0], 'ссылка «наверх» на месте').not.toBe('');
    expect(top[0], 'href — якорь начала страницы').toMatch(/href="#top"/);
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

describe('patterns/footer/README.md — дока паттерна (AC: Bitrix-заметки, ленмарки)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('лендмарки: footer на уровне body после main; aria-label навигаций', () => {
    expect(readme, 'место подвала — уровень body, после main').toContain('main');
    expect(readme, 'правило aria-label навигаций').toContain('aria-label');
  });

  it('address-семантика контактов задокументирована (Technical considerations)', () => {
    expect(readme, 'контакты в <address>').toContain('<address>');
  });

  it('Bitrix-заметки: footer.php / include-области (AC)', () => {
    expect(readme, 'подвал — файл шаблона сайта').toMatch(/footer\.php|include-област/i);
  });

  it('переход кверху: цель — id="top" в начале страницы (без JS работает)', () => {
    expect(readme, 'якорь цели').toContain('#top');
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/footer.html', () => {
  it('build.mjs читает patterns/footer/footer.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'footer', 'footer.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'footer.html'`);
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('стенд ставит паттерн-подвал на уровень body (contentinfo-лендмарка честная)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/footer'));
    expect(block, 'подвал идёт после main (pageFooter)').toContain('pageFooter');
  });
});
