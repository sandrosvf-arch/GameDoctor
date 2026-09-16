/* ============================================================
   app.js — Game Doctor (janela principal)
   ============================================================ */
(function () {
  'use strict';
  /* navegacao = mesma arvore das pastas do Thiago: caminho [marca, console, sub, sub...] */
  var GD = { itens: [], caminho: [], busca: '', catalogoN: -1,
             sessao: {}, pollT: null, swBaixando: {}, baixando: {}, fechadas: {} };
  window.GD = GD;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtSz(b) {
    b = +b || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }
  function unlockLabel(item) {
    if (item.download_available !== false || !item.download_available_at) return '';
    var date = new Date(item.download_available_at);
    if (isNaN(date.getTime())) return 'Download bloqueado nos primeiros 7 dias';
    var remaining = Math.max(0, date.getTime() - Date.now());
    var days = Math.floor(remaining / 86400000);
    var hours = Math.ceil((remaining % 86400000) / 3600000);
    return 'Disponível em ' + days + 'd ' + hours + 'h';
  }
  var ICO = {
    documento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    imagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    boardview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="8" cy="16" r="1.6"/><circle cx="16" cy="16" r="1.6"/><path d="M8 8h8M8 16h8M8 8v8"/></svg>',
    software: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
    pasta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
  };

  /* ── canal ─────────────────────────────────────────────── */
  new QWebChannel(qt.webChannelTransport, function (ch) {
    window.appBridge = ch.objects.appBridge;
    window.boardviewBridge = ch.objects.boardviewBridge;
    GD.init();
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  GD.init = function () {
    appBridge.sessao(function (js) {
      GD.sessao = JSON.parse(js || '{}');
      $('u-nome').textContent = GD.sessao.nome || '';
      var sub = GD.sessao.email || '';
      if (GD.sessao.expira_em === 'Acesso administrativo') sub += ' · acesso administrativo';
      else if (GD.sessao.expira_em) sub += ' · assinatura até ' + GD.sessao.expira_em.slice(0, 10).split('-').reverse().join('/');
      $('u-sub').textContent = sub;
      $('ver').textContent = GD.sessao.versao || '';
      if (GD.sessao.papel === 'admin' || GD.sessao.papel === 'editor') $('btn-importar').style.display = '';
      if (!GD.sessao.cpf) { $('m-cpf').classList.add('on'); setTimeout(function () { $('cpf').focus(); }, 100); }
    });
    GD.recarregar();
    GD.poll();
    $('busca').addEventListener('input', function () { GD.busca = this.value.trim().toLowerCase(); render(); });
    $('cpf').addEventListener('input', function () {
      var d = this.value.replace(/\D/g, '').slice(0, 11);
      this.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    });
    $('cpf').addEventListener('keydown', function (e) { if (e.key === 'Enter') GD.salvarCpf(); });
  };

  /* ── CPF ───────────────────────────────────────────────── */
  GD.salvarCpf = function () {
    var v = $('cpf').value;
    $('cpf-err').textContent = '';
    $('cpf-ok').disabled = true;
    appBridge.salvarCpf(v, function (js) {
      $('cpf-ok').disabled = false;
      var r = JSON.parse(js || '{}');
      if (!r.ok) { $('cpf-err').textContent = r.erro || 'Falha ao salvar.'; return; }
      $('m-cpf').classList.remove('on');
      GD.sessao.cpf = v;
      if (r.aviso) toast('Atenção', r.aviso);
      GD.sincronizar();
    });
  };

  /* ── lista ─────────────────────────────────────────────── */
  GD.recarregar = function () {
    $('loading').style.display = 'flex';
    appBridge.listarMateriais(function (js) {
      var d = JSON.parse(js || '{}');
      GD.itens = d.itens || [];
      $('loading').style.display = 'none';
      renderTree(); render();
      if (d.sync) syncChip(d.sync);
    });
  };


  function renderTree() {
    var arv = {};
    GD.itens.forEach(function (i) {
      if (i.oculto) return;
      arv[i.marca] = arv[i.marca] || {};
      arv[i.marca][i.console] = (arv[i.marca][i.console] || 0) + 1;
    });
    var h = '';
    if (!Object.keys(arv).length) h = '<div class="side-vazio">' + (GD.sincronizando ? 'Carregando biblioteca…' : 'Nenhum material disponível.') + '</div>';
    Object.keys(arv).sort().forEach(function (m) {
      var fech = GD.fechadas[m] ? ' fechada' : '';
      h += '<div class="marca' + fech + '" onclick="GD.toggleMarca(' + JSON.stringify(m).replace(/"/g, '&quot;') + ')"><span class="ch">▼</span>' + esc(m) + '</div><div class="cons-wrap">';
      Object.keys(arv[m]).sort().forEach(function (c) {
        var on = (GD.caminho[0] === m && GD.caminho[1] === c) ? ' on' : '';
        h += '<div class="cons' + on + '" onclick="GD.ir(' + JSON.stringify([m, c]).replace(/"/g, '&quot;') + ')">' +
             esc(c) + '<span class="n">' + arv[m][c] + '</span></div>';
      });
      h += '</div>';
    });
    $('tree').innerHTML = h;
  }
  GD.toggleMarca = function (m) { GD.fechadas[m] = !GD.fechadas[m]; renderTree(); };
  /* navega para um caminho [marca, console, sub...] */
  GD.ir = function (cam) {
    GD.voltarLib(true);
    GD.caminho = cam.slice();
    if (cam.length) GD.fechadas[cam[0]] = false;
    renderTree(); render();
    $('v-lib').scrollTop = 0;
  };

  /* caminho completo do item = [marca, console].concat(pasta.split('/')) */
  function camItem(i) {
    var c = [i.marca, i.console];
    if (i.pasta) c = c.concat(i.pasta.split('/'));
    return c;
  }
  function dentro(i) {   /* item esta' sob o caminho atual? */
    var c = camItem(i);
    for (var k = 0; k < GD.caminho.length; k++) if (c[k] !== GD.caminho[k]) return false;
    return true;
  }
  function filtrados() {
    return GD.itens.filter(function (i) {
      if (i.oculto) return false;   /* foto de placa: vive dentro do boardview */
      if (!GD.busca && !dentro(i)) return false;
      if (GD.busca) {
        var t = (i.nome + ' ' + i.console + ' ' + i.marca + ' ' + (i.pasta || '') + ' ' + (i.descricao || '') + ' ' + (i.arquivo || '')).toLowerCase();
        if (t.indexOf(GD.busca) < 0) return false;
      }
      return true;
    });
  }

  function render() {
    var lst = filtrados();
    var plano = !!GD.busca;   /* busca = lista plana, sem pastas */
    /* breadcrumb */
    var bc = '<span class="bc' + (!GD.caminho.length ? ' on' : '') + '" onclick="GD.ir([])">Início</span>';
    GD.caminho.forEach(function (p, k) {
      bc += '<span class="sep">›</span><span class="bc' + (k === GD.caminho.length - 1 ? ' on' : '') +
            '" onclick="GD.ir(' + JSON.stringify(GD.caminho.slice(0, k + 1)).replace(/"/g, '&quot;') + ')">' + esc(p) + '</span>';
    });
    $('lib-ttl').innerHTML = bc;
    var h = '', nivel = GD.caminho.length, aqui = [], subs = {};
    if (plano) aqui = lst;
    else lst.forEach(function (i) {
      var c = camItem(i);
      if (c.length === nivel) aqui.push(i);
      else { var s = c[nivel]; if (!subs[s]) subs[s] = { n: 0, novos: 0 }; subs[s].n++; if (i.disponivel && !i.visto) subs[s].novos++; }
    });
    var nomes = Object.keys(subs).sort();
    nomes.forEach(function (s) {
      h += '<div class="card pasta" onclick="GD.ir(' + JSON.stringify(GD.caminho.concat([s])).replace(/"/g, '&quot;') + ')">' +
           '<div style="display:flex;align-items:center;gap:10px"><div class="ico">' + ICO.pasta + '</div>' +
           '<div style="flex:1;min-width:0"><div class="ttl">' + esc(s) + '</div><div class="sub">' + subs[s].n + (subs[s].n === 1 ? ' item' : ' itens') + '</div></div>' +
           (subs[s].novos ? '<span class="badge novo">' + subs[s].novos + ' NOVO' + (subs[s].novos > 1 ? 'S' : '') + '</span>' : '') + '</div></div>';
    });
    var tot = aqui.length + nomes.length;
    $('lib-cnt').textContent = plano ? (lst.length + (lst.length === 1 ? ' item' : ' itens')) :
      (nomes.length ? nomes.length + (nomes.length === 1 ? ' pasta' : ' pastas') + (aqui.length ? ', ' : '') : '') + (aqui.length ? aqui.length + (aqui.length === 1 ? ' item' : ' itens') : '');
    $('vazio').style.display = tot ? 'none' : 'block';
    $('vazio-sub').textContent = GD.sincronizando ? 'A biblioteca está sendo sincronizada — os materiais aparecem aqui conforme chegam.' :
      (GD.busca ? 'Nenhum material corresponde à busca.' : 'Não há materiais nesta pasta.');
    aqui.forEach(function (i) {
      var novo = i.disponivel && !i.visto;
      var pend = i.cofre && !i.disponivel;
      var baixando = !!(GD.baixando[i.id] || GD.swBaixando[i.id]);
      var cls = 'card ' + i.categoria + (pend ? ' pend' : '') + (baixando ? ' baixando' : '');
      var tipo = '<span class="tipo ' + i.categoria + '">' + esc(i.rotulo || i.categoria) + '</span>';
      var estado = novo ? '<span class="badge novo">NOVO</span>' : '';
      var acao, cancel = '<button class="abrir cancelar" onclick="event.stopPropagation();GD.cancelar(\'' + i.id + '\')">✕ Cancelar</button>';
      if (i.download_available === false) {
        acao = '<span class="abrir pend">' + esc(unlockLabel(i)) + '</span>';
      } else if (baixando) {
        acao = cancel;
      } else if (i.categoria === 'software') {
        acao = GD.swPronto[i.id]
          ? '<span class="abrir" data-sw="' + esc(i.id) + '">📂 Abrir pasta</span><span class="sub" style="margin-left:6px">· baixar de novo</span>'
          : '<span class="abrir">⬇ Baixar ' + (i.rotulo === 'Software' ? 'software' : 'arquivo') + '</span>';
      } else if (i.categoria === 'boardview') {
        acao = '<span class="abrir">' + (i.disponivel ? 'Abrir no Boardviewer →' : '↓ Baixar para abrir') + '</span>';
      } else {
        acao = '<span class="abrir">' + (i.disponivel ? 'Abrir →' : '↓ Baixar para abrir') + '</span>';
      }
      var titulo = i.titulo || i.nome;
      h += '<div class="' + cls + '" onclick="GD.abrir(\'' + i.id + '\')" title="' + esc(i.nome) + (i.arquivo && i.arquivo !== i.nome ? '\n' + esc(i.arquivo) : '') + '">' +
           tipo +
           '<div class="card-head"><div class="ico">' + (ICO[i.categoria] || ICO.documento) + '</div>' +
           '<div class="card-txt"><div class="ttl">' + esc(titulo) + '</div>' +
           '<div class="sub">' + esc(camItem(i).slice(1).join(' › ')) + '</div></div>' + estado + '</div>' +
           (i.descricao ? '<div class="desc">' + esc(i.descricao) + '</div>' : '') +
           '<div class="foot">' + acao + '<span class="sz">' + fmtSz(i.tamanho) + '</span></div></div>';
    });
    $('grid').innerHTML = h;
  }

  /* ── abrir ─────────────────────────────────────────────── */
  GD.abrir = function (id) {
    var i = GD.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return;
    if (i.download_available === false) return toast('Download bloqueado', unlockLabel(i));
    if (i.categoria === 'software') return GD.baixarSoftware(id);
    if (i.cofre && !i.disponivel) return GD.baixarMaterial(id);
    if (i.categoria === 'boardview') return GD.abrirBoard(i);
    appBridge.abrirDocumento(id, function (js) {
      var r = JSON.parse(js || '{}');
      if (!r.ok) toast('Não foi possível abrir', r.erro || '');
      else { i.visto = true; render(); }
    });
  };

  GD.baixarMaterial = function (id) {
    if (GD.baixando[id]) return;
    GD.baixando[id] = true; render();
    appBridge.baixarMaterial(id, function (js) {
      var r = JSON.parse(js || '{}');
      if (!r.ok) {
        delete GD.baixando[id];
        render();
        toast('Falha no download', r.erro || '');
      }
    });
  };
  GD.onMaterial = function (ok, message, id) {
    delete GD.baixando[id];
    if (!ok) toast('Falha no download', message || '');
    GD.recarregar();
  };
  GD.cancelarMaterial = function (id) {
    appBridge.cancelarDownload(id);
  };
  GD.cancelar = function (id) { appBridge.cancelarDownload(id); };

  GD.abrirBoard = function (i) {
    $('v-lib').classList.remove('on');
    $('v-bview-wrap').classList.add('on');
    var v = $('v-bview');
    v.style.display = 'flex';
    v.classList.add('bv-dedicado');
    var b = $('bv-btn-abrir'); if (b) b.style.display = 'none';
    var r = $('bv-recentes-wrap'); if (r) r.style.display = 'none';
    var a = $('bv-arq'); if (a) a.textContent = i.nome;
    if (typeof bviewInit === 'function') bviewInit();
    var st = $('bv-status'); if (st) st.textContent = 'Carregando ' + i.nome + '…';
    boardviewBridge.carregar('gd://' + i.id, function (js) {
      var d = JSON.parse(js || '{}');
      if (!d.ok) { if (st) st.textContent = 'Erro: ' + (d.erro || '?'); return; }
      BV.aplicarCarga(d);
      i.visto = true;
    });
  };
  GD.voltarLib = function (soSeAberto) {
    if (!$('v-bview-wrap').classList.contains('on')) { if (!soSeAberto) render(); return; }
    try { boardviewBridge.fecharSchematicPDF(function () {}); } catch (e) {}
    $('v-bview-wrap').classList.remove('on');
    $('v-lib').classList.add('on');
    if (!soSeAberto) render();
  };

  GD.baixarSoftware = function (id) {
    if (GD.swBaixando[id]) return;
    GD.swBaixando[id] = true; render();
    appBridge.baixarSoftware(id, false, function (js) {
      var r = JSON.parse(js || '{}');
      if (!r.ok) { delete GD.swBaixando[id]; render(); if (!r.cancelado) toast('Falha', r.erro || ''); }
    });
  };
  GD.cancelarSoftware = function (id) {
    appBridge.cancelarDownload(id);
  };
  GD.swPronto = {};   /* id -> caminho baixado nesta sessao */
  GD.onSoftware = function (ok, caminho, id) {
    delete GD.swBaixando[id];
    if (ok) {
      GD.swPronto[id] = caminho;
      GD.perguntarAbrir(id, caminho);
    } else toast('Falha no download', caminho);
    render();
  };
  /* modal: "Download concluído. Abrir diretório?" */
  GD.perguntarAbrir = function (id, caminho) {
    var i = GD.itens.filter(function (x) { return x.id === id; })[0] || {};
    $('dl-ttl').textContent = i.titulo || i.nome || 'Download concluído';
    $('dl-path').textContent = caminho;
    $('dl-abrir').onclick = function () { $('m-dl').classList.remove('on'); appBridge.abrirPasta(caminho); };
    $('dl-fechar').onclick = function () { $('m-dl').classList.remove('on'); };
    $('m-dl').classList.add('on');
  };
  GD.abrirPastaSw = function (id) {
    var c = GD.swPronto[id];
    if (c) appBridge.abrirPasta(c);
  };
  /* clique no link do toast / botao do card (sem caminho dentro de atributo HTML) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-sw]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    GD.abrirPastaSw(a.getAttribute('data-sw'));
  });

  /* ── sync ──────────────────────────────────────────────── */
  GD.sincronizar = function () {
    appBridge.sincronizar(function () { GD.poll(true); });
  };
  GD.importarPasta = function () {
    appBridge.importarPasta(function (js) {
      var r = JSON.parse(js || '{}');
      if (!r.ok && !r.cancelado) toast('Importação', r.erro || 'Não foi possível iniciar.');
      else if (r.ok) toast('Importação iniciada', 'Os arquivos serão enviados em segundo plano.');
    });
  };
  function importSize(value) {
    value = Number(value) || 0;
    if (value < 1048576) return Math.round(value / 1024) + ' KB';
    if (value < 1073741824) return (value / 1048576).toFixed(1) + ' MB';
    return (value / 1073741824).toFixed(2) + ' GB';
  }
  GD.importProgress = function (current, total, name, status, sent, size) {
    var progress = $('import-status');
    progress.style.display = '';
    var bytes = size ? ' · ' + importSize(sent) + '/' + importSize(size) : '';
    progress.textContent = 'Importando ' + current + '/' + total + ' · ' + name + bytes;
    if (status !== 'enviando') toast('Importando ' + current + '/' + total, name + ' · ' + status);
  };
  GD.importDone = function () {
    $('import-status').textContent = 'Importação concluída';
    toast('Importação concluída', 'A biblioteca será atualizada na próxima sincronização.');
    GD.sincronizar();
  };
  var _ultRodando = false, _ultRecarga = 0;
  GD.poll = function (forcar) {
    if (GD.pollT) clearTimeout(GD.pollT);
    appBridge.estadoSync(function (js) {
      var s = JSON.parse(js || '{}');
      GD.sincronizando = !!s.rodando;
      syncChip(s);
      var agora = Date.now();
      /* catalogo chegou / mudou de tamanho -> lista na hora; durante o download, a cada 3 s */
      if ((s.catalogo_n !== undefined && s.catalogo_n !== GD.catalogoN) ||
          (_ultRodando && !s.rodando) || (s.rodando && agora - _ultRecarga > 3000)) {
        GD.catalogoN = s.catalogo_n; _ultRecarga = agora; GD.recarregar();
      }
      _ultRodando = !!s.rodando;
      GD.pollT = setTimeout(GD.poll, s.rodando ? 700 : 5000);
    });
  };
  function syncChip(s) {
    var chip = $('sync-chip'), txt = $('sync-txt'), prog = $('prog'), ban = $('sync-banner');
    chip.className = '';
    if (s.rodando) {
      ban.classList.add('on');
      $('sb-ttl').textContent = s.total ? ('Baixando materiais ' + Math.min(s.feitos + 1, s.total) + ' de ' + s.total) : (s.fase || 'Sincronizando biblioteca…');
      $('sb-sub').textContent = (s.atual ? '· ' + s.atual : '') + (s.fase === "Aplicando marca d'água" ? ' (aplicando marca d\'água)' : '');
      var pctTot = s.total ? ((s.feitos + (s.pct_item || 0) / 100) / s.total * 100) : 0;
      $('sb-i').style.width = Math.round(pctTot) + '%';
      chip.classList.add('on');
      var t = s.fase || 'Sincronizando';
      if (s.total) t += ' ' + (s.feitos + 1) + '/' + s.total;
      if (s.atual) t += ' · ' + s.atual;
      txt.textContent = t;
      prog.classList.add('on');
      $('prog-i').style.width = (s.pct_item || 0) + '%';
    } else {
      ban.classList.remove('on');
      prog.classList.remove('on');
      if (s.erro) { chip.classList.add('err'); txt.textContent = 'Erro: ' + s.erro; }
      else if (s.ultima) {
        chip.classList.add('ok');
        var d = new Date(s.ultima * 1000);
        txt.textContent = 'Atualizado ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) +
          (s.novos && s.novos.length ? ' · ' + s.novos.length + ' novo' + (s.novos.length > 1 ? 's' : '') : '');
      } else txt.textContent = 'Aguardando…';
    }
  }
  GD.onNovos = function (nomes) {
    toast('Novo material disponível', nomes.join(', '));
    GD.recarregar();
  };

  GD.sair = function () { appBridge.sair(); };

  var _toastT = null;
  function toast(t, m, html) {
    $('toast-t').textContent = t;
    if (html) $('toast-m').innerHTML = m; else $('toast-m').textContent = m;
    $('toast').classList.add('on');
    if (_toastT) clearTimeout(_toastT);
    _toastT = setTimeout(function () { $('toast').classList.remove('on'); }, html ? 12000 : 6000);
  }
  GD.toast = toast;
})();
