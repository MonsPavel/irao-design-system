/**
 * Юнит-тест механизма тем (задача T2.4) — themes/ и фикстура совместимости.
 *
 * Машинная форма приёмки T2.4 (исполняемая в доступной инфраструктуре —
 * Vitest; браузерные computed-style-сценарии «Testing requirements» фиксируются
 * здесь статически и фактически гоняются по собранному showcase, см. доку
 * «Как пользоваться токенами» → «Темы»; постоянный e2e-гейт — T1.4):
 *
 *  1. форма темы themes/theme-test.css: один блок [data-ui-theme="test"]
 *     (Technical considerations T2.4: атрибут фиксируется на <html>), 5–7
 *     кастом-свойств, имена — только семантический слой (tokens/semantic.css),
 *     цветовые значения — ровно один var() с вычислимой цепочкой до примитива,
 *     каждое значение ≠ дефолту :root (иначе тема ничего не доказывает);
 *  2. сборка: тема лежит в dist/themes/ (AC T2.4), переключатель ?theme=
 *     каркаса showcase выставляет её опцию и data-ui-theme на <html>;
 *  3. фикстура совместимости «старая тема + новый токен» (Implementation
 *     requirements T2.4 п.2, AC): tests/lint-cases/css/themes/theme-old-compat.css
 *     знает подмножество токенов; merged-каскад (примитивы + семантика +
 *     фикстура) вычислим для КАЖДОГО семантического токена — не переопределённые
 *     работают дефолтом :root (в т.ч. «новый» --ui-color-info);
 *  4. stylelint-гейт themes/ (Implementation requirements T2.4 п.1): в конфиге
 *     есть override для каталога themes/ — правило irao/theme-semantic-overrides
 *     включено со списком семантических имён, запрет ссылок на примитивы снят
 *     (значения тем — ссылки на примитивы, как в самом слое 2).
 *
 * Поведенческая часть гейта (фикстуры «пойман/не пойман») —
 * tests/lint-cases/css/themes/* + npm run test:lint.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import stylelintConfig from '../../stylelint.config.mjs';
import { resolveTokenColor } from '../contrast/lib.mjs';

const root = join(import.meta.dirname, '../..');
const THEME_SOURCE = join(root, 'themes', 'theme-test.css');
const THEME_DIST = join(root, 'dist', 'themes', 'theme-test.css');
const FIXTURE_SOURCE = join(root, 'tests', 'lint-cases', 'css', 'themes', 'theme-old-compat.css');
const STAND_SOURCE = join(root, 'showcase', 'dist', 'stands', 'tokens.html');

/** «Новый» токен core, которого «не знает» старая тема (пометка «новый» в semantic.css). */
const NEW_TOKEN = '--ui-color-info';

