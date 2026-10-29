(() => {
  const C = window.ANIVERSARIO || {};
  const nome = C.nome || 'amor';
  const idade = Number(C.idade) || 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toque = matchMedia('(pointer: coarse)').matches;
  const $ = s => document.querySelector(s);

  // ───────── textos ─────────

  const hoje = new Date();
  const preencher = (attr, texto) => document.querySelectorAll(`[${attr}]`).forEach(el => { el.textContent = texto; });
  preencher('data-nome', nome);
  preencher('data-ano', String(hoje.getFullYear()));
  preencher('data-material', C.material || 'Mármore');
  preencher('data-nota', `${idade ? `Faz ${idade} anos hoje.` : 'Aniversariante do dia.'} Acervo permanente desta casa. Não está à venda.`);
  document.title = `Uma estátua para ${nome}`;

  // A carta já nasce no lugar, letra por letra e invisível; a fada passa a tinta depois.
  const papel = $('#papel'), letras = [], fimDeParagrafo = new Set();
  function escreverEm(el, texto) {
    for (const ch of texto) {
      const s = document.createElement('span');
      s.className = 'l'; s.textContent = ch;
      el.append(s); letras.push(s);
    }
    fimDeParagrafo.add(letras.length - 1);
  }
  for (const linha of C.carta || []) {
    const p = document.createElement('p');
    $('#carta-texto').append(p);
    escreverEm(p, linha);
  }
  escreverEm($('#carta-assinatura'), C.assinatura || '');

  const DICAS = {
    ajuda: `${toque ? 'Toque' : 'Clique'} na pedra para ajudar a fada.`,
    rosto: 'Agora o rosto. Um golpe bem no meio.',
  };
  const FALAS = {
    chegou: 'Achei a pedra perfeita.',
    amarra: 'Pesadinha!',
    pronto: 'Pronto! Agora é hora de esculpir.',
    meio: 'Tem alguém linda aqui dentro…',
    ajuda: 'Isso, me ajuda!',
    calma: 'Calma! O rosto fica por último.',
    rosto: 'Agora o rosto. Com carinho.',
    fim: ['Sabia! Ela sempre esteve aqui.', 'Tem uma carta para você lá embaixo.'],
    cocegas: ['Ei! Tô trabalhando!', 'Sem cócegas!', 'Assim eu erro o nariz dela!'],
    depois: ['Ficou parecida, né?', 'Tem uma carta lá embaixo.', 'Minha melhor obra.'],
  };

  const dica = $('#dica');
  let dicaAtual = '';
  function dizer(texto, final = false) {
    if (texto === dicaAtual) return;
    dicaAtual = texto;
    dica.classList.add('troca');
    setTimeout(() => {
      dica.textContent = texto;
      dica.classList.toggle('final', final);
      dica.classList.remove('troca');
    }, reduced ? 0 : 280);
  }

  const fala = $('#fala');
  let falaFila = [], falaT = 0;
  function falar(texto) {
    const linhas = Array.isArray(texto) ? texto : [texto];
    falaFila = linhas.slice(1);
    mostrarFala(linhas[0]);
  }
  function mostrarFala(texto) {
    fala.textContent = texto;
    falaT = Math.min(5, Math.max(2.2, 1 + texto.length / 14));
    fala.classList.add('visivel');
  }

  // ───────── utilidades ─────────

  function aleatorio(seed) {
    return () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  }
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ───────── geometria da obra (unidades da obra; o canvas ocupa a largura toda) ─────────

  const W = 1000, H = 1100, CHAO = H - 4;
  const canvas = $('#pedra'), ctx = canvas.getContext('2d');

  const BUSTO = window.BUSTO;
  const rostoC = { ...BUSTO.rosto };

  const { x: bx, y: by, w: BW, h: BH } = BUSTO.pedra;

  // ───────── o busto (assets/busto.webp) ─────────

  let busto, pedraImg;
  const sombraBusto = tela(W, H), sombraCtx = sombraBusto.getContext('2d');
  const mascaraBusto = tela(W, H), mascaraCtx = mascaraBusto.getContext('2d');
  // enquanto há pedra, o busto só aparece pelos buracos dela
  const bustoDentro = tela(W, H), bustoDentroCtx = bustoDentro.getContext('2d');

  function montarEstatua() {
    const { x, y, w, h } = BUSTO;
    // desenha o busto fora do canvas para que só a sombra caia na parede
    sombraCtx.clearRect(0, 0, W, H);
    sombraCtx.save();
    sombraCtx.shadowColor = 'rgba(60,48,36,.3)';
    sombraCtx.shadowBlur = 50; sombraCtx.shadowOffsetX = W + 30; sombraCtx.shadowOffsetY = 12;
    sombraCtx.drawImage(busto, x - W, y, w, h);
    sombraCtx.restore();
    mascaraCtx.clearRect(0, 0, W, H);
    mascaraCtx.drawImage(busto, x, y, w, h);
  }

  // ───────── a pedra bruta ─────────

  const camada = tela(W, H), camadaCtx = camada.getContext('2d', { willReadFrequently: true });
  const capa = tela(W, H), capaCtx = capa.getContext('2d');
  const sombreada = tela(W, H), sombreadaCtx = sombreada.getContext('2d');

  let ancoraBorda = bx + BW, ancoraY = by + BH * .55;
  function montarPedra() {
    camadaCtx.clearRect(0, 0, W, H);
    camadaCtx.drawImage(pedraImg, bx, by, BW, BH);
    // a corda é amarrada onde a pedra realmente termina, nessa altura
    ancoraY = Math.round(by + BH * .55);
    const linha = camadaCtx.getImageData(0, ancoraY, W, 1).data;
    for (let x = W - 1; x >= 0; x--) if (linha[x * 4 + 3] > 128) { ancoraBorda = x; break; }
    bustoDentroCtx.clearRect(0, 0, W, H);
    bustoDentroCtx.drawImage(busto, BUSTO.x, BUSTO.y, BUSTO.w, BUSTO.h);
    bustoDentroCtx.globalCompositeOperation = 'destination-in';
    bustoDentroCtx.drawImage(camada, 0, 0);
    bustoDentroCtx.globalCompositeOperation = 'source-over';
  }

  // ───────── células: a pedra dividida em triângulos irregulares ─────────

  let celulas = [], lascas = [], poeira = [], faiscas = [];
  let revelada = false, pedraNoLugar = false, arrasto = 0, sujo = true, brilho = -1, ajudou = false;

  function montarCelulas() {
    const px = camadaCtx.getImageData(0, 0, W, H).data;
    const r = aleatorio(781);
    const cols = 15, rows = 21, cw = BW / cols, chh = BH / rows, pts = [];
    for (let y = 0; y <= rows; y++) {
      const linha = [];
      for (let x = 0; x <= cols; x++) linha.push({
        x: bx + x * cw + (x && x < cols ? (r() - .5) * cw * .8 : 0),
        y: by + y * chh + (y && y < rows ? (r() - .5) * chh * .8 : 0),
      });
      pts.push(linha);
    }
    const dentroRosto = (p, k) => Math.hypot((p.x - rostoC.x) / rostoC.rx, (p.y - rostoC.y) / rostoC.ry) < k;
    celulas = [];
    const add = v => {
      const x = (v[0].x + v[1].x + v[2].x) / 3, y = (v[0].y + v[1].y + v[2].y) / 3;
      const a = px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3];
      const x0 = Math.max(0, Math.floor(Math.min(v[0].x, v[1].x, v[2].x)) - 2), y0 = Math.max(0, Math.floor(Math.min(v[0].y, v[1].y, v[2].y)) - 2);
      const x1 = Math.min(W, Math.ceil(Math.max(v[0].x, v[1].x, v[2].x)) + 2), y1 = Math.min(H, Math.ceil(Math.max(v[0].y, v[1].y, v[2].y)) + 2);
      celulas.push({
        v, x, y, foi: false, visivel: a > 40,
        nucleo: dentroRosto({ x, y }, 1.15) || v.some(p => dentroRosto(p, 1)),
        caixa: { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) },
      });
    };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const a = pts[y][x], b = pts[y][x + 1], c = pts[y + 1][x], d = pts[y + 1][x + 1];
      if (r() > .5) { add([a, b, d]); add([a, d, c]); } else { add([a, b, c]); add([b, d, c]); }
    }
  }

  function tri(c, cel, folga = 0) {
    c.beginPath();
    cel.v.forEach((p, i) => {
      const dx = p.x - cel.x, dy = p.y - cel.y, l = Math.hypot(dx, dy) || 1;
      const x = p.x + dx / l * folga, y = p.y + dy / l * folga;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.closePath();
  }

  function refazerCapa() {
    capaCtx.clearRect(0, 0, W, H);
    capaCtx.drawImage(camada, 0, 0);
    capaCtx.globalCompositeOperation = 'destination-out';
    for (const cel of celulas) if (cel.foi) { tri(capaCtx, cel, .9); capaCtx.fill(); }
    capaCtx.globalCompositeOperation = 'source-over';
    sujo = true;
  }

  // A pedra que sobra projeta sombra na escultura, e cada corte deixa uma borda escura.
  function refazerSombreada() {
    const c = sombreadaCtx;
    c.clearRect(0, 0, W, H);
    c.save();
    c.shadowColor = 'rgba(50,40,30,.35)'; c.shadowBlur = 16; c.shadowOffsetX = 10; c.shadowOffsetY = 9;
    c.drawImage(capa, 0, 0);
    c.restore();
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = 'rgba(72,64,56,.55)'; c.lineWidth = 4;
    for (const cel of celulas) if (cel.foi) { tri(c, cel, .9); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
    sujo = false;
  }

  function soltar(cel, origem, forca = 1) {
    if (cel.foi) return;
    cel.foi = true;
    if (reduced || !cel.visivel) return;
    const s = tela(cel.caixa.w, cel.caixa.h), sc = s.getContext('2d');
    sc.translate(-cel.caixa.x, -cel.caixa.y);
    tri(sc, cel); sc.clip();
    sc.drawImage(camada, cel.caixa.x, cel.caixa.y, cel.caixa.w, cel.caixa.h, cel.caixa.x, cel.caixa.y, cel.caixa.w, cel.caixa.h);
    lascas.push({
      s, ox: cel.caixa.x - cel.x, oy: cel.caixa.y - cel.y,
      x: cel.x, y: cel.y, rot: 0,
      vx: ((cel.x - origem.x) * 3.2 + (Math.random() - .5) * 160) * forca,
      vy: (-180 - Math.random() * 320) * forca,
      giro: (Math.random() - .5) * 9, vida: 0, alfa: 1,
    });
    if (lascas.length > 180) lascas.shift();
    for (let i = 0; i < 4; i++) poeira.push({
      x: cel.x + (Math.random() - .5) * 20, y: cel.y + (Math.random() - .5) * 20,
      vx: (Math.random() - .5) * 140, vy: -Math.random() * 90 - 10,
      vida: 0, max: .9 + Math.random() * .9, t: 1.5 + Math.random() * 3,
    });
    if (poeira.length > 400) poeira.splice(0, poeira.length - 400);
  }

  function progressoFora() {
    let total = 0, foram = 0;
    for (const c of celulas) if (c.visivel && !c.nucleo) { total++; if (c.foi) foram++; }
    return foram / Math.max(1, total);
  }

  const LIMIAR = .7;
  const noRosto = p => Math.hypot((p.x - rostoC.x) / (rostoC.rx * 1.2), (p.y - rostoC.y) / (rostoC.ry * 1.3)) < 1;

  function golpe(p, quem = 'voce') {
    if (revelada || !pedraNoLugar) return;
    const pronto = progressoFora() >= LIMIAR;
    if (noRosto(p)) {
      if (pronto) return revelar(p);
      levantarPo(p, 14); som(.5);
      if (quem === 'voce') falar(FALAS.calma);
      return;
    }
    const novas = [];
    for (const cel of celulas) {
      if (cel.foi || cel.nucleo) continue;
      const d = quem === 'fada' ? Math.hypot((cel.x - p.x) / 140, (cel.y - p.y) / 120) : Math.hypot((cel.x - p.x) / 108, (cel.y - p.y) / 92);
      if (d < 1 || (d < 1.35 && Math.random() < .35)) { soltar(cel, p); novas.push(cel); }
    }
    if (!novas.length) return levantarPo(p, 6);
    capaCtx.globalCompositeOperation = 'destination-out';
    for (const cel of novas) { tri(capaCtx, cel, .9); capaCtx.fill(); }
    capaCtx.globalCompositeOperation = 'source-over';
    sujo = true;
    som(1);
    if (quem === 'voce') {
      navigator.vibrate?.(8);
      if (!ajudou) { ajudou = true; falar(FALAS.ajuda); }
    }
    if (progressoFora() >= LIMIAR) dizer(DICAS.rosto);
  }

  function levantarPo(p, n, forca = 1) {
    if (reduced) return;
    for (let i = 0; i < n; i++) poeira.push({
      x: p.x, y: p.y, vx: (Math.random() - .5) * 160 * forca, vy: -Math.random() * 120 * forca,
      vida: 0, max: .6 + Math.random() * .6, t: 1.5 + Math.random() * 2.5,
    });
  }

  function cintilar(p, n) {
    if (reduced) return;
    for (let i = 0; i < n; i++) faiscas.push({
      x: p.x + (Math.random() - .5) * 16, y: p.y + (Math.random() - .5) * 16,
      vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120 - 20,
      vida: 0, max: .5 + Math.random() * .6, t: 2 + Math.random() * 3,
    });
  }

  function revelar(p = { x: rostoC.x, y: rostoC.y }) {
    if (revelada) return;
    revelada = true;
    for (const cel of celulas) soltar(cel, p, 1.25);
    levantarPo(p, 90);
    cintilar(p, 30);
    refazerCapa();
    som(1.6);
    navigator.vibrate?.([10, 40, 18]);
    setTimeout(() => {
      document.body.classList.add('revelada');
      canvas.setAttribute('aria-label', `Uma estela de mármore com o retrato de ${nome}.`);
      esconderCinzel();
    }, reduced ? 0 : 450);
    if (!reduced) setTimeout(() => { brilho = 0; }, 700);
  }

  // ───────── som de cinzel (sintetizado; só depois do primeiro toque, como o navegador exige) ─────────

  let audio = null;
  addEventListener('pointerdown', () => {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* sem áudio */ }
  }, { capture: true });
  function som(forca) {
    if (!audio || audio.state !== 'running') return;
    const t = audio.currentTime;
    const dur = .09 + forca * .05;
    const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
    const fonte = audio.createBufferSource(); fonte.buffer = buf;
    const filtro = audio.createBiquadFilter(); filtro.type = 'bandpass';
    filtro.frequency.value = 2200 + Math.random() * 1800; filtro.Q.value = 1.4;
    const g = audio.createGain(); g.gain.value = .3 * Math.min(1.4, forca);
    fonte.connect(filtro).connect(g).connect(audio.destination);
    fonte.start(t);
    const osc = audio.createOscillator(), og = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t); osc.frequency.exponentialRampToValueAtTime(55, t + .1);
    og.gain.setValueAtTime(.24 * forca, t); og.gain.exponentialRampToValueAtTime(.001, t + .12 + forca * .05);
    osc.connect(og).connect(audio.destination);
    osc.start(t); osc.stop(t + .25);
  }

  // ───────── vista: a obra fica no centro, o canvas vai de ponta a ponta ─────────

  const vista = { s: 1, ox: 0, dpr: 1, w: 0, esquerda: 0, direita: W };
  function medir() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    vista.dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * vista.dpr);
    canvas.height = Math.round(r.height * vista.dpr);
    vista.s = r.height / H;
    vista.ox = (r.width - W * vista.s) / 2;
    vista.w = r.width;
    vista.esquerda = -vista.ox / vista.s;
    vista.direita = (r.width - vista.ox) / vista.s;
    desenhar();
  }
  const paraObra = e => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - vista.ox) / vista.s, y: (e.clientY - r.top) / vista.s };
  };
  const paraTela = p => ({ x: p.x * vista.s + vista.ox, y: p.y * vista.s });

  // ───────── a fada ─────────

  const F = 1.8, PONTA = { x: 27 * F, y: 15 * F };
  const fada = { x: 0, y: 0, dir: -1, t: 0, chute: 0, braco: 0, pose: 'voa', voando: false, batendo: false, visivel: false };
  const corda = { ativa: false, folga: 1, alfa: 1 };
  const corpo = (f = fada) => ({ x: f.x - PONTA.x * f.dir + f.chute * f.dir, y: f.y - PONTA.y });
  const mao = () => { const b = corpo(); return { x: b.x - 13 * F * fada.dir, y: b.y + 3 * F }; };
  const ancora = () => ({ x: ancoraBorda - 6 + arrasto, y: ancoraY });

  function virar(dir) {
    if (dir === fada.dir) return;
    fada.x += PONTA.x * 2 * dir; // o corpo fica no lugar, a ponta do cinzel troca de lado
    fada.dir = dir;
  }

  function asa(c, x, y, rx, ry, rot, bat) {
    c.save();
    c.translate(x, y); c.rotate(rot); c.scale(1, bat);
    c.beginPath(); c.ellipse(-rx, 0, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(214,232,255,.5)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.stroke();
    c.restore();
  }

  function desenharFada(c, f = fada) {
    const b = corpo(f), bob = f.batendo || reduced ? 0 : Math.sin(f.t * 4) * 3;
    c.save();
    c.translate(b.x, b.y + bob);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 70 * F);
    g.addColorStop(0, 'rgba(255,226,150,.3)'); g.addColorStop(1, 'rgba(255,226,150,0)');
    c.fillStyle = g; c.fillRect(-70 * F, -70 * F, 140 * F, 140 * F);
    c.scale(f.dir * F, F);

    const bat = reduced ? .8 : .3 + .7 * Math.abs(Math.sin(f.t * 26));
    asa(c, -6, -8, 24, 13, .7, bat);
    asa(c, -5, -1, 17, 9, -.45, bat);

    c.lineCap = 'round';
    c.strokeStyle = '#f0c9a8'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-3, 18); c.lineTo(-5, 29); c.moveTo(3, 18); c.lineTo(5, 28); c.stroke();

    const v = c.createLinearGradient(0, -6, 0, 22);
    v.addColorStop(0, '#ec9aab'); v.addColorStop(1, '#b5566c');
    c.fillStyle = v;
    c.beginPath(); c.moveTo(-5, -7); c.lineTo(5, -7); c.lineTo(12, 19); c.quadraticCurveTo(0, 23, -12, 19); c.closePath(); c.fill();

    if (f.pose === 'puxa') {
      c.strokeStyle = '#f0c9a8'; c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(-2, -3); c.lineTo(-13, 3); c.stroke();
    } else if (f.pose === 'escreve') {
      // pena: a ponta fica onde ficaria a do cinzel
      c.save();
      c.translate(3, -3); c.rotate(f.braco);
      c.strokeStyle = '#f0c9a8'; c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 7); c.stroke();
      c.fillStyle = '#fdf6f0'; c.strokeStyle = 'rgba(181,86,108,.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(24, 18); c.quadraticCurveTo(8, 2, 2, -16); c.quadraticCurveTo(16, -4, 24, 18); c.fill(); c.stroke();
      c.strokeStyle = '#2b2440'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(20, 14.5); c.lineTo(24, 18); c.stroke();
      c.restore();
    } else {
      c.save();
      c.translate(3, -3); c.rotate(f.braco);
      c.strokeStyle = '#f0c9a8'; c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 7); c.stroke();
      c.strokeStyle = '#c8a24e'; c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(10, 7); c.lineTo(24, 18); c.stroke();
      c.strokeStyle = '#fff3c4'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(20.5, 15.3); c.lineTo(24, 18); c.stroke();
      c.restore();
    }

    c.fillStyle = '#f3cfb0';
    c.beginPath(); c.arc(1, -17, 9.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2e1c14';
    for (const [x, y, r] of [[-6, -22, 6], [-1, -26, 5.5], [5, -25, 5], [-9, -16, 5], [-8, -9, 4.6], [-5, -4, 4], [8, -21, 3.5]]) {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#2a1a12';
    c.beginPath(); c.arc(5.5, -17, 1.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(232,120,140,.45)';
    c.beginPath(); c.arc(6, -12.5, 2.3, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function desenharCorda(c) {
    const m = mao(), a = ancora();
    c.save();
    c.globalAlpha = corda.alfa;
    c.strokeStyle = '#c9a46a'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(a.x, a.y);
    c.quadraticCurveTo((a.x + m.x) / 2, Math.max(a.y, m.y) + 8 + corda.folga * 60, m.x, m.y);
    c.stroke();
    c.fillStyle = '#a8844c';
    c.beginPath(); c.arc(a.x, a.y, 5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function posicionarFala() {
    if (!fada.visivel || !fala.classList.contains('visivel')) return;
    const b = paraTela(corpo()), w = fala.offsetWidth, h = fala.offsetHeight;
    const topo = canvas.offsetTop + b.y - 44 * F * vista.s - h - 10;
    const x = Math.max(8, Math.min(vista.w - w - 8, b.x - w / 2));
    fala.style.transform = `translate(${Math.round(x)}px, ${Math.round(topo)}px)`;
    fala.style.setProperty('--rabo', `${Math.max(12, Math.min(w - 12, b.x - x))}px`);
  }

  // ───────── tempo: interpolações que o roteiro espera ─────────

  let tweens = [];
  const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur, fn, res }));
  const espera = s => tween(s, () => {});
  const suave = t => t * t * (3 - 2 * t);

  function voar(alvo, dur) {
    const b = corpo();
    virar(alvo.x < b.x - 10 ? -1 : alvo.x > b.x + 10 ? 1 : fada.dir);
    const de = { x: fada.x, y: fada.y };
    const dx = alvo.x - de.x, dy = alvo.y - de.y, dist = Math.hypot(dx, dy);
    const curva = (Math.random() - .5) * .5;
    const c1 = { x: de.x + dx * .3 - dy * curva, y: de.y + dy * .3 + dx * curva - 40 };
    const c2 = { x: alvo.x - dx * .25 - dy * curva, y: alvo.y - dy * .25 + dx * curva - 30 };
    fada.voando = true;
    return tween(dur ?? .22 + Math.min(1, dist / 1400), p => {
      const t = suave(p), q = 1 - t;
      fada.x = q * q * q * de.x + 3 * q * q * t * c1.x + 3 * q * t * t * c2.x + t * t * t * alvo.x;
      fada.y = q * q * q * de.y + 3 * q * q * t * c1.y + 3 * q * t * t * c2.y + t * t * t * alvo.y;
      if (p >= 1) fada.voando = false;
    });
  }

  function bater(noImpacto) {
    fada.batendo = true;
    let foi = false;
    return tween(.28, p => {
      fada.braco = p < .5 ? -1.1 * Math.sin(p / .5 * Math.PI / 2) : p < .6 ? -1.1 * (1 - (p - .5) / .1) : 0;
      fada.chute = p < .5 ? -6 * p / .5 : p < .6 ? -6 + 12 * (p - .5) / .1 : 6 * (1 - (p - .6) / .4);
      if (p >= .6 && !foi) { foi = true; cintilar({ x: fada.x, y: fada.y }, 5); noImpacto(); }
      if (p >= 1) { fada.batendo = false; fada.braco = 0; fada.chute = 0; }
    });
  }

  // Mira onde o golpe leva mais pedra, de preferência de baixo para cima.
  function alvo() {
    const restam = celulas.filter(c => !c.foi && !c.nucleo && c.visivel);
    let melhor = null, nota = -Infinity;
    for (const c of restam) {
      let n = 0;
      for (const o of restam) if (Math.hypot((o.x - c.x) / 140, (o.y - c.y) / 120) < 1) n++;
      n += (c.y - by) / BH * 6 + Math.random() * 3;
      if (n > nota) { nota = n; melhor = c; }
    }
    return melhor && { x: melhor.x, y: melhor.y };
  }

  // ───────── roteiro: a fada traz a pedra e esculpe ─────────

  let geracao = 0;
  async function roteiro() {
    const g = ++geracao, vivo = () => g === geracao;
    pedraNoLugar = false;
    arrasto = vista.esquerda - (bx + BW) - 30;
    Object.assign(fada, { visivel: true, dir: -1, pose: 'voa', x: vista.direita + 50, y: by + 330 });
    canvas.setAttribute('aria-label', 'Uma fada arrasta um bloco de pedra até o pedestal.');

    await espera(.5); if (!vivo()) return;
    const a0 = ancora();
    const chegada = voar({ x: Math.max(a0.x, vista.esquerda) + 190, y: a0.y - 30 }, 2);
    await espera(.45); if (!vivo()) return;
    falar(FALAS.chegou);
    await chegada; if (!vivo()) return;
    virar(1);
    Object.assign(corda, { ativa: true, folga: 1, alfa: 1 });
    falar(FALAS.amarra);
    await tween(.6, p => { corda.folga = 1 - suave(p); }); if (!vivo()) return;

    // puxa aos trancos: a velocidade zera quatro vezes no caminho
    fada.pose = 'puxa';
    const d0 = arrasto, x0 = fada.x, y0 = fada.y, dist = -d0;
    let antes = 0;
    await tween(Math.min(4.4, 2.2 + dist / 900), p => {
      const u = p - Math.sin(p * Math.PI * 8) / (Math.PI * 8);
      arrasto = d0 + dist * u;
      fada.x = x0 + dist * u;
      fada.y = y0 - Math.abs(Math.sin(p * Math.PI * 4)) * 10;
      if ((u - antes) * dist > 3 && !reduced) {
        poeira.push({ x: bx + arrasto + Math.random() * 30, y: CHAO - 3, vx: -40 - Math.random() * 60, vy: -Math.random() * 50, vida: 0, max: .8, t: 2 + Math.random() * 2 });
        poeira.push({ x: bx + BW + arrasto - Math.random() * 30, y: CHAO - 3, vx: 20 + Math.random() * 40, vy: -Math.random() * 40, vida: 0, max: .7, t: 1.5 + Math.random() * 2 });
      }
      antes = u;
    }); if (!vivo()) return;

    arrasto = 0;
    pedraNoLugar = true;
    fada.pose = 'voa';
    for (let i = 0; i < 24; i++) levantarPo({ x: bx + Math.random() * BW, y: CHAO - 4 }, 1, .6);
    som(.8);
    tween(.6, p => { corda.folga = p * 1.5; corda.alfa = 1 - p; }).then(() => { corda.ativa = false; });
    falar(FALAS.pronto);
    dizer(DICAS.ajuda);
    canvas.setAttribute('aria-label', 'Um bloco de pedra. Clique ou aperte Enter para ajudar a esculpir.');
    await espera(1.2); if (!vivo()) return;

    let disseMeio = false;
    while (!revelada) {
      const prog = progressoFora();
      if (!disseMeio && prog > .35) { disseMeio = true; falar(FALAS.meio); }
      const p = prog < .8 && alvo();
      if (!p) {
        falar(FALAS.rosto);
        await voar({ x: rostoC.x, y: rostoC.y - rostoC.ry * .2 }, .9); if (!vivo()) return;
        if (revelada) break;
        await espera(.6); if (!vivo()) return;
        if (revelada) break;
        await bater(() => revelar({ x: rostoC.x, y: rostoC.y })); if (!vivo()) return;
        break;
      }
      await voar(p); if (!vivo()) return;
      if (revelada) break;
      await bater(() => golpe(p, 'fada')); if (!vivo()) return;
    }
    await espera(.9); if (!vivo()) return;
    await descansar(); if (!vivo()) return;
    irParaCarta(g);
  }

  async function irParaCarta(g) {
    const vivo = () => g === geracao && !cartaComecou;
    await espera(3.4); if (!vivo()) return;
    falar('Agora vem comigo: falta a carta.');
    await espera(2.4); if (!vivo()) return;
    await voar({ x: fada.x + 40, y: H + 180 }, 1.1); if (!vivo()) return;
    fada.visivel = false;
    papel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  async function descansar() {
    falar(FALAS.fim);
    await voar({ x: Math.min(BUSTO.x + BUSTO.w, vista.direita - 90), y: BUSTO.y + 170 }, 1.1);
    virar(-1);
  }

  function pular() {
    geracao++;
    tweens = [];
    corda.ativa = false;
    arrasto = 0;
    pedraNoLugar = true;
    fada.pose = 'voa'; fada.batendo = false; fada.braco = 0; fada.chute = 0;
    if (!fada.visivel || fada.x < vista.esquerda || fada.x > vista.direita) {
      Object.assign(fada, { visivel: true, dir: 1, x: bx - 40, y: BUSTO.y + 200 });
    }
    revelar();
    const g = geracao;
    descansar().then(() => irParaCarta(g));
  }

  // ───────── quadro a quadro ─────────

  let quadro = 0, antes = 0;
  function ligar() { if (!quadro) { antes = performance.now(); quadro = requestAnimationFrame(passo); } }
  function desligar() { cancelAnimationFrame(quadro); quadro = 0; }

  function passo(agora) {
    const dt = Math.min(.04, (agora - antes) / 1000); antes = agora;
    for (const tw of [...tweens]) {
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(p);
      if (p >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.res(); }
    }
    if (!reduced) fada.t += dt;

    for (const l of lascas) {
      l.vy += 2300 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.giro * dt; l.vida += dt;
      if (l.y > CHAO - 5) {
        l.y = CHAO - 5;
        if (Math.abs(l.vy) > 140) { l.vy *= -.26; l.vx *= .5; l.giro *= .4; }
        else { l.vy = 0; l.vx *= .82; l.giro *= .6; }
      }
      if (l.vida > 1.4) l.alfa = Math.max(0, 1 - (l.vida - 1.4) / .9);
    }
    lascas = lascas.filter(l => l.alfa > 0 && l.x > vista.esquerda - 80 && l.x < vista.direita + 80);
    for (const p of poeira) {
      p.vy += 70 * dt; p.vx *= .97; p.x += p.vx * dt; p.y += p.vy * dt; p.vida += dt;
      if (p.y > CHAO - 2) { p.y = CHAO - 2; p.vy = 0; }
    }
    poeira = poeira.filter(p => p.vida < p.max);
    if (fada.visivel && !reduced && (fada.voando || fada.pose === 'puxa') && Math.random() < .7) {
      const b = corpo();
      faiscas.push({ x: b.x - 10 * F * fada.dir + (Math.random() - .5) * 14, y: b.y + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 20, vy: 20 + Math.random() * 30, vida: 0, max: .6 + Math.random() * .5, t: 2 + Math.random() * 2.5 });
    }
    for (const f of faiscas) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vida += dt; }
    faiscas = faiscas.filter(f => f.vida < f.max);
    if (brilho >= 0) { brilho += dt / 1.9; if (brilho > 1) brilho = -1; }

    if (falaT > 0) {
      falaT -= dt;
      if (falaT <= 0) {
        if (falaFila.length) mostrarFala(falaFila.shift());
        else fala.classList.remove('visivel');
      }
    }

    desenhar();
    posicionarFala();
    quadro = requestAnimationFrame(passo);
  }

  const faixa = tela(W, H), faixaCtx = faixa.getContext('2d');
  function desenhar() {
    if (!busto) return;
    if (sujo) refazerSombreada();
    const { s, ox, dpr } = vista;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, 0);

    if (pedraNoLugar) {
      const { x: X, y: Y, w: Wb, h: Hb } = BUSTO;
      if (revelada) {
        ctx.drawImage(sombraBusto, 0, 0);
        ctx.drawImage(busto, X, Y, Wb, Hb);
      } else ctx.drawImage(bustoDentro, 0, 0);
      if (brilho >= 0) {
        const t = brilho * 1.6 - .3, x = X + Wb * t;
        faixaCtx.clearRect(0, 0, W, H);
        faixaCtx.globalCompositeOperation = 'source-over';
        faixaCtx.drawImage(mascaraBusto, 0, 0);
        faixaCtx.globalCompositeOperation = 'source-in';
        const g = faixaCtx.createLinearGradient(x - 160, Y, x + 160, Y + 220);
        g.addColorStop(0, 'rgba(255,248,230,0)'); g.addColorStop(.5, 'rgba(255,248,230,.55)'); g.addColorStop(1, 'rgba(255,248,230,0)');
        faixaCtx.fillStyle = g; faixaCtx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(faixa, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    if (!revelada) ctx.drawImage(sombreada, arrasto, 0);
    for (const l of lascas) {
      ctx.save();
      ctx.globalAlpha = l.alfa;
      ctx.translate(l.x, l.y); ctx.rotate(l.rot);
      ctx.drawImage(l.s, l.ox, l.oy);
      ctx.restore();
    }
    ctx.fillStyle = '#a89f90';
    for (const p of poeira) {
      ctx.globalAlpha = (1 - p.vida / p.max) * .75;
      ctx.fillRect(p.x, p.y, p.t, p.t);
    }
    ctx.globalAlpha = 1;
    if (corda.ativa) desenharCorda(ctx);
    if (fada.visivel) desenharFada(ctx);
    for (const f of faiscas) {
      ctx.globalAlpha = 1 - f.vida / f.max;
      ctx.fillStyle = '#c99a32';
      ctx.fillRect(f.x - f.t, f.y - .6, f.t * 2, 1.2);
      ctx.fillRect(f.x - .6, f.y - f.t, 1.2, f.t * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ───────── cinzel do visitante e cliques ─────────

  const palco = $('#palco'), cinzel = $('#cinzel');
  const CINZEL_PONTA = { x: 11, y: 53 };
  let cocegas = 0, depois = 0;
  function esconderCinzel() { cinzel.classList.remove('visivel'); }
  const sobreFada = p => fada.visivel && Math.hypot(p.x - corpo().x, p.y - corpo().y) < 34 * F;
  const sobrePedra = p => pedraNoLugar && !revelada && p.x > bx && p.x < bx + BW && p.y > by && p.y < CHAO;

  canvas.addEventListener('pointermove', e => {
    const p = paraObra(e), fadaAqui = sobreFada(p), pedraAqui = !fadaAqui && sobrePedra(p);
    const mouse = e.pointerType === 'mouse';
    canvas.style.cursor = fadaAqui ? 'pointer' : pedraAqui ? (mouse ? 'none' : 'pointer') : '';
    if (mouse && pedraAqui) {
      const r = palco.getBoundingClientRect();
      cinzel.style.transform = `translate(${e.clientX - r.left - CINZEL_PONTA.x}px, ${e.clientY - r.top - CINZEL_PONTA.y}px)`;
      cinzel.classList.add('visivel');
    } else esconderCinzel();
  });
  canvas.addEventListener('pointerleave', esconderCinzel);
  canvas.addEventListener('pointerdown', e => {
    const p = paraObra(e);
    if (sobreFada(p)) {
      if (revelada) falar(FALAS.depois[depois++ % FALAS.depois.length]);
      else falar(FALAS.cocegas[cocegas++ % FALAS.cocegas.length]);
      cintilar(corpo(), 8);
      return;
    }
    if (!sobrePedra(p)) return;
    golpe(p);
    if (e.pointerType === 'mouse') { cinzel.classList.remove('bate'); void cinzel.offsetWidth; cinzel.classList.add('bate'); }
  });
  canvas.addEventListener('keydown', e => {
    if (revelada || !pedraNoLugar || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    golpe(progressoFora() >= LIMIAR ? { x: rostoC.x, y: rostoC.y } : alvo() || { x: rostoC.x, y: rostoC.y });
  });

  $('#pular').addEventListener('click', pular);

  // ───────── carta: a fada escreve, letra por letra ─────────

  const telaCarta = $('#fada-carta'), cc = telaCarta.getContext('2d');
  // virada para a esquerda: o corpo fica sobre o papel ainda em branco, não sobre o que já foi escrito
  const fc = { x: 0, y: 0, dir: -1, t: 0, chute: 0, braco: 0, pose: 'escreve', batendo: false, visivel: false };
  let cartaComecou = false, etapa = '', proxima = 0, demora = 0, linhaTopo = -1, quadroCarta = 0, antesCarta = 0, kCarta = .6;
  const selo = $('.carta-selo'), botaoToda = $('#carta-toda');

  function medirCarta() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    telaCarta.width = Math.round(innerWidth * dpr);
    telaCarta.height = Math.round(innerHeight * dpr);
    kCarta = Math.min(.7, Math.max(.45, vista.s));
  }
  // em unidades da fada (px da tela ÷ escala), onde a ponta da pena deve estar
  const naTela = (x, y) => ({ x: x / kCarta, y: y / kCarta });
  function pontaDaPena() {
    const l = letras[Math.min(proxima, letras.length - 1)], r = l.getBoundingClientRect();
    const x = proxima === 0 ? r.left : letras[proxima - 1].getBoundingClientRect().right;
    const ref = proxima === 0 ? r : letras[proxima - 1].getBoundingClientRect();
    return naTela(x, ref.bottom - ref.height * .22);
  }
  function lugarDeDescanso() {
    const r = papel.getBoundingClientRect(), s = selo.getBoundingClientRect();
    const y = Math.min(innerHeight - 90, Math.max(110, s.top - 40));
    return innerWidth - r.right > 130 ? naTela(r.right + 40, y) : naTela(s.left - 30, s.top - 70);
  }

  function comecarCarta() {
    if (cartaComecou) return;
    cartaComecou = true;
    geracao++; // a fada da galeria sai de cena: agora ela está aqui
    fada.visivel = false;
    fala.classList.remove('visivel'); falaT = 0; falaFila = [];
    if (reduced) return mostrarCartaToda();
    medirCarta();
    const r = papel.getBoundingClientRect();
    Object.assign(fc, naTela(r.left + r.width * .6, -80), { visivel: true, braco: 0 });
    etapa = 'chegando';
    botaoToda.hidden = false;
    ligarCarta();
  }

  function mostrarCartaToda() {
    for (const l of letras) l.classList.add('v');
    proxima = letras.length;
    selo.classList.add('v');
    botaoToda.hidden = true;
    etapa = 'descansando';
  }

  function tinta() {
    const l = letras[proxima++];
    l.classList.add('v');
    const ch = l.textContent;
    demora += fimDeParagrafo.has(proxima - 1) ? .55 : /[.!?]/.test(ch) ? .32 : /[,;:]/.test(ch) ? .18 : ch === ' ' ? .02 : .032;
    // a página acompanha a pena quando ela troca de linha
    if (l.offsetTop !== linhaTopo) {
      linhaTopo = l.offsetTop;
      const r = l.getBoundingClientRect();
      if (r.bottom > innerHeight - 140) scrollBy({ top: r.bottom - innerHeight + 260, behavior: 'smooth' });
    }
  }

  function passoCarta(agora) {
    const dt = Math.min(.04, (agora - antesCarta) / 1000); antesCarta = agora;
    fc.t += dt;
    let alvo, rapidez = 5;
    if (etapa === 'chegando') {
      alvo = pontaDaPena(); rapidez = 3;
      if (Math.hypot(alvo.x - fc.x, alvo.y - fc.y) < 6) { etapa = 'escrevendo'; demora = .3; }
    } else if (etapa === 'escrevendo') {
      demora -= dt;
      while (demora <= 0 && proxima < letras.length) tinta();
      if (proxima >= letras.length) etapa = 'carimbando';
      alvo = pontaDaPena(); rapidez = 16;
      fc.braco = Math.sin(fc.t * 34) * .1;
    } else if (etapa === 'carimbando') {
      const r = selo.getBoundingClientRect();
      alvo = naTela(r.left + r.width * .5, r.top + r.height * .5); rapidez = 4;
      fc.braco = 0;
      if (Math.hypot(alvo.x - fc.x, alvo.y - fc.y) < 8) {
        selo.classList.add('v'); som(.4); botaoToda.hidden = true; etapa = 'descansando';
      }
    } else {
      alvo = lugarDeDescanso(); rapidez = 3;
    }
    fc.x += (alvo.x - fc.x) * Math.min(1, dt * rapidez);
    fc.y += (alvo.y - fc.y) * Math.min(1, dt * rapidez);

    const dpr = telaCarta.width / innerWidth;
    cc.setTransform(1, 0, 0, 1, 0, 0);
    cc.clearRect(0, 0, telaCarta.width, telaCarta.height);
    if (fc.visivel) {
      cc.setTransform(dpr * kCarta, 0, 0, dpr * kCarta, 0, 0);
      desenharFada(cc, fc);
    }
    quadroCarta = requestAnimationFrame(passoCarta);
  }
  function ligarCarta() { if (!quadroCarta && fc.visivel) { antesCarta = performance.now(); quadroCarta = requestAnimationFrame(passoCarta); } }
  function desligarCarta() { cancelAnimationFrame(quadroCarta); quadroCarta = 0; cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, telaCarta.width, telaCarta.height); }

  addEventListener('resize', () => { if (fc.visivel) medirCarta(); });
  // a escrita começa quando a carta aparece na tela, depois que a escultura ficou pronta
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return desligarCarta();
    if (revelada) comecarCarta();
    ligarCarta();
  }, { threshold: .25 }).observe(papel);
  botaoToda.addEventListener('click', mostrarCartaToda);

  $('#de-novo').addEventListener('click', () => {
    geracao++;
    tweens = [];
    revelada = false; brilho = -1; ajudou = false; lascas = []; poeira = []; faiscas = [];
    corda.ativa = false;
    fala.classList.remove('visivel'); falaT = 0; falaFila = [];
    for (const c of celulas) c.foi = false;
    refazerCapa();
    document.body.classList.remove('revelada');
    dicaAtual = ''; dica.textContent = ''; dica.classList.remove('final');
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    reduced ? pular() : roteiro();
  });

  // ───────── início ─────────

  // "Feliz aniversário" ocupa a largura da parede, em duas linhas
  const nomeGigante = $('#nome-gigante');
  function ajustarNome() {
    nomeGigante.style.fontSize = '100px';
    const w = nomeGigante.offsetWidth || 1;
    nomeGigante.style.fontSize = `${Math.min(innerWidth * .94 / w * 100, palco.clientHeight * .9 / 1.64)}px`;
    // em telas estreitas sobra parede acima da escultura: o texto vai para lá, inteiro à vista
    const livre = canvas.offsetTop + BUSTO.y * vista.s;
    if (livre > 100) {
      const alt = nomeGigante.offsetHeight;
      if (alt > livre - 16) nomeGigante.style.fontSize = `${parseFloat(nomeGigante.style.fontSize) * (livre - 16) / alt}px`;
      nomeGigante.style.top = `${livre / 2}px`;
    } else nomeGigante.style.top = '';
  }
  document.fonts?.ready.then(ajustarNome);
  new ResizeObserver(ajustarNome).observe(palco);

  function comecar() {
    montarEstatua();
    montarPedra();
    montarCelulas();
    refazerCapa();
    medir();
    ajustarNome();
    new ResizeObserver(medir).observe(canvas);
    new IntersectionObserver(([e]) => { e.isIntersecting ? ligar() : desligar(); }).observe(canvas);
    ligar();
    reduced ? pular() : roteiro();
  }

  Promise.all([BUSTO.imagem, BUSTO.pedra.imagem].map(src => new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  }))).then(([b, p]) => { busto = b; pedraImg = p; comecar(); });
})();
