/**
 * Юнит-пин layout-примитивов (задачи T3.4, T17.17; Testing requirements).
 *
 * Поверхность браузера — overflow на 320/375/768/1024/1440, computed-колонки
 * по вьюпортам, токены контейнера/секции/сеток, computed-геометрия флекс-
 * примитивов и подмена их gap-токена, axe, эталоны на 4 вьюпортах —
 * в tests/e2e/layout.spec.js; здесь — пины исполняемой формы решения:
 *  - base/layout.css: все размеры ТОЛЬКО из токенов (Implementation
 *    requirements T3.4 п.1); box-sizing на корнях блоков (ADR-0002);
 *    minmax(0, 1fr) в каждой колонке (Technical considerations);
 *    mobile-first: media только min-width из шкалы T2.5;
 *  - лестница колонок спеки: 1 (mobile) → 2 (md) → N (lg); --4: 3 (xl) →
 *    4 (2xl);
 *  - запрет фиксированных высот (Scope T3.4); порядок чтения = порядок DOM
 *    (свойство order не используется — Accessibility requirements);
 *  - флекс-примитивы T17.17: ui-row (wrap по умолчанию — защита от hscroll
 *    гейта T3.6; align-items: center — доминирующий кейс пилота, замер
 *    9 из 13 явных align-items строк; модификаторы --center/--between/
 *    --end/--no-wrap) и ui-stack (решение «делать сейчас» по замеру:
 *    29 из 31 стопок column с gap, 10 делят --ui-space-2, 6 — --ui-space-4 —
 *    критерий «≥ 3 инстансов с равным gap» закрыт с запасом); gap-токены
 *    --ui-row-gap/--ui-stack-gap от --ui-space-4;
 *  - стенд layout в полигоне (Definition of Done: стенд layout-примитивов);
 *  - xl-вьюпорт харнесса — 4-й вьюпорт эталонов (AC 3).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildForUnitTests } from '../helpers/unit-build.mjs';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев, переводы строк нормализованы к LF: пины смотрят на
 * исполняемый код, а не на прозу шапки; смещения якорей не зависят от CRLF. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тела ВСЕХ правил внутри @media (min-width: Npx) одним куском (блоков
 * одной ширины в файле несколько — контейнер и сетка объявлены раздельно). */
const mediaBlocks = (css, px) => {
  let joined = '';
  for (const [, body] of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\) \\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    joined += `\n${body}`;
  }
  return joined;
};

describe('base/layout.css — контейнер (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('файл существует (входит в ui-core — сборка не предупреждает о пропуске)', () => {
    expect(existsSync(join(root, 'base', 'layout.css'))).toBe(true);
  });

  it('.ui-container: box-sizing (ADR-0002), max-width/margin/padding — из токенов', () => {
    const block = blockOf(css, '.ui-container');
    expect(block, 'правило .ui-container найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('max-width: var(--ui-container-max);');
    expect(block).toContain('margin: 0 auto;');
    expect(block).toContain('padding: 0 var(--ui-container-pad);');
  });

  it('рост паддинга по шкале: 24 в md (768), 32 в lg (1024) — mobile-first', () => {
    const md = mediaBlocks(css, 768);
    const lg = mediaBlocks(css, 1024);
    expect(md, '@media (min-width: 768px) найден').toBeTruthy();
    expect(md).toContain('padding: 0 var(--ui-container-pad-md);');
    expect(lg, '@media (min-width: 1024px) найден').toBeTruthy();
    expect(lg).toContain('padding: 0 var(--ui-container-pad-lg);');
  });
});

describe('base/layout.css — секция (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-section: box-sizing, вертикальный ритм из spacing-токенов (32 → 48 на lg)', () => {
    const block = blockOf(css, '.ui-section');
    expect(block, 'правило .ui-section найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('padding: var(--ui-space-6) 0;');
    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('.ui-section');
    expect(lg).toContain('padding: var(--ui-space-7) 0;');
  });

  it('.ui-section--muted: фон surface-muted + радиус big (перенос .section--gray)', () => {
    const block = blockOf(css, '.ui-section--muted');
    expect(block, 'правило .ui-section--muted найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('border-radius: var(--ui-radius-lg);');
  });
});

