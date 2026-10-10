/**
 * Чистая логика релизного гейта (T12.1) — DOM-независимая, тестируется
 * юнит-пином tests/unit/release-gate.test.js (конвенция tests/README.md:
 * чистая логика — вне Playwright).
 *
 * Контракты:
 *   - тег релиза — строго semver с префиксом v: vX.Y.Z (триггер release.yml);
 *   - версия package.json обязана совпадать с тегом — сборка ставит её в
 *     баннеры dist (02-architecture §6.1, T1.3: «версия в баннерах = тег»);
 *     автоматический бамп не делается (Out of scope T12.2) — совпадение
 *     обеспечивает релизный коммит;
 *   - CHANGELOG.md (Keep a Changelog, ADR-0007) обязан содержать запись
 *     тега: заголовок «## [vX.Y.Z]» (с датой/ссылкой после скобки или без).
 *     Нет записи → релиз красный. Файл самого репозитория — зона T12.2:
 *     до её выполнения реальный тег честно красный («записи нет»).
 */

/** Тег релиза: v + semver (без пререлизных суффиксов — суффикс = другая запись changelog). */
export const TAG_PATTERN = /^v\d+\.\d+\.\d+$/;

/** Заголовок записи Keep a Changelog для тега: «## [vX.Y.Z]…» (дата/ссылка — после скобки). */
function entryHeadingRe(tag) {
  return new RegExp(`^## \\[${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'm');
}

/**
 * Оценить тег релиза по всем гейтам.
 *
 * @param {string} tag  тег (например v1.0.0)
 * @param {string} changelogText  содержимое CHANGELOG.md; '' — файла нет
 * @param {string} pkgVersion  версия из package.json
 * @returns {{ ok: boolean; errors: string[]; version: string }} version —
 *   версия из тега (без v) при корректном формате, иначе ''
 */
export function evaluateRelease(tag, changelogText, pkgVersion) {
  const errors = [];
  const version = TAG_PATTERN.test(tag) ? tag.slice(1) : '';

  if (!TAG_PATTERN.test(tag)) {
    errors.push(
      `тег «${tag}» не в формате vX.Y.Z (v + semver) — триггер релиза v*, артефакт и Release именуются тегом`,
    );
  } else if (pkgVersion !== version) {
    errors.push(
      `версия package.json «${pkgVersion}» не совпадает с тегом «${tag}» — баннеры dist = тег ` +
        '(02-architecture §6.1, T1.3); бамп версии делает релизный коммит (автобампа нет — Out of scope T12.2)',
    );
  }

  if (typeof changelogText !== 'string' || changelogText.trim() === '') {
    errors.push('CHANGELOG.md не найден — релиз без changelog-записи заблокирован (ADR-0007)');
  } else if (TAG_PATTERN.test(tag) && !entryHeadingRe(tag).test(changelogText)) {
    errors.push(
      `в CHANGELOG.md нет записи тега «${tag}» — формат Keep a Changelog: «## [${tag}] — дата» (ADR-0007)`,
    );
  }

  return { ok: errors.length === 0, errors, version };
}

/**
 * Извлечь тело записи тега из CHANGELOG.md — текст release notes (GitHub
 * Release T12.1 публикует с --notes-file). Гейт применяется ДО публикации
 * (release.yml), поэтому «записи нет» здесь — тот же красный релиз.
 *
 * @param {string} changelogText  содержимое CHANGELOG.md
 * @param {string} tag  тег релиза vX.Y.Z
 * @returns {{ ok: boolean; notes: string; errors: string[] }} notes — тело
 *   записи (от заголовка до следующего «## » или конца файла), очищенное
 *   от крайних пустых строк
 */
export function extractReleaseNotes(changelogText, tag) {
  if (typeof changelogText !== 'string' || changelogText.trim() === '') {
    return { ok: false, notes: '', errors: ['CHANGELOG.md не найден — извлекать нечего'] };
  }
  const lines = changelogText.split(/\r?\n/);
  const headingRe = entryHeadingRe(tag);
  const start = lines.findIndex((line) => headingRe.test(line));
  if (start === -1) {
    return {
      ok: false,
      notes: '',
      errors: [`в CHANGELOG.md нет записи тега «${tag}» (Keep a Changelog: «## [${tag}]…»)`],
    };
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  const notes = lines
    .slice(start + 1, end)
    .join('\n')
    .replace(/^[\s]*\n+/, '')
    .replace(/[\s]*\n+$/, '');
  if (notes === '') {
    return {
      ok: false,
      notes: '',
      errors: [`запись тега «${tag}» пуста — Release с пустым описанием не публикуется`],
    };
  }
  return { ok: true, notes, errors: [] };
}
