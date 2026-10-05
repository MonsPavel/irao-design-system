/* НАРУШЕНИЕ: нестрогое равенство `==` — запрещено
   (eslint eqeqeq; docs/02-architecture.md §9, JS lint: «===»).
   Ожидаемый красный: eqeqeq. */
(function (window) {
  var value = '1';

  if (value == 1) {
    window.console.warn('нестрогое равенство прошло');
  }
})(window);
