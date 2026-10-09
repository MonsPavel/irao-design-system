/**
 * e2e ui-select (T7.3; Acceptance Criteria) — полный APG listbox-цикл, форма
 * фильтра с change, деградация без JS, pointer:coarse, axe, эталоны.
 *
 * Поверхность — стенд ui-select (showcase/pages/ui-select) с четырьмя
 * секциями: #uiss-basic — базовый select в ui-field (город, с disabled-опцией
 * Казань — для сценариев пропуска), #uiss-optgroups — optgroup-группы,
 * #uiss-wrap — модификатор data-ui-select="wrap" (обёртка-«пилюля» сайта —
 * замена vacancy-search-хака career-portal), #uiss-form — форма фильтра
 * POST /submit со статус-регионом change-событий. Проверяется:
 *  1. деградация без JS: в РАЗМЕТКЕ select не скрыт (класс ui-select__native
 *     ставит модуль), select нативно виден/операбелен, listbox не построен (AC);
 *  2. pointer:coarse — модуль НЕ активируется, select остаётся нативным
 *     (Implementation requirements п.3, решение ADR-0012);
 *  3. открытие: клик (фокус на триггере), Enter/Space (фокус на выбранном),
 *     ArrowDown/ArrowUp на закрытом триггере;
 *  4. стрелки внутри списка пропускают disabled, без зацикливания (APG
 *     listbox); Home/End — края; типаж по первой букве с циклом (APG);
 *  5. закрытие: Escape с возвратом фокуса (в т.ч. при фокусе вне инстанса —
 *     слушатель документа, career-portal), вне-клик, Tab-выход, открытие
 *     другого инстанса (closeAll);
 *  6. выбор: select.value синхронизован, change пузырится до формы (статус),
 *     список закрыт, фокус на триггере, label триггера обновлён, is-selected/
 *     aria-selected, is-placeholder на пустом значении;
 *  7. внешняя синхронизация: нативный change от стороннего кода обновляет UI;
 *  8. optgroup: role=group + aria-label, выбор из группы синхронизован;
 *  9. disabled select — триггер disabled;
 * 10. форма фильтра отправляет выбранное значение (change диспатчится,
 *     value синхронизован, POST-тело содержит name=value) (AC);
 * 11. axe: стенд чист закрытым и в открытых состояниях всех секций (AC);
 * 12. эталоны: закрыто на 4 вьюпортах, открыто — по секциям (ADR-0004:
 *     создаются только в контейнере/CI, локально no-op с аннотацией).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/ui-select/index.html). */
const SEL = {
  basicSection: '#uiss-basic',
  basicSelect: '#uiss-city',
  basicTrigger: '#uiss-basic .ui-select__trigger',
  basicList: '#uiss-basic .ui-select__list',
  basicOptions: '#uiss-basic .ui-select__option',
  afterBasic: '#uiss-after-basic',
  optSection: '#uiss-optgroups',
  optTrigger: '#uiss-optgroups .ui-select__trigger',
  optList: '#uiss-optgroups .ui-select__list',
  optGroups: '#uiss-optgroups [role="group"]',
  optOptions: '#uiss-optgroups .ui-select__option',
  wrapSection: '#uiss-wrap',
  wrapTrigger: '#uiss-wrap .ui-select__trigger',
  wrapList: '#uiss-wrap .ui-select__list',
  wrapOptions: '#uiss-wrap .ui-select__option',
  wrapSelect: '#uiss-wrap-city',
  disabledTrigger: '#uiss-disabled .ui-select__trigger',
  form: '#uiss-form',
  formSelect: '#uiss-form-city',
  formTrigger: '#uiss-form .ui-select__trigger',
  formOptions: '#uiss-form .ui-select__option',
  formStatus: '#uiss-form-status',
};

/** Открытое состояние инстанса: aria-expanded + видимый список. */
async function expectOpen(page, trigger, list) {
  await expect(trigger, 'aria-expanded=true').toHaveAttribute('aria-expanded', 'true');
  await expect(list, 'список виден').toBeVisible();
}

async function expectClosed(page, trigger, list) {
  await expect(trigger, 'aria-expanded=false').toHaveAttribute('aria-expanded', 'false');
  await expect(list, 'список скрыт').toBeHidden();
}

