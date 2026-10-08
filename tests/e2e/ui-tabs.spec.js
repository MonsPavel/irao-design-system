/**
 * e2e ui-tabs (T6.2; Testing requirements + AC) — клавиатурный цикл APG tabs,
 * roving tabindex, деградация без JS, JSON-кейс (Bitrix), axe, эталоны.
 *
 * Поверхность — стенд ui-tabs (showcase/pages/ui-tabs) с двумя секциями:
 * #uitab-static — статические табы (канонический паттерн: табы-ссылки на
 * панели, контент карьерных треков career-portal) и #uitab-json — табы,
 * отрендеренные стендовым скриптом из `<script type="application/json"
 * data-ui-tabs-data">` (кейс Bitrix: данные из инфоблока — зона сайта,
 * 02-architecture §6.3); событие irao-ui:tabs-select пишется в статус-регион
 * #uitab-json-status. Проверяется:
 *  1. деградация без JS: в РАЗМЕТКЕ стенда нет hidden на панелях и нет
 *     ролей/tabindex/aria-selected (их ставит модуль); в контексте без JS
 *     все панели статических табов видимы — потери контента нет (AC);
 *  2. инициализация: роли tablist/tab/tabpanel, aria-controls ведут на
 *     существующие id панелей, панели названы табами (aria-labelledby),
 *     ровно один aria-selected, roving tabindex (0 у активного, −1 у остальных);
 *  3. клавиатура: ←/→ с зацикливанием, Home/End; automatic-активация —
 *     фокус и выбор вместе (APG, зафиксировано в доке); Tab с активного таба
 *     уходит в активную панель (Scope модуля), Shift+Tab возвращается;
 *  4. клик выбирает таб, якорный прыжок отменён (хэш страницы не меняется);
 *  5. JSON-кейс: табы отрендерены, клавиатура работает, событие
 *     irao-ui:tabs-select доходит до приёмника сайта (статус-регион);
 *  6. axe: стенд чист в исходном и переключённом состояниях (AC);
 *  7. эталоны: исходное состояние на 4 вьюпортах; выбранный второй таб
 *     статических табов и выбранный таб JSON-кейса — desktop (ADR-0004:
 *     создаются только в контейнере/CI, локально — no-op с аннотацией).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/ui-tabs/index.html). */
const SEL = {
  staticSection: '#uitab-static',
  staticTabs: '#uitab-static .ui-tabs__tab',
  staticPanels: '#uitab-static .ui-tabs__panel',
  staticList: '#uitab-static .ui-tabs__list',
  afterStatic: '#uitab-after-static',
  jsonRoot: '#uitab-json-tabs',
  jsonTabs: '#uitab-json-tabs .ui-tabs__tab',
  jsonPanels: '#uitab-json-tabs .ui-tabs__panel',
  jsonStatus: '#uitab-json-status',
};

/** Состояние одного инстанса: ровно один выбранный таб, панель выбранного видима. */
async function expectInstanceConsistent(page, tabsSel, panelsSel) {
  const tabs = page.locator(tabsSel);
  const panels = page.locator(panelsSel);
  const count = await tabs.count();

  const selected = [];
  for (let i = 0; i < count; i += 1) {
    if ((await tabs.nth(i).getAttribute('aria-selected')) === 'true') {
      selected.push(i);
      await expect(tabs.nth(i), `roving tabindex: активный таб ${i} — 0`).toHaveAttribute(
        'tabindex',
        '0',
      );
    } else {
      await expect(tabs.nth(i), `roving tabindex: неактивный таб ${i} — -1`).toHaveAttribute(
        'tabindex',
        '-1',
      );
    }
    // aria-controls ведёт на существующий id панели (AC; Implementation requirements п.1).
    const controls = await tabs.nth(i).getAttribute('aria-controls');
    expect(controls, `aria-controls таба ${i} указан`).toBeTruthy();
    await expect(page.locator(`#${controls}`)).toHaveCount(1);
  }
  expect(selected, 'ровно один выбранный таб (APG)').toHaveLength(1);

  // Панели: выбранная видима без hidden, остальные скрыты; роль и имя — таб.
  for (let i = 0; i < (await panels.count()); i += 1) {
    await expect(panels.nth(i)).toHaveAttribute('role', 'tabpanel');
    if (i === selected[0]) {
      await expect(panels.nth(i), `активная панель ${i} видима`).toBeVisible();
    } else {
      await expect(panels.nth(i), `неактивная панель ${i} скрыта`).toBeHidden();
    }
  }
  return selected[0];
}

