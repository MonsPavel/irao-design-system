/* НАРУШЕНИЕ (DoD T1.2, «запрет глобалов»): var и функция верхнего уровня в
   классическом скрипте создают глобалы — модуль обязан объявлять только
   window.IraoUI.<name>, всё остальное внутри IIFE
   (docs/02-architecture.md §2, контракт docs/templates/module-template.js).
   Ожидаемый красный: no-implicit-globals (попутно no-unused-vars —
   фикстура ничего не использует). */
var globalLeak = 2;

function leaky() {
  return globalLeak;
}
