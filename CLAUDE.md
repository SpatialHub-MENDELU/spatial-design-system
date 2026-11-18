# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Spatial Design System (SDS) is a library of reusable [A-Frame](https://aframe.io) components and
primitives for AR/VR apps, published to npm as `spatial-design-system`. Plain JavaScript (ES modules),
no TypeScript, no test framework. A-Frame is pinned to `~1.5.0` (three.js is the version bundled with it).

Documentation lives in a separate repository, `spatial-design-system-docs` (VitePress, published at
https://sds.spatialhub.cz). When you change a component's props or behaviour, the docs page usually needs
an update too.

## Commands

```bash
npm install
npm run dev     # Vite dev server with the examples at http://localhost:5173
npm run build   # UMD bundle from lib/main.js into umd/ (git-ignored)
```

To test on a headset in the same network: `npm run dev -- --host` (WebXR needs HTTPS or localhost,
e.g. use port forwarding in the Quest browser).

## Layout

- `components/` – A-Frame components (`AFRAME.registerComponent`). One file may register several
  components, e.g. `components/menu.js` registers `menu`, `grid` and `circle`.
  - `components/flexbox/` – the `flexbox` layout component and its child properties
    (`Properties/flex-col.js`, `Properties/flex-grow.js`). `flexboxDeprecated.js` is the old version.
  - `components/game/` – game components (`walk`, `npc-walk`, `fly`, `game-view`).
  - `components/ar/` – AR placement components.
- `primitives/` – A-Frame primitives (`AFRAME.registerPrimitive`, e.g. `a-ar-button`) that wrap a
  component from `components/` and map HTML attributes to its props.
- `utils/` – shared helpers (`utils.js` with `computeBbox`, `onSceneLoaded`, …; `colors.js`).
- `lib/main.js` – entry point of the UMD build; imports all components. Add new components here.
- `examples/` – Vite root for the dev server. `examples/index.html` is a landing page with a card per
  example; each example is a folder with `index.html` + `main.js` that builds an `<a-scene>` in JS and
  imports components via relative paths (`../../components/...`).
- `assets/`, `public/` – images/icons used by components.

Consumers import files directly, e.g. `import "spatial-design-system/primitives/ar-button.js"`, so file
paths under `components/`, `primitives/` and `utils/` are public API – don't move or rename them casually.

## Conventions

- Component schemas use lowercase or camelCase property names; keep the style of the surrounding component.
- Clean up listeners, observers and timeouts in `remove()`.
- Don't rely on `window.requestAnimationFrame` for work that must run in an immersive WebXR session;
  browsers may not call it there. Use the component's `tick()` (driven by the renderer's animation loop).
- Text is rendered with `aframe-troika-text`; its size is only known after it syncs, so bounding boxes
  measured right after creation may be empty or too small.
- Interactive elements use the `clickable` class for raycasters in examples. Some components set their own
  classes, so don't rely on extra classes on primitives surviving.

## Testing

There are no automated tests. Verify changes in the examples:

1. Add or update an example folder in `examples/` (and a card in `examples/index.html`) that reproduces
   the issue and shows the fix. Self-checking examples (a small HTML overlay reporting OK/FAIL) are welcome.
2. Run `npm run dev` and check the example, ideally also in a headset for XR-related changes.
   Chromium + Playwright are usually available for headless checks (launch with
   `--use-gl=swiftshader --enable-unsafe-swiftshader`).

## Releases

Bump `version` in `package.json` ("Release vX.Y.Z" commit), then publish a GitHub release; the
`npm-publish.yml` workflow builds and publishes to npm.
