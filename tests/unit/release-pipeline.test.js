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
    expect(release, 'VI-включение — релизный smoke (T9.1)').toContain('tests/e2e/ui-vi.spec.js');
    expect(release, 'axe-прогон ключевых стендов').toContain('tests/a11y/stands-sweep.spec.js');
  });

  it('проверка структуры zip §6.1 в джобе сборки (implementation requirements 1)', () => {
    for (const entry of [
      'dist/ui-core.min.css',
      'dist/ui-vi.min.css',
      // Паттерн-слой (T17.1) — опциональный файл поставки, едет в zip.
      'dist/ui-patterns.css',
      'dist/ui.min.js',
      // Ревью T12.2: dev-вариант части поставки (ui.dev.js, T12.2) — zip обязан
      // содержать его СТРУКТУРНО, а не «случайно уехал целиком» (zip -r dist).
      'dist/ui.dev.js',
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
      'refs/tags/',
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
      'gates: нет шага tools/release-gate.mjs (changelog-запись тега, версия = тегу)',
      'gates: нет шага tests/a11y/protocol-gate.mjs (релиз обязан получать exit 0 — T9.2)',
      'vi-smoke: needs не содержит matrix (матрица и smoke — блокирующие джобы релиза)',
      'build-dist: нет проверки структуры zip (§6.1): ',
      'release: нет джобы публикации GitHub Release (gh release create)',
      'release: нет guard refs/tags/ (workflow_dispatch не публикует Release)',
      'матрица release: container без options --user 1001',
      'матрица nightly: container без options --user 1001',
      'nightly: нет advisory-visual джобы (T12.1, ADR-0004)',
    ]) {
      expect(validator, `контракт валидатора: ${contract}`).toContain(contract);
    }
  });
});

describe('имена zip/артефактов — безопасные на workflow_dispatch (ревью T12.1 high)', () => {
  it('имя zip в build-dist константное: ref_name на ветках содержит «/» (task/T12.1)', () => {
    expect(release, 'константное имя zip без интерполяции ref_name').toContain(
      'zip -r irao-ui-dist.zip dist',
    );
    expect(
      release,
      'версия в имени ассета появляется только в release-джобе (только теги)',
    ).toContain('irao-ui-dist-${GITHUB_REF_NAME}.zip');
    const buildDistBlock = release.slice(
      release.indexOf('build-dist:'),
      release.indexOf('release:'),
    );
    expect(buildDistBlock, 'build-dist не интерполирует ref_name в имя zip').not.toContain(
      'irao-ui-dist-${',
    );
  });

  it('имена артефактов upload/download константные (upload-artifact v4 отклоняет «/»)', () => {
    expect(release, 'константное имя артефакта dist-zip').toContain('name: dist-release');
    expect(release).not.toMatch(/name: dist-\$\{\{ github\.ref_name \}\}/);
  });

  it('валидатор закрепляет контракт безопасных имён (исполняемая спецификация)', () => {
    for (const contract of [
      'release: имя zip в build-dist интерполирует ref_name',
      'release: артефактное имя',
    ]) {
      expect(validator, `контракт валидатора: ${contract}`).toContain(contract);
    }
  });
});

describe('релизный чек-лист: приёмочный демо-тег (AC1, ревью T12.1 high)', () => {
  const checklist = readFileSync(
    join(root, 'docs', 'ui-system', 'release', 'release-checklist.md'),
    'utf8',
  );

  it('AC1 «демо-тег проходит полный конвейер» закреплён как явный пункт приёмки', () => {
    expect(checklist, 'пункт приёмочного демо-тега присутствует').toContain('приёмочный демо-тег');
    expect(
      checklist,
      'критерий приёмки — зелёный release.yml на первом теге после T12.2',
    ).toContain('release.yml зелёным');
    expect(checklist, 'AC закрывается только по факту прогона').toContain('по факту');
  });
});