test.describe('ui-select: деградация без JS и мобильная стратегия (AC)', () => {
  test('в разметке стенда select не скрыт — класс скрытия ставит только модуль', async ({
    stand,
  }) => {
    const page = await stand('ui-select');

    const source = await page.request
      .get('/showcase/dist/stands/ui-select.html')
      .then((r) => r.text());
    const selectTags = source.match(/<select[^>]*>/g) ?? [];
    expect(selectTags.length, 'на стенде четыре select').toBe(4);
    for (const tag of selectTags) {
      expect(tag, `select не скрыт в разметке (AC): ${tag}`).not.toMatch(/ui-select__native/);
    }

    // Под JS модуль активировался: select скрыт классом, триггер/список на месте.
    await expect(page.locator(SEL.basicTrigger)).toBeVisible();
    await expect(page.locator(SEL.basicSelect)).toBeHidden();
  });

  test('без JS — нативный select работает: виден, операбелен, listbox не построен (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

      const select = noJsPage.locator(SEL.basicSelect);
      await expect(select, 'нативный select виден без JS (AC)').toBeVisible();
      expect(await select.getAttribute('tabindex'), 'таб-порядок не тронут').toBeNull();
      await expect(noJsPage.locator('.ui-select'), 'кастом не построен').toHaveCount(0);

      // Нативная операбельность: выбор значения читается как у обычного select.
      await select.selectOption('spb');
      await expect(select).toHaveValue('spb');
    } finally {
      await context.close();
    }
  });

  test('pointer:coarse — модуль не активируется, select остаётся нативным (AC; ADR-0012)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const standUrl = page.url();
    // hasTouch в chromium переключает media на (hover: none)/(pointer: coarse)
    // (прецедент ui-card, AC T4.4; поддерживается всеми движками матрицы).
    const context = await page.context().browser().newContext({
      hasTouch: true,
      viewport: VIEWPORTS.mobile,
    });
    const touchPage = await context.newPage();
    try {
      await touchPage.goto(standUrl, { waitUntil: 'networkidle' });

      expect(
        await touchPage.evaluate(() => matchMedia('(pointer: coarse)').matches),
        'контекст стенда — coarse-указатель',
      ).toBe(true);
      await expect(touchPage.locator('.ui-select'), 'кастом не построен (AC)').toHaveCount(0);
      await expect(touchPage.locator(SEL.basicSelect), 'select виден нативно').toBeVisible();
      expect(
        await touchPage.locator(SEL.basicSelect).getAttribute('tabindex'),
        'таб-порядок не тронут',
      ).toBeNull();
    } finally {
      await context.close();
    }
  });
});

test.describe('ui-select: открытие (APG listbox-button)', () => {
  test('клик открывает (фокус на триггере) и повторный клик закрывает', async ({ stand }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);

    await trigger.click();
    await expectOpen(page, trigger, list);
    await expect(trigger, 'фокус остался на триггере (pointer-сценарий)').toBeFocused();

    await trigger.click();
    await expectClosed(page, trigger, list);
  });

  test('aria-controls ведёт на id списка; aria-expanded синхронен состоянию', async ({ stand }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);

    const controls = await trigger.getAttribute('aria-controls');
    expect(controls, 'aria-controls указан').toBeTruthy();
    expect(await list.getAttribute('id'), 'это список триггера').toBe(controls);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter и Space открывают с фокусом на выбранной опции; ArrowDown/ArrowUp на триггере — тоже (выбранная; career-portal open())', async ({
    stand,
  }) => {
    const page = await stand('ui-select');

    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) {
      const trigger = page.locator(SEL.basicTrigger);
      const list = page.locator(SEL.basicList);
      await trigger.focus();
      await page.keyboard.press(key);
      await expectOpen(page, trigger, list);
      await expect(
        page.locator(SEL.basicOptions).first(),
        `${key}: фокус на выбранной опции (пустое значение — первая опция)`,
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expectClosed(page, trigger, list);
    }
  });
});

