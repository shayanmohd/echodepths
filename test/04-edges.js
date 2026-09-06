// Edge cases: safe areas on every screen, double taps, erase-save arming, abandon confirm, eyes closed, keyboard.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => { localStorage.clear(); document.documentElement.style.setProperty('--sat', '48px'); document.documentElement.style.setProperty('--sab', '34px'); });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(200);
  await page.evaluate(() => { document.documentElement.style.setProperty('--sat', '48px'); document.documentElement.style.setProperty('--sab', '34px'); const d = JSON.parse(localStorage.getItem('echodepths.save.v1') || '{}'); d.otoliths = 33; d.stats = Object.assign({ runs: 3, maxDepth: 1210, shouts: 2, silentClears: 1, tutorialDone: true, deaths: {} }, d.stats || {}, { runs: 3, maxDepth: 1210, tutorialDone: true }); d.v = 1; d.evolutions = ['vocal']; d.settings = d.settings || {}; d.daily = {}; localStorage.setItem('echodepths.save.v1', JSON.stringify(d)); });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(200);
  await page.evaluate(() => { document.documentElement.style.setProperty('--sat', '48px'); document.documentElement.style.setProperty('--sab', '34px'); });
  await wait(800); await shot('e01-title-insets');
  // overlap check helper: nothing visible above 48px or below 844-34. What a scrolling container has clipped away is not on screen,
  // so each element's box is first cut down to its scroll ancestors' boxes.
  const check = async name => {
    const bad = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button, h1, h2, #depth, #biome, #hp, #hint, .stack > *')) {
        if (el.closest('[hidden]') || el.hidden) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        let top = r.top, bottom = r.bottom;
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll' || o === 'hidden') { const pr = p.getBoundingClientRect(); top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); } }
        if (bottom - top < 2) continue;
        if (top < 48 || bottom > 844 - 34) out.push((el.id || el.className || el.tagName) + ':' + Math.round(top) + '-' + Math.round(bottom));
      }
      return out;
    });
    log(name, 'under a bar:', bad.length ? bad.join(' ') : 'none');
    return bad;
  };
  const overlaps = [];
  overlaps.push(...await check('title'));
  await click('[data-go="daily"]'); await wait(500); await shot('e02-daily-insets'); overlaps.push(...await check('daily'));
  await click('#daily [data-go="title"]'); await wait(200);
  await click('[data-go="grotto"]'); await wait(500); await shot('e03-grotto-insets'); overlaps.push(...await check('grotto'));
  const box = await page.evaluate(() => { const r = document.querySelector('#grotto .stack').getBoundingClientRect(); return Math.round(r.top) + '-' + Math.round(r.bottom); });
  log('grotto scroll box:', box); if (+box.split('-')[0] < 48 || +box.split('-')[1] > 810) throw new Error('grotto scroll box crosses a bar: ' + box);
  await page.evaluate(() => { const s = document.querySelector('#grotto .stack'); s.scrollTop = 9999; }); await wait(300); await shot('e04-grotto-scrolled'); overlaps.push(...await check('grotto-bottom'));
  await click('#grotto [data-go="title"]'); await wait(200);
  await click('[data-go="options"]'); await wait(500); await shot('e05-options-insets'); overlaps.push(...await check('options'));
  await page.evaluate(() => { const s = document.querySelector('#options .stack'); s.scrollTop = 9999; }); await wait(300); await shot('e06-options-scrolled'); overlaps.push(...await check('options-bottom'));
  // erase save: arm, leave, come back -> must be disarmed
  await click('#opt-reset'); await wait(200); log('reset armed text:', await text('#opt-reset'));
  await click('#options [data-go="title"]'); await wait(200); await click('[data-go="options"]'); await wait(300);
  log('reset text after leaving and returning:', await text('#opt-reset'));
  // eyes closed
  await page.evaluate(() => document.querySelector('#opt-eyes [data-v="1"]').click()); await wait(200);
  await click('#options [data-go="title"]'); await wait(200);
  await click('[data-go="dive"]'); await wait(1200); await shot('e07-run-eyes-closed');
  await page.touchscreen.tap(195, 520); await wait(400);
  log('eyes closed canvas hidden:', await page.evaluate(() => getComputedStyle(document.getElementById('c')).visibility));
  await page.evaluate(() => Game.pause()); await wait(200); await click('#pm-surface'); await wait(200);
  log('after first surface tap, state:', await page.evaluate(() => Game.state()), 'surface btn:', await text('#pm-surface'));
  await click('#pm-surface'); await wait(2400); await shot('e08-death-insets'); overlaps.push(...await check('death'));
  await click('#d-surface'); await wait(400);
  await click('[data-go="options"]'); await wait(300); await page.evaluate(() => document.querySelector('#opt-eyes [data-v="0"]').click()); await wait(100); await click('#options [data-go="title"]'); await wait(200);
  // run HUD with insets
  await click('[data-go="dive"]'); await wait(1200);
  await page.touchscreen.touchStart(195, 520); await wait(1100); await page.touchscreen.touchEnd(); await wait(500);
  await shot('e09-run-insets'); overlaps.push(...await check('run'));
  await page.evaluate(() => Game.pause()); await wait(300); await shot('e10-pause-insets'); overlaps.push(...await check('pause'));
  await click('#pm-resume'); await wait(200);
  // double tap dive/pause quickly, keyboard ping, then rapid screen rotation through menus
  await click('#pause'); await click('#pm-resume'); await click('#pause'); await wait(200); log('after rapid pause taps:', await page.evaluate(() => Game.state()));
  await click('#pm-resume'); await wait(200);
  await page.keyboard.down('Space'); await wait(100); await page.keyboard.up('Space'); await wait(300);
  log('pings logged:', await page.evaluate(() => Game.run().pingLog.length));
  await page.evaluate(() => Game.pause()); await click('#pm-surface'); await click('#pm-surface'); await wait(2400); await click('#d-surface'); await wait(300);
  for (let i = 0; i < 3; i++) { await click('[data-go="daily"]'); await click('#daily [data-go="title"]'); await click('[data-go="grotto"]'); await click('#grotto [data-go="title"]'); await click('[data-go="options"]'); await click('#options [data-go="title"]'); }
  await wait(400); await shot('e11-title-after-churn');
  // double tap dive
  await page.evaluate(() => { const b = document.querySelector('[data-go="dive"]'); b.click(); b.click(); }); await wait(1200);
  log('state after double dive:', await page.evaluate(() => Game.state()), 'runs still one:', await page.evaluate(() => !!Game.run()));
  await page.evaluate(() => Game.pause()); await click('#pm-surface'); await click('#pm-surface'); await wait(2400); await click('#d-surface'); await wait(300);
  // erase save really erases
  await click('[data-go="options"]'); await wait(300); await click('#opt-reset'); await wait(100); await click('#opt-reset'); await wait(1500);
  log('after erase:', await text('#title-stats'));
  if (overlaps.length) throw new Error('elements under bars: ' + overlaps.join(' '));
  log('errors:', errors.length);
};
