/**
 * e2e ui-carousel (T17.7; Testing requirements + AC) — клавиатурный сценарий
 * (roving tabindex на табах, стрелки, Home/End), деградация без JS, JSON-
 * слайды, галерея, axe, эталоны, пин reduced-motion.
 *
 * Поверхность — стенд ui-carousel (showcase/pages/ui-carousel) с двумя
 * секциями: #ucar-carousel-heading — карусель data-ui-carousel в фото-
 * композиции (bg+glow+позиции — связки ucar-* сайт-зоны стенда), JSON
 * слайдов в разметке, первый слайд продублирован в слотах; #ucar-gallery-
 * heading — фото-галерея data-ui-gallery в модалке направлений (ui-modal,
 * триггер data-ui-modal-target, стрелки ui-button--light — модуль вешает
 * поведение на data-хуки, не на класс). Проверяется:
 *  1. деградация без JS: в разметке стенда стрелки/степпер несут hidden
 *     (их снимает модуль), табы без tabindex (roving ставит модуль),
 *     слоты несут данные первого слайда; в контексте без JS первый слайд
 *     виден, контролы скрыты, консоль чиста (AC);
 *  2. инициализация: hidden снят, is-initialized на корне, roving tabindex
 *     (0 у активного, −1 у остальных), ровно один aria-selected, стартовый
 *     рендер первого слайда;
 *  3. клик: стрелка next/prev (с зацикливанием) и таб — активный слайд;
 *     слоты {photo,alt,title,text,link} обновлены; событие
 *     irao-ui:carousel-select (detail.index) доходит до приёмника сайта;
 *  4. клавиатура: →/← с зацикливанием и automatic-активацией (фокус и
 *     выбор вместе — APG, прецедент ui-tabs), Home/End; Tab уходит за
 *     степпер (roving tabindex);
 *  5. галерея: prev/next листают фото с зацикливанием, событие; в модалке
 *     (ui-modal) фото переключается;
 *  6. axe: стенд чист в исходном и переключённом состояниях (AC);
 *  7. пин reduced-motion: смена слайда при prefers-reduced-motion
 *     мгновенна — computed transition/animation у элементов компонента
 *     отсутствуют и в обычном режиме (анимаций нет конструктивно, AC);
 *  8. эталоны: исходное состояние на 4 вьюпортах; выбранный второй слайд и
 *     открытая галерея на втором фото — desktop (ADR-0004: создаются только
 *     в контейнере/CI, локально — no-op с аннотацией).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/ui-carousel/index.html). */
const SEL = {
  carouselSection: '#ucar-carousel-heading',
  root: '[data-ui-carousel]',
  photo: '[data-ui-carousel-photo]',
  title: '[data-ui-carousel-title]',
  text: '[data-ui-carousel-text]',
  link: '[data-ui-carousel-link]',
  prev: '[data-ui-carousel-prev]',
  next: '[data-ui-carousel-next]',
  stepper: '.ui-carousel__stepper',
  tabs: '.ui-carousel__tab',
  gallerySection: '#ucar-gallery-heading',
  galleryTrigger: '[data-ui-modal-target="ucar-gallery-dialog"]',
  galleryDialog: '#ucar-gallery-dialog',
  galleryRoot: '[data-ui-gallery]',
  galleryPhoto: '[data-ui-gallery-photo]',
  galleryPrev: '[data-ui-gallery-prev]',
  galleryNext: '[data-ui-gallery-next]',
};

/** Инициализация после загрузки: модуль defer — инстансы живы на networkidle. */
async function expectInitialized(page) {
  const rootEl = page.locator(SEL.root);
  await expect(rootEl).toHaveClass(/is-initialized/);
  await expect(rootEl).toHaveAttribute('data-ui-carousel-init', 'true');
  for (const control of [SEL.prev, SEL.next, SEL.stepper]) {
    await expect(page.locator(control), `hidden снят: ${control}`).not.toHaveAttribute('hidden');
  }
}

