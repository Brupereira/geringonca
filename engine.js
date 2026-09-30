/* GerinGonça — motor de simulação (física, cenário, personagens, vinhetas).
   Sem interface: roda no navegador e em verificadores. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('matter-js'));
  else root.GG = factory(root.Matter);
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  'use strict';
  const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;
  const W = 2400, H = 800, FLOOR = 740, DT = 1000 / 60;
  const TOY = 0x0004; // categoria de colisão dos brinquedos (bolas)
  const FOOD = 0x0008; // comida (sardinha, torrada): o saco de ração não esbarra nela
  const BOWLC = 0x0010; // potes: os bichos atravessam (comem com a cara dentro)
  const JET_G = 0.0018, JET_LEN = 380;
  // Água de verdade: hidrante no chão → torneira rosqueada na saída dele → mangueira encaixada no bico da torneira.
  const SNAP = 28;
  const water = {
    hydY: FLOOR - 55, SNAP,
    hydrantOutlet: e => ({ x: e.x + 38 * (e.flip ? -1 : 1), y: e.y + 15 }),
    tapThread: e => ({ x: e.x + 35 * (e.flip ? -1 : 1), y: e.y + 5 }),   // rosca (lado que entra no hidrante)
    tapSpout: e => ({ x: e.x - 25 * (e.flip ? -1 : 1), y: e.y + 29 }),   // bico (onde a mangueira encaixa)
    snapTap(tap, hyd) { const hx = hyd.flip ? -1 : 1, o = water.hydrantOutlet(hyd); tap.flip = hx === 1; tap.x = o.x + 35 * hx; tap.y = o.y - 5; },
    // chão = qualquer solo da fase (level.ground: faixas onde o pé do hidrante pode pisar); sem isso, só a linha do chão da frente
    grounded(h, zones) { const base = h.y + 55; return (zones || [{ x0: -1e9, x1: 1e9, y0: FLOOR - 6, y1: FLOOR + 6 }]).some(z => h.x >= z.x0 && h.x <= z.x1 && base >= z.y0 && base <= z.y1); },
    links(list, zones) {
      const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= SNAP; const out = [];
      for (const hose of list) { if (hose.type !== 'hose') continue;
        const tap = list.find(t => t.type === 'tap' && near(water.tapSpout(t), hose));
        const hyd = tap && list.find(h => h.type === 'hydrant' && near(water.hydrantOutlet(h), water.tapThread(tap)));
        const onGround = !!hyd && water.grounded(hyd, zones);
        out.push({ hose, tap: tap || null, hydrant: hyd || null, onGround, live: !!(tap && hyd && onGround) });
      }
      return out;
    },
    // pressão depois de abrir: jato forte por 50 quadros, depois cai pra um fiozinho
    pressure: dt => dt < 0 ? 0 : dt < 50 ? 1 : Math.max(0.12, 1 - (dt - 50) / 35 * 0.88),
    hosePts(e) { const ex = e.ex != null ? e.ex : e.x + 220, ey = e.ey != null ? e.ey : e.y, cx = e.cx != null ? e.cx : e.x + 110, cy = e.cy != null ? e.cy : e.y + 40; const L = Math.hypot(ex - cx, ey - cy) || 1; return { p0: { x: e.x, y: e.y }, c: { x: cx, y: cy }, p1: { x: ex, y: ey }, dir: { x: (ex - cx) / L, y: (ey - cy) / L } }; },
  }; // curvatura do jato da mangueira (a arte usa o mesmo número)
  const rad = d => d * Math.PI / 180;
  const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ---------- peças que o jogador coloca ---------- */
  const PARTS = {
    plank:      { name: 'Tábua',          w: 160, h: 16, rot: true,  desc: 'Torta funciona melhor que reta.' },
    bat:        { name: 'Taco de beisebol', w: 160, h: 16, rot: true, stretch: true, desc: 'Serve de rampa. Torto funciona melhor que reto.' },
    branch:     { name: 'Galho',          w: 160, h: 16, rot: true, stretch: true, desc: 'Caiu da árvore. Vira rampa se você quiser.' },
    tennis:     { name: 'Bola de tênis',  w: 28,  h: 28, dyn: true,  desc: 'Pequena, saltitante, irritante.' },
    bucket:     { name: 'Balde',          w: 70,  h: 88, rot: false, desc: 'Coisas caem dentro. Às vezes até o que você queria.' },
    trampoline: { name: 'Cama elástica',  w: 100, h: 26, rot: true,  desc: 'Pula tudo. Inclusive o que você não queria.' },
    fan:        { name: 'Ventilador',     w: 50,  h: 70, rot: true, flip: true, desc: 'Sopra o que for leve. Balão, bola de praia, dignidade.' },
    ball:       { name: 'Bola de futebol', w: 36, h: 36, dyn: true, desc: 'O Gerin não resiste. Ninguém resiste.' },
    beach:      { name: 'Bola de praia',  w: 60,  h: 60, dyn: true,  desc: 'Leve, enorme, voa com qualquer vento.' },
    bowling:    { name: 'Bola de boliche', w: 48, h: 48, dyn: true,  desc: 'Pesada. Não pergunta, só empurra.' },
    crate:      { name: 'Caixote',        w: 64,  h: 50, dyn: true,  desc: 'Empilha, derruba, apoia. Versátil como desculpa.' },
    bumper:     { name: 'Rebatedor',      w: 54,  h: 54, rot: false, desc: 'Fliperama de sala de estar.' },
    conveyor:   { name: 'Esteira',        w: 180, h: 24, rot: true, flip: true, desc: 'Carrega o que estiver em cima. F inverte.' },
    iron:       { name: 'Ferro de passar', w: 40, h: 66, dyn: true,  desc: 'Pesado e desligado. Cai reto como boleto.' },
    balloon:    { name: 'Balão',          w: 44,  h: 44, dyn: true,  desc: 'Sobe. Só isso. Já é mais que muita gente.' },
    block:      { name: 'Tijolo',         w: 60,  h: 44, rot: false, desc: 'Fica parado. Ótimo em barrar coisas.' },
    bricks:     { name: 'Mureta',         w: 62,  h: 132, rot: false, desc: 'Quatro tijolos empilhados. Bola não pula isso sozinha.' },
    bow:        { name: 'Arco e flecha',  w: 80,  h: 250, rot: true, trigger: 'pull', desc: 'Põe no lugar, puxa a flecha pra trás e solta. É ela que começa tudo.' },
    chute:      { name: 'Calha',          w: 260, h: 190, rot: true, flip: true, desc: 'O que cai dentro sai do outro lado. Pra onde, é com você.' },
    hose:       { name: 'Mangueira',      w: 220, h: 26, bend: true, desc: 'Encaixa no bico da torneira. Arrasta a ponta pra mirar e o meio pra dobrar.' },
    tap:        { name: 'Torneira',       w: 70,  h: 64, trigger: 'tap', desc: 'Rosqueia na saída do hidrante. É nela que você abre a água.' },
    hydrant:    { name: 'Hidrante',       w: 76,  h: 110, flip: true, desc: 'Põe onde quiser, mas só funciona pisando em solo. Água não sai do ar. F muda o lado da saída.' },
    seesaw:     { name: 'Gangorra',       w: 330, h: 90,  rot: false, desc: 'Peso de um lado, voo do outro.' },
    balloonbox: { name: 'Balão com caixa', w: 100, h: 260, rot: false, desc: 'Flutua até alguém estourar.' },
    arrow:      { name: 'Flecha',         w: 80,  h: 8,   dyn: true, internal: true, desc: '' },
    candle:     { name: 'Vela',           w: 20,  h: 100, desc: '' },
    lighter:    { name: 'Isqueiro',       w: 36,  h: 90,  trigger: 'light', desc: '' },
    toaster:    { name: 'Torradeira',     w: 130, h: 84,  flip: true, desc: '' },
    sardine:    { name: 'Sardinha',       w: 110, h: 36,  dyn: true, flip: true, desc: '' },
    toast:      { name: 'Torrada',        w: 54,  h: 54,  dyn: true, desc: '' },
    funnel:     { name: 'Funil',          w: 90,  h: 96,  rot: true, desc: '' },
    fuse:       { name: 'Pavio',          w: 160, h: 14,  rot: true, stretch: true, stretchMax: 3.6, desc: '' },
    ironhook:   { name: 'Ferro pendurado', w: 40, h: 90, desc: '' },
    bagrope:    { name: 'Saco de ração',  w: 70,  h: 100, dyn: true, desc: '' },
    kibble:     { name: 'Ração',          w: 12,  h: 12,  dyn: true, internal: true, desc: '' },
    bowl:       { name: 'Pote',           w: 130, h: 62,  desc: '' },
  };

  /* ---------- cenário fixo (por tipo) ---------- */
  const SCENERY = {
    wall:    (s) => [Bodies.rectangle(s.x, s.y, s.w, s.h, ST())],
    ceiling: (s) => [Bodies.rectangle(s.x, s.y, s.w, s.h || 20, ST())],
    shelf:   (s) => [Bodies.rectangle(s.x, s.y, s.w || 140, 14, ST())],
    sofa:    (s) => [Bodies.rectangle(s.x, s.y - 42, 250, 84, ST()), Bodies.rectangle(s.x - 118, s.y - 100, 30, 32, ST({ chamfer: { radius: 10 } })), Bodies.rectangle(s.x + 118, s.y - 100, 30, 32, ST({ chamfer: { radius: 10 } }))],
    bed:     (s) => [Bodies.rectangle(s.x, s.y - 12, 150, 24, ST()), Bodies.rectangle(s.x - 68, s.y - 36, 14, 30, ST()), Bodies.rectangle(s.x + 68, s.y - 36, 14, 30, ST())],
    cushion: (s) => [Bodies.rectangle(s.x, s.y - 9, 110, 18, ST())],
    table:   (s) => [Bodies.rectangle(s.x, s.y - 100, 200, 14, ST()), Bodies.rectangle(s.x - 85, s.y - 47, 14, 94, ST()), Bodies.rectangle(s.x + 85, s.y - 47, 14, 94, ST())],
    guitar:  (s) => [Object.assign(Bodies.rectangle(s.x, s.wall ? s.y : s.y - 80, 56, 150, ST({ angle: rad(s.angle || 0) })), { reactive: 'guitar' })],
    lamp:    (s) => [Object.assign(Bodies.rectangle(s.x, s.y - 75, 60, 150, ST()), { reactive: 'lamp' })],
    tree:    () => [], house:  () => [], img: () => [], strip: () => [], backdrop: () => [], photo: () => [],
    slab:    (s) => [Bodies.rectangle(s.x, s.y, s.w, s.h || 20, ST({ angle: rad(s.angle || 0) }))],
    armchair: (s) => [Bodies.rectangle(s.x, s.y - 57, 240, 114, ST()), Bodies.rectangle(s.x - 118, s.y - 150, 40, 72, ST({ chamfer: { radius: 12 } })), Bodies.rectangle(s.x + 118, s.y - 150, 40, 72, ST({ chamfer: { radius: 12 } }))],
    plant:   (s) => [Bodies.rectangle(s.x, s.y - 30, 60, 60, ST())],
    tv:      (s) => [Bodies.rectangle(s.x, s.y - 30, 120, 60, ST())],
    window:  () => [],
    door:    () => [],
    rug:     () => [],
    picture: () => [],
    roof:    () => [],
  };
  function ST(extra) { return Object.assign({ isStatic: true, friction: 0.7, restitution: 0.05 }, extra || {}); }

  /* ---------- personagens ---------- */
  const ACTORS = {
    gerin: { name: 'Gerin', w: 100, h: 108, speed: 5.2, density: 0.003 },
    gonca: { name: 'Gonça', w: 100, h: 100, speed: 4.8, density: 0.0025 },
  };

  function build(level, placed) {
    const engine = Engine.create(); engine.gravity.y = 1;
    const world = engine.world;
    const state = { t: 0, won: false, wonAt: -1, failed: false, failedAt: -1, quiet: 0, events: [], vignette: null, timers: [] };
    const ev = e => state.events.push(Object.assign({ t: state.t }, e));
    const st = {}; // rascunho da lógica da fase

    // limites
    const BW = level.width || W; // fase pode ter tabuleiro mais estreito (foto 1:1, sem borrar)
    const wallOpt = { isStatic: true, friction: 0.8, restitution: 0.1, label: 'bound' };
    Composite.add(world, [
      Bodies.rectangle(((level.floorFrom || -200) + BW + 200) / 2, FLOOR + 60, BW + 200 - (level.floorFrom || -200), 120, wallOpt), // chão pode começar depois de um buraco (pia)
      Bodies.rectangle(BW / 2, -60, BW + 400, 120, wallOpt),
      Bodies.rectangle(-60, H / 2, 120, H + 400, wallOpt),
      Bodies.rectangle(BW + 60, H / 2, 120, H + 400, wallOpt),
    ]);

    // cenário
    const scenery = [];
    for (const s of level.scene || []) {
      const bodies = (SCENERY[s.kind] || (() => []))(s);
      for (const b of bodies) { b.scenery = s; Composite.add(world, b); }
      scenery.push(Object.assign({ bodies }, s));
    }

    // peças (fixas da fase + do jogador)
    const ents = [];
    const defs = [].concat((level.fixed || []).map(f => Object.assign({}, f, { fixed: true })), placed || []);
    for (const d of defs) ents.push(instantiate(d));
    for (const L of water.links(ents, level.ground)) { L.hose.data.live = L.live; if (L.tap) L.tap.data.hose = L.hose; }
    // fogo: quem pega fogo queima por um tempo e a fase acaba mal
    // chama perto de bicho: ele berra, xinga, fica bravo e a fase acaba mal
    function fireNear(x, y, r) {
      for (const act of Object.values(actors)) { if (act.burned || state.vignette) continue; const p = act.body.position; if (Math.hypot(p.x - x, p.y - y) < r + 50) { act.burned = true; act.mad = true; startle(act); say(act, act.who === 'gonca' ? 'MIAUUU!' : 'AUUUU!', 45); after(50, () => say(act, act.who === 'gonca' ? 'Vai queimar a mãe, desgraça!' : 'Tá me queimando, animal!', 120)); after(150, () => fail('Tentou botar fogo no bicho. Perdeu. E mereceu.')); } }
    }
    function ignite(b, o) { if (b.fire) return; b.fire = state.t; ev({ type: 'fire', x: b.position.x, y: b.position.y - 40 }); after(110, () => fail(level.fireMsg || 'Pegou fogo. Parabéns.')); }
    // torradeira: peso em cima aciona a alavanca; ejeta o que estiver no encaixe e dá um pulo em quem pesou
    function popToaster(ea, b) {
      ea.data.popped = true; const fx = ea.flip ? -1 : 1; const top = ea.bodies.find(x => x.role === 'top') || ea.main; ev({ type: 'toastpop', x: top.position.x, y: top.position.y - 30 });
      if (b) { Body.setVelocity(b, { x: -7.5 * fx, y: -5 }); Body.setAngularVelocity(b, 0); } /* o tranco joga o peso pro lado oposto ao da torrada */
      for (const o of ents) if ((o.type === 'sardine' || o.type === 'toast') && o.inToaster) { Body.setStatic(o.main, false); Body.setVelocity(o.main, { x: 3.4 * fx, y: -10 }); Body.setAngularVelocity(o.main, 0.15 * fx); }
    }
    function openTap() { let any = false; for (const e of ents) if (e.type === 'hose' && e.data.live && e.data.openT == null) { e.data.openT = state.t; any = true; ev({ type: 'water', x: e.data.nozzle.x, y: e.data.nozzle.y }); } return any; }

    function instantiate(d) {
      const ent = { type: d.type, x: d.x, y: d.y, angle: d.angle || 0, flip: !!d.flip, fixed: !!d.fixed, power: d.power, scale: d.scale, ex: d.ex, ey: d.ey, cx: d.cx, cy: d.cy, openAt: d.openAt, litAt: d.litAt, hx: d.hx, hy: d.hy, owner: d.owner, inToaster: d.inToaster, pts: d.pts, drop: d.drop, loose: !!d.loose, bodies: [], data: {} };
      const a = rad(ent.angle), fx = ent.flip ? -1 : 1, x = ent.x, y = ent.y;
      const S = { isStatic: true, friction: 0.4, restitution: 0.05 };
      const add = (b, role) => { b.ent = ent; b.role = role || 'main'; ent.bodies.push(b); if (!ent.main && b.role === 'main') ent.main = b; Composite.add(world, b); return b; };
      switch (ent.type) {
        case 'plank': case 'bat': case 'branch': add(Bodies.rectangle(x, y, 160 * Math.max(0.5, Math.min(2, ent.scale || 1)), 16, Object.assign({}, S, { angle: a, friction: 0.3 }))); break;
        case 'block': add(Bodies.rectangle(x, y, 60, 44, S)); break;
        case 'bricks': add(Bodies.rectangle(x, y, 60, 132, S)); break;
        case 'candle': add(Bodies.rectangle(x, y, 14, 100, S)); ent.data.lit = false; ent.data.flame = { x, y: y - 57 }; break;
        case 'lighter': add(Bodies.rectangle(x, y, 30, 86, Object.assign({}, S, { isSensor: true }))); ent.data.tip = { x, y: y - 50 }; break;
        case 'toaster': { // corpo sólido; peso caindo em cima dele aciona a alavanca e ejeta o que estiver no encaixe
          add(Bodies.rectangle(x, y, 130, 84, Object.assign({}, S, { chamfer: { radius: 26 }, collisionFilter: { group: -3 } }))); /* topo arredondado: o que cai em cima escorrega pro lado */
          add(Bodies.rectangle(x, y - 48, 100, 14, Object.assign({}, S, { isSensor: true, collisionFilter: { group: -3 } })), 'top'); ent.data.popped = false; break;
        }
        case 'sardine': { const b = add(Bodies.rectangle(x, y, 100, 30, { density: 0.0015, friction: 0.4, restitution: 0.05, frictionAir: 0.002, angle: a, chamfer: { radius: 10 }, collisionFilter: { category: FOOD, group: ent.inToaster ? -3 : 0 } })); b.food = 'fish'; /* só dentro da torradeira ignora o corpo dela */ if (!ent.fixed) Body.setStatic(b, true); break; }
        case 'toast': { const b = add(Bodies.rectangle(x, y, 52, 52, { density: 0.0032, friction: 0.5, restitution: 0.15, frictionAir: 0.005, angle: a, chamfer: { radius: 12 }, collisionFilter: { category: FOOD, group: ent.inToaster ? -3 : 0 } })); b.food = 'toast'; if (!ent.fixed) Body.setStatic(b, true); break; }
        case 'funnel': { // paredes inclinadas (o que cai escorrega pra dentro) e sensor na boca; gira: deitado, o bico aponta pro lado
          const R = v => rot(v, a), m = R({ x: 0, y: -30 }), wl = R({ x: -33, y: -12 }), wr = R({ x: 33, y: -12 }), sp = R({ x: 0, y: 46 });
          add(Bodies.rectangle(x + m.x, y + m.y, 108, 36, Object.assign({}, S, { isSensor: true, angle: a })));
          add(Bodies.rectangle(x + wl.x, y + wl.y, 9, 80, Object.assign({}, S, { angle: a - 0.42 })), 'wall'); add(Bodies.rectangle(x + wr.x, y + wr.y, 9, 80, Object.assign({}, S, { angle: a + 0.42 })), 'wall');
          ent.data.pour = 0; ent.data.spout = { x: x + sp.x, y: y + sp.y }; ent.data.dir = R({ x: 0, y: 1 }); break;
        }
        case 'fuse': { // pavio: peça reta que o jogador estica e gira; acende por uma ponta e o fogo anda até a outra
          const L = 160 * Math.max(0.5, Math.min(3.6, ent.scale || 1)), d = rot({ x: 1, y: 0 }, a);
          add(Bodies.rectangle(x, y, L, 10, Object.assign({}, S, { isSensor: true, angle: a })));
          Object.assign(ent.data, { A: { x: x - d.x * L / 2, y: y - d.y * L / 2 }, B: { x: x + d.x * L / 2, y: y + d.y * L / 2 }, L, lit: false, from: null, pos: 0, done: false }); break;
        }
        case 'ironhook': { // ferro de passar pendurado por uma corda curta num gancho fixo; fogo na corda solta o ferro
          add(Bodies.circle(x, y, 5, Object.assign({}, S, { isSensor: true })));
          const iron = add(Bodies.rectangle(x, y + (ent.drop || 20) + 33, 40, 66, { density: 0.006, friction: 0.6, restitution: 0.02, chamfer: { radius: 8 }, collisionFilter: { group: -3 } }), 'iron'); iron.itemType = 'iron';
          const link = Constraint.create({ pointA: { x, y }, bodyB: iron, pointB: { x: 0, y: -33 }, length: ent.drop || 20, stiffness: 0.95 });
          Composite.add(world, link); Object.assign(ent.data, { link, iron, cut: false }); break;
        }
        case 'bagrope': { // saco de ração dependurado por uma corda num gancho fixo (hx, hy); a corda é um elo que a chama corta
          const b = add(Bodies.rectangle(x, y, 70, 100, { density: 0.003, friction: 0.6, restitution: 0.05, chamfer: { radius: 6 }, collisionFilter: { mask: 0xFFFFFFFF & ~FOOD } })); b.bag = true;
          const link = Constraint.create({ pointA: { x: ent.hx, y: ent.hy }, bodyB: b, pointB: { x: -30, y: -50 }, length: Math.hypot(ent.hx - (x - 30), ent.hy - (y - 50)), stiffness: 0.9 });
          if (ent.loose) { ent.data.cut = true; ent.data.burn = 0; break; } /* saco solto: sem corda */
          Composite.add(world, link); ent.data.link = link; ent.data.burn = 0; ent.data.cut = false; break;
        }
        case 'kibble': { const b = add(Bodies.circle(x, y, 6, { density: 0.002, friction: 0.3, restitution: 0.1, frictionAir: 0.002, collisionFilter: { category: FOOD } })); b.food = 'kibble'; break; }
        case 'bowl': { // pote: fundo + bordas, sensor por dentro; conta o que caiu
          const SB = Object.assign({}, S, { collisionFilter: { category: BOWLC } }); add(Bodies.rectangle(x, y - 6, 120, 10, SB)); add(Bodies.rectangle(x - 58, y - 24, 10, 40, SB), 'wall'); add(Bodies.rectangle(x + 58, y - 24, 10, 40, SB), 'wall');
          ent.data.kibble = 0; ent.data.fish = false; ent.data.toast = false; break;
        }
        case 'bow': { // o arco é só um marcador; a flecha nasce sozinha no começo do teste
          add(Bodies.rectangle(x, y, 20, 170, Object.assign({}, S, { isSensor: true, angle: a })));
          ent.data.dir = rot({ x: 1, y: 0 }, a); ent.data.fired = false; break;
        }
        case 'arrow': { // usada internamente (nasce do arco)
          const b = add(Bodies.rectangle(x, y, 80, 6, { density: 0.0015, friction: 0.4, restitution: 0.15, frictionAir: 0.003, angle: a, chamfer: { radius: 2 } }));
          Body.setInertia(b, Infinity); b.arrow = true; b.itemType = 'arrow'; break;
        }
        case 'balloonbox': { // balão parado no ar segurando a caixa; estoura → a caixa cai
          const box = add(Bodies.rectangle(x, y - 36, 62, 72, { density: 0.007, friction: 0.5, restitution: 0.05, chamfer: { radius: 4 } }));
          const bal = add(Bodies.circle(x, y - 36 - 140, 58, { isStatic: true, isSensor: true }), 'balloon');
          const link = Constraint.create({ bodyA: bal, pointA: { x: 0, y: 40 }, bodyB: box, pointB: { x: 0, y: -36 }, length: 64, stiffness: 0.9, damping: 0.1 });
          Composite.add(world, link); ent.data.link = link; ent.data.balloon = bal; ent.data.popped = false; break;
        }
        case 'seesaw': { // pivô fixo + tábua com pino; alças nas pontas seguram o que estiver em cima
          const py = y - 78;
          add(Bodies.rectangle(x, y - 34, 24, 68, Object.assign({}, S, { collisionFilter: { group: -2 } })));
          const plank = Body.create({ parts: [Bodies.rectangle(x, py, 330, 14), Bodies.rectangle(x - 152, py - 16, 8, 30), Bodies.rectangle(x + 152, py - 16, 8, 30)], density: 0.001, friction: 0.6, restitution: 0.1, collisionFilter: { group: -2 } });
          Body.setAngle(plank, rad(24)); add(plank, 'plank');
          Composite.add(world, Constraint.create({ pointA: { x, y: py }, bodyB: plank, pointB: { x: 0, y: 0 }, length: 0, stiffness: 1 }));
          ent.data.plank = plank; break;
        }
        case 'chute': { // calha curva: segmentos fixos seguindo o fundo da curva (coordenadas locais da imagem)
          const pts = [[-118, -62], [-72, -60], [-46, -40], [-22, -8], [10, 26], [50, 58], [92, 78], [128, 84]];
          const L = pts.map(([px, py]) => rot({ x: px * fx, y: py }, a));
          add(Bodies.circle(x, y, 6, Object.assign({}, S, { isSensor: true })));
          for (let i = 0; i < L.length - 1; i++) { const p0 = L[i], p1 = L[i + 1]; const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) + 6; add(Bodies.rectangle(x + (p0.x + p1.x) / 2, y + (p0.y + p1.y) / 2, len, 10, Object.assign({}, S, { angle: Math.atan2(p1.y - p0.y, p1.x - p0.x), friction: 0.05, restitution: 0.1 })), 'seg'); }
          break;
        }
        case 'hose': { // mangueira flexível: sem colisão; o jato sai da ponta, na direção do último trecho da curva
          add(Bodies.circle(x, y, 8, Object.assign({}, S, { isSensor: true })));
          const hp = water.hosePts(ent); ent.data.nozzle = hp.p1; ent.data.dir = hp.dir; ent.data.pressure = 0; ent.data.live = false; break;
        }
        case 'tap': add(Bodies.rectangle(x, y, 40, 36, Object.assign({}, S, { isSensor: true }))); break;
        case 'hydrant': add(Bodies.rectangle(x, y + 5, 56, 100, S)); break;
        case 'trampoline': add(Bodies.rectangle(x, y, 100, 26, Object.assign({}, S, { angle: a, friction: 0.1 }))); ent.data.up = rot({ x: 0, y: -1 }, a); break;
        case 'bumper': add(Bodies.circle(x, y, 27, Object.assign({}, S, { restitution: 0.6 }))); break;
        case 'conveyor': add(Bodies.rectangle(x, y, 180, 24, Object.assign({}, S, { angle: a, friction: 0.9 }))); ent.data.tangent = rot({ x: fx, y: 0 }, a); break;
        case 'fan': add(Bodies.rectangle(x, y, 50, 70, Object.assign({}, S, { angle: a }))); ent.data.dir = rot({ x: fx, y: 0 }, a); ent.data.perp = rot({ x: 0, y: 1 }, a); break;
        case 'ball': { const b = add(Bodies.circle(x, y, 18, { density: 0.004, friction: 0.2, restitution: 0.45, frictionAir: 0.0008, collisionFilter: { category: TOY } })); b.toy = true; b.itemType = 'ball'; break; }
        case 'beach': { const b = add(Bodies.circle(x, y, 30, { density: 0.0003, friction: 0.2, restitution: 0.85, frictionAir: 0.015, collisionFilter: { category: TOY } })); b.toy = true; b.itemType = 'beach'; break; }
        case 'bowling': add(Bodies.circle(x, y, 24, { density: 0.008, friction: 0.05, restitution: 0.2, frictionAir: 0.002 })).itemType = 'bowling'; break;
        case 'crate': add(Bodies.rectangle(x, y, 64, 50, { density: 0.0012, friction: 0.5, restitution: 0.05, angle: a })).itemType = 'crate'; break;
        case 'tennis': { const b = add(Bodies.circle(x, y, 14, { density: 0.0015, friction: 0.3, restitution: 0.7, frictionAir: 0.005, collisionFilter: { category: TOY } })); b.toy = true; b.itemType = 'tennis'; break; }
        case 'bucket': { add(Body.create({ parts: [Bodies.rectangle(x, y + 38, 70, 12), Bodies.rectangle(x - 30, y + 6, 10, 76), Bodies.rectangle(x + 30, y + 6, 10, 76)], isStatic: true, friction: 0.5, restitution: 0.05 })); add(Bodies.rectangle(x, y + 12, 44, 40, { isStatic: true, isSensor: true }), 'sensor'); break; }
        case 'iron': add(Bodies.rectangle(x, y, 40, 66, { density: 0.006, friction: 0.6, restitution: 0.02, angle: a, chamfer: { radius: 8 } })).itemType = 'iron'; break;
        case 'balloon': add(Bodies.circle(x, y, 22, { density: 0.0004, friction: 0.1, restitution: 0.3, frictionAir: 0.04 })); break;
        default: throw new Error('peça desconhecida: ' + ent.type);
      }
      return ent;
    }

    // personagens
    const actors = {};
    for (const a of level.actors || []) {
      const def = ACTORS[a.who];
      const body = Bodies.rectangle(a.x, a.y - def.h / 2, def.w, def.h, { density: def.density, friction: 0.9, restitution: 0, frictionAir: 0.02, chamfer: { radius: 18 }, collisionFilter: { mask: 0xFFFFFFFF & ~(FOOD | BOWLC) } });
      Body.setInertia(body, Infinity);
      body.actor = a.who;
      Composite.add(world, body);
      actors[a.who] = { who: a.who, name: def.name, body, def, state: a.state || 'sit', facing: a.facing || 1, wet: !!a.wet, timer: 0, target: null, targetX: null, bubble: null, expr: null, home: a.home || null, sleepSprite: a.sleepSprite || null, pose: null };
    }
    const gerin = actors.gerin, gonca = actors.gonca;

    /* ---------- utilidades para a lógica da fase ---------- */
    const isDyn = b => b && !b.isStatic && !b.isSensor;
    const after = (frames, fn) => state.timers.push({ at: state.t + frames, fn });
    const say = (actor, text, frames) => { actor.bubble = { text, until: state.t + (frames || 90) }; ev({ type: 'say', who: actor.who, text }); };
    const setState = (actor, s, extra) => { actor.state = s; actor.timer = 0; Object.assign(actor, extra || {}); ev({ type: 'actor', who: actor.who, state: s, x: actor.body.position.x, y: actor.body.position.y }); };
    function win() { if (!state.won && !state.failed) { state.won = true; state.wonAt = state.t; ev({ type: 'win' }); } }
    function fail(msg) { if (!state.won && !state.failed) { state.failed = true; state.failedAt = state.t; if (msg) state.failMsg = msg; ev({ type: 'fail' }); } }
    function fight(x, y, lose) {
      if (state.vignette) return;
      state.vignette = { type: 'fight', x, y, t: 0, len: 300 };
      for (const a of Object.values(actors)) { setState(a, 'fight'); Body.setStatic(a.body, true); Body.setPosition(a.body, { x: x + (a.who === 'gerin' ? -20 : 20), y: y }); }
      ev({ type: 'fight', x, y });
      after(300, () => lose ? fail() : (level.afterFight ? level.afterFight(ctx) : win()));
    }
    // encerra a vinheta e devolve os bichos ao chão (pra cena final continuar)
    function release(pos) {
      state.vignette = null;
      for (const a of Object.values(actors)) { const x = pos && pos[a.who] != null ? pos[a.who] : a.body.position.x; Body.setStatic(a.body, false); Body.setPosition(a.body, { x, y: FLOOR - a.def.h / 2 }); Body.setVelocity(a.body, { x: 0, y: 0 }); setState(a, 'sit'); a.pose = null; a.gotToy = null; a.target = null; }
    }
    function hug(x, y) {
      if (state.vignette) return;
      state.vignette = { type: 'hug', x, y, t: 0, len: 220 };
      for (const a of Object.values(actors)) setState(a, 'hug');
      ev({ type: 'hug', x, y });
      after(220, () => win());
    }
    const startle = (actor, extra) => { if (['fight', 'hug', 'startled', 'panic'].includes(actor.state)) return; setState(actor, 'startled', extra); Body.setVelocity(actor.body, { x: actor.body.velocity.x, y: -8 }); ev({ type: 'startle', who: actor.who, x: actor.body.position.x, y: actor.body.position.y }); };
    const ctx = { state, st, actors, gerin, gonca, ents, scenery, after, say, setState, win, fail, fight, hug, release, startle, ev, isDyn, world, dist };

    /* ---------- comportamento dos personagens ---------- */
    function stepActor(a) {
      const b = a.body, p = b.position; a.timer++;
      if (a.bubble && state.t > a.bubble.until) a.bubble = null;
      switch (a.state) {
        case 'chase': case 'walk': {
          const tx = a.state === 'chase' ? (a.target ? a.target.position.x : p.x) : a.targetX;
          const dx = tx - p.x, reach = a.state === 'chase' ? a.def.w / 2 - 6 : 28; // no chase ele encosta e empurra a bola com o focinho
          const ty = a.state === 'chase' && a.target ? a.target.position.y : p.y, farY = Math.abs(ty - p.y) > 45;
          if (Math.abs(dx) <= reach && farY) { Body.setVelocity(b, { x: b.velocity.x * 0.8, y: b.velocity.y }); a.stuck = 0; break; } // bola no ar em cima dele: espera sem se virar
          if (Math.abs(dx) > reach) {
            if (Math.abs(dx) > 40) a.facing = Math.sign(dx);
            const want = a.facing * a.def.speed; // no chão acelera em ~5 quadros em vez de sair já na velocidade final
            if (a.airT > 0) { a.airT--; if (a.airT < 10) Body.setVelocity(b, { x: want, y: b.velocity.y }); }
            else {
              Body.setVelocity(b, { x: b.velocity.x + (want - b.velocity.x) * 0.28, y: b.velocity.y });
              if (a.stuckX !== undefined && Math.abs(p.x - a.stuckX) < 0.5) a.stuck++; else a.stuck = 0; a.stuckX = p.x;
              if (a.stuck > 25 && a.state === 'chase' && Math.abs(dx) < a.def.w / 2 + 30) { a.stuck = 0; a.gotToy = a.target; a.gotAt = state.t; setState(a, 'got'); if (level.onReach) level.onReach(ctx, a, 'chase'); break; } // bola encostada em algo: pegou
              if (a.stuck > 25) { a.stuck = 0; a.airT = 18; Body.setPosition(b, { x: p.x - a.facing * 4, y: p.y - 2 }); Body.setVelocity(b, { x: a.facing * 1.5, y: -10.5 }); ev({ type: 'jump', who: a.who }); }
            }
          }
          else { const was = a.state; a.gotToy = a.target; a.gotAt = state.t; setState(a, 'got'); if (level.onReach) level.onReach(ctx, a, was); }
          break;
        }
        case 'got': { // a bola continua rolando devagar? vai atrás sem cerimônia
          const t = a.gotToy; if (!t || a.timer < 12) break;
          const dx = t.position.x - p.x;
          if (Math.abs(dx) > a.def.w / 2 + 44 && Math.abs(t.position.y - p.y) < 60) setState(a, 'chase', { target: t });
          break;
        }
        case 'startled': if (a.timer > 50) setState(a, a.mad ? 'angry' : 'alert'); break; /* levou flechada ou água: fica bravo até o fim */
        case 'shake': if (a.timer % 6 === 0) ev({ type: 'drip', x: p.x + (Math.random() - .5) * 60, y: p.y - 10 }); if (a.timer > 60) { a.wet = false; setState(a, 'sit'); } break;
        case 'panic': Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y }); if (a.timer % 25 === 0) say(a, ['MIAAAU!', 'ME TIRA DAQUI!', 'SOCORRO!', 'ODEIO ISSO!'][(a.timer / 25) % 4 | 0], 24); if (a.timer > 240) setState(a, 'alert'); break;
        case 'eat': case 'hungry': Body.setVelocity(b, { x: 0, y: b.velocity.y }); break; /* parado no pote: ração caindo não empurra */
        case 'sleep': if (a.timer % 90 === 0) ev({ type: 'zzz', x: p.x + a.facing * 20, y: p.y - 40 }); break;
        default: break;
      }
    }
    const idle = a => ['sit', 'sleep', 'got', 'alert', 'happy', 'laugh', 'hungry', 'eat'].includes(a.state);

    Events.on(engine, 'beforeUpdate', () => {
      // temporizadores
      const due = state.timers.filter(t => t.at <= state.t); state.timers = state.timers.filter(t => t.at > state.t); for (const t of due) t.fn();
      if (state.vignette) { state.vignette.t++; }
      // peças ativas
      for (const e of ents) {
        if (e.type === 'balloon' && !e.data.popped) { const b = e.main; Body.applyForce(b, b.position, { x: 0, y: -b.mass * 0.00175 }); }
        else if (e.type === 'bow' && !e.data.fired && state.t >= 4) {
          e.data.fired = true; const d = e.data.dir, p = e.main.position;
          const arrow = instantiate({ type: 'arrow', x: p.x + d.x * 50, y: p.y + d.y * 50, angle: Math.atan2(d.y, d.x) * 180 / Math.PI });
          arrow.internal = true; ents.push(arrow); const pw = Math.max(6, Math.min(27, e.power || 17)); Body.setVelocity(arrow.main, { x: d.x * pw, y: d.y * pw }); ev({ type: 'shoot', x: p.x, y: p.y });
        }
        else if (e.type === 'ball' && e.main.riseLock > 0) { e.main.riseLock--; Body.setVelocity(e.main, { x: 0, y: e.main.velocity.y }); }
        else if (e.type === 'toaster' && !e.data.popped && state.t > 2) {
          const top = e.bodies.find(x => x.role === 'top'); const bb = top.bounds;
          for (const o of ents) for (const b of o.bodies) { if (!b || !isDyn(b) || b.food || o === e) continue; const ob = b.bounds; if (ob.min.x < bb.max.x && ob.max.x > bb.min.x && ob.min.y < bb.max.y && ob.max.y > bb.min.y && b.position.y < top.position.y && Math.abs(b.position.x - top.position.x) < 62 && b.velocity.y > -0.5) { popToaster(e, b); break; } } /* só quando o peso está mesmo em cima da torradeira */
        }
        else if (e.type === 'lighter' && e.litAt != null && state.t >= e.litAt && !e.data.used) {
          e.data.used = true;
          for (const cd of ents) if (cd.type === 'candle' && !cd.data.lit && Math.hypot(cd.data.flame.x - e.data.tip.x, cd.data.flame.y - e.data.tip.y) < 70) { cd.data.lit = true; ev({ type: 'flame', x: cd.data.flame.x, y: cd.data.flame.y }); }
          /* pavio só acende na vela: isqueiro não alcança */
        }
        else if (e.type === 'fuse' && e.data.lit && !e.data.done) {
          const d = e.data; d.pos = Math.min(d.L, d.pos + 3); state.busyT = state.t;
          const S0 = d.from === 'B' ? d.B : d.A, S1 = d.from === 'B' ? d.A : d.B, u = d.pos / d.L, fx = S0.x + (S1.x - S0.x) * u, fy = S0.y + (S1.y - S0.y) * u; d.front = { x: fx, y: fy };
          if (state.t % 2 === 0) ev({ type: 'fusefire', x: fx, y: fy });
          fireNear(fx, fy, 50);
          if (d.pos >= d.L) { d.done = true; for (const h of ents) if (h.type === 'ironhook' && !h.data.cut && (() => { const ir = h.data.iron, top = { x: ir.position.x, y: ir.position.y - 33 }; if (S1.y > top.y - 6) return false; const vx = top.x - h.x, vy = top.y - h.y, L2 = vx * vx + vy * vy || 1; const u = Math.max(0, Math.min(1, ((S1.x - h.x) * vx + (S1.y - h.y) * vy) / L2)); return Math.hypot(S1.x - (h.x + vx * u), S1.y - (h.y + vy * u)) < 40; })()) { h.data.cut = true; Composite.remove(world, h.data.link); ev({ type: 'ropecut', x: h.x, y: h.y + 10 }); } for (const f of ents) if (f.type === 'fuse' && f !== e && !f.data.lit) { if (Math.hypot(f.data.A.x - S1.x, f.data.A.y - S1.y) < 40) { f.data.lit = true; f.data.from = 'A'; } else if (Math.hypot(f.data.B.x - S1.x, f.data.B.y - S1.y) < 40) { f.data.lit = true; f.data.from = 'B'; } } }
        }
        else if (e.type === 'candle' && e.data.lit) {
          const f = e.data.flame; fireNear(f.x, f.y, 70);
          for (const fz of ents) if (fz.type === 'fuse' && !fz.data.lit) { if (Math.hypot(fz.data.A.x - f.x, fz.data.A.y - f.y) < 48) { fz.data.lit = true; fz.data.from = 'A'; ev({ type: 'flame', x: fz.data.A.x, y: fz.data.A.y }); } else if (Math.hypot(fz.data.B.x - f.x, fz.data.B.y - f.y) < 48) { fz.data.lit = true; fz.data.from = 'B'; ev({ type: 'flame', x: fz.data.B.x, y: fz.data.B.y }); } }
          for (const o of ents) { const b = o.main; if (!b || b.isStatic || !(b.bag || b.food) || b.fire) continue; if (Math.hypot(b.position.x - f.x, b.position.y - f.y) < 95) { b.heat = (b.heat || 0) + 1; if (b.heat > 25) ignite(b, o); } }
          for (const r of ents) { if (r.type !== 'bagrope' || r.data.cut) continue; const bt = { x: r.main.position.x - 30, y: r.main.position.y - 50 }; const ax = r.hx, ay = r.hy, vx = bt.x - ax, vy = bt.y - ay, L2 = vx * vx + vy * vy || 1; let u = ((f.x - ax) * vx + (f.y - ay) * vy) / L2; u = Math.max(0, Math.min(1, u)); const dd = Math.hypot(ax + vx * u - f.x, ay + vy * u - f.y); if (dd < 26) { r.data.burn++; r.data.burnAt = u; state.busyT = state.t; if (r.data.burn % 4 === 0) ev({ type: 'spark', x: ax + vx * u, y: ay + vy * u }); if (r.data.burn === 1) ev({ type: 'burn', x: f.x, y: f.y - 20 }); if (r.data.burn > 80) { r.data.cut = true; Composite.remove(world, r.data.link); ev({ type: 'ropecut', x: ax + vx * u, y: ay + vy * u }); } } }
        }
        else if (e.type === 'funnel' && e.data.pour > 0) {
          e.data.pour--; state.busyT = state.t; if (e.data.pour % 3 === 0) { const k = instantiate({ type: 'kibble', x: e.data.spout.x + (Math.random() - 0.5) * 6, y: e.data.spout.y + (Math.random() - 0.5) * 6 }); k.internal = true; ents.push(k); Body.setVelocity(k.main, { x: e.data.dir.x * 2.6 + (Math.random() - 0.5) * 1.2, y: e.data.dir.y * 2.6 + 0.5 }); }
        }
        else if (e.type === 'bowl') {
          const bx = e.x, by = e.y; let n = 0, fish = false, toast = false;
          for (const o of ents) { const b = o.main; if (!b || !b.food) continue; if (b.food === 'kibble') { if (!b.isStatic && Math.abs(b.position.x - bx) < 66 && b.position.y > by - 84 && b.position.y < by + 4) n++; continue; } if (!b.settled && !b.isStatic && Math.abs(b.position.x - bx) < 66 && b.position.y > by - 84 && b.position.y < by + 4) Body.setVelocity(b, { x: b.velocity.x * 0.55, y: b.velocity.y * 0.7 }); if (!b.settled && !b.isStatic && Math.abs(b.position.x - bx) < 66 && b.position.y > by - 84 && b.position.y < by + 4 && b.speed < 0.8) { b.settled = true; Body.setStatic(b, true); Body.setPosition(b, { x: bx, y: by - 20 }); Body.setAngle(b, 0); } if (b.settled && Math.abs(b.position.x - bx) < 40) { if (b.food === 'fish') fish = true; else if (b.food === 'toast') toast = true; } }
          e.data.kibble = n; e.data.fish = fish; e.data.toast = toast;
        }
        else if (e.type === 'arrow') { const b = e.main; if (b.speed > 3) Body.setAngle(b, Math.atan2(b.velocity.y, b.velocity.x)); }
        else if (e.type === 'hose') {
          // jato: parábola saindo da ponta; empurra na direção em que a água está indo naquele ponto. Só sai água com a ligação completa.
          if (e.data.live && e.data.openT == null && e.openAt != null && state.t >= e.openAt) openTap();
          const pr = e.data.openT == null ? 0 : water.pressure(state.t - e.data.openT); e.data.pressure = pr;
          if (pr <= 0) continue;
          const { dir, nozzle } = e.data, range = JET_LEN * (0.25 + 0.75 * pr);
          const targets = ents.flatMap(o => o.bodies).concat(Object.values(actors).map(a => a.body));
          for (const ob of targets) {
            if (!isDyn(ob) && !ob.actor) continue;
            let best = 1e9, bu = 0;
            for (let u = 10; u <= range; u += 12) { const cx = nozzle.x + dir.x * u, cy = nozzle.y + dir.y * u + JET_G * u * u; if (cy > FLOOR) break; const dd = Math.hypot(ob.position.x - cx, ob.position.y - cy); if (dd < best) { best = dd; bu = u; } }
            if (best > 40) continue;
            if (ob.actor) { const act = actors[ob.actor]; if (!act.soaked && !state.vignette) { act.soaked = true; act.wet = true; act.mad = true; ev({ type: 'wet', who: ob.actor, x: ob.position.x, y: ob.position.y - 40 }); if (['sleep', 'sit', 'alert', 'got'].includes(act.state)) startle(act); say(act, ob.actor === 'gonca' ? 'MIAUUU!' : 'AUUUU!', 45); after(50, () => say(act, 'Vai molhar a mãe, inferno.', 120)); } continue; }
            const tx = dir.x, ty = dir.y + 2 * JET_G * bu, L = Math.hypot(tx, ty) || 1, k = 0.0032 * pr * (1 - bu / (range * 1.7));
            if ((ob.velocity.x * tx + ob.velocity.y * ty) / L > 9 * pr) continue; // a água acelera até a velocidade do jato, não além
            Body.applyForce(ob, ob.position, { x: tx / L * ob.mass * k, y: ty / L * ob.mass * k });
          }
        }
        else if (e.type === 'fan') {
          const { dir, perp } = e.data, fp = e.main.position;
          const targets = ents.flatMap(o => o.bodies).concat(Object.values(actors).map(a => a.body));
          for (const ob of targets) {
            if (!isDyn(ob)) continue;
            const d = { x: ob.position.x - fp.x, y: ob.position.y - fp.y }, along = dot(d, dir), side = dot(d, perp);
            if (along > 20 && along < 380 && Math.abs(side) < 75) { const k = (ob.actor ? 0.0006 : 0.003) * (1 - along / 420); Body.applyForce(ob, ob.position, { x: dir.x * ob.mass * k, y: dir.y * ob.mass * k }); }
          }
        }
      }
      for (const o of ents) { const b = o.main; if (b && b.fire && !o.gone && state.t % 2 === 0) ev({ type: 'flames', x: b.position.x, y: b.position.y, w: PARTS[o.type] ? PARTS[o.type].w : 60, h: PARTS[o.type] ? PARTS[o.type].h : 60, age: state.t - b.fire }); }
      // zonas de desastre da fase: fogão (pega fogo) e pia (some)
      if (level.stove || level.sink) for (const o of ents) { const b = o.main; if (!b || b.isStatic || o.gone) continue;
        if (level.stove && b.position.x > level.stove.x0 && b.position.y > level.stove.y && b.position.y < (level.stove.y1 || 1e9) && (b.bag || b.food)) ignite(b, o); /* passou por cima das bocas acesas */
        if (level.sink && b.position.x < level.sink.x1 && b.position.y > level.sink.y && b.position.y < (level.sink.y1 || 1e9)) { o.gone = true; Composite.remove(world, b); ev({ type: 'sink', x: b.position.x, y: b.position.y, what: o.type }); if (level.onSink) level.onSink(ctx, o); }
      }
      // brinquedos em movimento chamam o Gerin
      for (const e of ents) for (const b of e.bodies) { if (b.toy && b.speed > 1.2) b.active = state.t; }
      if (gerin && idle(gerin) && gerin.state !== 'sleep' && !state.vignette && level.gerinChases !== false && !st.stopChase) {
        let best = null, bd = 1e9;
        for (const e of ents) for (const b of e.bodies) { if (b.toy && b.active !== undefined && state.t - b.active < 90 && !(b === gerin.gotToy && b.active < gerin.gotAt + 30)) { const d = dist(b.position, gerin.body.position); if (d < 300 && d < bd) { bd = d; best = b; } } }
        if (best) { setState(gerin, 'notice', { target: best }); gerin.facing = best.position.x < gerin.body.position.x ? -1 : 1; }
      }
      if (gerin && gerin.state === 'notice' && gerin.timer === 40) { say(gerin, 'AU!', 30); ev({ type: 'bark', x: gerin.body.position.x, y: gerin.body.position.y - 80 }); }
      if (gerin && gerin.state === 'notice' && gerin.timer >= 55) setState(gerin, 'chase', { target: gerin.target });
      if (gerin && gerin.state === 'chase' && gerin.target && (state.t - (gerin.target.active || 0) > 240)) setState(gerin, 'sit');
      // a bola só esbarra no Gerin quando ele corre atrás dela (senão ela bate no peito dele e volta)
      if (gerin) gerin.body.collisionFilter.mask = (gerin.state === 'chase' ? 0xFFFFFFFF : (0xFFFFFFFF & ~TOY)) & ~(FOOD | BOWLC);
      for (const a of Object.values(actors)) stepActor(a);
      if (level.logic) level.logic(ctx);
      // falha: nada se mexe
      if (!state.won && !state.failed && !state.vignette && state.t > 45) {
        let moving = false;
        for (const e of ents) for (const b of e.bodies) if (isDyn(b) && b.speed > 0.25) moving = true;
        for (const a of Object.values(actors)) if (!(idle(a) || a.state === 'angry') || a.body.speed > 0.4) moving = true;
        if (state.timers.length || state.t - (state.busyT == null ? -999 : state.busyT) < 40) moving = true; // corda queimando / funil despejando contam como coisa acontecendo
        state.quiet = moving ? 0 : state.quiet + 1;
        if (state.quiet > 70 || state.t > 60 * 32) fail();
      }
    });

    function bounce(other, n, boost, min) {
      const v = other.velocity, vn = dot(v, n); if (vn >= -0.5) return;
      const out = Math.max(-vn * boost, min);
      Body.setVelocity(other, { x: v.x - vn * n.x + out * n.x, y: v.y - vn * n.y + out * n.y });
    }
    Events.on(engine, 'collisionStart', e2 => {
      for (const pair of e2.pairs) {
        for (const [a0, b0] of [[pair.bodyA, pair.bodyB], [pair.bodyB, pair.bodyA]]) {
          const a = a0.parent && a0.parent !== a0 ? a0.parent : a0, b = b0.parent && b0.parent !== b0 ? b0.parent : b0; // corpos compostos: usa o pai
          const ea = a.ent;
          if (ea) {
            // gangorra: peso caindo numa ponta arremessa o que está na outra (impulso explícito, pra ser previsível)
            if (ea.type === 'seesaw' && a.role === 'plank' && isDyn(b) && b.speed > 4 && !b.actor) {
              const pl = a, ang = pl.angle, side = Math.sign((b.position.x - pl.position.x) * Math.cos(ang) + (b.position.y - pl.position.y) * Math.sin(ang));
              const v = Math.min(18, 6 + b.speed * (b.mass / 12) * 1.1);
              for (const o of ents.flatMap(o => o.bodies)) {
                if (!isDyn(o) || o === b || o.ent === ea) continue;
                const lx = (o.position.x - pl.position.x) * Math.cos(ang) + (o.position.y - pl.position.y) * Math.sin(ang), ly = -(o.position.x - pl.position.x) * Math.sin(ang) + (o.position.y - pl.position.y) * Math.cos(ang);
                if (Math.sign(lx) === -side && Math.abs(lx) < 175 && ly < 0 && ly > -60) { Body.setVelocity(o, { x: 0, y: -v }); o.riseLock = 10; ev({ type: 'launch', x: o.position.x, y: o.position.y }); }
              }
              Body.setVelocity(b, { x: b.velocity.x * 0.3, y: b.velocity.y * 0.2 });
            }
            if (ea.type === 'trampoline' && isDyn(b)) { bounce(b, ea.data.up, 1.05, b.actor ? 12 : 10); if (b.actor === 'gonca' && gonca.state !== 'panic' && !state.vignette) { setState(gonca, 'panic'); ev({ type: 'startle', who: 'gonca', x: b.position.x, y: b.position.y }); } if (b.actor === 'gerin' && !state.vignette && gerin.state !== 'fight') say(gerin, 'UHUUUL!', 40); }
            else if (ea.type === 'bumper' && isDyn(b)) { const d = { x: b.position.x - a.position.x, y: b.position.y - a.position.y }, L = Math.hypot(d.x, d.y) || 1; bounce(b, { x: d.x / L, y: d.y / L }, 1.0, 8); }
            else if (ea.type === 'toaster' && a.role === 'top' && !ea.data.popped && isDyn(b) && !b.food) popToaster(ea, b);
            else if (ea.type === 'funnel' && a.role === 'main' && b.bag && !b.eaten) { b.eaten = true; Composite.remove(world, b); ea.data.pour = 100; ev({ type: 'pour', x: a.position.x, y: a.position.y }); }
            else if (ea.type === 'balloonbox' && a.role === 'balloon' && !ea.data.popped && (b.arrow || (isDyn(b) && b.speed > 4))) { ea.data.popped = true; Composite.remove(world, ea.data.link); Composite.remove(world, a); ev({ type: 'pop', x: a.position.x, y: a.position.y }); }
            else if (ea.type === 'balloon' && !ea.data.popped && (b.actor === 'gonca')) { ea.data.popped = true; Composite.remove(world, a); ev({ type: 'pop', x: a.position.x, y: a.position.y }); startle(gonca); }
          }
          if (a.reactive === 'guitar' && isDyn(b) && b.speed > 1.5 && !b.actor && !b.arrow) { /* flecha no violão não conta: senão vira tiro ao alvo */ ev({ type: 'twang', x: a.position.x, y: a.position.y - 60 }); st.twang = state.t; if (level.onTwang) level.onTwang(ctx); }
          if (a.reactive === 'lamp' && isDyn(b) && b.speed > 1 && !st.lampOn) { st.lampOn = true; ev({ type: 'light', x: a.position.x, y: a.position.y - 60 }); }
          // coisas caindo nos bichos
          if (a.actor && isDyn(b) && !b.actor && b.speed > 2.5) {
            const act = actors[a.actor];
            if (b.arrow) { if (!act.arrowed && !state.vignette) { act.arrowed = true; act.mad = true; startle(act); say(act, a.actor === 'gonca' ? 'MIAUUU!' : 'AUUUU!', 45); after(50, () => say(act, 'Isso é crime, desgraça...', 120)); Body.setVelocity(b, { x: -b.velocity.x * 0.3, y: -3 }); } }
            else if (b.speed > 4 && !b.toy && !b.food) { act.mad = true; startle(act); say(act, a.actor === 'gonca' ? 'MIAUUU!' : 'AUUUU!', 45); after(50, () => say(act, ['Isso é crime, desgraça...', 'Na cabeça? Sério?', 'Eu vi quem foi.'][act.hits = ((act.hits || 0) + 1) % 3], 120)); }
            else if (a.actor === 'gonca') startle(gonca, { by: b });
            else if (a.actor === 'gerin' && (act.state === 'sleep' || act.state === 'sit')) { setState(gerin, 'alert'); say(gerin, 'AU?', 40); if (level.onGerinHit) level.onGerinHit(ctx, b); }
          }
        }
      }
    });
    Events.on(engine, 'collisionActive', e2 => {
      for (const pair of e2.pairs) for (const [a, b] of [[pair.bodyA, pair.bodyB], [pair.bodyB, pair.bodyA]]) {
        const ea = a.ent;
        if (ea && ea.type === 'conveyor' && isDyn(b)) { const t = ea.data.tangent, v = b.velocity, vt = dot(v, t), dv = (4.2 - vt) * 0.3; Body.setVelocity(b, { x: v.x + t.x * dv, y: v.y + t.y * dv }); }
      }
    });

    if (level.setup) level.setup(ctx);

    return {
      engine, world, ents, scenery, actors, state, level, st, openTap,
      step() { Engine.update(engine, DT); state.t++; },
      run(frames) { while (state.t < frames && !state.won && !state.failed) this.step(); return state.won; },
    };
  }

  return { PARTS, ACTORS, SCENERY, build, W, H, FLOOR, DT, JET_G, JET_LEN, water };
});
