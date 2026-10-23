/**
 * Юнит-пин гейта мёртвых ссылок пилота и compare-поверхности 20 страниц
 * (T15.9; Testing requirements — «гейт ссылок + compare — и есть тестовая
 * поверхность задачи»; практика pilot-events-search-pagination.test.js
 * T15.5 — пины исполняемой формы решения до браузерной пробы).
 *
 * Поверхность браузера (docHeight/probes/скриншоты/axe) дают compare.mjs
 * и axe-проба по протоколу T14.12 на живой паре версий; здесь — пины:
 *  - pilot/career-portal/check-links.mjs: гейт детерминированный — без сети
 *    (только файлы dist), парсит внутренние href (*.html), падает, если цель
 *    не существует (Implementation requirements п.1); внешние URL/якоря/
 *    mailto/tel игнорирует; ?query/#якорь срезаются до файла; логика —
 *    чистая функция collectDeadLinks (практика tools/release-gate-lib.mjs +
 *    tests/unit/release-gate.test.js), CLI — тонкая обёртка с ненулевым
 *    выходом на DEAD;
 *  - compare.mjs: PAGES = все 20 страниц сборки build.mjs, список и порядок
 *    совпадают (Scope п.1; AC «compare.json/viewer на 20 страниц»);
 *  - compare.mjs: гейт подключен в тот же запуск — collectDeadLinks
 *    вызывается до браузерного прогона (Scope п.2).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectDeadLinks } from '../../pilot/career-portal/check-links.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

/** Тело исходника с нормализацией CRLF (рабочая копия Windows — см.
 *  tests/unit/link.test.js). */
const readSource = (name) => readFileSync(join(pilotDir, name), 'utf8').replace(/\r\n/g, '\n');

const build = readSource('build.mjs');
const compare = readSource('compare.mjs');

/** Фикстурный dist: страницы-файлы + опциональные подкаталоги. */
function fixtureDist(files) {
  const dir = mkdtempSync(join(tmpdir(), 'pilot-link-gate-'));
  for (const [path, html] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, html);
  }
  return dir;
}

describe('гейт мёртвых ссылок — collectDeadLinks (T15.9, Implementation requirements п.1)', () => {
  it('модуль гейта — pilot/career-portal/check-links.mjs (Scope п.2: скрипт в pilot/career-portal/ или tools/)', async () => {
    expect(existsSync(join(pilotDir, 'check-links.mjs'))).toBe(true);
    expect(typeof collectDeadLinks).toBe('function');
  });

  it('DEAD: ссылка на несуществующую *.html — падение с указанием страницы-источника и цели', () => {
    const dist = fixtureDist({
      'index.html': '<a href="vacancy.html">детальная</a><a href="index.html">себя</a>',
      'vacancies.html': '<a href="vacancies.html?page=2#row">страница 2</a>',
    });
    const result = collectDeadLinks(dist);
    expect(result.dead).toEqual([
      { page: 'index.html', href: 'vacancy.html', target: 'vacancy.html' },
    ]);
    expect(result.checked).toEqual(['index.html', 'vacancies.html']);
    expect(result.links).toBe(3);
  });

  it('?query и #якорь срезаются: *.html?page=N#x существует — не DEAD', () => {
    const dist = fixtureDist({
      'events.html': '<a href="events.html?page=2">2</a>',
      'index.html': '<a href="index.html#contacts">контакты</a>',
    });
    expect(collectDeadLinks(dist).dead).toEqual([]);
  });

  it('внешние URL, якоря, mailto:, tel: — вне гейта (Implementation requirements п.1)', () => {
    const dist = fixtureDist({
      'index.html':
        '<a href="https://trudvsem.ru/">работа России</a>' +
        '<a href="http://example.com/x.html">внешний html</a>' +
        '<a href="#main">скип</a><a href="#">пустой</a>' +
        '<a href="mailto:career@interrao.ru">почта</a>' +
        '<a href="tel:+74956648840">телефон</a>',
    });
    const result = collectDeadLinks(dist);
    expect(result.dead).toEqual([]);
    expect(result.links).toBe(0);
  });

  it('href не-.html (css/шрифты/js) — вне поверхности гейта (*.html по спеке)', () => {
    const dist = fixtureDist({
      'index.html':
        '<link rel="stylesheet" href="ds/ui-core.min.css">' +
        '<link rel="preload" href="ds/fonts/golos-400-cyr.woff2" as="font">' +
        '<script src="ds/ui.min.js" defer></script>' +
        '<img src="assets/images/x.jpg" alt="">',
    });
    expect(collectDeadLinks(dist).dead).toEqual([]);
    expect(collectDeadLinks(dist).links).toBe(0);
  });

  it('ссылка из подкаталога резолвится от каталога страницы (../index.html)', () => {
    const dist = fixtureDist({
      'index.html': '<a href="sub/inner.html">внутренняя</a>',
      'sub/inner.html': '<a href="../index.html">наверх</a>',
    });
    expect(collectDeadLinks(dist).dead).toEqual([]);
  });

  it('вложенный DEAD из подкаталога называет страницу с подкаталогом', () => {
    const dist = fixtureDist({
      'sub/inner.html': '<a href="missing.html">мимо</a>',
    });
    expect(collectDeadLinks(dist).dead).toEqual([
      { page: 'sub/inner.html', href: 'missing.html', target: 'sub/missing.html' },
    ]);
  });
});

