/* Inkfold extra features: charts, tables, emoji, masks, crop, palettes, style copy,
   links, animations, gradient backgrounds, HTML export and Present mode */
(function(){
'use strict';
const A = () => PZ.app;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => Math.round(v * 10) / 10;

/* ---------- shared ---------- */
function staticLoad(json, w, h){
  return new Promise(async res => {
    const a = A(); a.normalize(json); await a.loadFonts(a.fontsIn(json));
    const sc = new fabric.StaticCanvas(document.createElement('canvas'), {width:w, height:h, enableRetinaScaling:false});
    sc.loadFromJSON(json, () => { sc.renderAll(); res(sc); });
  });
}
function palette(){
  const b = A().brand.colors.filter(c => !/^#(fff|ffffff|000|000000|18191b)$/i.test(c));
  return b.length >= 3 ? b : ['#5b3df5', '#00c4cc', '#ffcf3f', '#ff6b4a', '#7ed957', '#ff66c4'];
}
function replaceGroup(old, g, name){
  const a = A(), c = A().canvas;
  if (old) {
    const ctr = old.getCenterPoint();
    g.set({scaleX:old.scaleX, scaleY:old.scaleY, angle:old.angle, opacity:old.opacity, anim:old.anim, link:old.link});
    const i = c.getObjects().indexOf(old);
    c.remove(old); c.insertAt(g, i);
    g.setPositionByOrigin(ctr, 'center', 'center'); g.setCoords();
    g.name = name; c.setActiveObject(g); c.requestRenderAll(); a.record();
  } else a.place(g, name, .6);
}

/* ---------- charts ---------- */
const CHART_DEF = {bar:'Q1, 42\nQ2, 58\nQ3, 35\nQ4, 71', line:'Jan, 12\nFeb, 19\nMar, 15\nApr, 27\nMay, 31\nJun, 38', pie:'Design, 40\nCode, 35\nMarketing, 25', donut:'Mobile, 58\nDesktop, 34\nTablet, 8'};
const rowsOf = t => t.split('\n').map(l => l.split(/[,;\t]/)).filter(r => r[0] && r[0].trim()).map(r => ({label:r[0].trim(), value:parseFloat(r[1]) || 0}));
const niceMax = m => { const p = 10 ** Math.floor(Math.log10(m)), n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const fmt = v => Math.abs(v) >= 1e6 ? num(v / 1e6) + 'M' : Math.abs(v) >= 1e4 ? num(v / 1e3) + 'k' : (Number.isInteger(v) ? v : v.toFixed(1));
function buildChart(kind, data, font){
  const rows = rowsOf(data), W = 820, H = 520, cols = palette(), o = [], f = font || 'Inter', ink = '#18191b';
  const T = (s, left, top, x = {}) => new fabric.Text(String(s), Object.assign({left, top, fontFamily:f, fontSize:22, fill:ink}, x));
  if (!rows.length) rows.push({label:'A', value:1});
  if (kind === 'bar' || kind === 'line') {
    const pad = {l:80, r:20, t:40, b:60}, cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    const top = niceMax(Math.max(1, ...rows.map(r => r.value))), step = cw / rows.length;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ch - ch * i / 4;
      o.push(new fabric.Line([pad.l, y, W - pad.r, y], {stroke:i ? '#e5e7eb' : '#9ca3af', strokeWidth:2}));
      o.push(T(fmt(top * i / 4), pad.l - 14, y - 12, {originX:'right', fontSize:18, fill:'#6b7280'}));
    }
    if (kind === 'bar') rows.forEach((r, i) => {
      const bh = Math.max(0, ch * r.value / top), bw = step * .6, x = pad.l + step * i + (step - bw) / 2;
      o.push(new fabric.Rect({left:x, top:pad.t + ch - bh, width:bw, height:bh, fill:cols[i % cols.length], rx:6, ry:6}));
      o.push(T(fmt(r.value), x + bw / 2, pad.t + ch - bh - 30, {originX:'center', fontSize:20, fontWeight:'bold'}));
    });
    else {
      const pts = rows.map((r, i) => ({x:pad.l + step * i + step / 2, y:pad.t + ch - ch * Math.max(0, r.value) / top}));
      o.push(new fabric.Polyline(pts, {fill:'', stroke:cols[0], strokeWidth:5, strokeLineJoin:'round', strokeLineCap:'round'}));
      pts.forEach((p, i) => {
        o.push(new fabric.Circle({left:p.x, top:p.y, radius:8, fill:'#ffffff', stroke:cols[0], strokeWidth:4, originX:'center', originY:'center'}));
        o.push(T(fmt(rows[i].value), p.x, p.y - 40, {originX:'center', fontSize:20, fontWeight:'bold'}));
      });
    }
    rows.forEach((r, i) => o.push(T(r.label, pad.l + step * i + step / 2, pad.t + ch + 16, {originX:'center', fontSize:20})));
  } else {
    const cx = H / 2, cy = H / 2, R = H / 2 - 10, r0 = kind === 'donut' ? R * .56 : 0;
    const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;
    const P = (rad, a) => (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
    let a = -Math.PI / 2;
    rows.forEach((r, i) => {
      const da = 2 * Math.PI * Math.max(0, r.value) / total; if (!da) return;
      const b = a + Math.min(da, 2 * Math.PI - 1e-4), L = da > Math.PI ? 1 : 0;
      const d = r0 ? `M ${P(R, a)} A ${R} ${R} 0 ${L} 1 ${P(R, b)} L ${P(r0, b)} A ${r0} ${r0} 0 ${L} 0 ${P(r0, a)} Z`
                   : `M ${cx} ${cy} L ${P(R, a)} A ${R} ${R} 0 ${L} 1 ${P(R, b)} Z`;
      o.push(new fabric.Path(d, {fill:cols[i % cols.length], stroke:'#ffffff', strokeWidth:3}));
      a += da;
    });
    rows.forEach((r, i) => {
      const y = 70 + i * 46;
      o.push(new fabric.Rect({left:H + 40, top:y, width:26, height:26, rx:6, ry:6, fill:cols[i % cols.length]}));
      o.push(T(`${r.label}  ${Math.round(100 * Math.max(0, r.value) / total)}%`, H + 80, y - 1));
    });
  }
  const g = new fabric.Group(o); g.chart = {kind, data}; return g;
}
function chartDialog(kind, old){
  const a = A(), cur = old ? old.chart : {kind, data:CHART_DEF[kind]};
  const body = a.openModal(`<h2>${old ? 'Edit chart' : 'Add a chart'}</h2>
    <label class="lbl">Chart type</label>
    <select class="inp" id="chK">${['bar', 'line', 'pie', 'donut'].map(k => `<option value="${k}" ${k === cur.kind ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select>
    <label class="lbl">Data — one row per line: <b>label, value</b> (you can paste from a spreadsheet)</label>
    <textarea class="inp" id="chD" rows="8" style="font-family:ui-monospace,monospace">${esc(cur.data)}</textarea>
    <p class="hint">Colours come from your brand kit.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" id="chGo">${old ? 'Update chart' : 'Add chart'}</button></div>`);
  body.querySelector('#chGo').onclick = () => {
    const g = buildChart(body.querySelector('#chK').value, body.querySelector('#chD').value, a.brand.body);
    a.closeModal(); replaceGroup(old, g, 'Chart');
  };
}

/* ---------- tables ---------- */
const TABLE_DEF = 'Plan, Price, Storage\nFree, €0, 5 GB\nPro, €9, 1 TB\nTeam, €25, 5 TB';
function buildTable(csv, font){
  const rows = csv.split('\n').filter(l => l.trim()).map(l => l.split(/[,;\t]/).map(c => c.trim()));
  const n = Math.max(1, ...rows.map(r => r.length)), f = font || 'Inter', fs = 22, rh = 60, accent = palette()[0];
  const widths = Array.from({length:n}, (_, j) => Math.max(140, ...rows.map(r => ((r[j] || '').length) * fs * .62 + 40)));
  const o = []; let y = 0;
  rows.forEach((r, i) => {
    let x = 0;
    o.push(new fabric.Rect({left:0, top:y, width:widths.reduce((s, w) => s + w, 0), height:rh, fill:i === 0 ? accent : (i % 2 ? '#ffffff' : '#f3f4f6')}));
    for (let j = 0; j < n; j++) {
      o.push(new fabric.Text(r[j] || '', {left:x + 18, top:y + (rh - fs * 1.16) / 2, fontFamily:f, fontSize:fs, fill:i === 0 ? '#ffffff' : '#18191b', fontWeight:i === 0 ? 'bold' : 'normal'}));
      x += widths[j];
    }
    y += rh;
  });
  const tw = widths.reduce((s, w) => s + w, 0);
  o.push(new fabric.Rect({left:0, top:0, width:tw, height:y, fill:'', stroke:'#d1d5db', strokeWidth:2}));
  const g = new fabric.Group(o); g.table = {csv}; return g;
}
function tableDialog(old){
  const a = A(), csv = old ? old.table.csv : TABLE_DEF;
  const body = a.openModal(`<h2>${old ? 'Edit table' : 'Add a table'}</h2>
    <label class="lbl">One row per line, cells separated by commas (or paste from a spreadsheet). The first row is the header.</label>
    <textarea class="inp" id="tbD" rows="9" style="font-family:ui-monospace,monospace">${esc(csv)}</textarea>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" id="tbGo">${old ? 'Update table' : 'Add table'}</button></div>`);
  body.querySelector('#tbGo').onclick = () => { const g = buildTable(body.querySelector('#tbD').value, A().brand.body); a.closeModal(); replaceGroup(old, g, 'Table'); };
}
$('#dataGrid').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.chart) chartDialog(b.dataset.chart); else tableDialog();
});

/* ---------- emoji ---------- */
const EMOJI = '😀 😂 😍 🥳 😎 🤩 🤔 😴 👍 👏 🙌 💪 🙏 👀 ❤️ 🧡 💛 💚 💙 💜 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎈 🎁 🏆 🚀 💡 📌 📣 💬 ✅ ❌ ⚠️ 📅 📷 🎵 🌈 ☀️ 🌙 🌸 🌿 🍕 ☕ 🌍'.split(' ');
$('#emojiGrid').innerHTML = EMOJI.map(e => `<button class="tile" data-emoji="${e}" style="font-size:24px">${e}</button>`).join('');
$('#emojiGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-emoji]'); if (!b) return;
  const t = new fabric.Text(b.dataset.emoji, {fontSize:Math.round(A().base() * .18), fontFamily:'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'});
  A().place(t, 'Emoji ' + b.dataset.emoji, 0);
});

/* ---------- image masks & crop & palette ---------- */
const MASKS = ['none', 'circle', 'rounded', 'arch', 'star', 'heart', 'hexagon', 'blob'];
function applyMask(o, kind){
  o.mask = kind === 'none' ? null : kind;
  if (!o.mask) { o.clipPath = null; o.dirty = true; return; }
  const w = o.width, h = o.height, s = Math.min(w, h); let m, keep = true;
  if (kind === 'circle') m = new fabric.Circle({radius:s / 2});
  else if (kind === 'rounded') { m = new fabric.Rect({width:w, height:h, rx:s * .14, ry:s * .14}); keep = false; }
  else if (kind === 'arch') { const r = w / 2; m = new fabric.Path(`M0 ${h} V${Math.min(r, h)} A${r} ${r} 0 0 1 ${w} ${Math.min(r, h)} V${h} Z`); keep = false; }
  else if (kind === 'star') m = new fabric.Polygon(PZ.starPts(5, 50, 21));
  else if (kind === 'hexagon') m = new fabric.Polygon(PZ.polyPts(6));
  else if (kind === 'heart') m = new fabric.Path(PZ.ICONS.heart);
  else if (kind === 'blob') m = new fabric.Path(PZ.SHAPE_PATHS.blob);
  const k = keep ? Math.min(w / m.width, h / m.height) : 1;
  m.set({originX:'center', originY:'center', left:0, top:0, scaleX:keep ? k : 1, scaleY:keep ? k : 1});
  o.clipPath = m; o.dirty = true;
}
function applyCrop(o, c){
  const s = o.getOriginalSize();
  const ncx = c.l * s.width, ncy = c.t * s.height;
  const nw = Math.max(4, s.width * (1 - c.l - c.r)), nh = Math.max(4, s.height * (1 - c.t - c.b));
  const dx = (ncx - (o.cropX || 0)) * o.scaleX, dy = (ncy - (o.cropY || 0)) * o.scaleY, an = fabric.util.degreesToRadians(o.angle || 0);
  o.set({cropX:ncx, cropY:ncy, width:nw, height:nh, left:o.left + dx * Math.cos(an) - dy * Math.sin(an), top:o.top + dx * Math.sin(an) + dy * Math.cos(an)});
  o.crop = c; if (o.mask) applyMask(o, o.mask); o.setCoords();
}
function imagePalette(o){
  const el = o._originalElement || o.getElement(), c = document.createElement('canvas'); c.width = c.height = 48;
  const x = c.getContext('2d'); x.drawImage(el, 0, 0, 48, 48);
  let d; try { d = x.getImageData(0, 0, 48, 48).data; } catch (e) { return []; }
  const m = {};
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const k = (d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5), v = m[k] || (m[k] = {n:0, r:0, g:0, b:0});
    v.n++; v.r += d[i]; v.g += d[i + 1]; v.b += d[i + 2];
  }
  return Object.values(m).sort((p, q) => q.n - p.n).slice(0, 6)
    .map(v => '#' + [v.r, v.g, v.b].map(q => Math.round(q / v.n).toString(16).padStart(2, '0')).join(''));
}

