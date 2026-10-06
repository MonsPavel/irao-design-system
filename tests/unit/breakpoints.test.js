/**
 * Юнит-тест шкалы брейкпоинтов (задача T2.5, Implementation requirements п.1:
 * «шкала — в доках и в stylelint-конфиге синхронно (один источник: константы
 * в конфиге, дока ссылается)»).
 *
 * Машинная форма приёмки T2.5:
 *  1. BREAKPOINTS в stylelint.config.mjs — ровно утверждённая шкала
 *     02-architecture §3.2 (sm 480 / md 768 / lg 1024 / xl 1280 / 2xl 1440),
 *     строго возрастающая (mobile-first: база — мобильная, рост к xl/2xl);
 *  2. гейты медиазапросов (правило 8 конфига) собраны ИЗ константы, а не
 *     продублированы руками, — рассинхрон гейта с источником невозможен;
 *  3. дока «Адаптивный подход» (docs/ui-system/architecture/
 *     responsive-approach.md) называет каждое имя и значение шкалы и ссылается
 *     на константу — дрейф доки от конфига красный (тот же паттерн
 *     «опция гейта сверяется с источником», что в tests/unit/themes.test.js).
 *
 * Поведенческая часть гейта (фикстуры «пойман/не пойман») —
 * tests/lint-cases/css/components/ui-{card,badge}/media-*.css + npm run test:lint.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import stylelintConfig, { BREAKPOINTS } from '../../stylelint.config.mjs';

const root = join(import.meta.dirname, '../..');
const DOC_PATH = join(root, 'docs', 'ui-system', 'architecture', 'responsive-approach.md');

const VALUE_RULE = stylelintConfig.rules['media-feature-name-value-allowed-list'][0];
const NAME_RULE = stylelintConfig.rules['media-feature-name-disallowed-list'][0];

describe('BREAKPOINTS — единственный источник шкалы (T2.5, 02-architecture §3.2)', () => {
  it('ровно утверждённая шкала sm 480 / md 768 / lg 1024 / xl 1280 / 2xl 1440', () => {
    expect({ ...BREAKPOINTS }).toEqual({ sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1440 });
  });

  it('значения строго возрастают (mobile-first: рост к xl/2xl)', () => {
    const values = Object.values(BREAKPOINTS);
    expect(values.length).toBeGreaterThan(1);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i], `шкала не возрастает на ${values[i]}`).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe('гейты медиазапросов собраны из BREAKPOINTS (правило 8 конфига, T2.5)', () => {
  it('значения min-width — ровно шкала в px, не дубликат руками (значит, и не em)', () => {
    expect(VALUE_RULE['min-width']).toEqual(Object.values(BREAKPOINTS).map((px) => `${px}px`));
    for (const value of VALUE_RULE['min-width']) {
      expect(value, `значение ${value} — не канонические px`).toMatch(/^\d+px$/);
    }
  });

  it('форма запроса: семейство ширины/высоты запрещено, кроме min-width', () => {
    expect(NAME_RULE).toContain('width');
    expect(NAME_RULE).toContain('max-width');
    expect(NAME_RULE).toContain('min-height');
    expect(NAME_RULE).not.toContain('min-width');
  });
});

describe('дока «Адаптивный подход» синхронна с константой (Implementation requirements T2.5 п.1)', () => {
  const doc = readFileSync(DOC_PATH, 'utf8');

  it('называет каждое имя и каждое значение шкалы — дрейф доки от конфига красный', () => {
    for (const [name, px] of Object.entries(BREAKPOINTS)) {
      expect(doc, `имя «${name}» отсутствует в доке`).toContain(`\`${name}\``);
      expect(doc, `значение «${px}px» отсутствует в доке`).toContain(`${px}px`);
    }
  });

  it('ссылается на источник (BREAKPOINTS в stylelint.config.mjs) и форму min-width', () => {
    expect(doc).toContain('BREAKPOINTS');
    expect(doc).toContain('stylelint.config.mjs');
    expect(doc).toContain('min-width');
  });
});
