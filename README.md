# Inkfold

**Live:** https://mihaimpmo.github.io/inkfold/

**Inkfold** is a free, open-source design editor in the spirit of Canva. It runs entirely in the browser — no server, no account, no build step — so it can be hosted for free on GitHub Pages.

## Features

**Editor**
- Multi-page designs with page thumbnails, reorder, duplicate, delete
- 15 size presets (Instagram, Story, YouTube, A4, presentation, business card…) + custom sizes
- 8 starter templates, text, 12 shapes, 25 icons, QR codes, free drawing (pen / marker / spray)
- Image upload by button, drag & drop or paste; free photo search via [Openverse](https://openverse.org)
- 24 Google Fonts, font pairings, bold/italic/underline/strike, alignment, letter spacing, line height, case
- Text effects: shadow, lift, outline, hollow, neon, echo, glitch
- Solid and gradient fills (linear / radial), borders, dashed borders, shadows, opacity, rotation, corner radius
- Image filters (Vivid, Mono, Vintage, Cool, Warm, Drama, Fade) and manual brightness, contrast, saturation, hue, blur
- Layers panel with show/hide, lock, reorder; group/ungroup; align and distribute; smart snapping guides
- Unlimited undo/redo, keyboard shortcuts, zoom

**"Pro" features — all free here**
- ✨ **Background remover** — AI model runs locally in your browser ([@imgly/background-removal](https://github.com/imgly/background-removal-js))
- ✨ **Magic Resize** — rescale a whole design to a new format, in place or as a copy
- **Brand kit** — brand colours, heading/body fonts, logos
- **Transparent PNG**, high-res export up to 4×, multi-page **PDF**, **SVG**
- **Version history** — automatic snapshots + manual saves, one-click restore
- Unlimited designs, auto-saved in the browser (IndexedDB)

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
