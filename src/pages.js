// Path pages: animated starfield, menu, the arrival cut and the cut back into the universe.
const c = document.getElementById('stars');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (c) {
  const g = c.getContext('2d');
  let W, H, stars = [];
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const resize = () => {
    W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 2600) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), t: Math.random() * 6 }));
  };
  resize(); addEventListener('resize', resize);
  let mx = 0, my = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  (function loop(t) {
    g.clearRect(0, 0, W, H);
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t / 900 + s.t * 7);
      const x = (s.x + mx * 30 * s.z * dpr + W) % W, y = (s.y - (reduce ? 0 : t * 0.006 * s.z * dpr) + my * 20 * s.z * dpr + H * 10) % H;
      g.fillStyle = s.z > 0.92 ? `rgba(160,255,220,${tw})` : `rgba(200,220,255,${tw * (0.25 + s.z * 0.6)})`;
      const r = (0.4 + s.z * 1.3) * dpr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    requestAnimationFrame(loop);
  })(0);
}
const burger = document.getElementById('burger'), menu = document.getElementById('menu');
if (burger && menu) burger.addEventListener('click', () => { const o = menu.hidden; menu.hidden = !o; burger.setAttribute('aria-expanded', String(o)); });

// the cut: arriving opens the frame, leaving slices it shut
const cut = document.getElementById('cut');
if (cut) {
  const label = cut.querySelector('.cut-label');
  if (!reduce) { cut.classList.add('open'); setTimeout(() => cut.classList.remove('open'), 1700); }
  if (location.hash === '#arrive') history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('a[data-cut]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || reduce) return;
    e.preventDefault();
    if (menu) menu.hidden = true;
    label.textContent = a.dataset.cut || '';
    cut.classList.remove('open'); void cut.offsetWidth; cut.classList.add('go');
    setTimeout(() => { location.href = a.href; }, 1250);
  }));
  addEventListener('pageshow', (e) => { if (e.persisted) cut.classList.remove('go'); });
}
