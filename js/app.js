/* Inkfold — browser design editor (Fabric.js 5) */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMobile = () => matchMedia('(max-width:700px)').matches;

const PROPS = ['name','locked','fx','selectable','evented','hasControls','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','editable'];
fabric.textureSize = 4096;
Object.assign(fabric.Object.prototype, {
  transparentCorners:false, cornerColor:'#ffffff', cornerStrokeColor:'#5b3df5', borderColor:'#5b3df5',
  cornerStyle:'circle', cornerSize:12, touchCornerSize:28, padding:2, borderScaleFactor:1.5
});

const canvas = new fabric.Canvas('c', {
  preserveObjectStacking:true, backgroundColor:'#ffffff', stopContextMenu:true,
  selectionColor:'rgba(91,61,245,.08)', selectionBorderColor:'#5b3df5', selectionLineWidth:1
});

let D = null;          // current design {id,title,w,h,pages:[{id,json,thumb}],cur}
let zoom = 1, loading = false, clipboard = null;
let brand = {colors:['#5b3df5','#00c4cc','#ffcf3f','#18191b','#ffffff'], head:'Montserrat', body:'Inter', logos:[]};
let uploads = [];
const hist = {};       // pageId -> {stack:[], i:-1}
const PALETTE = ['#000000','#545454','#a6a6a6','#ffffff','#ff3131','#ff66c4','#cb6ce6','#5b3df5','#38b6ff','#00c4cc','#7ed957','#ffde59','#ff914d'];

/* ---------------- utilities ---------------- */
function toast(msg, ms = 2600){
  const t = $('#toast'); t.innerHTML = msg; t.hidden = false;
  clearTimeout(toast._t); if (ms) toast._t = setTimeout(() => t.hidden = true, ms);
}
function openModal(html){ $('#modalBody').innerHTML = html; $('#modal').hidden = false; return $('#modalBody'); }
function closeModal(){ $('#modal').hidden = true; }
$('#modalX').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function hex(c){
  if (!c || typeof c !== 'string') return '#000000';
  try { const col = new fabric.Color(c); return '#' + col.toHex().toLowerCase(); } catch (e) { return '#000000'; }
}
function download(url, name){
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function fileToDataURL(f){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
function blobToDataURL(b){ return fileToDataURL(b); }
function safeName(){ return (D.title || 'design').replace(/[^\w\-]+/g, '_').slice(0, 60) || 'design'; }

/* downscale very large raster images so filters and storage stay fast */
function shrinkImage(dataURL, max = 4096){
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      if (k >= 1) return res(dataURL);
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL(/^data:image\/(png|webp)/.test(dataURL) ? 'image/png' : 'image/jpeg', .92));
    };
    im.onerror = () => res(dataURL);
    im.src = dataURL;
  });
}

/* make sure every font used in a JSON tree is loaded before Fabric measures text */
function normalize(json){
  (function walk(objs){ (objs || []).forEach(o => { if (/text/.test(o.type) && !o.styles) o.styles = []; if (o.objects) walk(o.objects); }); })(json && json.objects);
  return json;
}
function fontsIn(json){
  const s = new Set();
  (function walk(objs){ (objs || []).forEach(o => { if (o.fontFamily) s.add(o.fontFamily); if (o.objects) walk(o.objects); }); })(json && json.objects);
  return [...s];
}
async function loadFonts(list){
  if (!document.fonts) return;
  await Promise.all(list.flatMap(f => ['', 'bold ', 'italic '].map(w => document.fonts.load(w + '40px "' + f + '"').catch(() => {}))));
}
async function useFont(obj, f){
  await loadFonts([f]);
  fabric.util.clearFabricFontCache(f);
  obj.set('fontFamily', f); obj.initDimensions && obj.initDimensions(); obj.setCoords();
  canvas.requestRenderAll();
}

/* ---------------- design state ---------------- */
function blankPage(bg = '#ffffff'){ return {id:uid(), json:{version:fabric.version, objects:[], background:bg}, thumb:''}; }
function newDesign(w, h, title = 'Untitled design'){
  return {id:uid(), title, w, h, pages:[blankPage()], cur:0, created:Date.now()};
}
function serialize(){ return canvas.toJSON(PROPS); }
function pageThumb(){
  const m = (160 / Math.max(D.w, D.h)) / zoom;
  try { return canvas.toDataURL({format:'png', multiplier:m}); } catch (e) { return ''; }
}
function commitPage(){
  if (!D || loading) return;
  const p = D.pages[D.cur]; p.json = serialize(); p.thumb = pageThumb();
}

async function loadPage(i){
  loading = true;
  D.cur = i;
  const p = D.pages[i];
  normalize(p.json);
  await loadFonts(fontsIn(p.json));
  return new Promise(res => {
    canvas.discardActiveObject();
    canvas.loadFromJSON(p.json, () => {
      canvas.getObjects().forEach(o => { if (o.locked) lockObj(o, true); });
      canvas.renderAll();
      loading = false;
      if (!hist[p.id]) { hist[p.id] = {stack:[JSON.stringify(serialize())], i:0}; }
      refreshAll();
      res();
    });
  });
}
async function openDesign(d){
  D = d; D.cur = Math.min(D.cur || 0, D.pages.length - 1);
  $('#title').value = D.title;
  setZoom(fitZoom(), true);
  await loadPage(D.cur);
  renderPages();
  PZ.store.set('last', D.id);
  fillThumbs();
}
async function fillThumbs(){
  const d = D;
  for (const p of d.pages) {
    if (p.thumb || d !== D) continue;
    p.thumb = await renderPageURL(p.json, 160 / Math.max(d.w, d.h), 'png', false);
  }
  if (d === D) renderPages();
}

/* ---------------- history & autosave ---------------- */
function record(){
  if (loading || !D) return;
  clearTimeout(record._t);
  record._t = setTimeout(() => {
    const p = D.pages[D.cur], h = hist[p.id] || (hist[p.id] = {stack:[], i:-1});
    const s = JSON.stringify(serialize());
    if (h.stack[h.i] === s) return;
    h.stack = h.stack.slice(0, h.i + 1); h.stack.push(s);
    if (h.stack.length > 150) h.stack.shift();
    h.i = h.stack.length - 1;
    dirty();
  }, 180);
}
function stepHistory(dir){
  const p = D.pages[D.cur], h = hist[p.id]; if (!h) return;
  const j = h.i + dir; if (j < 0 || j >= h.stack.length) return;
  h.i = j; loading = true;
  canvas.discardActiveObject();
  canvas.loadFromJSON(JSON.parse(h.stack[j]), () => {
    canvas.getObjects().forEach(o => { if (o.locked) lockObj(o, true); });
    canvas.renderAll(); loading = false; refreshAll(); dirty();
  });
}
function dirty(){
  $('#saveState').textContent = 'Saving…';
  clearTimeout(dirty._t);
  dirty._t = setTimeout(save, 900);
}
async function save(){
  if (!D) return;
  commitPage(); renderPages();
  D.updated = Date.now();
  const data = {id:D.id, title:D.title, w:D.w, h:D.h, pages:D.pages, cur:D.cur, created:D.created, updated:D.updated};
  try {
    await PZ.store.set('design:' + D.id, data);
    await PZ.store.set('meta:' + D.id, {id:D.id, title:D.title, w:D.w, h:D.h, updated:D.updated, thumb:D.pages[0].thumb, n:D.pages.length});
    await PZ.store.set('last', D.id);
    if (!save._v || Date.now() - save._v > 5 * 60 * 1000) { save._v = Date.now(); await snapshot(false); }
    $('#saveState').textContent = 'Saved';
  } catch (e) { $('#saveState').textContent = 'Not saved'; }
}
async function snapshot(manual){
  commitPage();
  const key = 'versions:' + D.id, list = (await PZ.store.get(key)) || [];
  list.unshift({t:Date.now(), manual, thumb:D.pages[0].thumb, w:D.w, h:D.h, pages:JSON.parse(JSON.stringify(D.pages))});
  await PZ.store.set(key, list.slice(0, 20));
}

/* ---------------- zoom & guides ---------------- */
function fitZoom(){
  const st = $('#stage'), pad = isMobile() ? 32 : 80;
  return Math.max(.05, Math.min(2, (st.clientWidth - pad) / D.w, (st.clientHeight - pad) / D.h));
}
function setZoom(z, silent){
  zoom = Math.max(.05, Math.min(5, z));
  canvas.setZoom(zoom);
  canvas.setDimensions({width:Math.round(D.w * zoom), height:Math.round(D.h * zoom)});
  $('#zoomVal').textContent = Math.round(zoom * 100) + '%';
  if (!silent) canvas.requestRenderAll();
}
$('#zoomIn').onclick = () => setZoom(zoom * 1.2);
$('#zoomOut').onclick = () => setZoom(zoom / 1.2);
$('#zoomFit').onclick = () => setZoom(fitZoom());
window.addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => D && setZoom(fitZoom()), 150); });
$('#stage').addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); } }, {passive:false});