/** Строка без блочных комментариев. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Все объявления файла: Map «имя → значение» (база :root без media). */
function parseDeclarations(css) {
  const withoutMedia = css.replace(/@media\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
  return new Map(
    [...withoutMedia.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

/** Единственный блок селектор → Map объявлений (для файлов тем, без media). */
function parseTheme(css) {
  const stripped = stripComments(css);
  const match = stripped.match(/^([^{}]+)\{([\s\S]*)\}\s*$/);
  expect(match, 'файл темы — один блок «селектор { объявления }»').not.toBeNull();
  return { selector: match[1].trim(), declarations: parseDeclarations(match[2]) };
}

const primitives = parseDeclarations(
  stripComments(readFileSync(join(root, 'tokens/primitives.css'), 'utf8')),
);
const semantic = parseDeclarations(
  stripComments(readFileSync(join(root, 'tokens/semantic.css'), 'utf8')),
);
const core = new Map([...primitives, ...semantic]);

beforeAll(async () => {
  // Реальная сборка: dist/themes + страницы showcase генерируются из исходников.
  execFileSync(execPath, ['showcase/build.mjs'], { cwd: root, stdio: 'pipe' });
}, 60000);

describe('themes/theme-test.css — форма темы (AC T2.4, ADR-0009)', () => {
  const theme = parseTheme(readFileSync(THEME_SOURCE, 'utf8'));

  it('один блок data-ui-theme="test" (атрибут механизма — фиксация T2.4; кавычки — стиль prettier)', () => {
    expect(theme.selector).toMatch(/^\[data-ui-theme=(?:"|')test(?:"|')\]$/);
  });

  it('переопределяет 5–7 семантических токенов (Scope T2.4)', () => {
    const size = theme.declarations.size;
    expect(size).toBeGreaterThanOrEqual(5);
    expect(size).toBeLessThanOrEqual(7);
  });

  it('имена — только семантический слой: каждый токен определён в tokens/semantic.css', () => {
    for (const name of theme.declarations.keys()) {
      expect(semantic.has(name), `${name} — не семантический токен (слой 2)`).toBe(true);
    }
  });

  it('цветовые значения — ровно один var() с вычислимой цепочкой до примитива', () => {
    const themed = new Map([...core, ...theme.declarations]);
    for (const [name, value] of theme.declarations) {
      if (!name.includes('color')) continue;
      expect(value, `${name}: ${value} — не одиночный var()`).toMatch(/^var\(--ui-[a-z0-9-]+\)$/);
      const reference = value.match(/^var\((--[a-z0-9-]+)\)$/)[1];
      expect(
        primitives.has(reference) || semantic.has(reference),
        `${name} ссылается на неопределённый токен ${reference}`,
      ).toBe(true);
      expect(() => resolveTokenColor(name, themed), `${name} не вычислим`).not.toThrow();
    }
  });

  it('каждое значение ≠ дефолту :root (иначе тема не доказывает механизм)', () => {
    for (const [name, value] of theme.declarations) {
      expect(value, `${name} повторяет дефолт :root`).not.toBe(semantic.get(name));
    }
  });
});

describe('тема в сборке и на стендах (AC T2.4)', () => {
  it('тема лежит в dist/themes/ и равна исходнику (AC T2.4)', () => {
    expect(existsSync(THEME_DIST), 'dist/themes/theme-test.css отсутствует').toBe(true);
    expect(readFileSync(THEME_DIST, 'utf8')).toBe(readFileSync(THEME_SOURCE, 'utf8'));
  });

  it('переключатель ?theme= на стенде: опция test + data-ui-theme на <html>', () => {
    const stand = readFileSync(STAND_SOURCE, 'utf8');
    expect(stand, 'опция темы test в переключателе').toContain(
      '<option value="test">test</option>',
    );
    expect(stand, 'data-theme-base у переключателя').toContain('data-theme-base=');
    expect(stand, 'data-ui-theme выставляется на documentElement').toContain(
      "document.documentElement.setAttribute('data-ui-theme'",
    );
    expect(stand, 'тема запрашивается из query ?theme=').toContain(
      "new URLSearchParams(window.location.search).get('theme')",
    );
  });
});

describe('фикстура совместимости: старая тема + новый токен (AC T2.4)', () => {
  const fixture = parseTheme(readFileSync(FIXTURE_SOURCE, 'utf8'));

  it('старая тема знает только подмножество семантических токенов (меньше тестовой темы)', () => {
    expect(fixture.selector).toBe('[data-ui-theme="old-compat"]');
    expect(fixture.declarations.size).toBeGreaterThan(0);
    expect(fixture.declarations.size).toBeLessThan(
      parseTheme(readFileSync(THEME_SOURCE, 'utf8')).declarations.size,
    );
    for (const name of fixture.declarations.keys()) {
      expect(semantic.has(name), `${name} — не семантический токен`).toBe(true);
    }
  });

  it(`старая тема не переопределяет «новый» токен ${NEW_TOKEN} — работает дефолт :root`, () => {
    expect(fixture.declarations.has(NEW_TOKEN)).toBe(false);
    const themed = new Map([...core, ...fixture.declarations]);
    expect(resolveTokenColor(NEW_TOKEN, themed)).toBe(resolveTokenColor(NEW_TOKEN, core));
  });

  it('каскад с фикстурой вычислим для каждого семантического токена (визуал валиден)', () => {
    const themed = new Map([...core, ...fixture.declarations]);
    for (const name of semantic.keys()) {
      if (!name.includes('color')) continue;
      // Валидность: ни одна var()-ссылка не повисает — переопределённые токены
      // дают значения фикстуры, остальные и производные (chain через primary
      // и т.п.) — значения core с учётом переопределений, как в браузере.
      // Альфа-токены (surface-translucent, стекло) lib контраста до непрозрачного
      // цвета не доводит сознательно (исключения pairs.config.mjs) — для
      // валидности темы достаточно, что ссылка определена.
      let resolved;
      try {
        resolved = resolveTokenColor(name, themed);
      } catch (error) {
        expect(
          error.message.startsWith('альфа-цвет'),
          `${name} не вычислим со старой темой: ${error.message}`,
        ).toBe(true);
        continue;
      }
      if (fixture.declarations.has(name)) {
        const reference = fixture.declarations.get(name).match(/^var\((--[a-z0-9-]+)\)$/)[1];
        expect(resolved, `${name} не взял значение фикстуры`).toBe(
          resolveTokenColor(reference, themed),
        );
      }
    }
    // Механизм: производный слой 2 следует за переопределением (фикстура
    // красит primary → surface-dark, читающий primary, едет следом).
    expect(resolveTokenColor('--ui-color-surface-dark', themed)).toBe(
      resolveTokenColor('--ui-color-primary', themed),
    );
  });
});

describe('stylelint-гейт themes/ (Implementation requirements T2.4 п.1)', () => {
  const RULE = 'irao/theme-semantic-overrides';

  it('override каталога themes/: гейт включён, запрет примитивов снят (значения тем — слой 1)', () => {
    const override = stylelintConfig.overrides.find((entry) =>
      entry.files.includes('**/themes/**'),
    );
    expect(override, 'нет override для themes/ в stylelint.config.mjs').toBeDefined();
    // Опция правила — [список]: stylelint читает значение как [primary, secondary].
    const [options] = override.rules[RULE];
    expect(Array.isArray(options), `${RULE} получил список имён`).toBe(true);
    expect(new Set(options)).toEqual(new Set(semantic.keys()));
    expect(override.rules['irao/no-primitive-token-references']).toBeNull();
  });
});