test.describe('ui-carousel: деградация без JS (AC)', () => {
  test('в разметке стенда контролы несут hidden, табы без tabindex — их ставит/снимает модуль', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');

    // Источник разметки (генерат полигона): комментарии стенда содержат
    // литеральные описания — пины смотрят на настоящую разметку.
    const source = (
      await page.request.get('/showcase/dist/stands/ui-carousel.html').then((r) => r.text())
    )
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script>/g, '');

    const arrowTags = [...source.matchAll(/<button[^>]*data-ui-carousel-(?:prev|next)[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(arrowTags.length, 'пара стрелок карусели в разметке').toBe(2);
    for (const tag of arrowTags) {
      expect(tag, `стрелка hidden в разметке (AC): ${tag}`).toMatch(/\bhidden\b/);
      expect(tag, `стрелка без tabindex в разметке: ${tag}`).not.toMatch(/\btabindex=/);
    }
    const stepperTag = source.match(/<ul[^>]*ui-carousel__stepper[^>]*>/)?.[0];
    expect(stepperTag, 'степпер в разметке').toBeTruthy();
    expect(stepperTag, 'степпер hidden в разметке (AC)').toMatch(/\bhidden\b/);
    const tabTags = [...source.matchAll(/<button[^>]*ui-carousel__tab[^>]*>/g)].map(([tag]) => tag);
    expect(tabTags.length, 'табы в разметке').toBe(3);
    for (const tag of tabTags) {
      expect(tag, `таб с ролью и aria-selected в разметке: ${tag}`).toMatch(
        /role="tab"[^>]*aria-selected="/,
      );
      expect(tag, `таб без tabindex в разметке (roving ставит модуль): ${tag}`).not.toMatch(
        /\btabindex=/,
      );
    }
    // Слоты несут данные первого слайда (деградация — контент в разметке).
    const photoTag = source.match(/<img[^>]*data-ui-carousel-photo[^>]*>/)?.[0];
    expect(photoTag, 'фото-слот с src первого слайда').toMatch(/\ssrc="data:image/);
  });

  test('без JS: первый слайд виден из слотов, контролы скрыты, консоль чиста (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const consoleErrors = [];
    const noJsPage = await context.newPage();
    noJsPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    noJsPage.on('pageerror', (err) => consoleErrors.push(String(err)));
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

      const rootEl = noJsPage.locator(SEL.root);
      await expect(rootEl, 'is-initialized не ставится без JS').not.toHaveClass(/is-initialized/);
      for (const control of [SEL.prev, SEL.next, SEL.stepper]) {
        await expect(noJsPage.locator(control), `контрол скрыт без JS: ${control}`).toBeHidden();
      }
      await expect(noJsPage.locator(SEL.photo), 'фото первого слайда видимо (AC)').toBeVisible();
      await expect(noJsPage.locator(SEL.title)).toHaveText('Производство');
      await expect(noJsPage.locator(SEL.link)).toHaveText('Подробнее: 25 вакансий');
      // Фото-слот носит alt из разметки (первый слайд).
      await expect(noJsPage.locator(SEL.photo)).toHaveAttribute('alt', 'Производство');
      expect(consoleErrors, 'консоль чиста без JS (AC)').toEqual([]);
    } finally {
      await context.close();
    }
  });
});

