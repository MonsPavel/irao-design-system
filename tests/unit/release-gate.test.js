/**
 * Юнит-пин релизного гейта (T12.1): changelog-запись тега + совпадение версии
 * package.json с тегом (баннеры dist = тег, T1.3; ADR-0007 — «CI блокирует
 * релиз без changelog-записи»).
 *
 * Требование тестирования T12.1 — «демо-релиз (успешный и «без changelog»)»:
 * демо-тег v0.1.0 с записью проходит гейт, демо-тег v0.2.0 без записи —
 * красный. Логика — чистая функция evaluateRelease(tag, changelog, version)
 * в tools/release-gate-lib.mjs (CLI — tools/release-gate.mjs, шаг джобы gates
 * release.yml); CHANGELOG.md самого репозитория — зона T12.2, поэтому до её
 * выполнения реальный тег честно красный («записи нет»).
 */
import { describe, expect, it } from 'vitest';
import { evaluateRelease, extractReleaseNotes } from '../../tools/release-gate-lib.mjs';

/** Keep a Changelog с записью демо-релиза (формат ADR-0007). */
const CHANGELOG_WITH_V010 = `# Changelog

## [v0.1.0] — 2026-10-10

### Added

- Первый предрелиз: токены, base, компоненты P0/P1.

## [Unreleased]

### Added

- Текущая работа.
`;

describe('релизный гейт: changelog-запись тега и версия = тегу (T12.1)', () => {
  it('УСПЕШНЫЙ ДЕМО-РЕЛИЗ: v0.1.0 с записью в changelog и версией 0.1.0 — ok', () => {
    const result = evaluateRelease('v0.1.0', CHANGELOG_WITH_V010, '0.1.0');
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.version).toBe('0.1.0');
  });

  it('ДЕМО-ТЕГ БЕЗ CHANGELOG (v0.2.0) — гейт красный, причина локализована', () => {
    const result = evaluateRelease('v0.2.0', CHANGELOG_WITH_V010, '0.1.0');
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('v0.2.0') && e.includes('CHANGELOG.md'))).toBe(
      true,
    );
  });

  it('CHANGELOG.md отсутствует (пустая строка) — красный, отдельная причина', () => {
    const result = evaluateRelease('v0.1.0', '', '0.1.0');
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('CHANGELOG.md не найден'))).toBe(true);
  });

  it('версия package.json не совпадает с тегом — красный (баннеры dist = тег, T1.3)', () => {
    const result = evaluateRelease('v1.2.3', CHANGELOG_WITH_V010.replace('v0.1.0', 'v1.2.3'), '0.1.0');
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('0.1.0') && e.includes('1.2.3'))).toBe(true);
  });

  it('тег не семвера (v1.0, 1.0.0 без v) — красный, формат тега зафиксирован', () => {
    for (const tag of ['v1.0', '1.0.0', 'release-1', 'v1.0.0-rc1']) {
      const result = evaluateRelease(tag, CHANGELOG_WITH_V010, '0.1.0');
      expect(result.ok, tag).toBe(false);
      expect(result.errors.some((e) => e.includes('vX.Y.Z')), tag).toBe(true);
    }
  });

  it('заголовок записи — тег в квадратных скобках (Keep a Changelog), без v — не принимается', () => {
    const noV = CHANGELOG_WITH_V010.replace('## [v0.1.0]', '## [0.1.0]');
    expect(evaluateRelease('v0.1.0', noV, '0.1.0').ok).toBe(false);
    const plain = CHANGELOG_WITH_V010.replace('## [v0.1.0] — 2026-10-10', '## v0.1.0');
    expect(evaluateRelease('v0.1.0', plain, '0.1.0').ok).toBe(false);
  });
});

describe('извлечение записи для release notes (--extract, GitHub Release)', () => {
  it('тело секции тега — от заголовка записи до следующего «## »', () => {
    const result = extractReleaseNotes(CHANGELOG_WITH_V010, 'v0.1.0');
    expect(result.ok).toBe(true);
    expect(result.notes).toBe('### Added\n\n- Первый предрелиз: токены, base, компоненты P0/P1.');
  });

  it('записи нет — не ok (гейт не даёт публиковать Release без changelog-текста)', () => {
    const result = extractReleaseNotes(CHANGELOG_WITH_V010, 'v0.2.0');
    expect(result.ok).toBe(false);
    expect(result.notes).toBe('');
  });

  it('последняя запись файла (следующего раздела нет) — извлекается до конца', () => {
    const last = CHANGELOG_WITH_V010.replace(/## \[Unreleased\][\s\S]*$/, '').replace(
      '# Changelog\n\n',
      '',
    );
    const result = extractReleaseNotes(last, 'v0.1.0');
    expect(result.ok).toBe(true);
    expect(result.notes).toContain('Первый предрелиз');
  });
});
