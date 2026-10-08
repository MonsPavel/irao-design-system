/**
 * e2e ui-dropdown (T6.1; Testing requirements + AC) — клавиатурный цикл APG
 * menu-button, вне-клик, Tab-выход, деградация без JS, axe, эталоны.
 *
 * Поверхность — стенд ui-dropdown (showcase/pages/ui-dropdown) с двумя
 * назначениями компонента: #uidd-nav — навигационное меню (nav > ul > li > a,
 * без menu-роли — правило доки; aria-current="page" на текущей странице —
 * перенос career-portal header.js) и #uidd-actions — меню действий
 * (role="menu" + role="menuitem", активация пишет в status-регион стенда).
 * Проверяется:
 *  1. деградация без JS: в РАЗМЕТКЕ стенда нет hidden на меню и
 *     aria-expanded на триггерах (их ставит модуль) — меню раскрыто, все
 *     ссылки и пункты доступны (AC; принцип ТЗ №14);
 *  2. открытие: клик (фокус остаётся на триггере), Enter/Space (APG: фокус на
 *     первый пункт), ArrowDown (первый), ArrowUp (последний);
 *  3. закрытие: Escape с возвратом фокуса на триггер (APG), вне-клик,
 *     Tab-выход (закрытие — решение APG; фокус уводит нативная навигация);
 *  4. стрелки/Home/End внутри меню — с зацикливанием (APG menu);
 *  5. N инстансов: открытие одного закрывает другие (closeAll career-portal);
 *  6. aria: aria-expanded синхронен состоянию, aria-controls ведёт на id меню;
 *  7. меню действий: активация menuitem закрывает меню, фокус на триггер
 *     (APG: кто открыл — тот получает фокус обратно), действие выполняется;
 *  8. reduced-motion: вход-анимация выключена преференсом (DoD EPIC-6);
 *  9. axe: стенд чист закрытым и в открытом состоянии обоих назначений (AC);
 * 10. эталоны: закрыто на 4 вьюпортах, открыто — по назначениям (ADR-0004:
 *     создаются только в контейнере/CI, локально — no-op с аннотацией).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/ui-dropdown/index.html). */
const SEL = {
  navSection: '#uidd-nav',
  navTrigger: '#uidd-nav-trigger',
  navMenu: '#uidd-nav-menu',
  navItems: '#uidd-nav-menu a.ui-dropdown__item',
  afterNav: '#uidd-after-nav',
  actionsTrigger: '#uidd-actions-trigger',
  actionsMenu: '#uidd-actions-menu',
  actionsItems: '#uidd-actions-menu [role="menuitem"]',
  actionsStatus: '#uidd-actions-status',
};

/** Открытое состояние одного инстанса: aria-expanded + видимое меню. */
async function expectOpen(page, trigger, menu) {
  await expect(trigger, 'aria-expanded=true').toHaveAttribute('aria-expanded', 'true');
  await expect(menu, 'меню видно').toBeVisible();
}

async function expectClosed(page, trigger, menu) {
  await expect(trigger, 'aria-expanded=false').toHaveAttribute('aria-expanded', 'false');
  await expect(menu, 'меню скрыто').toBeHidden();
}