/* ---------- copy / paste style ---------- */
const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'shadow', 'opacity', 'paintFirst', 'rx', 'ry',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'underline', 'linethrough', 'charSpacing', 'lineHeight', 'textAlign', 'textBackgroundColor', 'fx'];
const TEXT_KEYS = new Set(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'underline', 'linethrough', 'charSpacing', 'lineHeight', 'textAlign', 'textBackgroundColor', 'paintFirst']);
let styleClip = null;
function cloneVal(v){
  if (v instanceof fabric.Gradient) return new fabric.Gradient(v.toObject());
  if (v instanceof fabric.Shadow) return new fabric.Shadow(v.toObject());
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === 'object') return JSON.parse(JSON.stringify(v));
  return v;
}
function copyStyle(o){
  if (o.type === 'activeSelection' || o.type === 'group') o = (o.getObjects().find(x => x.type !== 'rect') || o.getObjects()[0]);
  styleClip = {type:o.type}; STYLE_KEYS.forEach(k => { if (o[k] !== undefined) styleClip[k] = cloneVal(o[k]); });
  A().toast('Style copied — select other elements and press Paste style');
}
function pasteStyle(){
  if (!styleClip) return A().toast('Copy a style first');
  A().apply(o => {
    STYLE_KEYS.forEach(k => {
      if (!(k in styleClip)) return;
      if (TEXT_KEYS.has(k) && o.type !== 'textbox') return;
      if ((k === 'rx' || k === 'ry') && o.type !== 'rect') return;
      if (k === 'fx') { if (o.type === 'image') { o.fx = cloneVal(styleClip.fx) || {}; A().applyFx(o); } return; }
      if (k === 'fill' && o.type === 'image') return;
      if (k === 'fill') return A().setFill(o, cloneVal(styleClip.fill));
      o.set(k, cloneVal(styleClip[k]));
    });
    if (o.type === 'textbox') { o.initDimensions(); o.setCoords(); }
  });
  A().renderProps();
}

