/* GerinGonça — arte em colagem: fotos recortadas (atlas) para bichos, objetos e móveis; vetor só para o que não tem foto. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const rad = d => d * Math.PI / 180;
  const A = () => root.GG_ATLAS;

  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function text(c, txt, x, y, size, color, weight, align) { c.font = `${weight || '800'} ${size}px Fredoka, Nunito, sans-serif`; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(txt, x, y); }
  function wood(c, x, y, w, h, r) {
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#c99a62'); g.addColorStop(0.5, '#a97a45'); g.addColorStop(1, '#7d5330');
    rr(c, x, y, w, h, r); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(50,28,10,.7)'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(60,35,15,.35)'; c.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { c.beginPath(); c.moveTo(x + 6, y + h * i / 4); c.bezierCurveTo(x + w * .3, y + h * i / 4 - 3, x + w * .6, y + h * i / 4 + 3, x + w - 6, y + h * i / 4 + (i % 2)); c.stroke(); }
  }
  // desenha um sprite centrado num corpo físico (largura/altura do corpo), com ajuste de escala e deslocamento
  function spriteOnBody(c, name, w, h, o) {
    const at = A(); const s = at && at.get(name); if (!s) return false;
    o = o || {}; const scale = o.scale || 1; const bh = h * scale, bw = s.width * bh / s.height;
    c.save(); if (o.flip) c.scale(-1, 1); c.drawImage(s, -bw / 2 + (o.dx || 0), -bh / 2 + (o.dy || 0), bw, bh); c.restore();
    return true;
  }

  /* ---------- peças ---------- */
  const PARTS = {
    plank(c) { wood(c, -80, -8, 160, 16, 3); },
    // taco e galho: a foto é diagonal; gira para deitar sobre o corpo de 160x16
    bat(c, e) { c.scale(Math.max(0.5, Math.min(2, (e && e.scale) || 1)), 1); const at = A(), im = at && at.get('obj.bat'); if (!im) return wood(c, -80, -8, 160, 16, 3); c.save(); c.rotate(Math.atan2(im.height, im.width)); const L = 178, s = L / Math.hypot(im.width, im.height); c.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); c.restore(); },
    branch(c, e) { c.scale(Math.max(0.5, Math.min(2, (e && e.scale) || 1)), 1); const at = A(), im = at && at.get('obj.branch'); if (!im) return wood(c, -80, -8, 160, 16, 3); c.save(); c.rotate(Math.atan2(im.height, im.width) - 0.1); const L = 190, s = L / Math.hypot(im.width, im.height); c.drawImage(im, -im.width * s / 2, -im.height * s / 2 + 4, im.width * s, im.height * s); c.restore(); },
    candle(c, e, play) { const lit = play && e.data && e.data.lit; if (!spriteOnBody(c, lit ? 'obj.candlelit' : 'obj.candle', 20, 100, { scale: lit ? 1.06 : 1, dy: lit ? -3 : 0 })) { c.fillStyle = '#d8c9a8'; c.fillRect(-8, -50, 16, 100); } },
    lighter(c) { if (!spriteOnBody(c, 'obj.lighter', 36, 90, { scale: 1 })) { c.fillStyle = '#c9a66b'; c.fillRect(-14, -45, 28, 90); } },
    toaster(c, e) { c.save(); if (e.flip) c.scale(-1, 1); if (!spriteOnBody(c, 'obj.toaster', 130, 84, { scale: 1.02 })) { c.fillStyle = '#bbb'; c.fillRect(-65, -42, 130, 84); } c.restore(); },
    sardine(c, e) { c.save(); if (e.flip) c.scale(-1, 1); if (!spriteOnBody(c, 'obj.sardine', 110, 36, { scale: 1.1 })) { c.fillStyle = '#9aa'; c.fillRect(-55, -14, 110, 28); } c.restore(); },
    toast(c) { if (!spriteOnBody(c, 'obj.toast', 54, 54, { scale: 1 })) { c.fillStyle = '#d9913e'; c.fillRect(-27, -27, 54, 54); } },
    funnel(c) { if (!spriteOnBody(c, 'obj.funnel', 90, 96, { scale: 1 })) { c.fillStyle = '#b89a76'; c.beginPath(); c.moveTo(-65, -75); c.lineTo(65, -75); c.lineTo(8, 40); c.lineTo(8, 75); c.lineTo(-8, 75); c.lineTo(-8, 40); c.closePath(); c.fill(); } },
    bag(c) { if (!spriteOnBody(c, 'obj.bag', 70, 100, { scale: 1.02 })) { c.fillStyle = '#b9a07a'; c.fillRect(-35, -50, 70, 100); } },
    // corda: a foto (pedaço reto, vertical) é fatiada ao longo da linha gancho → saco; queimando, uma chama anda pela corda
    bagrope(c, e, play, t) {
      // saco pendurado: o corpo principal é o saco; a corda vai do gancho (fixo) ao canto de cima do saco enquanto não queima
      const at = A(); const d = e.data || {}; const ox = play && e.main ? e.main.position.x : e.x, oy = play && e.main ? e.main.position.y : e.y;
      if (!spriteOnBody(c, 'obj.bag', 70, 100, { scale: 1.02 })) { c.fillStyle = '#b9a07a'; c.fillRect(-35, -50, 70, 100); }
      if ((play && d.cut) || e.loose) return;
      const hx = e.hx - ox, hy = e.hy - oy, bx = -30, by = -50;
      const im = at && at.get('obj.rope'); const L = Math.hypot(bx - hx, by - hy), ang = Math.atan2(by - hy, bx - hx);
      c.save(); c.translate(hx, hy); c.rotate(ang - Math.PI / 2); c.shadowBlur = 0;
      if (im) { const w = 12, segH = 40; for (let y = 0; y < L; y += segH - 1) c.drawImage(im, 0, 0, im.width, im.height, -w / 2, y, w, Math.min(segH, L - y) + 1); }
      else { c.strokeStyle = '#6b4a2e'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, L); c.stroke(); }
      c.restore();
      if (play && d.burn > 0) { const u = d.burnAt != null ? d.burnAt : 0.5, px = hx + (bx - hx) * u, py = hy + (by - hy) * u, pr = Math.min(1, d.burn / 80); c.save(); c.shadowColor = 'transparent'; c.strokeStyle = `rgba(20,10,5,${0.35 + 0.6 * pr})`; c.lineWidth = 9; c.lineCap = 'round'; const sp = 12 + 40 * pr, ux = (bx - hx) / L, uy = (by - hy) / L; c.beginPath(); c.moveTo(px - ux * sp, py - uy * sp); c.lineTo(px + ux * sp, py + uy * sp); c.stroke(); c.restore(); drawFlame(c, px, py + 6, t, 0.55 + 0.35 * pr); }
    },
    // pavio: peça reta (corda fatiada); o trecho já queimado some a partir da ponta acesa; brilho na frente do fogo
    fuse(c, e, play, t) {
      const at = A(); const d = (play && e.data) || {}; const im = at && at.get('obj.rope');
      const L = 160 * Math.max(0.5, Math.min(3.6, e.scale || 1)); const from = d.from === 'B' ? L - (d.pos || 0) : 0, to = d.from === 'B' ? L : L - (d.pos || 0);
      c.save(); c.shadowColor = 'transparent'; c.rotate(-Math.PI / 2);
      if (to > from) { if (im) { const w = 9, segH = 36; for (let y = from; y < to; y += segH - 1) c.drawImage(im, 0, 0, im.width, im.height, -w / 2, y - L / 2, w, Math.min(segH, to - y) + 1); } else { c.strokeStyle = '#6b4a2e'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, from - L / 2); c.lineTo(0, to - L / 2); c.stroke(); } }
      c.restore();
      if (play && d.lit && !d.done && d.front) { const ox = e.main ? e.main.position.x : e.x, oy = e.main ? e.main.position.y : e.y; c.save(); c.rotate(-(e.main ? e.main.angle : rad(e.angle || 0))); const px = d.front.x - ox, py = d.front.y - oy; const g = c.createRadialGradient(px, py, 1, px, py, 22); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.4, 'rgba(255,150,40,.7)'); g.addColorStop(1, 'rgba(255,100,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(px, py, 22, 0, TAU); c.fill(); c.restore(); }
    },
    // ferro de passar pendurado no gancho por uma corda curta
    ironhook(c, e, play) {
      const d = (play && e.data) || {}; const ir = d.iron; const ox = play && e.main ? e.main.position.x : e.x, oy = play && e.main ? e.main.position.y : e.y;
      c.save(); c.shadowColor = 'transparent'; c.fillStyle = '#3b3b3b'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
      if (!d.cut) { const iy = ir ? ir.position.y - 33 - oy : (e.drop || 20); c.strokeStyle = '#5a3d22'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(ir ? ir.position.x - ox : 0, iy); c.stroke(); }
      c.restore();
      if (ir) { c.save(); c.translate(ir.position.x - ox, ir.position.y - oy); c.rotate(ir.angle); if (!spriteOnBody(c, 'obj.iron', 40, 66, { scale: 1.06 })) { c.fillStyle = '#9aa3ad'; c.fillRect(-20, -33, 40, 66); } c.restore(); }
      else { c.save(); c.translate(0, (e.drop || 20) + 33); if (!spriteOnBody(c, 'obj.iron', 40, 66, { scale: 1.06 })) { c.fillStyle = '#9aa3ad'; c.fillRect(-20, -33, 40, 66); } c.restore(); }
    },
    kibble(c) { c.save(); c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.clip(); if (!spriteOnBody(c, 'obj.kibble', 12, 12, { scale: 1.4 })) { c.fillStyle = '#6b4423'; c.fillRect(-6, -6, 12, 12); } c.restore(); },
    bowl(c, e, play) {
      const d = e.data || {}; const full = play && ((e.owner === 'gerin' && d.kibble >= 10) || (e.owner === 'gonca' && d.fish));
      const empty = e.owner === 'gerin' ? 'obj.bowlGerin' : 'obj.bowlGonca', fullName = e.owner === 'gerin' ? 'obj.bowlGerinFull' : 'obj.bowlGoncaFull';
      if (full && e.owner === 'gerin') { /* ração até a borda, sem transbordar: pote vazio + ração da imagem cheia só dentro da boca, um pouco mais baixa */
        spriteOnBody(c, empty, 130, 62, { scale: 1, dy: -6 });
        c.save(); c.beginPath(); c.ellipse(0, -24, 40, 11, 0, 0, TAU); c.clip(); spriteOnBody(c, fullName, 130, 62, { scale: 1, dy: 2 }); c.restore(); return;
      }
      if (!spriteOnBody(c, full ? fullName : empty, 130, 62, { scale: 1, dy: -6 })) { c.fillStyle = '#c9b48f'; c.fillRect(-65, -31, 130, 62); }
    },
    bricks(c) { if (!spriteOnBody(c, 'obj.bricks', 62, 132, { scale: 1.02 })) { c.fillStyle = '#b5523a'; c.fillRect(-30, -66, 60, 132); } },
    block(c) { if (!spriteOnBody(c, 'obj.brick', 60, 44, { scale: 1.05 })) { rr(c, -30, -22, 60, 44, 3); c.fillStyle = '#c96a4a'; c.fill(); } },
    trampoline(c) {
      c.strokeStyle = '#4a4e57'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-40, -3); c.lineTo(-45, 13); c.moveTo(40, -3); c.lineTo(45, 13); c.stroke();
      c.strokeStyle = '#9aa0a8'; c.lineWidth = 1.6; for (let x = -33; x <= 33; x += 16.5) { c.beginPath(); c.moveTo(x, -5); c.lineTo(x - 3.5, 0); c.lineTo(x + 3.5, 3.5); c.lineTo(x - 3.5, 7); c.lineTo(x, 10); c.stroke(); }
      rr(c, -50, -13, 100, 9, 5); c.fillStyle = '#20242b'; c.fill(); c.strokeStyle = '#3a86ff'; c.lineWidth = 2.5; c.stroke();
    },
    bumper(c) { const g = c.createRadialGradient(-9, -9, 3, 0, 0, 27); g.addColorStop(0, '#ff9a9e'); g.addColorStop(0.5, '#e63946'); g.addColorStop(1, '#7a1520'); c.beginPath(); c.arc(0, 0, 27, 0, TAU); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); text(c, '★', 0, 1, 16, '#fff'); },
    conveyor(c, e, play, t) {
      rr(c, -90, -12, 180, 24, 12); c.fillStyle = '#2d3138'; c.fill(); c.strokeStyle = '#111'; c.lineWidth = 2; c.stroke();
      c.save(); rr(c, -90, -12, 180, 24, 12); c.clip(); const dir = e.flip ? -1 : 1, off = play ? (t * 2.2 * dir) % 16 : 0; c.strokeStyle = '#555c66'; c.lineWidth = 3;
      for (let x = -100 + off; x < 100; x += 16) { c.beginPath(); c.moveTo(x, -12); c.lineTo(x - 6, 12); c.stroke(); } c.restore();
      for (const x of [-78, 78]) { c.beginPath(); c.arc(x, 0, 6.5, 0, TAU); c.fillStyle = '#c7ccd4'; c.fill(); c.strokeStyle = '#111'; c.stroke(); }
      if (!play) { c.save(); if (e.flip) c.scale(-1, 1); text(c, '➜', 0, 1, 18, '#ffd166'); c.restore(); }
    },
    fan(c, e, play, t) {
      c.save(); if (e.flip) c.scale(-1, 1);
      rr(c, -16, 22, 32, 12, 4); c.fillStyle = '#23262b'; c.fill(); c.fillStyle = '#3b4047'; c.fillRect(-4, 8, 8, 14);
      c.beginPath(); c.arc(-4, -10, 24, 0, TAU); c.fillStyle = '#1b1e22'; c.fill();
      c.save(); c.translate(-4, -10); c.rotate(play ? t * 0.7 : 0.4); c.fillStyle = '#5a6069'; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); ell(c, 10, 0, 11, 5); c.fill(); } c.restore();
      c.strokeStyle = '#6b7280'; c.lineWidth = 1; for (let r = 6; r < 24; r += 5) { c.beginPath(); c.arc(-4, -10, r, 0, TAU); c.stroke(); }
      c.beginPath(); c.arc(-4, -10, 24, 0, TAU); c.strokeStyle = '#9ca3af'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = play ? 'rgba(160,200,255,.8)' : 'rgba(120,150,200,.45)'; c.lineWidth = 2; c.setLineDash([9, 7]); c.lineDashOffset = play ? -t * 3 : 0;
      for (const dy of [-24, -10, 4]) { c.beginPath(); c.moveTo(22, dy); c.lineTo(play ? 140 : 66, dy); c.stroke(); } c.setLineDash([]); c.restore();
    },
    // bola: a foto vem meio torta; recorta num círculo perfeito (o contorno claro vem de um disco por baixo)
    ball(c) { c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fillStyle = '#f2f2f2'; c.fill(); c.save(); c.shadowColor = 'transparent'; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.clip(); spriteOnBody(c, 'obj.soccer', 36, 36, { scale: 1.2 }); c.restore(); },
    tennis(c) { if (!spriteOnBody(c, 'obj.tennis', 28, 28, { scale: 1.08 })) { c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fillStyle = '#cfe34e'; c.fill(); } },
    bowling(c) { if (!spriteOnBody(c, 'obj.bowling', 48, 48, { scale: 1.06 })) { c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fillStyle = '#4a1020'; c.fill(); } },
    crate(c) { if (!spriteOnBody(c, 'obj.crate', 64, 50, { scale: 1.06 })) wood(c, -32, -25, 64, 50, 2); },
    iron(c) { if (!spriteOnBody(c, 'obj.iron', 40, 66, { scale: 1.06 })) { rr(c, -20, -33, 40, 66, 6); c.fillStyle = '#9aa3ad'; c.fill(); } },
    balloon(c) { if (!spriteOnBody(c, 'obj.balloon', 44, 44, { scale: 2.3, dy: 28 })) { ell(c, 0, 0, 22, 24); c.fillStyle = '#e63946'; c.fill(); } },
    bucket(c) { if (!spriteOnBody(c, 'obj.bucket', 70, 88, { scale: 1.0 })) { rr(c, -35, -44, 70, 88, 4); c.fillStyle = '#8f98a3'; c.fill(); } },
    // arco: foto do arco em pé, espelhada (corda pra trás, barriga pra frente); a flecha vai por cima, apontando pro +x
    bow(c, e, play) {
      const at = A(); const fired = play && e.data && e.data.fired; const bow = at && at.get('obj.bow'), arr = at && at.get('obj.arrow');
      if (bow) { const h = 250, w = bow.width * h / bow.height; c.save(); c.scale(-1, 1); c.drawImage(bow, -w / 2, -h / 2, w, h); c.drawImage(bow, -w / 2, -h / 2, w, h); c.restore(); } // duas passadas: o contorno claro fica mais forte num arco tão fino
      else { c.strokeStyle = '#5a3e2a'; c.lineWidth = 6; c.beginPath(); c.arc(-40, 0, 70, -1.2, 1.2); c.stroke(); }
      if (!fired && arr) { const pb = ((e.power || 17) - 6) * 2.2, L = 165, hh = arr.height * L / arr.width, nock = -26 - pb; c.save(); c.scale(-1, 1); c.drawImage(arr, -(nock + L), -hh / 2, L, hh); c.restore(); }
    },
    arrow(c) { const at = A(), im = at && at.get('obj.arrow'); if (!im) { c.fillStyle = '#5a3e2a'; c.fillRect(-40, -3, 80, 6); return; } c.save(); c.scale(-1, 1); const w = 150, h = im.height * w / im.width; c.drawImage(im, -w / 2, -h / 2, w, h); c.restore(); },
    // balão com caixa: a caixa é o corpo; o balão (parado) fica 175px acima até estourar
    balloonbox(c, e, play) {
      const at = A(); const popped = play && e.data && e.data.popped;
      if (!popped) { const bal = at && at.get('obj.bbBalloon'); if (bal) { const h = 130, w = bal.width * h / bal.height; c.drawImage(bal, -w / 2 + 3, -140 - h / 2, w, h); } }
      const bx = at && at.get(popped ? 'obj.bbBoxOnly' : 'obj.bbBox'); if (bx) { const w = 68, h = bx.height * w / bx.width; c.drawImage(bx, -w / 2, popped ? -h / 2 : -h * 0.72, w, h); }
      else { rr(c, -31, -36, 62, 72, 4); c.fillStyle = '#b9905e'; c.fill(); }
    },
    // gangorra: base fixa (corpo principal) + tábua girando no pino, 78px acima do pé
    seesaw(c, e, play) {
      const at = A(); const base = at && at.get('obj.seesawBase'), plank = at && at.get('obj.seesawPlank');
      const py = -44; // pino relativo ao corpo da base (base centrada em y-34; pino em y-78)
      if (base) { const w = 98, h = base.height * w / base.width; c.drawImage(base, -w / 2 + 2, py + 10, w, h); }
      else { c.fillStyle = '#4a5a55'; c.fillRect(-12, py, 24, 78); }
      const ang = play && e.data && e.data.plank ? e.data.plank.angle : rad(24);
      c.save(); c.translate(0, py); c.rotate(ang);
      if (plank) { const w = 336, h = plank.height * w / plank.width; c.drawImage(plank, -w / 2 - 2, 13 - h, w, h); }
      else { wood(c, -165, -7, 330, 14, 3); }
      c.restore();
    },
    chute(c, e) { const at = A(), im = at && at.get('obj.chute'); c.save(); if (e.flip) c.scale(-1, 1); if (im) { const w = 262, h = im.height * w / im.width; c.drawImage(im, -w / 2, -h / 2 + 4, w, h); } else { c.strokeStyle = '#4f8a7a'; c.lineWidth = 10; c.beginPath(); c.moveTo(-118, -62); c.quadraticCurveTo(-30, -40, 128, 84); c.stroke(); } c.restore(); },
    // mangueira: a foto reta é fatiada e redesenhada ao longo de uma curva (ponta encaixada → dobra → bico)
    hose(c, e, play, t) {
      const G = root.GG, at = A(), im = at && at.get('obj.hose2'); const hp = G.water.hosePts(e);
      const ox = e.x, oy = e.y, P0 = { x: 0, y: 0 }, C = { x: hp.c.x - ox, y: hp.c.y - oy }, P1 = { x: hp.p1.x - ox, y: hp.p1.y - oy };
      const at2 = u => ({ x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * C.x + u * u * P1.x, y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * C.y + u * u * P1.y });
      const N = 30; const pts = []; for (let i = 0; i <= N; i++) pts.push(at2(i / N));
      c.save(); c.shadowColor = 'transparent'; c.shadowBlur = 0; c.lineCap = 'round'; c.lineJoin = 'round';
      if (im) { const H = 21, sw = im.width / N; for (let i = 0; i < N; i++) { const a = pts[i], b = pts[i + 1], seg = Math.hypot(b.x - a.x, b.y - a.y); c.save(); c.translate((a.x + b.x) / 2, (a.y + b.y) / 2); c.rotate(Math.atan2(b.y - a.y, b.x - a.x)); c.drawImage(im, i * sw, 0, sw, im.height, -seg / 2 - 0.8, -H / 2, seg + 1.6, H); c.restore(); } }
      else { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const q of pts) c.lineTo(q.x, q.y); c.strokeStyle = '#a23a32'; c.lineWidth = 18; c.stroke(); }
      // água: mesma parábola do motor. Na edição, um pontilhado fraco mostra pra onde o jato vai.
      const pr = play ? ((e.data && e.data.pressure) || 0) : 0, JG = G.JET_G, range = G.JET_LEN * (0.25 + 0.75 * pr), d = hp.dir, floorY = G.FLOOR - oy;
      if (pr > 0) { c.fillStyle = play ? 'rgba(175,220,255,.92)' : 'rgba(175,220,255,.4)'; const n = play ? Math.round(14 + 40 * pr) : 18;
        for (let i = 0; i < n; i++) { const u = 8 + ((i * range / n + (play ? t * 9 : 0)) % Math.max(20, range - 8)), px = P1.x + d.x * u, py = P1.y + d.y * u + JG * u * u; if (py > floorY) continue; const j = ((i * 53) % 13) - 6; c.beginPath(); c.arc(px + j * 0.5, py + j, play ? 2.6 + (i % 3) * 1.2 : 2.4, 0, TAU); c.fill(); } }
      c.restore();
    },
    tap(c, e) { c.save(); if (e.flip) c.scale(-1, 1); if (!spriteOnBody(c, 'obj.tap', 70, 64, { scale: 1 })) { c.fillStyle = '#777'; c.fillRect(-30, -20, 60, 40); } c.restore(); },
    hydrant(c, e) { c.save(); if (e.flip) c.scale(-1, 1); if (!spriteOnBody(c, 'obj.hydrant', 76, 110, { scale: 1 })) { c.fillStyle = '#a23a32'; c.fillRect(-30, -55, 60, 110); } c.restore(); },
  };

  /* ---------- cenário ---------- */
  function sprite(c, name, x, y, o) { const at = A(); if (at && at.get(name)) return at.draw(c, name, x, y, o); return null; }
  const SCENE = {
    // recorte fotográfico: âncora no pé (centro inferior), altura ou largura alvo, inclinação leve e sombra de colagem
    img(c, s) { const at = A(); const im = at && at.get(s.sprite); if (!im) return; const h = s.h || im.height * (s.w / im.width), w = im.width * h / im.height; c.save(); c.translate(s.x, s.y); c.rotate(rad(s.angle || 0)); if (s.flip) c.scale(-1, 1); if (s.shadow !== false) { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14; c.shadowOffsetX = 4; c.shadowOffsetY = 8; } if (s.alpha != null) c.globalAlpha = s.alpha; c.drawImage(im, -w / 2, -h, w, h); c.restore(); },
    // faixa repetida na horizontal (grama, cerca comprida): imagem ancorada no pé, repetida de x0 a x1
    strip(c, s) { const at = A(); const im = at && at.get(s.sprite); if (!im) return; const h = s.h, w = im.width * h / im.height; c.save(); c.beginPath(); if (s.cut) { c.moveTo(s.x0, 0); c.lineTo(s.cut.top, 0); c.lineTo(s.cut.top, s.y - h); c.lineTo(s.cut.bottom, s.y + 40); c.lineTo(s.x0, s.y + 40); c.closePath(); } else c.rect(s.x0, 0, s.x1 - s.x0, s.y + 40); c.clip(); for (let x = s.x0 - (s.offset || 0); x < s.x1; x += w - 2) c.drawImage(im, x, s.y - h, w, h); c.restore(); },
    // foto inteira com posição e largura explícitas (canto superior esquerdo em x,y)
    photo(c, s) { const at = A(); const img = at && at.get(s.sprite); if (!img) return; const h = img.height * s.w / img.width; c.drawImage(img, s.x, s.y, s.w, h);
      if (s.mirrorLeft) { const m = s.mirrorLeft, sw = m * img.width / s.w; c.save(); c.translate(s.x, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, sw, img.height, 0, s.y, m, h); c.restore(); } if (s.dim) { c.fillStyle = `rgba(0,0,0,${s.dim})`; c.fillRect(s.x, s.y, s.w, h); } },
    slab() {},
    crop(c, s) { const at = A(); const im = at && at.get(s.sprite); if (!im) return; c.drawImage(im, s.sx, s.sy, s.sw, s.sh, s.x, s.y, s.w, s.h); },
    prop(c, s) { SCENE.img(c, s); },
    // só a parte de baixo do recorte, desenhada por cima dos bichos (borda da frente da cama)
    propfront(c, s) { const at = A(); const im = at && at.get(s.sprite); if (!im) return; const h = s.h || im.height * (s.w / im.width), w = im.width * h / im.height, f = s.from || 0.7; c.drawImage(im, 0, im.height * f, im.width, im.height * (1 - f), s.x - w / 2, s.y - h * (1 - f), w, h * (1 - f)); },
    backdrop(c, s) { const at = A(); const img = at && at.get(s.sprite); if (!img) return; c.save(); c.beginPath(); c.rect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0); c.clip(); const sc = Math.max((s.x1 - s.x0) / img.width, (s.y1 - s.y0) / img.height); const w = img.width * sc, h = img.height * sc; c.imageSmoothingQuality = 'high'; c.drawImage(img, s.x0 + (s.x1 - s.x0 - w) / 2, s.anchor === 'top' ? s.y0 - (s.shift || 0) : s.y1 - h, w, h); if (s.dim) { c.fillStyle = `rgba(40,30,20,${s.dim})`; c.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0); } c.restore(); },
    wall(c, s) { if (s.hidden) return; const g = c.createLinearGradient(s.x - s.w / 2, 0, s.x + s.w / 2, 0); g.addColorStop(0, '#d8cbb3'); g.addColorStop(1, '#b9a68a'); c.fillStyle = g; c.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h); },
    ceiling(c, s) { if (s.hidden) return; const h = s.h || 20; c.fillStyle = '#cbbc9e'; c.fillRect(s.x - s.w / 2, s.y - h / 2, s.w, h); },
    roof(c, s) { c.beginPath(); c.moveTo(s.x - 320, s.y - 12); c.lineTo(s.x, s.y - 150); c.lineTo(s.x + 320, s.y - 12); c.closePath(); const g = c.createLinearGradient(0, s.y - 150, 0, s.y); g.addColorStop(0, '#8b3a2f'); g.addColorStop(1, '#5e241c'); c.fillStyle = g; c.fill(); c.strokeStyle = '#3a1510'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(40,15,10,.45)'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { const t = i / 6; c.beginPath(); c.moveTo(s.x - 320 + 320 * t, s.y - 12 - 138 * t); c.lineTo(s.x + 320 - 320 * t, s.y - 12 - 138 * t); c.stroke(); } },
    shelf(c, s) { wood(c, s.x - (s.w || 140) / 2, s.y - 7, s.w || 140, 14, 3); },
    door(c, s) { c.fillStyle = '#5a3e2a'; c.fillRect(s.x - 18, s.y - 74, 36, 8); c.strokeStyle = '#5a3e2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(s.x - 14, s.y - 70); c.lineTo(s.x - 14, s.y + 70); c.moveTo(s.x + 14, s.y - 70); c.lineTo(s.x + 14, s.y + 70); c.stroke(); c.fillStyle = '#a8814f'; c.fillRect(s.x - 10, s.y - 66, 8, 136); c.beginPath(); c.arc(s.x - 4, s.y + 6, 2.5, 0, TAU); c.fillStyle = '#ffd166'; c.fill(); },
    window(c, s) {
      rr(c, s.x - 70, s.y - 60, 140, 120, 6); c.fillStyle = s.sun ? '#cfe8ff' : '#8fa5b8'; c.fill();
      if (s.sun) { const g = c.createRadialGradient(s.x - 30, s.y - 30, 5, s.x - 30, s.y - 30, 80); g.addColorStop(0, 'rgba(255,240,150,.95)'); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; c.fill(); }
      else { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(s.x - 60 + i * 15, s.y - 55); c.lineTo(s.x - 66 + i * 15, s.y - 30 + (i % 3) * 20); c.stroke(); } }
      c.strokeStyle = '#6b4a2e'; c.lineWidth = 7; rr(c, s.x - 70, s.y - 60, 140, 120, 6); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(s.x, s.y - 60); c.lineTo(s.x, s.y + 60); c.moveTo(s.x - 70, s.y); c.lineTo(s.x + 70, s.y); c.stroke();
      sprite(c, 'obj.curtain', s.x - 86, s.y + 74, { h: 150 }); sprite(c, 'obj.curtain', s.x + 86, s.y + 74, { h: 150, flip: true });
    },
    picture(c, s) { rr(c, s.x - 44, s.y - 34, 88, 68, 3); c.fillStyle = '#2b2118'; c.fill(); c.strokeStyle = '#8a5a3c'; c.lineWidth = 6; c.stroke(); c.save(); rr(c, s.x - 38, s.y - 28, 76, 56, 2); c.clip(); sprite(c, 'obj.room', s.x, s.y + 40, { h: 80 }); c.restore(); },
    rug(c, s) { ell(c, s.x, s.y - 2, 130, 12); c.fillStyle = '#7a2e3a'; c.fill(); ell(c, s.x, s.y - 2, 100, 8); c.fillStyle = '#a44a56'; c.fill(); },
    cushion(c, s) { rr(c, s.x - 55, s.y - 18, 110, 18, 9); c.fillStyle = '#5b4a8a'; c.fill(); c.strokeStyle = '#3a2d63'; c.lineWidth = 2; c.stroke(); },
    sofa(c, s) { if (!sprite(c, 'obj.sofa', s.x, s.y + 2, { w: 270 })) { rr(c, s.x - 130, s.y - 100, 260, 100, 10); c.fillStyle = '#4c8f6f'; c.fill(); } },
    bed(c, s) { rr(c, s.x - 80, s.y - 40, 160, 40, 14); c.fillStyle = '#6b4e37'; c.fill(); c.strokeStyle = '#3f2c1d'; c.lineWidth = 2; c.stroke(); rr(c, s.x - 66, s.y - 30, 132, 26, 10); c.fillStyle = '#c9b48f'; c.fill(); },
    table(c, s) { wood(c, s.x - 100, s.y - 107, 200, 14, 3); c.fillStyle = '#5a3e2a'; c.fillRect(s.x - 92, s.y - 93, 14, 93); c.fillRect(s.x + 78, s.y - 93, 14, 93); },
    guitar(c, s) {
      const y = s.wall ? s.y : s.y - 60;
      if (s.wall) { c.strokeStyle = '#5a3e2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(s.x, y - 80); c.lineTo(s.x, y - 100); c.stroke(); c.beginPath(); c.arc(s.x, y - 102, 4, 0, TAU); c.fillStyle = '#5a3e2a'; c.fill(); }
      c.save(); c.translate(s.x, y); c.rotate(rad(s.angle || 0)); if (!spriteOnBody(c, 'obj.guitar', 60, 160, { scale: 1.02 })) { rr(c, -25, -80, 50, 160, 20); c.fillStyle = '#d9913e'; c.fill(); } c.restore();
    },
    lamp(c, s, on) { if (on) { const g = c.createRadialGradient(s.x, s.y - 100, 5, s.x, s.y - 100, 160); g.addColorStop(0, 'rgba(255,215,120,.55)'); g.addColorStop(1, 'rgba(255,215,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y - 100, 160, 0, TAU); c.fill(); } if (!sprite(c, 'obj.lamp', s.x, s.y, { h: 150 })) { c.fillStyle = '#6b7280'; c.fillRect(s.x - 3, s.y - 74, 6, 74); } },
    plant(c, s) { c.beginPath(); c.moveTo(s.x - 24, s.y - 30); c.lineTo(s.x - 18, s.y); c.lineTo(s.x + 18, s.y); c.lineTo(s.x + 24, s.y - 30); c.closePath(); c.fillStyle = '#9b4a34'; c.fill(); c.fillStyle = '#3f7d4a'; for (const [dx, dy, r, a] of [[-14, -46, 16, -0.6], [12, -50, 18, 0.5], [0, -62, 15, 0], [-6, -40, 10, 0.2]]) { ell(c, s.x + dx, s.y + dy, r, r * 0.55, a); c.fill(); } },
    tree(c, s) { sprite(c, 'obj.tree', s.x, s.y, { h: s.h || 300 }); },
    armchair(c, s) { SCENE.img(c, { sprite: 'sc.armchair', x: s.x, y: s.y + 4, h: 300, angle: s.angle || 0 }); },
    house(c, s) { sprite(c, 'obj.house', s.x, s.y, { h: s.h || 200 }); },
    fence(c, s) { c.fillStyle = '#d9cfbf'; for (let i = -3; i <= 3; i++) { const x = s.x + i * 26; c.beginPath(); c.moveTo(x - 7, s.y); c.lineTo(x - 7, s.y - 48); c.lineTo(x, s.y - 58); c.lineTo(x + 7, s.y - 48); c.lineTo(x + 7, s.y); c.closePath(); c.fill(); c.strokeStyle = '#7f7360'; c.lineWidth = 1.2; c.stroke(); } c.fillStyle = '#d9cfbf'; c.fillRect(s.x - 90, s.y - 40, 180, 7); c.fillRect(s.x - 90, s.y - 18, 180, 7); },
    tv: () => { }, kitchen: () => { },
  };

  /* ---------- fundo ---------- */
  let wallTex = null;
  function wallTexture() {
    if (wallTex) return wallTex; const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#e4d6bd'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${80 + Math.random() * 60},${60 + Math.random() * 40},${30 + Math.random() * 30},${0.05 + Math.random() * 0.08})`; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    x.fillStyle = 'rgba(120,90,50,.07)'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 14, 256);
    wallTex = c; return c;
  }
  function background(c, level, W, H, FLOOR, t) {
    // parede interna (textura) com sombra no topo e no rodapé
    c.save(); c.fillStyle = c.createPattern(wallTexture(), 'repeat'); c.fillRect(0, 0, W, FLOOR); c.restore();
    const vg = c.createLinearGradient(0, 0, 0, FLOOR); vg.addColorStop(0, 'rgba(60,40,20,.25)'); vg.addColorStop(0.25, 'rgba(60,40,20,0)'); vg.addColorStop(0.85, 'rgba(60,40,20,0)'); vg.addColorStop(1, 'rgba(60,40,20,.28)'); c.fillStyle = vg; c.fillRect(0, 0, W, FLOOR);
    if (level.rain) {
      const g = c.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#4f5d6b'); g.addColorStop(1, '#8e9aa6'); c.fillStyle = g; c.fillRect(level.rain.from, 0, level.rain.to - level.rain.from, FLOOR);
      c.fillStyle = '#4a7a3c'; c.fillRect(level.rain.from, FLOOR - 10, level.rain.to - level.rain.from, 10);
    }
    // rodapé e piso
    const f = c.createLinearGradient(0, FLOOR, 0, H); f.addColorStop(0, '#9a6a3f'); f.addColorStop(1, '#5c3a1f'); c.fillStyle = f; c.fillRect(0, FLOOR, W, H - FLOOR);
    if (level.rain) { const e = c.createLinearGradient(0, FLOOR, 0, H); e.addColorStop(0, '#4f3d2c'); e.addColorStop(1, '#2f2418'); c.fillStyle = e; c.fillRect(level.rain.from, FLOOR, level.rain.to - level.rain.from, H - FLOOR); }
  }
  function rainFront(c, level, W, FLOOR, t) {
    if (!level.rain) return;
    c.strokeStyle = 'rgba(220,235,255,.55)'; c.lineWidth = 1.5;
    for (let i = 0; i < 110; i++) { const x = level.rain.from + ((i * 137 + t * 2) % (level.rain.to - level.rain.from)); const y = (i * 91 + t * 11) % FLOOR; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 18); c.stroke(); }
  }

  /* ---------- personagens (sprites) ---------- */
  // sprite por estado, altura em pixels e lado nativo (1 = olhando para a direita)
  const POSES = {
    gerin: {
      // 'sit' seco usa o gerin.cool: o 'gerin.confused' da folha vem mutilado; falta um Gerin seco sentado
      sit: ['gerin.cool', 200, 1], notice: ['gerin.cool', 200, 1], sleep: ['gerin.lounge', 140, 1], chase: ['gerin.run', 150, -1], walk: ['gerin.strut', 205, 1],
      startled: ['gerin.shock', 190, 1], alert: ['gerin.cool', 205, 1], got: ['gerin.playbow', 160, -1], happy: ['gerin.cheer', 210, 1],
      laugh: ['gerin.cheer', 210, 1], shake: ['gerin.shock', 190, 1], angry: ['gerin.angry', 160, 1], hungry: ['gerin.hungry', 180, 1], eat: ['gerin.eat', 150, 1], smug: ['gerin.smug', 205, 1], point: ['gerin.point', 190, 1], panic: ['gerin.shock', 190, 1], hug: ['gerin.playbow', 160, -1],
    },
    gerinWet: {
      sit: ['gerin.sitwet', 190, 1], notice: ['gerin.standwet', 190, 1], sleep: ['gerin.sleepwet', 120, 1], startled: ['gerin.shockwet', 200, -1], panic: ['gerin.shockwet', 200, -1],
      alert: ['gerin.standwet', 190, 1], got: ['gerin.standwet', 190, 1], happy: ['gerin.cheerwet', 230, 1], laugh: ['gerin.cheerwet', 230, 1], shake: ['gerin.shakewet', 200, 1], smug: ['gerin.standwet', 190, 1], point: ['gerin.cheerwet', 230, 1],
    },
    gonca: {
      sit: ['gonca.sit', 180, -1], sleep: ['gonca.lie', 130, -1], chase: ['gonca.walk', 160, -1], walk: ['gonca.walk', 160, -1],
      startled: ['gonca.hiss', 165, -1], panic: ['gonca.hiss', 165, -1], alert: ['gonca.stretch', 120, -1], got: ['gonca.walk', 160, -1], happy: ['gonca.robe', 175, 1],
      laugh: ['gonca.chair', 205, 1], shake: ['gonca.hiss', 165, -1], angry: ['gonca.table', 175, 1], hungry: ['gonca.hungry', 175, 1], eat: ['gonca.eat', 130, -1], smug: ['gonca.table', 185, 1], point: ['gonca.book', 165, 1], hug: ['gonca.robe', 175, 1],
    },
  };
  function poseFor(a) {
    const P = POSES[a.who]; let p = P[a.state] || P.sit;
    if (a.who === 'gerin' && a.wet && POSES.gerinWet[a.state] && A().get(POSES.gerinWet[a.state][0])) p = POSES.gerinWet[a.state];
    if (a.state === 'sleep' && a.sleepSprite && !(a.who === 'gerin' && a.wet)) p = [a.sleepSprite[0], a.sleepSprite[1], a.sleepSprite[2] != null ? a.sleepSprite[2] : -1, a.sleepSprite[3] || 0]; // 4º valor: quanto a pose fica acima do chão (deitada numa cama)
    if (a.pose && A().get(a.pose[0])) p = a.pose;
    return p;
  }
  function drawActor(c, a, t, extra) {
    const p = extra && extra.pos ? extra.pos : { x: a.x, y: a.y }; // p = centro do corpo físico
    const pf = poseFor(a), [name, hgt, native] = pf, lift = pf[3] || 0; const at = A(); const s = at && at.get(name);
    const feetY = p.y + (a.bodyH || 100) / 2;
    const moving = a.state === 'chase' || a.state === 'walk';
    const bob = moving ? Math.abs(Math.sin(t * 0.35)) * 6 : (a.state === 'laugh' ? Math.abs(Math.sin(t * 0.5)) * 4 : Math.sin(t * 0.08) * 1.2);
    const animName0 = (a.who === 'gerin' && moving) ? (a.wet ? 'gerin.runwet' : 'gerin.run') : null;
    const usesAnim = !!(animName0 && at && at.anim(animName0));
    c.save(); c.translate(p.x, feetY - lift - (usesAnim ? 0 : bob));
    if (a.state === 'shake') c.rotate(Math.sin(t * 1.6) * 0.16);
    if (a.state === 'startled' || a.state === 'panic') c.rotate(Math.sin(t * 0.9) * 0.05);
    if (a.wet && a.who !== 'gerin') c.filter = 'saturate(0.55) brightness(0.82)';
    const flip = (a.facing || 1) !== native;
    const animName = (a.who === 'gerin' && moving) ? (a.wet ? 'gerin.runwet' : 'gerin.run') : null;
    const an = animName && at && at.anim(animName);
    if (an) {
      const H = 150, sc = H / an.refH, fps = a.state === 'walk' ? an.fps * 0.7 : an.fps;
      const f = an.frames[Math.floor(t * fps / 60) % an.frames.length];
      c.save(); if ((a.facing || 1) !== 1) c.scale(-1, 1); c.drawImage(f.c, -f.cx * sc, -H * 0.62 - f.cy * sc + f.c.height * sc * 0, f.c.width * sc, f.c.height * sc); c.restore();
    }
    else if (s) { const w = s.width * hgt / s.height; c.save(); if (flip) c.scale(-1, 1); c.drawImage(s, -w / 2, -hgt, w, hgt); c.restore(); }
    else { c.fillStyle = a.who === 'gerin' ? '#c98a43' : '#a9adb3'; ell(c, 0, -40, 45, 40); c.fill(); }
    c.filter = 'none';
    if (a.wet && a.who !== 'gerin') { c.fillStyle = 'rgba(130,190,255,.85)'; for (let i = 0; i < 6; i++) { const ph = ((t * 0.035) + i * 0.17) % 1; ell(c, -36 + i * 14, -hgt * 0.8 + ph * hgt * 0.9, 2.2, 3.6); c.fill(); } }
    c.restore();
    if (a.state === 'sleep' && t % 70 < 45) { text(c, 'z', p.x + (a.facing || 1) * 26, feetY - hgt - 6 - (t % 70) * 0.4, 16 + (t % 70) * 0.15, `rgba(60,40,20,${1 - (t % 70) / 45})`, '700'); }
    if (a.bubble) drawBubble(c, a.bubble.text, p.x + (a.facing || 1) * 34, feetY - hgt - 10, a.bubble.big);
  }

  function drawBubble(c, txt, x, y, big) {
    const size = big ? 22 : 17; c.font = `700 ${size}px Fredoka, Nunito, sans-serif`;
    const words = txt.split(' '); const lines = []; let cur = '';
    for (const wd of words) { const tst = cur ? cur + ' ' + wd : wd; if (c.measureText(tst).width > (big ? 380 : 300) && cur) { lines.push(cur); cur = wd; } else cur = tst; } if (cur) lines.push(cur);
    const w = Math.max(...lines.map(l => c.measureText(l).width)) + 28, h = lines.length * (size + 6) + 16;
    const bx = Math.max(w / 2 + 6, Math.min(((root.GG && root.GG.W) || 2000) - w / 2 - 6, x)), by = Math.max(h + 8, y);
    rr(c, bx - w / 2, by - h, w, h, 14); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#2b2118'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(bx - 8, by - 1); c.lineTo(bx + 8, by - 1); c.lineTo(bx + (x < bx ? -3 : 3), by + 12); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(bx - 7, by - 3, 14, 3);
    lines.forEach((l, i) => text(c, l, bx, by - h + 8 + (size + 6) * i + size / 2 + 2, size, '#2b2118', '700'));
  }

  function drawFight(c, v, t, actors) {
    const x = v.x + Math.sin(t * 1.3) * 4, y = v.y - 30 + Math.cos(t * 1.1) * 3;
    c.save();
    // os dois aparecendo e sumindo na nuvem
    const k = Math.floor(t / 9) % 4;
    const sh = A() && A().get('gonca.hiss'), sd = A() && A().get('gerin.angry');
    if (sd) { const h = 150, w = sd.width * h / sd.height; c.save(); c.translate(x - 70 + (k % 2) * 20, y + 50); c.rotate(-0.3 + k * 0.15); c.drawImage(sd, -w / 2, -h, w, h); c.restore(); }
    if (sh) { const h = 165, w = sh.width * h / sh.height; c.save(); c.translate(x + 70 - (k % 2) * 20, y + 50); c.rotate(0.25 - k * 0.12); c.scale(-1, 1); c.drawImage(sh, -w / 2, -h, w, h); c.restore(); }
    c.fillStyle = 'rgba(232,226,214,.94)'; c.strokeStyle = '#8f8677'; c.lineWidth = 2;
    for (const [dx, dy, r] of [[-60, 10, 40], [-24, -26, 46], [28, -22, 48], [66, 12, 40], [12, 28, 44], [-36, 30, 34]]) { c.beginPath(); c.arc(x + dx + Math.sin(t * 0.9 + dx) * 3, y + dy + Math.cos(t * 0.7 + dy) * 3, r, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = '#ffd166'; for (let i = 0; i < 5; i++) { const ang = t * 0.05 + i * 1.3, rr2 = 80 + (i % 2) * 14; text(c, '★', x + Math.cos(ang) * rr2, y + Math.sin(ang) * rr2 * 0.6, 14 + (i % 3) * 4, '#ffd166'); }
    const words = ['MIAU!', 'AU!', 'GRRR!', 'FSSS!', 'AU AU!', 'SAI!'], wi = Math.floor(t / 22) % words.length;
    c.save(); c.translate(x + (wi % 2 ? 80 : -80), y - 80 - (wi % 3) * 10); c.rotate((wi % 2 ? 1 : -1) * 0.2); c.font = '700 28px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = '#fff'; c.strokeText(words[wi], 0, 0); c.fillStyle = wi % 2 ? '#3a86ff' : '#e0563b'; c.fillText(words[wi], 0, 0); c.restore();
    c.restore();
  }
  function drawHug(c, v, t) { for (let i = 0; i < 6; i++) { const ph = ((t * 0.02) + i * 0.17) % 1; text(c, '♥', v.x - 60 + i * 24, v.y - 40 - ph * 90, 12 + (i % 3) * 6, `rgba(255,90,138,${1 - ph})`); } }

  // chama recortada da vela acesa, tremulando; usada em cima do que pegou fogo
  function drawFlame(c, x, y, t, k) { const at = A(); const fl = at && at.get('obj.flame'); if (!fl) return; k = k || 1; c.save(); c.shadowColor = 'transparent'; const g = c.createRadialGradient(x, y - 10, 4, x, y - 10, 90 * k); g.addColorStop(0, 'rgba(255,160,60,.45)'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 10, 90 * k, 0, TAU); c.fill(); for (let i = 0; i < 5; i++) { const ph = t * (0.5 + i * 0.13) + i * 1.7, h = (30 + 26 * Math.abs(Math.sin(ph))) * k, w = fl.width * h / fl.height, dx = (i - 2) * 14 * k + Math.sin(ph * 1.3) * 4; c.globalAlpha = 0.85; c.drawImage(fl, x + dx - w / 2, y - h + 12 + (i % 2) * 6, w, h); } c.restore(); }
  root.GG_ART = { drawFlame, PARTS, SCENE, POSES, background, rainFront, drawActor, drawBubble, drawFight, drawHug, rr, ell, text };
})(typeof self !== 'undefined' ? self : this);
