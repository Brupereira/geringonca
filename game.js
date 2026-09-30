/* GerinGonça — interface, loop de jogo, efeitos e som. */
(() => {
  'use strict';
  const G = GG, ART = GG_ART, LEVELS = GG_LEVELS.LEVELS, MSG = GG_LEVELS.MESSAGES;
  const PARTS = G.PARTS, H = G.H, FLOOR = G.FLOOR; let W = G.W; const W0 = G.W;
  const $ = id => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
  const rad = d => d * Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const S = {
    idx: 0, level: null, placed: [], inv: {}, sel: null, sim: null, mode: 'edit', drag: null, armed: null,
    particles: [], texts: [], t: 0, acc: 0, last: 0, eventsSeen: 0, progress: loadJSON('gg.progress', []), laugh: null, fanSpin: 0, lastFail: -1,
  };
  function loadJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  /* ---------- som ---------- */
  let audio = null;
  function ac() { try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); return audio; } catch (e) { return null; } }
  function tone(freq, dur, type, vol, slide, delay) {
    const a = ac(); if (!a) return; const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur);
  }
  function noise(dur, vol, delay) {
    const a = ac(); if (!a) return; const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(), g = a.createGain(); src.buffer = buf; g.gain.value = vol || 0.2; src.connect(g); g.connect(a.destination); src.start(a.currentTime + (delay || 0));
  }
  const SFX = {
    place: () => tone(520, 0.08, 'triangle', 0.07),
    twang: () => [196, 247, 294, 392, 494].forEach((f, i) => tone(f, 0.9, 'triangle', 0.09, null, i * 0.04)),
    meow: () => { tone(700, 0.35, 'sine', 0.12, 1100); tone(1000, 0.3, 'sine', 0.1, 500, 0.18); },
    bark: () => { tone(220, 0.12, 'sawtooth', 0.12, 140); tone(260, 0.1, 'sawtooth', 0.1, 150, 0.14); },
    drip: () => tone(1200, 0.06, 'sine', 0.04, 600),
    fight: () => { for (let i = 0; i < 8; i++) { noise(0.12, 0.12, i * 0.22); tone(i % 2 ? 300 : 500, 0.12, 'square', 0.05, null, i * 0.22 + 0.05); } },
    laugh: () => [0, 0.12, 0.24, 0.36].forEach((d, i) => tone(330 - i * 20, 0.1, 'square', 0.05, null, d)),
    fail: () => { tone(300, 0.35, 'sawtooth', 0.08, 220); tone(240, 0.5, 'sawtooth', 0.08, 150, 0.35); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, null, i * 0.11)),
    pop: () => { noise(0.1, 0.2); tone(900, 0.08, 'square', 0.05, 300); },
    boing: () => tone(180, 0.25, 'sine', 0.1, 420),
    jump: () => tone(300, 0.12, 'sine', 0.06, 600),
    water: () => { noise(0.5, 0.12); tone(500, 0.4, 'sine', 0.04, 900); },
    shoot: () => { noise(0.05, 0.15); tone(900, 0.15, 'sine', 0.06, 200); },
    hearts: () => [523, 659, 784, 659, 523].forEach((f, i) => tone(f, 0.5, 'sine', 0.07, null, i * 0.25)),
  };

  /* ---------- partículas ---------- */
  function burst(x, y, n, colors, speed, life, gravity) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random()); S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life, max: life, c: pick(colors), r: 2 + Math.random() * 4, g: gravity ?? 0.18 }); } }
  function floatText(txt, x, y, color, size) { S.texts.push({ txt, x, y, color: color || '#e0563b', size: size || 30, life: 70 }); }
  function stepFx() { for (const p of S.particles) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life--; } S.particles = S.particles.filter(p => p.life > 0 && p.y < H + 20); for (const t of S.texts) { t.y -= 0.7; t.life--; } S.texts = S.texts.filter(t => t.life > 0); }
  function drawFx() {
    for (const p of S.particles) { ctx.save(); ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); ctx.translate(p.x, p.y); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    for (const t of S.texts) { ctx.save(); ctx.globalAlpha = clamp(t.life / 25, 0, 1); ctx.font = `700 ${t.size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y); ctx.restore(); }
  }
  function handleEvents() {
    const evs = S.sim.state.events;
    for (; S.eventsSeen < evs.length; S.eventsSeen++) {
      const e = evs[S.eventsSeen];
      switch (e.type) {
        case 'drip': burst(e.x, e.y, 3, ['#7fc8ff', '#bfe3ff'], 3, 30); if (S.t % 12 === 0) SFX.drip(); break;
        case 'twang': floatText('TWAAANG!', e.x, e.y - 30, '#d9913e', 34); burst(e.x, e.y, 12, ['#ffd166', '#fff'], 4, 30, 0.05); SFX.twang(); break;
        case 'startle': floatText(e.who === 'gonca' ? 'MIAAAU!' : 'AU!', e.x, e.y - 70, e.who === 'gonca' ? '#3a86ff' : '#e0563b'); if (e.who === 'gonca') SFX.meow(); else SFX.bark(); break;
        case 'fight': SFX.fight(); burst(e.x, e.y, 30, ['#e9e4da', '#c9c0b0'], 6, 60, 0.02); break;
        case 'hug': SFX.hearts(); break;
        case 'pop': burst(e.x, e.y, 20, ['#e63946', '#ff8a8a'], 6, 40); SFX.pop(); break;
        case 'shoot': SFX.shoot(); break;
        case 'water': burst(e.x, e.y, 16, ['#7fc8ff', '#dff1ff'], 5, 30); break;
        case 'flame': burst(e.x, e.y, 10, ['#ffb703', '#ff6b35'], 3, 26); SFX.place(); break;
        case 'burn': burst(e.x, e.y, 8, ['#ffb703', '#333'], 2, 40); break;
        case 'ropecut': burst(e.x, e.y, 14, ['#6b4a2e', '#ffb703'], 4, 30); SFX.pop(); break;
        case 'toastpop': floatText('POP!', e.x, e.y, '#e0563b', 30); SFX.boing(); break;
        case 'pour': burst(e.x, e.y, 12, ['#8b5a2b', '#c9a066'], 4, 30); break;
        case 'fire': floatText('FOGO!', e.x, e.y - 20, '#ff6b35', 34); burst(e.x, e.y, 16, ['#ff6b35', '#ffb703'], 4, 40); SFX.pop(); break;
        case 'spark': burst(e.x, e.y, 3, ['#ffb703', '#ff6b35', '#fff'], 2.5, 22, -0.02); break;
        case 'fusefire': burst(e.x, e.y, 4, ['#fff2b0', '#ffb703', '#ff6b35', '#ff3d00'], 3.2, 18, 0.06); if (S.t % 8 === 0) { const lf = 40; S.particles.push({ x: e.x, y: e.y - 6, vx: 0.3, vy: -0.8, r: 10, c: 'rgba(90,90,90,.35)', life: lf, max: lf, g: -0.01 }); } break;
        case 'flames': { const k = Math.min(1, 0.3 + e.age / 90); for (let i = 0; i < 3; i++) { const lf = 18 + Math.random() * 14; S.particles.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y + (Math.random() - 0.5) * e.h * 0.5, vx: (Math.random() - 0.5) * 1.2, vy: -2 - Math.random() * 3 * k, r: 6 + Math.random() * 10 * k, c: Math.random() < 0.5 ? '#ff6b35' : '#ffb703', life: lf, max: lf, g: -0.05 }); } if (e.age > 20) { const lf = 50 + Math.random() * 30; S.particles.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y - e.h / 2, vx: (Math.random() - 0.5) * 0.8 + 0.4, vy: -1 - Math.random(), r: 12 + Math.random() * 16, c: 'rgba(70,70,70,.5)', life: lf, max: lf, g: -0.02 }); } break; }
        case 'sink': burst(e.x, e.y, 14, ['#7fc8ff', '#dff1ff'], 4, 30); SFX.drip(); break;
        case 'wet': burst(e.x, e.y, 14, ['#7fc8ff', '#bfe3ff'], 4, 34); SFX.drip(); break;
        case 'jump': SFX.jump(); break;
        case 'bark': floatText('AU!', e.x, e.y, '#e0563b', 34); SFX.bark(); break;
        case 'light': floatText('CLIC!', e.x, e.y, '#ffb703'); break;
        case 'say': break;
        case 'win': SFX.win(); burst(W / 2, 140, 120, ['#e63946', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#fff'], 10, 110); break;
        case 'fail': break;
      }
    }
  }

  /* ---------- desenho ---------- */
  function drawPart(e, play, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(255,255,255,.95)'; ctx.shadowBlur = 9; // contorno de recorte: destaca a peça do fundo
    const main = e.main;
    if (main && (main.settled || main.eaten)) { ctx.restore(); return; } /* comida assentada no pote ou saco engolido pelo funil: somem */
    if (!(e.type === 'balloon' && e.data && e.data.popped)) {
      if (main) { ctx.translate(main.position.x, main.position.y); ctx.rotate(main.angle); } else { ctx.translate(e.x, e.y); ctx.rotate(rad(e.angle || 0)); }
      ART.PARTS[e.type](ctx, e, play, S.t);
      if (play && main && main.fire) ART.drawFlame(ctx, 0, -PARTS[e.type].h / 2 + 10, S.t, 1.3);
    }
    ctx.restore();
  }
  /* ---------- água: hidrante → torneira → mangueira ---------- */
  const WTR = G.water;
  const near = (p, q, d) => Math.hypot(p.x - q.x, p.y - q.y) <= (d || WTR.SNAP);
  const waterLinks = () => WTR.links(S.placed, S.level.ground);
  const tapLive = tap => waterLinks().some(L => L.tap === tap && L.live);
  const dryReason = () => waterLinks().some(L => L.hydrant && !L.onGround) || (S.placed.some(e => e.type === 'hydrant' && !WTR.grounded(e, S.level.ground))) ? 'Água não sai do ar.' : 'Sem água.';
  function moveEnt(e, dx, dy) { e.x += dx; e.y += dy; if (e.type === 'hose') { e.ex += dx; e.cx += dx; e.ey += dy; e.cy += dy; } }
  // o que vai junto quando a peça se move: hidrante leva torneira (e a mangueira dela); torneira leva mangueira
  function attached(e) {
    if (e.type === 'hydrant') { const taps = S.placed.filter(t => t.type === 'tap' && near(WTR.hydrantOutlet(e), WTR.tapThread(t))); return taps.concat(taps.flatMap(t => attached(t))); }
    if (e.type === 'tap') return S.placed.filter(h => h.type === 'hose' && near(WTR.tapSpout(e), h));
    if (e.type === 'toaster') return S.placed.filter(f => (f.type === 'sardine' || f.type === 'toast') && f.inToaster && Math.hypot(f.x - e.x, f.y - (e.y - 58)) < 30);
    return [];
  }
  // encaixes ao soltar: torneira rosqueia no hidrante mais próximo; mangueira encaixa no bico da torneira
  function snap(e, kids) {
    if (e.type === 'tap') { const h = S.placed.find(h => h.type === 'hydrant' && near(WTR.hydrantOutlet(h), e, 95)); if (h) { WTR.snapTap(e, h); for (const k of kids || []) if (k.type === 'hose') { const sp = WTR.tapSpout(e); moveEnt(k, sp.x - k.x, sp.y - k.y); } SFX.place(); } }
    if (e.type === 'sardine' || e.type === 'toast') { const tst = S.placed.find(t => t.type === 'toaster' && Math.hypot(t.x - e.x, (t.y - 40) - e.y) < 80); if (tst) { for (const o of S.placed) if (o !== e && o.inToaster && Math.hypot(o.x - tst.x, o.y - (tst.y - 58)) < 30) o.inToaster = false; e.x = tst.x; e.y = tst.y - 58; e.inToaster = true; e.angle = 0; SFX.place(); } else e.inToaster = false; }
    if (e.type === 'hose') { const t = S.placed.find(t => t.type === 'tap' && near(WTR.tapSpout(t), e, 70)); if (t) { const sp = WTR.tapSpout(t); moveEnt(e, sp.x - e.x, sp.y - e.y); SFX.place(); } }
  }

  /* ---------- gatilhos: a peça que começa a fase (arco) ou libera a água (torneira) ---------- */
  const trigHandle = e => { const a = rad(e.angle || 0); if (e.type === 'bow') { const pb = 38 + ((e.power || 17) - 6) * 2.2; return { x: e.x - Math.cos(a) * pb, y: e.y - Math.sin(a) * pb, r: 30 }; } if (e.type === 'tap') return { x: e.x, y: e.y - 62, r: 24 }; if (e.type === 'lighter') return { x: e.x, y: e.y - 78, r: 24 }; return null; };
  function triggerAt(x, y) { for (const e of S.placed) { if (!PARTS[e.type].trigger) continue; const h = trigHandle(e); if (h && Math.hypot(x - h.x, y - h.y) <= h.r + 8) return e; } return null; }
  const fuseEnds = f => { const a = rad(f.angle || 0), L = 160 * clamp(f.scale || 1, 0.5, 3.6); return [{ x: f.x - Math.cos(a) * L / 2, y: f.y - Math.sin(a) * L / 2 }, { x: f.x + Math.cos(a) * L / 2, y: f.y + Math.sin(a) * L / 2 }]; };
  const candleNear = lg => S.placed.some(c => c.type === 'candle' && Math.hypot(c.x - lg.x, (c.y - 57) - (lg.y - 50)) < 70);
  const waterOpened = () => !!(S.sim && S.sim.ents.some(x => x.type === 'hose' && x.data.openT != null));
  function drawTrigger(e) {
    const h = PARTS[e.type].trigger && trigHandle(e); if (!h) return;
    const pulse = 0.5 + 0.5 * Math.sin(S.t * 0.12);
    ctx.save();
    if (e.type === 'lighter') {
      if (S.mode !== 'edit') { ctx.restore(); return; }
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r + pulse * 3, 0, Math.PI * 2); ctx.fillStyle = '#e0563b'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ART.text(ctx, '🔥', h.x, h.y + 1, 22, '#fff');
    } else if (e.type === 'tap') {
      if (S.mode !== 'edit' && waterOpened()) { ctx.restore(); return; }
      const live = tapLive(e);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r + (live ? pulse * 3 : 0), 0, Math.PI * 2); ctx.fillStyle = live ? '#1f8fe0' : '#6b6f78'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ART.text(ctx, '💧', h.x, h.y + 1, 22, '#fff');
    } else {
      const a = rad(e.angle || 0), pulling = S.pull && S.pull.ent === e;
      ctx.setLineDash([5, 5]); ctx.lineWidth = 3; ctx.strokeStyle = pulling ? '#ffd166' : `rgba(255,255,255,${0.55 + pulse * 0.4})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* ---------- alças: girar, esticar e dobrar com o mouse ---------- */
  function handlesOf(e) {
    const P = PARTS[e.type];
    if (e.type === 'hose') { const hp = WTR.hosePts(e); return [{ kind: 'end', x: hp.p1.x, y: hp.p1.y, label: 'mira' }, { kind: 'bend', x: hp.c.x, y: hp.c.y, label: 'dobra' }]; }
    if (P.rot && !P.trigger) { const a = rad(e.angle || 0), L = P.w * (e.scale || 1) / 2 + 30; return [{ kind: P.stretch ? 'stretch' : 'rot', x: e.x + Math.cos(a) * L, y: e.y + Math.sin(a) * L, label: P.stretch ? 'gira e estica' : 'gira' }]; }
    return [];
  }
  function handleAt(x, y) { if (!S.sel || !S.placed.includes(S.sel)) return null; for (const h of handlesOf(S.sel)) if (Math.hypot(x - h.x, y - h.y) <= 22) return h; return null; }
  function drawHandles(e) {
    ctx.save();
    for (const h of handlesOf(e)) {
      if (h.kind !== 'end' && h.kind !== 'bend') { ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(h.x, h.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.beginPath(); ctx.arc(h.x, h.y, 13, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#e0563b'; ctx.stroke();
    }
    ctx.restore();
  }
  function onHandle(ev) {
    const hd = S.hdrag; if (!hd) return; const q = boardPos(ev), e = hd.ent, P = PARTS[e.type];
    if (hd.kind === 'rot' || hd.kind === 'stretch') { e.angle = Math.round(Math.atan2(q.y - e.y, q.x - e.x) * 180 / Math.PI); if (hd.kind === 'stretch') e.scale = clamp((Math.hypot(q.x - e.x, q.y - e.y) - 30) / (P.w / 2), 0.6, P.stretchMax || 1.9); }
    else { const lim = hd.kind === 'end' ? 400 : 330; let dx = q.x - e.x, dy = q.y - e.y; const L = Math.hypot(dx, dy) || 1; if (L > lim) { dx *= lim / L; dy *= lim / L; } const nx = clamp(e.x + dx, 4, W - 4), ny = clamp(e.y + dy, 4, FLOOR - 6); if (hd.kind === 'end') { e.ex = nx; e.ey = ny; } else { e.cx = nx; e.cy = ny; } }
    updateSel();
  }
  function onHandleUp() { window.removeEventListener('pointermove', onHandle); S.hdrag = null; updateSel(); }

  function actorView(a, play) {
    if (play) { const p = a.body.position; return Object.assign({}, a, { x: p.x, y: p.y, bodyH: a.def.h }); }
    const def = G.ACTORS[a.who]; return { who: a.who, x: a.x, y: a.y - def.h / 2, bodyH: def.h, facing: a.facing || 1, state: a.state || 'sit', wet: !!a.wet, sleepSprite: a.sleepSprite || null, bubble: null };
  }
  const BG_KINDS = { backdrop: 1, photo: 1, strip: 1, img: 1, wall: 1, ceiling: 1, slab: 1, roof: 1, window: 1, door: 1, house: 1, tree: 1, picture: 1, rug: 1 };
  function render() {
    const play = S.mode !== 'edit', lv = S.level;
    ART.background(ctx, lv, W, H, FLOOR, S.t);
    const drawScene = bg => { for (const s of lv.scene || []) { if (s.kind === 'propfront' || !!BG_KINDS[s.kind] !== bg) continue; if (s.hideIf && play && S.sim.st[s.hideIf]) continue; const fn = ART.SCENE[s.kind]; if (fn) fn(ctx, s, S.sim && S.sim.st.lampOn); } };
    drawScene(true);
    ctx.fillStyle = 'rgba(112,116,126,.34)'; ctx.fillRect(0, 0, W, H); // véu: o cenário perde contraste e as peças aparecem
    drawScene(false);
    const parts = play ? S.sim.ents : lv.fixed.map(f => Object.assign({ fixed: true, data: {} }, f)).concat(S.placed);
    const rank = e => e.inToaster ? -2 : e.type === 'hose' ? -1 : PARTS[e.type].dyn ? 1 : 0; // torrada encaixada fica atrás da torradeira; mangueira por baixo da torneira
    const order = parts.slice().sort((a, b) => rank(a) - rank(b));
    for (const e of order) drawPart(e, play);
    // personagens
    const actors = play ? Object.values(S.sim.actors) : lv.actors;
    for (const a of actors) {
      const v = actorView(a, play);
      if ((v.state === 'fight' || v.state === 'hug') && S.mode !== 'won') continue;
      if (S.laugh && S.laugh.who === v.who) { v.state = 'laugh'; v.bubble = { text: S.laugh.text }; }
      ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 10; ART.drawActor(ctx, v, S.t); ctx.restore();
    }
    for (const e of order) if (e.type === 'bowl') { ctx.save(); ctx.beginPath(); ctx.rect(e.x - 90, e.y - 20, 180, 66); ctx.clip(); drawPart(e, play); ctx.restore(); } /* parede da frente do pote por cima do bicho: focinho dentro da comida */
    for (const s of lv.scene || []) if (s.kind === 'propfront') ART.SCENE.propfront(ctx, s);
    if (play && S.sim.state.vignette && S.mode !== 'won') { const v = S.sim.state.vignette; if (v.type === 'fight') ART.drawFight(ctx, v, v.t); else if (v.type === 'hug') { for (const a of Object.values(S.sim.actors)) ART.drawActor(ctx, Object.assign(actorView(a, true), { state: 'happy' }), S.t); ART.drawHug(ctx, v, v.t); } }
    ART.rainFront(ctx, lv, W, FLOOR, S.t);
    if (!play) {
      for (const e of parts) if (e.fixed) { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(rad(e.angle || 0)); const p = PARTS[e.type]; ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(80,60,40,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-p.w / 2 - 5, -p.h / 2 - 5, p.w + 10, p.h + 10); ctx.restore(); }
      if (S.sel && S.placed.includes(S.sel)) { const e = S.sel, p = PARTS[e.type]; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(rad(e.angle || 0)); ctx.strokeStyle = '#e0563b'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ART.rr(ctx, -p.w / 2 - 6, -p.h / 2 - 6, p.w + 12, p.h + 12, 6); ctx.stroke(); ctx.restore(); }
      if (S.drag && S.drag.fromInv && S.drag.over) drawPart(S.drag.ent, false, 0.65);
      if (S.sel && S.placed.includes(S.sel)) drawHandles(S.sel);
      for (const e of S.placed) drawTrigger(e);
    }
    else if (S.mode === 'play') for (const e of S.placed) if (e.type === 'tap') drawTrigger(e);
    drawFx();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!S.level) { requestAnimationFrame(frame); return; }
    if (S.mode === 'play') {
      const dt = Math.min(50, now - (S.last || now)); S.last = now; S.acc += dt; let steps = 0;
      while (S.acc >= G.DT && steps < 4) { S.sim.step(); S.t++; stepFx(); S.acc -= G.DT; steps++; }
      handleEvents();
      const st = S.sim.state;
      if (st.won && S.t - st.wonAt > 30) showWin();
      else if (st.failed) showFail();
    } else { S.t++; stepFx(); }
    try { render(); } catch (e) { if (!frame.warned) { frame.warned = true; console.error(e); } }
    requestAnimationFrame(frame);
  }

  /* ---------- fases ---------- */
  function loadLevel(i, skipIntro) {
    S.idx = clamp(i, 0, LEVELS.length - 1); S.level = LEVELS[S.idx];
    W = S.level.width || W0; G.W = W; if (canvas.width !== W) canvas.width = W; fitBoard(); // fase com tabuleiro mais estreito mostra a foto 1:1; o tabuleiro é escalado pra caber inteiro na tela
    S.placed = []; S.inv = Object.assign({}, S.level.inventory); S.sel = null; S.armed = null; S.laugh = null; S.mode = 'edit'; S.sim = null; S.particles = []; S.texts = []; hideWin();
    $('lvlTitle').textContent = `Fase ${S.idx + 1} · ${S.level.title}`;
    $('goalText').textContent = S.level.objective;
    S.hintN = 0; $('hint').innerHTML = ''; const hb = document.createElement('button'); hb.textContent = 'Me dá uma dica'; hb.onclick = () => { const hs = [].concat(S.level.hint); const n = Math.min(S.hintN || 0, hs.length - 1); S.hintN = n + 1; $('hint').innerHTML = '<b>' + (n ? 'Última:' : 'Tá bom:') + '</b> ' + hs[n]; if (n + 1 < hs.length) { const more = document.createElement('button'); more.textContent = 'Outra'; more.onclick = hb.onclick; $('hint').appendChild(more); } }; $('hint').appendChild(hb);
    buildInventory(); updateSel(); setPlayButton();
    try { history.replaceState(null, '', '#fase' + (S.idx + 1)); } catch (e) { }
    if (!skipIntro) { $('introTitle').textContent = `Fase ${S.idx + 1}: ${S.level.title}`; $('introText').textContent = S.level.intro; $('introGoal').textContent = S.level.objective; $('introOverlay').classList.add('show'); }
  }
  function buildInventory() {
    const inv = $('inv'); inv.innerHTML = '';
    for (const type of Object.keys(S.level.inventory)) {
      const p = PARTS[type], el = document.createElement('div'); el.className = 'item'; el.dataset.type = type;
      const ic = document.createElement('canvas'); ic.width = 112; ic.height = 88; drawIcon(ic, type);
      const txt = document.createElement('div'); txt.innerHTML = `<div class="name">${p.name}</div>`;
      const cnt = document.createElement('div'); cnt.className = 'count';
      el.append(ic, txt, cnt); inv.appendChild(el);
      el.addEventListener('pointerdown', ev => { if (S.mode !== 'edit' || S.inv[type] <= 0) return; ev.preventDefault(); startDragFromInv(type, ev); });
    }
    refreshCounts();
  }
  function refreshCounts() { for (const el of $('inv').children) { const t = el.dataset.type; el.querySelector('.count').textContent = '×' + S.inv[t]; el.classList.toggle('empty', S.inv[t] <= 0); el.classList.toggle('armed', S.armed === t); } }
  function drawIcon(c, type) { const cc = c.getContext('2d'), p = PARTS[type], sc = Math.min(96 / p.w, 72 / p.h, 1.5); cc.clearRect(0, 0, c.width, c.height); cc.save(); cc.translate(c.width / 2, c.height / 2); cc.scale(sc, sc); ART.PARTS[type](cc, { type, data: {}, flip: false }, false, 0); cc.restore(); }

  /* ---------- interação ---------- */
  function boardPos(ev) { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height, inside: ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom }; }
  function hitTest(x, y) {
    for (let i = S.placed.length - 1; i >= 0; i--) {
      const e = S.placed[i], p = PARTS[e.type];
      if (e.type === 'hose') { const hp = WTR.hosePts(e); for (let k = 0; k <= 20; k++) { const u = k / 20, qx = (1 - u) * (1 - u) * hp.p0.x + 2 * (1 - u) * u * hp.c.x + u * u * hp.p1.x, qy = (1 - u) * (1 - u) * hp.p0.y + 2 * (1 - u) * u * hp.c.y + u * u * hp.p1.y; if (Math.hypot(x - qx, y - qy) <= 20) return e; } continue; }
      const a = -rad(e.angle || 0), dx = x - e.x, dy = y - e.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= p.w * (e.scale || 1) / 2 + 8 && Math.abs(ly) <= p.h / 2 + 8) return e;
    }
    return null;
  }
  const newEnt = (type, x, y) => type === 'bow' ? { type, x, y, angle: -35, flip: false, power: 16 } : type === 'hose' ? { type, x, y, angle: 0, flip: false, ex: x + 210, ey: y - 70, cx: x + 60, cy: y + 50 } : { type, x, y, angle: 0, flip: false };
  function startDragFromInv(type, ev) { try { canvas.focus({ preventScroll: true }); } catch (_) {} const ent = newEnt(type, -999, -999); S.drag = { ent, fromInv: true, over: false, moved: false, sx: ev.clientX, sy: ev.clientY }; S.armed = null; refreshCounts(); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true }); }
  function onMove(ev) {
    if (!S.drag) return; const p = boardPos(ev), d = S.drag; if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 4) d.moved = true; d.over = p.inside;
    const px0 = (S.level.play && S.level.play.x0) || 0, px1 = (S.level.play && S.level.play.x1) || W; const nx = clamp(p.x - (d.ox || 0), px0, px1), ny = clamp(p.y - (d.oy || 0), 0, d.ent.type === 'hydrant' ? FLOOR - 55 : FLOOR);
    const dx = nx - d.ent.x, dy = ny - d.ent.y; moveEnt(d.ent, dx, dy); for (const k of d.kids || []) moveEnt(k, dx, dy);
  }
  function onUp(ev) {
    window.removeEventListener('pointermove', onMove); const d = S.drag; S.drag = null; if (!d) return; const p = boardPos(ev);
    if (d.fromInv) {
      if (!d.moved) { S.armed = S.armed === d.ent.type ? null : d.ent.type; refreshCounts(); toast(''); return; }
      if (p.inside) { const px0 = (S.level.play && S.level.play.x0) || 0, px1 = (S.level.play && S.level.play.x1) || W; const nx = clamp(p.x, px0 + 10, px1 - 10), ny = clamp(p.y, 10, d.ent.type === 'hydrant' ? FLOOR - 55 : FLOOR - 5); moveEnt(d.ent, nx - d.ent.x, ny - d.ent.y); S.placed.push(d.ent); S.inv[d.ent.type]--; S.sel = d.ent; snap(d.ent, []); SFX.place(); refreshCounts(); }
    }
    else if (!p.inside) removePlaced(d.ent);
    else snap(d.ent, d.kids);
    updateSel();
  }
  function removePlaced(e) { const i = S.placed.indexOf(e); if (i >= 0) { S.placed.splice(i, 1); S.inv[e.type]++; if (S.sel === e) S.sel = null; refreshCounts(); updateSel(); } }
  canvas.tabIndex = 0; canvas.style.outline = 'none';
  canvas.addEventListener('pointerdown', ev => {
    try { canvas.focus({ preventScroll: true }); } catch (_) {}
    const p = boardPos(ev);
    if (S.mode === 'play') { // com a fase rodando, a única coisa clicável é a torneira: abrir a água na hora certa
      const tp = triggerAt(p.x, p.y); if (tp && tp.type === 'tap' && S.sim.openTap()) { ev.preventDefault(); floatText('ÁGUA!', p.x, p.y - 40, '#7fc8ff', 30); SFX.water(); }
      return;
    }
    if (S.mode !== 'edit') return; ev.preventDefault(); ac();
    const tg = !S.armed && triggerAt(p.x, p.y);
    if (tg) {
      S.sel = tg; updateSel();
      if (tg.type === 'lighter') {
        if (S.level.trigger !== 'light') toast('Ainda não.');
        else if (!candleNear(tg)) toast('Nada.');
        else startPlay();
        return;
      }
      if (tg.type === 'tap') {
        if (!tapLive(tg)) toast(dryReason());
        else if (S.level.trigger === 'tap') startPlay();
        else toast('Ainda não.');
        return;
      }
      S.pull = { ent: tg, len: 0 }; window.addEventListener('pointermove', onPull); window.addEventListener('pointerup', onPullUp, { once: true }); return;
    }
    const hh = !S.armed && handleAt(p.x, p.y);
    if (hh) { S.hdrag = { ent: S.sel, kind: hh.kind }; window.addEventListener('pointermove', onHandle); window.addEventListener('pointerup', onHandleUp, { once: true }); return; }
    if (S.armed && S.inv[S.armed] > 0) { const ent = newEnt(S.armed, p.x, p.y); S.placed.push(ent); S.inv[ent.type]--; S.sel = ent; snap(ent, []); SFX.place(); if (S.inv[S.armed] <= 0) S.armed = null; refreshCounts(); updateSel(); S.drag = { ent, fromInv: false, ox: 0, oy: 0, sx: ev.clientX, sy: ev.clientY }; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true }); return; }
    const e = hitTest(p.x, p.y); S.sel = e; updateSel();
    if (e) { S.drag = { ent: e, fromInv: false, ox: p.x - e.x, oy: p.y - e.y, sx: ev.clientX, sy: ev.clientY, kids: attached(e) }; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true }); }
  });
  function onPull(ev) { if (!S.pull) return; const q = boardPos(ev), e = S.pull.ent, vx = q.x - e.x, vy = q.y - e.y, L = Math.hypot(vx, vy); S.pull.len = L; if (L > 16) { e.angle = Math.round(Math.atan2(-vy, -vx) * 180 / Math.PI); e.power = clamp(L * 0.17, 6, 27); } updateSel(); }
  function onPullUp() { window.removeEventListener('pointermove', onPull); const pl = S.pull; S.pull = null; if (!pl) return; if (pl.len > 40) startPlay(); else toast('Fraco.'); }
  canvas.addEventListener('wheel', ev => { if (S.mode === 'edit' && S.sel) { ev.preventDefault(); rotateSel(ev.deltaY > 0 ? 5 : -5); } }, { passive: false });
  function rotateSel(d) { if (!S.sel || !PARTS[S.sel.type].rot) return; S.sel.angle = ((S.sel.angle || 0) + d + 540) % 360 - 180; updateSel(); }
  function flipSel() { if (!S.sel || !PARTS[S.sel.type].flip) return; const e = S.sel, kids = attached(e); e.flip = !e.flip; if (e.type === 'hydrant') for (const t of kids) if (t.type === 'tap') { const hs = attached(t); WTR.snapTap(t, e); for (const k of hs) { const sp = WTR.tapSpout(t); moveEnt(k, sp.x - k.x, sp.y - k.y); } } updateSel(); }
  function updateSel() {
    const e = S.sel, info = $('selInfo'), can = !!e && S.mode === 'edit', p = e && PARTS[e.type];
    $('btnRotL').disabled = !(can && p.rot); $('btnRotR').disabled = !(can && p.rot); $('btnFlip').disabled = !(can && p.flip); $('btnDel').disabled = !can;
    if (S.mode !== 'edit') info.textContent = '';
    else if (e) info.innerHTML = `<b>${p.name}</b>`;
    else info.textContent = '';
    canvas.style.cursor = S.mode === 'edit' && S.armed ? 'crosshair' : 'default';
  }
  document.addEventListener('keydown', ev => {
    if (ev.target.tagName === 'INPUT') return; const k = (ev.key || '').toLowerCase();
    if (k === 'r') { rotateSel(ev.shiftKey ? -5 : 5); ev.preventDefault(); } else if (k === 'f') flipSel();
    else if (k === 'delete' || k === 'backspace') { if (S.sel && S.mode === 'edit') removePlaced(S.sel); }
    else if (k === ' ') { ev.preventDefault(); if (S.mode === 'edit' && !anyOverlay()) startPlay(); }
    else if (k === 'escape') { S.armed = null; refreshCounts(); updateSel(); closeOverlays(); }
    else if (k === 'enter' && anyOverlay()) { const o = document.querySelector('.overlay.show .primary'); if (o) o.click(); }
  });
  $('btnRotL').onclick = () => rotateSel(-5); $('btnRotR').onclick = () => rotateSel(5); $('btnFlip').onclick = flipSel; $('btnDel').onclick = () => S.sel && removePlaced(S.sel);

  /* ---------- testar ---------- */
  function startPlay() {
    if (S.mode !== 'edit') return; ac();
    const trg = S.level.trigger;
    if (trg === 'bow' && !S.placed.some(e => e.type === 'bow')) { toast('Com o quê?'); return; }
    if (trg === 'tap' && !waterLinks().some(L => L.live)) { toast(dryReason()); return; }
    if (trg === 'light' && !S.placed.some(e => e.type === 'lighter' && candleNear(e))) { toast('Nada.'); return; }
    // a água abre no começo (fase da torneira) ou no clique do jogador (demais fases); debugOpenAt só existe no gabarito
    const placed = S.placed.map(e => e.type === 'hose' ? Object.assign({}, e, { openAt: trg === 'tap' ? 0 : (e.debugOpenAt != null ? e.debugOpenAt : undefined) }) : e.type === 'lighter' ? Object.assign({}, e, { litAt: trg === 'light' ? 0 : undefined }) : e);
    S.sim = G.build(S.level, placed); S.mode = 'play'; S.t = 0; S.acc = 0; S.last = 0; S.eventsSeen = 0; S.particles = []; S.texts = []; S.armed = null; S.laugh = null;
    refreshCounts(); updateSel(); setPlayButton(); document.querySelectorAll('.item').forEach(el => el.style.pointerEvents = 'none');
  }
  function backToEdit() { hideWin(); S.mode = 'edit'; S.sim = null; S.laugh = null; S.particles = []; S.texts = []; updateSel(); setPlayButton(); document.querySelectorAll('.item').forEach(el => el.style.pointerEvents = ''); }
  function setPlayButton() { const b = $('btnPlay'); b.disabled = S.mode !== 'edit'; b.textContent = S.mode === 'edit' ? '▶ Testar' : '… rodando'; }
  $('btnPlay').onclick = startPlay; $('btnPlay').style.display = 'none'; // quem começa a fase é a peça-gatilho
  $('btnReset').onclick = () => { if (S.mode === 'edit') { S.placed = []; S.inv = Object.assign({}, S.level.inventory); S.sel = null; refreshCounts(); updateSel(); } };

  /* ---------- falha e vitória ---------- */
  function showFail() {
    if (S.mode !== 'play') return; S.mode = 'fail'; SFX.fail();
    let msg = S.sim && S.sim.state.failMsg; if (!msg) { do { msg = pick(MSG.fail); } while (msg === S.lastFail && MSG.fail.length > 1); S.lastFail = msg; }
    $('failText').textContent = msg;
    if (Math.random() < 0.35 && S.sim) { const who = pick(Object.keys(S.sim.actors)); S.laugh = { who, text: pick(MSG.laugh[who]) }; setTimeout(SFX.laugh, 400); }
    $('failTip').textContent = '';
    $('failOverlay').classList.add('show'); setPlayButton();
    clearTimeout(showFail.tm); showFail.tm = setTimeout(dismissFail, S.laugh ? 4200 : 3200);
  }
  function dismissFail() { clearTimeout(showFail.tm); $('failOverlay').classList.remove('show'); if (S.mode === 'fail') backToEdit(); }
  $('failOverlay').addEventListener('click', dismissFail);
  function showWin() {
    if (S.mode !== 'play') return; S.mode = 'won'; S.progress[S.idx] = true; saveJSON('gg.progress', S.progress);
    const last = S.idx >= LEVELS.length - 1, sim = S.sim, v = sim.state.vignette, end = S.level.ending || {};
    const cx = v ? v.x : W / 2;
    for (const a of Object.values(sim.actors)) {
      Matter.Body.setStatic(a.body, true);
      if (!end.keep) { const px = a.who === 'gerin' ? cx - 90 : cx + 90; Matter.Body.setPosition(a.body, { x: px, y: FLOOR - a.def.h / 2 }); a.facing = a.who === 'gerin' ? 1 : -1; a.state = 'sit'; }
      a.pose = a.mad ? (a.who === 'gerin' ? ['gerin.angrywet', 170, 1] : ['gonca.hiss', 165, -1]) : (end.poses && end.poses[a.who] || a.pose || null); a.bubble = null; a.wet = false;
    }
    if (end.who && sim.actors[end.who]) sim.actors[end.who].bubble = { text: end.text, until: Infinity, big: true };
    $('winNarr').textContent = S.level.win; $('btnNext').style.display = last ? 'none' : ''; $('winbar').classList.add('show'); setPlayButton();
    if (last) { $('winTitle').textContent = 'Fim. Por enquanto.'; $('winText').textContent = 'Todas as fases prontas até aqui. Mais vem por aí.'; setTimeout(() => $('winOverlay').classList.add('show'), 2500); }
  }
  function hideWin() { $('winbar').classList.remove('show'); }
  $('btnReplay').onclick = () => { hideWin(); $('winOverlay').classList.remove('show'); backToEdit(); startPlay(); };
  $('btnNext').onclick = () => { hideWin(); $('winOverlay').classList.remove('show'); loadLevel(S.idx + 1); };
  $('btnCloseWin').onclick = () => $('winOverlay').classList.remove('show');
  $('btnEditAfterWin').onclick = () => { hideWin(); $('winOverlay').classList.remove('show'); backToEdit(); };
  $('btnIntroGo').onclick = () => { $('introOverlay').classList.remove('show'); ac(); };

  /* ---------- menus ---------- */
  const ACTS = ['A briga', 'Evitar a briga', 'Zoação', 'Besteira em dupla', 'Final'];
  function anyOverlay() { return !!document.querySelector('.overlay.show'); }
  function closeOverlays() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show')); if (S.mode === 'fail') backToEdit(); }
  $('btnLevels').onclick = () => {
    const g = $('levelGrid'); g.innerHTML = ''; let act = 0;
    LEVELS.forEach((lv, i) => { if (lv.act !== act) { act = lv.act; const h = document.createElement('div'); h.className = 'acth'; h.textContent = `Ato ${act} · ${ACTS[act - 1] || ''}`; g.appendChild(h); } const b = document.createElement('button'); b.textContent = (i + 1) + ' · ' + lv.title; if (S.progress[i]) b.classList.add('done'); if (i === S.idx) b.classList.add('current'); b.onclick = () => { closeOverlays(); loadLevel(i); }; g.appendChild(b); });
    $('levelsOverlay').classList.add('show');
  };
  $('btnCloseLevels').onclick = closeOverlays; $('btnHelp').onclick = () => $('helpOverlay').classList.add('show'); $('btnCloseHelp').onclick = closeOverlays;
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', ev => { if (ev.target === o && o.id !== 'introOverlay' && o.id !== 'failOverlay') closeOverlays(); }));
  function toast(msg) { const m = $('msg'); if (!msg) { m.classList.remove('show'); return; } m.textContent = msg; m.classList.add('show'); clearTimeout(toast.tm); toast.tm = setTimeout(() => m.classList.remove('show'), 2600); }

  /* ---------- início ---------- */
  let start = 0; const m = /fase(\d+)/.exec(location.hash || ''); if (m) start = clamp(+m[1] - 1, 0, LEVELS.length - 1); else { const first = S.progress.findIndex(v => !v); start = first < 0 ? 0 : first; }
  (async () => {
    try { await GG_ATLAS.load(p => { $('loadBar').style.width = Math.round(p * 100) + '%'; }); } catch (e) { console.error(e); setTimeout(() => toast('As imagens não carregaram. Jogando com bonecos de reserva.'), 500); }
    $('loadOverlay').classList.remove('show');
    loadLevel(start);
  })();
  /* tabuleiro sempre inteiro na tela: escala pelo que couber (largura ou altura) e centraliza */
  function fitBoard() { const wrap = canvas.parentElement; if (!wrap) return; const cs = getComputedStyle(wrap); const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight); const availW = wrap.clientWidth - pad; const top = canvas.getBoundingClientRect().top; const availH = Math.max(240, window.innerHeight - top - 96); const refW = Math.max(W, (S.level && S.level.fitWidth) || 0); const s = Math.min(availW / refW, availH / H); /* fase estreita: level.fitWidth diz quanto da largura ela ocupa (meio-termo entre encher a altura e ficar na altura das outras) */ canvas.style.width = Math.round(W * s) + 'px'; canvas.style.height = Math.round(H * s) + 'px'; canvas.style.marginLeft = 'auto'; canvas.style.marginRight = 'auto'; }
  window.addEventListener('resize', fitBoard);
  window.addEventListener('hashchange', () => { const m2 = /fase(\d+)/.exec(location.hash || ''); if (m2 && +m2[1] - 1 !== S.idx) { closeOverlays(); loadLevel(+m2[1] - 1); } });
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { try { navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { } }
  window.GGDebug = { S, loadLevel, startPlay, backToEdit, solve() { S.placed = S.level.solution.map(p => Object.assign({}, p, p.openAt != null ? { debugOpenAt: p.openAt } : {})); S.inv = Object.assign({}, S.level.inventory); for (const p of S.placed) S.inv[p.type]--; refreshCounts(); updateSel(); } };
})();
