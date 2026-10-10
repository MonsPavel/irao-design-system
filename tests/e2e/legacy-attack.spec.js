/**
 * e2e «legacy-атака» (T11.1 — Scope, AC; констрейнты — раздел 6 плана 06;
 * расширение атаки T3.2 — tests/e2e/focus.spec.js).
 *
 * Поверхность — существующие стенды showcase (ui-button/ui-field/ui-card/
 * ui-link + typography для ролей), атака — параметризованный пакет
 * tests/helpers/legacy-attack.js: один <style> последним узлом <head> —
 * ровно сценарий «система первой, legacy-CSS сайта после» (ADR-0008).
 *
 * Проверяется — ключевые компоненты под ПОЛНЫМ пакетом токсичных правил
 * сохраняют:
 *  - геометрию: box-sizing:border-box (ADR-0002 — каждый элемент объявляет
 *    свой), min-height против legacy height, радиус/паддинги/рамки;
 *  - фокус: outline политики ADR-0001 (0-1-1) против `a { outline: none }`
 *    (0-0-1) — до и после ui-core в каскаде; заменённый контур
 *    карточки-ссылки (исключение ADR-0001 — индикатор остаётся, на ::after);
 *  - читаемость: цвета/размеры из токенов не перебиваются tag-правилами
 *    (класс 0-1-0 против tag 0-0-1), подчёркивание ссылки (WCAG 1.4.1).
 *
 * Каталог стойких исключений (T11.1 AC — фиксируется; синхрон —
 * bitrix/integration-guide.md, секция «Стойкость под legacy-атакой»):
 *  1. Карточка-ссылка: outline САМОЙ ссылки заменён контуром ::after по всей
 *     карточке (замена допустима — focus-policy.md, пин ниже: ::after несёт
 *     outline под атакой);
 *  2. Сырые теги без класса роли (служебный <h1> каркаса, списки без
 *     ui-list): reset-уровень 0-0-1 перебивается legacy tag-правилом 0-0-1,
 *     подключённым позже — граница защиты системы; правило для сайта:
 *     заголовки/списки несут классы ролей (ui-h1…, ui-list) — тогда
 *     вид удерживает специфичность 0-1-0 (пин ниже);
 *  3. Свойства, которые система не декларирует на элементе, legacy задать
 *     может (точка расширения каскада, integration-guide): гарантия —
 *     на декларированных свойствах, у контролов это вся коробка
 *     (box-sizing/min-height/padding/border/radius/фон/шрифт).
 *
 * axe на атакованных страницах не гоняется: атака намеренно вносит «чужие»
 * стили (эмуляция legacy-сайта), его нарушения — нарушения САЙТА, а не
 * системы; a11y-сущность атаки — выживание фокуса, она пинится computed'ом.
 */
import { expect } from '@playwright/test';

import { test as standTest } from '../helpers/harness.js';
import { applyLegacyAttack } from '../helpers/legacy-attack.js';

/** Всё, что получает фокус с клавиатуры (тот же селектор, что в T3.2). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Computed-стили элемента (и его псевдоэлемента, если задан). */
const probeStyles = (page, selector, props, pseudo = undefined) =>
  page.evaluate(
    ({ selector, props, pseudo }) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`probeStyles: ${selector} не найден`);
      const computed = getComputedStyle(el, pseudo ?? null);
      return Object.fromEntries(props.map((prop) => [prop, computed.getPropertyValue(prop)]));
    },
    { selector, props, pseudo },
  );

/**
 * Tab-обход до целевого элемента: фокус ТОЛЬКО клавиатурой — :focus-visible
 * честный (программный .focus() не всегда даёт его для кнопок/ссылок).
 * Точка продолжения обхода после blur() — размытый элемент (Chromium), не
 * начало документа, поэтому граница — два полных цикла: покрытие любого
 * стартового положения и «выхода/входа» фокуса. Возвращает число шагов;
 * падает, если цель не достигнута.
 */
