/* GerinGonça — folhas de sprites: recorte automático do fundo e detecção das figuras. */
(function (root) {
  'use strict';

  function loadImage(url) {
    return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('não carregou ' + url)); im.src = url; });
  }

  // Classifica o fundo pela borda: transparente (nada a fazer), preto ou claro/neutro (quadriculado, branco).
  function detectBackground(data, w, h) {
    let alphaLow = 0, dark = 0, light = 0, n = 0;
    const px = (x, y) => (y * w + x) * 4;
    const sample = (x, y) => { const i = px(x, y); n++; if (data[i + 3] < 250) alphaLow++; const r = data[i], g = data[i + 1], b = data[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx < 40) dark++; else if (mn > 175 && mx - mn < 28) light++; };
    for (let x = 0; x < w; x += 4) { sample(x, 0); sample(x, h - 1); }
    for (let y = 0; y < h; y += 4) { sample(0, y); sample(w - 1, y); }
    if (alphaLow / n > 0.5) return 'alpha';
    if (dark / n > 0.6) return 'dark';
    if (light / n > 0.6) return 'light';
    return 'alpha';
  }

  // Preenchimento a partir das bordas: só vira transparente o fundo que se conecta ao exterior.
  function matte(canvas, mode, holes) {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const isBg = mode === 'dark'
      ? i => Math.max(d[i], d[i + 1], d[i + 2]) < 48
      : i => { const r = d[i], g = d[i + 1], b = d[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mn > 168 && mx - mn < 34; };
    const seen = new Uint8Array(w * h); const stack = [];
    const push = (x, y) => { const k = y * w + x; if (!seen[k] && isBg(k * 4)) { seen[k] = 1; stack.push(k); } };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) { const k = stack.pop(); const x = k % w, y = (k - x) / w; if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1); }
    // borda suave: pixels de fundo viram alfa 0; vizinhos de fundo perdem um pouco de alfa (anti-serrilhado)
    // holes: fundo branco fechado por dentro (arco + corda, triângulo da gangorra, barbantes) também sai — só branco quase puro
    if (holes) for (let k = 0; k < w * h; k++) if (!seen[k]) { const i = k * 4, mn = Math.min(d[i], d[i + 1], d[i + 2]), mx = Math.max(d[i], d[i + 1], d[i + 2]); if (mn > 228 && mx - mn < 16) seen[k] = 1; }
    for (let k = 0; k < w * h; k++) if (seen[k]) d[k * 4 + 3] = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const k = y * w + x; if (seen[k]) continue;
      const nb = seen[k - 1] + seen[k + 1] + seen[k - w] + seen[k + w];
      if (nb) { const i = k * 4; d[i + 3] = Math.min(d[i + 3], 255 - nb * 45); if (mode === 'light') { const f = 1 - nb * 0.12; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; } }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Caixas das figuras: componentes conexos na máscara de alfa (em grade reduzida), unindo caixas próximas.
  function findSprites(canvas, opts) {
    const cell = (opts && opts.cell) || 8, gap = (opts && opts.gap) || 14, minArea = (opts && opts.minArea) || 1600;
    const w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), grid = new Uint8Array(gw * gh), cnt = new Uint16Array(gw * gh);
    const athr = (opts && opts.alpha) || 120, cover = (opts && opts.cover) || 0.3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > athr) cnt[((y / cell) | 0) * gw + ((x / cell) | 0)]++;
    for (let k = 0; k < gw * gh; k++) if (cnt[k] >= cell * cell * cover) grid[k] = 1;
    const lab = new Int32Array(gw * gh); let boxes = [];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const k = gy * gw + gx; if (!grid[k] || lab[k]) continue;
      const id = boxes.length + 1; const st = [k]; lab[k] = id; let x0 = gx, x1 = gx, y0 = gy, y1 = gy;
      while (st.length) { const c = st.pop(); const cx = c % gw, cy = (c - cx) / gw; x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const nk = ny * gw + nx; if (grid[nk] && !lab[nk]) { lab[nk] = id; st.push(nk); } } }
      boxes.push({ x: x0 * cell, y: y0 * cell, w: (x1 - x0 + 1) * cell, h: (y1 - y0 + 1) * cell });
    }
    const compBoxes = boxes.map(b => Object.assign({}, b));
    // caixas grandes nunca se fundem entre si; pedaços pequenos (um "?", fumaça, sombra) entram na caixa grande mais próxima
    const big = boxes.filter(b => b.w * b.h >= minArea), small = boxes.filter(b => b.w * b.h < minArea);
    const near = (a, b) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
    for (const sm of small) { let best = null, bd = 1e9; for (const bg of big) { const cx = sm.x + sm.w / 2, cy = sm.y + sm.h / 2, dx = Math.max(bg.x - cx, 0, cx - bg.x - bg.w), dy = Math.max(bg.y - cy, 0, cy - bg.y - bg.h), dd = Math.hypot(dx, dy); if (dd < bd) { bd = dd; best = bg; } } if (best && bd <= Math.max(gap, 30)) { const x = Math.min(best.x, sm.x), y = Math.min(best.y, sm.y); best.w = Math.max(best.x + best.w, sm.x + sm.w) - x; best.h = Math.max(best.y + best.h, sm.y + sm.h) - y; best.x = x; best.y = y; } }
    boxes = big;
    const opaque = (x, y) => d[(y * w + x) * 4 + 3] > athr;
    const grow = (b) => {
      const lim = (opts && opts.grow) || 40; let x0 = b.x, y0 = b.y, x1 = b.x + b.w - 1, y1 = b.y + b.h - 1;
      const colHas = (x, ya, yb) => { for (let y = ya; y <= yb; y++) if (opaque(x, y)) return true; return false; };
      const rowHas = (y, xa, xb) => { for (let x = xa; x <= xb; x++) if (opaque(x, y)) return true; return false; };
      for (let i = 0; i < lim && x0 > 0 && colHas(x0 - 1, y0, y1); i++) x0--;
      for (let i = 0; i < lim && x1 < w - 1 && colHas(x1 + 1, y0, y1); i++) x1++;
      for (let i = 0; i < lim && y0 > 0 && rowHas(y0 - 1, x0, x1); i++) y0--;
      for (let i = 0; i < lim && y1 < h - 1 && rowHas(y1 + 1, x0, x1); i++) y1++;
      return { x: Math.max(0, x0 - 2), y: Math.max(0, y0 - 2), w: Math.min(w - 1, x1 + 2) - Math.max(0, x0 - 2) + 1, h: Math.min(h - 1, y1 + 2) - Math.max(0, y0 - 2) + 1 };
    };
    boxes = boxes.map(grow);
    boxes.sort((a, b) => (Math.round(a.y / 120) - Math.round(b.y / 120)) || (a.x - b.x));
    boxes.det = { lab, gw, gh, cell, comp: compBoxes };
    return boxes;
  }

  // Recorta um retângulo da folha mantendo só os pixels dos componentes que moram nele.
  // Pixels de células não rotuladas (partes finas) ficam se estiverem dentro do retângulo.
  function cut(sheetCanvas, rect, det) {
    const { lab, gw, cell, comp } = det;
    const out = document.createElement('canvas'); out.width = rect.w; out.height = rect.h;
    const octx = out.getContext('2d'); octx.drawImage(sheetCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const img = octx.getImageData(0, 0, rect.w, rect.h), d = img.data;
    const inside = new Map();
    const centerId = lab[(((rect.y + rect.h / 2) / cell) | 0) * gw + (((rect.x + rect.w / 2) / cell) | 0)];
    const belongs = id => { if (rect.split && id === centerId) return true; if (inside.has(id)) return inside.get(id); const c = comp[id - 1]; const ix = Math.max(0, Math.min(rect.x + rect.w, c.x + c.w) - Math.max(rect.x, c.x)), iy = Math.max(0, Math.min(rect.y + rect.h, c.y + c.h) - Math.max(rect.y, c.y)); const ok = ix * iy > 0.5 * c.w * c.h; inside.set(id, ok); return ok; };
    if (!rect.all) for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) { // rect.all: fica tudo que estiver dentro
      const id = lab[(((rect.y + y) / cell) | 0) * gw + (((rect.x + x) / cell) | 0)];
      if (id && !belongs(id)) d[(y * rect.w + x) * 4 + 3] = 0;
    }
    for (const ex of rect.exclude || []) for (let y = Math.max(0, ex.y - rect.y); y < Math.min(rect.h, ex.y + ex.h - rect.y); y++) for (let x = Math.max(0, ex.x - rect.x); x < Math.min(rect.w, ex.x + ex.w - rect.x); x++) d[(y * rect.w + x) * 4 + 3] = 0;
    octx.putImageData(img, 0, 0);
    return out;
  }

  async function loadSheet(url, opts) {
    const im = await loadImage(url);
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const mode = (opts && opts.mode) || detectBackground(d, c.width, c.height);
    if (mode !== 'alpha') matte(c, mode, !!(opts && opts.holes));
    return { canvas: c, mode, url };
  }

  root.GG_SPRITES = { loadImage, loadSheet, matte, findSprites, detectBackground, cut };
})(typeof self !== 'undefined' ? self : this);