test.describe('ui-carousel: инициализация и клик (слоты, событие)', () => {
  test('модуль снимает hidden, ставит is-initialized, roving tabindex; старт — первый слайд', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    await expectInitialized(page);

    const tabs = page.locator(SEL.tabs);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');
    await expect(tabs.nth(2)).toHaveAttribute('tabindex', '-1');
    // Стрелки вне tablist: браться фокусом могут, ролью таба не обладают.
    await expect(page.locator(SEL.next)).not.toHaveAttribute('role', 'tab');
  });

  test('клик next/prev/таб: слоты {photo,alt,title,text,link} обновлены, зацикливание', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    await expectInitialized(page);
    const tabs = page.locator(SEL.tabs);

    await page.locator(SEL.next).click();
    await expect(page.locator(SEL.title)).toHaveText('Женские вакансии на производстве');
    await expect(page.locator(SEL.photo)).toHaveAttribute(
      'alt',
      'Женские вакансии на производстве',
    );
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    await page.locator(SEL.prev).click();
    await expect(page.locator(SEL.title)).toHaveText('Производство');

    // ← с первого — на последний (зацикливание).
    await page.locator(SEL.prev).click();
    await expect(page.locator(SEL.title)).toHaveText('Административная работа');
    // Третий слайд несёт link в данных: CTA-подпись = slide.link.
    await expect(page.locator(SEL.link)).toHaveText('Подробнее об офисе');

    // Клик по табу 2: выбор слайда.
    await tabs.nth(1).click();
    await expect(page.locator(SEL.title)).toHaveText('Женские вакансии на производстве');
    await expect(tabs.nth(0)).toHaveAttribute('tabindex', '-1');
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '0');
  });

  test('событие irao-ui:carousel-select (detail.index) доходит до приёмника сайта', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    const received = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const events = [];
          document
            .querySelector('[data-ui-carousel]')
            .addEventListener('irao-ui:carousel-select', (event) => {
              events.push({ index: event.detail.index, bubbles: event.bubbles });
              if (events.length === 2) resolve(events);
            });
          document.querySelector('[data-ui-carousel-next]').click();
          document.querySelectorAll('.ui-carousel__tab')[2].click();
        }),
    );
    expect(received, 'две смены: next → таб 3').toEqual([
      { index: 1, bubbles: true },
      { index: 2, bubbles: true },
    ]);
  });
});

test.describe('ui-carousel: клавиатура (AC — e2e-пины)', () => {
  test('→/← с зацикливанием, Home/End — automatic-активация (фокус и выбор вместе)', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    await expectInitialized(page);
    const tabs = page.locator(SEL.tabs);

    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1), '→: фокус на втором табе').toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(SEL.title)).toHaveText('Женские вакансии на производстве');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0), '→: зацикливание на первый').toBeFocused();
    await expect(page.locator(SEL.title)).toHaveText('Производство');

    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(2), '←: зацикливание на последний').toBeFocused();

    await page.keyboard.press('Home');
    await expect(tabs.nth(0), 'Home — первый').toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(2), 'End — последний').toBeFocused();
    await expect(page.locator(SEL.title)).toHaveText('Административная работа');
  });

  test('Tab с активного таба уходит за степпер (roving tabindex не перехватывает Tab)', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    await expectInitialized(page);
    const tabs = page.locator(SEL.tabs);

    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();

    // После степпера в DOM — ссылки-цели выхода стенда отсутствуют, но Tab
    // обязан покинуть ленту: следующая таб-стоп — вне .ui-carousel__stepper.
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement.className);
    expect(focusedTag, 'Tab ушёл за степпер').not.toContain('ui-carousel__tab');
  });
});

test.describe('ui-carousel: фото-галерея (data-ui-gallery)', () => {
  test('prev/next листают фото с зацикливанием; событие; alt не трогается', async ({ stand }) => {
    const page = await stand('ui-carousel');
    const gallery = page.locator(SEL.galleryRoot);
    await expect(gallery).toHaveAttribute('data-ui-gallery-init', 'true');
    await expect(page.locator(SEL.galleryPrev)).not.toHaveAttribute('hidden');
    await expect(page.locator(SEL.galleryNext)).not.toHaveAttribute('hidden');

    const firstSrc = await page.locator(SEL.galleryPhoto).getAttribute('src');
    const received = await page.evaluate(
      (first) =>
        new Promise((resolve) => {
          const rootEl = document.querySelector('[data-ui-gallery]');
          const events = [];
          rootEl.addEventListener('irao-ui:carousel-select', (event) => {
            events.push({
              index: event.detail.index,
              src: rootEl.querySelector('[data-ui-gallery-photo]').src.length,
            });
            if (events.length === 4) {
              resolve({ events, firstSrcLen: first.length });
            }
          });
          rootEl.querySelector('[data-ui-gallery-next]').click();
          rootEl.querySelector('[data-ui-gallery-next]').click();
          rootEl.querySelector('[data-ui-gallery-next]').click(); // зацикливание
          rootEl.querySelector('[data-ui-gallery-prev]').click();
        }),
      firstSrc,
    );
    expect(
      received.events.map((e) => e.index),
      'next×3 + prev: 1,2,0,2',
    ).toEqual([1, 2, 0, 2]);
    // alt декоративного фото не меняется модулем.
    await expect(page.locator(SEL.galleryPhoto)).toHaveAttribute('alt', '');
  });

  test('галерея в модалке направлений: prev/next работают в открытом ui-modal', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    await page.locator(SEL.galleryTrigger).click();
    const dialog = page.locator(SEL.galleryDialog);
    await expect(dialog).toBeVisible();

    const srcBefore = await page.locator(SEL.galleryPhoto).getAttribute('src');
    await page.locator(SEL.galleryNext).click();
    const srcAfter = await page.locator(SEL.galleryPhoto).getAttribute('src');
    expect(srcAfter, 'фото переключилось в открытой модалке').not.toBe(srcBefore);

    await page.keyboard.press('Escape');
    await expect(dialog, 'Escape закрывает ui-modal, галерея не мешает').toBeHidden();
  });
});

