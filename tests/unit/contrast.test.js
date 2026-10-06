/**
 * Юнит-тест контраст-гейта AA — tests/contrast/ (задача T2.3).
 *
 * «Testing requirements» T2.3: скрипт — сам тест; негативный кейс (тонкий
 * серый) красный. Проверяется:
 *  1. математика WCAG 2.1 (1.4.3): относительная светлота и коэффициент;
 *  2. НЕГАТИВНЫЙ КЕЙС: muted-серый career-portal #808080 (≈3.95:1 на белом)
 *     не проходит порог 4.5:1 — гейт обязан это поймать (красный);
 *  3. дефолтная палитра зелёная: все пары конфига ≥ порогов, каждый
 *     цветовой токен слоя 2 — в паре или в осознанном исключении
 *     (Implementation requirements T2.3 п.1–2: новый цвет без пары — красный);
 *  4. var()-цепочки resolve до примитивов; циклы/неизвестные имена — ошибка;
 *  5. CLI: exit 0 + markdown-отчёт на дефолтной палитре; СПЕЦИАЛЬНО
 *     ИЗМЕНЁННЫЙ ТОКЕН (muted → #808080 во временной копии tokens/) валит
 *     прогон с exit 1 и нарушением в отчёте (AC 2).
 *
 * Пороги AA: обычный текст ≥ 4.5:1, крупный (≥24px / ≥19px bold) ≥ 3:1,
 * некстовые (контуры фокуса, индикаторы) ≥ 3:1.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { describe, expect, it } from 'vitest';
import { EXCEPTIONS, PAIRS } from '../../tests/contrast/pairs.config.mjs';
import {
  THRESHOLDS,
  contrastRatio,
  evaluateContrast,
  resolveTokenColor,
} from '../../tests/contrast/lib.mjs';

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

/** Временный каталог с копией tokens/ (для CLI-кейсов). */
function makeTempTokensDir(rewrite) {
  const dir = mkdtempSync(join(tmpdir(), 'irao-contrast-'));
  const semanticSource = readFileSync(join(root, 'tokens/semantic.css'), 'utf8');
  copyFileSync(join(root, 'tokens/primitives.css'), join(dir, 'primitives.css'));
  writeFileSync(join(dir, 'semantic.css'), rewrite(semanticSource));
  return dir;
}

describe('контраст-гейт: математика WCAG 2.1 (1.4.3)', () => {
  it('пороги AA: текст 4.5, крупный/некстовые 3', () => {
    expect(THRESHOLDS).toEqual({ text: 4.5, large: 3, 'non-text': 3 });
  });

  it('чёрный на белом = 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('тонкий серый #808080 на белом ≈ 3.95:1 — ниже порога текста 4.5:1', () => {
    // Аудит 01 §6 называет ≈3.54:1; точное значение по формуле WCAG — 3.95:1.
    // Вердикт одинаков: пары не проходят AA для обычного текста.
    expect(contrastRatio('#808080', '#ffffff')).toBeLessThan(4.5);
    expect(contrastRatio('#808080', '#ffffff')).toBeCloseTo(3.95, 2);
  });

  it('полупрозрачный цвет без подложки не вычислим — resolve обязан падать', () => {
    const bothLayers = new Map([...primitives, ...semantic]);
    expect(() => resolveTokenColor('--ui-color-glass-light', bothLayers)).toThrow(/альф/i);
  });
});

