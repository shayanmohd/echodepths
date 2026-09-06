# EchoDepths: to see is to be seen

A one-thumb roguelite played in total darkness. Tap to ping; sound reveals the cave as fading phosphor lines and alerts predators that hunt by hearing. Designed to be played with your eyes closed.

- **Play in the browser:** https://shayanmohd.github.io/echodepths/play/
- **Blueprint (the full design doc):** [BLUEPRINT.md](BLUEPRINT.md)
- **Privacy policy:** https://shayanmohd.github.io/echodepths/privacy-policy.html

## Layout

| Path | What |
|---|---|
| `game/` | The HTML5 core. No build step, no dependencies, no network: `index.html` + `js/` + `css/`. Open it or serve it. |
| `LICENSES/` | The SIL Open Font License for Space Grotesk, the one typeface the game ships (`game/fonts/`). |
| `android/` | Kotlin WebView shell. Serves `game/` from an app-private https origin, adds an amplitude-controlled haptics bridge (`window.EchoNative`). VIBRATE is the only permission. |
| `docs/` | GitHub Pages site: landing page, privacy policy, and a copy of the game under `play/`. |
| `test/` | Headless Chrome drive scripts: happy path, upgrade from 1.0.0, back gesture, edge cases and safe areas. |
| `store/` | Play Store graphics (`icon.svg` and `feature.html` rendered by `_shiptools/render-brand.js`), screenshots (`shots.json`) and listing copy. |

## The game core (`game/js`)

- `procgen.js`: cellular-automata caves on a 0.5 m grid, guaranteed spawn to exit connectivity, marching-squares wall segments, and Dijkstra **sound fields** so pings and predator hearing travel around corners instead of through rock.
- `game.js`: the ping/noise/memory loop, predators (bristlemaw, angler, warden), pebbles, currents, otoliths, chamber descent, tutorial beats, and the phosphor to ember renderer.
- `audio.js`: every sound is synthesized (Web Audio): pings, predator clicks, lure hums, bellows, drips pitched to room size, a feedback-delay cave bus.
- `haptics.js`: the haptic vocabulary (wall brush, bearing, current, damage) over `EchoNative` or `navigator.vibrate`.
- `ui.js`: screens, save data (`localStorage`), grotto evolutions, options, daily descent.

Add `?debug` to the URL to get `Game.debug.descend()` / `Game.debug.hurt(n, cause)` for testing. The drive scripts under `test/` use them; run them with `node ../_shiptools/drive.js http://127.0.0.1:8813/index.html?debug test/01-happy.js --out test/shots`.

## Building the Android app

```
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease
```

`app/build.gradle.kts` copies `../game` into `assets/www` on every build. Release signing reads `keystore.properties` (not committed).

## Status

1.0.1: four chamber archetypes cycling through four named biomes, three predator behaviours, six evolutions, Eyes Closed mode, Abyssal Calm assist, local Daily Descent. The 1.0.1 pass added the live sonar title scene, the cyan default palette, drawn illustrations in the menus, a new launcher icon, and fixed the audio leaking through the pause menu. There is no leaderboard and no purchase; the blueprint describes what would need a server.
