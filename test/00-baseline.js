// Baseline: what 1.0.0 looks like on every screen before the second pass touched anything.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await wait(800);
  await shot('b00-title');
  await click('[data-go="daily"]'); await wait(500); await shot('b01-daily');
  await click('#daily [data-go="title"]'); await wait(300);
  await click('[data-go="grotto"]'); await wait(500); await shot('b02-grotto');
  await click('#grotto [data-go="title"]'); await wait(300);
  await click('[data-go="options"]'); await wait(500); await shot('b03-options');
  await click('#options [data-go="title"]'); await wait(300);
  await click('[data-go="dive"]'); await wait(1200); await shot('b04-run-start');
  // tap = click ping
  await page.touchscreen.tap(195, 500); await wait(600); await shot('b05-after-tap');
  // hold = shout
  await page.touchscreen.touchStart(195, 500); await wait(1100); await page.touchscreen.touchEnd(); await wait(900); await shot('b06-after-shout');
  await page.evaluate(() => Game.pause()); await wait(400); await shot('b07-pause');
  await page.evaluate(() => { document.getElementById('pm-resume').click(); });
  await wait(200);
  await page.evaluate(() => Game.debug && Game.debug.hurt(5)); await wait(2200); await shot('b08-death');
  log('state', await page.evaluate(() => Game.state()));
  log('errors', errors.length);
};
