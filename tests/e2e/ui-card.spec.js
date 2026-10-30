/**
 * e2e ui-card (T4.4; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-card (showcase/dist/stands/ui-card.html).
 * Проверяется:
 *  1. варианты: computed-значения базы / --filled / --hover (рамка #D6D6D6 →
 *     --ui-border-color, радиус --ui-radius-md, фон surface/surface-muted);
 *     hover-состояние на hover-устройствах: рамка --ui-color-border-hover
 *     (career-portal #B9C6DE) + тень --ui-shadow-md (0 12px 32px blue-800-10);
 *  2. hover-гвард (AC): touch-эмуляция Playwright hasTouch —
 *     `(hover: hover)` не матчится, hover НЕ меняет рамку/тень и не
 *     перекрашивает контент-ссылку (sticky-hover «не залипает»);
 *  3. карточка-ссылка: Tab-порядок осмысленный (ссылка → вложенная кнопка,
 *     AC), одна остановка скринридера (доступное имя = текст ссылки, без
 *     «съедания» вложенной кнопки); фокус растянутой ссылки виден по всей
 *     площади карточки (AC): локальная обводка ссылки заменена контуром
 *     ::after (focus-policy.md «Правило для компонентов»);
 *  4. клик-зоны: тело карточки ведёт как ссылка (угол карточки далеко от
 *     текста ссылки), вложенная кнопка остаётся кликабельной (переход не
 *     происходит);
 *  5. контраст текста на карточках (сквозной с T2.3, либа tests/contrast):
 *     ≥ 4.5:1 на surface и surface-muted; on-dark на primary (CTA) ≥ 4.5:1;
 *     on-dark на accent CTA — одобренное исключение 3.12:1 (T2.6/ADR-0010);
 *  6. axe: violations вне реестра = 0 — accent CTA-карточка покрыта строкой
 *     KNOWN_AXE_EXCEPTIONS (T17.8, как ui-button--accent/ui-video__play);
 *  7. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import {
  a11y,
  KNOWN_AXE_EXCEPTIONS,
  openStand,
  shot,
  test as standTest,
  unexpectedViolations,
  VIEWPORTS,
} from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-card/index.html). */
const CARD = {
  base: 'ui-card-default',
  hover: 'ui-card-hover',
  filled: 'ui-card-filled',
  slots: 'ui-card-slots',
  link: 'ui-card-link',
  linkTitle: 'ui-card-link-title',
  linkButton: 'ui-card-link-button',
  ctaPrimary: 'ui-card-cta-primary',
  ctaEmail: 'ui-card-cta-email',
  ctaAccentRow: 'ui-card-cta-accent-row',
  mediaEvent: 'ui-card-media-event',
  mediaArticle: 'ui-card-media-article',
  mediaSquare: 'ui-card-media-square',
};

/** Вычисленное состояние карточки/ссылки. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      position: style.position,
      display: style.display,
      flexDirection: style.flexDirection,
      gap: style.gap,
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
    };
  });

/** Цели Tab-обхода (паттерн focus.spec.js). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Состояние фокуса: обводка элемента и его ::after (растянутая ссылка). */
const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const own = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    return {
      id: el.id,
      tag: el.tagName.toLowerCase(),
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: own.outlineWidth,
      outlineStyle: own.outlineStyle,
      afterOutlineWidth: after.outlineWidth,
      afterOutlineStyle: after.outlineStyle,
      afterOutlineColor: after.outlineColor,
    };
  });