describe('base/layout.css — фото-секция ui-section--photo (T17.3)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-section--photo: корень позиционирован и изолирован — фон z-index:-1 не убегает под фон обёрток сайта', () => {
    const block = blockOf(css, '.ui-section--photo');
    expect(block, 'правило .ui-section--photo найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: relative;');
    // изоляция: negative-z дети красятся внутри секции (после её фона,
    // до контента), а не в корневом stacking context страницы
    expect(block).toContain('isolation: isolate;');
  });

  it('__bg: абсолютный слой inset:0, z-index:-1 — пара «контент над фоном» (прецедент pilot.css)', () => {
    const block = blockOf(css, '.ui-section--photo .ui-section__bg');
    expect(block, 'правило .ui-section--photo .ui-section__bg найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('z-index: -1;');
  });

  it('__bg img: absolute inset:0 + width/height:100% (приём pilot.css) — единственное height-объявление файла, fill уже размерённого слоя', () => {
    const block = blockOf(css, '.ui-section--photo .ui-section__bg img');
    expect(block, 'правило img фона найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('object-fit: cover;');
    expect(block).toContain('width: 100%;');
    expect(block).toContain('height: 100%;');
    // Почему fill-декларации обязательны (обе ветки проверены пробой
    // скрин-пар T17.3): absolute-инсеты без размеров НЕ растягивают
    // replaced-элемент (сохраняется внутреннее соотношение — бокс уезжал
    // на ~6px от бокса пилота, кадр «плывёт»); флекс-fill ломают атрибуты
    // width/height канона T4.6 (presentational-hint высоты блокирует
    // stretch — бокс баннера уезжал на 326px вместо 320px). Явные 100%
    // перекрывают и то и другое — рендер идентичен пилоту.
  });

  it('__overlay: слой поверх фото и под контентом (z-index:-1, позже __bg в DOM); base без pointer-events — клики доходят до контента (исключение — glow, канон production)', () => {
    const block = blockOf(css, '.ui-section--photo .ui-section__overlay');
    expect(block, 'правило .ui-section--photo .ui-section__overlay найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('z-index: -1;');
    expect(block, 'база оверлея — под контентом, без pointer-events').not.toContain(
      'pointer-events',
    );
    // DOM-порядок слоёв: __bg раньше __overlay (оверлей поверх фото)
    expect(css.indexOf('.ui-section--photo .ui-section__bg {')).toBeLessThan(
      css.indexOf('.ui-section--photo .ui-section__overlay {'),
    );
  });

  it('--fade-bottom: фиксированный канон hero — surface→transparent сверху, transparent→primary-a94 снизу (Канон оригинала T17.3)', () => {
    const block = blockOf(css, '.ui-section__overlay--fade-bottom');
    expect(block, 'правило --fade-bottom найдено').toBeTruthy();
    expect(block).toContain('background:');
    expect(block).toContain('linear-gradient(180deg, var(--ui-color-surface) 0%, transparent 35%)');
    expect(block).toContain(
      'linear-gradient(180deg, transparent 60%, var(--ui-color-primary-a94) 100%)',
    );
  });

  it('--glow: фиксированный канон production — градиент primary 88%→34%→transparent слева, НАД контентом (z-index: auto снимает -1 базы) и pointer-events: none (production.css:38)', () => {
    const block = blockOf(css, '.ui-section__overlay--glow');
    expect(block, 'правило --glow найдено').toBeTruthy();
    expect(block).toContain('color-mix(in srgb, var(--ui-color-primary) 88%, transparent) 0%');
    expect(block).toContain('color-mix(in srgb, var(--ui-color-primary) 34%, transparent) 62%');
    expect(block).toContain('transparent 100%');
    // Стекинг glow — канон пилота (проба скрин-пар T17.3): полупрозрачная
    // синь тонирует и контент (текст под градиентом) — z-index: auto;
    // клики проходят сквозь (pointer-events: none оригинала).
    const scoped = blockOf(css, '.ui-section--photo .ui-section__overlay--glow');
    expect(scoped, 'scoped-правило стека найдено').toBeTruthy();
    expect(scoped).toContain('z-index: auto;');
    expect(scoped).toContain('pointer-events: none;');
  });

  it('--tint: цветовое затемнение токен-хуком --ui-section-overlay-tint; дефолт хука — none (transparent), сайт ставит ступень лестницы T14.7', () => {
    const block = blockOf(css, '.ui-section__overlay--tint');
    expect(block, 'правило --tint найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-section-overlay-tint, transparent);');
    // хук не задаёт дефолт в :root — «none» означает отсутствие заливки
    expect(css).not.toMatch(/--ui-section-overlay-tint:\s*[^;]+;/);
  });

  it('модификатор не задаёт типографику/цвет текста — on-dark-пара остаётся на контенте (Implementation requirements T17.3 п.1)', () => {
    const photoCss = css.slice(css.indexOf('.ui-section--photo'));
    expect(photoCss, 'в слое фото-секции нет color:').not.toMatch(/(?:^|\n)\s*color:/);
    expect(photoCss, 'в слое фото-секции нет font-').not.toMatch(/(?:^|\n)\s*font-/);
  });

  it('высота фона — по контенту секции: декларативных пропорций в модификаторе нет (min-height — сайту)', () => {
    // Исключение — img фото-слоя (fill 100% уже размерённого absolute-слоя,
    // T17.3): на высоту секции не влияет, пин ниже всего файла — в инвариантах.
    const rest = css.replace(/\.ui-section--photo \.ui-section__bg img\s*\{[^}]*\}/, '');
    expect(rest).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s/);
  });
});

