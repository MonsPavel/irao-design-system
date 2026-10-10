/**
 * Юнит-пин боевого релизного конвейера (T12.1) — контент-пины поверх
 * структурных контрактов tools/validate-workflows.mjs (исполняемая
 * спецификация: гейты changelog/протокола, VI-smoke, проверка структуры zip
 * §6.1, GitHub Release, nightly advisory-visual).
 *
 * Паттерн — tests/unit/scaling.test.js: чтение текста воркфлоу и валидатора.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const release = readFileSync(join(root, '.github', 'workflows', 'release.yml'), 'utf8');
const nightly = readFileSync(join(root, '.github', 'workflows', 'nightly.yml'), 'utf8');
const validator = readFileSync(join(root, 'tools', 'validate-workflows.mjs'), 'utf8');

describe('release.yml: гейты → матрица → VI-smoke → build → dist-zip → GitHub Release', () => {
  it('джоба gates: changelog-гейт (tools/release-gate.mjs) — блокирующий', () => {
    expect(release, 'шаг релизного гейта в конвейере').toContain('tools/release-gate.mjs');
    expect(release, 'протокол скринридеров T9.2 — обязательный exit 0').toContain(
      'tests/a11y/protocol-gate.mjs',
    );
  });

  it('джоба vi-smoke: VI-включение (ui-vi.spec.js) и axe-обход стендов (stands-sweep) — блокирующие', () => {
    expect(release, 'VI-включение — релизный smoke (T9.1)').toContain(
      'tests/e2e/ui-vi.spec.js',
    );
    expect(release, 'axe-прогон ключевых стендов').toContain('tests/a11y/stands-sweep.spec.js');
  });

  it('проверка структуры zip §6.1 в джобе сборки (implementation requirements 1)', () => {
    for (const entry of [
      'dist/ui-core.min.css',
      'dist/ui-vi.min.css',
      'dist/ui.min.js',
      'dist/fonts/',
      'dist/themes/',
    ]) {
      expect(release, `структура zip §6.1: ${entry}`).toContain(entry);
    }
    expect(release, 'проверка содержимого артефакта — unzip -l').toContain('unzip -l');
    expect(release, 'версия баннера dist = тег (T1.3)').toContain('irao-ui v');
  });

  it('GitHub Release: gh release create из артефакта + тело из changelog, только на тегах', () => {
    expect(release, 'релиз создаётся gh CLI (allowlist actions — сторонних нет)').toContain(
      'gh release create',
    );
    expect(release, 'артефакт скачивается download-artifact').toContain(
      'actions/download-artifact@v4',
    );
    expect(release, 'release notes — запись changelog (--extract)').toContain('--extract');
    expect(release, 'Release только для тегов (workflow_dispatch не публикует)').toContain(
      "refs/tags/",
    );
    expect(release, 'права на публикацию — contents: write у джобы релиза').toContain(
      'contents: write',
    );
  });

  it('некаркасные комментарии: боевой режим описан, T1.5-каркас упомянут в истории', () => {
    expect(release, 'шапка описывает боевой режим T12.1').toContain('T12.1');
    expect(release, 'гейт масштабирования остаётся в полном прогоне матрицы').toContain(
      'scaling.spec.js',
    );
  });
});

describe('nightly.yml: матрица + advisory-visual (до v1.0, ADR-0004)', () => {
  it('отдельная джоба visual: сравнение эталонов chromium с IRAO_SNAPSHOTS=1', () => {
    expect(nightly, 'джоба visual в ночи').toContain('Visual regression');
    expect(nightly, 'сравнение эталонов — IRAO_SNAPSHOTS=1 только у visual').toContain(
      "IRAO_SNAPSHOTS: '1'",
    );
    expect(nightly, 'эталоны пишет/сравнивает только chromium (ADR-0004)').toContain(
      '--project=chromium',
    );
  });

  it('advisory-механика как в ci.yml: continue-on-error на шаге, дифы always(), краска по outcome', () => {
    const visualBlock = nightly.slice(nightly.indexOf('Visual regression'));
    expect(visualBlock, 'continue-on-error только на шаге прогона').toContain(
      'continue-on-error: true',
    );
    expect(visualBlock, 'диф-артефакт прикладывается всегда').toContain('-diff.png');
    expect(visualBlock, 'чек отражает расхождение (финальная краска)').toContain(
      'steps.visual.outcome',
    );
  });

  it('валидатор закрепляет новые контракты T12.1 (исполняемая спецификация)', () => {
    for (const contract of [
      'release: нет джобы гейтов (changelog/версия/протокол)',
      'release: нет джобы VI-smoke (T9.1)',
      'release: нет проверки структуры zip (§6.1)',
      'release: нет джобы публикации GitHub Release',
      'nightly: нет advisory-visual джобы (T12.1, ADR-0004)',
    ]) {
      expect(validator, `контракт валидатора: ${contract}`).toContain(contract);
    }
  });
});