standTest.describe('ui-card (T4.4)', () => {
  standTest(
    'варианты: computed-значения базы / --filled / --hover до наведения',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // База: career-portal .card (components.css:115–120) на токенах слоя 2.
      const base = await stateOf(page, CARD.base);
      expect(base.backgroundColor, 'фон — --ui-color-surface').toBe('rgb(255, 255, 255)');
      expect(base.borderColor, 'рамка — --ui-border-color (#D6D6D6)').toBe('rgb(214, 214, 214)');
      expect(base.borderRadius, 'радиус — --ui-radius-md (16px, --radius-card)').toBe('16px');
      expect(base.boxShadow, 'тени в базе нет').toBe('none');
      expect(base.position, 'relative — точка позиционирования растянутой ссылки').toBe('relative');
      expect(base.display, 'слоты на флексе (Technical considerations)').toBe('flex');
      expect(base.flexDirection).toBe('column');
      expect(base.gap, 'gap слотов — --ui-card-gap (14px pages.css:42)').toBe('14px');
      expect(base.padding, 'паддинг — --ui-space-5 (24px .vac-card pages.css:43)').toBe('24px');

      // --filled: фон и рамка surface-muted (career-portal .card--filled).
      const filled = await stateOf(page, CARD.filled);
      expect(filled.backgroundColor, 'фон — --ui-color-surface-muted (blue-50)').toBe(
        'rgb(241, 245, 254)',
      );
      expect(filled.borderColor, 'рамка — surface-muted (бесшовная карточка)').toBe(
        'rgb(241, 245, 254)',
      );

      // --hover до наведения выглядит как база (эффект — только в :hover).
      const hoverIdle = await stateOf(page, CARD.hover);
      expect(hoverIdle.borderColor).toBe(base.borderColor);
      expect(hoverIdle.boxShadow).toBe('none');
    },
  );

  standTest(
    'hover на hover-устройствах: рамка --ui-color-border-hover + тень --ui-shadow-md',
    async ({ stand }) => {
      const page = await stand('ui-card');
      expect(
        await page.evaluate(() => matchMedia('(hover: hover)').matches),
        'контекст стенда — hover-устройство',
      ).toBe(true);

      await page.locator(`#${CARD.hover}`).hover();
      await expect
        .poll(() => stateOf(page, CARD.hover), { timeout: 5000 })
        .toMatchObject({ borderColor: 'rgb(185, 198, 222)' });
      const after = await stateOf(page, CARD.hover);
      expect(
        after.boxShadow,
        'тень — --ui-shadow-md (0 12px 32px blue-800-10, career-portal components.css:124)',
      ).toContain('rgba(0, 40, 86, 0.1)');
      // Геометрия тени — с допуском 0.5px: webkit квантует blur/offset
      // («0px 11.965287px 31.907434px», ночной 40060880043), строковое
      // toContain('0px 12px 32px') мигало flaky между прогонами.
      const shadow = after.boxShadow.match(/0px ([\d.]+)px ([\d.]+)px/);
      expect(shadow, 'тень двухкоординатная (offset-y, blur)').not.toBeNull();
      expect(Number(shadow[1]), 'offset-y тени 12px').toBeCloseTo(12, 0);
      expect(Number(shadow[2]), 'blur тени 32px').toBeCloseTo(32, 0);
    },
  );

  standTest(
    'hover-гвард (AC): touch-эмуляция hasTouch — эффект отсутствует, sticky-hover не «залипает»',
    async ({ browser }) => {
      // Отдельный контекст с hasTouch (AC называет именно его): в chromium
      // уже он переключает media на (hover: none)/(pointer: coarse) и
      // поддерживается всеми движками матрицы (без chromium-only isMobile).
      const context = await browser.newContext({
        hasTouch: true,
        viewport: VIEWPORTS.mobile,
      });
      const page = await context.newPage();
      await openStand(page, 'ui-card');

      expect(
        await page.evaluate(() => matchMedia('(hover: hover)').matches),
        'touch-эмуляция: (hover: hover) не матчится',
      ).toBe(false);
      expect(
        await page.evaluate(() => matchMedia('(hover: none)').matches),
        '(hover: none) — touch-устройство',
      ).toBe(true);

      const before = await stateOf(page, CARD.hover);
      await page.locator(`#${CARD.hover}`).hover();
      // Переход --ui-transition (0.25s) закончился бы в пределах 400 мс —
      // эффект отсутствует означает: ничего не меняется и после него.
      await page.waitForTimeout(400);
      const after = await stateOf(page, CARD.hover);
      expect(after.borderColor, 'рамка не изменилась').toBe(before.borderColor);
      expect(after.boxShadow, 'тень не появилась').toBe(before.boxShadow);

      // Перекраска контент-ссылки карточки-ссылки тоже под гвардом.
      const linkBefore = await page
        .locator(`#${CARD.linkTitle}`)
        .evaluate((el) => getComputedStyle(el).color);
      await page.locator(`#${CARD.link}`).hover();
      await page.waitForTimeout(400);
      const linkAfter = await page
        .locator(`#${CARD.linkTitle}`)
        .evaluate((el) => getComputedStyle(el).color);
      expect(linkAfter, 'ссылка не перекрашена').toBe(linkBefore);

      await context.close();
    },
  );

  standTest(
    'карточка-ссылка: одна остановка (имя = текст ссылки), Tab-порядок ссылка → вложенная кнопка (AC)',
    async ({ stand }) => {
      const page = await stand('ui-card');

      const link = page.locator(`#${CARD.linkTitle}`);
      const button = page.locator(`#${CARD.linkButton}`);

      // Доступное имя растянутой ссылки — текст ссылки; вложенная кнопка НЕ
      // «съедена» (не входит в имя и остаётся отдельной остановкой).
      await expect(link).toHaveAccessibleName('Вакансия: стажёр в команду разработки');
      await expect(button).toHaveAccessibleName('Откликнуться');

      // Tab-порядок — обходом стенда (паттерн focus.spec.js): растянутая
      // ссылка и вложенная кнопка — соседние остановки в DOM-порядке.
      const total = await page.evaluate(
        (selector) => document.querySelectorAll(selector).length,
        FOCUSABLE_SELECTOR,
      );
      const visited = [];
      for (let step = 0; step < total; step += 1) {
        await page.keyboard.press('Tab');
        const state = await focusState(page);
        expect(state.tag, `шаг ${step + 1}: фокус не ушёл в body`).not.toBe('body');
        visited.push(state.id || state.tag);
      }
      const linkStep = visited.indexOf(CARD.linkTitle);
      expect(linkStep, 'растянутая ссылка в Tab-порядке').toBeGreaterThan(-1);
      expect(visited[linkStep + 1], 'AC: следующая остановка после ссылки — вложенная кнопка').toBe(
        CARD.linkButton,
      );
    },
  );

  standTest(
    'фокус растянутой ссылки виден по всей площади карточки (AC, focus-policy.md)',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Клавиатурный фокус: Tab от предыдущей остановки стенда.
      const linkIndex = await page.evaluate(
        (selector) =>
          [...document.querySelectorAll(selector)].indexOf(
            document.querySelector('#ui-card-link-title'),
          ),
        FOCUSABLE_SELECTOR,
      );
      for (let step = 0; step <= linkIndex; step += 1) {
        await page.keyboard.press('Tab');
      }

      const state = await focusState(page);
      expect(state.id, 'фокус на растянутой ссылке').toBe(CARD.linkTitle);
      expect(state.focusVisible, 'клавиатурный фокус — :focus-visible').toBe(true);
      // Замена локальной обводки: стиль ссылки none — кольцо не рисуется
      // (ширина при этом вычисляется как medium — пиним именно стиль).
      expect(state.outlineStyle, 'локальная обводка ссылки заменена — style none').toBe('none');
      expect(
        parseFloat(state.afterOutlineWidth),
        `AC: контур ::after по всей карточке ≥ 3px (факт ${state.afterOutlineWidth})`,
      ).toBeGreaterThanOrEqual(3);
      expect(state.afterOutlineStyle, 'контур solid').toBe('solid');
      expect(state.afterOutlineColor, 'цвет — focus-тройка (--ui-focus-color)').toBe(
        'rgb(0, 40, 86)',
      );

      // Геометрия: ::after (inset 0 относительно relative-карточки) больше
      // бокса самой ссылки — обводка рисуется по всей карточке.
      const boxes = await page.evaluate(() => {
        const card = document.querySelector('#ui-card-link').getBoundingClientRect();
        const link = document.querySelector('#ui-card-link-title').getBoundingClientRect();
        const after = getComputedStyle(document.querySelector('#ui-card-link-title'), '::after');
        return {
          cardArea: card.width * card.height,
          linkArea: link.width * link.height,
          afterPosition: after.position,
        };
      });
      expect(boxes.afterPosition, '::after позиционирован абсолютно').toBe('absolute');
      expect(
        boxes.cardArea,
        'площадь ::after = карточка: боксов ссылки мало для обводки',
      ).toBeGreaterThan(boxes.linkArea * 2);

      // Enter на растянутой ссылке ведёт как ссылка (одно остановочное место).
      await page.keyboard.press('Enter');
      await expect.poll(() => page.url()).toContain('#ui-card-link');
    },
  );

  standTest(
    'клик-зоны: угол карточки ведёт как ссылка, вложенная кнопка не «продавливается»',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Клик в верхний правый угол карточки — зона паддинга, далеко от текста
      // ссылки: растянутая ::after-ссылка покрывает ВСЮ карточку.
      // Клик по позиции ЭЛЕМЕНТА (не сырые координаты мыши): в сайдбар-каркасе
      // полигона карточка выше вьюпорта — boundingBox.y может уйти в минус
      // после scrollIntoViewIfNeeded, и mouse.click мимо элемента (аудит
      // каркаса 29.10); locator.click сам держит точку в зоне видимости.
      const card = page.locator(`#${CARD.link}`);
      const box = await card.boundingBox();
      await card.click({ position: { x: box.width - 10, y: 10 } });
      await expect.poll(() => page.url()).toContain('#ui-card-link');

      // Вложенная кнопка выше растянутой ссылки (nested-interactive): клик
      // остаётся на кнопке — перехода нет.
      const urlBefore = page.url();
      await page.locator(`#${CARD.linkButton}`).click();
      expect(page.url(), 'клик по кнопке не ведёт по ссылке').toBe(urlBefore);
    },
  );

  standTest(
    'контраст (сквозной с T2.3): текст на surface и surface-muted ≥ 4.5:1',
    async ({ stand }) => {
      const page = await stand('ui-card');

      const assertAA = async (cardId) => {
        const { color, backdrop } = await page
          .locator(`#${cardId} .ui-card__body`)
          .evaluate((el) => ({
            color: getComputedStyle(el).color,
            backdrop: getComputedStyle(el.closest('.ui-card')).backgroundColor,
          }));
        const ratio = contrastRatio(color, backdrop);
        expect(ratio, `${cardId}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      };
      await assertAA(CARD.base);
      await assertAA(CARD.filled);
    },
  );

  standTest(
    'CTA-карточка (T17.8): computed-значения поверхностей, ритма и on-dark-пары',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Primary-центр: ритм pad 48/24 (space-7/space-5), шаг space-3, радиус lg;
      // заливка primary, on-dark-пара компонентом.
      const primary = await page.locator(`#${CARD.ctaPrimary}`).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          display: s.display,
          flexDirection: s.flexDirection,
          alignItems: s.alignItems,
          gap: s.gap,
          padding: s.padding,
          borderRadius: s.borderRadius,
          textAlign: s.textAlign,
          backgroundColor: s.backgroundColor,
          color: s.color,
        };
      });
      expect(primary.display, 'слоты на флексе базы').toBe('flex');
      expect(primary.flexDirection).toBe('column');
      expect(primary.alignItems, 'центр-композиция (дети по крест-оси)').toBe('center');
      expect(primary.gap, 'шаг слотов — --ui-space-3 (12px)').toBe('12px');
      expect(primary.padding, 'ритм — pad 48/24 (--ui-space-7/--ui-space-5)').toBe('48px 24px');
      expect(primary.borderRadius, 'радиус — --ui-radius-lg (24px)').toBe('24px');
      expect(primary.textAlign).toBe('center');
      expect(primary.backgroundColor, 'заливка — --ui-color-primary').toBe('rgb(0, 40, 86)');
      expect(primary.color, 'on-dark-пара текста — компонентом').toBe('rgb(255, 255, 255)');

      // Заголовочная роль на заливке — on-dark: цвет роли heading = primary,
      // на заливке primary заголовок был бы невидим (живой баг пилота до T17.8).
      const h2Color = await page
        .locator(`#${CARD.ctaPrimary} .ui-h2`)
        .evaluate((el) => getComputedStyle(el).color);
      expect(h2Color, 'ui-h2 на primary-заливке — on-dark (не heading)').toBe('rgb(255, 255, 255)');

      // Контраст email-ссылки на primary ≥ 4.5:1 (ui-link--on-dark).
      const email = await page.locator(`#${CARD.ctaEmail}`).evaluate((el) => ({
        color: getComputedStyle(el).color,
        fs: getComputedStyle(el).fontSize,
      }));
      expect(email.color).toBe('rgb(255, 255, 255)');
      const primaryRatio = contrastRatio(email.color, primary.backgroundColor);
      expect(
        primaryRatio,
        `on-dark на primary: ${primaryRatio.toFixed(2)}:1 ≥ 4.5`,
      ).toBeGreaterThanOrEqual(4.5);

      // Row: горизонтальная плашка space-between со слотом действия.
      const row = await page.locator(`#${CARD.ctaAccentRow}`).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          display: s.display,
          flexDirection: s.flexDirection,
          justifyContent: s.justifyContent,
          alignItems: s.alignItems,
          padding: s.padding,
          backgroundColor: s.backgroundColor,
          color: s.color,
        };
      });
      expect(row.display).toBe('flex');
      expect(row.flexDirection, 'row — плашка горизонтальная').toBe('row');
      expect(row.justifyContent, 'слот действия прижат к правому краю').toBe('space-between');
      expect(row.alignItems, 'вертикальное центрирование слота').toBe('center');
      expect(row.padding, 'ритм плитки — pad space-5 (cp-vacancy-search__all)').toBe('24px');
      expect(row.backgroundColor, 'заливка — --ui-color-accent').toBe('rgb(242, 103, 34)');

      // Подпись плитки — роль ui-h4, перекрашена компонентом в on-dark.
      const span = await page
        .locator(`#${CARD.ctaAccentRow} .ui-h4`)
        .evaluate((el) => getComputedStyle(el).color);
      expect(span, 'ui-h4 на accent-заливке — on-dark').toBe('rgb(255, 255, 255)');

      // Стрелка — svg сайта в слоте действия, aria-hidden (имя ссылки = текст).
      const svgHidden = await page
        .locator(`#${CARD.ctaAccentRow} svg`)
        .evaluate((el) => el.getAttribute('aria-hidden'));
      expect(svgHidden, 'иконка слота — aria-hidden (декоративная)').toBe('true');
      await expect(page.locator(`#${CARD.ctaAccentRow}`)).toHaveAccessibleName('Все 140 вакансий');
    },
  );

  standTest(
    'контраст on-dark на accent CTA-карточки — одобренное исключение 3.12:1 (T2.6/ADR-0010)',
    async ({ stand }) => {
      const page = await stand('ui-card');
      const { color, backdrop } = await page.locator(`#${CARD.ctaAccentRow}`).evaluate((el) => ({
        color: getComputedStyle(el).color,
        backdrop: getComputedStyle(el).backgroundColor,
      }));
      const ratio = contrastRatio(color, backdrop);
      // Точная пара одобренного дизайна: 3.12:1 (< 4.5 мелкого текста —
      // axe-исключение строкой реестра, тест ниже).
      expect(ratio, `on-dark на accent: ${ratio.toFixed(2)}:1 = одобренные 3.12:1`).toBeCloseTo(
        3.12,
        2,
      );
    },
  );

  standTest(
    'axe: violations вне реестра = 0 (accent CTA — строка реестра, как ui-video__play)',
    async ({ stand }) => {
      const page = await stand('ui-card');
      const results = await a11y(page).analyze();
      expect(unexpectedViolations(results), 'axe: ноль нарушений вне KNOWN_AXE_EXCEPTIONS').toEqual(
        [],
      );
      // AC T17.8 «контраст-гейт (исключение — строкой)»: запись реестра
      // обязана существовать — подпись плитки fs-h4 20px/500 axe меряет как
      // мелкий текст 4.5:1 (пара on-dark-on-accent 3.12:1, T2.6/ADR-0010).
      expect(
        KNOWN_AXE_EXCEPTIONS.some(
          (exception) =>
            exception.id === 'color-contrast' && exception.match.test('.ui-card--cta--accent'),
        ),
        'запись реестра для .ui-card--cta--accent ведена (harness.js + tests/README.md)',
      ).toBe(true);
    },
  );

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-card');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-card', viewport });
    }
  });

  standTest(
    'медиа-карточка (T17.5): слоты фото/тега/тела/меты — computed-значения каркаса',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Слот фото: пропорции — на слоте (3/2), relative — точка тега; img —
      // cover и радиус md/md 0 0 каркасом (Implementation requirements п.3).
      const media = await page.locator(`#${CARD.mediaEvent} .ui-card__media`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { position: s.position, aspectRatio: s.aspectRatio };
      });
      expect(media.position, 'relative — точка позиционирования __media-tag').toBe('relative');
      expect(media.aspectRatio, 'базовые пропорции фото — 3/2').toBe('3 / 2');

      const img = await page.locator(`#${CARD.mediaEvent} .ui-card__media > img`).evaluate((el) => {
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const slot = el.parentElement.getBoundingClientRect();
        return {
          objectFit: s.objectFit,
          borderRadius: s.borderRadius,
          width: s.width,
          height: s.height,
          fillsSlot:
            Math.abs(box.height - slot.height) < 0.5 && Math.abs(box.width - slot.width) < 0.5,
        };
      });
      expect(img.objectFit, 'object-fit: cover — каркасом').toBe('cover');
      expect(img.borderRadius, 'радиус фото — md/md 0 0 (канон «фото сверху»)').toBe(
        '16px 16px 0px 0px',
      );
      expect(img.fillsSlot, 'img заполняет слот (width/height 100%)').toBe(true);

      // Тег на фото: позиция каркаса (top/left 8px = --ui-space-2), вид —
      // готовый ui-tag (тинт варианта).
      const tag = await page.locator(`#${CARD.mediaEvent} .ui-card__media-tag`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { position: s.position, top: s.top, left: s.left, display: s.display };
      });
      expect(tag.position, 'тег — absolute-слот каркаса').toBe('absolute');
      expect(tag.top, 'top 8px (--ui-space-2, канон)').toBe('8px');
      expect(tag.left, 'left 8px (--ui-space-2, канон)').toBe('8px');
      // Вид тега — готовый ui-tag (тинт варианта): контент несёт разметка.
      await expect(page.locator(`#${CARD.mediaEvent} .ui-card__media-tag`)).toHaveText(
        'Регистрация',
      );

      // Тело: флекс-колонка gap 8 / паддинг 12; типографику несёт разметка
      // (дата ui-small+muted 14px, заголовок ui-h6 20px).
      const body = await page.locator(`#${CARD.mediaEvent} .ui-card__body`).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          display: s.display,
          flexDirection: s.flexDirection,
          gap: s.gap,
          padding: s.padding,
        };
      });
      expect(body.display, 'тело — флекс-колонка (канон)').toBe('flex');
      expect(body.flexDirection).toBe('column');
      expect(body.gap, 'gap тела — --ui-space-2 (8px)').toBe('8px');
      expect(body.padding, 'паддинг тела — --ui-space-3 (12px)').toBe('12px');

      const date = await page.locator(`#${CARD.mediaEvent} .ui-card__body time`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { fs: s.fontSize, fw: s.fontWeight, color: s.color };
      });
      expect(date.fs, 'дата — ui-small 14px (роль разметки, не каркас)').toBe('14px');
      expect(date.fw, 'дата — fw 500 роли ui-small').toBe('500');
      expect(date.color, 'дата — muted (ui-text--muted)').toBe('rgb(97, 97, 97)');

      const meta = await page.locator(`#${CARD.mediaEvent} .ui-card__meta`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { display: s.display, flexWrap: s.flexWrap, gap: s.gap };
      });
      expect(meta.display, 'мета-теги — лента').toBe('flex');
      expect(meta.flexWrap, 'с переносом').toBe('wrap');
      expect(meta.gap, 'gap ленты — --ui-space-1 (4px)').toBe('4px');
    },
  );

  standTest(
    'медиа-карточка: --square 1/1 (стажёр) и одна кликабельная зона --link (фото-зона внутри растянутой ссылки)',
    async ({ stand }) => {
      const page = await stand('ui-card');

      const square = await page.locator(`#${CARD.mediaSquare} .ui-card__media`).evaluate((el) => {
        const s = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return { aspectRatio: s.aspectRatio, square: Math.abs(box.width - box.height) < 0.5 };
      });
      expect(square.aspectRatio, '--square — 1/1 (карточка стажёра)').toBe('1 / 1');
      expect(square.square, 'бокс слота квадратный').toBe(true);

      // Событие: __media и __body внутри __link — вся карточка одна цель
      // (клик по фото-зоне ведёт по ссылке, тег не интерактивен).
      const linkHref = await page
        .locator(`#${CARD.mediaEvent} .ui-card__link`)
        .evaluate((el) => el.getAttribute('href'));
      expect(linkHref, 'контент-ссылка оборачивает медиа-зону и тело').toBe(
        '#ui-card-media-heading',
      );
      const covered = await page.locator(`#${CARD.mediaEvent} .ui-card__media`).evaluate((el) => {
        const link = el.closest('.ui-card__link');
        const linkAfter = getComputedStyle(link, '::after');
        return linkAfter.content !== 'none' && linkAfter.position === 'absolute';
      });
      expect(covered, 'растянутая ссылка (::after inset 0) покрывает медиа-зону').toBe(true);
    },
  );
});