const guides = {v:null, h:null};
canvas.on('object:moving', e => {
  const o = e.target, snap = 8 / zoom, b = o.getBoundingRect(true, true);
  guides.v = guides.h = null;
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const xs = [[D.w / 2, cx], [0, b.left], [D.w, b.left + b.width]];
  const ys = [[D.h / 2, cy], [0, b.top], [D.h, b.top + b.height]];
  for (const [t, v] of xs) if (Math.abs(t - v) < snap) { o.left += t - v; guides.v = t; break; }
  for (const [t, v] of ys) if (Math.abs(t - v) < snap) { o.top += t - v; guides.h = t; break; }
  o.setCoords();
});
canvas.on('mouse:up', () => { if (guides.v !== null || guides.h !== null) { guides.v = guides.h = null; canvas.requestRenderAll(); } });
canvas.on('after:render', () => {
  if (guides.v === null && guides.h === null) return;
  const ctx = canvas.getContext(); ctx.save(); ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  if (guides.v !== null) { ctx.beginPath(); ctx.moveTo(guides.v * zoom, 0); ctx.lineTo(guides.v * zoom, D.h * zoom); ctx.stroke(); }
  if (guides.h !== null) { ctx.beginPath(); ctx.moveTo(0, guides.h * zoom); ctx.lineTo(D.w * zoom, guides.h * zoom); ctx.stroke(); }
  ctx.restore();
});

/* ---------------- adding things ---------------- */
function base(){ return Math.min(D.w, D.h); }
function place(o, name, fit = .4){
  if (D && fit) {
    const s = Math.min(1e9, (base() * fit) / Math.max(o.width * (o.scaleX || 1), o.height * (o.scaleY || 1)));
    if (o.type !== 'textbox') o.scale((o.scaleX || 1) * s);
  }
  o.name = o.name || name;
  canvas.add(o);
  o.set({left:D.w / 2, top:D.h / 2, originX:'center', originY:'center'}); o.setCoords();
  // normalise origin back to left/top so JSON stays simple
  const p = o.getPointByOrigin('left', 'top'); o.set({originX:'left', originY:'top', left:p.x, top:p.y}); o.setCoords();
  canvas.setActiveObject(o); canvas.requestRenderAll();
  if (isMobile()) closePanel();
  return o;
}
function addShape(id){
  const c = brand.colors[0] || '#5b3df5', o = {fill:c, strokeWidth:0};
  let s;
  switch (id) {
    case 'rect': s = new fabric.Rect({width:100, height:100, ...o}); break;
    case 'round': s = new fabric.Rect({width:100, height:100, rx:18, ry:18, ...o}); break;
    case 'circle': s = new fabric.Circle({radius:50, ...o}); break;
    case 'triangle': s = new fabric.Triangle({width:100, height:90, ...o}); break;
    case 'star': s = new fabric.Polygon(PZ.starPts(5, 50, 21), o); break;
    case 'pentagon': s = new fabric.Polygon(PZ.polyPts(5), o); break;
    case 'hexagon': s = new fabric.Polygon(PZ.polyPts(6), o); break;
    case 'line': s = new fabric.Rect({width:200, height:6, ...o, fill:'#18191b'}); return place(s, 'Line', .6);
    case 'dashed': s = new fabric.Line([0, 0, 200, 0], {stroke:'#18191b', strokeWidth:6, strokeDashArray:[18, 12]}); return place(s, 'Dashed line', .6);
    default: s = new fabric.Path(PZ.SHAPE_PATHS[id], {...o, fillRule:'evenodd'});
  }
  return place(s, PZ.SHAPES.find(x => x.id === id).name);
}
function addIcon(k){
  const p = new fabric.Path(PZ.ICONS[k], {fill:'#18191b', fillRule:'evenodd', strokeWidth:0});
  return place(p, 'Icon · ' + k, .25);
}
function addText(kind, opts = {}){
  const b = base(), k = {heading:[.09, 'bold', brand.head, 'Add a heading'], sub:[.055, '600', brand.body, 'Add a subheading'], body:[.032, 'normal', brand.body, 'Add a little bit of body text']}[kind];
  const t = new fabric.Textbox(opts.text || k[3], {
    fontSize:Math.round(b * k[0]), fontWeight:k[1], fontFamily:opts.font || k[2], fill:'#18191b',
    width:Math.round(D.w * .7), textAlign:'center', lineHeight:1.15, ...opts.extra
  });
  loadFonts([t.fontFamily]).then(() => { fabric.util.clearFabricFontCache(t.fontFamily); t.initDimensions(); t.setCoords(); canvas.requestRenderAll(); });
  return place(t, kind === 'heading' ? 'Heading' : kind === 'sub' ? 'Subheading' : 'Body text', 0);
}
function addImageURL(url, name = 'Image', fit = .6){
  return new Promise((res, rej) => {
    fabric.Image.fromURL(url, img => {
      if (!img || !img.width) { toast('Could not load that image'); return rej(); }
      img.fx = {}; res(place(img, name, fit));
    }, {crossOrigin:'anonymous'});
  });
}
function addSVGText(text, name = 'Graphic'){
  fabric.loadSVGFromString(text, (objs, opts) => {
    if (!objs || !objs.length) return toast('That SVG could not be read');
    const g = fabric.util.groupSVGElements(objs, opts); place(g, name, .5);
  });
}
async function addFile(f){
  if (/svg/.test(f.type) || /\.svg$/i.test(f.name)) { addSVGText(await f.text(), f.name); return; }
  if (!/^image\//.test(f.type)) return;
  const url = await shrinkImage(await fileToDataURL(f));
  uploads.unshift(url); uploads = uploads.slice(0, 60); PZ.store.set('uploads', uploads); renderUploads();
  await addImageURL(url, f.name.replace(/\.[^.]+$/, ''));
}
function addQR(text){
  if (!text) return toast('Type a link or text first');
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
  const bg = new fabric.Rect({left:-2, top:-2, width:n + 4, height:n + 4, fill:'#ffffff'});
  const p = new fabric.Path(d, {fill:'#000000', left:0, top:0});
  const g = new fabric.Group([bg, p]);
  place(g, 'QR code', .3);
}

/* ---------------- object helpers ---------------- */
function active(){ return canvas.getActiveObject(); }
function targets(){ const a = active(); if (!a) return []; return a.type === 'activeSelection' ? a.getObjects() : [a]; }
function apply(fn, rec = true){ targets().forEach(fn); const a = active(); a && a.setCoords(); canvas.requestRenderAll(); if (rec) record(); }
function lockObj(o, on){
  o.set({locked:on, lockMovementX:on, lockMovementY:on, lockScalingX:on, lockScalingY:on, lockRotation:on, hasControls:!on});
  if (o.type === 'textbox') o.editable = !on;
}
function del(){
  const objs = targets().filter(o => !o.locked); if (!objs.length) return;
  canvas.discardActiveObject(); objs.forEach(o => canvas.remove(o)); canvas.requestRenderAll();
}
function copy(){ const a = active(); if (!a) return; a.clone(c => clipboard = c, PROPS); }
function paste(){
  if (!clipboard) return;
  clipboard.clone(c => {
    canvas.discardActiveObject();
    c.set({left:c.left + 24, top:c.top + 24, evented:true});
    if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject(o => canvas.add(o)); c.setCoords(); }
    else canvas.add(c);
    clipboard.left += 24; clipboard.top += 24;
    canvas.setActiveObject(c); canvas.requestRenderAll();
  }, PROPS);
}
function duplicate(){ copy(); setTimeout(paste, 30); }
function group(){ const a = active(); if (a && a.type === 'activeSelection') { const g = a.toGroup(); g.name = 'Group'; canvas.requestRenderAll(); record(); refreshAll(); } }
function ungroup(){ const a = active(); if (a && a.type === 'group') { a.toActiveSelection(); canvas.requestRenderAll(); record(); refreshAll(); } }
function order(kind){
  const a = active(); if (!a) return;
  ({front:() => a.bringToFront(), back:() => a.sendToBack(), fwd:() => a.bringForward(), bwd:() => a.sendBackwards()})[kind]();
  canvas.requestRenderAll(); record();
}
function alignPage(where){
  const a = active(); if (!a) return;
  const b = a.getBoundingRect(true, true);
  const dx = {left:-b.left, center:D.w / 2 - (b.left + b.width / 2), right:D.w - (b.left + b.width)}[where];
  const dy = {top:-b.top, middle:D.h / 2 - (b.top + b.height / 2), bottom:D.h - (b.top + b.height)}[where];
  a.set({left:a.left + (dx || 0), top:a.top + (dy || 0)}); a.setCoords(); canvas.requestRenderAll(); record();
}
function alignSel(where){
  const a = active(); if (!a || a.type !== 'activeSelection') return;
  const objs = a.getObjects(), hw = a.width / 2, hh = a.height / 2;
  objs.forEach(o => {
    const w = o.getScaledWidth(), h = o.getScaledHeight();
    if (where === 'left') o.set({left:-hw});
    if (where === 'right') o.set({left:hw - w});
    if (where === 'center') o.set({left:-w / 2});
    if (where === 'top') o.set({top:-hh});
    if (where === 'bottom') o.set({top:hh - h});
    if (where === 'middle') o.set({top:-h / 2});
    o.setCoords();
  });
  a.addWithUpdate(); canvas.requestRenderAll(); record();
}
function distribute(axis){
  const a = active(); if (!a || a.type !== 'activeSelection') return;
  const objs = a.getObjects().slice(); if (objs.length < 3) return toast('Select 3 or more elements to distribute');
  const k = axis === 'h' ? 'left' : 'top', sz = o => axis === 'h' ? o.getScaledWidth() : o.getScaledHeight();
  objs.sort((p, q) => p[k] - q[k]);
  const first = objs[0][k], last = objs[objs.length - 1][k] + sz(objs[objs.length - 1]);
  const total = objs.reduce((s, o) => s + sz(o), 0), gap = (last - first - total) / (objs.length - 1);
  let pos = first; objs.forEach(o => { o.set(k, pos); pos += sz(o) + gap; o.setCoords(); });
  a.addWithUpdate(); canvas.requestRenderAll(); record();
}
function flip(axis){ apply(o => o.set(axis === 'x' ? 'flipX' : 'flipY', !o[axis === 'x' ? 'flipX' : 'flipY'])); }
function setFill(o, v){
  if (o.type === 'group') o.getObjects().forEach(c => setFill(c, v));
  else if (o.type === 'line') o.set('stroke', v);
  else o.set('fill', v);
}
function getFill(o){
  if (o.type === 'group') { const c = o.getObjects().find(x => x.type !== 'rect' || o.name !== 'QR code') || o.getObjects()[0]; return c ? getFill(c) : '#000'; }
  if (o.type === 'line') return o.stroke;
  return o.fill;
}
function gradient(c1, c2, dir){
  const coords = {h:{x1:0, y1:0, x2:1, y2:0}, v:{x1:0, y1:0, x2:0, y2:1}, d:{x1:0, y1:0, x2:1, y2:1}, r:{x1:.5, y1:.5, x2:.5, y2:.5, r1:0, r2:.7}}[dir];
  return new fabric.Gradient({type:dir === 'r' ? 'radial' : 'linear', gradientUnits:'percentage', coords, colorStops:[{offset:0, color:c1}, {offset:1, color:c2}]});
}
function gradInfo(f){
  if (!(f instanceof fabric.Gradient)) return null;
  const c = f.coords, dir = f.type === 'radial' ? 'r' : (c.x2 === c.x1 ? 'v' : c.y2 === c.y1 ? 'h' : 'd');
  return {a:hex(f.colorStops[0].color), b:hex(f.colorStops[f.colorStops.length - 1].color), dir};
}
function applyFx(img){
  const f = img.fx || {}, F = fabric.Image.filters, arr = [];
  if (f.brightness) arr.push(new F.Brightness({brightness:+f.brightness}));
  if (f.contrast) arr.push(new F.Contrast({contrast:+f.contrast}));
  if (f.saturation) arr.push(new F.Saturation({saturation:+f.saturation}));
  if (f.hue) arr.push(new F.HueRotation({rotation:+f.hue}));
  if (f.blur) arr.push(new F.Blur({blur:+f.blur}));
  if (f.gray) arr.push(new F.Grayscale());
  if (f.sepia) arr.push(new F.Sepia());
  if (f.invert) arr.push(new F.Invert());
  img.filters = arr; img.applyFilters(); canvas.requestRenderAll();
}
const FX_PRESETS = {
  Original:{}, Vivid:{saturation:.4, contrast:.12}, Mono:{gray:true, contrast:.12}, Vintage:{sepia:true, contrast:-.1, brightness:.05},
  Cool:{hue:-.08, saturation:.1}, Warm:{hue:.04, saturation:.2, brightness:.04}, Drama:{contrast:.4, saturation:-.25, brightness:-.05}, Fade:{contrast:-.25, brightness:.1, saturation:-.2}
};
function textEffect(o, kind){
  const fs = o.fontSize, col = typeof o.fill === 'string' ? o.fill : '#18191b';
  if (o.fill === 'rgba(0,0,0,0)' && o.stroke) o.set('fill', o.stroke);
  o.set({shadow:null, stroke:null, strokeWidth:0, paintFirst:'fill'});
  const c = typeof o.fill === 'string' ? o.fill : col;
  if (kind === 'shadow') o.set('shadow', new fabric.Shadow({color:'rgba(0,0,0,.45)', blur:fs * .12, offsetX:fs * .06, offsetY:fs * .06}));
  if (kind === 'lift') o.set('shadow', new fabric.Shadow({color:'rgba(0,0,0,.35)', blur:fs * .45, offsetX:0, offsetY:fs * .1}));
  if (kind === 'outline') o.set({stroke:hex(c) === '#000000' ? '#ffffff' : '#000000', strokeWidth:Math.max(1, fs / 18), paintFirst:'stroke'});
  if (kind === 'hollow') o.set({stroke:c, strokeWidth:Math.max(1, fs / 30), fill:'rgba(0,0,0,0)'});
  if (kind === 'neon') o.set('shadow', new fabric.Shadow({color:c, blur:fs * .6, offsetX:0, offsetY:0}));
  if (kind === 'echo') o.set('shadow', new fabric.Shadow({color:new fabric.Color(c).setAlpha(.45).toRgba(), blur:0, offsetX:fs * .08, offsetY:fs * .08}));
  if (kind === 'glitch') o.set('shadow', new fabric.Shadow({color:'#00e5ff', blur:0, offsetX:-fs * .05, offsetY:0}));
}
function setAsBackground(img){
  const s = Math.max(D.w / img.width, D.h / img.height);
  img.set({scaleX:s, scaleY:s, angle:0, originX:'left', originY:'top', left:(D.w - img.width * s) / 2, top:(D.h - img.height * s) / 2, name:'Background image'});
  img.sendToBack(); lockObj(img, true); img.setCoords(); canvas.discardActiveObject(); canvas.requestRenderAll(); record();
}