test.describe('ui-dropdown: деградация без JS (AC; ТЗ №14)', () => {
  test('в разметке стенда нет hidden/aria-expanded — модуль ставит их только при инициализации', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');

    // Источник разметки (генерат полигона): ни hidden на меню, ни aria на триггерах.
    const source = await page.request
      .get('/showcase/dist/stands/ui-dropdown.html')
      .then((r) => r.text());
    const menuTags = source.match(/<[^>]*ui-dropdown__menu[^>]*>/g) ?? [];
    expect(menuTags.length, 'на стенде два меню').toBe(2);
    for (const tag of menuTags) {
      expect(tag, `в разметке меню hidden нет (AC): ${tag}`).not.toMatch(/\bhidden\b/);
    }
    const triggerTags = source.match(/<button[^>]*ui-dropdown__trigger[^>]*>/g) ?? [];
    expect(triggerTags.length, 'на стенде два триггера').toBe(2);
    for (const tag of triggerTags) {
      expect(tag, `в разметке триггера нет aria-expanded (AC): ${tag}`).not.toContain(
        'aria-expanded',
      );
      expect(tag, `в разметке триггера нет aria-controls: ${tag}`).not.toContain('aria-controls');
    }

    // Под JS модуль закрыл меню и проставил aria — контракт инициализации.
    await expectClosed(page, page.locator(SEL.navTrigger), page.locator(SEL.navMenu));
    await expectClosed(page, page.locator(SEL.actionsTrigger), page.locator(SEL.actionsMenu));
  });

  test('без JS меню раскрыто и все ссылки/пункты доступны', async ({ stand }) => {
    const page = await stand('ui-dropdown'); // URL стенда; для сценария JS не нужен
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

      const navMenu = noJsPage.locator(SEL.navMenu);
      await expect(navMenu, 'навигационное меню раскрыто без JS (AC)').toBeVisible();
      const navLinks = noJsPage.locator(SEL.navItems);
      await expect(navLinks, 'все ссылки навигации на месте').toHaveCount(3);
      for (let i = 0; i < 3; i += 1) {
        await expect(navLinks.nth(i), `ссылка ${i} видима`).toBeVisible();
        expect(await navLinks.nth(i).getAttribute('href'), 'href — реальный адрес').toMatch(
          /^#|^\//,
        );
      }

      const actionsMenu = noJsPage.locator(SEL.actionsMenu);
      await expect(actionsMenu, 'меню действий раскрыто без JS').toBeVisible();
      const actionButtons = noJsPage.locator(SEL.actionsItems);
      await expect(actionButtons, 'все пункты действий на месте').toHaveCount(3);
      for (let i = 0; i < 3; i += 1) {
        await expect(actionButtons.nth(i), `пункт ${i} видим и доступен`).toBeEnabled();
      }
      // Активация команд без JS — зона сайта (дублирующие кнопки страницы,
      // README don't): приёмник стенда — тоже inline-скрипт и тут не работает.
    } finally {
      await context.close();
    }
  });
});

test.describe('ui-dropdown: открытие (AC: клик/Enter/Space/↓)', () => {
  test('клик по триггеру открывает (фокус остаётся на триггере) и повторный клик закрывает', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    await trigger.click();
    await expectOpen(page, trigger, menu);
    await expect(trigger, 'при открытии кликом фокус не уводится (APG: pointer)').toBeFocused();

    await trigger.click();
    await expectClosed(page, trigger, menu);
  });

  test('aria-controls ведёт на id меню; aria-expanded синхронен состоянию', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    const controls = await trigger.getAttribute('aria-controls');
    expect(controls, 'aria-controls указан').toBeTruthy();
    await expect(page.locator(`#${controls}`)).toHaveCount(1);
    expect(await menu.getAttribute('id'), 'это меню триггера').toBe(controls);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter и Space открывают с фокусом на первый пункт (APG menu-button)', async ({ stand }) => {
    const page = await stand('ui-dropdown');

    for (const key of ['Enter', ' ']) {
      const trigger = page.locator(SEL.navTrigger);
      const menu = page.locator(SEL.navMenu);
      await trigger.focus();
      await page.keyboard.press(key);
      await expectOpen(page, trigger, menu);
      await expect(
        page.locator(SEL.navItems).first(),
        `${key}: фокус на первом пункте (APG)`,
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expectClosed(page, trigger, menu);
    }
  });

  test('ArrowDown открывает с фокусом на первый пункт, ArrowUp — на последний (APG)', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, trigger, menu);
    await expect(page.locator(SEL.navItems).first(), '↓: первый пункт').toBeFocused();

    await page.keyboard.press('Escape');
    await trigger.focus();
    await page.keyboard.press('ArrowUp');
    await expectOpen(page, trigger, menu);
    await expect(page.locator(SEL.navItems).last(), '↑: последний пункт (APG)').toBeFocused();
  });
});

