/**
 * Юнит-тест ревизии контраста ПРОИЗВОДНЫХ состояний (задача T9.2).
 *
 * «Testing requirements» T9.2: сценарии — до прогона. Проверяется:
 *  1. математика color-mix(in srgb, base P%, black): каналы 8-бит, округление
 *     браузера (88% blue-800 #002856 → #00234c — значение ADR-0010);
 *  2. разрешение спецификаций fg/bg: токен (var()-цепочка) и mix-спека;
 *     неизвестный токен / процент вне 0–100 — ошибка конфига, не падение;
 *  3. НЕГАТИВНЫЙ КЕЙС: пара ниже порога без исключения — нарушение (гейт
 *     обязан быть красным); та же пара с исключением — в exceptions, прогон
 *     зелёный (Implementation requirements T9.2 п.2: нарушение → исключение
 *     с обоснованием или фикс);
 *  4. дефолтная палитра зелёная: конфиг derived.config.mjs против реальных
 *     токенов — 0 нарушений вне осознанных исключений (все известные разрывы
 *     — акцентный hover и фокус на тёмном — записаны исключениями);
 *  5. CLI: exit 0 + markdown-отчёт на дефолтной палитре; изменённый токен
 *     во временной копии tokens/ валит прогон с exit 1.
 *
 * Пороги: кнопочные пары — «крупные элементы ≥ 3:1» (чек-лист T9.2/ADR-0010),
 * ссылки/крошки — обычный текст 4.5:1, фокус — некстовые 3:1.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { describe, expect, it } from 'vitest';
import { DERIVED_EXCEPTIONS, DERIVED_PAIRS } from '../../tests/contrast/derived.config.mjs';
import {
  mixInSrgb,
  resolveColorSpec,
  evaluateDerivedContrast,
} from '../../tests/contrast/derived-lib.mjs';

const root = join(import.meta.dirname, '../..');

/** Карты объявлений «имя токена → значение» из файлов репозитория. */
function loadDeclarations(file) {
  const source = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = new Map();
  for (const [, name, value] of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(name, value.trim());
  }
  return declarations;
}

const primitives = loadDeclarations('tokens/primitives.css');
const semantic = loadDeclarations('tokens/semantic.css');

describe('ревизия производных: математика color-mix', () => {
  it('88% blue-800 + black = #00234c (значение ADR-0010, округление 8 бит)', () => {
    expect(mixInSrgb('#002856', 88, '#000000')).toBe('#00234c');
  });

  it('100% база не меняет цвет, 0% даёт цвет подмешивания', () => {
    expect(mixInSrgb('#f26722', 100, '#000000')).toBe('#f26722');
    expect(mixInSrgb('#f26722', 0, '#123456')).toBe('#123456');
  });

  it('50% белый + чёрный = #808080', () => {
    expect(mixInSrgb('#ffffff', 50, '#000000')).toBe('#808080');
  });
});

describe('ревизия производных: спецификации цвета', () => {
  it('токен resolve по var()-цепочке до примитива', () => {
    expect(resolveColorSpec({ token: '--ui-color-primary-hover' }, primitives, semantic)).toBe(
      '#164b89',
    );
  });

  it('mix-спека resolve от токена базы', () => {
    expect(
      resolveColorSpec(
        { mix: { base: '--ui-color-accent', percent: 88, with: '#000000' } },
        primitives,
        semantic,
      ),
    ).toBe('#d55b1e');
  });

  it('неизвестный токен и процент вне 0–100 — ошибки конфига (в evaluate)', () => {
    const pairs = [
      {
        id: 'bad-token',
        level: 'large',
        fg: { token: '--ui-nope' },
        bg: { token: '--ui-color-surface' },
        usage: 'тест',
      },
      {
        id: 'bad-percent',
        level: 'large',
        fg: { token: '--ui-color-text' },
        bg: { mix: { base: '--ui-color-primary', percent: 188, with: '#000000' } },
        usage: 'тест',
      },
    ];
    const result = evaluateDerivedContrast({
      primitives,
      semantic,
      pairs,
      exceptions: [],
    });
    expect(result.configErrors).toHaveLength(2);
  });

  it('дубль id и исключение для неизвестной пары — ошибки конфига', () => {
    const pair = {
      id: 'x',
      level: 'large',
      fg: { token: '--ui-color-text' },
      bg: { token: '--ui-color-surface' },
      usage: 'тест',
    };
    const result = evaluateDerivedContrast({
      primitives,
      semantic,
      pairs: [pair, { ...pair, usage: 'дубль' }],
      exceptions: [{ id: 'нет-такой', reason: 'тест' }],
    });
    expect(result.configErrors.some((e) => e.includes('дубль'))).toBe(true);
    expect(result.configErrors.some((e) => e.includes('нет-такой'))).toBe(true);
  });
});