test.describe('ui-select: навигация по списку (APG listbox)', () => {
  test('стрелки ходят по опциям, disabled пропускается, без зацикливания; Home/End — края', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const options = page.locator(SEL.basicOptions);

    await page.locator(SEL.basicTrigger).focus();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(0), 'открытие — фокус на выбранной (первой)').toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1), '↓ ко второй').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(2), '↓ пропустил disabled Казань').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(3), '↓ к последней').toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(3), '↓ на последней — без зацикливания (APG listbox)').toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(options.nth(2), '↑ назад (disabled снова пропущен)').toBeFocused();

    await page.keyboard.press('Home');
    await expect(options.nth(0), 'Home — первая').toBeFocused();
    await page.keyboard.press('End');
    await expect(options.nth(3), 'End — последняя').toBeFocused();
  });

  test('typeahead по первой букве: совпадение, цикл по совпадениям, disabled не матчится (APG)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const options = page.locator(SEL.basicOptions);

    await page.locator(SEL.basicTrigger).focus();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(0)).toBeFocused();

    await page.keyboard.press('м');
    await expect(options.nth(1), '«м» → Москва').toBeFocused();
    await page.keyboard.press('м');
    await expect(
      options.nth(2),
      'повторная «м» → следующее совпадение, Минск (цикл)',
    ).toBeFocused();
    await page.keyboard.press('м');
    await expect(options.nth(1), 'после последнего совпадения — снова первое (цикл)').toBeFocused();

    await page.keyboard.press('к');
    await expect(
      options.nth(1),
      '«к» совпадает только с disabled Казанью — фокус не уходит',
    ).toBeFocused();
  });

  test('optgroup: role=group с aria-label; выбор из группы синхронизует select и триггер', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.optTrigger);
    const list = page.locator(SEL.optList);
    const options = page.locator(SEL.optOptions);

    await trigger.click();
    await expectOpen(page, trigger, list);

    const groups = page.locator(SEL.optGroups);
    expect(await groups.count(), 'две группы').toBe(2);
    await expect(groups.nth(0), 'роль группы').toHaveAttribute('role', 'group');
    await expect(groups.nth(0)).toHaveAttribute('aria-label', 'Разработка');
    await expect(groups.nth(1)).toHaveAttribute('aria-label', 'Дизайн');
    // Группа содержит свои опции.
    expect(await groups.nth(0).locator('.ui-select__option').count()).toBe(3);
    expect(await groups.nth(1).locator('.ui-select__option').count()).toBe(2);

    await options.nth(4).click(); // «Графика» из группы «Дизайн»
    await expectClosed(page, trigger, list);
    await expect(trigger, 'label триггера обновлён').toContainText('Графика');
    await expect(page.locator('#uiss-spec'), 'value нативного select синхронизован').toHaveValue(
      'gfx',
    );
    await expect(options.nth(4)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('ui-select: закрытие (AC: Escape/вне-клик/Tab/closeAll)', () => {
  test('Escape закрывает и возвращает фокус на триггер — изнутри и при фокусе вне инстанса', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);

    await trigger.click();
    await expectOpen(page, trigger, list);
    await page.keyboard.press('Escape');
    await expectClosed(page, trigger, list);
    await expect(trigger, 'фокус возвращён на триггер (APG)').toBeFocused();

    // Escape при фокусе вне инстанса (меню открыто) — тоже закрывает
    // (слушатель документа, перенос career-portal; решение как в ui-dropdown).
    await trigger.click();
    await expectOpen(page, trigger, list);
    await page.locator('.ui-showcase-header__home').focus();
    await page.keyboard.press('Escape');
    await expectClosed(page, trigger, list);
    await expect(trigger, 'фокус на триггере и при внешнем Escape').toBeFocused();
  });

  test('вне-клик закрывает (переиспользование логики T6.1)', async ({ stand }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);

    await trigger.click();
    await expectOpen(page, trigger, list);
    await page.locator('h1').click();
    await expectClosed(page, trigger, list);
  });

  test('Tab закрывает список, фокус уходит за компонент (нативный select вне Tab-порядка)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);

    await expect(page.locator(SEL.basicSelect).getAttribute('tabindex')).resolves.toBe('-1');

    await trigger.click();
    await expectOpen(page, trigger, list);
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(SEL.basicOptions).first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expectClosed(page, trigger, list);
    await expect(
      page.locator(SEL.afterBasic),
      'фокус за компонентом (select пропущен)',
    ).toBeFocused();
  });

  test('открытие одного инстанса закрывает другой (closeAll, career-portal)', async ({ stand }) => {
    const page = await stand('ui-select');
    const basicTrigger = page.locator(SEL.basicTrigger);
    const basicList = page.locator(SEL.basicList);
    const wrapTrigger = page.locator(SEL.wrapTrigger);
    const wrapList = page.locator(SEL.wrapList);

    await basicTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, basicTrigger, basicList);
    await wrapTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expectOpen(page, wrapTrigger, wrapList);
    await expect(basicList, 'открытие wrap закрыло базовый (closeAll)').toBeHidden();
    await expect(basicTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('ui-select: выбор и синхронизация (AC)', () => {
  test('выбор опции: select.value синхронизован, change пузырится, список закрыт, фокус на триггере, is-selected/aria-selected', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const list = page.locator(SEL.basicList);
    const options = page.locator(SEL.basicOptions);

    // change-приёмник стенда (делегирование на форме) — статус-регион.
    await trigger.click();
    await expectOpen(page, trigger, list);
    await options.nth(3).click(); // Санкт-Петербург

    await expectClosed(page, trigger, list);
    await expect(trigger, 'фокус на триггере (career-portal btn.focus)').toBeFocused();
    await expect(trigger, 'label триггера = выбранное (AC)').toContainText('Санкт-Петербург');
    await expect(
      page.locator(SEL.basicSelect),
      'value нативного select синхронизован (AC)',
    ).toHaveValue('spb');
    await expect(options.nth(3)).toHaveAttribute('aria-selected', 'true');
    await expect(options.nth(3), 'галочка выбранного').toHaveClass(/is-selected/);
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(trigger, 'placeholder снят').not.toHaveClass(/is-placeholder/);
  });

  test('сброс: пустое значение — placeholder триггера, is-selected снят (career-portal components.css:68)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.basicTrigger);
    const options = page.locator(SEL.basicOptions);

    await trigger.click();
    await options.nth(1).click(); // Москва
    await expect(trigger).not.toHaveClass(/is-placeholder/);

    await trigger.click();
    await options.nth(0).click(); // Любой город (value="")
    await expect(trigger, 'placeholder возвращён').toHaveClass(/is-placeholder/);
    await expect(page.locator(SEL.basicSelect)).toHaveValue('');
    await expect(options.nth(0), 'пустой не отмечается (пара career-portal)').not.toHaveClass(
      /is-selected/,
    );
    await expect(page.locator(SEL.basicTrigger), 'label = текст пустой опции').toContainText(
      'Любой город',
    );
  });

  test('нативный change от стороннего кода обновляет UI (синхронизация select → UI)', async ({
    stand,
  }) => {
    const page = await stand('ui-select');

    await page.evaluate(() => {
      const select = document.querySelector('#uiss-city');
      select.value = 'msk';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator(SEL.basicTrigger)).toContainText('Москва');
    await expect(
      page.locator(`${SEL.basicSection} .ui-select__option[aria-selected="true"]`),
    ).toHaveText('Москва');
  });

  test('disabled select — триггер disabled, активации нет', async ({ stand }) => {
    const page = await stand('ui-select');
    const trigger = page.locator(SEL.disabledTrigger);
    await expect(trigger).toBeDisabled();
    // Клик по disabled-кнопке список не открывает.
    await trigger.click({ force: true });
    await expect(page.locator('#uiss-disabled .ui-select__list')).toBeHidden();
  });
});

test.describe('ui-select: форма фильтра (AC)', () => {
  test('выбранное значение уходит на сервер: change диспатчится, value синхронизован, POST содержит city=spb', async ({
    stand,
  }) => {
    const page = await stand('ui-select');

    const requests = [];
    await page.route('**/submit', async (route) => {
      requests.push(route.request());
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: 'ok' });
    });

    await page.locator(SEL.formTrigger).click();
    await page.locator(SEL.formOptions).nth(2).click(); // Санкт-Петербург

    await expect(page.locator(SEL.formSelect), 'value синхронизован').toHaveValue('spb');
    await expect(
      page.locator(SEL.formStatus),
      'change диспатчится и пузырится до формы (AC)',
    ).toHaveText('Фильтр: город = spb');

    const requestPromise = page.waitForRequest((r) => r.url().includes('/submit'));
    await page.locator(`${SEL.form} button[type="submit"]`).click();
    const request = await requestPromise;
    expect(request.method(), 'нативная отправка формы').toBe('POST');
    expect(request.postData(), 'выбранное значение в теле запроса (AC)').toContain('city=spb');
    expect(requests.length, 'запрос ровно один').toBe(1);
  });
});

