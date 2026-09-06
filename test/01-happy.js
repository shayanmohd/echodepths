// First run, the whole happy path, and persistence across reload.
// Run with ?debug in the url so Game.debug.descend / hurt exist.
module.exports = async ({ page, shot, wait, text, click, errors, log, browser }) => {
  const st = () => page.evaluate(() => Game.state());
  const hp = () => page.evaluate(() => Game.run() && Game.run().hp);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' }); await wait(900);
  await shot('01-title-empty');
  log('title stats:', await text('#title-stats'));

  // --- first dive: tutorial nursery ---
  await click('[data-go="dive"]'); await wait(1300);
  await shot('02-nursery-hint');
  log('hint:', await text('#hint'));
  await page.touchscreen.tap(195, 520); await wait(900); await shot('03-after-tap');
  await page.touchscreen.touchStart(195, 520); await wait(500); await page.touchscreen.touchEnd(); await wait(1200); await shot('04-after-chirp');
  // drag to swim
  await page.touchscreen.touchStart(195, 600); for (let i = 1; i <= 12; i++) { await page.touchscreen.touchMove(195, 600 - i * 12); await wait(40); } await wait(1200); await page.touchscreen.touchEnd(); await wait(600);
  await shot('05-after-swim');
  log('hint after swim:', await text('#hint'));
  // shout
  await page.touchscreen.touchStart(195, 520); await wait(1100); await page.touchscreen.touchEnd(); await wait(700); await shot('06-after-shout');
  log('shouts:', await page.evaluate(() => Game.run().shouts));
  // pebble button state (tutorial starts with 0 pebbles)
  log('pebble disabled at start:', await page.evaluate(() => document.getElementById('pebble').disabled));
  // descend through debug into the first real chamber
  await page.evaluate(() => Game.debug.descend()); await wait(2600); await shot('07-chamber-1');
  log('depth:', await text('#depth'), 'biome:', await text('#biome'));
  log('pebble enabled now:', !(await page.evaluate(() => document.getElementById('pebble').disabled)));
  await page.evaluate(() => document.getElementById('pebble').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await wait(900);
  log('pebbles left:', await page.evaluate(() => Game.run().pebbles));
  // pause / resume
  await click('#pause'); await wait(500); await shot('08-pause'); log('state paused:', await st());
  await click('#pm-resume'); await wait(300); log('state resumed:', await st());
  // more chambers, then a death
  for (let i = 0; i < 4; i++) { await page.evaluate(() => Game.debug.descend()); await wait(1700); }
  await shot('09-chamber-5'); log('biome:', await text('#biome'));
  await page.evaluate(() => Game.debug.hurt(1)); await wait(300); log('hp after hit:', await hp()); await wait(1500);
  await page.evaluate(() => Game.debug.hurt(9)); await wait(2400); await shot('10-death');
  log('death:', (await text('#death')).replace(/\n/g, ' | '));
  await click('#d-surface'); await wait(800); await shot('11-title-after-run');
  log('title stats:', await text('#title-stats'));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1')));
  log('saved runs/oto/tut:', saved.stats.runs, saved.otoliths, saved.stats.tutorialDone);

  // --- reload: everything persists ---
  await page.reload({ waitUntil: 'networkidle0' }); await wait(800);
  log('after reload:', await text('#title-stats'));
  // --- kill the tab, open a fresh one: still there ---
  const url = page.url(); const p2 = await browser.newPage(); await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p2.goto(url, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 700));
  const fresh = await p2.evaluate(() => document.getElementById('title-stats').innerText); await p2.close();
  log('fresh tab:', fresh); if (!/1 dive/.test(fresh)) throw new Error('fresh tab lost the save');

  // --- grotto: seed enough otoliths, buy, long-press preview ---
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('echodepths.save.v1')); d.otoliths = 40; localStorage.setItem('echodepths.save.v1', JSON.stringify(d)); });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(800);
  await click('[data-go="grotto"]'); await wait(700); await shot('12-grotto');
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b.click(); }); await wait(500);
  log('oto after buy:', await text('#oto-count'));
  await shot('13-grotto-owned');
  // double tap buy on the same evo must not charge twice
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('lateral')); b.click(); b.click(); });
  log('oto after double tap on owned:', await text('#oto-count'));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('heat')); b.click(); b.click(); }); await wait(300);
  log('oto after trying to buy 30-cost with 28:', await text('#oto-count'));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.evo')].find(x => x.textContent.includes('fat')); b.click(); b.click(); }); await wait(300);
  log('oto after double tap buy fat (15):', await text('#oto-count'));
  await click('#grotto [data-go="title"]'); await wait(400);

  // --- options ---
  await click('[data-go="options"]'); await wait(600); await shot('14-options');
  await page.evaluate(() => document.querySelector('#opt-palette [data-v="amber"]').click()); await wait(300);
  await page.evaluate(() => document.querySelector('#opt-calm [data-v="1"]').click()); await wait(300);
  await shot('15-options-amber');
  const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1')).settings);
  log('settings saved:', JSON.stringify(s2));
  await page.evaluate(() => document.querySelector('#opt-palette [data-v="green"]').click()); await wait(200);
  await page.evaluate(() => document.querySelector('#opt-calm [data-v="0"]').click()); await wait(200);
  await click('#options [data-go="title"]'); await wait(400);

  // --- daily ---
  await click('[data-go="daily"]'); await wait(600); await shot('16-daily');
  await page.evaluate(() => { const b = document.getElementById('daily-dive'); b.click(); b.click(); }); await wait(1600); await shot('17-daily-run');
  log('daily double tap -> one run, daily:', await page.evaluate(() => Game.state() + ' ' + Game.run().daily + ' ' + Game.run().chamber));
  await page.evaluate(() => Game.debug.descend()); await wait(1800);
  await page.evaluate(() => Game.debug.hurt(9)); await wait(2400);
  await click('#d-surface'); await wait(600);
  log('daily button:', await text('[data-go="daily"]'));
  await click('[data-go="daily"]'); await wait(600); await shot('18-daily-done');
  log('daily card:', (await text('#daily-result')).replace(/\n/g, ' | '));
  log('errors so far:', errors.length);
};