describe('ревизия производных: гейт', () => {
  it('НЕГАТИВНЫЙ КЕЙС: пара ниже порога без исключения — нарушение', () => {
    // accent-hover #f37131 — белая подпись 2.91:1 < 3:1 (известный разрыв).
    const pair = {
      id: 'accent-hover-label',
      level: 'large',
      fg: { token: '--ui-color-text-on-dark' },
      bg: { token: '--ui-color-accent-hover' },
      usage: 'тест',
    };
    const bare = evaluateDerivedContrast({ primitives, semantic, pairs: [pair], exceptions: [] });
    expect(bare.violations.map((r) => r.id)).toEqual(['accent-hover-label']);
    expect(bare.rows[0].ratio).toBeLessThan(3);

    const excepted = evaluateDerivedContrast({
      primitives,
      semantic,
      pairs: [pair],
      exceptions: [{ id: 'accent-hover-label', reason: 'одобренный дизайн' }],
    });
    expect(excepted.violations).toEqual([]);
    expect(excepted.exceptionRows.map((r) => r.id)).toEqual(['accent-hover-label']);
  });

  it('дефолтная палитра: 0 нарушений вне осознанных исключений (конфиг T9.2)', () => {
    const result = evaluateDerivedContrast({
      primitives,
      semantic,
      pairs: DERIVED_PAIRS,
      exceptions: DERIVED_EXCEPTIONS,
    });
    expect(result.configErrors).toEqual([]);
    expect(
      result.violations,
      `вне исключений не должно быть нарушений: ${JSON.stringify(result.violations)}`,
    ).toEqual([]);
    // Все известные разрывы зафиксированы исключениями.
    expect(result.exceptionRows.map((r) => r.id).sort()).toEqual(
      [...DERIVED_EXCEPTIONS.map((e) => e.id)].sort(),
    );
  });

  it('кнопочные производные проходят 3:1, ссылочные — 4.5:1 (факты отчёта)', () => {
    const result = evaluateDerivedContrast({
      primitives,
      semantic,
      pairs: DERIVED_PAIRS,
      exceptions: DERIVED_EXCEPTIONS,
    });
    const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));
    // Кнопочный hover primary — 8.74:1 (значение ADR-0010 п.6).
    expect(byId['btn-primary-hover'].ratio).toBeCloseTo(8.74, 1);
    // Акцентный hover — 2.91:1 (< 3:1) — исключение, значение не скрыто.
    expect(byId['btn-accent-hover'].ratio).toBeCloseTo(2.91, 1);
    // Активные color-mix-кнопки ≥ 3:1 (микс темнеет — контраст растёт).
    for (const id of [
      'btn-active-on-primary-mix',
      'btn-accent-active',
      'btn-light-active',
      'btn-ghost-active',
    ]) {
      expect(byId[id].ratio, id).toBeGreaterThanOrEqual(3);
    }
    // Ссылочные производные ≥ 4.5:1 на обеих тёмных поверхностях.
    for (const id of ['link-mix-primary', 'link-on-dark-mix', 'link-on-dark-mix-deep']) {
      expect(byId[id].ratio, id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('ревизия производных: CLI', () => {
  it('exit 0 + markdown-отчёт на дефолтной палитре', () => {
    const dir = mkdtempSync(join(tmpdir(), 'irao-derived-'));
    const report = join(dir, 'report.md');
    const run = spawnSync(
      execPath,
      [join(root, 'tests/contrast/derived.mjs'), '--report', report],
      { encoding: 'utf8', cwd: root },
    );
    expect(run.status, run.stderr).toBe(0);
    const reportText = readFileSync(report, 'utf8');
    rmSync(dir, { recursive: true, force: true });
    expect(reportText).toContain('Производные состояния');
  });

  it('изменённый токен валит прогон с exit 1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'irao-derived-'));
    // surface-hover уходит в gray-900 (= цвет текста) → пара btn-ghost-hover
    // (text × surface-hover) падает до 1:1.
    copyFileSync(join(root, 'tokens/primitives.css'), join(dir, 'primitives.css'));
    writeFileSync(
      join(dir, 'semantic.css'),
      readFileSync(join(root, 'tokens/semantic.css'), 'utf8').replace(
        '--ui-color-surface-hover: var(--ui-blue-100);',
        '--ui-color-surface-hover: var(--ui-gray-900);',
      ),
    );
    const run = spawnSync(
      execPath,
      [
        join(root, 'tests/contrast/derived.mjs'),
        '--tokens',
        dir,
        '--report',
        join(dir, 'report.md'),
      ],
      { encoding: 'utf8', cwd: root },
    );
    expect(run.status).toBe(1);
    expect(run.stdout).toContain('FAIL');
    rmSync(dir, { recursive: true, force: true });
  });
});