test.describe('ui-select: axe (AC)', () => {
  test('стенд чист закрытым и в открытых состояниях всех секций (AC)', async ({ stand }) => {
    const page = await stand('ui-select');
    // Анализ финальных состояний (у списка нет входной анимации, но каретка/
    // фокус-кольца зависят от media — reduce для детерминизма, как в T6.1).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`);

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (закрыто)').toEqual([]);

    await page.locator(SEL.basicTrigger).click();
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (базовый открыт)',
    ).toEqual([]);
    await page.keyboard.press('Escape');

    await page.locator(SEL.optTrigger).click();
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (optgroup открыт)',
    ).toEqual([]);
    await page.keyboard.press('Escape');

    await page.locator(SEL.wrapTrigger).click();
    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (wrap открыт)').toEqual(
      [],
    );
  });
});

test.describe('ui-select: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('закрыто — 4 вьюпорта; открыто — по секциям', async ({ stand }) => {
    const page = await stand('ui-select');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-select-closed', viewport });
    }

    await page.locator(SEL.basicTrigger).click();
    await shot(page, { name: 'ui-select-open-basic', viewport: 'desktop' });
    await page.keyboard.press('Escape');

    await page.locator(SEL.optTrigger).click();
    await shot(page, { name: 'ui-select-open-optgroups', viewport: 'desktop' });
    await page.keyboard.press('Escape');

    await page.locator(SEL.wrapTrigger).click();
    await shot(page, { name: 'ui-select-open-wrap', viewport: 'desktop' });
  });
});