/* ---------- gradient page backgrounds ---------- */
const BG_GRADS = [['#ff9a9e', '#fad0c4', 'd'], ['#a18cd1', '#fbc2eb', 'v'], ['#5b3df5', '#00c4cc', 'd'], ['#f6d365', '#fda085', 'd'],
  ['#84fab0', '#8fd3f4', 'd'], ['#0f0c29', '#302b63', 'v'], ['#ffecd2', '#fcb69f', 'v'], ['#232526', '#414345', 'd'],
  ['#43e97b', '#38f9d7', 'h'], ['#fa709a', '#fee140', 'd'], ['#30cfd0', '#330867', 'v'], ['#ffffff', '#e8e8ef', 'r']];
const cssGrad = (a, b, dir) => dir === 'r' ? `radial-gradient(circle,${a},${b})` : `linear-gradient(${{h:90, v:180, d:135}[dir]}deg,${a},${b})`;
function setBgGradient(i){
  const a = A(), c = a.canvas, D = a.D; let r = c.getObjects().find(o => o.name === 'Background fill');
  if (i < 0) { if (r) { c.remove(r); a.record(); } return; }
  const [g1, g2, dir] = BG_GRADS[i];
  if (!r) { r = new fabric.Rect({left:0, top:0, width:D.w, height:D.h, strokeWidth:0, name:'Background fill'}); c.insertAt(r, 0); a.lockObj(r, true); }
  r.set({width:D.w, height:D.h, left:0, top:0}); a.setFill(r, a.gradient(g1, g2, dir)); r.setCoords();
  c.requestRenderAll(); a.record();
}