test.describe('ui-carousel: axe (AC)', () => {
  test('стенд чист в исходном и переключённом состояниях (AC)', async ({ stand }) => {
    const page = await stand('ui-carousel');
    // Финальные состояния, не кадры переходов (приём ui-tabs.spec.js).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map(
        (violation) =>
          `${violation.id} → ${violation.nodes.length} узл(ов): ` +
          violation.nodes.map((node) => node.target.join(' ')).join('; '),
      );

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (исходное)').toEqual([]);

    // Переключённое состояние: третий слайд, фокус на его табе.
    await page.locator(SEL.tabs).nth(2).click();
    await page.locator(SEL.tabs).nth(2).focus();
    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (третий слайд)').toEqual(
      [],
    );

    // Открытая галерея: роли/имена стрелок и модалки. reduced-motion остаётся
    // включённым (kill-switch base/reset гасит анимацию открытия модалки —
    // axe меряет финальные состояния, приём ui-tabs/ui-modal).
    await page.locator(SEL.galleryTrigger).click();
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (модалка с галереей)',
    ).toEqual([]);
  });
});

test.describe('ui-carousel: reduced-motion (AC — проверка-пин)', () => {
  test('анимаций нет: смена слайда при prefers-reduced-motion мгновенна и идентична обычной', async ({
    stand,
  }) => {
    const page = await stand('ui-carousel');
    const animated = await page.evaluate(() => {
      const els = [
        ...document
          .querySelector('[data-ui-carousel]')
          .querySelectorAll('.ui-carousel__arrow, .ui-carousel__tab, .ui-carousel__photo'),
      ];
      return els.map((el) => {
        const cs = getComputedStyle(el);
        return { transition: cs.transitionDuration, animation: cs.animationDuration };
      });
    });
    for (const entry of animated) {
      expect(entry.transition, 'нет transition-длительностей (all 0s)').toMatch(/^0s(, 0s)*$/);
      expect(entry.animation, 'нет animation-длительностей').toMatch(/^0s(, 0s)*$/);
    }

    // При reduced-motion смена слайда меняет контент немедленно (нет кадров).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator(SEL.next).click();
    await expect(page.locator(SEL.title)).toHaveText('Женские вакансии на производстве');
  });
});

test.describe('ui-carousel: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('исходное — 4 вьюпорта; выбранные состояния — desktop', async ({ stand }) => {
    const page = await stand('ui-carousel');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-carousel-default', viewport });
    }

    // Выбранный второй слайд (стрелкой) — desktop.
    await page.locator(SEL.next).click();
    await shot(page, { name: 'ui-carousel-selected', viewport: 'desktop' });

    // Открытая галерея на втором фото — desktop.
    await page.locator(SEL.galleryTrigger).click();
    await page.locator(SEL.galleryNext).click();
    await shot(page, { name: 'ui-carousel-gallery', viewport: 'desktop' });
  });
});
