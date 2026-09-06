// Reviewer: upgrade from 1.0.0. Three saves shaped exactly as the shipped Save module wrote them
// (git show 822865a:game/js/ui.js): untouched defaults, a customised one, and a partial one from a 1.0.0 crash mid-write.
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const fail = m => { throw new Error(m); };
  const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const load = async (obj) => { await page.evaluate((k, v) => { localStorage.clear(); localStorage.setItem(k, v); }, 'echodepths.save.v1', typeof obj === 'string' ? obj : JSON.stringify(obj)); await page.reload({ waitUntil: 'networkidle0' }); await wait(900); };
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('echodepths.save.v1')));

  // A. a 1.0.0 player who played two runs and never opened options: 1.0.0 wrote its whole default object, palette green
  const A = { v: 1, otoliths: 7, evolutions: [], settings: { palette: 'green', haptics: true, hapticStrength: 1, audio: true, ambience: 0.7, eyesClosed: false, calm: false }, stats: { runs: 2, maxDepth: 1071, shouts: 3, silentClears: 0, tutorialDone: true, deaths: { 'a bristlemaw': 2 } }, daily: {} };
  await load(A); await shot('r20-upgrade-A-title');
  log('A title:', await text('#title-stats'), '| class:', await page.evaluate(() => document.body.className));
  if (!/1,071 m/.test(await text('#title-stats')) || !/7 otoliths/.test(await text('#title-stats')) || !/2 dives/.test(await text('#title-stats'))) fail('A stats misread');
  if (!/pal-green/.test(await page.evaluate(() => document.body.className))) fail('A: saved green palette not honoured');
  await click('[data-go="options"]'); await wait(500); await shot('r21-upgrade-A-options');
  log('A palette button:', await page.evaluate(() => document.querySelector('#opt-palette .on').textContent));
  if ((await page.evaluate(() => document.querySelector('#opt-palette .on').dataset.v)) !== 'green') fail('A: options show wrong palette');
  await click('#options [data-go="title"]'); await wait(200);
  await click('[data-go="dive"]'); await wait(1300); log('A dive firstRun:', await page.evaluate(() => Game.run().firstRun), 'pebbles:', await page.evaluate(() => Game.run().pebbles));
  if (await page.evaluate(() => Game.run().firstRun)) fail('A: tutorial re-ran for a 1.0.0 player');
  await shot('r22-upgrade-A-run-green');
  await page.evaluate(() => Game.debug.hurt(9, 'an angler')); await wait(2400); await click('#d-surface'); await wait(400);
  const a2 = await save(); log('A after a run:', JSON.stringify({ runs: a2.stats.runs, oto: a2.otoliths, deaths: a2.stats.deaths, pal: a2.settings.palette }));
  if (a2.stats.runs !== 3 || a2.stats.deaths['a bristlemaw'] !== 2 || a2.stats.deaths['an angler'] !== 1 || a2.settings.palette !== 'green' || a2.otoliths < 7) fail('A: rewritten save lost 1.0.0 data');

  // B. a customised 1.0.0 save: amber, haptics off, strength 1.3, ambience 0.4, calm, eyes closed, two evolutions, two daily results
  const B = { v: 1, otoliths: 41, evolutions: ['lateral', 'fat'], settings: { palette: 'amber', haptics: false, hapticStrength: 1.3, audio: true, ambience: 0.4, eyesClosed: true, calm: true }, stats: { runs: 7, maxDepth: 1362, shouts: 9, silentClears: 3, tutorialDone: true, deaths: { 'a bristlemaw': 4, 'the warden': 1, 'you surfaced': 2 } }, daily: { '2026-09-05': { depth: 1187, chambers: 5, shouts: 2, calm: false }, [today]: { depth: 1094, chambers: 3, shouts: 0, calm: true } } };
  await load(B); await shot('r23-upgrade-B-title');
  const bs = await text('#title-stats'); log('B title:', bs);
  if (!/1,362 m/.test(bs) || !/41 otoliths/.test(bs) || !/7 dives/.test(bs)) fail('B stats misread: ' + bs);
  if (!/pal-amber/.test(await page.evaluate(() => document.body.className)) || !/eyes-closed/.test(await page.evaluate(() => document.body.className))) fail('B: palette or eyes-closed class missing');
  log('B daily button:', await text('[data-go="daily"]')); if (!/done/.test(await text('[data-go="daily"]'))) fail('B: today\'s daily not recognised');
  await click('[data-go="grotto"]'); await wait(700); await shot('r24-upgrade-B-grotto');
  const owned = await page.evaluate(() => [...document.querySelectorAll('.evo.owned b')].map(b => b.textContent.trim())); log('B owned:', owned.join(', '));
  if (owned.length !== 2 || (await text('#oto-count')) !== '41') fail('B: evolutions or otoliths lost');
  await click('#grotto [data-go="title"]'); await wait(200);
  await click('[data-go="options"]'); await wait(600); await shot('r25-upgrade-B-options');
  const opt = await page.evaluate(() => ({ pal: document.querySelector('#opt-palette .on').dataset.v, hap: document.querySelector('#opt-haptics .on').dataset.v, aud: document.querySelector('#opt-audio .on').dataset.v, hstr: document.getElementById('opt-hstr').value, amb: document.getElementById('opt-amb').value, eyes: document.querySelector('#opt-eyes .on').dataset.v, calm: document.querySelector('#opt-calm .on').dataset.v }));
  log('B options:', JSON.stringify(opt));
  if (opt.pal !== 'amber' || opt.hap !== '0' || opt.aud !== '1' || opt.hstr !== '1.3' || opt.amb !== '0.4' || opt.eyes !== '1' || opt.calm !== '1') fail('B: settings misread');
  // the slider fill reflects the saved value (a visual the old build did not have)
  log('B slider fill:', await page.evaluate(() => document.getElementById('opt-hstr').style.getPropertyValue('--p') + ' ' + document.getElementById('opt-amb').style.getPropertyValue('--p')));
  await click('#options [data-go="title"]'); await wait(200);
  await click('[data-go="daily"]'); await wait(600); await shot('r26-upgrade-B-daily');
  const card = (await text('#daily-result')).replace(/\n/g, ' | '); log('B daily card:', card);
  if (!/1,094 m/.test(card) || !/3 chambers/.test(card) || !/0 shouts/.test(card) || !/unranked/.test(card)) fail('B: daily result misread: ' + card);
  if (!(await page.evaluate(() => document.getElementById('daily-dive').hidden))) fail('B: a second daily attempt offered');
  await click('#daily [data-go="title"]'); await wait(200);
  await click('[data-go="dive"]'); await wait(1300);
  log('B dive: firstRun', await page.evaluate(() => Game.run().firstRun), 'hp', await page.evaluate(() => Game.run().hp), '(2 + fat + calm = 4)', 'canvas:', await page.evaluate(() => getComputedStyle(document.getElementById('c')).visibility));
  if ((await page.evaluate(() => Game.run().hp)) !== 4) fail('B: evolutions or calm not applied to the run');
  if ((await page.evaluate(() => getComputedStyle(document.getElementById('c')).visibility)) !== 'hidden') fail('B: eyes closed not applied');
  await shot('r27-upgrade-B-run-eyes-closed');
  await page.evaluate(() => Game.debug.hurt(9, 'the warden')); await wait(2400); await click('#d-surface'); await wait(400);
  const b2 = await save(); log('B rewritten:', JSON.stringify({ v: b2.v, runs: b2.stats.runs, silent: b2.stats.silentClears, shouts: b2.stats.shouts, deaths: b2.stats.deaths, daily: Object.keys(b2.daily), evos: b2.evolutions, settings: b2.settings }));
  if (b2.v !== 1 || b2.stats.silentClears !== 3 || b2.stats.deaths['you surfaced'] !== 2 || !b2.daily['2026-09-05'] || b2.daily[today].depth !== 1094 || b2.evolutions.join() !== 'lateral,fat' || b2.settings.hapticStrength !== 1.3 || b2.settings.ambience !== 0.4) fail('B: rewritten save dropped 1.0.0 fields');
  if (Object.keys(b2).sort().join() !== 'daily,evolutions,otoliths,settings,stats,v') fail('B: top-level keys changed: ' + Object.keys(b2).join());

  // C. partial saves: a 1.0.0 JSON with missing sections and a corrupt one. Nothing may throw; what exists is kept.
  await load({ v: 1, otoliths: 5, stats: { runs: 1, maxDepth: 1040 } });
  log('C1 title:', await text('#title-stats'), 'errors:', errors.length);
  if (!/1,040 m/.test(await text('#title-stats')) || !/5 otoliths/.test(await text('#title-stats'))) fail('C1: partial save misread');
  await click('[data-go="grotto"]'); await wait(400); await click('#grotto [data-go="title"]'); await wait(200);
  await click('[data-go="options"]'); await wait(400); await click('#options [data-go="title"]'); await wait(200);
  await load('{not json');
  log('C2 corrupt -> title:', await text('#title-stats'), 'errors:', errors.length);
  if (!/no dives yet/.test(await text('#title-stats'))) fail('C2: corrupt save did not fall back to defaults');
  await load({ v: 1, otoliths: 'x', evolutions: 'lateral', settings: null, stats: { deaths: null }, daily: [] });
  log('C3 wrong types -> title:', await text('#title-stats'), 'errors:', errors.length);
  await click('[data-go="grotto"]'); await wait(400); log('C3 grotto cards:', await page.evaluate(() => document.querySelectorAll('.evo').length)); await click('#grotto [data-go="title"]'); await wait(200);
  await click('[data-go="dive"]'); await wait(1200); await page.evaluate(() => Game.debug.hurt(9, 'a bristlemaw')); await wait(2400); await click('#d-surface'); await wait(400);
  log('C3 after a run:', await text('#title-stats'));
  // ice from 1.0.0 (the old pale blue) becomes the new cyan
  await load({ v: 1, otoliths: 0, evolutions: [], settings: { palette: 'ice', haptics: true, hapticStrength: 1, audio: true, ambience: 0.7, eyesClosed: false, calm: false }, stats: { runs: 1, maxDepth: 1030, shouts: 0, silentClears: 0, tutorialDone: true, deaths: { 'an angler': 1 } }, daily: {} });
  log('D ice:', await page.evaluate(() => document.body.className), getComputed = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--phos').trim()));
  await shot('r28-upgrade-D-ice');
  log('errors:', errors.length);
};
