/* ПОЗИТИВНЫЙ КОНТРОЛЬ: модуль в форме docs/templates/module-template.js —
   IIFE, 'use strict', строгое равенство, только window/document из глобальных.
   Ожидаемый зелёный: ни одного замечания. */
(function (window) {
  'use strict';

  var ready = window.document.readyState === 'complete';

  window.IraoUI = window.IraoUI || {};
  window.IraoUI.cases = { ready: ready };
})(window);
