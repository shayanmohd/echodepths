// Reviewer: --sat 48px / --sab 34px on every screen and state. Nothing interactive or textual may sit under a bar.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const fail = m => { throw new Error(m); };
  const setInsets = () => page.evaluate(() => { document.documentElement.style.setProperty('--sat', '48px'); document.documentElement.style.setProperty('--sab', '34px'); });
  await page.evaluateOnNewDocument(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.setProperty('--sat', '48px'); document.documentElement.style.setProperty('--sab', '34px'); }); });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('echodepths.save.v1', JSON.stringify({ v: 1, otoliths: 33, evolutions: ['vocal'], settings: { palette: 'ice', haptics: true, hapticStrength: 1, audio: true, ambience: 0.7, eyesClosed: false, calm: false }, stats: { runs: 3, maxDepth: 1210, shouts: 2, silentClears: 1, tutorialDone: true, deaths: { 'a bristlemaw': 2, 'you surfaced': 1 } }, daily: {} })); });
  await page.reload({ waitUntil: 'networkidle0' }); await setInsets(); await wait(900);
  const bad = [];
  const check = async (name) => {
    const out = await page.evaluate(() => {
      const res = [];
      const els = document.querySelectorAll('button, h1, h2, h3, p, small, b, span, input, #depth, #biome, #hp, #hint, #float, .card, .statgrid div, svg.illo, svg.mark');
      for (const el of els) {
        if (el.closest('[hidden]') || el.hidden) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (el.closest('#hud') && document.getElementById('hud').hidden) continue;
        let r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        if (!(el.textContent || '').trim() && !/^(BUTTON|INPUT|svg)$/i.test(el.tagName) && el.id !== 'hp') continue;
        let top = r.top, bottom = r.bottom;
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll' || o === 'hidden') { const pr = p.getBoundingClientRect(); top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); } }
        if (bottom - top < 2) continue;
        if (top < 48 || bottom > 844 - 34) res.push((el.id || el.className || el.tagName) + ':' + Math.round(top) + '-' + Math.round(bottom));
      }
      return res;
    });
    log(name, '->', out.length ? out.join(' ') : 'clear');
    bad.push(...out.map(x => name + ' ' + x));
  };
  await shot('r40-title'); await check('title');
  await click('[data-go="daily"]'); await wait(500); await shot('r41-daily'); await check('daily');
  await click('#daily [data-go="title"]'); await wait(200);
  await click('[data-go="grotto"]'); await wait(600); await shot('r42-grotto-top'); await check('grotto');
  await page.evaluate(() => { document.querySelector('#grotto .stack').scrollTop = 99999; }); await wait(300); await shot('r43-grotto-bottom'); await check('grotto-bottom');
  await click('#grotto [data-go="title"]'); await wait(200);
  await click('[data-go="options"]'); await wait(500); await shot('r44-options-top'); await check('options');
  await page.evaluate(() => { document.querySelector('#options .stack').scrollTop = 99999; }); await wait(300); await shot('r45-options-bottom'); await check('options-bottom');
  await click('#options [data-go="title"]'); await wait(200);
  // run HUD, with a hint and a float visible
  await click('[data-go="dive"]'); await wait(1200);
  await page.evaluate(() => { document.getElementById('hint').textContent = 'find the sink. it hums.'; document.getElementById('hint').classList.remove('hide'); document.getElementById('float').textContent = '+1 otolith'; document.getElementById('float').classList.add('show'); });
  await page.touchscreen.touchStart(195, 520); await wait(1100); await page.touchscreen.touchEnd(); await wait(500);
  await shot('r46-run'); await check('run');
  await page.evaluate(() => Game.pause()); await wait(400); await shot('r47-pause'); await check('pause');
  await click('#pm-resume'); await wait(200);
  await page.evaluate(() => Game.debug.hurt(9, 'the warden')); await wait(2400); await shot('r48-death'); await check('death');
  await click('#d-surface'); await wait(400);
  // daily done state
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('echodepths.save.v1')); const t = new Date(); const k = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); d.daily[k] = { depth: 1187, chambers: 5, shouts: 2, calm: false }; localStorage.setItem('echodepths.save.v1', JSON.stringify(d)); });
  await page.reload({ waitUntil: 'networkidle0' }); await setInsets(); await wait(700);
  await click('[data-go="daily"]'); await wait(500); await shot('r49-daily-done'); await check('daily-done');
  // a short screen: 390x700 (small phones with big bars)
  await page.setViewport({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await wait(400); await setInsets(); await wait(300);
  await click('#daily [data-go="title"]'); await wait(700); await shot('r50-title-700');
  const t700 = await page.evaluate(() => { const r = document.querySelector('#title .stack').getBoundingClientRect(); const w = document.querySelector('#title .wordmark').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), wmTop: Math.round(w.top) }; });
  log('700px title stack:', JSON.stringify(t700)); if (t700.top < 48 || t700.bottom > 700 - 34) bad.push('title-700 stack ' + t700.top + '-' + t700.bottom);
  await click('[data-go="grotto"]'); await wait(600); await shot('r51-grotto-700');
  const g700 = await page.evaluate(() => { const r = document.querySelector('#grotto .stack').getBoundingClientRect(); return Math.round(r.top) + '-' + Math.round(r.bottom); }); log('700px grotto box:', g700);
  if (+g700.split('-')[0] < 48 || +g700.split('-')[1] > 666) bad.push('grotto-700 box ' + g700);
  if (bad.length) fail('under a bar: ' + bad.join(' | '));
  log('errors:', errors.length);
};
