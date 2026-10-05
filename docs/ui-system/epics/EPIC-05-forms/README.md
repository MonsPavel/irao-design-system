# EPIC-5 — Forms

## Goal

Формы «всё из коробки»: нативные контролы с единым API состояний, клиентская валидация как progressive enhancement, идентичный контракт серверных ошибок Bitrix, готовность к `bitrix:form.result.new`.

## Context

Фаза 4 roadmap (MVP-контур). Самый рискованный контур интеграции: сервер — источник истины, JS — только UX; ошибки после перезагрузки страницы обязаны выглядеть и вести себя как клиентские. Источники: `.field/.checkbox/.radio` из components.css career-portal (класс B), `js/forms.js` (класс B — мок-валидация с фокусом на первую ошибку), `field__file` (класс D — прятал нативный input через display:none).

## Scope

- ui-field: label/hint/error/required + input (все типы ТЗ) + textarea;
- нативный select, checkbox, radio (+группы с fieldset/legend);
- доступный file input;
- раскладка форм: ui-form, form-grid, сводная ошибка, success;
- модуль IraoUI.form (PE-валидация);
- контракт серверных ошибок + интеграционный стенд «форма целиком».

## Out of scope

- Кастомный listbox-селект (T7.3, после MVP);
- дата-пикеры, маски ввода, multiselect-чипы (P2/do-not-build);
- серверная обработка (зона сайта).

## Expected outcome

Интеграционный стенд проходит полный цикл: без JS отправляется и валидируется нативно → с JS — валидация до отправки, фокус на первую ошибку → «серверный» ответ рендерит те же состояния → success. Контракт задокументирован для Bitrix-интеграторов.

## Dependencies

- [EPIC-3](../EPIC-03-base-typography/README.md), [EPIC-4](../EPIC-04-primitives/README.md) (кнопка, alert);
- [T1.6 — Vitest](../EPIC-01-foundation/T1.6-vitest-layer.md) (юнит-слой логики валидации).

## Tasks

- [T5.1 — ui-field: input и textarea + обвязка label/hint/error](T5.1-field-input-textarea.md)
- [T5.2 — Нативный select, checkbox, radio](T5.2-select-checkbox-radio.md)
- [T5.3 — ui-file: доступный файловый инпут](T5.3-file-input.md)
- [T5.4 — ui-form: раскладка, сводная ошибка, success](T5.4-form-layout.md)
- [T5.5 — IraoUI.form: клиентская валидация (PE)](T5.5-form-validation-module.md)
- [T5.6 — Серверные ошибки: контракт Bitrix + интеграционный стенд](T5.6-server-errors-contract.md)

## Acceptance Criteria

- [ ] Полный e2e-цикл «форма целиком» зелёный (без JS → с JS → серверная ошибка → успех);
- [ ] Каждый контрол доступен без JS и с клавиатуры; ошибки связаны aria-invalid/aria-describedby;
- [ ] Юнит-тесты логики валидации ≥ 90% покрывают чистые функции;
- [ ] Сниппеты для `bitrix:form.result.new` в bitrix/.

## Definition of Done

- [ ] Все 6 задач закрыты; AC выполнены
- [ ] **MVP-веха:** стендовая репетиция пилота пройдена (07-execution, Iteration 4)
- [ ] Дока форм: контраст ошибок, поведение novalidate, серверный контракт

## Risks

- Соблазн собственного форм-фреймворка → граница: JS только усиливает нативное; серверная логика вне системы;
- file-input доступность → паттерн из ADR-уровня задачи T5.3 (кнопка-лейбл + sr-only input).

## Notes

Закрывает требования ТЗ №14 (без JS), №16 (HTML5 forms), №17–18 (keyboard/screen readers в формах).
