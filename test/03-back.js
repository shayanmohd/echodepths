// The shell contract: window.App.back() consumes Back on every nested screen and only returns false at the root.
// onPause / onResume never throw and stop what should stop.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' }); await wait(700);
  const back = () => page.evaluate(() => window.App && App.back());
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#screens .screen')].filter(s => !s.hidden).map(s => s.id).join(',') || '(run)');
  log('App present:', await page.evaluate(() => !!(window.App && App.back && App.onPause && App.onResume)));
  log('root back ->', await back(), 'visible:', await vis());
  for (const go of ['daily', 'grotto', 'options']) {
    await click(`[data-go="${go}"]`); await wait(400);
    const r = await back(); await wait(300);
    log(go, 'back ->', r, 'now:', await vis());
    if (r !== true || (await vis()) !== 'title') throw new Error('back did not return to title from ' + go);
  }
  await click('[data-go="dive"]'); await wait(1200);
  log('run back ->', await back(), 'now:', await vis());
  if ((await vis()) !== 'pausemenu') throw new Error('back during a run must pause');
  log('pause back ->', await back(), 'now:', await vis());
  if ((await vis()) !== '(run)') throw new Error('back on pause menu must resume');
  // onPause from the shell while running: run pauses, audio suspends, no throw
  await page.evaluate(() => App.onPause()); await wait(300);
  log('after onPause:', await vis(), 'state', await page.evaluate(() => Game.state()));
  await page.evaluate(() => App.onResume()); await wait(300);
  log('after onResume (must stay paused, user resumes):', await vis(), 'audio held:', await page.evaluate(() => Sfx.isHeld()));
  if (!(await page.evaluate(() => Sfx.isHeld()))) throw new Error('audio must stay held behind the pause menu');
  // a tap on the pause menu (arming surface) must not let the cave hum through either
  await click('#pm-surface'); await wait(200); if (!(await page.evaluate(() => Sfx.isHeld()))) throw new Error('a tap on the pause menu released the audio');
  await click('#pm-resume'); await wait(300);
  log('after resume, audio held:', await page.evaluate(() => Sfx.isHeld())); if (await page.evaluate(() => Sfx.isHeld())) throw new Error('resume did not release the audio');
  await page.evaluate(() => Game.debug.hurt(9)); await wait(2400);
  log('death back ->', await back(), 'now:', await vis());
  if ((await vis()) !== 'title') throw new Error('back on the death screen must surface to the title');
  // onPause / onResume on the title must be harmless
  await page.evaluate(() => { App.onPause(); App.onResume(); });
  log('title after onPause/onResume, audio held:', await page.evaluate(() => Sfx.isHeld())); if (await page.evaluate(() => Sfx.isHeld())) throw new Error('title audio stuck held after resume');
  log('root back again ->', await back());
  await shot('k01-title');
  log('errors:', errors.length);
};
