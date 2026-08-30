# EchoDepths — to see is to be seen

A one-thumb roguelite played in total darkness. Tap to ping; sound reveals the cave as fading phosphor lines and alerts predators that hunt by hearing. Designed to be played with your eyes closed.

- **Play in the browser:** https://shayanmohd.github.io/echodepths/play/
- **Blueprint (the full design doc):** [BLUEPRINT.md](BLUEPRINT.md)
- **Privacy policy:** https://shayanmohd.github.io/echodepths/privacy-policy.html

## Layout

| Path | What |
|---|---|
| `game/` | The HTML5 core. No build step, no dependencies, no network: `index.html` + `js/` + `css/`. Open it or serve it. |
| `android/` | Kotlin WebView shell. Serves `game/` from an app-private https origin, adds an amplitude-controlled haptics bridge (`window.EchoNative`). VIBRATE is the only permission. |
| `docs/` | GitHub Pages site: landing page, privacy policy, and a copy of the game under `play/`. |
| `store/` | Play Store graphics, screenshots and listing copy. |

## The game core (`game/js`)

- `procgen.js` — cellular-automata caves on a 0.5 m grid, guaranteed spawn→exit connectivity, marching-squares wall segments, and Dijkstra **sound fields** so pings and predator hearing travel around corners instead of through rock.
- `game.js` — the ping/noise/memory loop, predators (bristlemaw, angler, warden), pebbles, currents, otoliths, chamber descent, tutorial beats, and the phosphor→ember renderer.
- `audio.js` — every sound is synthesized (Web Audio): pings, predator clicks, lure hums, bellows, drips pitched to room size, a feedback-delay cave bus.
- `haptics.js` — the haptic vocabulary (wall brush, bearing, current, damage…) over `EchoNative` or `navigator.vibrate`.
- `ui.js` — screens, save data (`localStorage`), grotto evolutions, options, daily descent.

Add `?debug` to the URL to get `Game.debug.descend()` / `Game.debug.hurt(n)` for testing.

## Building the Android app

```
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease
```

`app/build.gradle.kts` copies `../game` into `assets/www` on every build. Release signing reads `keystore.properties` (not committed).

## Status

v0.1 vertical slice: four chamber archetypes cycling through four named biomes, three predator behaviours, six evolutions, Eyes Closed mode, Abyssal Calm assist, local Daily Descent. Global leaderboard and the paid "Full Depths" unlock are v1.0 work — see the blueprint.