describe('base/layout.css — сетка (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-grid: box-sizing, grid, gap из шкалы, база — 1 колонка (mobile)', () => {
    const block = blockOf(css, '.ui-grid');
    expect(block, 'правило .ui-grid найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: grid;');
    expect(block).toContain('gap: var(--ui-space-5);');
    expect(block).toContain('grid-template-columns: minmax(0, 1fr);');
  });

  it('minmax(0, 1fr) в КАЖДОЙ grid-template-columns файла (защита от длинного слова)', () => {
    for (const [, declaration] of css.matchAll(/grid-template-columns:\s*([^;]+);/g)) {
      expect(declaration, `колонки через minmax: ${declaration.trim()}`).toContain(
        'minmax(0, 1fr)',
      );
    }
  });

  it('md (768): все сетки — 2 колонки; lg (1024): --2 — 2, --3 — 3', () => {
    const md = mediaBlocks(css, 768);
    expect(md).toContain('.ui-grid--2');
    expect(md).toContain('.ui-grid--3');
    expect(md).toContain('.ui-grid--4');
    expect(md).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');

    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('.ui-grid--2');
    expect(lg).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(lg).toContain('.ui-grid--3');
    expect(lg).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });

  it('--4: 3 колонки на xl (1280), 4 на 2xl (1440) — лестница Implementation requirements п.2', () => {
    const xl = mediaBlocks(css, 1280);
    expect(xl, '@media (min-width: 1280px) найден').toBeTruthy();
    expect(xl).toContain('.ui-grid--4');
    expect(xl).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');

    const xxl = mediaBlocks(css, 1440);
    expect(xxl, '@media (min-width: 1440px) найден').toBeTruthy();
    expect(xxl).toContain('.ui-grid--4');
    expect(xxl).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
  });

  it('gap: рост до --ui-space-6 на lg; --4 плотнее (--ui-space-5) — top-level правило ПОСЛЕ lg-media сетки', () => {
    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('gap: var(--ui-space-6);');

    // Пин РЕАЛЬНОЙ пары «top-level gap-правило после lg-media сетки»
    // (T13.9, rev T3.4: indexOf по голым вхождениям брал '.ui-grid--4' из
    // селектор-списка md-медиа и lg-media паддинга контейнера — пара была
    // не та). Якоря — с телом правила, УНИКАЛЬНЫЕ в очищенном CSS: голый
    // '.ui-grid--4' встречается и в xl/2xl-медиа ПОСЛЕ lg-media, и после
    // перестановки правил lastIndexOf уезжал бы на 2xl-блок (ловится
    // мутацией). Проверка уникальности делает lastIndexOf однозначным;
    // смещения якорей при текущем файле — ровно 1313 и 873 (подтверждено
    // ревью), сами числа не пинятся — дрейф форматирования.
    const GAP_RULE = '.ui-grid--4 {\n  gap: var(--ui-space-5);\n}';
    const GRID_MEDIA = '@media (min-width: 1024px) {\n  .ui-grid {';
    expect(css.split(GAP_RULE).length - 1, 'top-level gap-правило --4 в файле ровно одно').toBe(1);
    expect(css.split(GRID_MEDIA).length - 1, 'lg-media сетки ровно одна').toBe(1);

    const gap4 = css.lastIndexOf(GAP_RULE);
    const gapMedia = css.lastIndexOf(GRID_MEDIA);
    expect(
      gap4,
      'top-level .ui-grid--4 (gap 24) после lg-media: равная специфичность, побеждает порядок источника',
    ).toBeGreaterThan(gapMedia);
  });
});

