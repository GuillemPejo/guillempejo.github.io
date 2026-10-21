/* GlobeDrop · landing. Sin dependencias.
   Globo: proyección ortográfica en <canvas> con la tierra de Natural Earth 1:50m (dominio público) simplificada en land.js. */
(function () {
  'use strict';
  var D = document, H = D.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  function reduced() { return mqReduce.matches; }
  function dark() { var t = H.getAttribute('data-theme'); return t ? t === 'dark' : mqDark.matches; }
  function lang() { return H.getAttribute('data-lang') === 'es' ? 'es' : 'en'; }
  var RAD = Math.PI / 180;

  /* ---------- Idioma ---------- */
  var titles = { es: 'GlobeDrop · Suelta la chincheta, adivina el lugar', en: 'GlobeDrop · Drop the pin, guess the place' };
  function markLang(l) {
    D.querySelectorAll('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === l ? 'true' : 'false'); });
  }
  function setLang(l) {
    H.setAttribute('data-lang', l); H.lang = l; D.title = titles[l]; markLang(l);
    try { localStorage.setItem('globedrop-lang', l); } catch (e) {}
    if (globe) globe.relabel();
  }
  D.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang')); });
  });
  D.title = titles[lang()]; markLang(lang());

  /* ---------- Aparición escalonada al hacer scroll ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  D.querySelectorAll('.rv,.stamp-in:not(.pass__stamp)').forEach(function (el) { if (io) io.observe(el); else el.classList.add('in'); });

  /* ---------- Tierra ---------- */
  var RINGS = [];
  (function decode() {
    var src = window.GD_LAND || [];
    for (var r = 0; r < src.length; r++) {
      var d = src[r], n = d.length / 2, a = new Float32Array(n * 3), x = 0, y = 0;
      for (var i = 0; i < n; i++) {
        x += d[2 * i]; y += d[2 * i + 1];
        var lam = x / 10 * RAD, phi = y / 10 * RAD;
        a[3 * i] = lam; a[3 * i + 1] = Math.cos(phi); a[3 * i + 2] = Math.sin(phi);
      }
      RINGS.push(a);
    }
  })();

  var PAL = {
    light: { o1: '#4A9BE8', o2: '#1E5DAF', land: '#F6DDA9', coast: '#D6A85E', grid: 'rgba(255,255,255,.17)' },
    dark: { o1: '#3584D1', o2: '#173F7C', land: '#E9CF98', coast: '#C0924C', grid: 'rgba(255,255,255,.13)' }
  };

  // Dibuja el globo en un contexto de S×S píxeles con el centro de la vista en (lam0, phi0) grados.
  function drawGlobe(ctx, S, lam0d, phi0d, isDark) {
    var p = isDark ? PAL.dark : PAL.light;
    var R = S / 2 - 0.5, c = S / 2;
    var lam0 = lam0d * RAD, sp0 = Math.sin(phi0d * RAD), cp0 = Math.cos(phi0d * RAD);
    ctx.clearRect(0, 0, S, S);
    var g = ctx.createRadialGradient(c - R * 0.38, c - R * 0.42, R * 0.04, c, c, R * 1.02);
    g.addColorStop(0, p.o1); g.addColorStop(1, p.o2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R, 0, 2 * Math.PI); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, R, 0, 2 * Math.PI); ctx.clip();

    // Retícula cada 30°
    ctx.strokeStyle = p.grid; ctx.lineWidth = Math.max(1, S / 520); ctx.beginPath();
    var lo, la, pen, cl, sl, cf, sf, x, y, z;
    for (lo = -180; lo < 180; lo += 30) {
      pen = false; cl = Math.cos(lo * RAD - lam0); sl = Math.sin(lo * RAD - lam0);
      for (la = -90; la <= 90; la += 4) {
        cf = Math.cos(la * RAD); sf = Math.sin(la * RAD);
        z = sp0 * sf + cp0 * cf * cl;
        if (z < 0) { pen = false; continue; }
        x = c + R * cf * sl; y = c - R * (cp0 * sf - sp0 * cf * cl);
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true;
      }
    }
    for (la = -60; la <= 60; la += 30) {
      pen = false; cf = Math.cos(la * RAD); sf = Math.sin(la * RAD);
      for (lo = -180; lo <= 180; lo += 4) {
        cl = Math.cos(lo * RAD - lam0); sl = Math.sin(lo * RAD - lam0);
        z = sp0 * sf + cp0 * cf * cl;
        if (z < 0) { pen = false; continue; }
        x = c + R * cf * sl; y = c - R * (cp0 * sf - sp0 * cf * cl);
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true;
      }
    }
    ctx.stroke();

    // Tierra: los puntos de detrás se llevan al borde (recorte aproximado al horizonte)
    ctx.beginPath();
    for (var r = 0; r < RINGS.length; r++) {
      var a = RINGS[r], n = a.length / 3, vis = false, k;
      for (k = 0; k < n; k++) {
        if (sp0 * a[3 * k + 2] + cp0 * a[3 * k + 1] * Math.cos(a[3 * k] - lam0) > 0) { vis = true; break; }
      }
      if (!vis) continue;
      for (k = 0; k < n; k++) {
        var dl = a[3 * k] - lam0, cph = a[3 * k + 1], sph = a[3 * k + 2], cdl = Math.cos(dl);
        x = cph * Math.sin(dl); y = cp0 * sph - sp0 * cph * cdl; z = sp0 * sph + cp0 * cph * cdl;
        if (z < 0) { var h = Math.sqrt(x * x + y * y) || 1; x /= h; y /= h; }
        if (k) ctx.lineTo(c + R * x, c - R * y); else ctx.moveTo(c + R * x, c - R * y);
      }
      ctx.closePath();
    }
    ctx.fillStyle = p.land; ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = p.coast; ctx.lineWidth = Math.max(1, S / 380); ctx.stroke();
    ctx.restore();
  }
  window.GDGlobe = { draw: drawGlobe };

  /* ---------- Globo del hero ---------- */
  var CITIES = [
    { lo: 135.77, la: 35.01, es: 'Kioto', en: 'Kyoto', km: 12 },
    { lo: -77.04, la: -12.05, es: 'Lima', en: 'Lima', km: 86 },
    { lo: 28.98, la: 41.01, es: 'Estambul', en: 'Istanbul', km: 0 },
    { lo: 18.42, la: -33.92, es: 'Ciudad del Cabo', en: 'Cape Town', km: 41 },
    { lo: -21.9, la: 64.15, es: 'Reikiavik', en: 'Reykjavík', km: 158 },
    { lo: -99.13, la: 19.43, es: 'Ciudad de México', en: 'Mexico City', km: 23 },
    { lo: 151.21, la: -33.87, es: 'Sídney', en: 'Sydney', km: 0 },
    { lo: -7.99, la: 31.63, es: 'Marrakech', en: 'Marrakesh', km: 64 },
    { lo: 100.5, la: 13.75, es: 'Bangkok', en: 'Bangkok', km: 0 },
    { lo: -58.38, la: -34.6, es: 'Buenos Aires', en: 'Buenos Aires', km: 17 },
    { lo: -74.0, la: 40.71, es: 'Nueva York', en: 'New York', km: 0 },
    { lo: 12.5, la: 41.9, es: 'Roma', en: 'Rome', km: 9 },
    { lo: 77.21, la: 28.61, es: 'Nueva Delhi', en: 'New Delhi', km: 132 },
    { lo: 36.82, la: -1.29, es: 'Nairobi', en: 'Nairobi', km: 54 },
    { lo: -2.17, la: 41.39, es: 'Barcelona', en: 'Barcelona', km: 0 },
    { lo: 116.4, la: 39.9, es: 'Pekín', en: 'Beijing', km: 210 },
    { lo: -43.2, la: -22.9, es: 'Río de Janeiro', en: 'Rio de Janeiro', km: 31 },
    { lo: 31.24, la: 30.04, es: 'El Cairo', en: 'Cairo', km: 0 },
    { lo: -123.1, la: 49.28, es: 'Vancouver', en: 'Vancouver', km: 77 },
    { lo: 55.27, la: 25.2, es: 'Dubái', en: 'Dubai', km: 19 },
    { lo: -3.7, la: 40.42, es: 'Madrid', en: 'Madrid', km: 0 },
    { lo: 174.76, la: -36.85, es: 'Auckland', en: 'Auckland', km: 95 },
    { lo: 106.85, la: -6.2, es: 'Yakarta', en: 'Jakarta', km: 48 },
    { lo: -70.65, la: -33.45, es: 'Santiago', en: 'Santiago', km: 0 }
  ];
  function fmt(n, l) { var s = String(n); return s.replace(/\B(?=(\d{3})+(?!\d))/g, l === 'es' ? '.' : ','); }

  var globe = null;
  var root = D.getElementById('globe'), cv = D.getElementById('globe-canvas');
  if (root && cv && RINGS.length) globe = (function () {
    var ctx = cv.getContext('2d');
    var pin = D.getElementById('pin'), fx = pin.querySelector('.pin__fx');
    var chip = D.getElementById('gchip'), chipName = chip.querySelector('.gchip__name'), chipKm = chip.querySelector('.gchip__km'), chipTile = chip.querySelector('.tile');
    var size = 0, dpr = 1, lam0 = -18, phi0 = 22, PHI = 22, speed = 6.5, vel = 0;
    var running = false, onScreen = true, raf = 0, last = 0;
    var cur = null, lastIdx = -1, phase = 'idle', t0 = 0;
    var drag = null;

    function resize() {
      var w = cv.getBoundingClientRect().width;
      if (!w) return;
      size = w; dpr = Math.min(2, window.devicePixelRatio || 1);
      var px = Math.round(w * dpr);
      if (cv.width !== px) { cv.width = px; cv.height = px; }
      frame(true);
    }
    function proj(lo, la) {
      var dl = (lo - lam0) * RAD, cf = Math.cos(la * RAD), sf = Math.sin(la * RAD);
      var sp0 = Math.sin(phi0 * RAD), cp0 = Math.cos(phi0 * RAD);
      return { x: cf * Math.sin(dl), y: cp0 * sf - sp0 * cf * Math.cos(dl), z: sp0 * sf + cp0 * cf * Math.cos(dl) };
    }
    function labelCity() {
      if (!cur) return;
      var l = lang();
      chipName.textContent = cur[l];
      chipKm.textContent = cur.km === 0 ? (l === 'es' ? '¡Diana!' : 'Bullseye!') : fmt(cur.km, l) + ' km';
      chipTile.className = 'tile ' + (cur.km < 300 ? 'g' : cur.km < 1500 ? 'y' : 'r');
    }
    function placePin() {
      if (!cur) return;
      var p = proj(cur.lo, cur.la), R = size / 2;
      var X = R + R * p.x, Y = R - R * p.y;
      pin.style.transform = 'translate3d(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px,0)';
      var o = Math.max(0, Math.min(1, (p.z - 0.08) / 0.2));
      pin.style.opacity = o;
      chip.style.transform = 'translate3d(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px,0)';
      chip.classList.toggle('flip', p.x > 0.04);
      chip.style.opacity = o;
      return p;
    }
    function pick() {
      var best = [], i, p;
      for (i = 0; i < CITIES.length; i++) {
        if (i === lastIdx) continue;
        p = proj(CITIES[i].lo, CITIES[i].la);
        if (p.z > 0.62 && p.x > 0.0 && p.x < 0.5 && Math.abs(p.y) < 0.55) best.push(i);
      }
      if (!best.length) return -1;
      return best[Math.floor(Math.random() * best.length)];
    }
    function drop(i) {
      lastIdx = i; cur = CITIES[i]; labelCity(); placePin();
      fx.classList.remove('drop', 'lift'); chip.classList.remove('show');
      void fx.offsetWidth;
      fx.classList.add('drop');
      setTimeout(function () { if (cur === CITIES[i] && phase === 'down') chip.classList.add('show'); }, 620);
      phase = 'down'; t0 = performance.now();
    }
    function lift() { fx.classList.add('lift'); chip.classList.remove('show'); phase = 'lifting'; t0 = performance.now(); }

    function frame(force) {
      if (!size) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawGlobe(ctx, cv.width, lam0, phi0, dark());
      placePin();
    }
    function tick(t) {
      raf = 0;
      if (!running) return;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      if (!drag) {
        lam0 += (speed + vel) * dt; vel *= Math.pow(0.04, dt);
        phi0 += (PHI - phi0) * Math.min(1, dt * 2.5);
      }
      frame();
      var now = performance.now();
      if (phase === 'idle') { var i = pick(); if (i >= 0) drop(i); }
      else if (phase === 'down') {
        var p = proj(cur.lo, cur.la);
        if (now - t0 > 5400 || p.z < 0.3) lift();
      } else if (phase === 'lifting' && now - t0 > 520) { phase = 'idle'; }
      raf = requestAnimationFrame(tick);
    }
    function update() {
      var should = onScreen && !D.hidden && !reduced();
      if (should && !running) { running = true; last = 0; if (!raf) raf = requestAnimationFrame(tick); }
      else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
      if (reduced()) staticView();
    }
    function staticView() {
      lam0 = -10; phi0 = PHI;
      var i = 20; lastIdx = i; cur = CITIES[i]; labelCity();
      fx.classList.remove('lift'); fx.classList.add('drop');
      chip.classList.add('show'); phase = 'down';
      frame(true);
    }

    // Arrastrar para girar (en horizontal; el scroll vertical sigue funcionando en el móvil)
    cv.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, t: performance.now(), v: 0 };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      root.classList.add('grab');
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var R = size / 2 || 1, dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
      var dLam = -dx / R / RAD * 0.9;
      lam0 += dLam; phi0 = Math.max(-25, Math.min(55, phi0 + dy / R / RAD * 0.6));
      var dt = Math.max(1, now - drag.t) / 1000;
      drag.v = drag.v * 0.6 + (dLam / dt) * 0.4;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      if (!running) frame(true);
    });
    function endDrag() {
      if (!drag) return;
      vel = Math.max(-240, Math.min(240, drag.v - speed));
      if (performance.now() - drag.t > 90) vel = 0;
      drag = null; root.classList.remove('grab');
    }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('lostpointercapture', endDrag);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; update(); }).observe(root);
    D.addEventListener('visibilitychange', update);
    mqReduce.addEventListener && mqReduce.addEventListener('change', update);
    mqDark.addEventListener && mqDark.addEventListener('change', function () { frame(true); });
    resize(); update();
    root.classList.add('ready');
    return { relabel: labelCity };
  })();

  /* ---------- Tarjeta de embarque de La Diaria ---------- */
  var pass = D.getElementById('pass');
  if (pass) (function () {
    var stops = pass.querySelectorAll('.stop'), tiles = pass.querySelectorAll('.pass__tiles .tile');
    var carrier = pass.querySelector('.plane__carrier'), stamp = pass.querySelector('.pass__stamp');
    var nums = pass.querySelectorAll('[data-count]');
    var N = stops.length, timers = [], visible = false, playing = false;
    function at(k) { return (2 * k + 1) / (2 * N); }
    function movePlane(p) { carrier.style.transform = 'translate3d(' + ((p - 1) * 100).toFixed(2) + '%,0,0)'; }
    function setCount(f) {
      nums.forEach(function (el) {
        var v = Math.round(+el.getAttribute('data-count') * f);
        el.textContent = fmt(v, el.closest('[data-l]') ? el.closest('[data-l]').getAttribute('data-l') : lang());
      });
    }
    function count() {
      var s = performance.now(), T = 1100;
      (function step(t) {
        var f = Math.min(1, (t - s) / T); f = 1 - Math.pow(1 - f, 3);
        setCount(f); if (f < 1) requestAnimationFrame(step);
      })(s);
    }
    function state(k) {
      for (var i = 0; i < N; i++) {
        stops[i].classList.toggle('done', i < k); stops[i].classList.toggle('cur', i === k);
        tiles[i].classList.toggle('on', i < k);
      }
    }
    function finalState() {
      state(N); movePlane(1); pass.classList.add('landed'); stamp.classList.add('in'); setCount(1);
    }
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function play() {
      clear(); playing = true;
      pass.classList.remove('landed'); stamp.classList.remove('in'); setCount(0);
      state(0); movePlane(at(0));
      var t = 700;
      for (var k = 1; k <= N; k++) (function (k) {
        later(function () { state(k); movePlane(k < N ? at(k) : 1); }, t);
        t += 820;
      })(k);
      later(function () { pass.classList.add('landed'); stamp.classList.add('in'); count(); }, t - 200);
      later(function () { playing = false; if (visible) later(play, 600); }, t + 5200);
    }
    if (reduced() || !('IntersectionObserver' in window)) { finalState(); return; }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !playing) play();
    }, { threshold: 0.45 }).observe(pass);
    state(0); movePlane(at(0)); setCount(0);
  })();
})();
