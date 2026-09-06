// Upgrade from 1.0.0: seed localStorage exactly as the shipped Save module wrote it, then load this build.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const v100 = {
    v: 1, otoliths: 41, evolutions: ['lateral', 'fat'],
    settings: { palette: 'amber', haptics: false, hapticStrength: 1.3, audio: true, ambience: 0.4, eyesClosed: false, calm: true },
    stats: { runs: 7, maxDepth: 1362, shouts: 9, silentClears: 3, tutorialDone: true, deaths: { 'a bristlemaw': 4, 'the warden': 1, 'you surfaced': 2 } },
    daily: { '2026-09-05': { depth: 1187, chambers: 5, shouts: 2, calm: false }, [today]: { depth: 1094, chambers: 3, shouts: 0, calm: true } },
  };
  await page.evaluate(k => localStorage.setItem('echodepths.save.v1', k), JSON.stringify(v100));
  await page.reload({ waitUntil: 'networkidle0' }); await wait(900);
  await shot('u01-title');
  const stats = await text('#title-stats'); log('title stats:', stats);
  if (!/1,362 m/.test(stats) || !/41 otoliths/.test(stats) || !/7 dives/.test(stats)) throw new Error('title stats lost data: ' + stats);
  log('palette class:', await page.evaluate(() => document.body.className));
  await click('[data-go="grotto"]'); await wait(600); await shot('u02-grotto');
  const owned = await page.evaluate(() => [...document.querySelectorAll('.evo.owned b')].map(b => b.textContent));
  log('owned:', owned.join(', ')); if (owned.length !== 2) throw new Error('evolutions lost');
  if ((await text('#oto-count')) !== '41') throw new Error('otoliths lost');
  await click('#grotto [data-go="title"]'); await wait(300);
  await click('[data-go="options"]'); await wait(600); await shot('u03-options');
  const opt = await page.evaluate(() => ({ pal: document.querySelector('#opt-palette .on').dataset.v, hap: document.querySelector('#opt-haptics .on').dataset.v, hstr: document.getElementById('opt-hstr').value, amb: document.getElementById('opt-amb').value, calm: document.querySelector('#opt-calm .on').dataset.v }));
  log('options:', JSON.stringify(opt));
  if (opt.pal !== 'amber' || opt.hap !== '0' || opt.hstr !== '1.3' || opt.amb !== '0.4' || opt.calm !== '1') throw new Error('settings misread');
  await click('#options [data-go="title"]'); await wait(300);
  log('daily btn:', await text('[data-go="daily"]'));
  await click('[data-go="daily"]'); await wait(600); await shot('u04-daily-done');
  const card = await text('#daily-result'); log('daily card:', card.replace(/\n/g, ' | '));
  if (!/1,094 m/.test(card)) throw new Error('daily result lost');
  // the save written back by this build must still hold everything 1.0.0 wrote
  const back = await page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1')));
  if (back.stats.deaths['a bristlemaw'] !== 4 || !back.daily['2026-09-05'] || back.stats.silentClears !== 3) throw new Error('rewritten save dropped fields');
  log('rewritten save keeps deaths/daily/silentClears: ok');
  // a dive after the upgrade must not be a tutorial (tutorialDone was true)
  await click('#daily [data-go="title"]'); await wait(300);
  await click('[data-go="dive"]'); await wait(1500);
  log('firstRun on dive:', await page.evaluate(() => Game.run().firstRun), 'hp (fat+calm):', await page.evaluate(() => Game.run().hp));
  await shot('u05-run-amber');
  log('errors:', errors.length);
};
