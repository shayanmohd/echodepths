// Reviewer: measured contrast. For each visible text element the text is made transparent, the screen is captured,
// the real background under the element's box is read back (mean and the 95th percentile luminance), and the ratio is
// computed against the computed text colour composited through every ancestor opacity. WCAG AA: 4.5 (3.0 at 18px+/14px bold).
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const fail = m => { throw new Error(m); };
  const seedSave = pal => page.evaluate(p => { localStorage.setItem('echodepths.save.v1', JSON.stringify({ v: 1, otoliths: 20, evolutions: ['lateral'], settings: { palette: p, haptics: true, hapticStrength: 1, audio: true, ambience: 0.7, eyesClosed: false, calm: false }, stats: { runs: 3, maxDepth: 1210, shouts: 2, silentClears: 1, tutorialDone: true, deaths: { 'a bristlemaw': 2 } }, daily: {} })); }, pal);
  const worst = [];
  const measure = async (name) => {
    // 1. collect text elements and their boxes / colours / effective alpha
    const els = await page.evaluate(() => {
      const out = []; let i = 0;
      const sel = 'h1, h2, h3, p, small, b, span, button, .cost, #depth, #biome, #hint, #float, .statgrid small, .statgrid b, .illo text, .evo small';
      for (const el of document.querySelectorAll(sel)) {
        if (el.closest('[hidden]') || el.hidden || el.closest('#hud') && document.getElementById('hud').hidden) continue;
        if (el.closest('svg') && !el.closest('.illo')) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
        const rr = el.getBoundingClientRect(); if (rr.width < 4 || rr.height < 4) continue;
        // clip to every scroll ancestor: what a scrolling container has clipped away is not on screen
        const r = { left: rr.left, top: rr.top, right: rr.right, bottom: rr.bottom };
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll' || o === 'hidden') { const pr = p.getBoundingClientRect(); r.top = Math.max(r.top, pr.top); r.bottom = Math.min(r.bottom, pr.bottom); } }
        if (r.bottom - r.top < 4 || r.bottom < 0 || r.top > innerHeight) continue;
        let a = 1; for (let p = el; p; p = p.parentElement) { a *= parseFloat(getComputedStyle(p).opacity); }
        // rgb(a)(...) or, for a color-mix() result, color(srgb r g b [/ a]) with 0..1 channels
        const raw = el.closest('svg') ? cs.fill : cs.color; let m = raw.match(/[\d.]+/g).map(Number);
        if (/^color\(srgb/.test(raw)) m = m.map((v, k) => k < 3 ? v * 255 : v);
        if (m.length === 4) a *= m[3];
        const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
        el.dataset.ct = String(i);
        out.push({ i: i++, label: (el.id || el.className && String(el.className).split(' ')[0] || el.tagName.toLowerCase()) + ':' + (el.textContent.trim().slice(0, 22)), box: [Math.max(0, r.left), Math.max(0, r.top), Math.min(innerWidth, r.right), Math.min(innerHeight, r.bottom)], rgb: m.slice(0, 3), a, fs, fw, large: fs >= 24 || (fs >= 18.66 && fw >= 700) });
      }
      return out;
    });
    // 2. hide the text, capture, restore
    await page.evaluate(() => { const st = document.createElement('style'); st.id = 'ct-hide'; st.textContent = '[data-ct], [data-ct] * { color: transparent !important; fill: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; } svg.ic { visibility: hidden !important; }'; document.head.appendChild(st); });
    await wait(120);
    const b64 = await page.screenshot({ encoding: 'base64' });
    await page.evaluate(() => { document.getElementById('ct-hide').remove(); document.querySelectorAll('[data-ct]').forEach(e => delete e.dataset.ct); });
    // 3. read the background under each box
    const res = await page.evaluate(async (b64, els, dpr) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return els.map(e => {
        const [x0, y0, x1, y1] = e.box.map(v => Math.round(v * dpr)); const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
        const d = x.getImageData(x0, y0, w, h).data; let sr = 0, sg = 0, sb = 0, n = 0; const ls = [];
        for (let i = 0; i < d.length; i += 4 * 3) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; ls.push(lum([d[i], d[i + 1], d[i + 2]])); }
        const bg = [sr / n, sg / n, sb / n]; ls.sort((a, b) => a - b); const p95 = ls[Math.floor(ls.length * 0.95)] || 0;
        const fg = e.rgb.map((v, k) => e.a * v + (1 - e.a) * bg[k]); const lf = lum(fg);
        return { label: e.label, fs: e.fs, large: e.large, fg: fg.map(Math.round), bg: bg.map(Math.round), mean: ratio(lf, lum(bg)), p95: ratio(lf, p95) };
      });
    }, b64, els, 2);
    for (const r of res) {
      const need = r.large ? 3 : 4.5; const ok = r.mean >= need; const soft = r.p95 >= need;
      log(name.padEnd(14), (ok ? 'ok  ' : 'FAIL'), r.mean.toFixed(2).padStart(6), (soft ? '' : '(p95 ' + r.p95.toFixed(2) + ')').padEnd(11), String(r.fs) + 'px', r.label);
      if (!ok) worst.push(name + ' ' + r.label + ' ' + r.mean.toFixed(2));
    }
  };
  for (const pal of ['ice', 'green', 'amber']) {
    await page.evaluate(() => localStorage.clear()); await seedSave(pal); await page.reload({ waitUntil: 'networkidle0' }); await wait(1600);
    await measure(pal + ' title');
    if (pal === 'ice') {
      await click('[data-go="daily"]'); await wait(700); await measure('daily');
      await click('#daily [data-go="title"]'); await wait(200);
    }
    await click('[data-go="grotto"]'); await wait(900); await measure(pal + ' grotto');
    await page.evaluate(() => { document.querySelector('#grotto .stack').scrollTop = 99999; }); await wait(400); await measure(pal + ' grotto-b');
    await click('#grotto [data-go="title"]'); await wait(200);
    await click('[data-go="options"]'); await wait(800); await measure(pal + ' options');
    await page.evaluate(() => { document.querySelector('#options .stack').scrollTop = 99999; }); await wait(400); await measure(pal + ' options-b');
    await click('#opt-reset'); await wait(100); await measure(pal + ' erase-armed');
    await click('#options [data-go="title"]'); await wait(200);
    await click('[data-go="dive"]'); await wait(1300);
    await page.evaluate(() => { document.getElementById('hint').textContent = 'find the sink. it hums.'; document.getElementById('hint').classList.remove('hide'); document.getElementById('float').textContent = '+1 otolith'; document.getElementById('float').classList.add('show'); });
    await page.touchscreen.touchStart(195, 520); await wait(1100); await page.touchscreen.touchEnd(); await wait(400); await measure(pal + ' hud');
    await page.evaluate(() => Game.pause()); await wait(700); await measure(pal + ' pause');
    await click('#pm-surface'); await wait(100); await measure(pal + ' pause-armed');
    await click('#pm-resume'); await wait(200);
    await page.evaluate(() => Game.debug.hurt(9, 'the warden')); await wait(2600); await measure(pal + ' death');
    await click('#d-surface'); await wait(300);
  }
  if (worst.length) fail('below AA (mean background): ' + worst.join(' | '));
  log('errors:', errors.length);
};
