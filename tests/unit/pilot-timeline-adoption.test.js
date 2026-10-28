/**
 * Юнит-пины adoption таймлайна пилота (T17.10; Testing requirements —
 * «поверхностная проверка», пины до браузерной пробы — практика adoption-
 * блоков T17.3/T17.9).
 *
 * Спека T17.10: таймлайны этапов пилота («Как попасть» internships/practices)
 * переводятся с сайт-зонной копии `cp-timeline` (pilot.css — drift от канона:
 * точки 20px primary вместо 56px blue-100, 5-й этап переносился на вторую
 * строку сетки repeat(4)) на канон паттерна patterns/timeline — связки `tlp-*`
 * паттерн-слоя (вариант A T17.1). Разметка build.mjs — на классах канона 1:1
 * (урок cp-vac-row → lpp-row); правило `cp-timeline*` удаляется из pilot.css.
 * Высоты блоков гейтит compare (AC: порог ±4px — BLOCK_PROBES timeline на
 * internships/practices); здесь — пины исполняемой формы решения.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

/** Исходник хелпера timeline() — единая точка сборки этапов. */
const helper = build.match(/function timeline\(steps\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';

describe('build.mjs — таймлайн на каноне паттерна (tlp-*, T17.10 Scope)', () => {
  it('хелпер этапов — разметка канона 1:1: li.tlp__stage → span.tlp__dot → h3.ui-h6 → текст muted', () => {
    expect(helper, 'хелпер timeline() найден').not.toBe('');
    expect(helper, 'этап — li.tlp__stage (канон timeline.html)').toContain(
      '<li class="tlp__stage">',
    );
    expect(helper, 'номер — span.tlp__dot, видимый текст (WCAG 1.3.1)').toContain(
      '<span class="tlp__dot">${index + 1}</span>',
    );
    expect(helper, 'заголовок этапа — h3 с ролью ui-h6 (T16.12, пример спеки T17.10)').toContain(
      '<h3 class="ui-h6">',
    );
    expect(helper, 'текст этапа — ui-small ui-text--muted (fs-small/muted оригинала)').toContain(
      '<p class="ui-small ui-text--muted">',
    );
  });

  it('обёртка — ol.tlp[role="list"] вместо div.cp-timeline (семантика списка шагов)', () => {
    expect(build, 'обёртка — ol.tlp с role="list" (reset снимает list-style)').toContain(
      '<ol class="tlp" role="list">',
    );
    expect(build, 'cp-timeline из разметки снят').not.toContain('cp-timeline');
  });
});

describe('pilot.css — дубликат cp-timeline снят (T17.10 AC)', () => {
  it('правил cp-timeline* больше нет — ни базы, ни media-ступеней лестницы', () => {
    for (const gone of ['.cp-timeline']) {
      expect(pilotCss, `дубликат ${gone} удалён (канон пришёл слоем tlp-*)`).not.toContain(gone);
    }
  });
});

describe('compare.mjs — проба блока таймлайна (AC: высоты ±4px)', () => {
  it('internships/practices: BLOCK_PROBES несёт пару original .timeline → pilot .tlp', () => {
    const block = compare.match(/'internships\.html':\s*\[[\s\S]*?\],/)?.[0] ?? '';
    expect(block, 'проба internships.html объявлена').not.toBe('');
    expect(block, 'пара original .timeline → pilot .tlp').toContain(
      "['timeline', '.timeline', '.tlp']",
    );
    const practicesBlock = compare.match(/'practices\.html':\s*\[[\s\S]*?\],/)?.[0] ?? '';
    expect(practicesBlock, 'проба practices.html объявлена').not.toBe('');
    expect(practicesBlock, 'пара original .timeline → pilot .tlp').toContain(
      "['timeline', '.timeline', '.tlp']",
    );
  });
});

describe('errata AC ±4px (T17.10, решение владельца 28.10 — ревью ветки task/T17.10)', () => {
  const taskPath = join(
    root,
    'docs',
    'ui-system',
    'epics',
    'EPIC-17-ds-full-coverage',
    'T17.10-timeline-adoption.md',
  );
  let task = '';
  try {
    task = readFileSync(taskPath, 'utf8');
  } catch {
    task = '';
  }

  it('файл задачи несёт errata-примечание под AC compare: замеры 188→181/168→162 на принятых ролях', () => {
    expect(task, 'errata-примечание под AC ±4px присутствует').toMatch(
      /Errata[\s\S]*188→181[\s\S]*168→162/,
    );
    expect(
      task,
      'обоснование — ранее принятые роли ДС (REPORT §9.1 №1/№12/№13, T16.12): lh ui-h6 25 против 27, ui-small 18.9 против 20.3',
    ).toMatch(/§9\.1 №1\/№12\/№13[\s\S]*T16\.12/);
    expect(task, 'до adoption дрейф блока был +59px (адoption дрейф закрыл, не создал)').toMatch(
      /\+59px/,
    );
  });

  it('errata фиксирует осознанные различия вне 1440: колонка 1 против 2 и неприменимость education/career-track', () => {
    expect(
      task,
      'мобильная колонка канона (1) против 2 колонок оригинала ≤1024 (pages.css:1252) — записана',
    ).toMatch(/1 колонк[\s\S]*pages\.css:1252/);
    expect(
      task,
      'education/career-track: таймлайна нет (build.py:484–493 — steps_html только в internships/practices) — записано',
    ).toMatch(/education\/career-track[\s\S]*build\.py:484/);
  });

  it('REPORT §4 синхронен: строка таймлайна несёт замеры и ссылку на errata файла задачи', () => {
    const report = readFileSync(join(root, 'pilot', 'career-portal', 'REPORT.md'), 'utf8');
    const start = report.indexOf('- ~~**Таймлайн этапов**');
    expect(start, 'строка таймлайна в §4 найдена').toBeGreaterThan(-1);
    const nextBullet = report.indexOf('\n- ', start + 1);
    const row = report.slice(start, nextBullet === -1 ? undefined : nextBullet);
    expect(row, 'замеры compare в строке').toContain('188→181');
    expect(row, 'замеры internships в строке').toContain('168→162');
    expect(row, 'ссылка на errata файла задачи').toContain('errata');
  });
});
