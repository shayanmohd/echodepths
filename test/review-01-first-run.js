// Reviewer: first run from an empty store, every screen, real data on each, reload and fresh-tab persistence.
// Run with ?debug so Game.debug exists. Fails on any page error.
module.exports = async ({ page, shot, wait, text, click, errors, log, browser }) => {
  const st = () => page.evaluate(() => Game.state());
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#screens .screen')].filter(s => !s.hidden).map(s => s.id).join(',') || '(run)');
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1') || 'null'));
  const fail = m => { throw new Error(m); };
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' }); await wait(1200);

  // ---- title, empty ----
  await shot('r01-title-empty');
  const ts = await text('#title-stats'); log('empty title stats:', ts);
  if (!/no dives yet/.test(ts)) fail('empty state copy missing: ' + ts);
  if (await save() !== null) fail('a save was written before the user did anything');
  log('body class:', await page.evaluate(() => document.body.className));
  if (!/pal-ice/.test(await page.evaluate(() => document.body.className))) fail('new default palette is not cyan');
  if (await page.evaluate(() => document.querySelector('.mark, .mark.small') && !document.querySelector('#pausemenu').hidden)) fail('pause mark visible on title');
  // the signature: the title scene is drawn on the canvas, and it changes over time
  const px = async () => page.evaluate(() => { const c = document.getElementById('c'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 1] > 60) lit++; return lit; });
  const a1 = await px(); await wait(1800); const a2 = await px(); log('lit canvas samples over time:', a1, a2);
  if (a1 === 0 && a2 === 0) fail('title canvas is dark: no sonar scene');

  // ---- daily, empty ----
  await click('[data-go="daily"]'); await wait(700); await shot('r02-daily-empty');
  log('daily:', (await text('#daily')).replace(/\n/g, ' | '));
  if (await page.evaluate(() => document.getElementById('daily-illo').hidden)) fail('daily illustration hidden in the empty state');
  if (await page.evaluate(() => document.getElementById('daily-illo').getBoundingClientRect().height < 40)) fail('daily illustration has no height');
  await click('#daily [data-go="title"]'); await wait(300);

  // ---- grotto, empty (0 otoliths: every card poor) ----
  await click('[data-go="grotto"]'); await wait(800); await shot('r03-grotto-empty');
  log('grotto cards:', await page.evaluate(() => document.querySelectorAll('.evo').length), 'poor:', await page.evaluate(() => document.querySelectorAll('.evo.poor').length));
  if (await page.evaluate(() => document.querySelector('#grotto .illo').getBoundingClientRect().height < 40)) fail('grotto illustration has no height');
  // tap a card you cannot afford: inline message, no dialog
  await page.evaluate(() => document.querySelector('.evo').click()); await wait(150);
  const need = await page.evaluate(() => document.querySelector('.evo .cost').textContent); log('cannot afford ->', need);
  if (!/need \d+ more/.test(need)) fail('no inline need-more message: ' + need);
  await wait(1700); log('after 1.7s ->', await page.evaluate(() => document.querySelector('.evo .cost').textContent));
  await click('#grotto [data-go="title"]'); await wait(300);

  // ---- options, defaults ----
  await click('[data-go="options"]'); await wait(700); await shot('r04-options-defaults');
  const defs = await page.evaluate(() => ({ pal: document.querySelector('#opt-palette .on').dataset.v, hap: document.querySelector('#opt-haptics .on').dataset.v, aud: document.querySelector('#opt-audio .on').dataset.v, eyes: document.querySelector('#opt-eyes .on').dataset.v, calm: document.querySelector('#opt-calm .on').dataset.v, hstr: document.getElementById('opt-hstr').value, amb: document.getElementById('opt-amb').value }));
  log('option defaults:', JSON.stringify(defs));
  if (defs.pal !== 'ice' || defs.hap !== '1' || defs.aud !== '1' || defs.eyes !== '0' || defs.calm !== '0' || defs.hstr !== '1' || defs.amb !== '0.7') fail('option defaults wrong');
  await click('#options [data-go="title"]'); await wait(300);

  // ---- first dive: the tutorial ----
  await click('[data-go="dive"]'); await wait(1400); await shot('r05-tutorial-start');
  log('state:', await st(), 'hint:', await text('#hint'), 'hud hidden:', await page.evaluate(() => document.getElementById('hud').hidden));
  if ((await st()) !== 'run') fail('dive did not start a run');
  if (!/tap/.test(await text('#hint'))) fail('tutorial did not ask for a tap');
  await page.touchscreen.tap(195, 520); await wait(1500); await shot('r06-after-tap'); log('hint:', await text('#hint'));
  if (!/hold/.test(await text('#hint'))) fail('tutorial did not ask for a hold');
  await page.touchscreen.touchStart(195, 520); await wait(500); await page.touchscreen.touchEnd(); await wait(1500); await shot('r07-after-chirp'); log('hint:', await text('#hint'));
  // wait for the drag hint (woke or 6 s timeout), then swim
  for (let i = 0; i < 16 && !/drag/.test(await text('#hint')); i++) await wait(500);
  log('hint:', await text('#hint')); if (!/drag/.test(await text('#hint'))) fail('tutorial never asked to drag');
  await page.touchscreen.touchStart(195, 640); for (let i = 1; i <= 14; i++) { await page.touchscreen.touchMove(195, 640 - i * 10); await wait(50); } await wait(1500); await page.touchscreen.touchEnd(); await wait(800);
  log('hint after swim:', await text('#hint'));
  for (let i = 0; i < 12 && !/sink/.test(await text('#hint')); i++) await wait(500);
  log('hint:', await text('#hint')); await shot('r08-tutorial-late');
  log('tut step:', await page.evaluate(() => Game.run().tut && Game.run().tut.step));
  // shout: run.shouts increments; noise ring on the salamander
  await page.touchscreen.touchStart(195, 520); await wait(1100); await page.touchscreen.touchEnd(); await wait(600);
  log('shouts:', await page.evaluate(() => Game.run().shouts));
  if ((await page.evaluate(() => Game.run().shouts)) !== 1) fail('shout not counted');
  log('pebble disabled in nursery:', await page.evaluate(() => document.getElementById('pebble').disabled));
  // descend: title card and first pebble
  await page.evaluate(() => Game.debug.descend()); await wait(2200); await shot('r09-chamber-1-titlecard');
  log('depth:', await text('#depth'), 'biome:', await text('#biome'), 'pebbles:', await page.evaluate(() => Game.run().pebbles));
  if ((await page.evaluate(() => Game.run().pebbles)) !== 1) fail('first pebble not granted after the nursery');
  await page.evaluate(() => document.getElementById('pebble').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await wait(200);
  await page.evaluate(() => document.getElementById('pebble').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await wait(900);
  log('pebbles after double press:', await page.evaluate(() => Game.run().pebbles), 'button disabled:', await page.evaluate(() => document.getElementById('pebble').disabled));
  if ((await page.evaluate(() => Game.run().pebbles)) !== 0) fail('pebble count wrong after throw');
  // pause / resume through the HUD button
  await click('#pause'); await wait(600); await shot('r10-pause'); log('paused:', await st(), 'screens:', await vis());
  if ((await st()) !== 'paused' || (await vis()) !== 'pausemenu') fail('pause menu did not show');
  await click('#pm-resume'); await wait(300); log('resumed:', await st(), await vis());
  if ((await st()) !== 'run') fail('resume failed');
  // through to the next biome
  for (let i = 0; i < 3; i++) { await page.evaluate(() => Game.debug.descend()); await wait(1700); }
  await wait(500); await shot('r11-biome-2'); log('biome:', await text('#biome'), 'depth:', await text('#depth'), 'pebbles:', await page.evaluate(() => Game.run().pebbles));
  if (!/chimney/.test(await text('#biome'))) fail('tier 1 biome not shown');
  // one hit, then death
  await page.evaluate(() => Game.debug.hurt(1, 'a bristlemaw')); await wait(200); log('hp after hit:', await page.evaluate(() => Game.run().hp), 'hp dots:', await page.evaluate(() => document.querySelectorAll('#hp i').length + '/' + document.querySelectorAll('#hp i.lost').length));
  await wait(1600); await page.evaluate(() => Game.debug.hurt(9, 'the warden')); await wait(500);
  log('dead, screen yet?', await vis()); await wait(2200); await shot('r12-death');
  const dt = (await text('#death')).replace(/\n/g, ' | '); log('death:', dt);
  if (!/the warden found you/.test(dt) || !/chambers\s*\|\s*4/.test(dt)) fail('death copy wrong: ' + dt);
  const s1 = await save(); log('saved:', JSON.stringify({ runs: s1.stats.runs, oto: s1.otoliths, tut: s1.stats.tutorialDone, deaths: s1.stats.deaths, maxDepth: s1.stats.maxDepth }));
  if (s1.stats.runs !== 1 || !s1.stats.tutorialDone || s1.stats.deaths['the warden'] !== 1) fail('save after death wrong');
  await click('#d-surface'); await wait(900); await shot('r13-title-after-run');
  log('title stats:', await text('#title-stats'));
  if (!/1 dive$/.test(await text('#title-stats'))) fail('singular dive copy wrong');

  // ---- reload and fresh tab ----
  await page.reload({ waitUntil: 'networkidle0' }); await wait(900);
  log('after reload:', await text('#title-stats'));
  if (!/1 dive/.test(await text('#title-stats'))) fail('reload lost the save');
  const url = page.url(); const p2 = await browser.newPage(); await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p2.goto(url, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 800));
  const fresh = await p2.evaluate(() => document.getElementById('title-stats').innerText); await p2.close();
  log('fresh tab:', fresh); if (!/1 dive/.test(fresh)) fail('fresh tab lost the save');

  // ---- second dive is not a tutorial ----
  await click('[data-go="dive"]'); await wait(1300);
  log('second dive firstRun:', await page.evaluate(() => Game.run().firstRun), 'pebbles:', await page.evaluate(() => Game.run().pebbles), 'hint:', JSON.stringify(await text('#hint')));
  if (await page.evaluate(() => Game.run().firstRun)) fail('second dive re-ran the tutorial');
  // collect otoliths by swimming onto them is not deterministic; die and check the run's earnings are added
  await page.evaluate(() => Game.debug.descend()); await wait(1800);
  await page.evaluate(() => Game.debug.hurt(9, 'an angler')); await wait(2600);
  log('death 2:', (await text('#death')).replace(/\n/g, ' | '));
  await click('#d-surface'); await wait(600);
  const s2 = await save(); log('runs:', s2.stats.runs, 'oto:', s2.otoliths);
  if (s2.stats.runs !== 2) fail('second run not counted');

  // ---- grotto with money: buy, long-press preview, double taps ----
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('echodepths.save.v1')); d.otoliths = 40; localStorage.setItem('echodepths.save.v1', JSON.stringify(d)); });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(900);
  await click('[data-go="grotto"]'); await wait(900); await shot('r14-grotto-40');
  const card = sel => page.evaluate(s => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes(s)); return b; }, sel);
  // long-press preview must not buy
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await wait(650);
  log('during long press:', await page.evaluate(() => [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')).querySelector('.cost').textContent));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); b.click(); }); await wait(200);
  log('after long press + click, oto:', await text('#oto-count'));
  if ((await text('#oto-count')) !== '40') fail('long-press preview bought the evolution');
  // short tap buys once
  // a short tap buys once; a second click on the same, now stale, card node must not sell it again
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); b.click(); b.click(); const b2 = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b2.click(); }); await wait(400);
  log('after buy lateral (12) + stale click + fresh click, oto:', await text('#oto-count'));
  if ((await text('#oto-count')) !== '28') fail('double click charged twice or not at all');
  if ((await save()).evolutions.filter(x => x === 'lateral').length !== 1) fail('duplicate evolution saved');
  await shot('r15-grotto-owned');
  log('owned label:', await page.evaluate(() => [...document.querySelectorAll('.evo.owned .cost')].map(c => c.textContent).join(',')));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('heat')); b.click(); }); await wait(200);
  log('heat (30) with 28 ->', await page.evaluate(() => [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('heat')).querySelector('.cost').textContent));
  const s3 = await save(); log('saved evolutions:', JSON.stringify(s3.evolutions), 'oto', s3.otoliths);
  if (s3.otoliths !== 28 || s3.evolutions.join() !== 'lateral') fail('grotto purchase not saved');
  await click('#grotto [data-go="title"]'); await wait(300);

  // ---- options: every control writes through ----
  await click('[data-go="options"]'); await wait(600);
  await page.evaluate(() => document.querySelector('#opt-palette [data-v="amber"]').click()); await wait(200);
  await page.evaluate(() => document.querySelector('#opt-haptics [data-v="0"]').click());
  await page.evaluate(() => document.querySelector('#opt-audio [data-v="0"]').click());
  await page.evaluate(() => document.querySelector('#opt-calm [data-v="1"]').click());
  await page.evaluate(() => { const r = document.getElementById('opt-hstr'); r.value = 1.4; r.dispatchEvent(new Event('input', { bubbles: true })); const a = document.getElementById('opt-amb'); a.value = 0.25; a.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(300); await shot('r16-options-amber');
  const s4 = (await save()).settings; log('settings:', JSON.stringify(s4));
  if (s4.palette !== 'amber' || s4.haptics !== false || s4.audio !== false || s4.calm !== true || s4.hapticStrength !== 1.4 || s4.ambience !== 0.25) fail('settings not saved');
  log('body class:', await page.evaluate(() => document.body.className));
  await click('#opt-haptest'); await wait(100); log('haptest label:', await text('#opt-haptest')); await wait(2400); log('haptest label after 2.4s:', await text('#opt-haptest'));
  if ((await text('#opt-haptest')) !== 'test haptics') fail('test haptics label stuck');
  // erase save: arm, leave, return -> disarmed; arm twice -> erased
  await click('#opt-reset'); await wait(100); log('armed:', await text('#opt-reset'));
  await click('#options [data-go="title"]'); await wait(200); await click('[data-go="options"]'); await wait(300); log('after leaving:', await text('#opt-reset'));
  if ((await text('#opt-reset')) !== 'erase save') fail('erase arm survived leaving the screen');
  await page.evaluate(() => document.querySelector('#opt-palette [data-v="ice"]').click());
  await page.evaluate(() => document.querySelector('#opt-audio [data-v="1"]').click());
  await page.evaluate(() => document.querySelector('#opt-haptics [data-v="1"]').click());
  await page.evaluate(() => document.querySelector('#opt-calm [data-v="0"]').click());
  await click('#options [data-go="title"]'); await wait(300);

  // ---- daily: one attempt, result card, share through Native then the fallback ----
  await click('[data-go="daily"]'); await wait(600); await shot('r17-daily-empty');
  await click('#daily-dive'); await wait(1400); log('daily run:', await page.evaluate(() => Game.state() + ' daily=' + Game.run().daily + ' firstRun=' + Game.run().firstRun));
  const seedA = await page.evaluate(() => Game.run().seed);
  await page.evaluate(() => Game.debug.descend()); await wait(1800);
  await page.evaluate(() => Game.debug.hurt(9, 'a bristlemaw')); await wait(2600);
  await click('#d-surface'); await wait(600); log('daily button:', await text('[data-go="daily"]'));
  if (!/done/.test(await text('[data-go="daily"]'))) fail('daily not marked done');
  await click('[data-go="daily"]'); await wait(700); await shot('r18-daily-done');
  log('daily card:', (await text('#daily-result')).replace(/\n/g, ' | '), 'dive hidden:', await page.evaluate(() => document.getElementById('daily-dive').hidden), 'illo hidden:', await page.evaluate(() => document.getElementById('daily-illo').hidden));
  if (!(await page.evaluate(() => document.getElementById('daily-dive').hidden))) fail('daily allows a second attempt');
  await page.evaluate(() => { window.Native = { shareText: (s, t) => { window.__shared = { s, t }; } }; });
  await click('#daily-share'); await wait(300); log('native share:', JSON.stringify(await page.evaluate(() => window.__shared)));
  if (!(await page.evaluate(() => window.__shared && /daily descent/.test(window.__shared.t)))) fail('Native.shareText not used');
  await page.evaluate(() => { delete window.Native; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
  await click('#daily-share'); await wait(300); log('fallback label:', JSON.stringify(await text('#daily-share'))); await shot('r19-daily-share-fallback');
  await wait(2000); log('fallback label after 2s:', JSON.stringify(await text('#daily-share')));
  // the daily seed is the date: a second page on the same day gets the same seed
  log('daily seed:', seedA, 'expected:', await page.evaluate(() => { const d = new Date(); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return U.hashStr('echodepths-daily-' + k); }));
  await click('#daily [data-go="title"]'); await wait(300);

  // ---- abandon from the pause menu: confirm arm, then the death screen says surfaced ----
  await click('[data-go="dive"]'); await wait(1200); await click('#pause'); await wait(300);
  await click('#pm-surface'); await wait(200); log('surface armed:', await text('#pm-surface'), 'state:', await st());
  if ((await st()) !== 'paused') fail('first surface tap ended the run');
  await click('#pm-surface'); await wait(2400); await shot('r20-surfaced');
  log('surfaced:', (await text('#death')).replace(/\n/g, ' | '));
  if (!/you surfaced\./.test(await text('#death'))) fail('surfaced copy missing');
  await click('#d-surface'); await wait(500);
  const s5 = await save(); log('final save:', JSON.stringify({ runs: s5.stats.runs, deaths: s5.stats.deaths, daily: Object.keys(s5.daily) }));
  log('errors:', errors.length);
};