describe('CLI-гейт (AC «гейт мёртвых ссылок зелёный (0 DEAD)» / «падает»)', () => {
  const cli = join(pilotDir, 'check-links.mjs');

  it('чистый dist — exit 0 и сводка 0 DEAD', () => {
    const dist = fixtureDist({ 'index.html': '<a href="index.html">ок</a>' });
    const stdout = execFileSync(process.execPath, [cli, '--dist', dist], { encoding: 'utf8' });
    expect(stdout).toContain('0 DEAD');
  });

  it('мёртвая ссылка — ненулевой выход и DEAD в отчёте (stderr CLI)', () => {
    const dist = fixtureDist({ 'index.html': '<a href="ghost.html">мимо</a>' });
    let failed = false;
    let output = '';
    try {
      execFileSync(process.execPath, [cli, '--dist', dist], { encoding: 'utf8' });
    } catch (error) {
      failed = true;
      output = `${error.stdout}${error.stderr}`;
    }
    expect(failed).toBe(true);
    expect(output).toContain('DEAD');
    expect(output).toContain('ghost.html');
  });

  it('dist не существует — ненулевой выход (не тихий зелёный)', () => {
    let failed = false;
    try {
      execFileSync(process.execPath, [cli, '--dist', join(tmpdir(), 'no-such-dist-xyz')], {
        encoding: 'utf8',
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});

describe('гейт на реальном dist пилота (AC: 0 DEAD)', () => {
  const dist = join(pilotDir, 'dist');

  it.skipIf(!existsSync(dist))(
    'все внутренние href 20 страниц dist резолвятся (Epic AC: «все внутренние ссылки… резолвятся»)',
    () => {
      const result = collectDeadLinks(dist);
      expect(result.dead).toEqual([]);
      expect(result.checked).toHaveLength(20);
    },
  );
});

describe('compare.mjs — PAGES = все 20 страниц сборки (T15.9 Scope п.1)', () => {
  it('список и порядок PAGES compare.mjs = PAGES build.mjs; страниц 20', async () => {
    const buildPages = [...build.matchAll(/file: '([a-z0-9-]+\.html)'/g)].map((m) => m[1]);
    const comparePagesBlock = compare.match(/const PAGES = \[([\s\S]*?)\n\];/)?.[1] ?? '';
    const comparePages = [...comparePagesBlock.matchAll(/'([a-z0-9-]+\.html)'/g)].map((m) => m[1]);
    expect(buildPages).toHaveLength(20);
    expect(comparePages).toEqual(buildPages);
  });
});

describe('compare.mjs — гейт подключен в тот же запуск (T15.9 Scope п.2)', () => {
  it('compare.mjs импортирует collectDeadLinks и проверяет dist до браузерного прогона', async () => {
    expect(compare).toContain("from './check-links.mjs'");
    expect(compare).toContain('collectDeadLinks');
  });
});
