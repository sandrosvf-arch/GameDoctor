/* ============================================================
   boardview_ui.js — Boardviewer nativo do Bancada PRO
   Canvas 2D (CPU, sem GPU). Renderiza dados do boardview_bridge.
   ============================================================ */
(function () {
  'use strict';

  var BV = {
    board: null, cv: null, ctx: null, W: 0, H: 0,
    s: 1, ox: 0, oy: 0,
    face: 'TOP',            // TOP | BOT | ALL
    selNet: null, selPad: null, selPart: null,
    tema: 'dark',
    foto: null, fotoOn: false, fotoAlpha: 0.65,
    espelharBot: true,
    corPlaca: 'oliva',   /* cor de preenchimento da silhueta da placa */
    casar: null,         /* {wx,wy,ws,rot,flipH,flipV} foto em coords de mundo */
    casarMode: false,    /* true = arrasto move a foto */
    casarHist: [],       /* historico para desfazer */
    /* transform por face (ferramenta de ajuste): dx/dy=mover, rot=graus,
       flip=espelhar horizontal. Aplicado sobre as coords originais. */
    faceTf: { TOP: {dx:0, dy:0, rot:0, flip:false},
              BOT: {dx:0, dy:0, rot:0, flip:false} },
    ajusteFaceMode: false,   /* ferramenta de ajuste ativa */
    ajusteFaceSel: 'TOP',    /* face selecionada para editar */
    faceMove: null,      /* 'TOP'|'BOT' quando movendo uma face */
    sepBot: 0,           /* separacao horizontal da face BOTTOM */
    sepMode: false,      /* true = arrastar separa as faces */
    aba: 'parts',
    temFaces: true
  };
  window.BV = BV;

  var TEMAS = {
    dark: { placa: '#0a1f12', borda: '#5a8a6a', txt: '#c9d6e0', txtBg: 'rgba(10,15,25,0.72)',
            padTop: 'rgba(255,112,67,.85)', padBot: 'rgba(66,165,245,.8)',
            gnd: '#ef4444', unc: '#5b6572', hl: '#00e5ff', net: '#ff1744',
            sel: '#00e676', fill: '#0d1117', pin: '#c9d1d9',
            comp: '#5a8a9a', compBot: '#4a7aa0',
            bodyTop: 'rgba(80,140,160,0.18)', bodyBot: 'rgba(60,100,160,0.18)',
            icTop: 'rgba(60,72,86,0.92)', icBot: 'rgba(48,64,92,0.92)',
            icBorda: '#6a8494', icBordaB: '#5a7aa4',
            lblTop: 'rgba(255,112,67,.9)', lblBot: 'rgba(66,165,245,.9)' },
    light:{ placa: '#cfe3c5', borda: '#4a7a5a', txt: '#1a2028', txtBg: 'rgba(255,255,255,0.75)',
            padTop: 'rgba(216,67,21,.9)', padBot: 'rgba(21,101,192,.85)',
            gnd: '#d32f2f', unc: '#9aa4af', hl: '#00838f', net: '#e10000',
            sel: '#1a7f37', fill: '#ffffff', pin: '#1f2328',
            comp: '#6a8a9a', compBot: '#6a8ab0',
            bodyTop: 'rgba(80,120,160,0.15)', bodyBot: 'rgba(60,90,140,0.15)',
            icTop: 'rgba(150,165,180,0.9)', icBot: 'rgba(140,160,190,0.9)',
            icBorda: '#5a7484', icBordaB: '#4a6494',
            lblTop: '#d84315', lblBot: '#1565c0' }
  };
  function T() { return TEMAS[BV.tema]; }

  /* ── bridge ────────────────────────────────────────────── */
  function bridge() { return window.boardviewBridge || null; }
  function status(msg) {
    var e = document.getElementById('bv-status');
    if (e) e.textContent = msg;
  }

  window.bviewInit = function () {
    BV.cv = document.getElementById('bv-canvas');
    if (!BV.cv) return;
    BV.ctx = BV.cv.getContext('2d');
    /* sem menu de contexto do Chromium (Back/Forward/Save page...) */
    var vb = document.getElementById('v-bview');
    if (vb && !vb._ctxOff) {
      vb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      vb._ctxOff = true;
    }
    try { BV.corPlaca = localStorage.getItem('bv-cor-placa') || 'oliva'; } catch (e) {}
    var btnCor = document.getElementById('bv-cor-placa');
    if (btnCor) btnCor.textContent = '🎨 ' + ({oliva:'Oliva',verde:'Verde',azul:'Azul',roxo:'Roxo',cinza:'Cinza',preto:'Preto',nenhuma:'Sem cor'}[BV.corPlaca] || 'Cor');
    if (!BV.cv.dataset.wired) { wire(); BV.cv.dataset.wired = '1'; }
    resize();
    var b = bridge();
    if (b && b.isAdmin) {
      b.isAdmin(function (adm) {
        var btn = document.getElementById('bv-casar');
        if (btn) btn.style.display = adm ? '' : 'none';
      });
    }
    if (b && b.listarRecentes) {
      b.listarRecentes(function (js) { renderRecentes(JSON.parse(js || '[]')); });
    }
    if (BV.board) draw();
  };

  function renderRecentes(lista) {
    var el = document.getElementById('bv-recentes');
    if (!el) return;
    el.innerHTML = '';
    lista.forEach(function (r) {
      var d = document.createElement('div');
      d.className = 'bv-rec';
      d.textContent = r.nome;
      d.title = r.path;
      d.onclick = function () { carregar(r.path); };
      el.appendChild(d);
    });
  }

  window.bviewAbrir = function () {
    var b = bridge();
    if (!b) { status('Bridge indisponivel.'); return; }
    status('Selecionando arquivo…');
    b.abrirEcarregar(function (js) { aplicar(JSON.parse(js)); });
  };

  function carregar(path) {
    var b = bridge();
    if (!b) return;
    status('Carregando ' + path.split('\\').pop() + '…');
    b.carregar(path, function (js) { aplicar(JSON.parse(js)); });
  }

  function aplicar(d) {
    if (!d || !d.ok) {
      if (d && d.cancelado) { status('Pronto.'); return; }
      status('Erro: ' + ((d && d.erro) || 'desconhecido'));
      return;
    }
    BV.board = d;
    BV.selNet = BV.selPad = BV.selPart = null; BV.marcados = null; /* [LOCALIZADOR_V1] */
    BV.foto = null; BV.fotoOn = false;
    BV.casarMode = false; BV.casarHist = [];
    BV.sepBot = 0; BV.sepMode = false;
    /* reset do estado de ajuste de faces + carrega o salvo (se houver) */
    BV.ajusteFaceMode = false; BV.ajusteFaceSel = 'TOP';
    BV._centerXorig = null;
    BV.faceTf = (d.ajuste_faces && d.ajuste_faces.TOP)
      ? d.ajuste_faces
      : { TOP: {dx:0,dy:0,rot:0,flip:false}, BOT: {dx:0,dy:0,rot:0,flip:false} };
    /* carrega calibracao salva (novo formato: {wx,wy,ws,rot,flipH,flipV}) */
    BV.casar = (d.calibracao && d.calibracao.ws) ? d.calibracao : null;
    /* boardviews sem separacao de faces (comum no XZZPCB): vista unica,
       sem duplicar a placa. Desabilita TOP/BOTTOM/AMBOS. */
    BV.temFaces = (d.has_sides !== false);
    if (!BV.temFaces) BV.face = 'UNI';
    else BV.face = 'ALL';  /* faces juntas por padrao (como FlexBV) para casar a foto */
    aplicarBotoesFace();
    indexar(d);
    document.getElementById('bv-arq').textContent = d.arquivo;
    var aviso = '';
    if (d.stats.pins === 0) {
      aviso = ' · ⚠ Este .pcb está CRIPTOGRAFADO (sem pinos/nets). ' +
              'Use o arquivo .bvr ou "Decrypted" da mesma placa.';
    } else if (d.warnings && d.warnings.length) {
      aviso = ' · ⚠ ' + d.warnings[0];
    }
    status(d.stats.parts + ' componentes · ' + d.stats.pins + ' pinos · ' +
           d.stats.nets + ' nets' + aviso);
    var fb = document.getElementById('bv-foto');
    if (fb) fb.style.display = d.foto ? '' : 'none';
    /* botao Schematic so aparece se a placa tem esquema associado */
    var sb = document.querySelector('#v-bview .bv-btn.sch');
    if (sb) sb.style.display = d.schematic ? '' : 'none';
    if (d.foto) {
      bridge().fotoDataUrl(d.foto, function (url) {
        if (!url) return;
        var im = new Image();
        im.onload = function () {
          BV.foto = im;
          if (!BV.casar) BV.casar = defaultCasar();
          draw();
        };
        im.src = url;
      });
    }
    /* se ha ajuste de faces salvo, aplica antes de enquadrar */
    if (temTransformFace()) aplicarAjusteFaces();
    ajustar();
    renderLista();
  }

  /* ── indices ───────────────────────────────────────────── */
  function indexar(d) {
    BV.nets = {};
    d.pins.forEach(function (p, i) {
      if (!p.n) return;
      (BV.nets[p.n] = BV.nets[p.n] || []).push(i);
    });
    BV.netNomes = Object.keys(BV.nets).sort();
    /* raio medio dos pinos (para threshold de designator) */
    BV._avgR = d.pins.length
      ? d.pins.reduce(function(s,p){return s+p.r;},0) / d.pins.length
      : 1;
    var bb = d.bbox;
    BV.w = Math.max(1, bb[2] - bb[0]);
    BV.h = Math.max(1, bb[3] - bb[1]);
    BV.centerX = d.center_x || (BV.w / 2);
    /* centros de cada face (para girar/espelhar em torno deles) */
    calcularCentrosFaces(d);
  }

  /* calcula o centro (bbox) de cada face — usado como pivo das transformacoes */
  function calcularCentrosFaces(d) {
    var fx = { TOP: [1e18, -1e18], BOT: [1e18, -1e18] };
    var fy = { TOP: [1e18, -1e18], BOT: [1e18, -1e18] };
    d.pins.forEach(function (p) {
      var s = p.s === 'BOT' ? 'BOT' : 'TOP';
      if (p.x < fx[s][0]) fx[s][0] = p.x; if (p.x > fx[s][1]) fx[s][1] = p.x;
      if (p.y < fy[s][0]) fy[s][0] = p.y; if (p.y > fy[s][1]) fy[s][1] = p.y;
    });
    BV.faceCentro = {
      TOP: { cx: (fx.TOP[0]+fx.TOP[1])/2, cy: (fy.TOP[0]+fy.TOP[1])/2 },
      BOT: { cx: (fx.BOT[0]+fx.BOT[1])/2, cy: (fy.BOT[0]+fy.BOT[1])/2 }
    };
  }

  /* aplica o transform da face a um ponto (x,y). Retorna [x',y'].
     Ordem: espelha em X em torno do centro -> rotaciona -> translada.  */
  function tfFace(x, y, side) {
    var tf = BV.faceTf[side];
    if (!tf) return [x, y];
    var c = BV.faceCentro ? BV.faceCentro[side] : { cx: 0, cy: 0 };
    var dx = x - c.cx, dy = y - c.cy;
    if (tf.flip) dx = -dx;                    /* espelha horizontal */
    if (tf.rot) {                              /* rotaciona (horario na tela) */
      var a = tf.rot * Math.PI / 180;
      var nx = dx * Math.cos(a) - dy * Math.sin(a);
      var ny = dx * Math.sin(a) + dy * Math.cos(a);
      dx = nx; dy = ny;
    }
    return [c.cx + dx + tf.dx, c.cy + dy + tf.dy];
  }

  /* algum transform de face ativo? */
  function temTransformFace() {
    var t = BV.faceTf.TOP, b = BV.faceTf.BOT;
    return t.dx || t.dy || t.rot || t.flip || b.dx || b.dy || b.rot || b.flip;
  }

  /* aplica os transforms de face RECALCULANDO as coordenadas de cada elemento
     a partir das ORIGINAIS (guardadas em _ox/_oy). Escreve em x/y para o
     render usar direto. Chamado sempre que o ajuste muda.                 */
  function aplicarAjusteFaces() {
    var d = BV.board;
    if (!d) return;
    /* guarda originais na 1a vez */
    if (!d._origSalvo) {
      d.pins.forEach(function (p) { p._ox = p.x; p._oy = p.y; });
      d.parts.forEach(function (p) {
        p._ox = p.x; p._oy = p.y;
        if (p.o) p._oo = p.o.map(function (s) { return s.slice(); });
      });
      if (d.board_outline) d._oOutline = d.board_outline.map(function (s) { return s.slice(); });
      d._origSalvo = true;
    }
    /* recalcula centros a partir das ORIGINAIS */
    calcularCentrosFacesOrig(d);
    /* [PERF_BV_V1] coords vao mudar: invalida bboxes e cache da placa */
    BV._ajRev = (BV._ajRev || 0) + 1;
    BV._bbDirty = true;
    /* aplica */
    d.pins.forEach(function (p) {
      var t = tfFace(p._ox, p._oy, p.s === 'BOT' ? 'BOT' : 'TOP');
      p.x = t[0]; p.y = t[1];
    });
    d.parts.forEach(function (p) {
      var side = p.s === 'BOT' ? 'BOT' : 'TOP';
      var t = tfFace(p._ox, p._oy, side);
      p.x = t[0]; p.y = t[1];
      if (p._oo) {
        p.o = p._oo.map(function (s) {
          var a = tfFace(s[0], s[1], side), b = tfFace(s[2], s[3], side);
          return [a[0], a[1], b[0], b[1]];
        });
      }
    });
    /* o contorno da placa: cada segmento pertence a uma face conforme o lado
       do eixo central original */
    if (d._oOutline) {
      var cx0 = BV._centerXorig != null ? BV._centerXorig : BV.centerX;
      d.board_outline = d._oOutline.map(function (s) {
        var side = ((s[0]+s[2])/2 > cx0) ? 'BOT' : 'TOP';
        var a = tfFace(s[0], s[1], side), b = tfFace(s[2], s[3], side);
        return [a[0], a[1], b[0], b[1]];
      });
    }
    /* reindexar centros/bbox visuais (nao mexe nas originais) */
    recalcBboxVisual(d);
  }

  function calcularCentrosFacesOrig(d) {
    var fx = { TOP: [1e18, -1e18], BOT: [1e18, -1e18] };
    var fy = { TOP: [1e18, -1e18], BOT: [1e18, -1e18] };
    d.pins.forEach(function (p) {
      var s = p.s === 'BOT' ? 'BOT' : 'TOP';
      if (p._ox < fx[s][0]) fx[s][0] = p._ox; if (p._ox > fx[s][1]) fx[s][1] = p._ox;
      if (p._oy < fy[s][0]) fy[s][0] = p._oy; if (p._oy > fy[s][1]) fy[s][1] = p._oy;
    });
    BV.faceCentro = {
      TOP: { cx: (fx.TOP[0]+fx.TOP[1])/2, cy: (fy.TOP[0]+fy.TOP[1])/2 },
      BOT: { cx: (fx.BOT[0]+fx.BOT[1])/2, cy: (fy.BOT[0]+fy.BOT[1])/2 }
    };
    if (BV._centerXorig == null) BV._centerXorig = BV.centerX;
  }

  function recalcBboxVisual(d) {
    var xs = [], ys = [];
    d.pins.forEach(function (p) { xs.push(p.x); ys.push(p.y); });
    (d.board_outline || []).forEach(function (s) {
      xs.push(s[0], s[2]); ys.push(s[1], s[3]);
    });
    if (xs.length) {
      d.bbox = [Math.min.apply(null, xs), Math.min.apply(null, ys),
                Math.max.apply(null, xs), Math.max.apply(null, ys)];
      BV.w = Math.max(1, d.bbox[2] - d.bbox[0]);
      BV.h = Math.max(1, d.bbox[3] - d.bbox[1]);
    }
  }

  /* ── coordenadas ───────────────────────────────────────────────────────
     O parser entrega a placa PLANA com faces ja marcadas: TOP a esquerda,
     BOTTOM a direita, nas coordenadas reais (como a foto). Entao a
     transformacao mundo->canvas e trivial: so desloca pela origem do bbox
     e inverte Y. Sem espelhar, sem dobrar — o dado ja vem no layout certo.
     Filtro de face (TOP/BOTTOM/AMBOS) so ESCONDE, nao move.              */
  function bb() { return BV.board.bbox; }
  /* mundo -> canvas. Usa as coords JA transformadas pelo ajuste de face
     (p._ax/_ay, calculadas por aplicarAjusteFaces). Separacao (sepBot)
     desloca o que esta a direita do eixo. */
  function wx(x, face, side) {
    var v = x - bb()[0];
    if (BV.sepBot && BV.centerX != null && x > BV.centerX) v += BV.sepBot;
    return v;
  }
  function wy(y, face, side) {
    return BV.h - (y - bb()[1]);
  }
  function visivel(face) {
    if (!BV.temFaces || BV.face === 'ALL') return true;
    return BV.face === face;
  }

  /* habilita/desabilita os botoes de face conforme o arquivo tenha ou nao
     separacao top/bottom */
  function aplicarBotoesFace() {
    var seg = document.querySelector('#v-bview .bv-seg');
    if (!seg) return;
    /* sincroniza destaque dos botoes com BV.face */
    seg.querySelectorAll('.bv-face').forEach(function(b){
      b.classList.toggle('on', b.dataset.f === BV.face);
    });
    seg.style.opacity = BV.temFaces ? '1' : '0.35';
    seg.style.pointerEvents = BV.temFaces ? '' : 'none';
    seg.title = BV.temFaces ? '' :
      'Este boardview nao separa top/bottom (vista unica)';
    var esp = document.getElementById('bv-espelho');
    if (esp) esp.style.display = BV.temFaces ? '' : 'none';
  }

  /* decide se um elemento deve ser PULADO (escondido) na face atual.
     'ALL' mostra tudo; TOP/BOTTOM mostra so a face correspondente. */
  function pulaFace(elemS, face) {
    if (face === 'ALL' || !BV.temFaces) return false;
    return elemS !== face;
  }

  /* ── cores de preenchimento da placa (por tema) ─────────── */
  var CORES_PLACA = {
    nenhuma: null,
    oliva:  { dark: 'rgba(60,90,45,0.55)',  light: 'rgba(180,195,140,0.85)' },
    verde:  { dark: 'rgba(20,70,40,0.6)',   light: 'rgba(150,200,160,0.85)' },
    azul:   { dark: 'rgba(30,55,90,0.6)',   light: 'rgba(155,185,220,0.85)' },
    roxo:   { dark: 'rgba(60,40,80,0.6)',   light: 'rgba(200,175,220,0.85)' },
    cinza:  { dark: 'rgba(55,60,68,0.6)',   light: 'rgba(200,205,212,0.9)' },
    preto:  { dark: 'rgba(15,18,22,0.7)',   light: 'rgba(70,75,82,0.85)' }
  };

  /* [PERF_BV_V1] pre-computa a bbox de cada componente (coords cruas).
     Antes era recalculada a CADA frame em 3 loops distintos do drawFace. */
  function _precompBB(d) {
    d.parts.forEach(function (p) {
      var xlo = 1e18, ylo = 1e18, xhi = -1e18, yhi = -1e18;
      for (var k = 0; k < p.pins.length; k++) {
        var pn = d.pins[p.pins[k]], rr = pn.r || 0;
        if (pn.x - rr < xlo) xlo = pn.x - rr;
        if (pn.y - rr < ylo) ylo = pn.y - rr;
        if (pn.x + rr > xhi) xhi = pn.x + rr;
        if (pn.y + rr > yhi) yhi = pn.y + rr;
      }
      p._bb = p.pins.length ? [xlo, ylo, xhi, yhi]
                            : [p.x || 0, p.y || 0, p.x || 0, p.y || 0];
    });
    BV._bbDirty = false;
  }

  /* [PERF_BV_V1] cache do path da placa: o encadeamento por proximidade
     (construirPathPlaca) e O(n^2) e rodava a CADA frame do pan/zoom.
     Agora vira um Path2D construido 1x por (placa, sepBot, ajuste). */
  var _placaCache = { b: null, k: null, path: null };
  function pathPlaca(outline, face) {
    var k = (BV.sepBot || 0) + '|' + (BV._ajRev || 0) + '|' + face + '|' + outline.length;
    if (_placaCache.b !== BV.board || _placaCache.k !== k) {
      var p = new Path2D();
      construirPathPlaca(p, outline, face);
      _placaCache = { b: BV.board, k: k, path: p };
    }
    return _placaCache.path;
  }

  /* constroi o Path da placa a partir dos segmentos do contorno,
     encadeando por proximidade. Tolerancia generosa para fechar mesmo
     quando os vertices nao batem exatamente (evita fill vazando). */
  function construirPathPlaca(c, outline, face) {
    var segs = outline.slice();
    var tol = Math.max(BV.w, BV.h) * 0.01;   /* tolerancia maior = fecha melhor */
    var usados = new Array(segs.length).fill(false);
    /* [PERF_BV_V1] sem beginPath: 'c' pode ser um Path2D (cache) */
    for (var start = 0; start < segs.length; start++) {
      if (usados[start]) continue;
      usados[start] = true;
      var s0 = segs[start];
      var ix = s0[0], iy = s0[1];   /* ponto inicial da cadeia */
      var px = s0[2], py = s0[3];
      c.moveTo(wx(ix, face), wy(iy, face));
      c.lineTo(wx(px, face), wy(py, face));
      var achou = true, guard = 0;
      while (achou && guard++ < segs.length + 2) {
        achou = false;
        var melhor = -1, melhorD = tol * tol, invertido = false;
        for (var j = 0; j < segs.length; j++) {
          if (usados[j]) continue;
          var sg = segs[j];
          var d1 = (sg[0]-px)*(sg[0]-px) + (sg[1]-py)*(sg[1]-py);
          var d2 = (sg[2]-px)*(sg[2]-px) + (sg[3]-py)*(sg[3]-py);
          if (d1 < melhorD) { melhorD = d1; melhor = j; invertido = false; }
          if (d2 < melhorD) { melhorD = d2; melhor = j; invertido = true; }
        }
        if (melhor >= 0) {
          var sm = segs[melhor];
          if (invertido) { px = sm[0]; py = sm[1]; }
          else { px = sm[2]; py = sm[3]; }
          usados[melhor] = true; achou = true;
          c.lineTo(wx(px, face), wy(py, face));
        }
      }
      c.closePath();   /* fecha ligando o ultimo ponto ao inicial */
    }
  }

  /* ── desenho ───────────────────────────────────────────── */
  function drawFace(face) {
    var c = BV.ctx, t = T(), d = BV.board;
    /* [PERF_BV_V1] bboxes pre-computadas (1x por placa / por ajuste) */
    if (BV._bbDirty || (d.parts.length && d.parts[0]._bb === undefined)) _precompBB(d);
    /* [PERF_BV_V1] retangulo visivel em coords de mundo para culling */
    var _cm = (BV._avgR || 1) * 4;
    var _vx0 = (-BV.ox) / BV.s - _cm, _vy0 = (-BV.oy) / BV.s - _cm;
    var _vx1 = (BV.W - BV.ox) / BV.s + _cm, _vy1 = (BV.H - BV.oy) / BV.s + _cm;

    /* ── preenchimento da placa DENTRO da silhueta (nao um quadrado) ──
       Usa o board_outline como regiao de recorte e pinta a cor escolhida.
       Sem board_outline (XZZ), pinta o bbox como fallback discreto.      */
    var corFill = CORES_PLACA[BV.corPlaca] ? CORES_PLACA[BV.corPlaca][BV.tema] : null;
    if (corFill && d.board_outline && d.board_outline.length > 8) {
      /* [PERF_BV_V1] path cacheado (Path2D) — sem reconstruir por frame */
      c.fillStyle = corFill;
      c.fill(pathPlaca(d.board_outline, face), 'evenodd');
    } else if (corFill) {
      c.fillStyle = corFill;
      c.fillRect(0, 0, BV.w, BV.h);
    }

    /* foto em espaco de mundo: se tem calibracao usa BV.casar; senao
       inicializa lazily com defaultCasar(). A foto se move junto com o
       boardview (pan/zoom) pois ambos estao no mesmo espaco de mundo.
       Em modo Casar, o mouse arrasta so a foto (ver wire()). */
    if (BV.fotoOn && BV.foto) {
      if (!BV.casar) BV.casar = defaultCasar();
      var ca = BV.casar, im = BV.foto, b = BV.board.bbox;
      /* centro da foto em coords de mundo-canvas (Y invertido) */
      var pcx = ca.wx - b[0];
      var pcy = BV.h - (ca.wy - b[1]);
      c.save();
      c.globalAlpha = BV.fotoAlpha;
      c.translate(pcx, pcy);
      c.rotate((ca.rot || 0) * Math.PI / 180);
      c.scale(ca.ws * (ca.sx || 1) * (ca.flipH ? -1 : 1),
              ca.ws * (ca.sy || 1) * (ca.flipV ? -1 : 1));
      c.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
      /* moldura vermelha piscante em modo Casar */
      if (BV.casarMode) {
        c.strokeStyle = 'rgba(255,50,50,.8)';
        c.lineWidth = 4 / ca.ws;
        c.strokeRect(-im.naturalWidth/2, -im.naturalHeight/2, im.naturalWidth, im.naturalHeight);
      }
      c.globalAlpha = 1; c.restore();
    }

    /* (rotulos TOP/BOTTOM removidos da tela a pedido) */


    /* ── contorno da PLACA (BVR: OUTLINE_SEGMENTED) — sempre absoluto ── */
    if (d.board_outline && d.board_outline.length) {
      c.strokeStyle = face === 'TOP' ? 'rgba(120,210,140,0.85)' : 'rgba(110,175,235,0.85)';
      c.lineWidth = 1.6 / BV.s;
      c.beginPath();
      d.board_outline.forEach(function (s) {
        c.moveTo(wx(s[0], face), wy(s[1], face));
        c.lineTo(wx(s[2], face), wy(s[3], face));
      });
      c.stroke();
    }

    /* ── silhuetas dos componentes (estilo FlexBV) ──────────────────────
       BVR: 'o' = segmentos [x1,y1,x2,y2]; 'oa'=true -> ja absoluto (nao
       somar centro), senao relativo ao PART_ORIGIN (p.x,p.y).
       XZZ: sem outline -> bounding rect dos pinos.                       */
    d.parts.forEach(function (p, i) {
      if (pulaFace(p.s, face) || !p.pins.length) return;
      var sel = (i === BV.selPart);
      var nPins = p.pins.length;
      var ehIC = nPins > 4;   /* ICs ganham corpo colorido; discretos so contorno */

      /* [PERF_BV_V1] bbox pre-computada (era recalculada por frame) */
      var bbp = p._bb || [p.x, p.y, p.x, p.y];
      var xlo = bbp[0], ylo = bbp[1], xhi = bbp[2], yhi = bbp[3];
      var pad = (BV._avgR||1) * 0.8;
      xlo-=pad; ylo-=pad; xhi+=pad; yhi+=pad;
      /* culling: componente inteiro fora da tela nao desenha */
      if (wx(xhi, face) < _vx0 || wx(xlo, face) > _vx1 ||
          wy(ylo, face) < _vy0 || wy(yhi, face) > _vy1) return;

      /* corpo do IC: retangulo preenchido (estilo FlexBV) */
      if (ehIC) {
        var bx = wx(xlo, face), byT = wy(yhi, face);
        var bw = xhi - xlo, bh = yhi - ylo;
        /* cor do corpo por face — cinza-escuro como no FlexBV */
        c.fillStyle = face === 'TOP' ? t.icTop : t.icBot;
        c.fillRect(bx, byT, bw, bh);
      }

      /* contorno do componente: usa outline real (BVR) se houver, senao bbox */
      c.strokeStyle = sel ? t.sel : (ehIC ? (face==='TOP'?t.icBorda:t.icBordaB)
                                          : (face==='TOP'?t.comp:t.compBot));
      c.lineWidth = (sel ? 2.2 : (ehIC ? 1.0 : 0.7)) / BV.s;
      if (p.o && p.o.length) {
        var ax = p.oa ? 0 : p.x, ay = p.oa ? 0 : p.y;
        c.beginPath();
        p.o.forEach(function (sg) {
          c.moveTo(wx(ax + sg[0], face), wy(ay + sg[1], face));
          c.lineTo(wx(ax + sg[2], face), wy(ay + sg[3], face));
        });
        c.stroke();
      } else {
        c.strokeRect(wx(xlo, face), wy(yhi, face), xhi-xlo, yhi-ylo);
      }
    });

    /* ── traces internos do XZZ (segmentos soltos) ── */
    if (d.segments && d.segments.length) {
      c.strokeStyle = face === 'TOP' ? t.comp : t.compBot;
      c.lineWidth = 0.5 / BV.s;
      c.beginPath();
      d.segments.forEach(function (s) {
        if (pulaFace(s.s, face)) return;
        var ax1 = wx(s.a[0], face), ay1 = wy(s.a[1], face);
        var bx1 = wx(s.b[0], face), by1 = wy(s.b[1], face);
        /* [PERF_BV_V1] culling de segmento */
        if ((ax1 < _vx0 && bx1 < _vx0) || (ax1 > _vx1 && bx1 > _vx1) ||
            (ay1 < _vy0 && by1 < _vy0) || (ay1 > _vy1 && by1 > _vy1)) return;
        c.moveTo(ax1, ay1);
        c.lineTo(bx1, by1);
      });
      c.stroke();
    }

    /* ── estrela de net (DrawNetWeb do OpenBoardView): do pad ancora traca
       uma linha para CADA outro pino da mesma net. Pula GND (hairball).
       Pinos na face oculta ganham circulo. Desenha no espaco plano. */
    if (BV.selNet && BV.nets[BV.selNet] && BV.selNet !== 'GND') {
      var idxs = BV.nets[BV.selNet];
      var anc = (BV.selPad != null) ? BV.selPad : idxs[0];
      var pa = d.pins[anc];
      if (pa && visivel(pa.s)) {
        var ax = wx(pa.x), ay = wy(pa.y);
        c.strokeStyle = t.net; c.lineWidth = 1.4 / BV.s;
        c.beginPath();
        idxs.forEach(function (j) {
          if (j === anc) return;
          var pb = d.pins[j];
          if (!visivel(pb.s)) return;
          c.moveTo(ax, ay);
          c.lineTo(wx(pb.x), wy(pb.y));
        });
        c.stroke();
      }
    }

    /* ── highlight do COMPONENTE selecionado ou dos comps ligados a net ──
       Ao clicar numa net, os componentes que tocam nela acendem em amarelo. */
    var compsHL = {};
    if (BV.selNet && BV.nets[BV.selNet]) {
      BV.nets[BV.selNet].forEach(function (j) {
        var cp = d.pins[j].c;
        if (cp != null) compsHL[cp] = true;
      });
    }
    if (Object.keys(compsHL).length || BV.selPart != null) {
      d.parts.forEach(function (p, i) {
        if (pulaFace(p.s, face) || !p.pins.length) return;
        var isSel = (i === BV.selPart);
        var isHL = compsHL[i];
        if (!isSel && !isHL) return;
        /* [PERF_BV_V1] bbox pre-computada */
        var bbp = p._bb || [p.x, p.y, p.x, p.y];
        var xlo = bbp[0], ylo = bbp[1], xhi = bbp[2], yhi = bbp[3];
        var pad2 = (BV._avgR||1)*1.5;
        var bx=wx(xlo-pad2,face),by=wy(yhi+pad2,face);
        var bw=(xhi-xlo+2*pad2),bh=(yhi-ylo+2*pad2);
        c.fillStyle = isSel ? 'rgba(0,230,118,0.28)' : 'rgba(255,214,0,0.30)';
        c.fillRect(bx,by,bw,bh);
        c.strokeStyle = isSel ? '#00e676' : '#ffd600';
        c.lineWidth = 2/BV.s;
        c.strokeRect(bx,by,bw,bh);
      });
    }

    /* ── [LOCALIZADOR_V1] marcadores piscantes do Localizador ─────────
       Circulo amarelo pulsando sobre CADA componente que a busca achou,
       para o tecnico enxergar na hora em vez de caçar designador.     */
    if (BV.marcados) {
      var _mf = ((Date.now() - (BV._marcaT0 || 0)) % 1000) / 1000;
      var _ma = 0.35 + 0.55 * Math.abs(Math.sin(_mf * Math.PI));
      var _mpad = (BV._avgR || 1) * 2.2;
      d.parts.forEach(function (mp, mi) {
        if (!BV.marcados[mi]) return;
        if (pulaFace(mp.s, face) || !mp.pins.length) return;
        var mb = mp._bb || [mp.x, mp.y, mp.x, mp.y];
        var mcx = wx((mb[0] + mb[2]) / 2, face), mcy = wy((mb[1] + mb[3]) / 2, face);
        var mr = Math.max(mb[2] - mb[0], mb[3] - mb[1]) / 2 + _mpad;
        if (mr * BV.s < 11) mr = 11 / BV.s;      /* nunca some no zoom out */
        c.beginPath(); c.arc(mcx, mcy, mr, 0, 7);
        c.fillStyle = 'rgba(255,214,0,' + (_ma * 0.22) + ')'; c.fill();
        c.strokeStyle = 'rgba(255,214,0,' + _ma + ')';
        c.lineWidth = 2.4 / BV.s; c.stroke();
        c.beginPath(); c.arc(mcx, mcy, mr * (1 + 0.55 * _mf), 0, 7);
        c.strokeStyle = 'rgba(255,214,0,' + (0.45 * (1 - _mf)) + ')';
        c.lineWidth = 1.6 / BV.s; c.stroke();
      });
    }

    /* ── pads com FORMA REAL (PIN_OUTLINE do BVR) ────────────────────────
       BVR: 'sh' = poligono do pad (retangular/quadrado/redondo/longo).
       XZZ / sem shape: circulo pelo raio.                                */
    var detalhe = (BV._avgR || 1) * BV.s > 8;    // texto no pad bem mais cedo (FlexBV)
    d.pins.forEach(function (p, i) {
      if (pulaFace(p.s, face)) return;
      var x = wx(p.x, face), y = wy(p.y, face), r = Math.max(p.r, 1);
      /* [PERF_BV_V1] culling: pino fora da tela nao desenha */
      if (x + r < _vx0 || x - r > _vx1 || y + r < _vy0 || y - r > _vy1) return;
      var hl = BV.selNet && p.n === BV.selNet;
      var cor = hl ? t.hl : (!p.n ? t.unc : (p.n === 'GND' ? t.gnd :
                (p.s === 'TOP' ? t.padTop : t.padBot)));

      /* forma do pad */
      function tracaForma() {
        if (p.sh && p.sh.length >= 3) {
          /* poligono real; espelha X quando a face esta espelhada */
          var mirror = (p.s === 'BOT' && BV.espelharBot) ? -1 : 1;
          c.beginPath();
          for (var k = 0; k < p.sh.length; k++) {
            var px = wx(p.x + mirror*p.sh[k][0], p.s);
            var py = wy(p.y + p.sh[k][1], p.s);
            if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.closePath();
        } else {
          c.beginPath(); c.arc(x, y, r, 0, 7);
        }
      }

      if (!detalhe || r * BV.s < 9) {
        /* [PERF_BV_V1] LOD: pad menor que ~1.6px de tela vira retangulo */
        if (r * BV.s < 1.6) {
          c.fillStyle = cor;
          c.fillRect(x - r, y - r, r + r, r + r);
          if (hl) {
            c.strokeStyle = t.net; c.lineWidth = 2 / BV.s;
            c.strokeRect(x - r, y - r, r + r, r + r);
          }
          return;
        }
        c.fillStyle = cor;
        tracaForma(); c.fill();
        /* furo nos pads passantes (TH) */
        if (p.th) {
          c.fillStyle = t.fill;
          c.beginPath(); c.arc(x, y, r*0.45, 0, 7); c.fill();
        }
        if (hl) {
          c.strokeStyle = t.net; c.lineWidth = 2/BV.s;
          tracaForma(); c.stroke();
        }
        return;
      }
      /* modo detalhado: forma preenchida clara + pino/net dentro */
      tracaForma();
      c.fillStyle = hl ? cor : t.fill; c.fill();
      c.strokeStyle = cor; c.lineWidth = 1/BV.s; c.stroke();
      c.textAlign = 'center';
      c.fillStyle = hl ? t.fill : t.pin;
      c.font = 'bold ' + (r*0.5) + 'px Consolas,monospace';
      c.fillText(p.p || '', x, y - r*0.06);
      var nome = p.n || 'NC';
      var fs = p.n ? r*0.38 : r*0.3;
      if (nome.length > 6) fs *= 6/nome.length;
      c.font = fs + 'px Consolas,monospace';
      c.fillStyle = hl ? t.fill : (!p.n ? t.unc : (p.n === 'GND' ? t.gnd : t.txt));
      c.fillText(nome, x, y + r*0.52);
    });

    /* ── designators legiveis: fundo semi-transparente + tamanho minimo ──
       Aparece quando o corpo do CI ocupa espaco suficiente; ICs>4 pinos
       aparecem cedo. Texto tem fundo (txtBg) para legibilidade sobre pads. */
    d.parts.forEach(function (p) {
      if (pulaFace(p.s, face) || !p.pins.length) return;
      var nPins = p.pins.length;
      /* bbox REAL do componente na tela (igual FlexBV). A heuristica
         antiga usava a MEDIA GLOBAL de raio de pad: numa placa cheia de
         BGA a media e minuscula e escondia os labels ate zoom extremo. */
      /* [PERF_BV_V1] bbox pre-computada + culling */
      var bbp = p._bb || [p.x, p.y, p.x, p.y];
      var xlo = wx(bbp[0], p.s), xhi = wx(bbp[2], p.s);
      var ylo = wy(bbp[3], p.s), yhi = wy(bbp[1], p.s);
      if (yhi < _vy0 || ylo > _vy1 || xhi < _vx0 || xlo > _vx1) return;
      var maxPx = Math.max(xhi - xlo, yhi - ylo) * BV.s;
      if (maxPx < 12) return;   /* so esconde quando seria ilegivel mesmo */
      var cx = (xlo + xhi) / 2, cy = (ylo + yhi) / 2;
      /* fonte com piso legivel: nunca menor que ~9px na tela */
      var fsPx = Math.max(9, Math.min(maxPx * 0.3, 22));
      var fs = fsPx / BV.s;
      c.font = 'bold ' + fs + 'px Consolas,monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var tw = c.measureText(p.ref).width;
      /* fundo do label */
      c.fillStyle = t.txtBg;
      c.fillRect(cx - tw/2 - 2/BV.s, cy - fs*0.6, tw + 4/BV.s, fs*1.2);
      c.fillStyle = t.txt;
      c.fillText(p.ref, cx, cy);
      c.textBaseline = 'alphabetic';
    });
  }

  /* [PERF_BV_V1] desenho real (sincrono) */
  function _drawNow() {
    if (!BV.ctx) return;
    var c = BV.ctx;
    c.clearRect(0, 0, BV.W, BV.H);
    if (!BV.board) return;
    c.save();
    c.translate(BV.ox, BV.oy); c.scale(BV.s, BV.s);
    /* placa plana: desenha UMA vez; o filtro de face esconde o que nao
       deve aparecer. Sem offset, sem desenhar duas vezes. */
    drawFace(BV.face === 'ALL' ? 'ALL' : BV.face);
    c.restore();
    var z = document.getElementById('bv-zoom');
    if (z) z.textContent = Math.round(BV.s * 100 / BV.zBase) + '%';
  }
  /* [PERF_BV_V1] agendador: coalesce todo pedido de redesenho em 1 unico
     draw por frame de tela (rAF). mousemove a 500-1000Hz virava 500-1000
     redesenhos completos por segundo; agora no maximo ~60. */
  var _drawPend = false;
  function draw() {
    if (_drawPend) return;
    _drawPend = true;
    requestAnimationFrame(function () { _drawPend = false; _drawNow(); });
  }
  BV.draw = draw;
  /* exposto para a galeria: injeta um board ja carregado pelo bridge */
  BV.aplicarCarga = function (d) { aplicar(d); };

  /* ── modo DEDICADO (aberto de uma galeria de console) ───────────────────
     Esconde "Abrir boardview" e "Recentes" — o viewer mostra so aquela placa.
     GENERICO: qualquer ferramenta futura pode ativar/desativar por classe.  */
  window.mostrarViewerDedicado = function (consoleNome, placaNome) {
    /* [PERF_LAZY_V1] a view pode estar desmontada do DOM — remonta antes */
    if (window.lazyMount) window.lazyMount('v-bview');
    var v = document.getElementById('v-bview');
    if (!v) return;
    v.classList.add('bv-dedicado');
    var btnAbrir = document.getElementById('bv-btn-abrir');
    if (btnAbrir) btnAbrir.style.display = 'none';
    var recWrap = document.getElementById('bv-recentes-wrap');
    if (recWrap) recWrap.style.display = 'none';
    var arq = document.getElementById('bv-arq');
    if (arq && placaNome) arq.textContent = placaNome;
    /* botao voltar para a galeria do console */
    var volt = document.getElementById('bv-voltar-galeria');
    if (volt) {
      volt.style.display = '';
      volt.onclick = function () { window.abrirGaleriaConsole(consoleNome); };
    }
    /* mostra a view do viewer (esconde a galeria) */
    var gal = document.getElementById('v-bview-galeria');
    if (gal) gal.style.display = 'none';
    v.style.display = 'flex';
    if (typeof bviewInit === 'function') bviewInit();
  };

  window.sairModoDedicado = function () {
    var v = document.getElementById('v-bview');
    if (!v) return;
    v.classList.remove('bv-dedicado');
    var btnAbrir = document.getElementById('bv-btn-abrir');
    if (btnAbrir) btnAbrir.style.display = '';
    var recWrap = document.getElementById('bv-recentes-wrap');
    if (recWrap) recWrap.style.display = '';
    var volt = document.getElementById('bv-voltar-galeria');
    if (volt) volt.style.display = 'none';
  };

  function resize() {
    var w = BV.cv.parentElement;
    BV.W = BV.cv.width = w.clientWidth;
    BV.H = BV.cv.height = w.clientHeight;
    draw();
  }
  window.addEventListener('resize', function () { if (BV.cv) resize(); });

  function ajustar() {
    if (!BV.board) return;
    /* placa e sempre plana (largura completa). Em TOP/BOTTOM sozinho o
       enquadramento ainda usa a largura toda para nao "pular" ao trocar. */
    var larg = BV.w, alt = BV.h;
    BV.s = Math.min(BV.W / (larg * 1.06), BV.H / (alt * 1.10));
    BV.zBase = BV.s;
    BV.ox = (BV.W - larg * BV.s) / 2;
    BV.oy = (BV.H - alt * BV.s) / 2;
    draw();
  }
  BV.ajustar = ajustar;

  /* ── selecao ───────────────────────────────────────────── */
  function selNet(nome, padIdx) {
    BV.selNet = nome || null;
    BV.selPad = (padIdx != null) ? padIdx : null;
    BV.selPart = null;
    if (!BV._noProbe) probeSch(nome);
    var e = document.getElementById('bv-net');
    if (e) e.textContent = nome || '—';
    if (BV.atualizarNetSelecionada) BV.atualizarNetSelecionada();
    renderLista(); draw();
  }
  function selPart(i) {
    BV.selPart = i; BV.selNet = null; BV.selPad = null;
    var p = BV.board.parts[i];
    if (p && !BV._noProbe) probeSch(p.ref);
    if (p && p.pins.length) {
      BV.ox = BV.W / 2 - wx(p.x, p.s) * BV.s;
      BV.oy = BV.H / 2 - wy(p.y, p.s) * BV.s;
    }
    var e = document.getElementById('bv-net');
    if (e) e.textContent = '—';
    if (BV.atualizarNetSelecionada) BV.atualizarNetSelecionada();
    /* rola a lista de componentes ate o selecionado */
    scrollListaAtePart(i);
    renderLista(); draw();
  }

  /* rola a lista lateral ate o componente selecionado ficar visivel */
  function scrollListaAtePart(i) {
    if (BV.aba !== 'parts') return;
    setTimeout(function () {
      var lista = document.getElementById('bv-lista');
      var el = lista && lista.querySelector('.bv-it[data-p="' + i + '"]');
      if (!el || !lista) return;
      /* rola SO o container da lista (nao a pagina): centraliza o item */
      var alvo = el.offsetTop - lista.clientHeight / 2 + el.clientHeight / 2;
      lista.scrollTop = Math.max(0, alvo);
    }, 30);
  }
  BV.selNet = selNet;

  function hit(ev) {
    var r = BV.cv.getBoundingClientRect();
    var mx = (ev.clientX - r.left - BV.ox) / BV.s;
    var my = (ev.clientY - r.top - BV.oy) / BV.s;
    var best = -1, bd = 1e18;
    BV.board.pins.forEach(function (p, i) {
      if (!visivel(p.s)) return;
      var dx = wx(p.x, p.s) - mx, dy = wy(p.y, p.s) - my;
      var d2 = dx * dx + dy * dy;
      var lim = Math.max(p.r + 2 / BV.s, 6 / BV.s);
      if (d2 < lim * lim && d2 < bd) { bd = d2; best = i; }
    });
    return best;
  }

  /* hit-test de COMPONENTE: menor bbox (dos pinos) que contem o ponto.
     Usado quando o clique nao acerta nenhum pad â€” clicar no corpo do
     componente seleciona o componente (igual FlexBV). */
  function hitPart(ev) {
    var r = BV.cv.getBoundingClientRect();
    var mx = (ev.clientX - r.left - BV.ox) / BV.s;
    var my = (ev.clientY - r.top - BV.oy) / BV.s;
    var d = BV.board, best = -1, bArea = 1e30, mg = 3 / BV.s;
    for (var pi = 0; pi < d.parts.length; pi++) {
      var p = d.parts[pi];
      if (!p.pins.length || pulaFace(p.s, BV.face)) continue;
      var xlo = 1e18, ylo = 1e18, xhi = -1e18, yhi = -1e18;
      for (var k = 0; k < p.pins.length; k++) {
        var pn = d.pins[p.pins[k]];
        var px = wx(pn.x, pn.s), py = wy(pn.y, pn.s), rr = pn.r || 0;
        if (px - rr < xlo) xlo = px - rr; if (py - rr < ylo) ylo = py - rr;
        if (px + rr > xhi) xhi = px + rr; if (py + rr > yhi) yhi = py + rr;
      }
      if (mx < xlo - mg || mx > xhi + mg || my < ylo - mg || my > yhi + mg) continue;
      var area = (xhi - xlo) * (yhi - ylo);
      if (area < bArea) { bArea = area; best = pi; }
    }
    return best;
  }

  /* ── interacao ─────────────────────────────────────────── */
  function wire() {
    var cv = BV.cv, arrasto = null, moveu = false;

    /* ESC desmarca a net/componente selecionado (so quando a view esta ativa) */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var v = document.getElementById('v-bview');
      if (!v || v.style.display === 'none') return;
      if (BV.casarMode) return;   /* ESC no modo Casar e tratado la */
      if (BV.selNet || BV.selPart != null) {
        window.bviewDesmarcar();
        e.preventDefault();
      }
    });

    cv.addEventListener('mousedown', function (e) {
      moveu = false;
      if (BV.ajusteFaceMode) {
        /* ferramenta de ajuste: arrastar MOVE a face selecionada */
        var tf = BV.faceTf[BV.ajusteFaceSel];
        arrasto = { x: e.clientX, y: e.clientY,
                    dx0: tf.dx, dy0: tf.dy, ajFace: true };
      } else if (BV.sepMode) {
        /* modo separar faces: arrastar ajusta a separacao suavemente */
        arrasto = { x: e.clientX, sep0: BV.sepBot || 0, sepFace: true };
      } else if (BV.casarMode && BV.casar) {
        /* modo Casar: arrastar move a FOTO no espaco de mundo */
        arrasto = { x: e.clientX, y: e.clientY,
                    wx0: BV.casar.wx, wy0: BV.casar.wy, foto: true };
      } else {
        arrasto = { x: e.clientX, y: e.clientY, ox: BV.ox, oy: BV.oy };
      }
      cv.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function (e) {
      if (!arrasto) return;
      moveu = true;
      if (arrasto.ajFace) {
        /* move a face selecionada: delta tela -> delta mundo (Y invertido) */
        var tf = BV.faceTf[BV.ajusteFaceSel];
        tf.dx = arrasto.dx0 + (e.clientX - arrasto.x) / BV.s;
        tf.dy = arrasto.dy0 - (e.clientY - arrasto.y) / BV.s;
        aplicarAjusteFaces();
        draw();
      } else if (arrasto.sepFace) {
        /* delta em pixels de tela -> delta em coords de mundo (÷ escala) */
        var d = (e.clientX - arrasto.x) / BV.s;
        BV.sepBot = Math.max(0, arrasto.sep0 + d);
        draw();
      } else if (arrasto.foto && BV.casarMode && BV.casar) {
        /* move foto: delta canvas -> delta mundo (Y invertido) */
        BV.casar.wx = arrasto.wx0 + (e.clientX - arrasto.x) / BV.s;
        BV.casar.wy = arrasto.wy0 - (e.clientY - arrasto.y) / BV.s;
      } else {
        BV.ox = arrasto.ox + e.clientX - arrasto.x;
        BV.oy = arrasto.oy + e.clientY - arrasto.y;
      }
      draw();
    });
    window.addEventListener('mouseup', function () {
      if (arrasto && arrasto.foto) pushCasarHist();
      arrasto = null;
      if (BV.cv) BV.cv.style.cursor = BV.sepMode ? 'ew-resize' : (BV.casarMode ? 'move' : 'grab');
    });
    cv.addEventListener('click', function (e) {
      if (moveu || !BV.board) return;
      var i = hit(e);
      if (i >= 0) {
        var p = BV.board.pins[i];
        if (p.n) selNet(p.n, i);
        else if (p.c != null) selPart(p.c);
        return;
      }
      /* nao acertou pad: clicou no corpo? seleciona o COMPONENTE */
      var pi = hitPart(e);
      if (pi >= 0) selPart(pi);
    });
    cv.addEventListener('dblclick', function (e) {
      if (!BV.board) return;
      var i = hit(e);
      if (i >= 0 && BV.board.pins[i].n) {
        selNet(BV.board.pins[i].n, i);
        enviarSchematic(BV.board.pins[i].n);
      }
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (!BV.board) return;
      if (BV.casarMode && BV.casar) {
        /* scroll escala APENAS a foto; boardview nao se move */
        pushCasarHist();
        BV.casar.ws *= (e.deltaY < 0 ? 1.05 : 1 / 1.05);
        draw(); return;
      }
      var f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      var r = cv.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var ax = (mx - BV.ox) / BV.s, ay = (my - BV.oy) / BV.s;
      BV.s = Math.min(Math.max(BV.s * f, BV.zBase * 0.3), BV.zBase * 260);
      BV.ox = mx - ax * BV.s; BV.oy = my - ay * BV.s;
      draw();
    }, { passive: false });

    /* toolbar */
    document.querySelectorAll('#v-bview .bv-face').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('#v-bview .bv-face')
          .forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        BV.face = b.dataset.f;
        ajustar();
      };
    });
    var q = document.getElementById('bv-busca');
    if (q) q.onkeydown = function (e) {
      if (e.key !== 'Enter' || !BV.board) return;
      buscar(e.target.value.trim().toUpperCase());
    };
    var flt = document.getElementById('bv-filtro');
    if (flt) flt.oninput = renderLista;
    var tp = document.getElementById('bv-tab-p'), tn = document.getElementById('bv-tab-n');
    if (tp) tp.onclick = function () { BV.aba = 'parts'; tp.classList.add('on'); tn.classList.remove('on'); renderLista(); };
    if (tn) tn.onclick = function () { BV.aba = 'nets'; tn.classList.add('on'); tp.classList.remove('on'); renderLista(); };
  }

  function buscar(t) {
    if (!t) return;
    var d = BV.board;
    for (var i = 0; i < d.parts.length; i++) {
      if (d.parts[i].ref.toUpperCase() === t) { selPart(i); return; }
    }
    for (i = 0; i < d.parts.length; i++) {
      if (d.parts[i].ref.toUpperCase().indexOf(t) === 0) { selPart(i); return; }
    }
    var n = BV.netNomes.filter(function (x) { return x.toUpperCase() === t; })[0] ||
            BV.netNomes.filter(function (x) { return x.toUpperCase().indexOf(t) >= 0; })[0];
    if (n) selNet(n);
    else status('Nada encontrado para "' + t + '".');
  }

  /* ── comandos da toolbar ───────────────────────────────── */
  window.bviewAjustar = ajustar;

  /* modo separar faces: liga/desliga o arrasto que afasta as faces */
  window.bviewModoSeparar = function () {
    if (!BV.board) return;
    BV.sepMode = !BV.sepMode;
    if (BV.casarMode) { BV.casarMode = false; if (BV.atualizarUIcasar) BV.atualizarUIcasar(); }
    var b = document.getElementById('bv-separar');
    if (b) b.classList.toggle('on', BV.sepMode);
    BV.cv.style.cursor = BV.sepMode ? 'ew-resize' : 'grab';
    status(BV.sepMode
      ? 'MODO SEPARAR: arraste na tela para afastar/aproximar as faces. Clique de novo para sair.'
      : 'Pronto.');
    draw();
  };

  /* ── FERRAMENTA DE AJUSTE DE FACES ──────────────────────────────────────
     Move/gira/espelha TOP e BOTTOM independente. Cuidado: no espelhar, os
     LABELS nao invertem (o texto e sempre desenhado na horizontal normal). */
  window.bviewAjusteFaces = function () {
    if (!BV.board) return;
    BV.ajusteFaceMode = !BV.ajusteFaceMode;
    /* sai dos outros modos */
    BV.sepMode = false; BV.casarMode = false;
    if (BV.atualizarUIcasar) BV.atualizarUIcasar();
    var b = document.getElementById('bv-ajuste-faces');
    if (b) b.classList.toggle('on', BV.ajusteFaceMode);
    var painel = document.getElementById('bv-ajuste-painel');
    if (painel) painel.style.display = BV.ajusteFaceMode ? 'flex' : 'none';
    if (BV.cv) BV.cv.style.cursor = BV.ajusteFaceMode ? 'move' : 'grab';
    status(BV.ajusteFaceMode
      ? 'AJUSTE DE FACES: selecione TOP ou BOTTOM e use mover (arraste)/girar/espelhar. Salve ao terminar.'
      : 'Pronto.');
    atualizarUIajuste();
    draw();
  };

  window.bviewAjusteSelFace = function (face) {
    BV.ajusteFaceSel = face;
    atualizarUIajuste();
  };

  function atualizarUIajuste() {
    ['TOP', 'BOT'].forEach(function (f) {
      var btn = document.getElementById('bv-ajf-' + f);
      if (btn) btn.classList.toggle('on', BV.ajusteFaceSel === f);
    });
  }

  window.bviewAjusteGirar = function (graus) {
    var tf = BV.faceTf[BV.ajusteFaceSel];
    tf.rot = ((tf.rot || 0) + graus) % 360;
    aplicarAjusteFaces(); draw();
  };

  window.bviewAjusteEspelhar = function () {
    var tf = BV.faceTf[BV.ajusteFaceSel];
    tf.flip = !tf.flip;
    var b = document.getElementById('bv-ajf-flip');
    if (b) b.classList.toggle('on', tf.flip);
    aplicarAjusteFaces(); draw();
  };

  window.bviewAjusteReset = function () {
    BV.faceTf = { TOP: {dx:0,dy:0,rot:0,flip:false},
                  BOT: {dx:0,dy:0,rot:0,flip:false} };
    aplicarAjusteFaces(); draw();
    status('Ajuste de faces resetado.');
  };

  window.bviewAjusteSalvar = function () {
    if (!bridge() || !bridge().salvarAjusteFaces) {
      status('Salvar indisponivel.'); return;
    }
    bridge().salvarAjusteFaces(JSON.stringify(BV.faceTf), function (js) {
      var r = JSON.parse(js || '{}');
      status(r.ok ? 'Ajuste de faces salvo!' : 'Erro ao salvar: ' + (r.erro || '?'));
    });
  };

  /* desmarcar net/componente selecionado (botao + tecla ESC) */
  window.bviewDesmarcar = function () {
    BV.selNet = null; BV.selPad = null; BV.selPart = null;
    atualizarNetSelecionada();
    renderLista(); draw();
  };

  /* atualiza o indicador da net selecionada ao lado do Schematic */
  function atualizarNetSelecionada() {
    var el = document.getElementById('bv-net-atual');
    if (!el) return;
    if (BV.selNet) {
      el.textContent = BV.selNet;
      el.style.display = '';
    } else if (BV.selPart != null && BV.board) {
      el.textContent = BV.board.parts[BV.selPart].ref;
      el.style.display = '';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  }
  BV.atualizarNetSelecionada = atualizarNetSelecionada;

  window.bviewTema = function () {
    BV.tema = (BV.tema === 'dark') ? 'light' : 'dark';
    var v = document.getElementById('v-bview');
    if (v) v.dataset.tema = BV.tema;
    var b = document.getElementById('bv-tema');
    if (b) { b.textContent = BV.tema === 'dark' ? '☀️' : '🌙'; }
    if (BV.sch && !BV.sch.closed) {
      BV.sch.postMessage({ tipo: 'tema', tema: BV.tema }, '*');
    }
    draw();
  };
  window.bviewFoto = function () {
    if (!BV.foto) return;
    BV.fotoOn = !BV.fotoOn;
    document.getElementById('bv-foto').classList.toggle('on', BV.fotoOn);
    var sl = document.getElementById('bv-alpha');
    if (sl) sl.style.display = BV.fotoOn ? '' : 'none';
    draw();
  };
  window.bviewAlpha = function (v) { BV.fotoAlpha = v / 100; draw(); };
  var CICLO_CORES = ['oliva','verde','azul','roxo','cinza','preto','nenhuma'];
  var NOMES_CORES = {oliva:'Oliva',verde:'Verde',azul:'Azul',roxo:'Roxo',
                     cinza:'Cinza',preto:'Preto',nenhuma:'Sem cor'};
  window.bviewCorPlacaCiclar = function () {
    var i = CICLO_CORES.indexOf(BV.corPlaca);
    BV.corPlaca = CICLO_CORES[(i + 1) % CICLO_CORES.length];
    try { localStorage.setItem('bv-cor-placa', BV.corPlaca); } catch (e) {}
    var btn = document.getElementById('bv-cor-placa');
    if (btn) btn.textContent = '🎨 ' + NOMES_CORES[BV.corPlaca];
    draw();
  };
  window.bviewEspelhar = function () {
    BV.espelharBot = !BV.espelharBot;
    var b = document.getElementById('bv-espelho');
    if (b) b.classList.toggle('on', BV.espelharBot);
    draw();
  };

  /* ── helpers do Casar itens ─────────────────────────────── */
  function defaultCasar() {
    var b = BV.board ? BV.board.bbox : [0, 0, 100, 100];
    var bw = b[2] - b[0], bh = b[3] - b[1];
    var iw = BV.foto ? BV.foto.naturalWidth  : 100;
    var ih = BV.foto ? BV.foto.naturalHeight : 100;
    return { wx: (b[0]+b[2])/2, wy: (b[1]+b[3])/2,
             ws: Math.min(bw/iw, bh/ih),
             sx: 1, sy: 1,              /* esticamento X/Y independente */
             rot: 0, flipH: false, flipV: false };
  }

  function pushCasarHist() {
    if (!BV.casar) return;
    var s = JSON.stringify(BV.casar);
    if (BV.casarHist[BV.casarHist.length-1] === s) return;
    BV.casarHist.push(s);
    if (BV.casarHist.length > 40) BV.casarHist.shift();
  }

  function atualizarUIcasar() {
    var btn = document.getElementById('bv-casar');
    if (btn) btn.classList.toggle('on', BV.casarMode);
    var ctrl = document.getElementById('bv-casar-ctrl');
    if (ctrl) ctrl.style.display = BV.casarMode ? 'flex' : 'none';
    if (BV.cv) BV.cv.style.cursor = BV.casarMode ? 'move' : 'grab';
    if (BV.cv) BV.cv.title = BV.casarMode ?
      'MODO CASAR: arraste = move foto | scroll = escala foto | botoes = rotacao/flip' : '';
  }

  window.bviewCasar = function () {
    if (!BV.foto) { status('Ative o botao Foto primeiro.'); return; }
    if (!BV.fotoOn) window.bviewFoto();
    BV.casarMode = !BV.casarMode;
    if (BV.casarMode) {
      if (!BV.casar) BV.casar = defaultCasar();
      BV.casarHist = [];
      status('MODO CASAR ATIVO — Arraste a foto. Scroll = escala. Botoes = rotacao/flip. Salve ao terminar.');
    } else {
      status('Modo casar encerrado sem salvar.');
    }
    atualizarUIcasar(); draw();
  };

  window.bviewCasarDesfazer = function () {
    if (!BV.casarHist.length) { status('Nada para desfazer.'); return; }
    BV.casar = JSON.parse(BV.casarHist.pop());
    /* atualizar botoes de flip */
    ['fh','fv'].forEach(function(s) {
      var b=document.getElementById('bv-foto-'+s);
      if(b) b.classList.toggle('on', s==='fh'?BV.casar.flipH:BV.casar.flipV);
    });
    draw(); status('Desfeito.');
  };

  window.bviewCasarDefault = function () {
    pushCasarHist();
    BV.casar = defaultCasar();
    /* remover .calib.json salvo */
    if (window.boardviewBridge) {
      boardviewBridge.removerCalibracao(function(){});
    }
    ['fh','fv'].forEach(function(s){
      var b=document.getElementById('bv-foto-'+s); if(b) b.classList.remove('on');
    });
    draw(); status('Calibracao removida. Posicao voltou ao padrao.');
  };

  window.bviewCasarSalvar = function () {
    if (!BV.casar || !window.boardviewBridge) { status('Sem calibracao para salvar.'); return; }
    pushCasarHist();
    boardviewBridge.salvarCalibracao(JSON.stringify(BV.casar), function(js) {
      var r = JSON.parse(js || '{}');
      if (r.ok) {
        status('Casamento salvo!');
        BV.casarMode = false; atualizarUIcasar();
      } else {
        status('Erro ao salvar: ' + (r.erro || '?'));
      }
    });
  };

  window.bviewFotoGirar = function (deg) {
    if (!BV.casar) { if (!BV.foto) return; BV.casar = defaultCasar(); }
    pushCasarHist();
    BV.casar.rot = ((BV.casar.rot || 0) + (deg || 90)) % 360;
    draw();
  };

  window.bviewFotoFlipH = function () {
    if (!BV.casar) { if (!BV.foto) return; BV.casar = defaultCasar(); }
    pushCasarHist();
    BV.casar.flipH = !BV.casar.flipH;
    var b = document.getElementById('bv-foto-fh'); if (b) b.classList.toggle('on', BV.casar.flipH);
    draw();
  };

  window.bviewFotoFlipV = function () {
    if (!BV.casar) { if (!BV.foto) return; BV.casar = defaultCasar(); }
    pushCasarHist();
    BV.casar.flipV = !BV.casar.flipV;
    var b = document.getElementById('bv-foto-fv'); if (b) b.classList.toggle('on', BV.casar.flipV);
    draw();
  };

  /* esticar a foto na horizontal (X) ou vertical (Y) independente.
     dir = +1 estica, -1 comprime. passo de 2%. */
  window.bviewEsticarX = function (dir) {
    if (!BV.casar) { if (!BV.foto) return; BV.casar = defaultCasar(); }
    pushCasarHist();
    BV.casar.sx = Math.max(0.2, (BV.casar.sx || 1) * (dir > 0 ? 1.02 : 1/1.02));
    draw();
  };
  window.bviewEsticarY = function (dir) {
    if (!BV.casar) { if (!BV.foto) return; BV.casar = defaultCasar(); }
    pushCasarHist();
    BV.casar.sy = Math.max(0.2, (BV.casar.sy || 1) * (dir > 0 ? 1.02 : 1/1.02));
    draw();
  };

  /* ── lista lateral ─────────────────────────────────────── */
  function renderLista() {
    var el = document.getElementById('bv-lista');
    if (!el || !BV.board) return;
    var f = (document.getElementById('bv-filtro') || {}).value || '';
    f = f.trim().toUpperCase();
    var html = [];
    if (BV.aba === 'parts') {
      BV.board.parts.forEach(function (p, i) {
        if (!p.pins.length) return;
        if (f && p.ref.toUpperCase().indexOf(f) < 0 &&
            (p.fp || '').toUpperCase().indexOf(f) < 0) return;
        /* limite de 600, MAS o selecionado sempre entra (para poder rolar ate ele) */
        if (html.length > 600 && i !== BV.selPart) return;
        html.push('<div class="bv-it' + (i === BV.selPart ? ' sel' : '') +
          '" data-p="' + i + '"><b>' + p.ref + '</b><span>' +
          (p.fp || '') + ' · ' + p.s + ' · ' + p.pins.length + 'p</span></div>');
      });
    } else {
      BV.netNomes.forEach(function (n) {
        if (f && n.toUpperCase().indexOf(f) < 0) return;
        if (html.length > 600) return;
        html.push('<div class="bv-it' + (n === BV.selNet ? ' sel' : '') +
          '" data-n="' + n + '"><b>' + n + '</b><span>' +
          BV.nets[n].length + ' pads</span></div>');
      });
    }
    el.innerHTML = html.join('') || '<div class="bv-vazio">Nada encontrado.</div>';
    el.querySelectorAll('.bv-it').forEach(function (d) {
      d.onclick = function () {
        if (d.dataset.p != null) selPart(parseInt(d.dataset.p, 10));
        else { selNet(d.dataset.n); enviarSchematic(d.dataset.n); }
      };
    });
  }

  /* ── schematic em janela separada ──────────────────────── */
  window.bviewSchematic = function () {
    var b = bridge();
    if (!b) return;
    /* placa tem esquema? abre direto no leitor de PDF do sistema */
    if (BV.board && BV.board.schematic) {
      b.abrirSchematicPDF(BV.board.schematic, function (ok) {
        if (!ok) status('Nao foi possivel abrir o esquema.');
      });
      return;
    }
    /* sem esquema associado: deixa escolher um arquivo */
    b.escolherSchematic(function (p) {
      if (p) b.abrirSchematicPDF(p, function () {});
    });
  };
  function abrirSch(path) {
    BV.schPath = path;
    BV.sch = window.open('boardview_schematic.html', 'bvsch',
      'width=1000,height=780');
    setTimeout(function () {
      if (!BV.sch || BV.sch.closed) return;
      BV.sch.postMessage({ tipo: 'pdf', path: path, tema: BV.tema }, '*');
      if (BV.selNet) enviarSchematic(BV.selNet);
    }, 700);
  }
  /* == CROSS-PROBE (estilo FlexBV/OBV) ================================
     IDA:   probeSch(nome) -> bridge.schBuscar -> destaca na janela PDF.
     VOLTA: o Python chama BVCROSS.selecionar(nome) quando o tecnico
            clica num nome dentro do esquema (janela PDF.js propria).
     BV.schAberto e ligado/desligado pelo Python ao abrir/fechar a janela. */
  function probeSch(nome) {
    /* nao depende de BV.schAberto: o Python ja ignora quando a janela
       do esquema nao esta aberta (schBuscar checa _sch_win) */
    if (!nome) return;
    var b = bridge();
    if (b && b.schBuscar) b.schBuscar(String(nome));
  }
  window.BVCROSS = {
    selecionar: function (nome) {
      if (!BV.board || !nome) return;
      BV._noProbe = true;
      try {
        buscar(String(nome).toUpperCase().trim());
        /* centraliza a net (selPart ja centraliza sozinho no buscar) */
        if (BV.selNet && BV.nets && BV.nets[BV.selNet] && BV.nets[BV.selNet].length) {
          var pa = BV.board.pins[BV.nets[BV.selNet][0]];
          if (pa) {
            BV.ox = BV.W / 2 - wx(pa.x, pa.s) * BV.s;
            BV.oy = BV.H / 2 - wy(pa.y, pa.s) * BV.s;
            draw();
          }
        }
        status('Cross-probe: "' + nome + '" selecionado pelo esquema.');
      } finally { BV._noProbe = false; }
    }
  };

  /* ── [LOCALIZADOR_V1] marcacao vinda do Localizador de Componentes ──
     Acende TODOS os designadores achados na busca piscando em amarelo e
     centraliza no que o tecnico clicou. Para de piscar sozinho em 90s. */
  BV.marcados = null; BV._marcaT0 = 0; BV._marcaTimer = null;
  window.BVMARCA = {
    marcar: function (refs, foco) {
      var d = BV.board;
      if (!d || !d.parts || !refs || !refs.length) return 0;
      var set = {}, n = 0, prim = null, alvo = {};
      for (var k = 0; k < refs.length; k++) set[String(refs[k]).toUpperCase()] = true;
      d.parts.forEach(function (p, i) {
        var r = p.ref ? String(p.ref).toUpperCase() : '';
        if (!r || !set[r]) return;
        alvo[i] = true; n++;
        if (prim === null || (!visivel(d.parts[prim].s) && visivel(p.s))) prim = i;
      });
      if (!n) return 0;
      if (foco) {
        var fu = String(foco).toUpperCase();
        d.parts.forEach(function (p, i) {
          if (p.ref && String(p.ref).toUpperCase() === fu) prim = i;
        });
      }
      BV.marcados = alvo; BV._marcaT0 = Date.now();
      if (BV._marcaTimer) clearInterval(BV._marcaTimer);
      BV._marcaTimer = setInterval(function () {
        if (!BV.marcados || Date.now() - BV._marcaT0 > 90000) {
          clearInterval(BV._marcaTimer); BV._marcaTimer = null;
        }
        draw();
      }, 130);
      var pp = d.parts[prim];
      if (pp) {
        BV.ox = BV.W / 2 - wx(pp.x, pp.s) * BV.s;
        BV.oy = BV.H / 2 - wy(pp.y, pp.s) * BV.s;
      }
      draw();
      status('Localizador: ' + n + ' componente' + (n === 1 ? '' : 's') +
             ' marcado' + (n === 1 ? '' : 's') + ' em amarelo na placa.');
      return n;
    },
    limpar: function () {
      BV.marcados = null;
      if (BV._marcaTimer) { clearInterval(BV._marcaTimer); BV._marcaTimer = null; }
      draw();
    }
  };

  function enviarSchematic(net) {
    if (BV.sch && !BV.sch.closed) {
      BV.sch.postMessage({ tipo: 'net', net: net }, '*');
    }
  }
  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.tipo === 'net-rev' && BV.board) selNet(e.data.net);
    if (e.data.tipo === 'tema-rev') {
      BV.tema = e.data.tema;
      var _vb = document.getElementById('v-bview'); /* [PERF_LAZY_V1] pode estar desmontada */
      if (_vb) _vb.dataset.tema = BV.tema;
      draw();
    }
  });
})();