test.describe('ui-tabs: деградация без JS (AC)', () => {
  test('в разметке стенда нет hidden/ролей/tabindex/aria-selected — их ставит модуль', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');

    // Источник разметки (генерат полигона): атрибуты JS-состояния отсутствуют.
    const source = await page.request
      .get('/showcase/dist/stands/ui-tabs.html')
      .then((r) => r.text());
    const stateAttrs = /\b(role|tabindex|aria-selected|hidden)=/;

    const panelTags = source.match(/<section[^>]*ui-tabs__panel[^>]*>/g) ?? [];
    expect(panelTags.length, 'в разметке стенда есть панели').toBeGreaterThan(0);
    for (const tag of panelTags) {
      expect(tag, `панель без hidden и без ролей в разметке (AC): ${tag}`).not.toMatch(stateAttrs);
      expect(tag, `панель названа табом в разметке: ${tag}`).toMatch(/aria-labelledby=/);
    }
    const tabTags = source.match(/<a[^>]*ui-tabs__tab[^>]*>/g) ?? [];
    expect(tabTags.length, 'в разметке стенда есть табы-ссылки').toBeGreaterThan(0);
    for (const tag of tabTags) {
      expect(tag, `таб-ссылка без JS-атрибутов: ${tag}`).not.toMatch(stateAttrs);
      expect(tag, `таб-ссылка ведёт на панель якорем: ${tag}`).toMatch(/href="#/);
    }
  });

  test('без JS все панели статических табов видимы (нет потери контента), ссылки ведут на панели', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

      const tabs = noJsPage.locator(SEL.staticTabs);
      const panels = noJsPage.locator(SEL.staticPanels);
      const tabCount = await tabs.count();
      const panelCount = await panels.count();
      expect(tabCount, 'табы на месте').toBeGreaterThan(1);
      expect(panelCount, 'панелей столько же, сколько табов').toBe(tabCount);

      for (let i = 0; i < panelCount; i += 1) {
        await expect(panels.nth(i), `панель ${i} видима без JS (AC)`).toBeVisible();
        // Панель названа своим табом (aria-labelledby — из разметки, правдив без JS).
        const labelledby = await panels.nth(i).getAttribute('aria-labelledby');
        expect(labelledby, 'id-связка панель → таб').toBeTruthy();
        await expect(noJsPage.locator(`#${labelledby}`)).toHaveCount(1);
      }

      // Табы — ссылки: href ведёт на существующую панель (id-связка таб → панель).
      for (let i = 0; i < tabCount; i += 1) {
        const href = await tabs.nth(i).getAttribute('href');
        expect(href, `href таба ${i} — якорь`).toMatch(/^#/);
        await expect(noJsPage.locator(href), `панель ${href} существует`).toHaveCount(1);
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('ui-tabs: инициализация (aria-selected/controls, roving tabindex)', () => {
  test('модуль ставит роли, aria-controls на существующие панели, roving tabindex; ровно один выбран', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');

    await expect(page.locator(SEL.staticList)).toHaveAttribute('role', 'tablist');
    const initial = await expectInstanceConsistent(page, SEL.staticTabs, SEL.staticPanels);
    expect(initial, 'стартовый выбор — первый таб').toBe(0);

    // Панель названа выбранным табом (a11y-требование: aria-labelledby на tabpanel).
    const panels = page.locator(SEL.staticPanels);
    for (let i = 0; i < (await panels.count()); i += 1) {
      const labelledby = await panels.nth(i).getAttribute('aria-labelledby');
      await expect(page.locator(`#${labelledby}`), 'имя панели — существующий таб').toHaveCount(1);
    }
  });
});

test.describe('ui-tabs: клавиатура (полный цикл APG)', () => {
  test('→/← с зацикливанием, Home/End; automatic-активация: фокус и выбор вместе', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.staticTabs);
    const panels = page.locator(SEL.staticPanels);

    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();

    // → : второй таб выбран И на нём фокус (automatic — APG).
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1), '→: фокус на втором табе').toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(panels.nth(1), 'панель второго таба показана').toBeVisible();
    await expect(panels.nth(0)).toBeHidden();

    // → с последнего зацикливается на первый.
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0), '→: зацикливание на первый').toBeFocused();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // ← с первого зацикливается на последний.
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(1), '←: зацикливание на последний').toBeFocused();

    // Home/End — края.
    await page.keyboard.press('Home');
    await expect(tabs.nth(0), 'Home — первый').toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(1), 'End — последний').toBeFocused();
    await expect(panels.nth(1)).toBeVisible();
  });

  test('Tab с активного таба уходит в активную панель; из панели — дальше; Shift+Tab возвращается', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.staticTabs);
    const panels = page.locator(SEL.staticPanels);

    // Выбор второго таба стрелкой: roving tabindex — tab[0] теперь −1.
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();

    // Tab: следующая таб-стоп — АКТИВНАЯ панель (скрытая панель 0 пропускается).
    await page.keyboard.press('Tab');
    await expect(panels.nth(1), 'Tab с активного таба — в активную панель (Scope)').toBeFocused();

    // Tab из панели — естественный порядок за компонентом.
    await page.keyboard.press('Tab');
    await expect(page.locator(SEL.afterStatic), 'фокус ушёл за компонент').toBeFocused();

    // Shift+Tab из панели — назад в активную панель и на активный таб.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(tabs.nth(1), 'Shift+Tab возвращает на активный таб').toBeFocused();
  });
});