describe('base/layout.css — флекс-примитив ui-row (T17.17)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-row: box-sizing (ADR-0002), flex-строка, перенос по умолчанию — защита от hscroll (гейт T3.6)', () => {
    const block = blockOf(css, '.ui-row');
    expect(block, 'правило .ui-row найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-wrap: wrap;');
  });

  it('.ui-row: вертикальное выравнивание центр — доминирующий кейс пилота (замер T17.17: 9 из 13 явных align-items строк — center)', () => {
    expect(blockOf(css, '.ui-row')).toContain('align-items: center;');
  });

  it('.ui-row: gap — только токен --ui-row-gap, без литеральных величин', () => {
    const block = blockOf(css, '.ui-row');
    expect(block).toContain('gap: var(--ui-row-gap);');
    expect(block, 'gap объявлен ровно один раз, значением-токеном').toMatch(
      /(?:^|;)\s*gap:\s*var\(--ui-row-gap\);\s*(?:$|;)/,
    );
  });

  it('матрица модификаторов: --center (центр), --between («слева/справа»), --end (конец), --no-wrap (перенос отключён осознанно)', () => {
    expect(blockOf(css, '.ui-row--center')).toContain('justify-content: center;');
    expect(blockOf(css, '.ui-row--between')).toContain('justify-content: space-between;');
    expect(blockOf(css, '.ui-row--end')).toContain('justify-content: flex-end;');
    expect(blockOf(css, '.ui-row--no-wrap')).toContain('flex-wrap: nowrap;');
  });

  it('примитив чисто презентационный: цвет/фон/типографику/высоты не задаёт (доступность не меняется, Implementation requirements T17.17 п.2)', () => {
    for (const selector of [
      '.ui-row',
      '.ui-row--center',
      '.ui-row--between',
      '.ui-row--end',
      '.ui-row--no-wrap',
      '.ui-stack',
    ]) {
      const block = blockOf(css, selector);
      expect(block, `${selector}: без цветовых деклараций`).not.toMatch(
        /(?:^|;)\s*(?:color|background|border)(?:-|\s*:)/,
      );
      expect(block, `${selector}: без типографики`).not.toMatch(/(?:^|;)\s*font-/);
      expect(block, `${selector}: без высот`).not.toMatch(/(?:min-)?height:/);
    }
  });
});

describe('base/layout.css — флекс-примитив ui-stack (T17.17: решение «делать сейчас» по замеру пилота)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-stack: box-sizing (ADR-0002), flex-колонка, gap — токен --ui-stack-gap', () => {
    const block = blockOf(css, '.ui-stack');
    expect(block, 'правило .ui-stack найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('gap: var(--ui-stack-gap);');
  });

  it('критерий решения зафиксирован в доке слоя (README): замер пилота в живом тексте, а не в замороженном файле задачи', () => {
    const readme = readFileSync(join(root, 'base', 'README.md'), 'utf8');
    expect(readme, 'README несёт замер решения «сейчас»').toMatch(/ui-stack[^\n]*замер|замер[^\n]*ui-stack/s);
  });
});