describe('контраст-гейт: негативный кейс — тонкий серый красный (Tests first T2.3)', () => {
  it('muted = career-portal #808080 (var(--ui-gray-600)) валит пары muted-on-*', () => {
    const thinGray = new Map(semantic);
    thinGray.set('--ui-color-text-muted', 'var(--ui-gray-600)');
    const result = evaluateContrast({
      primitives,
      semantic: thinGray,
      pairs: PAIRS,
      exceptions: EXCEPTIONS,
    });
    expect(result.configErrors).toEqual([]);
    expect(result.violations.length).toBeGreaterThan(0);
    const mutedOnSurface = result.violations.find((row) => row.id === 'muted-on-surface');
    expect(mutedOnSurface).toBeDefined();
    expect(mutedOnSurface.fgValue).toBe('#808080');
    expect(mutedOnSurface.threshold).toBe(4.5);
    expect(mutedOnSurface.ratio).toBeLessThan(4.5);
    expect(mutedOnSurface.ratio).toBeGreaterThan(3.9);
  });

  it('цветовой токен без пары и без исключения — красный (новый токен не проскочит)', () => {
    const pairsWithoutInfo = PAIRS.filter(
      (pair) => pair.fg !== '--ui-color-info' && pair.bg !== '--ui-color-info',
    );
    const result = evaluateContrast({
      primitives,
      semantic,
      pairs: pairsWithoutInfo,
      exceptions: EXCEPTIONS,
    });
    expect(result.coverageGaps).toContain('--ui-color-info');
  });

  it('пара с неизвестным токеном — ошибка конфига, а не тихий пропуск', () => {
    const broken = [
      ...PAIRS,
      {
        id: 'broken',
        fg: '--ui-color-nope',
        bg: '--ui-color-surface',
        level: 'text',
        usage: 'тест',
      },
    ];
    const result = evaluateContrast({
      primitives,
      semantic,
      pairs: broken,
      exceptions: EXCEPTIONS,
    });
    expect(result.configErrors.join(' ')).toMatch(/--ui-color-nope/);
  });

  it('токен-исключение, найденный в паре, — ошибка конфига (обещание pairs.config.mjs)', () => {
    // Ревью T2.3 (high): --ui-color-text — fg пары text-on-surface; исключение
    // для токена из пары — рассинхрон конфига, обязан быть ошибкой, а не
    // молчаливым зелёным.
    const result = evaluateContrast({
      primitives,
      semantic,
      pairs: PAIRS,
      exceptions: [...EXCEPTIONS, { token: '--ui-color-text', reason: 'тест конфликта' }],
    });
    expect(result.configErrors).toHaveLength(1);
    expect(result.configErrors[0]).toMatch(/--ui-color-text/);
    expect(result.configErrors[0]).toMatch(/также используется в паре/);
  });

  it('цикл в var()-цепочке обнаружен', () => {
    const cyclic = new Map([
      ['--ui-a', 'var(--ui-b)'],
      ['--ui-b', 'var(--ui-a)'],
    ]);
    expect(() => resolveTokenColor('--ui-a', cyclic)).toThrow(/цикл/i);
  });
});

describe('контраст-гейт: дефолтная палитра зелёная (AC 1)', () => {
  const result = evaluateContrast({
    primitives,
    semantic,
    pairs: PAIRS,
    exceptions: EXCEPTIONS,
  });

  it('все пары конфига проверены и прошли порог', () => {
    expect(result.configErrors).toEqual([]);
    expect(result.rows).toHaveLength(PAIRS.length);
    expect(result.violations).toEqual([]);
  });

  it('каждый цветовой токен слоя 2 — в паре или в осознанном исключении', () => {
    expect(result.coverageGaps).toEqual([]);
  });

  it('все текстовые пары ≥ 4.5:1 (крупные/некстовые ≥ 3:1 — уровни из конфига)', () => {
    for (const row of result.rows) {
      expect(row.ratio, `${row.id}: ${row.ratio} < ${row.threshold}`).toBeGreaterThanOrEqual(
        row.threshold,
      );
    }
  });

  it('muted-серый после AA-замены проходит 4.5:1 на всех своих поверхностях', () => {
    expect(resolveTokenColor('--ui-color-text-muted', new Map([...primitives, ...semantic]))).toBe(
      '#616161',
    );
    for (const row of result.rows.filter((r) => r.fgToken === '--ui-color-text-muted')) {
      expect(row.ratio, row.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('контраст-гейт: CLI (exit-код = CI-шаг, AC 1/2)', () => {
  it('дефолтная палитра: exit 0, markdown-отчёт записан', () => {
    const reportPath = join(mkdtempSync(join(tmpdir(), 'irao-contrast-')), 'report.md');
    const run = spawnSync(
      execPath,
      [join(root, 'tests/contrast/check.mjs'), '--report', reportPath],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    expect(run.stdout, run.stderr).toMatch(/RESULT: OK/);
    expect(run.status).toBe(0);
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('# Контраст-отчёт irao-ui');
    expect(report).toContain('muted-on-surface');
  });

  it('AC 2: специально изменённый токен (muted → #808080) валит прогон — exit 1', () => {
    const tokensDir = makeTempTokensDir((source) =>
      source.replace(
        /--ui-color-text-muted:\s*var\(--ui-[a-z0-9-]+\)/,
        '--ui-color-text-muted: var(--ui-gray-600)',
      ),
    );
    const reportPath = join(mkdtempSync(join(tmpdir(), 'irao-contrast-')), 'report.md');
    const run = spawnSync(
      execPath,
      [join(root, 'tests/contrast/check.mjs'), '--tokens', tokensDir, '--report', reportPath],
      { cwd: root, encoding: 'utf8' },
    );
    expect(run.status).toBe(1);
    expect(run.stdout).toMatch(/AA-НАРУШЕНИЯ/);
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('AA-НАРУШЕНИЯ');
    expect(report).toContain('muted-on-surface');
    rmSync(tokensDir, { recursive: true, force: true });
  });
});