test.describe('ui-dropdown: закрытие (AC: Escape/вне-клик/Tab)', () => {
  test('Escape закрывает и возвращает фокус на триггер (APG; career-portal)', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.actionsTrigger);
    const menu = page.locator(SEL.actionsMenu);

    await trigger.click();
    await expectOpen(page, trigger, menu);

    // Escape изнутри меню (фокус на пункте) — фокус на триггер.
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(SEL.actionsItems).first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expectClosed(page, trigger, menu);
    await expect(trigger, 'фокус возвращён на триггер (APG)').toBeFocused();

    // Escape при фокусе вне инстанса (меню ещё открыто) — тоже закрывает
    // (перенос career-portal: слушатель документа).
    await trigger.click();
    await expectOpen(page, trigger, menu);
    await page.locator('.ui-showcase-header__home').focus();
    await expect(page.locator('.ui-showcase-header__home')).toBeFocused();
    await page.keyboard.press('Escape');
    await expectClosed(page, trigger, menu);
    await expect(trigger, 'фокус на триггере и при внешнем Escape').toBeFocused();
  });

  test('вне-клик закрывает (career-portal: слушатель документа)', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    await trigger.click();
    await expectOpen(page, trigger, menu);

    await page.locator('h1').click();
    await expectClosed(page, trigger, menu);
  });

  test('клик внутри меню (по пункту-ссылке) меню не закрывает и не возвращает фокус', async ({
    stand,
  }) => {
    // Навигационные ссылки (не menuitem) ведут себя нативно: клик по ним —
    // переход, закрытие не требуется; anchor-ссылка стенда не уводит со страницы.
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    await trigger.click();
    await expectOpen(page, trigger, menu);
    await page.locator(SEL.navItems).last().click();
    await expectOpen(page, trigger, menu);
  });

  test('Tab-выход закрывает меню, фокус уходит по естественному порядку (решение APG)', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.navTrigger);
    const menu = page.locator(SEL.navMenu);

    await trigger.click();
    await expectOpen(page, trigger, menu);

    // Tab с триггера: меню закрыто, фокус — на следующем таббельном элементе
    // (пункты меню скрыты hidden и пропускаются).
    await page.keyboard.press('Tab');
    await expectClosed(page, trigger, menu);
    await expect(page.locator(SEL.afterNav), 'фокус после триггера').toBeFocused();

    // Tab изнутри меню (фокус на пункте): закрытие + выход.
    await trigger.click();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(SEL.navItems).first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expectClosed(page, trigger, menu);
    await expect(page.locator(SEL.afterNav), 'фокус ушёл за меню').toBeFocused();
  });
});

