# Inkfold

**Live:** https://mihaimpmo.github.io/inkfold/

**Inkfold** is a free, open-source design editor in the spirit of Canva. It runs entirely in the browser — no server, no account, no build step — so it can be hosted for free on GitHub Pages.

## Features

**Create**
- Multi-page designs with thumbnails, reorder, duplicate and delete
- 15 size presets (Instagram, Story, YouTube, A4, presentation, business card…) plus custom sizes
- 9 starter templates, including a website hero with links and animations
- Text, 12 shapes, 25 icons, 48 emoji, QR codes, free drawing (pen, marker, spray)
- **Charts** (bar, line, pie, donut) and **tables** you can edit again later, coloured from your brand kit
- Image upload (button, drag and drop, paste) and free photo search via [Openverse](https://openverse.org)

**Edit**
- 24 Google Fonts, font pairings, bold/italic/underline/strike, alignment, spacing, line height, case
- Text effects: shadow, lift, outline, hollow, neon, echo, glitch, highlight
- Solid and gradient fills, gradient page backgrounds, borders, shadows, opacity, rotation, corner radius
- Colour picker from anywhere on screen (eyedropper, in Chromium browsers)
- Photos: filters, manual adjustments, **crop**, **frame shapes** (circle, rounded, arch, star, heart, hexagon, blob), colour palette pulled from the photo, background remover (the AI runs in your browser)
- **Copy style / paste style** between elements
- Exact size and position (X, Y, W, H)
- Layers panel with show, hide, lock and reorder; group and ungroup; align and distribute; snapping guides
- Unlimited undo/redo, keyboard shortcuts, zoom

**Share**
- **HTML website export**: one self-contained `.html` file with real, selectable text, Google Fonts, every page as a section, clickable links and animations that play on scroll
- **HTML slideshow export**: arrow keys, click or swipe, full screen, slide transitions
- **Present** mode right inside the editor
- Element **links** that work in HTML and PDF
- Element **animations**: fade, rise, pop, slide, blur, drop, spin
- PNG (optionally transparent), JPG, multi-page PDF, SVG, and Inkfold project files (.json)
- Magic Resize to any format, in place or as a copy
- Brand kit (colours, heading and body fonts, logos)
- Version history with automatic and manual snapshots
- Unlimited designs, saved automatically in your browser

## Hosting

The site is plain static files served by GitHub Pages from the `gh-pages` branch (Settings → Pages → Deploy from a branch → `gh-pages` / root). To publish changes, push to `main` and then update `gh-pages`:

```bash
git push origin main:gh-pages
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl/⌘ + Z / Y | Undo / redo |
| Ctrl/⌘ + C / V / X | Copy / paste / cut |
| Ctrl/⌘ + D | Duplicate |
| Ctrl/⌘ + G / Shift+G | Group / ungroup |
| Ctrl/⌘ + A | Select all |
| Ctrl/⌘ + S | Save now |
| Arrows (+Shift) | Nudge 1 px (10 px) |
| Delete | Delete selection |
| T | Add text |
| Ctrl/⌘ + scroll | Zoom |

## How it's built

```
index.html        layout
css/style.css     styles (desktop + mobile)
js/data.js        fonts, presets, shapes, icons, templates
js/store.js       IndexedDB storage
js/app.js         the editor
```

Libraries (loaded from jsDelivr): [Fabric.js 5](http://fabricjs.com) (canvas engine, MIT), [jsPDF](https://github.com/parallax/jsPDF) (MIT), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). The background remover is loaded on demand from `@imgly/background-removal`, which is **AGPL-3.0** — fine for an open-source project; remove `removeBg()` if you need a non-AGPL build.

## Notes

- Designs live in your browser's storage. Use **Download → Inkfold project (.json)** to back up or move designs between devices.
- Inkfold is an independent project and is not affiliated with Canva.

## License

MIT