/* ---------------- background remover (runs fully in-browser) ---------------- */
let bgLib = null;
async function removeBg(img){
  toast('<span class="spin"></span> Removing background… first run downloads the AI model (~40 MB)', 0);
  try {
    if (!bgLib) {
      try { bgLib = await import('https://esm.sh/@imgly/background-removal@1.4.5'); }
      catch (e) { bgLib = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm'); }
    }
    const src = img.getSrc(), blob = await (await fetch(src)).blob();
    const out = await bgLib.removeBackground(blob);
    const url = await blobToDataURL(out);
    img.setSrc(url, () => { applyFx(img); canvas.requestRenderAll(); record(); toast('Background removed ✓'); }, {crossOrigin:'anonymous'});
  } catch (e) {
    console.error(e); toast('Background removal failed — check your connection and try again', 4000);
  }
}

/* ---------------- magic resize ---------------- */
function transformJSON(json, w0, h0, w1, h1){
  return new Promise(async res => {
    await loadFonts(fontsIn(json));
    const sc = new fabric.StaticCanvas(document.createElement('canvas'), {width:w1, height:h1});
    sc.loadFromJSON(json, () => {
      const s = Math.min(w1 / w0, h1 / h0), cover = Math.max(w1 / w0, h1 / h0);
      sc.getObjects().forEach(o => {
        const b = o.getBoundingRect(true, true);
        const full = b.width >= w0 * .95 && b.height >= h0 * .95;
        const k = full ? cover : s, c = o.getCenterPoint();
        o.set({scaleX:o.scaleX * k, scaleY:o.scaleY * k});
        o.setPositionByOrigin(new fabric.Point((c.x - w0 / 2) * k + w1 / 2, (c.y - h0 / 2) * k + h1 / 2), 'center', 'center');
        o.setCoords();
      });
      const out = sc.toJSON(PROPS); sc.dispose(); res(out);
    });
  });
}
async function magicResize(w, h, asCopy){
  commitPage();
  toast('<span class="spin"></span> Resizing…', 0);
  if (!asCopy) await snapshot(true);
  const pages = [];
  for (const p of D.pages) pages.push({id:uid(), json:await transformJSON(p.json, D.w, D.h, w, h), thumb:''});
  if (asCopy) { const nd = {...newDesign(w, h, D.title + ' (' + w + '×' + h + ')'), pages}; await openDesign(nd); }
  else { D.pages = pages; D.w = w; D.h = h; await openDesign(D); }
  dirty(); toast('Resized to ' + w + ' × ' + h + ' px');
}

/* ---------------- export ---------------- */
function renderPageURL(json, mult, fmt, transparent){
  return new Promise(async res => {
    await loadFonts(fontsIn(json));
    const sc = new fabric.StaticCanvas(document.createElement('canvas'), {width:D.w, height:D.h, enableRetinaScaling:false});
    sc.loadFromJSON(json, () => {
      if (transparent && fmt === 'png') sc.backgroundColor = null;
      else if (!sc.backgroundColor || fmt === 'jpeg') sc.backgroundColor = sc.backgroundColor || '#ffffff';
      sc.renderAll();
      const url = sc.toDataURL({format:fmt, quality:.92, multiplier:mult});
      sc.dispose(); res(url);
    });
  });
}
function renderPageSVG(json){
  return new Promise(res => {
    const sc = new fabric.StaticCanvas(document.createElement('canvas'), {width:D.w, height:D.h});
    sc.loadFromJSON(json, () => { const s = sc.toSVG(); sc.dispose(); res(s); });
  });
}
async function doExport(o){
  commitPage();
  const idx = o.pages === 'all' ? D.pages.map((_, i) => i) : [D.cur], name = safeName();
  toast('<span class="spin"></span> Preparing download…', 0);
  try {
    if (o.fmt === 'json') {
      const blob = new Blob([JSON.stringify({app:'inkfold', v:1, title:D.title, w:D.w, h:D.h, pages:D.pages.map(p => p.json)})], {type:'application/json'});
      download(URL.createObjectURL(blob), name + '.inkfold.json');
    } else if (o.fmt === 'pdf') {
      const {jsPDF} = window.jspdf, orient = D.w > D.h ? 'l' : 'p';
      const pdf = new jsPDF({orientation:orient, unit:'px', format:[D.w, D.h], hotfixes:['px_scaling'], compress:true});
      for (let n = 0; n < idx.length; n++) {
        const url = await renderPageURL(D.pages[idx[n]].json, o.scale, o.quality === 'print' ? 'png' : 'jpeg', false);
        if (n) pdf.addPage([D.w, D.h], orient);
        pdf.addImage(url, o.quality === 'print' ? 'PNG' : 'JPEG', 0, 0, D.w, D.h, undefined, 'FAST');
      }
      pdf.save(name + '.pdf');
    } else if (o.fmt === 'svg') {
      for (const i of idx) {
        const s = await renderPageSVG(D.pages[i].json);
        download(URL.createObjectURL(new Blob([s], {type:'image/svg+xml'})), name + (idx.length > 1 ? '-' + (i + 1) : '') + '.svg');
      }
    } else {
      for (const i of idx) {
        const url = await renderPageURL(D.pages[i].json, o.scale, o.fmt, o.transparent);
        download(url, name + (idx.length > 1 ? '-' + (i + 1) : '') + '.' + (o.fmt === 'jpeg' ? 'jpg' : 'png'));
        await new Promise(r => setTimeout(r, 300));
      }
    }
    toast('Download ready ✓');
  } catch (e) { console.error(e); toast('Export failed: ' + e.message, 4000); }
}

/* ---------------- pages ---------------- */
function renderPages(){
  const el = $('#pages'), hh = isMobile() ? 50 : 70, ww = Math.round(hh * D.w / D.h);
  el.innerHTML = D.pages.map((p, i) => `<div class="pg ${i === D.cur ? 'on' : ''}" data-i="${i}" style="width:${ww}px;background-image:url('${p.thumb || ''}')"><span>${i + 1}</span></div>`).join('') +
    '<button class="pg-add" id="pgAdd" title="Add page">+</button>';
}
$('#pages').addEventListener('click', async e => {
  if (e.target.closest('#pgAdd')) return addPage();
  const pg = e.target.closest('.pg'); if (!pg) return;
  const i = +pg.dataset.i; if (i === D.cur) return;
  commitPage(); await loadPage(i); renderPages();
});
async function addPage(json){
  commitPage();
  const p = blankPage(); if (json) p.json = json;
  D.pages.splice(D.cur + 1, 0, p); await loadPage(D.cur + 1); renderPages(); dirty();
}
async function dupPage(){ commitPage(); await addPage(JSON.parse(JSON.stringify(D.pages[D.cur].json))); }
async function delPage(){
  if (D.pages.length < 2) return toast('A design needs at least one page');
  D.pages.splice(D.cur, 1); await loadPage(Math.max(0, D.cur - 1)); renderPages(); dirty();
}
async function movePage(dir){
  const j = D.cur + dir; if (j < 0 || j >= D.pages.length) return;
  commitPage(); const p = D.pages.splice(D.cur, 1)[0]; D.pages.splice(j, 0, p); D.cur = j; renderPages(); refreshAll(); dirty();
}

/* ---------------- context toolbar & properties ---------------- */
function refreshAll(){ renderCtx(); renderProps(); renderLayers(); }
canvas.on('selection:created', onSel); canvas.on('selection:updated', onSel);
canvas.on('selection:cleared', () => { refreshAll(); $('#props').classList.remove('open'); });
function onSel(){ refreshAll(); if (isMobile()) { closePanel(); $('#props').classList.add('open'); } }
['object:added', 'object:removed', 'object:modified', 'text:changed'].forEach(ev => canvas.on(ev, () => { if (!loading) { record(); renderLayers(); } }));
canvas.on('object:modified', () => renderProps());

function renderCtx(){
  const a = active(), el = $('#ctx');
  if (!a) {
    el.innerHTML = `<span class="muted">Page ${D.cur + 1} of ${D.pages.length} · ${D.w}×${D.h}px</span><span class="sep"></span>
      <button class="btn" data-a="pgdup">Duplicate page</button><button class="btn" data-a="pgdel">Delete page</button>
      <button class="btn" data-a="pgl">← Move</button><button class="btn" data-a="pgr">Move →</button><span class="sep"></span>
      <button class="btn" data-a="selall">Select all</button>`;
    return;
  }
  const multi = a.type === 'activeSelection', img = a.type === 'image', txt = a.type === 'textbox';
  el.innerHTML = [
    txt ? `<button class="btn" data-a="edit">Edit text</button>` : '',
    img ? `<button class="btn" data-a="rmbg">✨ Remove background <span class="badge">PRO</span></button><button class="btn" data-a="asbg">Set as background</button>` : '',
    multi ? `<button class="btn" data-a="group">Group</button>` : '',
    a.type === 'group' ? `<button class="btn" data-a="ungroup">Ungroup</button>` : '',
    `<button class="btn" data-a="dup">Duplicate</button>`,
    `<button class="btn" data-a="lock">${a.locked ? 'Unlock' : 'Lock'}</button>`,
    `<button class="btn" data-a="fx">Flip ↔</button><button class="btn" data-a="fy">Flip ↕</button>`,
    `<span class="sep"></span><button class="btn" data-a="fwd">Forward</button><button class="btn" data-a="bwd">Backward</button>`,
    `<span class="sep"></span><button class="btn danger" data-a="del">Delete</button>`
  ].join('');
}
$('#ctx').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = active();
  ({
    pgdup:dupPage, pgdel:delPage, pgl:() => movePage(-1), pgr:() => movePage(1),
    selall:() => { const objs = canvas.getObjects().filter(o => !o.locked); if (!objs.length) return; canvas.setActiveObject(new fabric.ActiveSelection(objs, {canvas})); canvas.requestRenderAll(); },
    edit:() => { a.enterEditing(); a.selectAll(); a.hiddenTextarea && a.hiddenTextarea.focus(); canvas.requestRenderAll(); },
    rmbg:() => removeBg(a), asbg:() => setAsBackground(a),
    group, ungroup, dup:duplicate, del,
    lock:() => { apply(o => lockObj(o, !a.locked)); refreshAll(); },
    fx:() => flip('x'), fy:() => flip('y'), fwd:() => order('fwd'), bwd:() => order('bwd')
  })[b.dataset.a]();
});

