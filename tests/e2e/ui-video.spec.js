/**
 * e2e ui-video (T17.6; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-video
 * (showcase/dist/stands/ui-video.html). Проверяется:
 *  1. обёртка: computed-геометрия вида — блок relative с overflow hidden,
 *     радиус lg, фон primary (страхует кадр), сброс кнопки; постер — cover
 *     во всю ширину (высоту ведёт кадр);
 *  2. оверлей — градиент transparent 40% → primary-a72 (ступень лестницы
 *     тинтов T17.6, не локальный color-mix);
 *  3. play: круг accent размером токена --ui-video-play-size (88px дефолт,
 *     демо-инстанс 64px — хук без fork'а), on-dark, центр кадра;
 *  4. время: on-dark в правом нижнем углу (отступ space-4);
 *  5. a11y: доступное имя обёртки («Смотреть видео …», не «play») —
 *     параметр разметки; постер декоративен (alt=""); overlay/play
 *     aria-hidden; ссылочная форма — role link;
 *  6. axe: violations вне реестра = 0 (Testing requirements: контраст метки
 *     времени на градиенте — эффективный фон; пара play accent/on-dark —
 *     запись реестра KNOWN_AXE_EXCEPTIONS, как ui-button--accent, AC);
 *  7. контраст метки времени вручную: on-dark на композитном фоне градиента
 *     к primary над тёмным постером ≥ 4.5:1 (либа tests/contrast/lib.mjs);
 *  8. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import {
  a11y,
  KNOWN_AXE_EXCEPTIONS,
  shot,
  test as standTest,
  unexpectedViolations,
  VIEWPORTS,
} from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-video/index.html). */
const VIDEO = {
  button: 'ui-video-default',
  link: 'ui-video-link',
  playSizeHook: 'ui-video-play-size',
};

