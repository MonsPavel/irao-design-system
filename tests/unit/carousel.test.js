/**
 * Юнит-пин ui-carousel (задача T17.7; Testing requirements — tests first).
 *
 * Поверхность браузера — клавиатурный сценарий (roving tabindex на табах,
 * стрелки, Home/End), деградация без JS, JSON-слайды, галерея, axe и эталоны —
 * в tests/e2e/ui-carousel.spec.js; здесь — пины исполняемой формы решения:
 *  - components/ui-carousel/ui-carousel.css: @define carousel; box-sizing на
 *    корне и элементах (ADR-0002); стрелки/степпер скрыты по умолчанию —
 *    показываются только на инициализированном корне (.ui-carousel.is-
 *    initialized — состояние ставит модуль, CSS-скрытие делает display-правило
 *    компонента: `:root.js`-хука в dist нет, data-селекторы не проходят БЭМ-
 *    гейт stylelint — приём «скрыт по умолчанию, показан is-классом»);
 *    активный таб — :where([aria-selected='true']) (семантика — единственный
 *    источник правды, вклад в специфичность нулевой — прецедент ui-tabs);
 *    вид — значения пилота cp-production (одобренная интерпретация спеки):
 *    таб с рамкой on-dark-muted, активный — glass-dark + белая рамка; стрелки
 *    on-dark; цветов вне токенов нет; без !important, hex, z-index,
 *    transition/animation (AC: prefers-reduced-motion — анимаций и нет);
 *  - канонический паттерн (ui-carousel.html): деградация без JS — первый
 *    слайд продублирован в слотах разметки, стрелки/степпер несут hidden
 *    (их снимает модуль — симметрично атрибуту open в ui-modal: разметка
 *    правдива без JS — мёртвых контролов нет); роли tablist/tab — в разметке
 *    (канон спеки T17.7 — степпер честный tablist сразу, прецедент пилота);
 *    tabindex/roving ставит модуль;
 *  - контракт модуля IraoUI.carousel (jsdom-песочница — образец
 *    tests/unit/tabs.test.js): readyState-guard, регистрация в window.IraoUI
 *    сразу (селектор обеих форм — '[data-ui-carousel], [data-ui-gallery]'),
 *    guard отсутствия элементов, отказоустойчивость init (битый/пустой JSON
 *    → console.warn, соседние инстансы живы), guard повторной инициализации,
 *    флаг — data-атрибут (не dataset);
 *  - JSON-парс — чистая функция parseSlides (Testing requirements): валидный
 *    массив, не-массив, битый JSON, обрезка не-слайдов — через поведение
 *    инициализации (слоты/слайды);
 *  - init-мутации модуля: снятие hidden со стрелок/степпера, roving tabindex
 *    (0 у активного таба, −1 у остальных — прецедент ui-tabs), нормализация
 *    aria-selected, стартовый рендер первого слайда в слоты (silent);
 *  - поведение: клик стрелки/таба — активный слайд (зацикливание), рендер
 *    слотов {photo,title,text,link,count} (link — slide.link, иначе
 *    «Подробнее: count» — строка пилота), клавиатура ←/→/Home/End на табах
 *    (automatic-активация — фокус и выбор вместе), событие
 *    irao-ui:carousel-select (bubbles, detail.index) — на смене ПОСЛЕ
 *    инициализации (silent-старт), API IraoUI.carousel.select(root, index);
 *  - галерея data-ui-gallery: JSON-массив фото, prev/next, событие, без
 *    степпера; alt фото не трогает (декоративные фото попапа).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('components/ui-carousel/ui-carousel.css — база (ADR-0002, пилот cp-production)', () => {
  const path = join(root, 'components', 'ui-carousel', 'ui-carousel.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define carousel — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define carousel */')).toBe(true);
  });

  it('корень и элементы: box-sizing на всех с размерами (ADR-0002)', () => {
    for (const selector of [
      '.ui-carousel',
      '.ui-carousel__photo',
      '.ui-carousel__body',
      '.ui-carousel__arrow',
      '.ui-carousel__stepper',
      '.ui-carousel__tab',
    ]) {
      const block = blockOf(css, selector);
      expect(block, `правило ${selector} найдено`).toBeTruthy();
      expect(block, `${selector}: box-sizing (ADR-0002)`).toContain('box-sizing: border-box;');
    }
  });

  it('деградация без JS: стрелки и степпер скрыты display-правилом по умолчанию', () => {
    const arrow = blockOf(css, '.ui-carousel__arrow');
    const stepper = blockOf(css, '.ui-carousel__stepper');
    expect(arrow, 'стрелка скрыта по умолчанию').toContain('display: none;');
    expect(stepper, 'степпер скрыт по умолчанию').toContain('display: none;');
  });

  it('показ стрелок/степпера — только на инициализированном корне (is-initialized ставит модуль)', () => {
    expect(css).toMatch(/\.ui-carousel\.is-initialized \.ui-carousel__arrow\s*\{/);
    expect(css).toMatch(/\.ui-carousel\.is-initialized \.ui-carousel__stepper\s*\{/);
    const shown = blockOf(css, '.ui-carousel.is-initialized .ui-carousel__arrow');
    expect(shown, 'стрелка показана inline-flex').toContain('display: inline-flex;');
    const stepperShown = blockOf(css, '.ui-carousel.is-initialized .ui-carousel__stepper');
    expect(stepperShown, 'степпер показан flex').toContain('display: flex;');
  });

  it('стрелка — on-dark-иконка: прозрачный фон (без UA-артефакта ButtonFace), padding space-2', () => {
    const arrow = blockOf(css, '.ui-carousel__arrow');
    expect(arrow).toContain('align-items: center;');
    expect(arrow).toContain('justify-content: center;');
    expect(arrow).toContain('padding: var(--ui-space-2);');
    expect(arrow).toContain('border: 0;');
    expect(arrow).toContain('background-color: transparent;');
    expect(arrow).toContain('color: var(--ui-color-text-on-dark);');
    expect(arrow).toContain('cursor: pointer;');
  });

  it('таб — рамка on-dark-muted, прозрачный фон; активный — :where([aria-selected]): glass-dark + белая рамка', () => {
    const tab = blockOf(css, '.ui-carousel__tab');
    expect(tab).toContain('border: var(--ui-border-width) solid var(--ui-color-text-on-dark-muted);');
    expect(tab).toContain('background-color: transparent;');
    expect(tab).toContain('color: var(--ui-color-text-on-dark-muted);');
    expect(tab).toContain('text-align: left;');
    expect(tab).toContain('cursor: pointer;');

    expect(css).toMatch(/\.ui-carousel__tab:where\(\[aria-selected='true'\]\)/);
    const active = blockOf(css, ".ui-carousel__tab:where([aria-selected='true'])");
    expect(active).toContain('border-color: var(--ui-color-surface);');
    expect(active).toContain('background-color: var(--ui-color-glass-dark);');
    expect(active).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('степпер — flex-лента с gap space-2, сброс списка (не полагается на reset сайта)', () => {
    const stepper = blockOf(css, '.ui-carousel__stepper');
    expect(stepper).toContain('gap: var(--ui-space-2);');
    expect(stepper).toContain('margin: 0;');
    expect(stepper).toContain('padding: 0;');
    expect(stepper).toContain('list-style: none;');
  });

  it('AC reduced-motion: собственных анимаций и переходов НЕТ (проверка-пин)', () => {
    expect(css).not.toMatch(/transition\s*:/);
    expect(css).not.toMatch(/animation\s*:/);
  });

  it('цвета — только токены; без !important и hex; z-index нет (позиции — зона композиции)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\bz-index\s*:/);
    expect(css).not.toMatch(/:\s*(?:absolute|fixed)\s*;/);
  });

  it('hover не задан (пилот cp-production не задаёт — значения одобренного дизайна не расширяем)', () => {
    expect(css).not.toContain(':hover');
  });
});

describe('канонический паттерн (components/ui-carousel/ui-carousel.html) — деградация без JS', () => {
  // Разметка без комментариев: пины смотрят на теги, а не на прозу.
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
  const html = stripHtmlComments(
    readFileSync(join(root, 'components', 'ui-carousel', 'ui-carousel.html'), 'utf8'),
  );

  it('хуки модуля data-ui-carousel / data-ui-gallery в разметке (JS-хуки — только data-ui-*)', () => {
    expect(html).toContain('data-ui-carousel');
    expect(html).toContain('data-ui-gallery');
  });

  it('деградация без JS: первый слайд продублирован в слотах (photo/title/text/link)', () => {
    const photoTag = html.match(/<img[^>]*data-ui-carousel-photo[^>]*>/)?.[0];
    expect(photoTag, 'фото-слот в разметке').toBeTruthy();
    expect(photoTag, 'первый слайд продублирован: src').toMatch(/\ssrc="[^"]+"/);
    expect(photoTag, 'первый слайд продублирован: alt').toMatch(/\salt="[^"]+"/);
    expect(html).toMatch(/data-ui-carousel-title>[^<]+</);
    expect(html).toMatch(/data-ui-carousel-text>[^<]+</);
    expect(html).toMatch(/data-ui-carousel-link>[^<]+</);
    // Данные слайдов — JSON в разметке (компонент не ходит в сеть).
    expect(html).toMatch(
      /<script type="application\/json" data-ui-carousel-slides>\s*\[[\s\S]*?\]\s*<\/script>/,
    );
  });

  it('галерея: JSON-массив фото и фото-слот с первым фото', () => {
    expect(html).toMatch(
      /<script type="application\/json" data-ui-gallery-photos>\s*\[[\s\S]*?\]\s*<\/script>/,
    );
    const photoTag = html.match(/<img[^>]*data-ui-gallery-photo[^>]*>/)?.[0];
    expect(photoTag, 'фото-слот галереи в разметке').toBeTruthy();
    expect(photoTag, 'первое фото продублировано: src').toMatch(/\ssrc="[^"]+"/);
  });

  it('стрелки и степпер несут hidden в разметке — их снимает модуль (мёртвых контролов без JS нет)', () => {
    const arrows = [...html.matchAll(/<button[^>]*data-ui-carousel-(?:prev|next)[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(arrows.length, 'пара стрелок карусели').toBe(2);
    for (const tag of arrows) {
      expect(tag, `стрелка без JS скрыта: ${tag}`).toMatch(/\bhidden\b/);
    }
    const galleryArrows = [
      ...html.matchAll(/<button[^>]*data-ui-gallery-(?:prev|next)[^>]*>/g),
    ].map(([tag]) => tag);
    expect(galleryArrows.length, 'пара стрелок галереи').toBe(2);
    for (const tag of galleryArrows) {
      expect(tag, `стрелка галереи без JS скрыта: ${tag}`).toMatch(/\bhidden\b/);
    }
    const stepperTag = html.match(/<ul[^>]*ui-carousel__stepper[^>]*>/)?.[0];
    expect(stepperTag, 'степпер в разметке').toBeTruthy();
    expect(stepperTag, 'степпер без JS скрыт').toMatch(/\bhidden\b/);
  });

  it('степпер — честный tablist в разметке (канон спеки), табы с aria-selected; tabindex ставит модуль', () => {
    const stepperTag = html.match(/<ul[^>]*ui-carousel__stepper[^>]*>/)?.[0];
    expect(stepperTag).toMatch(/role="tablist"/);
    expect(stepperTag).toMatch(/aria-label="/);
    const tabTags = [...html.matchAll(/<button[^>]*ui-carousel__tab[^>]*>/g)].map(([tag]) => tag);
    expect(tabTags.length, 'в паттерне есть табы').toBeGreaterThan(1);
    for (const tag of tabTags) {
      expect(tag, `таб с ролью: ${tag}`).toMatch(/role="tab"/);
      expect(tag, `таб с aria-selected: ${tag}`).toMatch(/aria-selected="/);
      expect(tag, `таб без tabindex (roving ставит модуль): ${tag}`).not.toMatch(/\btabindex=/);
    }
  });

  it('стрелки вне tablist (Implementation requirements п.3): aria-label есть, role нет', () => {
    for (const [, tag] of html.matchAll(/(<button[^>]*data-ui-carousel-(?:prev|next)[^>]*>)/g)) {
      expect(tag, `стрелка с доступным именем: ${tag}`).toMatch(/aria-label="/);
      expect(tag, `стрелка без роли таба: ${tag}`).not.toMatch(/role="tab"/);
    }
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/\sstyle=/);
  });
});

describe('контракт модуля ui-carousel.js (jsdom; образец — tests/unit/tabs.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-carousel', 'ui-carousel.js'), 'utf8');

  const SELECTOR = '[data-ui-carousel], [data-ui-gallery]';
  const INIT_ATTR = 'data-ui-carousel-init';
  const GALLERY_INIT_ATTR = 'data-ui-gallery-init';

  /** Инстанс карусели — каноническая структура паттерна (спека T17.7). */
  const carouselHtml = (id) => `
    <section class="ui-carousel" data-ui-carousel id="${id}">
      <script type="application/json" data-ui-carousel-slides>
        [{"photo":"a.png","title":"Производство","text":"Текст А","count":"25 вакансий"},
         {"photo":"b.png","title":"Женские вакансии","text":"Текст Б","count":"13 вакансий"},
         {"photo":"c.png","title":"IT сфера","text":"Текст В","link":"Подробнее"}]
      </script>
      <img class="ui-carousel__photo" src="a.png" alt="Производство" data-ui-carousel-photo>
      <div class="ui-carousel__body">
        <h2 data-ui-carousel-title>Производство</h2>
        <p data-ui-carousel-text>Текст А</p>
        <a href="#" data-ui-carousel-link>Подробнее: 25 вакансий</a>
      </div>
      <button type="button" class="ui-carousel__arrow" data-ui-carousel-prev hidden aria-label="Предыдущий слайд">←</button>
      <button type="button" class="ui-carousel__arrow" data-ui-carousel-next hidden aria-label="Следующий слайд">→</button>
      <ul class="ui-carousel__stepper" role="tablist" aria-label="Слайды" hidden>
        <li><button type="button" class="ui-carousel__tab" role="tab" aria-selected="true">1 Производство</button></li>
        <li><button type="button" class="ui-carousel__tab" role="tab" aria-selected="false">2 Женские вакансии</button></li>
        <li><button type="button" class="ui-carousel__tab" role="tab" aria-selected="false">3 IT сфера</button></li>
      </ul>
    </section>`;

  /** Инстанс галереи — форма data-ui-gallery. */
  const galleryHtml = (id) => `
    <div class="ui-carousel" data-ui-gallery id="${id}">
      <script type="application/json" data-ui-gallery-photos>["p1.jpg", "p2.jpg", "p3.jpg"]</script>
      <img src="p1.jpg" alt="" data-ui-gallery-photo>
      <button type="button" class="ui-carousel__arrow" data-ui-gallery-prev hidden aria-label="Предыдущее фото">←</button>
      <button type="button" class="ui-carousel__arrow" data-ui-gallery-next hidden aria-label="Следующее фото">→</button>
    </div>`;

  /**
   * Песочница: документ с заданным readyState и телом; шпион на подписку
   * document.addEventListener и console.warn (модуль пишет в window.console.warn).
   */
  function makeSandbox({ readyState = 'complete', bodyHtml = '' } = {}) {
    const dom = new JSDOM('<!doctype html><html><body>' + bodyHtml + '</body></html>', {
      url: 'https://showcase.test/',
      runScripts: 'outside-only',
    });
    const { window } = dom;
    const { document } = window;

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => readyState,
    });

    const domContentLoadedSubscriptions = [];
    const originalAddEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'DOMContentLoaded') {
        domContentLoadedSubscriptions.push(listener);
      }
      return originalAddEventListener(type, listener, options);
    });

    const warnings = [];
    window.console.warn = (...args) => warnings.push(args);

    window.eval(source);

    return { window, document, domContentLoadedSubscriptions, warnings };
  }

  function fireDOMContentLoaded(window) {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }

  /** Публичный API модуля из песочницы. */
  const apiOf = (sandbox) => sandbox.window.IraoUI.carousel;

  const rootsOf = ({ document }) => [...document.querySelectorAll('[data-ui-carousel]')];
  const galleriesOf = ({ document }) => [...document.querySelectorAll('[data-ui-gallery]')];
  const tabsOf = (root) => [...root.querySelectorAll('.ui-carousel__tab')];
  const slotsOf = (root) => ({
    photo: root.querySelector('[data-ui-carousel-photo]'),
    title: root.querySelector('[data-ui-carousel-title]'),
    text: root.querySelector('[data-ui-carousel-text]'),
    link: root.querySelector('[data-ui-carousel-link]'),
  });
  const galleryPhotoOf = (root) => root.querySelector('[data-ui-gallery-photo]');

  /** Собрать события irao-ui:carousel-select на корне. */
  function collectSelectEvents(window, root) {
    const events = [];
    root.addEventListener('irao-ui:carousel-select', (event) => events.push(event));
    return events;
  }

  describe('readyState-guard и реестр IraoUI', () => {
    it("readyState 'loading': init отложен — до DOMContentLoaded инстансов нет, регистрация — сразу", () => {
      const { window, document, domContentLoadedSubscriptions } = makeSandbox({
        readyState: 'loading',
        bodyHtml: carouselHtml('c1') + galleryHtml('g1'),
      });

      expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(0);
      expect(document.querySelectorAll(`[${GALLERY_INIT_ATTR}]`)).toHaveLength(0);
      expect(typeof apiOf({ window }).init).toBe('function');
      expect(apiOf({ window }).selector).toBe(SELECTOR);

      fireDOMContentLoaded(window);
      expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
      expect(document.querySelectorAll(`[${GALLERY_INIT_ATTR}]`)).toHaveLength(1);
      expect(domContentLoadedSubscriptions).toHaveLength(1);
    });

    it("readyState 'complete': init синхронный — обе формы инициализируются", () => {
      const { document } = makeSandbox({
        bodyHtml: carouselHtml('c1') + galleryHtml('g1'),
      });

      expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
      expect(document.querySelectorAll(`[${GALLERY_INIT_ATTR}]`)).toHaveLength(1);
    });

    it('guard отсутствия элементов: модуль молча выходит (без warn)', () => {
      const { warnings } = makeSandbox({ bodyHtml: '<p>без карусели</p>' });
      expect(warnings).toEqual([]);
    });

    it('повторный init(): флаг — data-атрибут, повторная инициализация запрещена', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      apiOf({ window }).init();
      const photoSrc = document.querySelector('[data-ui-carousel-photo]').getAttribute('src');
      apiOf({ window }).init();
      expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
      expect(document.querySelector('[data-ui-carousel-photo]').getAttribute('src')).toBe(photoSrc);
    });
  });

  describe('отказоустойчивость init (контракт шаблона п.4)', () => {
    it('битый JSON → console.warn, инстанс не инициализируется, сосед жив', () => {
      const broken = `
        <section class="ui-carousel" data-ui-carousel id="broken">
          <script type="application/json" data-ui-carousel-slides>{нет массива</script>
          <img src="a.png" alt="" data-ui-carousel-photo>
        </section>`;
      const { document, warnings } = makeSandbox({
        bodyHtml: broken + carouselHtml('alive'),
      });

      expect(warnings.length, 'warn о битом JSON').toBe(1);
      expect(document.getElementById('broken').hasAttribute(INIT_ATTR)).toBe(false);
      expect(document.getElementById('alive').hasAttribute(INIT_ATTR)).toBe(true);
    });

    it('пустой массив слайдов → warn, инстанс не инициализируется (переключать нечего)', () => {
      const empty = `
        <section class="ui-carousel" data-ui-carousel id="empty">
          <script type="application/json" data-ui-carousel-slides>[]</script>
          <img src="a.png" alt="" data-ui-carousel-photo>
        </section>`;
      const { document, warnings } = makeSandbox({ bodyHtml: empty });
      expect(warnings.length).toBe(1);
      expect(document.getElementById('empty').hasAttribute(INIT_ATTR)).toBe(false);
    });

    it('нет JSON-скрипта → warn, инстанс не инициализируется (данные — зона разметки, п.2)', () => {
      const noData = `
        <section class="ui-carousel" data-ui-carousel id="nodata">
          <img src="a.png" alt="" data-ui-carousel-photo>
        </section>`;
      const { document, warnings } = makeSandbox({ bodyHtml: noData });
      expect(warnings.length).toBe(1);
      expect(document.getElementById('nodata').hasAttribute(INIT_ATTR)).toBe(false);
    });

    it('галерея с битым JSON → warn; галерея без JSON-скрипта → warn', () => {
      const brokenGallery = `
        <div data-ui-gallery id="gbroken">
          <script type="application/json" data-ui-gallery-photos>["x.jpg"</script>
          <img src="p1.jpg" alt="" data-ui-gallery-photo>
        </div>`;
      const noDataGallery = `<div data-ui-gallery id="gnodata"><img src="p1.jpg" alt="" data-ui-gallery-photo></div>`;
      const { document, warnings } = makeSandbox({
        bodyHtml: brokenGallery + noDataGallery,
      });
      expect(warnings.length).toBe(2);
      expect(document.getElementById('gbroken').hasAttribute(GALLERY_INIT_ATTR)).toBe(false);
      expect(document.getElementById('gnodata').hasAttribute(GALLERY_INIT_ATTR)).toBe(false);
    });
  });

  describe('init-мутации: hidden снят, roving tabindex, нормализация, стартовый рендер', () => {
    it('модуль снимает hidden со стрелок и степпера (JS-гарантированный контекст)', () => {
      const { document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      for (const selector of ['[data-ui-carousel-prev]', '[data-ui-carousel-next]', '.ui-carousel__stepper']) {
        expect(rootEl.querySelector(selector).hasAttribute('hidden'), `${selector} показан`).toBe(
          false,
        );
      }
    });

    it('roving tabindex: активный таб 0, остальные −1; aria-selected нормализован (ровно один true)', () => {
      const { document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const tabs = tabsOf(document.getElementById('c1'));
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
      expect(tabs[0].getAttribute('tabindex')).toBe('0');
      expect(tabs[1].getAttribute('tabindex')).toBe('-1');
      expect(tabs[2].getAttribute('tabindex')).toBe('-1');
    });

    it('стартовый рендер — silent: слоты несут данные первого слайда, событие не диспатчится', () => {
      const { document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const events = collectSelectEvents(window, rootEl);
      const slots = slotsOf(rootEl);
      expect(slots.photo.getAttribute('src')).toBe('a.png');
      expect(slots.photo.getAttribute('alt')).toBe('Производство');
      expect(slots.title.textContent).toBe('Производство');
      expect(slots.text.textContent).toBe('Текст А');
      expect(slots.link.textContent).toBe('Подробнее: 25 вакансий');
      expect(events, 'старт — не смена выбора').toEqual([]);
    });

    it('слайд с link в данных: link-слот показывает slide.link, не «Подробнее: count»', () => {
      const { document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      // слайд 3 (индекс 2) — {"link":"Подробнее"} без count
      tabsOf(rootEl)[2].click();
      expect(slotsOf(rootEl).link.textContent).toBe('Подробнее');
    });

    it('стартовый выбор из разметки: таб с aria-selected="true" (не первый) — стартовый', () => {
      const marked = carouselHtml('c1').replace(
        'aria-selected="true">1 Производство',
        'aria-selected="false">1 Производство',
      ).replace(
        'aria-selected="false">2 Женские вакансии',
        'aria-selected="true">2 Женские вакансии',
      );
      const { document } = makeSandbox({ bodyHtml: marked });
      const rootEl = document.getElementById('c1');
      const tabs = tabsOf(rootEl);
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(slotsOf(rootEl).title.textContent).toBe('Женские вакансии');
      expect(slotsOf(rootEl).photo.getAttribute('src')).toBe('b.png');
    });

    it('слоты опциональны: инстанс без link-слота инициализируется и рендерит остальное', () => {
      const minimal = `
        <section class="ui-carousel" data-ui-carousel id="min">
          <script type="application/json" data-ui-carousel-slides>[{"photo":"a.png","title":"А","text":"тА","count":"1"}]</script>
          <img src="a.png" alt="А" data-ui-carousel-photo>
          <h2 data-ui-carousel-title>А</h2>
        </section>`;
      const { document, warnings } = makeSandbox({ bodyHtml: minimal });
      expect(warnings, 'слоты опциональны — отказов нет').toEqual([]);
      expect(document.getElementById('min').hasAttribute(INIT_ATTR)).toBe(true);
      expect(document.querySelector('[data-ui-carousel-title]').textContent).toBe('А');
    });
  });

  describe('поведение: стрелки, табы, клавиатура, событие', () => {
    it('клик next/prev — соседний слайд с зацикливанием; слоты и aria-selected обновлены', () => {
      const { document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const slots = slotsOf(rootEl);
      const tabs = tabsOf(rootEl);

      rootEl.querySelector('[data-ui-carousel-next]').click();
      expect(slots.photo.getAttribute('src')).toBe('b.png');
      expect(slots.photo.getAttribute('alt')).toBe('Женские вакансии');
      expect(slots.title.textContent).toBe('Женские вакансии');
      expect(slots.text.textContent).toBe('Текст Б');
      expect(slots.link.textContent).toBe('Подробнее: 13 вакансий');
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(tabs[0].getAttribute('aria-selected')).toBe('false');
      expect(tabs[1].getAttribute('tabindex')).toBe('0');

      rootEl.querySelector('[data-ui-carousel-prev]').click();
      expect(slots.title.textContent).toBe('Производство');

      // зацикливание назад: с первого — на последний
      rootEl.querySelector('[data-ui-carousel-prev]').click();
      expect(slots.title.textContent).toBe('IT сфера');
      // и вперёд — обратно на первый
      rootEl.querySelector('[data-ui-carousel-next]').click();
      expect(slots.title.textContent).toBe('Производство');
    });

    it('клик по табу выбирает слайд; событие irao-ui:carousel-select с detail.index (bubbles)', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const events = collectSelectEvents(window, rootEl);

      tabsOf(rootEl)[2].click();
      expect(slotsOf(rootEl).title.textContent).toBe('IT сфера');
      expect(events).toHaveLength(1);
      expect(events[0].detail.index).toBe(2);
      expect(events[0].bubbles).toBe(true);
    });

    it('стрелки диспатчат то же событие; клик по уже активному табу — no-op без события', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const events = collectSelectEvents(window, rootEl);

      rootEl.querySelector('[data-ui-carousel-next]').click();
      expect(events).toHaveLength(1);
      expect(events[0].detail.index).toBe(1);

      tabsOf(rootEl)[1].click();
      expect(events, 'повторный выбор — без события').toHaveLength(1);
    });

    it('клавиатура на табах: →/← с зацикливанием и automatic-активацией (фокус+выбор), Home/End', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const tabs = tabsOf(rootEl);
      const slots = slotsOf(rootEl);

      tabs[0].focus();
      const press = (key) =>
        rootEl.querySelector('.ui-carousel__stepper').dispatchEvent(
          new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
      const focused = (tab) => window.document.activeElement === tab;

      press('ArrowRight');
      expect(focused(tabs[1]), '→: фокус на втором табе (automatic)').toBe(true);
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
      expect(slots.title.textContent).toBe('Женские вакансии');

      press('ArrowRight');
      press('ArrowRight'); // с последнего — на первый (зацикливание)
      expect(focused(tabs[0]), '→: зацикливание, фокус на первом').toBe(true);
      expect(slots.title.textContent).toBe('Производство');

      press('ArrowLeft'); // с первого — на последний
      expect(focused(tabs[2]), '←: зацикливание, фокус на последнем').toBe(true);
      expect(slots.title.textContent).toBe('IT сфера');

      press('Home');
      expect(focused(tabs[0]), 'Home — первый').toBe(true);
      press('End');
      expect(focused(tabs[2]), 'End — последний').toBe(true);
      expect(slots.title.textContent).toBe('IT сфера');
    });

    it('API IraoUI.carousel.select(root, index): программный выбор с рендером и событием; вне диапазона — no-op', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const events = collectSelectEvents(window, rootEl);

      apiOf({ window }).select(rootEl, 1);
      expect(slotsOf(rootEl).title.textContent).toBe('Женские вакансии');
      expect(events).toHaveLength(1);
      expect(events[0].detail.index).toBe(1);

      apiOf({ window }).select(rootEl, 99);
      expect(events, 'индекс вне диапазона — no-op').toHaveLength(1);
      expect(slotsOf(rootEl).title.textContent).toBe('Женские вакансии');
    });

    it('нажатие других клавиш на табах не перехватывается (preventDefault только на ←/→/Home/End)', () => {
      const { window, document } = makeSandbox({ bodyHtml: carouselHtml('c1') });
      const rootEl = document.getElementById('c1');
      const event = new window.KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      rootEl.querySelector('.ui-carousel__stepper').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('форма-галерея (data-ui-gallery)', () => {
    it('init: hidden снят со стрелок; фото — первое из JSON; флаг data-ui-gallery-init', () => {
      const { document } = makeSandbox({ bodyHtml: galleryHtml('g1') });
      const rootEl = document.getElementById('g1');
      expect(rootEl.hasAttribute(GALLERY_INIT_ATTR)).toBe(true);
      expect(rootEl.hasAttribute(INIT_ATTR), 'флаг карусели не ставится галерее').toBe(false);
      expect(rootEl.querySelector('[data-ui-gallery-prev]').hasAttribute('hidden')).toBe(false);
      expect(rootEl.querySelector('[data-ui-gallery-next]').hasAttribute('hidden')).toBe(false);
      expect(galleryPhotoOf(rootEl).getAttribute('src')).toBe('p1.jpg');
    });

    it('prev/next листают фото с зацикливанием; событие с detail.index; alt не трогается', () => {
      const { window, document } = makeSandbox({ bodyHtml: galleryHtml('g1') });
      const rootEl = document.getElementById('g1');
      const events = collectSelectEvents(window, rootEl);
      const photo = galleryPhotoOf(rootEl);

      rootEl.querySelector('[data-ui-gallery-next]').click();
      expect(photo.getAttribute('src')).toBe('p2.jpg');
      expect(events).toHaveLength(1);
      expect(events[0].detail.index).toBe(1);

      rootEl.querySelector('[data-ui-gallery-next]').click();
      rootEl.querySelector('[data-ui-gallery-next]').click();
      expect(photo.getAttribute('src'), 'зацикливание — снова первое').toBe('p1.jpg');

      rootEl.querySelector('[data-ui-gallery-prev]').click();
      expect(photo.getAttribute('src')).toBe('p3.jpg');
      // alt декоративного фото модуль не меняет (снимает разметка)
      expect(photo.getAttribute('alt')).toBe('');
    });

    it('API select(root, index) работает и для галереи', () => {
      const { window, document } = makeSandbox({ bodyHtml: galleryHtml('g1') });
      const rootEl = document.getElementById('g1');
      apiOf({ window }).select(rootEl, 2);
      expect(galleryPhotoOf(rootEl).getAttribute('src')).toBe('p3.jpg');
    });

    it('галерея со сломанным фото-слотом (нет [data-ui-gallery-photo]) → warn, инстанс не живёт', () => {
      const broken = `
        <div data-ui-gallery id="gslot">
          <script type="application/json" data-ui-gallery-photos>["p1.jpg"]</script>
          <button type="button" data-ui-gallery-prev hidden>←</button>
        </div>`;
      const { document, warnings } = makeSandbox({ bodyHtml: broken });
      expect(warnings.length).toBe(1);
      expect(document.getElementById('gslot').hasAttribute(GALLERY_INIT_ATTR)).toBe(false);
    });
  });
});