/* ---------- properties panel additions ---------- */
const ANIMS = [['', 'None'], ['fade', 'Fade'], ['rise', 'Rise'], ['pop', 'Pop'], ['slideL', 'Slide in →'], ['slideR', 'Slide in ←'], ['blur', 'Blur in'], ['drop', 'Drop'], ['spin', 'Spin']];
function slider(label, p, v, min, max, step){
  return `<div class="kv"><span>${label}</span><input type="range" data-p="${p}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${(+v).toFixed(step < 1 ? 2 : 0)}</output></div>`;
}
function props(one, sel){
  let h = '';
  if (one && one.type === 'image') {
    const c = one.crop || {l:0, t:0, r:0, b:0};
    h += `<h4>Crop</h4>${slider('Left', 'crop.l', c.l, 0, .45, .01)}${slider('Right', 'crop.r', c.r, 0, .45, .01)}${slider('Top', 'crop.t', c.t, 0, .45, .01)}${slider('Bottom', 'crop.b', c.b, 0, .45, .01)}
      <h4>Frame shape</h4><div class="grid3">${MASKS.map(m => `<button class="btn ${(one.mask || 'none') === m ? 'primary' : ''}" data-mask="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <h4>Photo colours</h4><div class="swatches">${imagePalette(one).map(c => `<button class="sw" style="background:${c}" data-pal="${c}" title="Add ${c} to brand kit"></button>`).join('')}</div><p class="hint">Tap a colour to save it to your brand kit.</p>`;
  }
  if (one) {
    const b = one.getBoundingRect(true, true);
    h += `<h4>Size & position</h4><div class="kv" style="grid-template-columns:auto 1fr auto 1fr">
      <span>X</span><input class="num" type="number" data-p="px" value="${Math.round(b.left)}"><span>Y</span><input class="num" type="number" data-p="py" value="${Math.round(b.top)}">
      <span>W</span><input class="num" type="number" data-p="pw" value="${Math.round(one.getScaledWidth())}" min="1"><span>H</span><input class="num" type="number" data-p="ph" value="${Math.round(one.getScaledHeight())}" min="1"></div>
      <h4>Link</h4><input class="inp" data-p="link" placeholder="https://… (works in HTML & PDF)" value="${esc(one.link || '')}">`;
  }
  h += `<h4>Animation</h4><select class="inp" data-p="anim">${ANIMS.map(([v, n]) => `<option value="${v}" ${((one || sel.getObjects()[0]).anim || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <p class="hint">Plays in Present mode and in HTML exports.</p>`;
  return h;
}
function pageProps(){
  return `<h4>Gradient background</h4><div class="swatches">${BG_GRADS.map((g, i) => `<button class="sw" data-bgg="${i}" style="background:${cssGrad(...g)}" title="Gradient"></button>`).join('')}<button class="sw" data-bgg="-1" title="Remove gradient" style="background:#fff;font-size:14px">×</button></div>`;
}
function input(t, p, v){
  const a = A(), o = a.active();
  if (p === 'link') { a.apply(x => { x.link = String(v).trim() || null; }); return true; }
  if (p === 'anim') { a.apply(x => { x.anim = v || null; }); return true; }
  if (p.startsWith('crop.')) { if (o && o.type === 'image') { const c = Object.assign({l:0, t:0, r:0, b:0}, o.crop); c[p.slice(5)] = +v; applyCrop(o, c); a.canvas.requestRenderAll(); a.record(); } return true; }
  if (o && ['px', 'py', 'pw', 'ph'].includes(p)) {
    const b = o.getBoundingRect(true, true); v = +v; if (!isFinite(v)) return true;
    if (p === 'px') o.left += v - b.left;
    if (p === 'py') o.top += v - b.top;
    if (p === 'pw' && v > 0) { if (o.type === 'textbox') o.set('width', v / o.scaleX); else { const k = v / o.getScaledWidth(); o.scaleX *= k; o.scaleY *= k; } }
    if (p === 'ph' && v > 0 && o.type !== 'textbox') { const k = v / o.getScaledHeight(); o.scaleX *= k; o.scaleY *= k; }
    o.setCoords(); a.canvas.requestRenderAll(); a.record(); return true;
  }
  return false;
}
function click(b, d){
  const a = A(), o = a.active();
  if (d.bgg !== undefined) { setBgGradient(+d.bgg); return true; }
  if (d.mask && o && o.type === 'image') { applyMask(o, d.mask); a.canvas.requestRenderAll(); a.record(); a.renderProps(); return true; }
  if (d.pal) { a.addBrandColor(d.pal); a.toast('Added ' + d.pal + ' to your brand kit'); return true; }
  return false;
}
function ctx(o){
  return [o.chart ? '<button class="btn" data-a="editchart">Edit chart</button>' : '',
    o.table ? '<button class="btn" data-a="edittable">Edit table</button>' : '',
    '<button class="btn" data-a="copystyle">Copy style</button>',
    styleClip ? '<button class="btn" data-a="pastestyle">Paste style</button>' : ''].join('');
}
function action(name, o){
  if (name === 'editchart') { chartDialog(o.chart.kind, o); return true; }
  if (name === 'edittable') { tableDialog(o); return true; }
  if (name === 'copystyle') { copyStyle(o); A().renderCtx(); return true; }
  if (name === 'pastestyle') { pasteStyle(); return true; }
  return false;
}

/* ---------- PDF links ---------- */
async function pdfLinks(pdf, json){
  const D = A().D;
  if (!JSON.stringify(json).includes('"link"')) return;
  const sc = await staticLoad(JSON.parse(JSON.stringify(json)), D.w, D.h);
  sc.getObjects().forEach(o => { if (o.link && o.visible) { const b = o.getBoundingRect(true, true); pdf.link(b.left, b.top, b.width, b.height, {url:safeURL(o.link)}); } });
  sc.dispose();
}

/* ---------- HTML export ---------- */
function fontLink(set){
  const link = document.querySelector('link[href*="fonts.googleapis.com/css2"]'); if (!link) return '';
  const fams = new URL(link.href).searchParams.getAll('family').filter(f => set.has(f.split(':')[0]));
  return fams.length ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams.map(f => 'family=' + f.replace(/ /g, '+')).join('&')}&display=swap">` : '';
}
function collectFonts(o, set){ if (o.fontFamily) set.add(o.fontFamily); if (o._objects) o._objects.forEach(c => collectFonts(c, set)); }
function safeURL(u){ return /^(https?:|mailto:|tel:|#)/i.test(u || '') ? u : (u ? 'https://' + u : ''); }
function textHTML(o){
  const c = o.getCenterPoint(), gi = A().gradInfo(o.fill), sx = o.scaleX * (o.flipX ? -1 : 1), sy = o.scaleY * (o.flipY ? -1 : 1);
  const st = [`left:${num(c.x)}px`, `top:${num(c.y)}px`, `width:${num(o.width)}px`, `height:${num(o.height)}px`,
    `transform:translate(-50%,-50%) rotate(${num(o.angle || 0)}deg) scale(${sx},${sy})`,
    `font-family:'${o.fontFamily}',sans-serif`, `font-size:${o.fontSize}px`, `font-weight:${o.fontWeight}`, `font-style:${o.fontStyle}`,
    `line-height:${num(o.lineHeight * o._fontSizeMult * 100) / 100}`, `text-align:${o.textAlign === 'justify' ? 'left' : o.textAlign}`,
    `letter-spacing:${(o.charSpacing || 0) / 1000}em`];
  if (o.opacity !== 1) st.push(`opacity:${o.opacity}`);
  const deco = [o.underline && 'underline', o.linethrough && 'line-through'].filter(Boolean).join(' ');
  if (deco) st.push(`text-decoration:${deco}`);
  if (gi) st.push(`background-image:${cssGrad(gi.a, gi.b, gi.dir)}`, '-webkit-background-clip:text', 'background-clip:text', 'color:transparent');
  else st.push(`color:${o.fill || 'transparent'}`);
  if (o.stroke && o.strokeWidth) st.push(`-webkit-text-stroke:${o.strokeWidth}px ${o.stroke}`, 'paint-order:stroke fill');
  if (o.shadow) st.push(`text-shadow:${num(o.shadow.offsetX)}px ${num(o.shadow.offsetY)}px ${num(o.shadow.blur)}px ${o.shadow.color}`);
  if (o.backgroundColor) st.push(`background-color:${o.backgroundColor}`);
  const lines = (o.textLines || String(o.text).split('\n')).map(l => o.textBackgroundColor ? `<span style="background:${o.textBackgroundColor}">${esc(l)}</span>` : esc(l));
  return `<p class="t" style="${st.join(';')}">${lines.join('\n')}</p>`;
}
function pageHTML(sc, fonts, D){
  let k = 0;
  const parts = sc.getObjects().filter(o => o.visible).map(o => {
    const c = o.getCenterPoint(), b = o.getBoundingRect(true, true);
    collectFonts(o, fonts);
    const inner = (o.type === 'textbox' && !o.clipPath) ? textHTML(o)
      : `<svg viewBox="0 0 ${D.w} ${D.h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${o.toSVG()}</svg>`;
    const an = o.anim ? ` data-a="${o.anim}" style="--d:${(k++ * .12).toFixed(2)}s;transform-origin:${num(c.x)}px ${num(c.y)}px"` : '';
    const link = o.link ? `<a class="hit" href="${esc(safeURL(o.link))}" target="_blank" rel="noopener" style="left:${num(b.left)}px;top:${num(b.top)}px;width:${num(b.width)}px;height:${num(b.height)}px" aria-label="${esc(o.type === 'textbox' ? o.text : (o.name || 'Link'))}"></a>` : '';
    return `<div class="el"${an}>${inner}${link}</div>`;
  });
  const bg = typeof sc.backgroundColor === 'string' && sc.backgroundColor ? sc.backgroundColor : 'transparent';
  return `<section class="wrap"><div class="page" style="background:${bg}">${parts.join('')}</div></section>`;
}
async function buildHTML(mode, idx){
  const a = A(), D = a.D; a.commitPage();
  idx = idx || D.pages.map((_, i) => i);
  const fonts = new Set(), pages = [];
  for (const i of idx) { const sc = await staticLoad(JSON.parse(JSON.stringify(D.pages[i].json)), D.w, D.h); pages.push(pageHTML(sc, fonts, D)); sc.dispose(); }
  const first = D.pages[idx[0]].json.background;
  const outer = mode === 'slides' ? '#111' : (typeof first === 'string' && first ? first : '#ffffff');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(D.title)}</title><meta name="generator" content="Inkfold">${fontLink(fonts)}
<style>
*{box-sizing:border-box}html,body{margin:0;background:${outer}}body{overflow-x:hidden}
.wrap{position:relative;margin:0 auto;overflow:hidden}
.page{position:absolute;left:0;top:0;width:${D.w}px;height:${D.h}px;overflow:hidden;transform-origin:0 0}
.el{position:absolute;inset:0;pointer-events:none}
.el svg{position:absolute;left:0;top:0;width:${D.w}px;height:${D.h}px;overflow:visible}
.t{position:absolute;margin:0;white-space:pre;pointer-events:auto}
.hit{position:absolute;display:block;pointer-events:auto;z-index:2}
[data-a]{opacity:0}
.in [data-a]{animation:var(--k) .9s cubic-bezier(.2,.7,.2,1) var(--d) both}
[data-a=fade]{--k:fade}[data-a=rise]{--k:rise}[data-a=pop]{--k:pop}[data-a=slideL]{--k:slideL}[data-a=slideR]{--k:slideR}[data-a=blur]{--k:blurin}[data-a=drop]{--k:drop}[data-a=spin]{--k:spin}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(80px)}to{opacity:1;transform:none}}
@keyframes drop{from{opacity:0;transform:translateY(-80px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.5)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:none}}
@keyframes slideL{from{opacity:0;transform:translateX(-160px)}to{opacity:1;transform:none}}
@keyframes slideR{from{opacity:0;transform:translateX(160px)}to{opacity:1;transform:none}}
@keyframes blurin{from{opacity:0;filter:blur(24px)}to{opacity:1;filter:none}}
@keyframes spin{from{opacity:0;transform:rotate(-180deg) scale(.4)}to{opacity:1;transform:none}}
${mode === 'slides' ? `body{height:100vh;display:grid;place-items:center;overflow:hidden;font-family:system-ui,sans-serif}
.wrap{display:none;box-shadow:0 10px 40px rgba(0,0,0,.4)}.wrap.on{display:block;animation:fade .5s both}
.nav{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.55);color:#fff;border-radius:999px;padding:6px 10px;opacity:.15;transition:opacity .3s;z-index:9}
.nav:hover,.nav:focus-within{opacity:1}.nav button{background:none;border:0;color:#fff;font-size:18px;width:40px;height:40px;border-radius:50%;cursor:pointer}.nav button:hover{background:rgba(255,255,255,.15)}.nav span{font-size:14px;min-width:54px;text-align:center}` : ''}
@media (prefers-reduced-motion:reduce){[data-a]{opacity:1!important;animation:none!important}.wrap.on{animation:none}}
</style></head><body>
${pages.join('\n')}
${mode === 'slides' ? '<div class="nav"><button id="pv" aria-label="Previous">‹</button><span id="ct"></span><button id="nx" aria-label="Next">›</button><button id="fs" aria-label="Full screen">⛶</button></div>' : ''}
<script>
(function(){
var W=${D.w},H=${D.h},MODE='${mode}',ws=[].slice.call(document.querySelectorAll('.wrap'));
function fit(){ws.forEach(function(w){var s=MODE==='slides'?Math.min(innerWidth/W,innerHeight/H):Math.min(innerWidth/W,1.5);w.style.width=W*s+'px';w.style.height=H*s+'px';w.firstElementChild.style.transform='scale('+s+')';});}
addEventListener('resize',fit);fit();
if(MODE==='site'){
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.2});ws.forEach(function(w){io.observe(w);});}
  else ws.forEach(function(w){w.classList.add('in');});
}else{
  var i=Math.max(0,Math.min(ws.length-1,(parseInt(location.hash.slice(1))||1)-1));
  function show(n){ws[i].classList.remove('on','in');i=(n+ws.length)%ws.length;var w=ws[i];w.classList.add('on');void w.offsetWidth;w.classList.add('in');document.getElementById('ct').textContent=(i+1)+' / '+ws.length;try{history.replaceState(null,'','#'+(i+1));}catch(e){}}
  function fs(){var d=document.documentElement;if(!document.fullscreenElement){(d.requestFullscreen||function(){}).call(d);}else document.exitFullscreen();}
  document.getElementById('pv').onclick=function(e){e.stopPropagation();show(i-1);};
  document.getElementById('nx').onclick=function(e){e.stopPropagation();show(i+1);};
  document.getElementById('fs').onclick=function(e){e.stopPropagation();fs();};
  addEventListener('keydown',function(e){var k=e.key;if(k==='ArrowRight'||k==='PageDown'||k===' '){e.preventDefault();show(i+1);}else if(k==='ArrowLeft'||k==='PageUp'){show(i-1);}else if(k==='Home'){show(0);}else if(k==='End'){show(ws.length-1);}else if(k==='f'||k==='F'){fs();}else if(k==='Escape'&&parent!==window){parent.postMessage('inkfold-close','*');}});
  document.body.addEventListener('click',function(e){if(e.target.closest('a,.nav'))return;show(e.clientX<innerWidth/3?i-1:i+1);});
  var tx=null;addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
  addEventListener('touchend',function(e){if(tx===null)return;var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>40)show(dx<0?i+1:i-1);tx=null;});
  show(i);
}
})();
<\/script>
</body></html>`;
}

/* ---------- Present mode ---------- */
async function present(){
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:100;background:#111;display:grid;place-items:center;color:#fff;font:15px Inter,sans-serif';
  ov.innerHTML = '<span><span class="spin"></span> Preparing presentation…</span>';
  document.body.appendChild(ov);
  try { if (ov.requestFullscreen) await ov.requestFullscreen(); } catch (e) {}
  const html = await buildHTML('slides', null);
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
  fr.srcdoc = html;
  const x = document.createElement('button');
  x.textContent = '✕ Exit'; x.style.cssText = 'position:absolute;top:12px;right:12px;z-index:2;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;opacity:.6';
  ov.innerHTML = ''; ov.append(fr, x);
  const close = () => { window.removeEventListener('message', onMsg); document.removeEventListener('fullscreenchange', onFs); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); };
  const onMsg = e => { if (e.data === 'inkfold-close') close(); };
  const onFs = () => { if (!document.fullscreenElement && document.body.contains(ov) && ov.dataset.fs) close(); else if (document.fullscreenElement) ov.dataset.fs = 1; };
  window.addEventListener('message', onMsg); document.addEventListener('fullscreenchange', onFs);
  if (document.fullscreenElement) ov.dataset.fs = 1;
  x.onclick = close;
  fr.onload = () => { try { fr.contentWindow.focus(); } catch (e) {} };
}
$('#btnPresent').onclick = present;

PZ.ext = {props, pageProps, input, click, ctx, action, pdfLinks, buildHTML, present, buildChart, buildTable, applyMask, applyCrop};
})();