async function tabTo(page, selector) {
  const limit = await page.evaluate((sel) => document.querySelectorAll(sel).length, FOCUSABLE);
  for (let step = 0; step <= limit * 2 + 2; step += 1) {
    const onTarget = await page.evaluate(
      ({ selector }) => Boolean(document.activeElement?.matches(selector)),
      { selector },
    );
    if (onTarget) return step;
    await page.keyboard.press('Tab');
  }
  throw new Error(`tabTo: ${selector} не достигнут за ${limit * 2 + 2} Tab-шагов`);
}

/** Состояние фокуса активного элемента (как в focus.spec.js, T3.2). */
const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const computed = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: computed.outlineWidth,
      outlineStyle: computed.outlineStyle,
      outlineColor: computed.outlineColor,
      borderColor: computed.borderColor,
    };
  });

standTest.describe('legacy-атака: констрейнты раздела 6 плана 06 (T11.1)', () => {
  standTest(
    'ui-button: геометрия (box-sizing/min-height/radius), фокус и читаемость выживают под полной атакой',
    async ({ stand }) => {
      const page = await stand('ui-button');
      const props = [
        'box-sizing',
        'height',
        'border-radius',
        'background-color',
        'color',
        'font-size',
      ];
      const before = await probeStyles(page, '#ui-button-primary', props);

      const facts = await applyLegacyAttack(page);
      expect(facts.inHead, 'атака в head').toBe(true);
      expect(facts.isLast, 'атака ПОСЛЕ ui-core (последний узел head)').toBe(true);

      const after = await probeStyles(page, '#ui-button-primary', props);
      // Атака `* {box-sizing: content-box}` (и псевдоэлементы) не меняет
      // коробку кнопки: каждый элемент объявляет свой border-box (ADR-0002).
      expect(after, 'геометрия кнопки под атакой не изменилась').toEqual(before);
      expect(after['box-sizing'], 'пин ADR-0002: border-box собственный').toBe('border-box');
      expect(after.height, 'legacy height:30px гасится min-height 3.25rem').toBe('52px');
      expect(after['border-radius'], 'радиус pill не тронут').toBe('100px');
      // Читаемость: пара одобренного дизайна «белая подпись на primary».
      expect(after['background-color'], 'заливка primary (blue-800)').toBe('rgb(0, 40, 86)');
      expect(after.color, 'подпись text-on-dark').toBe('rgb(255, 255, 255)');

      // Фокус: атака `a {outline:none}` не задевает button напрямую, но пакет
      // применяется целиком — пин состояния фокуса после Tab до кнопки.
      await tabTo(page, '#ui-button-primary');
      const state = await focusState(page);
      expect(state.tag, 'фокус на кнопке').toBe('button');
      expect(state.focusVisible, ':focus-visible применён').toBe(true);
      expect(parseFloat(state.outlineWidth), 'outline ≥ 2px (AC)').toBeGreaterThanOrEqual(2);
      expect(state.outlineStyle, 'outline solid').toBe('solid');
      expect(state.outlineColor, 'цвет фокуса — focus-тройка (blue-800)').toBe('rgb(0, 40, 86)');
    },
  );

  standTest(
    'ui-field: контрол выживает под атакой форм (tag input/textarea/select), фокус двойной',
    async ({ stand }) => {
      const page = await stand('ui-field');
      const props = [
        'box-sizing',
        'height',
        'font-size',
        'border-style',
        'border-radius',
        'border-color',
        'background-color',
        'color',
      ];
      const before = await probeStyles(page, '#uif-name', props);

      const facts = await applyLegacyAttack(page);
      expect(facts.isLast, 'атака ПОСЛЕ ui-core').toBe(true);

      const after = await probeStyles(page, '#uif-name', props);
      expect(after, 'коробка контрола под атакой не изменилась').toEqual(before);
      expect(after['box-sizing'], 'пин ADR-0002').toBe('border-box');
      expect(after.height, 'legacy height:30px гасится min-height 3.25rem').toBe('52px');
      expect(after['font-size'], 'legacy font-size:12px перебит классом (14px)').toBe('14px');
      expect(after['border-style'], 'legacy dashed перебит классом (solid)').toBe('solid');
      expect(after['border-radius'], 'legacy radius:0 перебит классом (sm 0.5rem)').toBe('8px');

      // Фокус на контроле: двойной индикатор — outline политики ADR-0001 И
      // рамка primary фирменного паттерна поля; атака border: dashed #999
      // не пробивает :focus-visible-правило (0-2-0 против 0-0-1).
      await tabTo(page, '#uif-name');
      const state = await focusState(page);
      expect(state.tag, 'фокус на input').toBe('input');
      expect(state.focusVisible, 'фокус с клавиатуры').toBe(true);
      expect(parseFloat(state.outlineWidth), 'outline ≥ 2px (AC)').toBeGreaterThanOrEqual(2);
      expect(state.outlineStyle).toBe('solid');
      // Переход рамки анимирован (--ui-transition, T5.1) — ждём устоявшийся кадр.
      await expect
        .poll(() => focusState(page), { timeout: 5000 })
        .toMatchObject({ borderColor: 'rgb(0, 40, 86)' });

      // Ошибка поля: рамка/фон состояния и текст ошибки не перебиты атакой.
      const error = await probeStyles(page, '#uif-login-err', ['border-color', 'background-color']);
      expect(error['border-color'], 'рамка ошибки — red-700').toBe('rgb(201, 58, 38)');
      const errorText = await probeStyles(page, '#uif-login-err-error', [
        'display',
        'color',
        'font-size',
      ]);
      expect(errorText.display, 'текст ошибки показан').toBe('block');
      expect(errorText.color, 'цвет ошибки — токен').toBe('rgb(201, 58, 38)');
    },
  );

  standTest(
    'ui-card: геометрия выживает; контур фокуса карточки-ссылки несёт ::after (исключение №1 каталога)',
    async ({ stand }) => {
      const page = await stand('ui-card');
      const props = [
        'box-sizing',
        'border-radius',
        'padding',
        'border-width',
        'border-color',
        'background-color',
      ];
      const before = await probeStyles(page, '#ui-card-hover', props);

      const facts = await applyLegacyAttack(page);
      expect(facts.isLast, 'атака ПОСЛЕ ui-core').toBe(true);

      const after = await probeStyles(page, '#ui-card-hover', props);
      expect(after, 'коробка карточки под атакой не изменилась').toEqual(before);
      expect(after['box-sizing'], 'пин ADR-0002').toBe('border-box');
      expect(after['border-radius'], 'радиус md не тронут').toBe('16px');
      expect(after.padding, 'паддинги не тронуты').toBe('24px');

      // Фокус ссылки карточки: outline самой ссылки ЗАМЕНЁН контуром ::after
      // по всей карточке (замена допустима, индикатор обязан остаться —
      // focus-policy.md). Атака `a {outline:none}` уничтожила бы обычную
      // обводку — замена неуязвима к ней: outline живёт на псевдоэлементе.
      await tabTo(page, '#ui-card-link-title');
      const state = await focusState(page);
      expect(state.tag, 'фокус на ссылке карточки').toBe('a');
      expect(state.focusVisible, ':focus-visible применён').toBe(true);
      const linkOutline = await probeStyles(page, '#ui-card-link-title', ['outline-width'], '::after');
      expect(
        parseFloat(linkOutline['outline-width']),
        `контур ::after по всей карточке ≥ 2px (факт ${linkOutline['outline-width']})`,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  standTest(
    'ui-link: цвет, подчёркивание и фокус выживают — и при атаке до ui-core (порядок не важен)',
    async ({ stand }) => {
      const page = await stand('ui-link');
      const props = ['color', 'text-decoration-line', 'text-decoration-thickness'];
      const before = await probeStyles(page, '#ui-link-default', props);

      // Атака №1 — после ui-core (реальный порядок legacy).
      const facts = await applyLegacyAttack(page);
      expect(facts.isLast, 'атака ПОСЛЕ ui-core').toBe(true);

      const after = await probeStyles(page, '#ui-link-default', props);
      expect(after, 'стиль ссылки под атакой не изменился').toEqual(before);
      expect(after.color, 'цвет primary (blue-800)').toBe('rgb(0, 40, 86)');
      expect(after['text-decoration-line'], 'подчёркивание всегда (WCAG 1.4.1)').toBe('underline');

      await tabTo(page, '#ui-link-default');
      const state = await focusState(page);
      expect(state.tag, 'фокус на ссылке').toBe('a');
      expect(state.focusVisible).toBe(true);
      expect(parseFloat(state.outlineWidth), 'AC: outline ≥ 2px против a {outline:none}').toBeGreaterThanOrEqual(2);
      expect(state.outlineStyle).toBe('solid');

      // Атака №2 — ДО ui-core (первый узел head): 0-1-1 политики бьёт 0-0-1
      // независимо от порядка каскада (ADR-0001; расширяет пин T3.2 на пакет).
      const prepended = await applyLegacyAttack(page, { position: 'prepend' });
      expect(prepended.isFirst, 'вторая атака ДО ui-core').toBe(true);
      await page.evaluate(() => document.activeElement.blur());
      await tabTo(page, '#ui-link-default');
      const beforeAttack = await focusState(page);
      expect(
        parseFloat(beforeAttack.outlineWidth),
        `фокус виден при атаках с обеих сторон каскада (факт ${beforeAttack.outlineWidth})`,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  standTest(
    'роли против tag-атак (typography): ui-h1/ui-list выживают; сырые теги — исключение №2 каталога',
    async ({ stand }) => {
      const page = await stand('typography');
      const h1Props = ['font-size', 'font-weight', 'margin-top'];
      const roleBefore = await probeStyles(page, 'p.ui-h1', h1Props);
      const listProps = ['list-style-type', 'padding-left'];
      const listBefore = await probeStyles(page, 'ul.ui-list', listProps);

      const facts = await applyLegacyAttack(page);
      expect(facts.isLast, 'атака ПОСЛЕ ui-core').toBe(true);

      // Роли-классы (T3.3 «классы, а не теги»): 0-1-0 перебивает tag-правила.
      const roleAfter = await probeStyles(page, 'p.ui-h1', h1Props);
      expect(roleAfter['font-size'], 'размер роли ui-h1 не перебит h1-атакой').toBe(
        roleBefore['font-size'],
      );
      expect(roleAfter['font-weight'], 'вес роли ui-h1 не перебит').toBe(roleBefore['font-weight']);

      const listAfter = await probeStyles(page, 'ul.ui-list', listProps);
      expect(listAfter['list-style-type'], 'маркер ui-list выжил (ul-атака 0-0-1)').toBe(
        listBefore['list-style-type'],
      );
      expect(listAfter['list-style-type'], 'пин значения: disc').toBe('disc');
      expect(listAfter['padding-left'], 'отступ списка не обнулён атакой').toBe(
        listBefore['padding-left'],
      );

      // Исключение №2 каталога: заголовок, несущий И тег, И класс роли, цел
      // (класс побеждает tag-правило при любой разметке)…
      const tagged = await page.evaluate(() => {
        const el = document.createElement('h1');
        el.className = 'ui-h1';
        el.textContent = 'h1 с ролью';
        document.querySelector('main')?.append(el);
        return getComputedStyle(el).fontSize;
      });
      expect(tagged, '<h1 class="ui-h1"> держит размер роли под h1-атакой').toBe(
        roleBefore['font-size'],
      );

      // …а сырой тег БЕЗ класса (служебный h1 каркаса) legacy перебивает —
      // граница защиты системы, правило для сайта: носить роли классами.
      const raw = await probeStyles(page, 'main h1:not([class])', ['font-size']);
      expect(raw['font-size'], 'сырой <h1> под атакой — 18px legacy-правила').toBe('18px');
    },
  );
});
