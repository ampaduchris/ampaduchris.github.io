// The proof mark in the browser: selection, readout, keyboard, tilt and pause. It adds nothing that the HTML lacks.
// The drawing, its names and its table are built at build time (src/lib/mark.ts); this script reads them from the page.
(function () {
  var svg = document.querySelector('svg.mark[tabindex="0"]');
  var out = document.querySelector('[data-readout]');
  if (!svg) return;
  var segs = Array.prototype.slice.call(svg.querySelectorAll('.seg'));
  var restNodes = out ? Array.prototype.slice.call(out.childNodes).map(function (n) { return n.cloneNode(true); }) : [];
  var current = -1;

  function span(cls, text) { var e = document.createElement('span'); e.className = cls; e.textContent = text; return e; }
  function show(nodes) { if (!out) return; out.textContent = ''; nodes.forEach(function (n) { out.appendChild(n); }); }
  function clear() { segs.forEach(function (e) { e.classList.remove('on'); }); svg.removeAttribute('data-hl'); svg.classList.remove('tint'); }
  function select(i) {
    clear(); current = i;
    var el = segs[i];
    if (!el) { show(restNodes.map(function (n) { return n.cloneNode(true); })); return; }
    var d = el.dataset;
    svg.setAttribute('data-hl', 'seg'); el.classList.add('on');
    var merged = d.state === 'merged';
    var line3 = d.prNumber ? (merged ? 'Pull request #' + d.prNumber + ' merged by me' + (d.hours !== '' ? ' after ' + d.hours + ' hours' : '') : 'Pull request #' + d.prNumber + ' not merged by me, so the arc is dashed') : 'No pull request recorded, so the arc is dashed';
    var nodes = [span('k', d.projectName + ' · session ' + d.session), span('v', d.model + ' / ' + d.effort + ' · ' + d.minutes + ' minutes'), span('s', line3 + ' · ' + d.nv + ' not verified')];
    if (d.url) { var a = document.createElement('a'); a.href = d.url; a.textContent = 'Open the pull request'; nodes.push(a); }
    show(nodes);
  }
  segs.forEach(function (e, i) { e.addEventListener('pointerenter', function () { select(i); }); e.addEventListener('click', function () { select(i); }); });
  svg.addEventListener('pointerleave', function () { if (document.activeElement !== svg) select(-1); });
  svg.addEventListener('keydown', function (e) {
    var n = segs.length, i = current;
    if (!n) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else if (e.key === 'Escape') i = -1;
    else return;
    e.preventDefault(); select(i);
  });
  svg.addEventListener('blur', function () { select(-1); });

  // Claims (REQ-059). Each claim phrase in the introduction links to its statistic. Pointing at or focusing one lights the
  // arcs that support it and nothing else: the readout keeps its resting text, so no text appears only on hover.
  var CLAIMS = {
    sessions: { pick: function () { return true; } },
    agent: { pick: function () { return true; }, tint: true },
    evidence: { pick: function (d) { return Number(d.nv) > 0; } },
    merged: { pick: function (d) { return d.state === 'merged'; } }
  };
  function claim(name) {
    var c = CLAIMS[name];
    if (!c) return;
    select(-1);
    svg.setAttribute('data-hl', name);
    if (c.tint) svg.classList.add('tint');
    segs.forEach(function (e) { if (c.pick(e.dataset)) e.classList.add('on'); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-probe]'), function (a) {
    var on = function () { claim(a.getAttribute('data-probe')); }, off = function () { select(-1); };
    a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
    a.addEventListener('pointerleave', off); a.addEventListener('blur', off);
  });

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btn = document.querySelector('[data-motion]');
  if (btn && !still) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var p = svg.classList.toggle('paused');
      btn.textContent = p ? 'Resume motion' : 'Pause motion';
      btn.setAttribute('aria-pressed', String(p));
    });
  }
  if (!still && window.matchMedia('(hover: hover)').matches) {
    var wrap = svg.closest('.mark-wrap') || svg;
    wrap.addEventListener('pointermove', function (e) {
      var b = svg.getBoundingClientRect();
      var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      svg.style.transform = 'perspective(900px) rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 7).toFixed(2) + 'deg)';
    });
    wrap.addEventListener('pointerleave', function () { svg.style.transform = ''; });
  }
})();
