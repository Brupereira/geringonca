/* GerinGonça — atlas: onde cada figura mora nas folhas de imagens. Coordenadas em pixels da folha original. */
(function (root) {
  'use strict';
  // folha pode ser só a url ou { url, rot }: rot gira a folha inteira (graus) antes do recorte, num canvas 1.25x maior
  const SHEETS = { gonca: 'assets/gonca.webp', gerin: 'assets/gerin.webp', obj3: 'assets/objetos3.webp', obj1: 'assets/objetos1.jpg', bb: { url: 'assets/obj/balloonbox.png', holes: true }, seesaw: { url: 'assets/obj/seesaw.png', rot: 21, holes: true }, seesaw0: { url: 'assets/obj/seesaw.png', holes: true }, candles: 'assets/obj/candles.png', bowlfull: 'assets/obj/bowl-gerin-full.webp' };
  const R = (sheet, x, y, w, h) => ({ sheet, x, y, w, h });
  const S = (sheet, x, y, w, h) => ({ sheet, x, y, w, h, split: true }); // recorte manual de figuras encostadas
  const SPRITES = {
    // Gonça
    'gonca.sit':       R('gonca', 46, 74, 340, 448),      // sentada fumando (pose padrão)
    'gonca.chair':     R('gonca', 398, 6, 444, 493),      // na poltrona com a caneca
    'gonca.groom':     R('gonca', 853, 35, 269, 449),     // lambendo a pata
    'gonca.table':     R('gonca', 1148, 51, 430, 431),    // na mesa, "ME DEIXA"
    'gonca.walk':      R('gonca', 1083, 486, 463, 405),   // andando com o rato
    'gonca.stretch':   R('gonca', 13, 593, 501, 265),     // se espreguiçando
    'gonca.lie':       R('gonca', 514, 565, 530, 277),    // deitada na almofada roxa
    'gonca.hiss':      Object.assign(S('gonca', 285, 884, 365, 326), { exclude: [{ x: 285, y: 884, w: 26, h: 326 }] }),    // assustada, costas arqueadas (só a gata)
    'gonca.fightpair': R('gonca', 6, 884, 644, 326),      // briga com o cachorro (versão antiga dele)
    'gonca.robe':      R('gonca', 661, 846, 422, 404),    // roupão e café
    'gonca.sleep':     R('gonca', 1086, 939, 468, 287),   // dormindo na cama do Gerin
    'gonca.book':      R('gonca', 1068, 1243, 294, 329),  // lendo "Como Ignorar Humanos"
    'gonca.box':       R('gonca', 19, 1260, 411, 294),    // na caixa "Só aceito mimos"
    'gonca.remote':    R('gonca', 516, 1260, 510, 302),   // deitada com controle remoto
    'gonca.ashtray':   R('gonca', 1366, 1420, 140, 158),  // mesinha com cinzeiro
    // Gerin
    'gerin.cool':      R('gerin', 54, 14, 412, 644),      // em pé, joinha
    'gerin.cheer':     R('gerin', 366, 30, 476, 612),     // braços pra cima
    'gerin.smug':      R('gerin', 710, 38, 380, 604),     // braços cruzados
    'gerin.strut':     R('gerin', 1093, 30, 405, 580),    // andando em pé
    'gerin.confused':  Object.assign(S('gerin', 370, 600, 342, 520), { exclude: [{ x: 370, y: 600, w: 342, h: 45 }, { x: 370, y: 600, w: 95, h: 520 }, { x: 655, y: 730, w: 60, h: 100 }] }),    // sentado coçando a cabeça
    'gerin.shock':     Object.assign(S('gerin', 706, 590, 560, 524), { exclude: [{ x: 706, y: 590, w: 45, h: 524 }] }),    // susto
    'gerin.playbow':   R('gerin', 0, 678, 451, 452),      // reverência de brincadeira
    'gerin.angry':     Object.assign(R('gerin', 1278, 694, 276, 405), { exclude: [{ x: 1540, y: 694, w: 14, h: 405 }] }),   // rosnando
    'gerin.run':       R('gerin', 30, 1230, 468, 317),    // correndo
    'gerin.point':     R('gerin', 598, 1142, 318, 406),   // apontando
    'gerin.lounge':    R('gerin', 1110, 1222, 437, 342),  // deitado de costas
    // objetos (fundo transparente)
    'obj.iron':        R('obj3', 54, 22, 380, 620),
    'obj.lamp':        R('obj3', 534, 44, 428, 582),
    'obj.hose':        R('obj3', 974, 238, 580, 396),
    'obj.bowling':     R('obj3', 518, 646, 420, 420),
    'obj.brick':       R('obj3', 1014, 646, 494, 374),
    'obj.curtain':     R('obj3', 38, 660, 452, 862),
    'obj.crate':       R('obj3', 438, 1094, 596, 469),
    'obj.bucket':      R('obj3', 1118, 1030, 420, 524),
    // objetos (fundo preto recortado)
    'obj.guitar':      R('obj1', 54, 30, 140, 268),
    'obj.balloon':     R('obj1', 510, 38, 109, 247),
    // balão com caixa (fase 2): balão em cima, caixa (com os barbantes) embaixo
    'obj.bbBalloon':   Object.assign(R('bb', 400, 50, 470, 575), { all: true }),
    'obj.bbBox':       Object.assign(R('bb', 440, 600, 350, 590), { all: true }),
    'obj.bbBoxOnly':   Object.assign(R('bb', 440, 860, 350, 330), { all: true }),
    // gangorra: tábua medida na folha girada 21° (fica horizontal; canvas 1580), base na folha original
    'obj.seesawPlank': Object.assign(R('seesaw', 130, 600, 1320, 232), { all: true }),
    'obj.seesawBase':  Object.assign(R('seesaw0', 440, 690, 390, 275), { all: true, exclude: [{ x: 440, y: 690, w: 118, h: 70 }] }),
    // velas (mesma foto: apagada à esquerda, acesa à direita) e a chama sozinha
    'obj.candle':      Object.assign(R('candles', 230, 60, 220, 1180), { all: true }),
    'obj.candlelit':   Object.assign(R('candles', 830, 20, 240, 1220), { all: true }),
    'obj.flame':       Object.assign(R('candles', 890, 20, 110, 130), { all: true }),
    // um punhado de ração recortado do pote cheio (vira bolinha no desenho)
    'obj.kibble':      Object.assign(R('bowlfull', 560, 330, 150, 150), { all: true }),
    'obj.branch':      R('obj1', 684, 54, 190, 212),
    'obj.bat':         R('obj1', 907, 38, 176, 244),
    'obj.soccer':      R('obj1', 293, 102, 149, 140),
    'obj.tennis':      R('obj1', 1125, 134, 93, 100),
    'obj.trampoline':  R('obj1', 28, 356, 198, 126),
    'obj.toaster':     R('obj1', 300, 334, 174, 156),
    'obj.toast':       R('obj1', 518, 334, 141, 156),
    'obj.jam':         R('obj1', 718, 342, 108, 148),
    'obj.cereal':      R('obj1', 870, 334, 166, 148),
    'obj.kibble':      R('obj1', 1069, 326, 181, 164),
    'obj.petfood':     R('obj1', 38, 566, 141, 189),
    'obj.sofa':        R('obj1', 414, 588, 245, 158),
    'obj.towels':      R('obj1', 710, 574, 181, 172),
    'obj.room':        R('obj1', 957, 550, 229, 236),
    'obj.smoke':       R('obj1', 381, 774, 127, 232),
    'obj.house':       R('obj1', 27, 830, 295, 188),
    'obj.rope':        R('obj1', 582, 814, 164, 180),
    'obj.tree':        R('obj1', 814, 789, 262, 213),
    'obj.kitchen':     R('obj1', 1086, 822, 167, 206),
    'obj.rice':        R('obj1', 46, 1070, 172, 148),
    'obj.salad':       R('obj1', 246, 1070, 190, 156),
    'obj.spaghetti':   R('obj1', 462, 1070, 228, 156),
    'obj.popcorn':     R('obj1', 718, 1070, 180, 149),
    'obj.banana':      R('obj1', 942, 1046, 141, 184),
    'obj.apple':       R('obj1', 1118, 1070, 126, 134),
  };

  // Animações quadro a quadro: cada quadro é uma imagem transparente separada, alinhada pelo centro de massa.
  const ANIMS = {
    'gerin.run':    { frames: [6, 5, 2, 1, 4, 3].map(i => `assets/anim/gerin-run-${i}.webp`), fps: 10 },
    'gerin.runwet': { frames: [6, 5, 2, 1, 4, 3].map(i => `assets/anim/gerin-runwet-${i}.webp`), fps: 10 },
  };
  // Imagens avulsas (uma pose por arquivo, já transparente)
  const SINGLES = {
    'gerin.shakewet': 'assets/anim/gerin-shake-wet.webp', 'gerin.standwet': 'assets/anim/gerin-stand-wet.webp', 'gerin.sitwet': 'assets/anim/gerin-sit-wet.webp',
    'gerin.sleepwet': 'assets/anim/gerin-sleep-wet.webp', 'gerin.angrywet': 'assets/anim/gerin-angry-wet.webp',
    'obj.hose2': 'assets/obj/hose2.png', 'obj.funnel': 'assets/obj/funnel.webp', 'obj.lighter': 'assets/obj/lighter.webp', 'obj.leiteira': 'assets/obj/leiteira.webp', 'obj.rope': 'assets/obj/rope.png', 'obj.bowlGoncaFull': 'assets/obj/bowl-gonca-full.webp', 'obj.bowlGerinFull': 'assets/obj/bowl-gerin-full.webp', 'obj.bowlGerin': 'assets/obj/bowl-gerin.webp', 'obj.bowlGonca': 'assets/obj/bowl-gonca.webp', 'sc.shelf': 'assets/obj/shelf.png', 'obj.bag': 'assets/obj/bag.webp', 'obj.sardine': 'assets/obj/sardine.png', 'obj.toast': 'assets/obj/toast.webp', 'obj.toaster': 'assets/obj/toaster.webp', 'bg.kitchen': 'assets/scene/kitchen.webp', 'gerin.hungry': 'assets/anim/gerin-hungry.webp', 'gerin.eat': 'assets/anim/gerin-eat.webp', 'gonca.hungry': 'assets/anim/gonca-hungry.webp', 'gonca.eat': 'assets/anim/gonca-eat.webp', 'obj.bricks': 'assets/obj/bricks.webp', 'sc.dogbed': 'assets/scene/dogbed.webp', 'obj.tap': 'assets/obj/tap.webp', 'obj.hydrant': 'assets/obj/hydrant.webp', 'obj.bow': 'assets/obj/bow.png', 'obj.bowloaded': 'assets/obj/bowloaded.png', 'obj.arrow': 'assets/obj/arrow.png', 'obj.hose': 'assets/obj/hose.webp', 'obj.chute': 'assets/obj/chute.webp', 'bg.porch': 'assets/scene/porch.webp', 'gerin.shockwet': 'assets/anim/gerin-shock-wet.webp', 'gerin.cheerwet': 'assets/anim/gerin-cheer-wet.webp',
    'sc.fence': 'assets/scene/fence.webp', 'sc.gate': 'assets/scene/gate.webp', 'sc.roof': 'assets/scene/roof.webp', 'sc.window': 'assets/scene/window.webp',
    'sc.armchair': 'assets/scene/armchair.webp', 'sc.box': 'assets/scene/box.webp', 'sc.grass': 'assets/scene/grass.webp', 'bg.sky': 'assets/scene/sky.webp', 'bg.room': 'assets/scene/room2.webp', 'sc.door': 'assets/scene/door.png',
  };
  const anims = {};
  // Centro do tronco: erode a máscara (some com patas, rabo e orelhas finas) e tira o centro do que sobra.
  function centroid(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, cell = 6;
    const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell); let m = new Uint8Array(gw * gh);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 60) m[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
    for (let it = 0; it < 7; it++) { const n = new Uint8Array(gw * gh); for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) { const k = gy * gw + gx; if (m[k] && m[k - 1] && m[k + 1] && m[k - gw] && m[k + gw]) n[k] = 1; } if (!n.some(v => v)) break; m = n; }
    let sx = 0, sy = 0, n = 0; for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) if (m[gy * gw + gx]) { sx += gx; sy += gy; n++; }
    return n ? { cx: (sx / n + 0.5) * cell, cy: (sy / n + 0.5) * cell } : { cx: w / 2, cy: h / 2 };
  }
  async function loadAnims(onProgress) {
    const S = root.GG_SPRITES; const names = Object.keys(ANIMS); let done = 0, total = names.reduce((s, n) => s + ANIMS[n].frames.length, 0);
    await Promise.all(names.map(async n => {
      const fr = await Promise.all(ANIMS[n].frames.map(async url => { const im = await S.loadImage(url); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); const tc = trim(c); const cen = centroid(tc); done++; if (onProgress) onProgress(done / total); return Object.assign({ c: tc }, cen); }));
      const refH = fr.map(f => f.c.height).sort((a, b) => a - b)[fr.length >> 1];
      anims[n] = { frames: fr, fps: ANIMS[n].fps, refH };
    }));
  }
  const anim = name => anims[name];
  const cache = {};
  // Aperta as margens transparentes de um canvas recortado.
  function trim(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  }
  async function load(onProgress) {
    const S = root.GG_SPRITES; const sheets = {}; const names = Object.keys(SHEETS); let done = 0;
    await Promise.all(names.map(async n => { const def = SHEETS[n]; const sh = await S.loadSheet(typeof def === 'string' ? def : def.url, typeof def === 'string' ? undefined : { holes: !!def.holes }); if (def.rot) sh.canvas = rotateSheet(sh.canvas, def.rot); sh.boxes = S.findSprites(sh.canvas, { cell: 8, cover: 0.3 }); sheets[n] = sh; done++; if (onProgress) onProgress(done / names.length); }));
    for (const n of names) sheetCanvas[n] = sheets[n].canvas;
    for (const [name, r] of Object.entries(SPRITES)) { const sh = sheets[r.sheet]; if (!sh) continue; cache[name] = trim(S.cut(sh.canvas, r, sh.boxes.det)); }
    try { await loadAnims(onProgress); } catch (e) { console.error('animações', e); }
    await Promise.all(Object.entries(SINGLES).map(async ([name, url]) => { try { const sh = await S.loadSheet(url, name.startsWith('bg.') ? { mode: 'alpha' } : (SINGLE_OPTS[name] || undefined)); cache[name] = name.startsWith('bg.') ? sh.canvas : trim(sh.canvas); } catch (e) { console.error(name, e); } }));
    return cache;
  }
  // gira a folha inteira em torno do centro, num canvas maior pra nada ficar de fora
  function rotateSheet(c, deg) {
    const o = document.createElement('canvas'); o.width = Math.ceil(c.width * 1.25); o.height = Math.ceil(c.height * 1.25);
    const x = o.getContext('2d'); x.translate(o.width / 2, o.height / 2); x.rotate(deg * Math.PI / 180); x.drawImage(c, -c.width / 2, -c.height / 2); return o;
  }
  const SINGLE_OPTS = { 'obj.leiteira': { holes: true }, 'obj.bow': { holes: true }, 'obj.bowloaded': { holes: true }, 'obj.hydrant': { holes: true } }; // hidrante: vãos do volante // arco + corda fecham um branco por dentro
  const get = name => cache[name];
  const sheetCanvas = {};
  // Desenha um sprite com altura (ou largura) alvo, ancorado nos pés (centro inferior) por padrão.
  function draw(ctx, name, x, y, opts) {
    const c = cache[name]; if (!c) return;
    const o = opts || {}; let w, h;
    if (o.h) { h = o.h; w = c.width * h / c.height; } else if (o.w) { w = o.w; h = c.height * w / c.width; } else { w = c.width; h = c.height; }
    ctx.save(); ctx.translate(x, y); if (o.angle) ctx.rotate(o.angle); if (o.flip) ctx.scale(-1, 1); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const ax = o.anchor === 'center' ? -w / 2 : -w / 2, ay = o.anchor === 'center' ? -h / 2 : -h;
    ctx.drawImage(c, ax, ay, w, h); ctx.restore();
    return { w, h };
  }
  root.GG_ATLAS = { SHEETS, SPRITES, ANIMS, SINGLES, load, get, draw, anim, cache, sheetCanvas };
})(typeof self !== 'undefined' ? self : this);
