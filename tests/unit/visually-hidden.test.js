/**
 * Юнит-пины утилиты visually-hidden `.ui-vh` (задача T17.2; Testing
 * requirements: «unit-пин: класс присутствует в dist (регресс сборки)»).
 *
 * Приём «убран из вида, но доступен скринридерам» был размножен тремя
 * копиями (Context T17.2): `.cp-vh` пилота (pilot.css:995–1006),
 * `.ui-field__req-text` (ui-field.css), `.ui-file__input` (ui-file.css) —
 * дрейф гарантирован (будущая правка под forced-colors). Решение — один
 * приём в одном месте:
 *  - base/reset.css — канонический набор (Implementation requirements п.1:
 *    clip-path, НЕ clip — современный стандарт; пилотный `.cp-vh` уже
 *    канонический). Утилита не участвует в forced-colors-особенностях
 *    (п.2: скрытие остаётся скрытием);
 *  - локальные дубли сняты (AC: «grep: sr-only-блоков в компонентах нет»),
 *    разметка канона несёт `.ui-vh` рядом с семантическим классом;
 *  - пилот: `.cp-vh` → `.ui-vh` (AC), правило удалено из pilot.css;
 *  - dist/ui-core.min.css содержит `.ui-vh` — утилита доезжает до сайтов
 *    (регресс порядка слоёв CSS_CORE_ORDER: base собирается в ядро).
 *
 * `.ui-skip-link` — осознанное исключение пина «полного набора в
 * компонентах нет»: другой приём (Out of scope T17.2 — видимая при фокусе
 * ссылка раскрывает тот же бокс собственным правилом `:focus`).
 * Скринридер-инвариант пилюль/полей (axe label/form-label) — e2e-пробы
 * приёмки, не unit.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildForUnitTests } from '../helpers/unit-build.mjs';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код; CRLF-хост
 *  нормализуется (см. tests/unit/field.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Каждый class="-атрибут с классом `cls` несёт и `ui-vh` (разметка канона
 *  сопровождает семантический класс утилитой — T17.2). */
const allCarryVh = (source, cls) => {
  const attrs = [...source.matchAll(/class="([^"]*)"/g)]
    .map((match) => match[1].split(/\s+/))
    .filter((list) => list.includes(cls));
  return { total: attrs.length, withVh: attrs.filter((list) => list.includes('ui-vh')).length };
};

