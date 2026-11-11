/* Land Units: the converter, the plot area calculator and "recent" on the home page. All sums run in the browser. */
(function () {
  'use strict';
  var d = document, $ = function (id) { return d.getElementById(id); };
  var dataEl = $('lu-data'); if (!dataEl) return;
  var U = JSON.parse(dataEl.textContent);   // id -> [name, plural, square feet, group]
  var esc = function (s) { return SYG.esc(s); };

  function fmt(x) {
    if (!isFinite(x)) return '';
    if (x === 0) return '0';
    var ax = Math.abs(x), s = ax >= 1000 ? x.toFixed(2) : ax >= 1 ? x.toFixed(4) : x.toPrecision(6);
    if (s.indexOf('e') > -1) s = x.toFixed(10);
    if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var p = s.split('.'), w = p[0].replace('-', ''), neg = x < 0 ? '-' : '';
    if (w.length > 3) w = w.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + w.slice(-3);
    return neg + w + (p[1] ? '.' + p[1] : '');
  }
  function sqft(id) { return id === 'own' ? ownSize() : U[id][2]; }
  function name(id, n) { return id === 'own' ? (ownName() || 'my local unit') : (n === 1 ? U[id][0] : U[id][1]); }
  function ownSize() {
    var v = parseFloat(($('lu-own-v') || {}).value), u = ($('lu-own-u') || {}).value || 'sqft';
    return v > 0 ? v * U[u][2] : NaN;
  }
  function ownName() { return (($('lu-own-n') || {}).value || '').trim(); }
  /* 2 kanal 7 marla style: big unit, small unit, how many small in a big */
  var MIX = { kanal: ['kanal', 'marla', 20], marla: ['kanal', 'marla', 20], killa: ['kanal', 'marla', 20], guntha: ['acre', 'guntha', 40], cent: ['acre', 'cent', 100],
    'katha-assam': ['bigha-assam', 'lessa', 100], lessa: ['bigha-assam', 'lessa', 100], 'bigha-assam': ['bigha-assam', 'lessa', 100], nali: ['nali', 'mutthi', 16], mutthi: ['nali', 'mutthi', 16] };

  /* ---------- converter ---------- */
  var val = $('lu-v');
  if (val) {
    var from = $('lu-from'), to = $('lu-to'), out = $('lu-out'), own = $('lu-own'), rec = $('lu-recent');
    var run = function (save) {
      own.hidden = from.value !== 'own' && to.value !== 'own';
      var v = parseFloat(String(val.value).replace(/,/g, '')), a = sqft(from.value), b = sqft(to.value);
      if (!(v >= 0) || val.value === '') { out.hidden = true; return; }
      if (!(a > 0) || !(b > 0)) { out.hidden = false; out.innerHTML = '<p>Type the size of your local unit above, for example how many square feet or square yards make one bigha in your village.</p>'; return; }
      var area = v * a, r = area / b;
      var line = fmt(v) + ' ' + name(from.value, v) + ' = ' + fmt(r) + ' ' + name(to.value, r);
      var also = ['sqft', 'sqyd', 'sqm', 'acre', 'hectare'].filter(function (k) { return k !== to.value && k !== from.value; })
        .map(function (k) { return '<dt>' + esc(U[k][1]) + '</dt><dd>' + fmt(area / U[k][2]) + '</dd>'; }).join('');
      var mix = MIX[to.value] || MIX[from.value], mixed = '';
      if (mix) {
        var small = Math.round(area / U[mix[1]][2] * 100) / 100, big = Math.floor(small / mix[2] + 1e-9), rest = Math.round((small - big * mix[2]) * 100) / 100;
        if (mix[0] === 'bigha-assam' && small >= 20) {
          var kt = Math.floor(rest / 20 + 1e-9), ls = Math.round((rest - kt * 20) * 100) / 100;
          mixed = '<p class="lu-mixed">Written the usual way: <b>' + [big ? fmt(big) + ' bigha' : '', kt ? kt + ' katha' : '', ls ? fmt(ls) + ' lessa' : ''].filter(Boolean).join(' ') + '</b></p>';
        } else if (big > 0 && rest > 0) mixed = '<p class="lu-mixed">Written the usual way: <b>' + fmt(big) + ' ' + esc(U[mix[0]][big === 1 ? 0 : 1].replace(/ \(.*/, '')) + ' ' + fmt(rest) + ' ' + esc(U[mix[1]][1].replace(/ \(.*/, '')) + '</b></p>';
      }
      var src = from.value === 'own' || to.value === 'own' ? 'Uses the size you typed for your local unit' : 'Sizes are from official tables (<a href="/about/">sources</a>)';
      out.hidden = false;
      out.innerHTML = '<h2>Result</h2><p class="big">' + esc(fmt(r)) + ' <small>' + esc(name(to.value, r)) + '</small></p><p>' + esc(line) + '</p>' + mixed +
        '<dl class="facts">' + also + '</dl><div class="acts"><button class="btn sm" type="button" data-copy="' + esc(line) + '">Copy</button>' +
        '<button class="btn sm ghost" type="button" data-wa="' + esc(line + ' (land.shareyourgroup.com)') + '">WhatsApp</button></div><p class="hint">' + src + '. For a sale or a loan, go by the area in your own revenue record.</p>';
      if (save && from.value !== 'own' && to.value !== 'own' && v > 0) {
        SYG.recent('land-recent', { u: '?v=' + v + '&from=' + from.value + '&to=' + to.value, t: line });
        showRecent();
      }
    };
    var showRecent = function () {
      var list = SYG.recent('land-recent');
      if (!list.length) { rec.hidden = true; return; }
      rec.hidden = false;
      rec.innerHTML = '<b>Your recent conversions</b> ' + list.map(function (x) { return '<a href="/' + esc(x.u) + '">' + esc(x.t) + '</a>'; }).join('');
    };
    var t;
    [val, from, to, $('lu-own-v'), $('lu-own-u'), $('lu-own-n')].forEach(function (e) {
      e.addEventListener('input', function () { run(false); clearTimeout(t); t = setTimeout(function () { run(true); }, 1500); });
      e.addEventListener('change', function () { run(true); });
    });
    $('lu-swap').addEventListener('click', function () { var x = from.value; from.value = to.value; to.value = x; run(true); });
    var P = new URLSearchParams(location.search);
    if (P.get('from') && (U[P.get('from')] || P.get('from') === 'own')) from.value = P.get('from');
    if (P.get('to') && (U[P.get('to')] || P.get('to') === 'own')) to.value = P.get('to');
    if (P.get('v')) val.value = P.get('v');
    run(false); showRecent();
  }

  /* ---------- plot area ---------- */
  var shape = $('pa-shape');
  if (shape) {
    var unit = $('pa-unit'), pout = $('pa-out'), LEN = { ft: 1, m: 3.280839895, yd: 3, karam: 5.5 };
    var g = function (id) { var v = parseFloat($(id).value); return v > 0 ? v * LEN[unit.value] : NaN; };
    var tri = function (a, b, c) { var s = (a + b + c) / 2, q = s * (s - a) * (s - b) * (s - c); return q > 0 ? Math.sqrt(q) : NaN; };
    var prun = function () {
      [].forEach.call(d.querySelectorAll('[data-pa]'), function (e) { e.hidden = e.getAttribute('data-pa').indexOf(shape.value) < 0; });
      var area, why = '';
      if (shape.value === 'rect') area = g('pa-l') * g('pa-b');
      else if (shape.value === 'tri') { area = tri(g('pa-a'), g('pa-b2'), g('pa-c')); if (isNaN(area) && g('pa-a') && g('pa-b2') && g('pa-c')) why = 'These three sides cannot make a triangle. The two shorter sides together must be longer than the longest side.'; }
      else { var dg = g('pa-d'); area = tri(g('pa-s1'), g('pa-s2'), dg) + tri(g('pa-s3'), g('pa-s4'), dg); if (isNaN(area) && g('pa-s1') && g('pa-s2') && g('pa-s3') && g('pa-s4') && dg) why = 'These sides and this diagonal do not fit together. Measure the diagonal again.'; }
      if (!(area > 0)) { pout.hidden = !why; pout.innerHTML = why ? '<p>' + why + '</p>' : ''; return; }
      var rows = ['sqft', 'sqyd', 'sqm', 'marla', 'guntha', 'cent', 'acre', 'hectare'].map(function (k) { return '<dt>' + esc(U[k][1]) + '</dt><dd>' + fmt(area / U[k][2]) + '</dd>'; }).join('');
      var line = 'Plot area: ' + fmt(area) + ' square feet = ' + fmt(area / 9) + ' square yards (gaj) = ' + fmt(area / U.sqm[2]) + ' square metres';
      pout.hidden = false;
      pout.innerHTML = '<h2>Area of the plot</h2><p class="big">' + fmt(area) + ' <small>square feet</small></p><dl class="facts">' + rows + '</dl>' +
        '<div class="acts"><a class="btn sm" href="/?v=' + (Math.round(area * 100) / 100) + '&amp;from=sqft&amp;to=sqyd">Convert to other units</a><button class="btn sm ghost" type="button" data-copy="' + esc(line) + '">Copy</button></div>';
    };
    [].forEach.call(d.querySelectorAll('#pa-box input, #pa-box select'), function (e) { e.addEventListener('input', prun); e.addEventListener('change', prun); });
    prun();
  }

  /* ---------- filter a list (units, tables) ---------- */
  var q = $('lu-q');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), n = 0;
    [].forEach.call(d.querySelectorAll('[data-lu]'), function (c) { var hit = !v || c.getAttribute('data-lu').indexOf(v) > -1; c.hidden = !hit; if (hit) n++; });
    if ($('lu-none')) $('lu-none').hidden = n > 0;
  });
})();
