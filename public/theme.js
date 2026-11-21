// Light by default, whatever the system says. Dark only when the reader asks for it.
// The reader's choice is the one value this site stores (local storage key "theme"). Loaded in <head> so the page never flashes.
(function () {
  var KEY = 'theme', root = document.documentElement;
  try { if (localStorage.getItem(KEY) === 'dark') root.dataset.theme = 'dark'; } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('[data-theme-toggle]');
    if (!b) return;
    b.hidden = false; // without scripts the button stays hidden and the site is light
    var label = function () { var d = root.dataset.theme === 'dark'; b.textContent = d ? 'Light' : 'Dark'; b.setAttribute('aria-label', d ? 'Switch to the light scheme' : 'Switch to the dark scheme'); };
    label();
    b.addEventListener('click', function () {
      var d = root.dataset.theme === 'dark';
      if (d) delete root.dataset.theme; else root.dataset.theme = 'dark';
      try { if (d) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'dark'); } catch (e) {}
      label();
    });
  });
})();