describe('токены флекс-примитивов (T17.17: Implementation requirements п.1)', () => {
  const semantic = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('--ui-row-gap / --ui-stack-gap — дефолт --ui-space-4 (ступень шкалы §3.2, спека п.1)', () => {
    expect(semantic).toContain('--ui-row-gap: var(--ui-space-4);');
    expect(semantic).toContain('--ui-stack-gap: var(--ui-space-4);');
  });

  it('провенанс «новый» у обоих токенов (примитива в career-portal нет; контроль tokens-semantic.test.js)', () => {
    const rowGap = semantic.indexOf('--ui-row-gap:');
    const stackGap = semantic.indexOf('--ui-stack-gap:');
    expect(rowGap, '--ui-row-gap определён').toBeGreaterThan(-1);
    expect(stackGap, '--ui-stack-gap определён').toBeGreaterThan(-1);
    for (const [name, at] of [
      ['--ui-row-gap', rowGap],
      ['--ui-stack-gap', stackGap],
    ]) {
      const before = semantic.slice(Math.max(0, at - 400), at);
      expect(before, `провенанс над ${name}`).toMatch(/новый/);
    }
  });
});

describe('presence-пин dist (AC T17.17: base в ядре, ui-row доезжает до сайтов)', () => {
  // presence-пин читает собранный dist: воркер дожидается билда прогона
  // (tests/helpers/unit-build.mjs; прецедент stat.test.js) — в свежем
  // CI-чекауте dist ещё нет, и параллельный билдер мог не успеть.
  beforeAll(async () => {
    await buildForUnitTests(root);
  }, 60000);

  it('.ui-row с модификаторами и .ui-stack в dist/ui-core.min.css (регресс сборки)', () => {
    const core = readFileSync(join(root, 'dist', 'ui-core.min.css'), 'utf8');
    expect(core).toContain('.ui-row');
    expect(core).toContain('.ui-row--center');
    expect(core).toContain('.ui-row--between');
    expect(core).toContain('.ui-row--end');
    expect(core).toContain('.ui-row--no-wrap');
    expect(core).toContain('.ui-stack');
  });
});