describe('base/reset.css — канон утилиты .ui-vh (T17.2)', () => {
  const raw = readFileSync(join(root, 'base', 'reset.css'), 'utf8');
  const css = stripCssComments(raw);
  const vh = blockOf(css, '.ui-vh');

  it('правило найдено; набор — ровно канон: 1px-бокс вне потока, margin −1px, padding 0, border 0, nowrap, clip-path inset(50%) (Implementation requirements п.1)', () => {
    expect(vh, 'правило .ui-vh в base/reset.css').toBeTruthy();
    expect(vh).toContain('box-sizing: border-box;');
    expect(vh).toContain('position: absolute;');
    expect(vh).toContain('overflow: hidden;');
    expect(vh).toContain('width: 1px;');
    expect(vh).toContain('height: 1px;');
    expect(vh).toContain('margin: -1px;');
    expect(vh).toContain('padding: 0;');
    expect(vh).toContain('border: 0;');
    expect(vh).toContain('white-space: nowrap;');
    expect(vh).toContain('clip-path: inset(50%);');
  });

  it('современный стандарт: clip-path, НЕ clip-легаси (в отличие от ui-skip-link); подмены display/visibility/opacity не применяются', () => {
    expect(vh, 'clip — легаси-дублёр, в канон не входит').not.toMatch(/(?:^|\s)clip:/);
    expect(vh, 'display:none убрал бы текст из a11y-дерева').not.toMatch(/display:\s*none/);
    expect(vh).not.toMatch(/visibility:\s*hidden/);
    expect(vh).not.toMatch(/opacity:\s*0/);
  });

  it('утилита не участвует в forced-colors-особенностях (Implementation requirements п.2: скрытие остаётся скрытием)', () => {
    expect(css, 'forced-colors-исключений для скрытия в reset.css нет').not.toContain(
      'forced-colors',
    );
  });

  it('инварианты base: без !important и hex (перекраска vi.css, §5)', () => {
    expect(vh, '!important — только a11y/vi.css (инвариант системы)').not.toContain('!important');
    expect(vh).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('dist — класс доезжает до сайтов (unit-пин регресса сборки)', () => {
  // Читатели собранного dist дожидаются билда прогона (tests/helpers/
  // unit-build.mjs, T13.7): в свежем CI-чекауте dist ещё нет, и параллельный
  // билдер tokens-stand/themes мог не успеть к этому воркеру (флак ENOENT,
  // ловили на stat-пине, CI 40212544247).
  beforeAll(async () => {
    await buildForUnitTests(root);
  }, 60000);

  it('dist/ui-core.min.css содержит .ui-vh с клипом (base в ядре — CSS_CORE_ORDER showcase/build.mjs)', () => {
    const core = readFileSync(join(root, 'dist', 'ui-core.min.css'), 'utf8');
    expect(core, 'класс .ui-vh в собранном ядре').toContain('.ui-vh');
    expect(core, 'канонический клип в собранном ядре').toContain('inset(50%)');
  });

  // Пилотный dist требует чекаут career-portal (--ref, build.mjs:39–54) —
  // в CI его нет: тест выполняется там, где пилот собран (ночной гейт),
  // гард — по прецеденту tests/unit/pilot-link-gate.test.js:160.
  it.skipIf(!existsSync(join(root, 'pilot', 'career-portal', 'dist', 'ds', 'ui-core.min.css')))(
    'пилот: скопированное в dist/ds ядро несёт .ui-vh — утилита доступна страницам пилота (build.mjs копирует dist/ → dist/ds/)',
    () => {
      const pilotCore = readFileSync(
        join(root, 'pilot', 'career-portal', 'dist', 'ds', 'ui-core.min.css'),
        'utf8',
      );
      expect(pilotCore, '.ui-vh в рантайме ДС пилота').toContain('.ui-vh');
    },
  );
});

describe('локальные дубли сняты (AC: grep — sr-only-блоков в компонентах нет)', () => {
  it('ui-field.css: локального правила .ui-field__req-text нет, clip-приём из компонента ушёл', () => {
    const css = stripCssComments(
      readFileSync(join(root, 'components', 'ui-field', 'ui-field.css'), 'utf8'),
    );
    expect(blockOf(css, '.ui-field__req-text'), 'sr-only-блок снят (T17.2)').toBeNull();
    expect(css, 'clip-path больше не живёт в ui-field.css').not.toContain('clip-path');
  });

  it('ui-file.css: локального правила .ui-file__input нет, clip-приём из компонента ушёл (класс остаётся хуком :has-фокуса и JS)', () => {
    const css = stripCssComments(
      readFileSync(join(root, 'components', 'ui-file', 'ui-file.css'), 'utf8'),
    );
    expect(blockOf(css, '.ui-file__input'), 'sr-only-блок снят (T17.2)').toBeNull();
    expect(css, 'clip-path больше не живёт в ui-file.css').not.toContain('clip-path');
  });

  it('во всех CSS компонентов полный канонический набор (1px + margin −1px + clip-path) не встречается — единственное исключение ui-skip-link (другой приём, Out of scope)', () => {
    const componentsDir = join(root, 'components');
    for (const name of readdirSync(componentsDir)) {
      const cssPath = join(componentsDir, name, `${name}.css`);
      let css;
      try {
        css = stripCssComments(readFileSync(cssPath, 'utf8'));
      } catch {
        continue; // компонент без CSS (например, ui-vi) — не рассматривается
      }
      if (name === 'ui-skip-link') continue; // раскрытие при фокусе — другой приём (T3.5)
      const blocks = css.match(/\{[^}]*\}/g) ?? [];
      const fullSrOnly = blocks.filter(
        (block) =>
          block.includes('width: 1px') &&
          block.includes('margin: -1px') &&
          block.includes('clip-path: inset(50%)'),
      );
      expect(fullSrOnly, `${name}.css: полный sr-only-набор — только в base/.ui-vh`).toHaveLength(
        0,
      );
    }
  });
});

describe('разметка канона несёт .ui-vh рядом с семантическим классом', () => {
  const carriers = [
    ['components/ui-field/ui-field.html', 'ui-field__req-text'],
    ['components/ui-form/ui-form.html', 'ui-field__req-text'],
    ['components/ui-checkbox/ui-checkbox.html', 'ui-field__req-text'],
    ['components/ui-radio-group/ui-radio-group.html', 'ui-field__req-text'],
    ['components/ui-file/ui-file.html', 'ui-field__req-text'],
    ['components/ui-file/ui-file.html', 'ui-file__input'],
    ['patterns/form-page/form-page.html', 'ui-field__req-text'],
    ['showcase/pages/ui-field/index.html', 'ui-field__req-text'],
    ['showcase/pages/ui-form/index.html', 'ui-field__req-text'],
    ['showcase/pages/ui-file/index.html', 'ui-field__req-text'],
    ['showcase/pages/ui-file/index.html', 'ui-file__input'],
    ['showcase/pages/integration/form-full-cycle/index.html', 'ui-field__req-text'],
    ['components/ui-field/README.md', 'ui-field__req-text'],
    ['components/ui-file/README.md', 'ui-field__req-text'],
    ['components/ui-file/README.md', 'ui-file__input'],
    ['components/ui-checkbox/README.md', 'ui-field__req-text'],
    ['components/ui-radio-group/README.md', 'ui-field__req-text'],
  ];

  it.each(carriers)('%s: каждое вхождение %s сопровождено ui-vh', (relPath, cls) => {
    const source = readFileSync(join(root, relPath), 'utf8');
    const { total, withVh } = allCarryVh(source, cls);
    expect(total, `${relPath}: класс ${cls} используется`).toBeGreaterThan(0);
    expect(withVh, `${relPath}: все ${total} вхождений ${cls} несут ui-vh`).toBe(total);
  });
});

describe('пилот: cp-vh → ui-vh (AC T17.2)', () => {
  const build = readFileSync(join(root, 'pilot', 'career-portal', 'build.mjs'), 'utf8');
  const pilotCss = stripCssComments(
    readFileSync(join(root, 'pilot', 'career-portal', 'pilot.css'), 'utf8'),
  );

  it('build.mjs: подписи select-пилюль — label class="ui-vh" (было cp-vh); cp-vh в исходнике пилота не осталось', () => {
    expect(build, 'пилюля фильтра скрывается утилитой ДС').toMatch(
      /label class="ui-vh" for="\$\{fieldId\}"/,
    );
    expect(build, 'cp-vh удалён из генератора').not.toContain('cp-vh');
  });

  it('build.mjs: канонические req-text и файловый инпут пилота несут ui-vh', () => {
    const req = allCarryVh(build, 'ui-field__req-text');
    expect(req.total, 'req-text в разметке пилота используется').toBeGreaterThan(0);
    expect(req.withVh, 'все req-text пилота скрыты утилитой').toBe(req.total);

    const input = allCarryVh(build, 'ui-file__input');
    expect(input.total).toBeGreaterThan(0);
    expect(input.withVh, 'файловый инпут пилота скрыт утилитой').toBe(input.total);
  });

  it('pilot.css: правило .cp-vh удалено — приём перенесён в ДС (один приём в одном месте)', () => {
    expect(pilotCss, 'строки cp-vh в pilot.css нет').not.toContain('cp-vh');
  });
});
