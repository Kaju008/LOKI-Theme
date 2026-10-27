# Kaju Soni — Master of Timeline

A 3D scroll-driven portfolio. A plexus brain floats in deep space — *Creativity began with the thought.*
Slide to unleash: it spins, bursts into particles, and the camera dives through a wormhole and lands
over an infinite glass bridge with a live editing timeline running beneath it. Scroll past the throne
(**Master of Timeline**), up the cosmic tree, turn 180°, and the bridge splits into three paths:
**The Timekeeper**, **My Works** and **The Lab**. Every cut is a decision; every decision makes a new universe.

Everything is interactive: click the tree to shake leaves loose, drag and spin the planets, grab and throw the asteroids.

- `index.html`, `css/universe.css` — the universe (intro, scroll story, path boards)
- `about.html`, `works.html`, `lab.html` — the three paths (`css/pages.css`). My Works is a draggable 3D sphere of frames; `works-grid.html` is the backup grid version
- `classic.html` — the previous version of the site
- `src/universe/` — bridge + timeline shader, tree, throne/asteroids, scene, camera story
- `src/pages/` — page scripts. Edit `src/config.js` for text, videos, tools and contact.
- `js/*.js` — built bundles (run `npm install` once, then `npm run build`)
- `assets/universe/` — scene assets exported from the Blender file (throne, tree, asteroids)

Preview locally: `npm run serve` → http://localhost:8000