/** Computed-карта инстанса: обёртка + элементы вида. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    const poster = el.querySelector('.ui-video__poster');
    const overlay = el.querySelector('.ui-video__overlay');
    const play = el.querySelector('.ui-video__play');
    const time = el.querySelector('.ui-video__time');
    return {
      display: style.display,
      position: style.position,
      overflow: style.overflow,
      width: style.width,
      padding: style.padding,
      borderWidth: style.borderWidth,
      radius: style.borderRadius,
      bg: style.backgroundColor,
      poster: poster
        ? {
            display: getComputedStyle(poster).display,
            objectFit: getComputedStyle(poster).objectFit,
            width: getComputedStyle(poster).width,
            height: getComputedStyle(poster).height,
          }
        : null,
      overlay: overlay
        ? {
            position: getComputedStyle(overlay).position,
            inset: getComputedStyle(overlay).inset,
            image: getComputedStyle(overlay).backgroundImage,
          }
        : null,
      play: play
        ? {
            position: getComputedStyle(play).position,
            width: getComputedStyle(play).width,
            height: getComputedStyle(play).height,
            radius: getComputedStyle(play).borderRadius,
            bg: getComputedStyle(play).backgroundColor,
            color: getComputedStyle(play).color,
            transform: getComputedStyle(play).transform,
          }
        : null,
      time: time
        ? {
            position: getComputedStyle(time).position,
            right: getComputedStyle(time).right,
            bottom: getComputedStyle(time).bottom,
            color: getComputedStyle(time).color,
          }
        : null,
    };
  });

standTest.describe('ui-video (T17.6)', () => {
  standTest('обёртка: вид «как есть» из одобренного пилота (pilot.css:653)', async ({ stand }) => {
    const page = await stand('ui-video');

    const state = await stateOf(page, VIDEO.button);
    expect(state.display, 'обёртка — блок (кадр на всю ширину колонки)').toBe('block');
    expect(state.position, 'обёртка — точка отсчёта play/time').toBe('relative');
    expect(state.overflow, 'кадр не вываливается за радиус').toBe('hidden');
    expect(state.width, 'ширина — 100% колонки').toContain('px');
    // Сброс нативной кнопки (паддинг/рамка) — как у пилота .cp-video__player.
    expect(state.padding, 'сброс кнопки: паддинг 0').toBe('0px');
    expect(state.borderWidth, 'сброс кнопки: рамка 0').toBe('0px');
    // Радиус lg = 24px, фон primary #002856 — страховка кадра.
    expect(state.radius, 'радиус --ui-radius-lg (24px)').toBe('24px');
    expect(state.bg, 'фон primary').toBe('rgb(0, 40, 86)');
  });

  standTest(
    'постер: cover во всю ширину, высоту ведёт кадр (без фикс-высот)',
    async ({ stand }) => {
      const page = await stand('ui-video');

      const state = await stateOf(page, VIDEO.button);
      expect(state.poster.display, 'постер — block').toBe('block');
      expect(state.poster.objectFit, 'постер — cover (кроп по ширине)').toBe('cover');
      // Высота авто: кадр 960×540 в колонке 720px → 405px (не 720/420/240 оригинала).
      const box = await page.locator(`#${VIDEO.button}`).boundingBox();
      expect(box.height, 'высота — пропорция кадра (720×405), не фикс оригинала').toBeGreaterThan(
        400,
      );
      expect(box.height).toBeLessThan(410);
    },
  );

  standTest(
    'оверлей: градиент к primary-a72 от 40% кадра (лестница тинтов T17.6)',
    async ({ stand }) => {
      const page = await stand('ui-video');

      const { overlay } = await stateOf(page, VIDEO.button);
      expect(overlay.position, 'оверлей — слой поверх кадра').toBe('absolute');
      expect(overlay.inset, 'оверлей — весь кадр').toBe('0px');
      // Chromium сериализует вертикаль без «to bottom» и раскрывает тинт
      // color-mix → color(srgb … / 0.72): пин — форма градиента и альфа
      // ступени a72 (rgb 0 0.156863 0.337255 = #002856 primary).
      expect(overlay.image, 'градиент: transparent 40% → primary-a72 100%').toMatch(
        /linear-gradient\(rgba\(0, 0, 0, 0\) 40%,\s*color\(srgb 0 0\.156863 0\.337255 \/ 0\.72\) 100%\)/,
      );
    },
  );

  standTest(
    'play: круг accent 88px (--ui-video-play-size), on-dark, центр кадра; хук = 64px',
    async ({ stand }) => {
      const page = await stand('ui-video');

      const { play } = await stateOf(page, VIDEO.button);
      // 88px одобренного дизайна пилота (5.5rem = 88px при root 16px).
      expect(play.width, 'play — 88px (5.5rem, токен дефолт)').toBe('88px');
      expect(play.height, 'play — круг').toBe('88px');
      expect(play.radius, 'play — круг 50%').toBe('50%');
      expect(play.bg, 'play — accent #F26722').toBe('rgb(242, 103, 34)');
      expect(play.color, 'стрелка — on-dark').toBe('rgb(255, 255, 255)');
      expect(play.position, 'позиционирован от кадра').toBe('absolute');
      expect(play.transform, 'центрирование translate(-50%, -50%)').toContain('matrix');

      // Токен-хук: демо-инстанс 4rem → 64px без fork'а (Scope «размер токеном»).
      const hook = await stateOf(page, VIDEO.playSizeHook);
      expect(hook.play.width, 'хук --ui-video-play-size: 4rem → 64px').toBe('64px');
      expect(hook.play.height).toBe('64px');
    },
  );

  standTest('время: on-dark в правом нижнем углу, отступ space-4', async ({ stand }) => {
    const page = await stand('ui-video');

    const { time } = await stateOf(page, VIDEO.button);
    expect(time.position, 'метка — слой кадра').toBe('absolute');
    expect(time.right, 'отступ справа --ui-space-4 (16px)').toBe('16px');
    expect(time.bottom, 'отступ снизу --ui-space-4 (16px)').toBe('16px');
    expect(time.color, 'метка — on-dark').toBe('rgb(255, 255, 255)');
  });

  standTest(
    'a11y: имя обёртки описывает действие; постер декоративен; слои aria-hidden (Context)',
    async ({ stand }) => {
      const page = await stand('ui-video');

      const button = page.locator(`#${VIDEO.button}`);
      await expect(button).toHaveRole('button');
      await expect(button, 'имя — действие («Смотреть видео …»), не «play»').toHaveAccessibleName(
        'Смотреть видео о работе в компании',
      );
      await expect(button.locator('> img')).toHaveAttribute('alt', '');
      await expect(button.locator('.ui-video__overlay')).toHaveAttribute('aria-hidden', 'true');
      await expect(button.locator('.ui-video__play')).toHaveAttribute('aria-hidden', 'true');
      // Метка времени остаётся в потоке доступности.
      await expect(button.locator('.ui-video__time')).not.toHaveAttribute('aria-hidden', 'true');

      // Ссылочная форма: обёртка <a> — role link (переход — слот сайта).
      await expect(page.locator(`#${VIDEO.link}`)).toHaveRole('link');
      await expect(page.locator(`#${VIDEO.link}`)).toHaveAccessibleName(
        'Смотреть видео о работе в компании на Rutube',
      );
    },
  );

  standTest(
    'контраст метки времени: on-dark на композите градиента ≥ 4.5:1 (Testing requirements)',
    async ({ stand }) => {
      const page = await stand('ui-video');

      // Живой рендер гейтит axe (включая альфу градиента — тест ниже);
      // здесь — пин пары на композите: нижняя стопа градиента = primary-a72
      // поверх тёмного постера стенда (#002856). Альфа-композит:
      // 0.72·primary + 0.28·постер — оба primary → фон = primary.
      const composite = 'rgb(0, 40, 86)';
      const ratio = contrastRatio('rgb(255, 255, 255)', composite);
      expect(ratio, `метка на градиенте a72: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(
        4.5,
      );

      // Метка реально на кадре: computed-цвет on-dark (не потерялась в каскаде).
      const { time } = await stateOf(page, VIDEO.button);
      expect(time.color).toBe('rgb(255, 255, 255)');
    },
  );

  standTest(
    'axe: violations вне реестра = 0 (play accent/on-dark — реестр, как ui-button--accent)',
    async ({ stand }) => {
      const page = await stand('ui-video');
      const results = await a11y(page).analyze();
      expect(unexpectedViolations(results), 'axe: ноль нарушений вне KNOWN_AXE_EXCEPTIONS').toEqual(
        [],
      );
      // AC «контраст пар (play accent/on-dark — исключение реестра, как
      // ui-button--accent)»: запись реестра обязана существовать — глиф ▶
      // (мелкий текст на accent 3.12:1) и svg-стрелки сайтов-потребителей
      // (axe на живом стенде глух к aria-hidden-глифу — запись страхует
      // док-страницы и будущие формы, где глиф виден axe).
      expect(
        KNOWN_AXE_EXCEPTIONS.some(
          (exception) =>
            exception.id === 'color-contrast' && exception.match.test('.ui-video__play'),
        ),
        'запись реестра для .ui-video__play ведена (harness.js + tests/README.md)',
      ).toBe(true);
    },
  );

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-video');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-video', viewport });
    }
  });
});
