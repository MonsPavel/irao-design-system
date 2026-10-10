/**
 * Юнит-тест полноты стенда токенов (задача T2.2, «Testing requirements»:
 * «e2e: полнота стенда»; исполняемая форма в доступной инфраструктуре —
 * Vitest прогоняет реальную сборку и сверяет сгенерированную страницу
 * showcase/dist/stands/tokens.html с токенами исходников).
 *
 * Проверяется:
 *  1. счётчик узлов стенда = счётчик токенов в файлах (Implementation
 *     requirements T2.2 п.3): узел с data-token ровно один на токен,
 *     без дублей и лишних;
 *  2. каждый примитив отображается со своим значением (цвет виден текстом);
 *  3. ui-core.min.css начинается с tokens: primitives → semantic (AC T2.2).
 *
 * 32px-сценарий (html { font-size: 32px }, AC T2.2) требует браузерного
 * layout — Playwright-харнесс появится в T1.4; до тех пор сценарий гоняется
 * вручную по собранной странице (npm run serve) и зафиксирован в доке
 * «Как пользоваться токенами». Здесь — статическая часть полноты.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildForUnitTests } from '../helpers/unit-build.mjs';
import { TOKENS_SOURCES, collectTokens, parseTokensFile } from '../../showcase/tokens-stand.mjs';

const root = join(import.meta.dirname, '../..');

let standHtml;
let tokens;
let primitiveTokens;

beforeAll(async () => {
  // Реальная сборка: dist + showcase (страница стенда генерируется из файлов токенов).
  // Через общий мьютекс (tests/helpers/unit-build.mjs): параллельный воркер
  // themes.test.js собирает то же самое — без замка rmSync одного билдера
  // попадает в окно чтения другого (флак ENOENT).
  await buildForUnitTests(root);
  const parsed = TOKENS_SOURCES.map(({ file, layer }) =>
    parseTokensFile(readFileSync(join(root, file), 'utf8'), layer),
  );
  tokens = collectTokens(parsed);
  primitiveTokens = collectTokens([parsed[0]]);
  standHtml = readFileSync(join(root, 'showcase/dist/stands/tokens.html'), 'utf8');
}, 60000);

describe('полнота стенда токенов (AC T2.2)', () => {
  it('счётчик узлов стенда = счётчику токенов в файлах (узел ровно один на токен)', () => {
    const nodes = [...standHtml.matchAll(/data-token="([^"]+)"/g)].map((m) => m[1]);
    expect(nodes, 'дубли узлов токенов на стенде').toHaveLength(new Set(nodes).size);
    expect(nodes).toHaveLength(tokens.length);
    expect(new Set(nodes)).toEqual(new Set(tokens.map((token) => token.name)));
  });

  it('каждый примитив показан со своим значением (цвет виден текстом)', () => {
    for (const token of primitiveTokens) {
      expect(standHtml, `значение ${token.name} не отображается`).toContain(token.value);
    }
  });

  it('каждый семантический токен показан со своим базовым значением', () => {
    const semanticTokens = tokens.filter((token) => token.layer === 'semantic');
    for (const token of semanticTokens) {
      expect(standHtml, `значение ${token.name} не отображается`).toContain(token.value);
    }
  });

  it('ui-core.min.css: баннер → primitives → semantic (AC T2.2)', () => {
    const css = readFileSync(join(root, 'dist/ui-core.min.css'), 'utf8');
    const body = css.replace(/^\/\*![\s\S]*?\*\//, '').trim();
    expect(body.startsWith(':root{'), 'ui-core.min.css начинается не с токенов').toBe(true);
    const lastPrimitive = body.indexOf('--ui-blue-50-55:');
    const firstSemantic = body.indexOf('--ui-color-primary:');
    expect(lastPrimitive).toBeGreaterThanOrEqual(0);
    expect(firstSemantic).toBeGreaterThan(lastPrimitive);
  });
});