test.describe('ui-tabs: клик и JSON-кейс (Bitrix)', () => {
  test('клик выбирает таб, якорный прыжок отменён (хэш не меняется)', async ({ stand }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.staticTabs);
    const panels = page.locator(SEL.staticPanels);

    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(0)).toBeHidden();
    expect(new URL(page.url()).hash, 'перехода по якорю нет — preventDefault').toBe('');
    await expectInstanceConsistent(page, SEL.staticTabs, SEL.staticPanels);
  });

  test('JSON-кейс: табы отрендерены из data-ui-tabs-data, клавиатура работает, событие в статус-регионе', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.jsonTabs);

    await expect(tabs, 'JSON-данные отрендерены в табы').toHaveCount(3);
    await expectInstanceConsistent(page, SEL.jsonTabs, SEL.jsonPanels);
    await expect(page.locator(SEL.jsonStatus)).toHaveText('Выбор не сделан');

    // Клавиатура в рендеренных табах: → выбирает второй, приёмник сайта
    // получает irao-ui:tabs-select и пишет статус.
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(SEL.jsonStatus), 'событие дошло до сайта').toHaveText(
      'Выбрано: Электромонтёр подстанции',
    );
  });
});

test.describe('ui-tabs: axe (AC)', () => {
  test('стенд чист в исходном и переключённом состояниях (AC)', async ({ stand }) => {
    const page = await stand('ui-tabs');
    // Анализ финальных состояний, не кадров перехода цветов таба (заливка
    // primary 0.25s даёт axe color-contrast на промежуточном кадре) — приём
    // ui-dropdown.spec.js: reduced-motion гасит переходы (kill-switch base/reset).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`);

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (исходное)').toEqual([]);

    // Переключённое состояние: второй таб выбран, панель сменена.
    await page.locator(SEL.staticTabs).nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab'); // фокус в активную панель — состояние «панель в фокусе»
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (второй таб выбран, фокус в панели)',
    ).toEqual([]);
  });
});

test.describe('ui-tabs: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('исходное — 4 вьюпорта; выбранные состояния — desktop', async ({ stand }) => {
    const page = await stand('ui-tabs');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-tabs-default', viewport });
    }

    // Выбранный второй таб статических табов (состояние таба + смена панели).
    await page.locator(SEL.staticTabs).nth(1).click();
    await shot(page, { name: 'ui-tabs-selected', viewport: 'desktop' });

    // Выбранный второй таб JSON-кейса.
    await page.locator(SEL.jsonTabs).nth(1).click();
    await shot(page, { name: 'ui-tabs-json-selected', viewport: 'desktop' });
  });
});
