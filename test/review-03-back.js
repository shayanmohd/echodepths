// Reviewer: window.App.back() on every nested screen and state, onPause/onResume in every state.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const fail = m => { throw new Error(m); };
  const back = () => page.evaluate(() => window.App.back());
  const st = () => page.evaluate(() => Game.state());
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#screens .screen')].filter(s => !s.hidden).map(s => s.id).join(',') || '(run)');
  const held = () => page.evaluate(() => Sfx.isHeld());
  const cycle = async (label) => { const r = await page.evaluate(() => { try { App.onPause(); App.onResume(); return 'ok'; } catch (e) { return 'threw ' + e.message; } }); log(label, 'onPause/onResume:', r, 'state:', await st(), 'held:', await held()); if (r !== 'ok') fail(label + ' lifecycle threw'); };
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' }); await wait(800);
  log('contract:', await page.evaluate(() => typeof window.App.back + ' ' + typeof window.App.onPause + ' ' + typeof window.App.onResume + ' ' + typeof window.Game.pause));
  if ((await back()) !== false) fail('root back must return false');
  await cycle('title'); if (await held()) fail('audio held on the title after resume');
  for (const go of ['daily', 'grotto', 'options']) {
    await click(`[data-go="${go}"]`); await wait(400);
    await cycle(go); if (await held()) fail('audio held on ' + go + ' after resume');
    const r = await back(); await wait(250); log(go, 'back ->', r, 'now:', await vis());
    if (r !== true || (await vis()) !== 'title') fail('back from ' + go);
  }
  // armed erase-save, then back: must be disarmed on return
  await click('[data-go="options"]'); await wait(300); await click('#opt-reset'); await wait(100); await back(); await wait(200); await click('[data-go="options"]'); await wait(300);
  log('erase after back:', await text('#opt-reset')); if ((await text('#opt-reset')) !== 'erase save') fail('erase stayed armed across back');
  await back(); await wait(200);
  // run
  await click('[data-go="dive"]'); await wait(1200);
  log('run back ->', await back(), 'now:', await vis(), 'state:', await st()); if ((await st()) !== 'paused') fail('back in a run must pause');
  // lifecycle while paused: audio stays held, screen stays the pause menu
  await cycle('paused'); if (!(await held())) fail('audio released behind the pause menu'); if ((await vis()) !== 'pausemenu') fail('pause menu gone after lifecycle');
  // arm surface then back: run resumes, arm cleared
  await click('#pm-surface'); await wait(100); log('armed:', await text('#pm-surface'));
  log('pause back ->', await back(), 'now:', await vis(), 'state:', await st(), 'held:', await held());
  if ((await st()) !== 'run' || (await held())) fail('back on the pause menu must resume and release audio');
  await page.evaluate(() => Game.pause()); await wait(100); log('surface label after re-pause:', await text('#pm-surface')); if (/again/.test(await text('#pm-surface'))) fail('surface stayed armed');
  await back(); await wait(100);
  // lifecycle during a run: pauses, holds; resume keeps it paused
  await page.evaluate(() => App.onPause()); await wait(100); log('after onPause in run:', await st(), await vis(), 'held:', await held());
  if ((await st()) !== 'paused' || !(await held())) fail('onPause did not pause and hold');
  await page.evaluate(() => App.onResume()); await wait(100); log('after onResume:', await st(), await vis(), 'held:', await held());
  if ((await st()) !== 'paused' || !(await held())) fail('onResume resumed the run by itself');
  await click('#pm-resume'); await wait(200); if ((await st()) !== 'run' || (await held())) fail('pm-resume');
  // lifecycle during a chamber transition
  await page.evaluate(() => Game.debug.descend()); await wait(200); await cycle('transition'); await click('#pm-resume'); await wait(1600);
  // death: back before the death screen shows, and after
  await page.evaluate(() => Game.debug.hurt(9, 'an angler')); await wait(300);
  log('dead, before screen:', await st(), await vis());
  await cycle('dead-early');
  log('death-early back ->', await back(), 'now:', await vis(), 'state:', await st());
  if ((await vis()) !== 'title' || (await st()) !== 'idle') fail('back right after death must surface');
  await wait(1600); log('1.6s later still title:', await vis()); if ((await vis()) !== 'title') fail('death screen popped after surfacing');
  const runs1 = await page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1')).stats.runs); log('runs counted:', runs1); if (runs1 !== 1) fail('early surface lost the run');
  await click('[data-go="dive"]'); await wait(1200); await page.evaluate(() => Game.debug.hurt(9, 'a bristlemaw')); await wait(2200);
  log('death screen:', await vis()); await cycle('dead'); if ((await vis()) !== 'death') fail('death screen lost after lifecycle');
  log('death back ->', await back(), 'now:', await vis(), 'state:', await st()); if ((await vis()) !== 'title') fail('back on death');
  log('root back ->', await back());
  // visibilitychange hides: the run pauses on its own
  await click('[data-go="dive"]'); await wait(1200);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await wait(200);
  log('after hidden:', await st(), await vis()); if ((await st()) !== 'paused') fail('hidden tab did not pause');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
  await back(); await wait(100); await page.evaluate(() => Game.pause()); await click('#pm-surface'); await click('#pm-surface'); await wait(2400); await click('#d-surface'); await wait(300);
  await shot('r30-back-done');
  log('errors:', errors.length);
};
