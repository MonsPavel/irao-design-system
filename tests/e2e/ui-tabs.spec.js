/**
 * e2e ui-tabs (T6.2; Testing requirements + AC) — клавиатурный цикл APG tabs,
 * roving tabindex, деградация без JS, JSON-кейс (Bitrix), axe, эталоны.
 *
 * Поверхность — стенд ui-tabs (showcase/pages/ui-tabs) с тремя секциями:
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
 *  6. axe: стенд чист в исходном и переключённом состояниях (AC); в исходное
 *     состояние входит секция ui-tabs--pill (T14.9) со стартом на
 *     aria-current-табе — она проанализирована сразу;
 *  7. T14.9: модификатор ui-tabs--pill — инициализация выбирает таб с
 *     aria-current="page" (третий, как в nav.tabs-pill education.html),
 *     атрибут остаётся, клавиатура общая с базой; no-JS: панели pill-набора
 *     видимы (деградация не меняется);
 *  8. эталоны: исходное состояние на 4 вьюпортах; выбранный второй таб
 *     статических табов, выбранный таб JSON-кейса и выбранный pill-таб —
 *     desktop (ADR-0004: создаются только в контейнере/CI, локально — no-op
 *     с аннотацией);
 *  9. T17.11: навигационный набор (#uitab-nav) — межстраничные ссылки без
 *     панелей, модуль их не инициализирует (контракт T13.6); активная пилюля
 *     красится по aria-current="page" (покой) — computed-пины активной и
 *     соседней пилюли; hover-гашение: hover невыбранной не заливает (transparent
 *     + подпись primary), hover активной не гасит заливку (кейс, ради которого
 *     pilot.css таскал повтор заливки в паре 0,4,0 — снята).
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
  pillSection: '#uitab-pill',
  pillTabs: '#uitab-pill .ui-tabs__tab',
  pillPanels: '#uitab-pill .ui-tabs__panel',
  navList: '#uitab-nav .ui-tabs__list',
  navTabs: '#uitab-nav .ui-tabs__tab',
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

    // Источник разметки (генерат полигона); сперва вырезаются КОММЕНТАРИИ,
    // затем инлайн-скрипты: проза шапки стенда содержит литеральный
    // «<script type="application/json"…» (без парного закрывающего) — без
    // вырезания комментариев ленивый регэксп скриптов открыл бы по нему
    // ложную script-область и съел статичную разметку. Строки канонической
    // разметки внутри <script> (демо-рендер JSON) тоже не должны матчиться —
    // пины деградации смотрят только на настоящую разметку (ревью T13.6).
    const source = (
      await page.request.get('/showcase/dist/stands/ui-tabs.html').then((r) => r.text())
    )
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script>/g, '');
    const stateAttrs = /\b(role|tabindex|aria-selected|hidden)=/;

    const panelTags = source.match(/<section[^>]*ui-tabs__panel[^>]*>/g) ?? [];
    expect(panelTags.length, 'в разметке стенда есть панели (скрипты вырезаны)').toBeGreaterThan(0);
    for (const tag of panelTags) {
      expect(tag, `панель без hidden и без ролей в разметке (AC): ${tag}`).not.toMatch(stateAttrs);
      expect(tag, `панель названа табом в разметке: ${tag}`).toMatch(/aria-labelledby=/);
    }
    const tabTags = source.match(/<a[^>]*ui-tabs__tab[^>]*>/g) ?? [];
    expect(tabTags.length, 'в разметке стенда есть табы-ссылки (скрипты вырезаны)').toBeGreaterThan(
      0,
    );
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

      // T14.9: pill-инстанс в том же no-JS контексте — все панели видимы,
      // aria-current="page" в разметке ни на что не влияет (деградация не
      // меняется — правило T14.9).
      const pillPanelsNoJs = noJsPage.locator(SEL.pillPanels);
      const pillCount = await pillPanelsNoJs.count();
      expect(pillCount, 'pill-панели в разметке').toBe(3);
      for (let i = 0; i < pillCount; i += 1) {
        await expect(pillPanelsNoJs.nth(i), `pill-панель ${i} видима без JS`).toBeVisible();
      }
      await expect(noJsPage.locator(`${SEL.pillTabs}[aria-current="page"]`)).toHaveCount(1);
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

test.describe('ui-tabs--pill и начальный выбор (aria-current="page"; T14.9)', () => {
  test('модификатор на стенде: инициализация выбирает таб с aria-current="page" (третий), атрибут остаётся', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');

    await expect(page.locator(SEL.pillSection), 'секция pill-варианта на стенде').toHaveCount(1);
    await expect(page.locator('#uitab-pill .ui-tabs--pill')).toHaveCount(1);

    // Стартовый выбор — aria-current-таб (третий, как в nav.tabs-pill
    // education.html), а не первый; инстанс консистентен (roving tabindex,
    // ровно один aria-selected, панели скрыты модулем).
    const selected = await expectInstanceConsistent(page, SEL.pillTabs, SEL.pillPanels);
    expect(selected, 'выбран третий таб — aria-current="page" из разметки').toBe(2);
    await expect(page.locator(SEL.pillTabs).nth(2)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(SEL.pillTabs).nth(0)).not.toHaveAttribute('aria-current');

    // Контраст выбранной пилюли: подпись text-on-dark на заливке primary (пара
    // гейта T2.3). Каскадный пин: цвет невыбранных задаёт :not-правило
    // модификатора, цвет выбранной — активное правило базы (иначе — тёмная
    // подпись на тёмной заливке, 1.12:1; ловилось axe color-contrast).
    const colorOf = (index) =>
      page
        .locator(SEL.pillTabs)
        .nth(index)
        .evaluate((el) => getComputedStyle(el).color);
    expect(await colorOf(2), 'выбранная пилюля: text-on-dark').toBe('rgb(255, 255, 255)');
    expect(await colorOf(0), 'невыбранная пилюля: text').toBe('rgb(31, 31, 31)');
  });

  test('клавиатура общая с базой: ←/→ automatic-активация в pill-инстансе', async ({ stand }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.pillTabs);
    const panels = page.locator(SEL.pillPanels);

    await tabs.nth(2).focus();
    await expect(tabs.nth(2)).toBeFocused();

    // ← : фокус и выбор уходят на второй таб (automatic — APG, как в базе).
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(1), '←: фокус на втором табе').toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
    await expect(panels.nth(1), 'панель второго таба показана').toBeVisible();
    await expect(panels.nth(2)).toBeHidden();

    // roving tabindex переехал за выбором.
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '0');
    await expect(tabs.nth(2)).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('ui-tabs--pill: навигационный набор по aria-current="page" (T17.11)', () => {
  /** Computed-пара «фон/подпись» одного таба навигационного набора. */
  const styleOf = (tab) =>
    tab.evaluate((el) => {
      const style = getComputedStyle(el);
      return { bg: style.backgroundColor, color: style.color };
    });

  test('набор без панелей модуль не инициализирует; активная пилюля красится по aria-current (покой)', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.navTabs);

    // Модуль набор не трогал (панелей нет — контракт T13.6): нет ролей,
    // roving tabindex и aria-selected — их ставит только инициализация.
    await expect(page.locator(SEL.navList), 'tablist на наборе-навигации нет').not.toHaveAttribute(
      'role',
      'tablist',
    );
    await expect(tabs, 'поднавигация — пять ссылок-разделов').toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await expect(tabs.nth(i), `таб-ссылка ${i} без tabindex`).not.toHaveAttribute('tabindex');
      await expect(tabs.nth(i), `таб-ссылка ${i} без aria-selected`).not.toHaveAttribute(
        'aria-selected',
      );
    }
    await expect(tabs.nth(2), 'активный раздел помечен aria-current="page"').toHaveAttribute(
      'aria-current',
      'page',
    );

    // Computed-пины покоя (пары гейта T2.3): активная — заливка primary +
    // text-on-dark; соседняя — прозрачная пилюля с подписью text. До T17.11
    // активную пару по aria-current несли только сайт-зонные реплики
    // (pilot.css 0,4,0 — сняты).
    await expect
      .poll(() => styleOf(tabs.nth(2)), 'активная пилюля: primary + text-on-dark')
      .toEqual({ bg: 'rgb(0, 40, 86)', color: 'rgb(255, 255, 255)' });
    await expect
      .poll(() => styleOf(tabs.nth(0)), 'соседняя пилюля: прозрачная, подпись text')
      .toEqual({ bg: 'rgba(0, 0, 0, 0)', color: 'rgb(31, 31, 31)' });
  });

  test('hover-гашение: hover невыбранной не заливает пилюлю, hover активной не гасит заливку', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.navTabs);

    // Hover невыбранной (pages.css:998): базовый hover-филл погашен —
    // transparent + подпись primary, заливки нет.
    await tabs.nth(0).hover();
    await expect
      .poll(() => styleOf(tabs.nth(0)), 'hover невыбранной: без заливки, подпись primary')
      .toEqual({ bg: 'rgba(0, 0, 0, 0)', color: 'rgb(0, 40, 86)' });

    // Hover АКТИВНОЙ (кейс, ради которого pilot.css таскал hover-повтор
    // заливки в паре 0,4,0): hover-исключение знает обе цели — заливка
    // primary и подпись text-on-dark сохраняются.
    await tabs.nth(2).hover();
    await expect
      .poll(() => styleOf(tabs.nth(2)), 'hover активной: заливка не погашена')
      .toEqual({ bg: 'rgb(0, 40, 86)', color: 'rgb(255, 255, 255)' });
  });

  test('остаточный aria-current в модульном инстансе: вид невыбранного — подпись text, hover без заливки', async ({
    stand,
  }) => {
    const page = await stand('ui-tabs');
    const tabs = page.locator(SEL.pillTabs);

    // Штатный поток T14.9: init выбрал aria-current-таб (третий), клик по
    // первому переносит выбор — aria-selected уходит, атрибут остаётся
    // (модуль его не снимает). Ревью T17.11 high: без guard'а ветки current
    // в :not()-цепочках подписи/hover остаточный таб выпадал из исключений —
    // покой выглядел как hover (подпись primary), hover — как активная
    // пилюля (полная заливка). Вид обязан вернуться к невыбранному.
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2), 'aria-current остался (модуль атрибут не снимает)').toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');

    await expect
      .poll(() => styleOf(tabs.nth(2)), 'остаточный aria-current в покое: прозрачная, подпись text')
      .toEqual({ bg: 'rgba(0, 0, 0, 0)', color: 'rgb(31, 31, 31)' });

    await tabs.nth(2).hover();
    await expect
      .poll(() => styleOf(tabs.nth(2)), 'hover остаточного: без заливки, подпись primary')
      .toEqual({ bg: 'rgba(0, 0, 0, 0)', color: 'rgb(0, 40, 86)' });
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

    // T14.9: pill-вариант после переключения (заливка ушла с aria-current-таба
    // на второй) — вид пилюль в обоих состояниях.
    await page.locator(SEL.pillTabs).nth(1).click();
    await shot(page, { name: 'ui-tabs-pill-selected', viewport: 'desktop' });
  });
});