describe('base/layout.css — инварианты системы (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('запрет фиксированных высот: ни height, ни min-height (Scope T3.4) — исключение: fill-img фото-слоя T17.3 (только 100%)', () => {
    // T17.3: img абсолютного фото-слоя несёт width/height:100% (fill уже
    // размерённого слоя; иное — replaced-элемент с внутренним соотношением
    // или presentational-hint атрибутов T4.6 — кадр «плывёт», проба
    // скрин-пар). Исключение узкое: правило __bg img вырезается целиком,
    // в нём высота обязана быть ровно 100% (пин в describe фото-секции);
    // весь остальной файл — по-прежнему без height/min-height.
    const rest = css.replace(/\.ui-section--photo \.ui-section__bg img\s*\{[^}]*\}/, '');
    expect(rest).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s/);
    const imgBlock = blockOf(css, '.ui-section--photo .ui-section__bg img');
    expect(imgBlock, 'в исключении — ровно fill 100%, без других высот').toMatch(/height: 100%;/);
    expect(imgBlock.replace(/height: 100%;/, '')).not.toMatch(/(?:min-)?height:/);
  });

  it('порядок чтения = порядок DOM: свойство order не используется (Accessibility requirements)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*order:\s/);
  });

  it('media — только min-width из шкалы T2.5 {768, 1024, 1280, 1440}', () => {
    const used = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(used.length, 'каждый media — один запрос из шкалы').toBeGreaterThan(0);
    for (const px of used) {
      expect([768, 1024, 1280, 1440], `min-width: ${px}px — из шкалы T2.5`).toContain(px);
    }
  });

  it('никаких !important (инвариант системы) и никакого hex — только токены', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('стенд layout (Definition of Done T3.4: стенд layout-примитивов)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'layout', 'index.html'), 'utf8');

  it('контейнер, секции (в т.ч. --muted) и сетки --2/--3/--4 представлены образцами', () => {
    expect(stand).toMatch(/class="[^"]*\bui-container\b[^"]*"/);
    expect(stand).toMatch(/<section[^>]*class="[^"]*\bui-section\b[^"]*"/);
    expect(stand).toMatch(/class="[^"]*\bui-section--muted\b[^"]*"/);
    for (const modifier of [2, 3, 4]) {
      expect(stand).toMatch(new RegExp(`class="[^"]*\\bui-grid--${modifier}\\b[^"]*"`));
    }
  });

  it('длинное RU-слово в ячейке сетки — образец защиты minmax(0, 1fr)', () => {
    expect(stand).toMatch(/сельскохозяйственный/i);
  });

  it('матрица ui-row: база и все модификаторы --center/--between/--end/--no-wrap представлены образцами (T17.17)', () => {
    // база — класс ui-row без продолжения-модификатора (lookahead на «--»)
    expect(stand).toMatch(/class="[^"]*\bui-row(?!-)[^"]*"/);
    for (const modifier of ['center', 'between', 'end', 'no-wrap']) {
      expect(stand).toMatch(new RegExp(`class="[^"]*\\bui-row--${modifier}\\b[^"]*"`));
    }
  });

  it('ui-stack представлен образцом (решение «делать сейчас» по замеру пилота, T17.17)', () => {
    expect(stand).toMatch(/class="[^"]*\bui-stack(?!-)[^"]*"/);
  });

  it('сборка: стенд layout в полигоне showcase', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toContain("'layout'");
    expect(build).toMatch(/stands['",\s]+['"]layout\.html/);
  });
});

describe('харнесс: 4 вьюпорта эталонов (AC 3 T3.4)', () => {
  it('VIEWPORTS содержит xl 1280 — различает ступени 3/4 колонок сетки --4', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    expect(harness).toMatch(/xl:\s*Object\.freeze\(\{\s*width:\s*1280/);
  });
});

describe('e2e-сценарии записаны (Testing requirements T3.4)', () => {
  const spec = readFileSync(join(root, 'tests', 'e2e', 'layout.spec.js'), 'utf8');

  it('tests/e2e/layout.spec.js проверяет overflow и computed-колонки', () => {
    expect(spec).toContain('scrollWidth');
    expect(spec).toContain('gridTemplateColumns');
  });

  it('tests/e2e/layout.spec.js проверяет computed-геометрию флекс-примитивов и подмену gap-токена (Testing requirements T17.17)', () => {
    expect(spec, 'computed justify/align/wrap пины').toContain('justifyContent');
    expect(spec, 'подмена --ui-row-gap меняет расчётный gap (AC)').toContain('--ui-row-gap');
  });
});

describe('шкала вьюпортов скриншотов — дока ↔ код (ревью T3.4: рассинхрон)', () => {
  // T3.4 добавил xl 1280 в VIEWPORTS — живые упоминания шкалы скриншотов
  // обязаны показывать четырёхвьюпортную шкалу. Пинется текст влитую:
  // «375/768/1280/1440» и отсутствие оборота «три/трёх вьюпорта(х)».
  // Исторические справки (harness.js: «T1.4: 375/768/1440; T3.4 добавил…»)
  // и упоминания ручной приёмки стендов (CONTRIBUTING, showcase/README,
  // 02-architecture:412, responsive-approach:74 — критические вьюпорты
  // ручной проверки) и замороженные файлы задач пином не накрываются.
  const LIVE_SCALE_FILES = [
    'tests/README.md', // шаблон компонентных тестов + пример названия теста
    'tests/visual/README.md', // шапка каталога эталонов
    'tests/e2e/README.md', // чек-лист T2.6: visual-эталоны
    'tests/e2e/typography.spec.js', // шапка + названия тестов
    'tests/e2e/showcase-index.spec.js', // шапка
    'tests/helpers/harness.js', // докстринг shot()
    'docs/02-architecture.md', // §9: строка visual regression
    'base/README.md', // поверхность e2e typography
    'base/typography.css', // шапка: поверхность браузера
    'showcase/build.mjs', // комментарий стенда typography
  ];

  it.each(LIVE_SCALE_FILES)('%s: шкала скриншотов названа как 375/768/1280/1440', (rel) => {
    const text = readFileSync(join(root, ...rel.split('/')), 'utf8');
    expect(text, `${rel}: четырёхвьюпортная шкала не названа`).toContain('375/768/1280/1440');
    expect(text, `${rel}: оборот «три/трёх вьюпорта(х)» не вычищен`).not.toMatch(
      /три вьюпорта|трёх вьюпорт/,
    );
  });

  it('источник истины VIEWPORTS — ровно 375/768/1280/1440', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    const widths = [...harness.matchAll(/width:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(widths, 'шкала VIEWPORTS в harness.js').toEqual([375, 768, 1280, 1440]);
  });
});
