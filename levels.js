/* GerinGonça — fases e textos. Tabuleiro 2400x800, chão em y=740. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GG_LEVELS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const P = (x, y, angle) => ({ type: 'plank', x, y, angle: angle || 0 });

  const MESSAGES = {
    fail: [
      'Foi a pior geringonça que já vi. E olha que eu vi a sua anterior.',
      'Tá brincando que você achou que isso ia funcionar?',
      'Não é possível que você pensou nisso 😂',
      'Isso ficou mais errado que promessa de político.',
      'Se esse é o seu melhor, coitado do teu patrão.',
      'Parabéns. Nota dó.',
      'A física pediu pra sair.',
      'Isso aí não é geringonça, é pedido de socorro.',
      'Errou com tanta confiança que quase acreditei.',
      'Meu avô montava melhor, e ele nem tinha polegar.',
      'Nem a gravidade colaborou. E ela colabora com todo mundo.',
      'Você testou isso na sua cabeça antes? Não né.',
      'Bonito. Não funcionou, mas bonito.',
      'Quase. Tipo, quase de longe.',
    ],
    laugh: {
      gonca: ['Depois a irracional sou eu kkkk', 'Gerin, vem ver isso. Não, sério, vem.', 'Nove vidas e eu não gastaria nenhuma nessa ideia.', 'Eu durmo 16 horas por dia e ainda rendo mais que isso.'],
      gerin: ['Eu como grama e ainda tô rindo de você.', 'Faz de novo, eu não vi direito 😂', 'Eu persigo o próprio rabo e faria melhor.', 'Isso foi pior que banho.'],
    },
    tip: [],
  };

  const LEVELS = [
    /* ================= ATO 1: A BRIGA ================= */
    {
      act: 1, title: 'Chuva lá fora',
      intro: 'Tá chovendo. O Gerin tá lá fora. A Gonça, não.',
      objective: 'Tem um cachorro na chuva.',
      win: 'Meus parabéns. Você acabou de criar uma guerra.',
      ending: { who: 'gonca', text: 'Tá vendo o que você fez...', keep: true, poses: { gerin: ['gerin.sleepwet', 130, 1], gonca: ['gonca.box', 200, 1] } },
      hint: 'Cachorro gosta de bola. Bola não gosta de muro.',
      trigger: 'tap',
      rain: { from: 0, to: 1500 },
      ground: [{ x0: 0, x1: 1500, y0: 668, y1: 746 }, { x0: 1512, x1: 2400, y0: 640, y1: 746 }], // grama do quintal e piso da sala
      scene: [
        { kind: 'backdrop', sprite: 'bg.sky', x0: 0, y0: 0, x1: 1500, y1: 800 },
        // portão e cerca lá no fundo do quintal: desenhados antes da grama, que cobre o pé deles
        { kind: 'img', sprite: 'sc.gate', x: 95, y: 700, h: 200, angle: 2 },
        { kind: 'img', sprite: 'sc.fence', x: 300, y: 703, h: 125, angle: -1 },
        { kind: 'img', sprite: 'sc.fence', x: 525, y: 705, h: 122, angle: 1 },
        { kind: 'img', sprite: 'sc.fence', x: 750, y: 703, h: 125, angle: -0.5 },
        { kind: 'img', sprite: 'sc.fence', x: 970, y: 704, h: 123, angle: 0.5 },
        { kind: 'img', sprite: 'sc.fence', x: 1190, y: 703, h: 125, angle: -1 },
        { kind: 'img', sprite: 'sc.fence', x: 1385, y: 705, h: 122, angle: 0.5 },
        { kind: 'strip', sprite: 'sc.grass', x0: 0, x1: 1500, y: 800, h: 150, offset: 40 },
        // casa mais alta: aparece mais parede da foto e a janela cabe acima da poltrona
        { kind: 'backdrop', sprite: 'bg.room', x0: 1512, y0: 130, x1: 2400, y1: 800, dim: 0.1 },
        { kind: 'wall', x: 1500, y: 330, w: 24, h: 420, hidden: true },
        { kind: 'ceiling', x: 1950, y: 118, w: 900, h: 24, hidden: true },
        { kind: 'img', sprite: 'sc.roof', x: 1955, y: 162, w: 990, angle: -1, shadow: false },
        { kind: 'img', sprite: 'sc.window', x: 1665, y: 318, w: 150, angle: 1 },
        { kind: 'img', sprite: 'sc.box', x: 2310, y: 744, h: 130, angle: -3, hideIf: 'boxed' },
      ],
      fixed: [{ type: 'branch', x: 630, y: 600, angle: 0 }, { type: 'ball', x: 600, y: 574 }, { type: 'bricks', x: 940, y: 674 }],
      actors: [
        { who: 'gerin', x: 1300, y: 740, state: 'sit', facing: 1, wet: true },
        { who: 'gonca', x: 2120, y: 740, state: 'sleep', facing: -1, sleepSprite: ['gonca.lie', 130, -1] },
      ],
      inventory: { hydrant: 1, tap: 1, hose: 1, trampoline: 1, bat: 1 },
      logic(c) {
        const g = c.gerin, x = g.body.position.x;
        // passou da porta: larga a bola e entra de vez na sala antes de se sacudir
        if (!c.st.entering && x > 1525 && !c.state.vignette) { c.st.entering = true; c.st.stopChase = true; g.facing = 1; c.setState(g, 'walk', { targetX: 1700 }); }
      },
      onReach(c, a) {
        if (a.who === 'gerin' && c.st.entering && !c.st.in) {
          // cena: entra, se sacode, a gata acorda, os dois se encaram... e briga
          const g = c.gerin; c.st.in = true;
          c.setState(g, 'shake'); c.say(g, 'AAAH, SEQUINHO!', 70);
          c.after(75, () => { c.startle(c.gonca); c.say(c.gonca, 'QUEM MOLHOU MINHA ALMOFADA?!', 110); g.facing = 1; c.gonca.facing = -1; });
          c.after(165, () => { c.setState(g, 'alert'); c.say(g, 'ACORDA, PREGUIÇOSA.', 100); });
          c.after(265, () => { c.setState(c.gonca, 'angry'); c.say(c.gonca, 'Sai da minha sala.', 100); });
          c.after(365, () => { c.setState(g, 'angry'); c.say(g, 'Eu MORO aqui.', 100); });
          c.after(465, () => c.say(c.gonca, 'Morava.', 100));
          c.after(565, () => c.fight(1910, 700));
          return;
        }
        if (!c.st.fought) return;
        if (a.who === 'gonca' && !c.st.boxed) { c.st.boxed = true; c.gonca.facing = 1; c.gonca.pose = ['gonca.box', 200, 1]; }
        if (a.who === 'gerin' && !c.st.down) {
          // rodeia antes de deitar: esquerda, direita, esquerda de novo
          const turn = c.st.turn = (c.st.turn || 0) + 1;
          if (turn === 1) c.after(20, () => c.setState(c.gerin, 'walk', { targetX: 1800 }));
          else if (turn === 2) c.after(20, () => c.setState(c.gerin, 'walk', { targetX: 1745 }));
          else { c.st.down = true; c.gerin.facing = -1; c.gerin.pose = ['gerin.sleepwet', 130, 1]; }
        }
        if (c.st.boxed && c.st.down && !c.st.ended) { c.st.ended = true; c.after(40, () => c.win()); }
      },
      // depois da briga: cada um vai pro seu canto. O Gerin deita quieto, a Gonça entra na caixa e olha pra você
      afterFight(c) {
        c.st.fought = true; c.release({ gerin: 1880, gonca: 1940 });
        c.gerin.facing = -1; c.setState(c.gerin, 'walk', { targetX: 1720 });
        c.gonca.facing = 1; c.setState(c.gonca, 'walk', { targetX: 2310 });
      },
      solution: [{ type: 'hydrant', x: 340, y: 685, flip: false }, { type: 'tap', x: 413, y: 695, flip: true }, { type: 'hose', x: 438, y: 724, ex: 430, ey: 540, cx: 350, cy: 540, openAt: 0 }, { type: 'trampoline', x: 780, y: 705, angle: 25 }],
    },
    {
      act: 1, title: 'Manhã na varanda',
      intro: 'Amanheceu. Alguém dormiu na cama errada.',
      objective: 'Quieto demais. Resolva isso.',
      win: 'Olha você de novo colocando os bichos pra brigar.',
      ending: { who: 'gonca', text: 'Caralho, heim...', keep: true, poses: { gonca: ['gonca.sit', 180, -1] } },
      hint: 'Tudo que sobe desce. A não ser que alguém empurre.',
      trigger: 'bow',
      scene: [
        { kind: 'backdrop', sprite: 'bg.sky', x0: 0, y0: 0, x1: 2400, y1: 800 },
        // foto subida pra linha dos pés da cadeira cair no chão do jogo (y=740); 400px de quintal a mais à esquerda (emenda espelhada)
        { kind: 'photo', sprite: 'bg.porch', x: 400, y: -486, w: 2000, mirrorLeft: 400 },
        { kind: 'strip', sprite: 'sc.grass', x0: 0, x1: 1170, y: 800, h: 150, offset: 20, cut: { top: 1122, bottom: 1160 } }, // corte na diagonal da beirada da calçada
        { kind: 'guitar', x: 1440, y: 430, wall: true, angle: 6 },
        // cama do Gerin: fundo atrás da gata, borda da frente por cima dela
        { kind: 'prop', sprite: 'sc.dogbed', x: 2120, y: 750, w: 300, shadow: false },
        { kind: 'propfront', sprite: 'sc.dogbed', x: 2120, y: 750, w: 300, from: 0.7 },
      ],
      ground: [{ x0: 0, x1: 1170, y0: 600, y1: 746 }, { x0: 1170, x1: 2400, y0: 700, y1: 746 }], // gramado (até lá atrás, perto da cerca) e piso da varanda
      fixed: [{ type: 'seesaw', x: 870, y: 740 }, { type: 'ball', x: 998, y: 690 }, { type: 'balloonbox', x: 730, y: 400 }],
      actors: [
        { who: 'gerin', x: 1490, y: 740, state: 'sleep', facing: 1 },
        { who: 'gonca', x: 2120, y: 740, state: 'sleep', facing: -1, sleepSprite: ['gonca.remote', 112, -1, 24] },
      ],
      inventory: { bow: 1, hydrant: 1, tap: 1, hose: 1, chute: 1, bat: 1 },
      gerinChases: false,
      onTwang(c) {
        if (c.st.woke) return; c.st.woke = true;
        c.say(c.gonca, 'QUEM FOI?!', 60); c.startle(c.gonca);
        c.setState(c.gerin, 'alert'); c.say(c.gerin, 'AU! O QUÊ? O QUÊ?', 60);
        c.after(70, () => { c.gerin.facing = 1; c.setState(c.gerin, 'walk', { targetX: 2000 }); c.say(c.gerin, 'MINHA CAMA!', 60); });
      },
      onReach(c, a) {
        if (a.who !== 'gerin') return;
        if (c.st.woke && !c.st.done) { c.st.done = true; c.say(c.gonca, 'TÁ OCUPADO.', 60); c.setState(c.gerin, 'angry'); c.after(70, () => c.fight(2050, 700)); return; }
        if (c.st.fought && !c.st.ended) { c.st.ended = true; c.gerin.facing = 1; c.setState(c.gerin, 'sleep'); c.after(50, () => c.win()); }
      },
      // depois da briga o Gerin volta pro canto dele, do outro lado da varanda, longe da gata
      afterFight(c) {
        c.st.fought = true; c.release({ gerin: 1980, gonca: 2120 });
        c.gonca.facing = -1; c.gerin.facing = -1; c.setState(c.gerin, 'walk', { targetX: 1490 });
      },
      solution: [{ type: 'bow', x: 510, y: 640, angle: -70, power: 17 }, { type: 'hydrant', x: 600, y: 685, flip: false }, { type: 'tap', x: 673, y: 695, flip: true }, { type: 'hose', x: 698, y: 724, ex: 860, ey: 375, cx: 778, cy: 413, openAt: 70 }],
    },
    /* ================= ATO 2: EVITAR A BRIGA ================= */
    {
      act: 2, title: 'Hora do almoço',
      intro: 'Dois estômagos vazios. Um isqueiro.',
      objective: 'Ninguém briga de barriga cheia.',
      win: 'Olha só. Nem uma mordida. Em ninguém.',
      ending: { who: 'gonca', text: 'Até que enfim, humano... Já era hora.', keep: true, poses: {} },
      hint: ['Fogo anda pelo pavio. Ferro cai. O resto é peso, torrada e rampa.', 'Isqueiro acende vela. Vela acende pavio. Nada de atalho.'],
      trigger: 'light',
      // tabuleiro do tamanho da foto (1:1, sem borrar); bichos no piso, potes no piso; a bancada é só cenário: o que cai da beira dela vai pro chão
      /* tabuleiro 2400 como as outras fases: a cozinha (1264) fica no meio, deslocada por KX; dos lados, espelho escurecido, fora da área de jogo */
      sink: { x1: 215, y: 300, y1: 800 }, stove: { x0: 1185, y: 300, y1: 430 },
      fireMsg: 'Pegou fogo. O almoço, a ração e a sua reputação.',
      scene: [
        { kind: 'photo', sprite: 'bg.kitchen', x: 0, y: -464, w: 1264, mirrorLeft: 568, mirrorRight: 568, dimSides: 0.42 },
        { kind: 'wall', x: -12, y: 400, w: 24, h: 800, hidden: true }, { kind: 'wall', x: 1276, y: 400, w: 24, h: 800, hidden: true },
        // prateleirinha da vela no canto esquerdo da parede; prateleirinha alta da sardinha; saco de ração em pé na bancada
        { kind: 'prop', sprite: 'sc.shelf', x: 140, y: 189, w: 70, shadow: false },
        { kind: 'slab', x: 140, y: 172, w: 70, h: 14, hidden: true },
        { kind: 'prop', sprite: 'sc.shelf', x: 444, y: 134, w: 60, shadow: false },
        { kind: 'slab', x: 444, y: 118, w: 58, h: 14, hidden: true },
        { kind: 'slab', x: 930, y: 333, w: 120, h: 14, hidden: true },
      ],
      fixed: [{ type: 'ironhook', x: 640, y: 30, drop: 70 }, { type: 'bagrope', x: 985, y: 276, hx: 985, hy: 276, loose: true }, { type: 'sardine', x: 423, y: 93 }, { type: 'bowl', x: 770, y: 740, owner: 'gerin' }, { type: 'bowl', x: 400, y: 740, owner: 'gonca' }],
      actors: [
        { who: 'gerin', x: 1185, y: 740, state: 'hungry', facing: -1 },
        { who: 'gonca', x: 240, y: 740, state: 'hungry', facing: 1 },
      ],
      inventory: { candle: 1, lighter: 1, fuse: 1, toaster: 1, toast: 1, funnel: 1, bat: 1 },
      gerinChases: false,
      onSink(c, o) { if (o.type === 'sardine') c.say(c.gonca, 'A sardinha voltou pro mar.', 100); else if (o.type === 'bagrope') c.say(c.gerin, 'Ração molhada. Nem eu.', 100); },
      logic(c) {
        const st = c.st, t = c.state.t; if (c.state.vignette) return;
        const bowls = {}; for (const e of c.ents) if (e.type === 'bowl') bowls[e.owner] = e;
        const gB = bowls.gerin, cB = bowls.gonca;
        if (!st.fedG && gB.data.kibble >= 10) { st.fedG = t; c.say(c.gerin, 'Comida, comidaaaaa!', 50); c.gerin.facing = -1; c.setState(c.gerin, 'walk', { targetX: gB.x + 80 }); }
        if (!st.fedC && cB.data.fish) { st.fedC = t; c.say(c.gonca, 'Peixe. Finalmente.', 40); c.gonca.facing = 1; c.setState(c.gonca, 'walk', { targetX: cB.x - 112 }); }
        if (gB.data.fish && !st.wrongG) { st.wrongG = true; c.say(c.gerin, 'Peixe? Tô com cara de gato?', 90); }
        if (cB.data.kibble > 0 && !st.wrongC) { st.wrongC = true; c.say(c.gonca, 'Ração de cachorro. Pra mim.', 90); }
        if ((cB.data.toast || gB.data.toast) && !st.toastC) { st.toastC = true; c.say(c.gonca, 'Torrada. Sério.', 90); }
        // um comeu e o outro ficou olhando: vai tomar o pote
        if (st.fedG && !st.fedC && t - st.fedG > 240 && !st.raid) { st.raid = true; c.say(c.gonca, 'Divide.', 50); c.gonca.facing = 1; c.setState(c.gonca, 'walk', { targetX: gB.x - 170 }); }
        if (st.fedC && !st.fedG && t - st.fedC > 240 && !st.raid) { st.raid = true; c.say(c.gerin, 'Peixe também serve.', 50); c.gerin.facing = -1; c.setState(c.gerin, 'walk', { targetX: cB.x + 170 }); }
        if ((st.fedG || st.fedC) && !(st.fedG && st.fedC) && !st.raid) c.state.busyT = t; /* um comendo, outro olhando: ainda vai dar confusão */
        if (st.fedG && st.fedC && !st.done && t > Math.max(st.fedG, st.fedC) + 200) { st.done = true; c.win(); }
      },
      onReach(c, a) {
        const st = c.st;
        if (st.raid && ((a.who === 'gonca' && !st.fedC) || (a.who === 'gerin' && !st.fedG))) { const other = a.who === 'gonca' ? c.gerin : c.gonca; c.say(other, 'SAI.', 40); c.after(30, () => c.fight(a.body.position.x + (a.who === 'gonca' ? 60 : -60), 700, true)); return; }
        const bowls = {}; for (const e of c.ents) if (e.type === 'bowl') bowls[e.owner] = e;
        /* parada exata: focinho no meio do pote */
        if (a.who === 'gerin' && st.fedG) { c.gerin.facing = -1; Matter.Body.setPosition(a.body, { x: bowls.gerin.x + 80, y: a.body.position.y }); c.setState(c.gerin, 'eat'); }
        if (a.who === 'gonca' && st.fedC) { c.gonca.facing = 1; Matter.Body.setPosition(a.body, { x: bowls.gonca.x - 112, y: a.body.position.y }); c.setState(c.gonca, 'eat'); }
      },
      solution: [{ type: 'candle', x: 140, y: 115 }, { type: 'lighter', x: 176, y: 112, litAt: 0 }, { type: 'fuse', x: 393, y: 59, angle: 0, scale: 3.05 }, { type: 'toaster', x: 612, y: 284, flip: true }, { type: 'toast', x: 612, y: 226, inToaster: true }, { type: 'bat', x: 1010, y: 470, angle: -30, scale: 2 }, { type: 'funnel', x: 790, y: 600, angle: 0 }],
    },
  ];

  /* fase 3: a cozinha foi desenhada em coordenadas 0..1264; desloca tudo pra ficar no meio do tabuleiro de 2400 */
  (function () {
    const L = LEVELS[2], KX = 568, keys = ['x', 'hx', 'ex', 'cx'];
    const sh = o => { if (!o) return; for (const k of keys) if (typeof o[k] === 'number') o[k] += KX; };
    for (const s of L.scene) { sh(s); if (typeof s.x0 === 'number') s.x0 += KX; if (typeof s.x1 === 'number') s.x1 += KX; }
    L.fixed.forEach(sh); L.actors.forEach(sh); L.solution.forEach(sh);
    if (L.sink) L.sink.x1 += KX; if (L.stove) L.stove.x0 += KX;
    L.play = { x0: KX, x1: KX + 1264 };
  })();

  return { LEVELS, MESSAGES };
});
