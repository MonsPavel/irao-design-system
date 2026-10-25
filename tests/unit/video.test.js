/**
 * Юнит-пин ui-video (задача T17.6; Testing requirements).
 *
 * Поверхность браузера — computed-геометрия обёртки/play, axe (имя кнопки,
 * контраст метки времени) и эталоны 375/768/1280/1440 — в
 * tests/e2e/ui-video.spec.js; здесь — пины исполняемой формы решения:
 *  - components/ui-video/ui-video.css: обёртка-кнопка (button/a) — блок с
 *    relative/overflow hidden/radius lg/фоном primary (пилот
 *    .cp-video__player, pilot.css:653; оверлей-градиент над primary
 *    страхует кадр до загрузки постера); постер — img cover на всю ширину
 *    (высоту ведёт кадр — высоты оригинала 720/420/240 не переносились,
 *    REPORT §3.4); оверлей — linear-gradient transparent 40% → primary-a72
 *    (ступень лестницы тинтов T17.6, Context «градиент к primary 72%»);
 *    play — круг accent 88px (5.5rem) с on-dark-стрелкой, размер — токен-хук
 *    --ui-video-play-size на корне (Scope: «размер токеном»); время —
 *    on-dark в правом нижнем углу (--ui-space-4);
 *  - компонент статический (вид): поведение воспроизведения — слот сайта
 *    (Out of scope: реальный плеер/эмбед/JS);
 *  - канон (Implementation requirements п.1/п.3): <button type="button"> с
 *    доступным именем на обёртке (Context: «имя кнопки — параметр разметки»;
 *    do/don't README: «Смотреть видео …», не «play»), alt постера пустой
 *    (декоративен при наличии имени кнопки), overlay/play aria-hidden;
 *  - инварианты системы: без !important, без hex, только токены слоя 2;
 *  - 'ui-video' в COMPONENTS showcase/build.mjs → CSS в dist/ui-core.min.css
 *    (presence-пин, как ui-stat);
 *  - стенд showcase/pages/ui-video: канон-кнопка + ссылочная форма (Context:
 *    «обёртка-кнопка или ссылка») + демо токен-хука --ui-video-play-size;
 *  - пилот: видео-блок главной на компоненте с именем кнопки, правила
 *    .cp-video__* сняты из pilot.css (~50 строк, AC), compare-проба
 *    video-block ведёт на .ui-video.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildForUnitTests } from '../helpers/unit-build.mjs';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Чтение с деградацией в пустую строку: до появления файла падает ПИН
 *  (осмысленный красный), а не загрузка спека целиком. */
const readOr = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