function swatchRow(prop){
  const cols = [...new Set([...brand.colors, ...PALETTE])];
  return `<div class="swatches">${cols.map(c => `<button class="sw" style="background:${c}" data-sw="${prop}" data-c="${c}" title="${c}"></button>`).join('')}</div>`;
}
function slider(label, p, v, min, max, step){
  return `<div class="kv"><span>${label}</span><input type="range" data-p="${p}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${(+v).toFixed(step < 1 ? 2 : 0)}</output></div>`;
}
function renderProps(){
  const a = active(), el = $('#props');
  if (!a) {
    const bg = canvas.backgroundColor;
    el.innerHTML = `<h4>Page background</h4>
      <div class="row"><input type="color" data-p="bg" value="${hex(typeof bg === 'string' && bg ? bg : '#ffffff')}"><button class="btn" data-x="bgnone">Transparent</button></div>
      ${swatchRow('bg')}
      <h4>Size</h4><p class="hint">${D.w} × ${D.h} px</p><button class="btn wide" data-x="resize">✨ Magic Resize</button>
      <h4>Tips</h4><p class="hint">Double-click text to edit · Ctrl+D duplicate · Ctrl+G group · Arrows nudge (Shift = 10px) · Ctrl+scroll zoom · Paste images straight in.</p>`;
    return;
  }
  const one = a.type !== 'activeSelection' ? a : null, f = getFill(one || a.getObjects()[0]), gi = gradInfo(f);
  const canFill = !one || one.type !== 'image';
  let h = '';
  if (!one) {
    h += `<h4>Align selection</h4><div class="grid3">
      <button class="btn" data-al="left">Left</button><button class="btn" data-al="center">Center</button><button class="btn" data-al="right">Right</button>
      <button class="btn" data-al="top">Top</button><button class="btn" data-al="middle">Middle</button><button class="btn" data-al="bottom">Bottom</button></div>
      <div class="row"><button class="btn" data-x="disth">Distribute ↔</button><button class="btn" data-x="distv">Distribute ↕</button></div>`;
  }
  if (one && one.type === 'textbox') {
    const bold = one.fontWeight === 'bold' || +one.fontWeight >= 600;
    h += `<h4>Text</h4>
      <select class="inp" data-p="font">${PZ.FONTS.map(fn => `<option ${fn === one.fontFamily ? 'selected' : ''} style="font-family:'${fn}'">${fn}</option>`).join('')}</select>
      <div class="row"><input class="num" type="number" data-p="fontSize" value="${Math.round(one.fontSize)}" min="4" max="2000">
        <div class="seg" style="flex:1"><button data-t="bold" class="${bold ? 'on' : ''}"><b>B</b></button><button data-t="italic" class="${one.fontStyle === 'italic' ? 'on' : ''}"><i>I</i></button><button data-t="underline" class="${one.underline ? 'on' : ''}"><u>U</u></button><button data-t="linethrough" class="${one.linethrough ? 'on' : ''}"><s>S</s></button></div></div>
      <div class="seg">${['left', 'center', 'right', 'justify'].map(x => `<button data-ta="${x}" class="${one.textAlign === x ? 'on' : ''}">${{left:'⇤', center:'≡', right:'⇥', justify:'☰'}[x]}</button>`).join('')}</div>
      ${slider('Spacing', 'charSpacing', one.charSpacing || 0, -200, 1000, 10)}
      ${slider('Line height', 'lineHeight', one.lineHeight, .6, 3, .05)}
      <div class="row"><button class="btn" data-case="up">AA</button><button class="btn" data-case="low">aa</button><button class="btn" data-case="title">Aa</button></div>
      <h4>Effects</h4><div class="grid3">${['none', 'shadow', 'lift', 'outline', 'hollow', 'neon', 'echo', 'glitch'].map(k => `<button class="btn" data-fxt="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`;
  }
  if (canFill) {
    h += `<h4>Colour</h4>
      <div class="seg" style="margin-bottom:6px"><button data-ft="solid" class="${gi ? '' : 'on'}">Solid</button><button data-ft="grad" class="${gi ? 'on' : ''}">Gradient</button></div>`;
    if (gi) h += `<div class="row"><input type="color" data-p="g1" value="${gi.a}"><input type="color" data-p="g2" value="${gi.b}">
      <select class="inp" data-p="gdir"><option value="h" ${gi.dir === 'h' ? 'selected' : ''}>→ Horizontal</option><option value="v" ${gi.dir === 'v' ? 'selected' : ''}>↓ Vertical</option><option value="d" ${gi.dir === 'd' ? 'selected' : ''}>↘ Diagonal</option><option value="r" ${gi.dir === 'r' ? 'selected' : ''}>◎ Radial</option></select></div>`;
    else h += `<div class="row"><input type="color" data-p="fill" value="${hex(f)}"></div>${swatchRow('fill')}`;
  }
  if (one && one.type === 'image') {
    const fx = one.fx || {};
    h += `<h4>Filters</h4><div class="grid3">${Object.keys(FX_PRESETS).map(k => `<button class="btn" data-fxp="${k}">${k}</button>`).join('')}</div>
      <h4>Adjust</h4>
      ${slider('Brightness', 'fx.brightness', fx.brightness || 0, -1, 1, .02)}
      ${slider('Contrast', 'fx.contrast', fx.contrast || 0, -1, 1, .02)}
      ${slider('Saturation', 'fx.saturation', fx.saturation || 0, -1, 1, .02)}
      ${slider('Hue', 'fx.hue', fx.hue || 0, -1, 1, .02)}
      ${slider('Blur', 'fx.blur', fx.blur || 0, 0, 1, .02)}
      <div class="row">${['gray', 'sepia', 'invert'].map(k => `<button class="chip ${fx[k] ? 'on' : ''}" data-fxb="${k}">${k === 'gray' ? 'B&W' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`;
  }
  if (one && (one.type === 'rect')) h += `<h4>Corners</h4>${slider('Radius', 'rx', one.rx || 0, 0, Math.round(Math.min(one.width, one.height) / 2), 1)}`;
  const sh = one && one.shadow;
  if (one) h += `<h4>Border</h4><div class="row"><input type="color" data-p="stroke" value="${hex(one.stroke || '#000000')}"><input class="num" type="number" data-p="strokeWidth" value="${one.strokeWidth || 0}" min="0" max="200"><select class="inp" data-p="dash" style="flex:1"><option value="">Solid</option><option value="d" ${one.strokeDashArray ? 'selected' : ''}>Dashed</option></select></div>
    <h4>Shadow</h4><div class="row"><button class="chip ${sh ? 'on' : ''}" data-x="shadow">${sh ? 'On' : 'Off'}</button>${sh ? `<input type="color" data-p="shc" value="${hex(sh.color)}">` : ''}</div>
    ${sh ? slider('Blur', 'shb', sh.blur, 0, 200, 1) + slider('Offset', 'sho', sh.offsetY, -100, 100, 1) : ''}`;
  h += `<h4>Transparency</h4>${slider('Opacity', 'opacity', one ? one.opacity : 1, 0, 1, .01)}`;
  if (one) h += slider('Rotate', 'angle', Math.round(one.angle || 0), 0, 360, 1);
  h += `<h4>Position on page</h4><div class="grid3">
    <button class="btn" data-ap="left">Left</button><button class="btn" data-ap="center">Center</button><button class="btn" data-ap="right">Right</button>
    <button class="btn" data-ap="top">Top</button><button class="btn" data-ap="middle">Middle</button><button class="btn" data-ap="bottom">Bottom</button></div>
    <h4>Layer</h4><div class="grid3"><button class="btn" data-or="front">To front</button><button class="btn" data-or="fwd">Forward</button><button class="btn" data-or="bwd">Backward</button><button class="btn" data-or="back">To back</button></div>`;
  el.innerHTML = h;
}

$('#props').addEventListener('input', e => {
  const t = e.target, p = t.dataset.p; if (!p) return;
  const v = t.type === 'range' || t.type === 'number' ? +t.value : t.value;
  if (t.nextElementSibling && t.nextElementSibling.tagName === 'OUTPUT') t.nextElementSibling.textContent = (+v).toFixed(+t.step < 1 ? 2 : 0);
  const a = active();
  if (p === 'bg') { canvas.backgroundColor = v; canvas.requestRenderAll(); return record(); }
  if (!a) return;
  if (p === 'font') return targets().forEach(o => o.type === 'textbox' && useFont(o, v).then(record));
  if (p === 'fill') return apply(o => setFill(o, v));
  if (p === 'g1' || p === 'g2' || p === 'gdir') {
    const g1 = $('#props [data-p=g1]').value, g2 = $('#props [data-p=g2]').value, dir = $('#props [data-p=gdir]').value;
    return apply(o => setFill(o, gradient(g1, g2, dir)));
  }
  if (p.startsWith('fx.')) { const k = p.slice(3); return apply(o => { if (o.type !== 'image') return; o.fx = {...(o.fx || {}), [k]:v}; applyFx(o); }); }
  if (p === 'rx') return apply(o => o.set({rx:v, ry:v}));
  if (p === 'stroke') return apply(o => o.set({stroke:v, strokeWidth:o.strokeWidth || Math.max(2, base() / 200)}));
  if (p === 'strokeWidth') return apply(o => o.set({strokeWidth:v, stroke:o.stroke || '#000000'}));
  if (p === 'dash') return apply(o => o.set('strokeDashArray', v ? [Math.max(4, o.strokeWidth * 3), Math.max(4, o.strokeWidth * 2)] : null));
  if (p === 'shc' || p === 'shb' || p === 'sho') return apply(o => { if (!o.shadow) return; const s = o.shadow; if (p === 'shc') s.color = v; if (p === 'shb') s.blur = v; if (p === 'sho') { s.offsetX = v * .6; s.offsetY = v; } o.dirty = true; });
  if (p === 'angle') { a.rotate(v); a.setCoords(); canvas.requestRenderAll(); return record(); }
  apply(o => o.set(p, v));
});
$('#props').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset, a = active();
  if (d.sw) {
    if (d.sw === 'bg') { canvas.backgroundColor = d.c; canvas.requestRenderAll(); record(); }
    else apply(o => setFill(o, d.c));
    return renderProps();
  }
  if (d.x === 'bgnone') { canvas.backgroundColor = ''; canvas.requestRenderAll(); return record(); }
  if (d.x === 'resize') return openResize();
  if (!a) return;
  if (d.al) return alignSel(d.al);
  if (d.x === 'disth') return distribute('h');
  if (d.x === 'distv') return distribute('v');
  if (d.ap) return alignPage(d.ap);
  if (d.or) return order(d.or);
  if (d.t) {
    apply(o => {
      if (o.type !== 'textbox') return;
      if (d.t === 'bold') o.set('fontWeight', (o.fontWeight === 'bold' || +o.fontWeight >= 600) ? 'normal' : 'bold');
      if (d.t === 'italic') o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic');
      if (d.t === 'underline') o.set('underline', !o.underline);
      if (d.t === 'linethrough') o.set('linethrough', !o.linethrough);
    });
    return renderProps();
  }
  if (d.ta) { apply(o => o.type === 'textbox' && o.set('textAlign', d.ta)); return renderProps(); }
  if (d.case) return apply(o => { if (o.type !== 'textbox') return; const s = o.text; o.set('text', d.case === 'up' ? s.toUpperCase() : d.case === 'low' ? s.toLowerCase() : s.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase())); });
  if (d.fxt) { apply(o => o.type === 'textbox' && textEffect(o, d.fxt)); return renderProps(); }
  if (d.ft) {
    const cur = getFill(a.type === 'activeSelection' ? a.getObjects()[0] : a);
    if (d.ft === 'grad' && !gradInfo(cur)) { const c = hex(typeof cur === 'string' ? cur : '#5b3df5'); apply(o => setFill(o, gradient(c, '#00c4cc', 'h'))); }
    if (d.ft === 'solid' && gradInfo(cur)) { const g = gradInfo(cur); apply(o => setFill(o, g.a)); }
    return renderProps();
  }
  if (d.fxp) { apply(o => { if (o.type !== 'image') return; o.fx = {...FX_PRESETS[d.fxp]}; applyFx(o); }); return renderProps(); }
  if (d.fxb) { apply(o => { if (o.type !== 'image') return; o.fx = {...(o.fx || {}), [d.fxb]:!(o.fx || {})[d.fxb]}; applyFx(o); }); return renderProps(); }
  if (d.x === 'shadow') {
    apply(o => o.set('shadow', o.shadow ? null : new fabric.Shadow({color:'rgba(0,0,0,0.4)', blur:Math.round(base() / 50), offsetX:Math.round(base() / 120), offsetY:Math.round(base() / 100)})));
    return renderProps();
  }
});

/* ---------------- layers ---------------- */
const TYPE_ICON = {textbox:'T', image:'▣', rect:'■', circle:'●', triangle:'▲', polygon:'⬟', path:'✎', group:'❒', line:'—'};
function renderLayers(){
  if (!$('section[data-pane=layers]').classList.contains('on')) return;
  const sel = targets(), objs = canvas.getObjects().slice().reverse();
  $('#layerList').innerHTML = objs.length ? objs.map(o => {
    const i = canvas.getObjects().indexOf(o);
    const nm = o.type === 'textbox' ? (o.text || '').slice(0, 30) : (o.name || (o.type[0].toUpperCase() + o.type.slice(1)));
    return `<li data-i="${i}" class="${sel.includes(o) ? 'sel' : ''}"><span class="thumb" style="display:grid;place-items:center">${TYPE_ICON[o.type] || '◆'}</span>
      <span class="nm">${esc(nm)}</span>
      <button data-l="up" title="Move up">▲</button><button data-l="down" title="Move down">▼</button>
      <button data-l="vis" title="Show/hide">${o.visible ? '👁' : '—'}</button><button data-l="lock" title="Lock">${o.locked ? '🔒' : '🔓'}</button></li>`;
  }).join('') : '<p class="hint">No elements on this page yet.</p>';
}
$('#layerList').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const o = canvas.getObjects()[+li.dataset.i], b = e.target.closest('button');
  if (!o) return;
  if (b) {
    const l = b.dataset.l;
    if (l === 'up') o.bringForward(); if (l === 'down') o.sendBackwards();
    if (l === 'vis') { o.visible = !o.visible; if (!o.visible) canvas.discardActiveObject(); }
    if (l === 'lock') lockObj(o, !o.locked);
    canvas.requestRenderAll(); record(); renderLayers(); return;
  }
  if (o.visible) { canvas.setActiveObject(o); canvas.requestRenderAll(); }
});

/* ---------------- left panel ---------------- */
function closePanel(){ $('#panel').classList.add('closed'); $$('#rail button').forEach(b => b.classList.remove('on')); }
$('#rail').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const tab = b.dataset.tab, panel = $('#panel');
  if (b.classList.contains('on') && !panel.classList.contains('closed')) return closePanel();
  $$('#rail button').forEach(x => x.classList.toggle('on', x === b));
  $$('#panel section').forEach(s => s.classList.toggle('on', s.dataset.pane === tab));
  panel.classList.remove('closed'); $('#props').classList.remove('open');
  if (tab === 'layers') renderLayers();
  if (tab === 'photos' && !$('#photoGrid').children.length) searchPhotos();
  if (!isMobile()) setTimeout(() => setZoom(zoom), 220);
});

/* templates */
function tplJSON(t){ return normalize({version:fabric.version, background:t.bg, objects:JSON.parse(JSON.stringify(t.objects))}); }
async function renderTemplates(){
  const g = $('#tplGrid');
  g.innerHTML = PZ.TEMPLATES.map((t, i) => `<div class="tile tpl" data-tpl="${i}" title="${esc(t.name)}"><img alt="" style="aspect-ratio:${t.w}/${t.h}"><span class="cap">${esc(t.name)}</span></div>`).join('');
  for (let i = 0; i < PZ.TEMPLATES.length; i++) {
    const t = PZ.TEMPLATES[i]; await loadFonts(fontsIn(tplJSON(t)));
    const sc = new fabric.StaticCanvas(document.createElement('canvas'), {width:t.w, height:t.h, enableRetinaScaling:false});
    await new Promise(r => sc.loadFromJSON(tplJSON(t), r));
    sc.renderAll();
    g.querySelector(`[data-tpl="${i}"] img`).src = sc.toDataURL({format:'png', multiplier:280 / Math.max(t.w, t.h)});
    sc.dispose();
  }
}
$('#tplGrid').addEventListener('click', async e => {
  const el = e.target.closest('[data-tpl]'); if (!el) return;
  const t = PZ.TEMPLATES[+el.dataset.tpl]; let json = tplJSON(t);
  const empty = canvas.getObjects().length === 0;
  if (empty && D.pages.length === 1 && (t.w !== D.w || t.h !== D.h)) { D.w = t.w; D.h = t.h; setZoom(fitZoom()); }
  else if (t.w !== D.w || t.h !== D.h) json = await transformJSON(json, t.w, t.h, D.w, D.h);
  if (empty) { D.pages[D.cur].json = json; await loadPage(D.cur); renderPages(); dirty(); }
  else await addPage(json);
  if (isMobile()) closePanel();
  toast('Template applied — click any text to make it yours');
});

/* elements */
$('#shapeGrid').innerHTML = PZ.SHAPES.map(s => `<button class="tile" data-shape="${s.id}" title="${s.name}"><svg viewBox="0 0 100 100" fill="#5b3df5">${s.svg}</svg></button>`).join('');
$('#iconGrid').innerHTML = Object.entries(PZ.ICONS).map(([k, d]) => `<button class="tile" data-icon="${k}" title="${k}"><svg viewBox="0 0 24 24" fill="#18191b"><path fill-rule="evenodd" d="${d}"/></svg></button>`).join('');
$('#shapeGrid').addEventListener('click', e => { const b = e.target.closest('[data-shape]'); b && addShape(b.dataset.shape); });
$('#iconGrid').addEventListener('click', e => { const b = e.target.closest('[data-icon]'); b && addIcon(b.dataset.icon); });
$('#qrAdd').onclick = () => addQR($('#qrText').value.trim());

/* text */
$$('.txt-add').forEach(b => b.onclick = () => addText(b.dataset.text));
$('#comboGrid').innerHTML = PZ.COMBOS.map((c, i) => `<button class="tile combo" data-combo="${i}"><span style="font-family:'${c.h}';font-size:22px;font-weight:${c.hw}">${c.ht}</span><span style="font-family:'${c.b}';font-size:12px">${c.bt}</span></button>`).join('');
$('#comboGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-combo]'); if (!b) return;
  const c = PZ.COMBOS[+b.dataset.combo], bs = base();
  loadFonts([c.h, c.b]).then(() => {
    const h = new fabric.Textbox(c.ht, {fontFamily:c.h, fontWeight:c.hw, fontSize:Math.round(bs * .1), width:D.w * .7, textAlign:'center', fill:'#18191b'});
    const s = new fabric.Textbox(c.bt, {fontFamily:c.b, fontSize:Math.round(bs * .04), width:D.w * .7, textAlign:'center', fill:'#545454', top:h.height + bs * .02});
    const g = new fabric.Group([h, s]); g.name = 'Text combo'; place(g, 'Text combo', 0);
  });
});

/* uploads */
function renderUploads(){ $('#uploadGrid').innerHTML = uploads.map((u, i) => `<button class="tile photo" data-up="${i}"><img src="${u}" alt=""></button>`).join(''); }
$('#fileIn').onchange = async e => { for (const f of e.target.files) await addFile(f); e.target.value = ''; };
$('#uploadGrid').addEventListener('click', e => { const b = e.target.closest('[data-up]'); b && addImageURL(uploads[+b.dataset.up]); });
const drop = $('#drop');
['dragover', 'dragenter'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, () => drop.classList.remove('over')));
document.addEventListener('drop', async e => { e.preventDefault(); for (const f of e.dataTransfer.files) await addFile(f); });
document.addEventListener('paste', async e => {
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const files = Array.from(e.clipboardData.items).filter(i => i.kind === 'file').map(i => i.getAsFile());
  if (files.length) { e.preventDefault(); for (const f of files) await addFile(f); }
  else if (clipboard) paste();
});

/* photos (Openverse — free, no API key) */
async function searchPhotos(){
  const q = $('#photoQ').value.trim() || 'nature', g = $('#photoGrid');
  g.innerHTML = '<p class="hint"><span class="spin"></span> Searching…</p>';
  try {
    const r = await fetch('https://api.openverse.org/v1/images/?page_size=24&mature=false&q=' + encodeURIComponent(q));
    const j = await r.json();
    g.innerHTML = (j.results || []).map(p => `<button class="tile photo" data-ph="${esc(p.thumbnail)}" title="${esc((p.title || 'Photo') + ' — ' + (p.creator || 'unknown') + ' · ' + (p.license || '').toUpperCase())}"><img src="${esc(p.thumbnail)}" alt="" loading="lazy"></button>`).join('') || '<p class="hint">No results.</p>';
  } catch (e) { g.innerHTML = '<p class="hint">Photo search is unavailable right now.</p>'; }
}
$('#photoGo').onclick = searchPhotos;
$('#photoQ').addEventListener('keydown', e => { if (e.key === 'Enter') searchPhotos(); });
$('#photoGrid').addEventListener('click', async e => {
  const b = e.target.closest('[data-ph]'); if (!b) return;
  toast('<span class="spin"></span> Adding photo…', 0);
  const u = b.dataset.ph;
  for (const url of [u + (u.includes('?') ? '&' : '?') + 'full_size=true', u]) {
    try { const blob = await (await fetch(url)).blob(); if (!/^image/.test(blob.type)) continue; await addImageURL(await shrinkImage(await blobToDataURL(blob)), 'Photo'); toast('Photo added'); return; } catch (e) {}
  }
  toast('Could not fetch that photo');
});

/* draw */
function setBrush(kind){
  const B = {Pencil:fabric.PencilBrush, Circle:fabric.CircleBrush, Spray:fabric.SprayBrush}[kind] || fabric.PencilBrush;
  canvas.freeDrawingBrush = new B(canvas);
  canvas.freeDrawingBrush.color = $('#brushColor').value; canvas.freeDrawingBrush.width = +$('#brushSize').value;
}
setBrush('Pencil');
$('#drawToggle').onclick = () => {
  canvas.isDrawingMode = !canvas.isDrawingMode;
  $('#drawToggle').textContent = canvas.isDrawingMode ? 'Stop drawing' : 'Start drawing';
  $('#drawToggle').classList.toggle('primary', canvas.isDrawingMode);
  if (isMobile() && canvas.isDrawingMode) closePanel();
  toast(canvas.isDrawingMode ? 'Drawing on — open the Draw tab again to stop' : 'Drawing off');
};
$('#brushColor').oninput = e => canvas.freeDrawingBrush.color = e.target.value;
$('#brushSize').oninput = e => canvas.freeDrawingBrush.width = +e.target.value;
$$('[data-brush]').forEach(b => b.onclick = () => { $$('[data-brush]').forEach(x => x.classList.toggle('on', x === b)); setBrush(b.dataset.brush); });
canvas.on('path:created', e => { e.path.name = 'Drawing'; });

/* brand kit */
async function saveBrand(){ await PZ.store.set('brand', brand); renderBrand(); renderProps(); }
function renderBrand(){
  $('#brandColors').innerHTML = brand.colors.map((c, i) => `<span class="sw" style="background:${c}" data-bc="${i}" title="${c}"><button class="del" data-bdel="${i}">×</button></span>`).join('');
  const opts = sel => PZ.FONTS.map(f => `<option ${f === sel ? 'selected' : ''}>${f}</option>`).join('');
  $('#brandHead').innerHTML = opts(brand.head); $('#brandBody').innerHTML = opts(brand.body);
  $('#brandLogos').innerHTML = brand.logos.map((u, i) => `<button class="tile" data-logo="${i}"><img src="${u}" alt="" style="object-fit:contain"></button>`).join('') || '<p class="hint">No logos yet.</p>';
}
$('#brandColorAdd').onclick = () => { const c = $('#brandColorIn').value; if (!brand.colors.includes(c)) brand.colors.push(c); saveBrand(); };
$('#brandColors').addEventListener('click', e => {
  const d = e.target.closest('[data-bdel]'); if (d) { brand.colors.splice(+d.dataset.bdel, 1); return saveBrand(); }
  const s = e.target.closest('[data-bc]'); if (s && active()) apply(o => setFill(o, brand.colors[+s.dataset.bc]));
});
$('#brandHead').onchange = e => { brand.head = e.target.value; saveBrand(); };
$('#brandBody').onchange = e => { brand.body = e.target.value; saveBrand(); };
$('#brandApply').onclick = async () => {
  const texts = canvas.getObjects().filter(o => o.type === 'textbox'); if (!texts.length) return toast('No text on this page');
  const max = Math.max(...texts.map(t => t.fontSize * (t.scaleY || 1)));
  for (const t of texts) await useFont(t, t.fontSize * (t.scaleY || 1) >= max * .6 ? brand.head : brand.body);
  record(); toast('Brand fonts applied');
};
$('#logoIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  brand.logos.push(await shrinkImage(await fileToDataURL(f), 1600)); e.target.value = ''; saveBrand();
};
$('#brandLogos').addEventListener('click', e => { const b = e.target.closest('[data-logo]'); b && addImageURL(brand.logos[+b.dataset.logo], 'Logo', .25); });

/* ---------------- top bar & dialogs ---------------- */
$('#title').addEventListener('input', e => { D.title = e.target.value || 'Untitled design'; dirty(); });
$('#btnUndo').onclick = () => stepHistory(-1);
$('#btnRedo').onclick = () => stepHistory(1);

function presetPicker(sel){
  return `<div class="presets">${PZ.PRESETS.map((p, i) => `<button class="preset ${i === sel ? 'on' : ''}" data-ps="${i}"><b>${p.n}</b><small>${p.w} × ${p.h} px</small></button>`).join('')}</div>
    <div class="row"><label class="lbl" style="margin:0">Custom</label><input class="num" id="cw" type="number" value="${D ? D.w : 1080}" min="16" max="10000"> × <input class="num" id="ch" type="number" value="${D ? D.h : 1080}" min="16" max="10000"> px</div>`;
}
function bindPresets(body){
  body.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => {
    body.querySelectorAll('[data-ps]').forEach(x => x.classList.toggle('on', x === b));
    const p = PZ.PRESETS[+b.dataset.ps]; body.querySelector('#cw').value = p.w; body.querySelector('#ch').value = p.h;
  });
  return () => [Math.max(16, Math.min(10000, +body.querySelector('#cw').value || 1080)), Math.max(16, Math.min(10000, +body.querySelector('#ch').value || 1080))];
}
$('#btnNew').onclick = () => {
  const body = openModal(`<h2>Create a design</h2>${presetPicker(0)}<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" id="mk">Create design</button></div>`);
  const get = bindPresets(body);
  body.querySelector('#mk').onclick = async () => { await save(); const [w, h] = get(); closeModal(); await openDesign(newDesign(w, h)); dirty(); };
};
function openResize(){
  const body = openModal(`<h2>✨ Magic Resize</h2><p class="hint">Every page is rescaled and re-centred for the new size. Full-page backgrounds stretch to cover.</p>${presetPicker(-1)}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="rzCopy">Copy & resize</button><button class="btn primary" id="rzGo">Resize this design</button></div>`);
  const get = bindPresets(body);
  body.querySelector('#rzGo').onclick = () => { const [w, h] = get(); closeModal(); magicResize(w, h, false); };
  body.querySelector('#rzCopy').onclick = async () => { await save(); const [w, h] = get(); closeModal(); magicResize(w, h, true); };
}
$('#btnResize').onclick = openResize;

$('#btnExport').onclick = () => {
  const body = openModal(`<h2>Download</h2>
    <label class="lbl">File type</label>
    <select class="inp" id="exF"><option value="png">PNG — best for graphics</option><option value="jpeg">JPG — small photos</option><option value="pdf">PDF — print & documents</option><option value="svg">SVG — vector</option><option value="json">Inkfold project (.json)</option></select>
    <div id="exOpts"></div>
    <label class="lbl">Pages</label><select class="inp" id="exP"><option value="all">All pages (${D.pages.length})</option><option value="cur">Current page</option></select>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" id="exGo">Download</button></div>`);
  const opts = () => {
    const f = body.querySelector('#exF').value;
    body.querySelector('#exOpts').innerHTML = (f === 'png' || f === 'jpeg' || f === 'pdf') ? `
      <label class="lbl">Size × <output id="exSv">2</output> (${D.w * 2} × ${D.h * 2} px)</label><input type="range" id="exS" min="0.25" max="4" step="0.25" value="2" style="width:100%">
      ${f === 'png' ? '<label class="row"><input type="checkbox" id="exT"> Transparent background <span class="badge">PRO</span></label>' : ''}
      ${f === 'pdf' ? '<label class="lbl">Quality</label><select class="inp" id="exQ"><option value="std">Standard (smaller file)</option><option value="print">Print (lossless)</option></select>' : ''}` :
      f === 'svg' ? '<p class="hint">SVG keeps shapes and text as vectors. Fonts are referenced by name, so the viewer needs them installed or online.</p>' : '<p class="hint">Re-open this file later from Designs → Open file.</p>';
    const s = body.querySelector('#exS');
    if (s) s.oninput = () => { body.querySelector('#exSv').textContent = s.value; s.previousElementSibling.lastChild.textContent = ` (${Math.round(D.w * s.value)} × ${Math.round(D.h * s.value)} px)`; };
  };
  body.querySelector('#exF').onchange = opts; opts();
  body.querySelector('#exGo').onclick = () => {
    const g = id => body.querySelector(id);
    const o = {fmt:g('#exF').value, pages:g('#exP').value, scale:g('#exS') ? +g('#exS').value : 1, transparent:g('#exT') ? g('#exT').checked : false, quality:g('#exQ') ? g('#exQ').value : 'std'};
    closeModal(); doExport(o);
  };
};

$('#btnDesigns').onclick = async () => {
  await save();
  const keys = (await PZ.store.keys()).filter(k => String(k).startsWith('meta:'));
  const metas = (await Promise.all(keys.map(k => PZ.store.get(k)))).filter(Boolean).sort((a, b) => b.updated - a.updated);
  const body = openModal(`<h2>Your designs</h2>
    <div class="row" style="margin-bottom:12px"><button class="btn" id="dsNew">+ New design</button><label class="btn"><input type="file" id="dsOpen" accept=".json,application/json" hidden>Open file</label></div>
    <div class="designs">${metas.map(m => `<div class="dcard" data-id="${m.id}"><div class="im" style="background-image:url('${m.thumb || ''}')"></div>
      <div class="meta"><b>${esc(m.title)}</b><small>${m.w}×${m.h} · ${m.n || 1} page${(m.n || 1) > 1 ? 's' : ''} · ${new Date(m.updated).toLocaleDateString()}</small></div>
      <button class="del" data-del="${m.id}" title="Delete">×</button></div>`).join('')}</div>`);
  body.querySelector('#dsNew').onclick = () => { closeModal(); $('#btnNew').click(); };
  body.querySelector('#dsOpen').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text()); if (j.app !== 'inkfold') throw new Error('Not a Inkfold file');
      const d = newDesign(j.w, j.h, j.title); d.pages = j.pages.map(json => ({id:uid(), json, thumb:''}));
      closeModal(); await openDesign(d); dirty(); toast('Design opened');
    } catch (err) { toast('Could not open: ' + err.message); }
  };
  body.addEventListener('click', async e => {
    const x = e.target.closest('[data-del]');
    if (x) {
      e.stopPropagation(); if (x.dataset.del === D.id) return toast('That design is open — switch to another first');
      if (x.dataset.armed !== '1') { x.dataset.armed = '1'; x.textContent = 'Delete?'; return; }
      await PZ.store.del('meta:' + x.dataset.del); await PZ.store.del('design:' + x.dataset.del); await PZ.store.del('versions:' + x.dataset.del);
      x.closest('.dcard').remove(); return;
    }
    const c = e.target.closest('.dcard'); if (!c) return;
    const d = await PZ.store.get('design:' + c.dataset.id); if (d) { closeModal(); await openDesign(d); }
  });
};