test.describe('ui-dropdown: навигация стрелками внутри меню (AC)', () => {
  test('ArrowDown/ArrowUp зацикливаются; Home/End — края (APG menu)', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    const items = page.locator(SEL.navItems);

    await page.locator(SEL.navTrigger).focus();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1), '↓ ко второму').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(2), '↓ к третьему').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(0), '↓ зациклился на первый').toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(items.nth(2), '↑ зациклился на последний').toBeFocused();

    await page.keyboard.press('Home');
    await expect(items.nth(0), 'Home — первый').toBeFocused();
    await page.keyboard.press('End');
    await expect(items.nth(2), 'End — последний').toBeFocused();

    // Стрелки в меню действий работают так же (общая логика модуля).
    const actionItems = page.locator(SEL.actionsItems);
    await page.locator(SEL.actionsTrigger).focus();
    await page.keyboard.press('ArrowUp');
    await expect(actionItems.nth(2), '↑ в меню действий — последний').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(actionItems.nth(0), '↓ зациклился').toBeFocused();
  });

  test('N инстансов: открытие одного закрывает другой (closeAll, career-portal)', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    const navTrigger = page.locator(SEL.navTrigger);
    const navMenu = page.locator(SEL.navMenu);
    const actionsTrigger = page.locator(SEL.actionsTrigger);
    const actionsMenu = page.locator(SEL.actionsMenu);

    // Оба открыты «клавиатурой» (без кликов — вне-клик не вмешивается):
    // фокус программный + ArrowDown.
    await navTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, navTrigger, navMenu);
    await actionsTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, actionsTrigger, actionsMenu);

    await expect(navMenu, 'открытие действий закрыло навигацию (closeAll)').toBeHidden();
    await expect(navTrigger).toHaveAttribute('aria-expanded', 'false');

    // И обратно.
    await navTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, navTrigger, navMenu);
    await expect(actionsMenu, 'открытие навигации закрыло действия').toBeHidden();
    await expect(actionsTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('ui-dropdown: меню действий (Scope: назначение «кнопки»)', () => {
  test('активация menuitem (клик и Enter) выполняет действие, закрывает меню, фокус на триггер', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    const trigger = page.locator(SEL.actionsTrigger);
    const menu = page.locator(SEL.actionsMenu);
    const status = page.locator(SEL.actionsStatus);

    // Клик по пункту: действие выполнено (status-регион стенда), меню закрыто,
    // фокус возвращён на триггер (APG: кто открыл — тот получает фокус обратно).
    await trigger.click();
    await expectOpen(page, trigger, menu);
    await page.locator(SEL.actionsItems).nth(1).click();
    await expect(status, 'действие выполнено').toHaveText('Выполнено: Дублировать');
    await expectClosed(page, trigger, menu);
    await expect(trigger).toBeFocused();

    // Клавиатурная активация: Enter на сфокусированном пункте — то же самое.
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(SEL.actionsItems).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Выполнено: Редактировать');
    await expectClosed(page, trigger, menu);
    await expect(trigger).toBeFocused();
  });
});

test.describe('ui-dropdown: reduced-motion и axe (AC)', () => {
  test('вход-анимация выключена при prefers-reduced-motion (DoD EPIC-6)', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.locator(SEL.navTrigger).click();
    const menu = page.locator(SEL.navMenu);
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('hidden');
    expect(
      await menu.evaluate((el) => getComputedStyle(el).animationName),
      'анимации нет — только мгновенный показ',
    ).toBe('none');
  });

  test('axe: стенд чист закрытым и в открытом состоянии каждого назначения (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-dropdown');
    // Анализ финальных состояний, не кадров входной анимации (opacity 0→1 даёт
    // axe color-contrast на пунктах); сам reduced-motion режим — соседний тест.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`);

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (закрыто)').toEqual([]);

    // Открытое навигационное меню: динамическая aria и видимое меню.
    await page.locator(SEL.navTrigger).click();
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (открыта навигация)',
    ).toEqual([]);
    await page.keyboard.press('Escape');

    // Открытое меню действий (оба одновременно открыты быть не могут — closeAll).
    await page.locator(SEL.actionsTrigger).focus();
    await page.keyboard.press('ArrowDown');
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (открыты действия)',
    ).toEqual([]);
  });
});

test.describe('ui-dropdown: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('закрыто — 4 вьюпорта; открыто — по назначениям', async ({ stand }) => {
    const page = await stand('ui-dropdown');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-dropdown-closed', viewport });
    }

    // Открытое навигационное меню (aria-current-ссылка подсвечена).
    await page.locator(SEL.navTrigger).click();
    await shot(page, { name: 'ui-dropdown-open-nav', viewport: 'desktop' });
    await page.keyboard.press('Escape');

    // Открытое меню действий.
    await page.locator(SEL.actionsTrigger).click();
    await shot(page, { name: 'ui-dropdown-open-actions', viewport: 'desktop' });
  });
});