describe('components/ui-video/ui-video.css — обёртка и элементы (Scope T17.6, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-video', 'ui-video.css');
  const css = stripCssComments(readOr(path));

  it('файл существует и проходит БЭМ-гейт (@define video — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define video */')).toBe(true);
  });

  it('.ui-video: box-sizing; блок relative с overflow hidden; radius lg; фон primary; сброс кнопки', () => {
    const block = blockOf(css, '.ui-video');
    expect(block, 'правило .ui-video найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: block;');
    expect(block).toContain('position: relative;');
    // Кадр не вываливается за радиус; play/time позиционируются от обёртки.
    expect(block).toContain('overflow: hidden;');
    expect(block).toContain('width: 100%;');
    // Сброс нативной кнопки (пилот .cp-video__player, pilot.css:653).
    expect(block).toContain('padding: 0;');
    expect(block).toContain('border: 0;');
    expect(block).toContain('border-radius: var(--ui-radius-lg);');
    expect(block).toContain('background-color: var(--ui-color-primary);');
  });

  it('токен-хук размера play на корне: --ui-video-play-size: 5.5rem (Scope «размер токеном»)', () => {
    const block = blockOf(css, '.ui-video');
    expect(block).toContain('--ui-video-play-size: 5.5rem;');
  });

  it('__poster: img cover во всю ширину — высоту ведёт кадр (пилот .cp-video__poster)', () => {
    const block = blockOf(css, '.ui-video__poster');
    expect(block, 'правило .ui-video__poster найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: block;');
    expect(block).toContain('object-fit: cover;');
    expect(block).toContain('width: 100%;');
    // Высота — по аспекту атрибутов width/height (гейт T4.6: CLS): auto,
    // а не фикс-высоты оригинала (720/420/240 — сайт-зона). Прецедент ui-image.
    expect(block).toContain('height: auto;');
    expect(block).not.toMatch(/height:\s*(?!auto)[0-9]/);
  });

  it('__overlay: градиент transparent 40% → primary-a72 (Context «градиент к primary 72%»)', () => {
    const block = blockOf(css, '.ui-video__overlay');
    expect(block, 'правило .ui-video__overlay найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    // Ступень лестницы тинтов (T17.6), не локальный color-mix в компоненте.
    expect(block).toContain('background: linear-gradient(');
    expect(block).toContain('transparent 40%');
    expect(block).toContain('var(--ui-color-primary-a72) 100%');
    expect(block, '72% — только тинтом лестницы').not.toContain('72%');
  });

  it('__play: круг accent размером --ui-video-play-size, on-dark, центр кадра', () => {
    const block = blockOf(css, '.ui-video__play');
    expect(block, 'правило .ui-video__play найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('top: 50%;');
    expect(block).toContain('left: 50%;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: center;');
    // 88px одобренного дизайна пилота = 5.5rem; размер — только токеном.
    expect(block).toContain('width: var(--ui-video-play-size);');
    expect(block).toContain('height: var(--ui-video-play-size);');
    expect(block).toContain('border-radius: 50%;');
    // Пара accent + on-dark — уже одобренная (Implementation requirements п.2).
    expect(block).toContain('background-color: var(--ui-color-accent);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    expect(block).toContain('transform: translate(-50%, -50%);');
  });

  it('__time: on-dark в правом нижнем углу с отступом space-4', () => {
    const block = blockOf(css, '.ui-video__time');
    expect(block, 'правило .ui-video__time найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('right: var(--ui-space-4);');
    expect(block).toContain('bottom: var(--ui-space-4);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('цвета — только существующие токены слоя 2 (Implementation requirements п.2)', () => {
    const allowed = new Set([
      '--ui-color-primary',
      '--ui-color-primary-a72',
      '--ui-color-accent',
      '--ui-color-text-on-dark',
    ]);
    const colorVars = [...css.matchAll(/var\((--ui-(?:color)[a-z0-9-]*)/g)].map((m) => m[1]);
    expect(colorVars.length, 'цветовые ссылки есть').toBeGreaterThan(0);
    for (const token of colorVars) {
      expect(allowed, `${token} — токен из одобренного набора T17.6`).toContain(token);
    }
  });
});

describe('канонический паттерн (components/ui-video/ui-video.html)', () => {
  const html = readOr(join(root, 'components', 'ui-video', 'ui-video.html'));

  it('обёртка — <button type="button"> (Implementation requirements п.1/п.3)', () => {
    expect(html).toMatch(/<button class="ui-video" type="button"/);
  });

  it('имя кнопки — на обёртке и описывает действие: «Смотреть видео …», не «play» (Context, do/don’t)', () => {
    expect(html).toMatch(/aria-label="Смотреть видео[^"]*"/);
  });

  it('постер декоративен: alt пустой + loading lazy (Implementation requirements п.1)', () => {
    expect(html).toMatch(/<img class="ui-video__poster"[^>]*alt=""[^>]*loading="lazy"/);
  });

  it('overlay и play — aria-hidden; время остаётся в потоке доступности', () => {
    expect(html).toMatch(/class="ui-video__overlay" aria-hidden="true"/);
    expect(html).toMatch(/class="ui-video__play" aria-hidden="true"/);
    expect(html).toMatch(/<span class="ui-video__time">/);
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-video/index.html)', () => {
  const html = readOr(join(root, 'showcase', 'pages', 'ui-video', 'index.html'));

  it('стенд существует и показывает канон-кнопку', () => {
    expect(html).toContain('id="ui-video-default"');
    expect(html).toMatch(/<button class="ui-video"/);
  });

  it('ссылочная форма: обёртка <a> — поведение слот сайта (Context)', () => {
    expect(html).toContain('id="ui-video-link"');
    expect(html).toMatch(/<a\s+class="ui-video"\s+href="/);
  });

  it('демо токен-хука --ui-video-play-size: размер play без fork’а (Scope)', () => {
    expect(html).toContain('--ui-video-play-size');
    expect(html).toContain('id="ui-video-play-size"');
  });

  it('постер-подложка стенда — тёмный кадр (градиент a72 читается на эталоне)', () => {
    expect(html).toMatch(/<img\b[^>]*>/);
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и дист (DoD, Testing requirements)', () => {
  // presence-пин читает собранный dist: воркер дожидается билда прогона
  // (tests/helpers/unit-build.mjs, T13.7) — в свежем CI-чекауте dist ещё нет,
  // и параллельный билдер tokens-stand/themes мог не успеть (флак ENOENT,
  // ловили на stat-пине, CI 40212544247).
  beforeAll(async () => {
    await buildForUnitTests(root);
  }, 60000);

  it("'ui-video' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/'ui-video',\s*\/\/ T17\.6/);
  });

  it('presence-пин dist: .ui-video доезжает до сайтов в ui-core.min.css (регресс сборки)', () => {
    const core = readFileSync(join(root, 'dist', 'ui-core.min.css'), 'utf8');
    expect(core).toContain('.ui-video');
    expect(core).toContain('.ui-video__poster');
    expect(core).toContain('.ui-video__overlay');
    expect(core).toContain('.ui-video__play');
    expect(core).toContain('.ui-video__time');
  });

  it('метаданные док-страницы showcase/docs/ui-video.mjs (шаблон T10.1, прогон T10.2)', () => {
    expect(existsSync(join(root, 'showcase', 'docs', 'ui-video.mjs'))).toBe(true);
  });

  it('README: a11y do/don’t имени кнопки и постера, API-таблица (AC)', () => {
    const readme = readOr(join(root, 'components', 'ui-video', 'README.md'));
    expect(readme).toMatch(/Смотреть видео/);
    expect(readme).toMatch(/alt=""/);
    expect(readme).toContain('--ui-video-play-size');
    for (const section of [
      '## API',
      '## Клавиатура и a11y',
      "## Do / Don't",
      '## Известные границы',
    ]) {
      expect(readme, `секция ${section}`).toContain(section);
    }
  });
});

describe('пилот: видео-блок главной на компоненте, cp-video снят (Scope T17.6)', () => {
  const pilotDir = join(root, 'pilot', 'career-portal');
  const build = readOr(join(pilotDir, 'build.mjs'));
  const pilotCss = stripCssComments(readOr(join(pilotDir, 'pilot.css')));

  it('главная: инстанс ui-video с именем кнопки («Смотреть видео …», a11y-параметр разметки)', () => {
    expect(build).toMatch(/<button class="ui-video" type="button" aria-label="Смотреть видео/);
    expect(build).toContain('ui-video__poster');
    expect(build).toContain('ui-video__time');
  });

  it('правила .cp-video__* сняты из pilot.css (~50 строк, AC)', () => {
    for (const selector of [
      '.cp-video__player',
      '.cp-video__poster',
      '.cp-video__overlay',
      '.cp-video__play',
      '.cp-video__time',
    ]) {
      expect(blockOf(pilotCss, selector), `${selector} снято из pilot.css`).toBeFalsy();
    }
    expect(pilotCss, 'упоминаний cp-video не осталось').not.toContain('cp-video');
  });

  it('compare: проба video-block ведёт на .ui-video (AC «высота в пороге ±4px»)', () => {
    const compare = readOr(join(pilotDir, 'compare.mjs'));
    expect(compare).toMatch(/\['video-block',\s*'\.video-block',\s*'\.ui-video'\]/);
  });
});