$('#btnHistory').onclick = async () => {
  await save();
  const list = (await PZ.store.get('versions:' + D.id)) || [];
  const body = openModal(`<h2>Version history <span class="badge">PRO</span></h2>
    <div class="row"><button class="btn" id="vsSave">Save a version now</button></div>
    <ul class="vlist">${list.map((v, i) => `<li><img src="${v.thumb || ''}" alt=""><span>${new Date(v.t).toLocaleString()}${v.manual ? ' · saved' : ' · auto'}<br><small class="hint">${v.w}×${v.h} · ${v.pages.length} page(s)</small></span><button class="btn" data-v="${i}">Restore</button></li>`).join('') || '<p class="hint">Versions are saved automatically every few minutes while you work.</p>'}</ul>`);
  body.querySelector('#vsSave').onclick = async () => { await snapshot(true); closeModal(); toast('Version saved'); };
  body.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
    const v = list[+b.dataset.v]; await snapshot(true);
    D.pages = JSON.parse(JSON.stringify(v.pages)); D.w = v.w; D.h = v.h; D.cur = 0;
    closeModal(); await openDesign(D); dirty(); toast('Version restored');
  });
};

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName, a = active();
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || (a && a.isEditing)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); del(); }
  else if (mod && k === 'z') { e.preventDefault(); stepHistory(e.shiftKey ? 1 : -1); }
  else if (mod && k === 'y') { e.preventDefault(); stepHistory(1); }
  else if (mod && k === 'c') copy();
  else if (mod && k === 'x') { copy(); del(); }
  else if (mod && k === 'v') { /* handled by paste event */ }
  else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
  else if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? ungroup() : group(); }
  else if (mod && k === 's') { e.preventDefault(); save(); toast('Saved'); }
  else if (mod && k === 'a') { e.preventDefault(); $('#ctx [data-a=selall]') ? $('#ctx [data-a=selall]').click() : (canvas.discardActiveObject(), renderCtx(), $('#ctx [data-a=selall]').click()); }
  else if (k === 'escape') { canvas.discardActiveObject(); canvas.isDrawingMode = false; canvas.requestRenderAll(); }
  else if (a && k.startsWith('arrow')) {
    e.preventDefault(); const st = e.shiftKey ? 10 : 1;
    if (k === 'arrowleft') a.left -= st; if (k === 'arrowright') a.left += st;
    if (k === 'arrowup') a.top -= st; if (k === 'arrowdown') a.top += st;
    a.setCoords(); canvas.requestRenderAll(); record();
  }
  else if (!mod && k === 't') addText('body');
});
window.addEventListener('beforeunload', () => { commitPage(); });

/* ---------------- boot ---------------- */
(async function boot(){
  const [b, up, last] = await Promise.all([PZ.store.get('brand'), PZ.store.get('uploads'), PZ.store.get('last')]);
  if (b) brand = Object.assign(brand, b);
  uploads = up || [];
  renderBrand(); renderUploads();
  const d = last && await PZ.store.get('design:' + last);
  await openDesign(d || newDesign(1080, 1080));
  if (isMobile()) closePanel();
  renderTemplates();
  window.PZ.app = {canvas, get D(){ return D; }, addText, addShape, addIcon, addQR, doExport, magicResize, save, stepHistory};
})();
})();
