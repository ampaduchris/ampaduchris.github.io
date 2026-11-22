// The loop on Method: the list is the control and the drawing mirrors it. Without this script all six steps are listed.
// It starts on step five. It does not advance by itself (DEV-024): a step that moves without a way to stop it would break
// WCAG 2.2.2, and the page has no pause control for it.
(function () {
  var list = document.querySelector('[data-steps]');
  if (!list) return;
  var items = Array.prototype.slice.call(list.children);
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.loop svg [data-step]'));
  function go(n) {
    items.forEach(function (li, i) { li.classList.toggle('on', i === n); });
    nodes.forEach(function (g, i) { g.classList.toggle('on', i === n); });
  }
  items.forEach(function (li, i) {
    li.setAttribute('tabindex', '0');
    li.addEventListener('pointerenter', function () { go(i); });
    li.addEventListener('click', function () { go(i); });
    li.addEventListener('focus', function () { go(i); });
  });
  nodes.forEach(function (g, i) {
    g.addEventListener('pointerenter', function () { go(i); });
    g.addEventListener('click', function () { go(i); });
  });
  go(4);
})();
