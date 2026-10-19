/* ==========================================================================
   APRESENTAÇÃO · PPTX (editável) e PDF (versão final)
   Slide 16:9 = 13,333 x 7,5 pol. Um único desenho alimenta os dois formatos.
   ========================================================================== */
const SW = 13.333, SH = 7.5;
const COR = { azul:'1C54F4', navy:'0A1E96', titulo:'353E59', texto:'56648F', claro:'ACBBE8', linha:'DBE5FF', painel:'EFF4FF', branco:'FFFFFF', cinza:'E9EDF2' };
const PROXIMOS_PASSOS = [
  'Definir as opções para visitas e reuniões de detalhamento técnico;',
  'Solicitar propostas e condições comerciais aos proprietários;',
  'Definir o short-list para início do processo de negociação;',
  'Formalizar a proposta inicial.'
];
const DISCLAIMER = [
  'As disponibilidades apresentadas foram verificadas na data de elaboração deste material e podem sofrer alterações, uma vez que o mercado imobiliário é dinâmico e podem existir negociações em andamento.',
  'Os valores de locação apresentados correspondem aos valores pedidos e podem ser negociados, assim como o período de carência, eventuais descontos e as condições de entrega do imóvel.',
  'O valor do condomínio pode variar mensalmente e corresponde às despesas relacionadas ao uso e à manutenção das áreas comuns do edifício.',
  'O IPTU é devido à Prefeitura. Os valores informados são estimativas por metro quadrado e podem variar conforme o carnê do exercício vigente.',
  'As áreas informadas são locáveis e podem variar conforme a medição final de cada conjunto ou andar.'
];

/* ---------- adaptadores ---------- */
function AdPPTX(){
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
  let s;
  return {
    tipo: 'pptx',
    novo(bg){ s = p.addSlide(); s.background = { color: bg || COR.branco }; },
    ret(x, y, w, h, cor, o = {}){ s.addShape(p.ShapeType.rect, { x, y, w, h, fill: { color: cor }, line: o.borda ? { color: o.borda, width: o.bl || 0.75 } : { type: 'none' } }); },
    circ(x, y, d, cor){ s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: cor }, line: { type: 'none' } }); },
    linha(x1, y1, x2, y2, cor, pt){
      s.addShape(p.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(x2 - x1), 0.001), h: Math.max(Math.abs(y2 - y1), 0.001),
        flipV: (x2 - x1) * (y2 - y1) < 0, line: { color: cor, width: pt } });
    },
    txt(t, x, y, w, h, o = {}){
      s.addText(String(t == null ? '' : t), { x, y, w, h, fontFace: 'Arial', fontSize: o.pt || 12, color: o.cor || COR.titulo, bold: !!o.bold,
        align: o.align || 'left', valign: o.valign || 'top', margin: 0, lineSpacingMultiple: o.ls || 1.05, fit: 'shrink', hyperlink: o.link ? { url: o.link } : undefined });
    },
    img(data, x, y, w, h){ s.addImage({ data, x, y, w, h }); },
    async salvar(nome){ await p.writeFile({ fileName: nome + '.pptx' }); }
  };
}
function AdPDF(){
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: 'landscape', unit: 'in', format: [SW, SH], compress: true });
  let primeiro = true;
  const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return {
    tipo: 'pdf',
    novo(bg){ if(!primeiro) d.addPage([SW, SH], 'landscape'); primeiro = false; d.setFillColor(...rgb(bg || COR.branco)); d.rect(0, 0, SW, SH, 'F'); },
    ret(x, y, w, h, cor, o = {}){
      d.setFillColor(...rgb(cor));
      if(o.borda){ d.setDrawColor(...rgb(o.borda)); d.setLineWidth((o.bl || 0.75) / 72); d.rect(x, y, w, h, 'FD'); } else d.rect(x, y, w, h, 'F');
    },
    circ(x, y, dd, cor){ d.setFillColor(...rgb(cor)); d.circle(x + dd / 2, y + dd / 2, dd / 2, 'F'); },
    linha(x1, y1, x2, y2, cor, pt){ d.setDrawColor(...rgb(cor)); d.setLineWidth(pt / 72); d.setLineCap('round'); d.line(x1, y1, x2, y2); },
    txt(t, x, y, w, h, o = {}){
      let pt = o.pt || 12, linhas;
      const ls = (o.ls || 1.05) * 1.17;
      d.setFont('helvetica', o.bold ? 'bold' : 'normal'); d.setTextColor(...rgb(o.cor || COR.titulo));
      for(;;){ d.setFontSize(pt); linhas = d.splitTextToSize(String(t == null ? '' : t), w); if(linhas.length * pt * ls / 72 <= h + 0.02 || pt <= 6) break; pt -= 0.5; }
      const lh = pt * ls / 72, alt = linhas.length * lh;
      const y0 = o.valign === 'middle' ? y + (h - alt) / 2 : o.valign === 'bottom' ? y + h - alt : y;
      const al = o.align || 'left', xx = al === 'center' ? x + w / 2 : al === 'right' ? x + w : x;
      linhas.forEach((ln, i) => d.text(ln, xx, y0 + i * lh + (lh + pt * 0.72 / 72) / 2, { align: al }));
      if(o.link) d.link(x, y, w, h, { url: o.link });
    },
    img(data, x, y, w, h){ d.addImage(data, /^data:image\/png/.test(data) ? 'PNG' : 'JPEG', x, y, w, h, undefined, 'FAST'); },
    async salvar(nome){ d.save(nome + '.pdf'); }
  };
}

/* ---------- imagens: recorte "cover" e mapa estático ---------- */
async function recorte(src, ar, larg = 1400){
  if(!src) return null;
  try{
    const im = await carregarImg(src);
    const W = larg, H = Math.round(larg / ar), c = document.createElement('canvas');
    c.width = W; c.height = H;
    const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k;
    c.getContext('2d').drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.86);
  }catch(e){ console.warn('imagem não carregou', src, e); return null; }
}
const lon2x = (lng, z) => (lng + 180) / 360 * 256 * 2 ** z;
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 256 * 2 ** z; };
async function mapaEstatico(pts, W, H, zMax = 16){
  pts = pts.filter(p => p.lat && p.lng);
  if(!pts.length) return null;
  let z = zMax, xs, ys;
  for(; z > 3; z--){
    xs = pts.map(p => lon2x(p.lng, z)); ys = pts.map(p => lat2y(p.lat, z));
    if(Math.max(...xs) - Math.min(...xs) <= W * 0.82 && Math.max(...ys) - Math.min(...ys) <= H * 0.78) break;
  }
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const x0 = cx - W / 2, y0 = cy - H / 2, E = 2;
  const c = document.createElement('canvas'); c.width = W * E; c.height = H * E;
  const g = c.getContext('2d'); g.scale(E, E); g.fillStyle = '#E9EDF2'; g.fillRect(0, 0, W, H);
  const tarefas = [], n = 2 ** z;
  for(let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++){
    for(let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++){
      if(ty < 0 || ty >= n) continue;
      const url = TILE_URL.replace('{s}', 'abcd'[(tx + ty) & 3]).replace('{z}', z).replace('{x}', ((tx % n) + n) % n).replace('{y}', ty).replace('{r}', '@2x');
      tarefas.push(carregarImg(url).then(im => g.drawImage(im, tx * 256 - x0, ty * 256 - y0, 256, 256)).catch(() => {}));
    }
  }
  await Promise.all(tarefas);
  pts.forEach((p, i) => {
    const px = xs[i] - x0, py = ys[i] - y0;
    g.beginPath(); g.arc(px, py, p.rotulo ? 13 : 10, 0, Math.PI * 2);
    g.fillStyle = '#1C54F4'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    if(p.rotulo){ g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(p.rotulo), px, py + 0.5); }
  });
  g.font = '9px Arial'; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.fillStyle = 'rgba(255,255,255,.8)'; const tw = g.measureText(TILE_ATTR).width; g.fillRect(W - tw - 8, H - 14, tw + 8, 14);
  g.fillStyle = '#56648F'; g.fillText(TILE_ATTR, W - 4, H - 2);
  try{ return c.toDataURL('image/jpeg', 0.88); }catch(e){ console.warn('mapa bloqueado', e); return null; }
}

/* ---------- dados da apresentação ---------- */
async function montarDados(progresso){
  const cliente = $('inp-cliente').value.trim() || 'Cliente';
  const mes = +$('inp-mes').value, ano = +$('inp-ano').value;
  const marcados = S.resultado.filter(r => r.incluido);
  const dem = +$('inp-demanda').value || 0, precoMax = +$('inp-preco').value || 0;
  const regioes = [];
  marcados.forEach(r => {
    const nome = r.foraDoFiltro ? 'Outras opções' : r.e.regiao, sub = r.foraDoFiltro ? '' : r.e.cidade + '/' + r.e.uf;
    let rg = regioes.find(x => x.nome === nome && x.sub === sub);
    if(!rg) regioes.push(rg = { nome, sub, imoveis: [] });
    rg.imoveis.push(r);
  });
  const imoveis = [];
  let n = 0;
  for(const rg of regioes){
    for(const r of rg.imoveis){
      n++;
      progresso && progresso(`Preparando ${n} de ${marcados.length}: ${r.e.nome}`);
      const fotos = S.fotos[r.e.id] || [];
      const temFoto = !!fotos[0];
      imoveis.push({
        n, r, e: r.e, V: valores(r), regiao: rg,
        foto: temFoto ? await recorte(fotos[0].url, 4.55 / 4.7) : null,
        foto2: fotos[1] ? await recorte(fotos[1].url, 2.5 / 2.3, 900) : null,
        mapa: await mapaEstatico([{ lat: r.e.lat, lng: r.e.lng }], temFoto ? 300 : 860, temFoto ? (fotos[1] ? 276 : 564) : 564, 16),
        link: r.e.lat ? `https://www.google.com/maps?q=${r.e.lat},${r.e.lng}` : null,
        estimativa: dem && totalDe(r.e) && !((r.temp || {}).total || (S.perm[r.e.id] || {}).total) ? dem * totalDe(r.e) : null
      });
    }
  }
  progresso && progresso('Desenhando o mapa geral…');
  const mapaGeral = await mapaEstatico(imoveis.map(im => ({ lat: im.e.lat, lng: im.e.lng, rotulo: im.n })), 820, 600, 15);
  const ids = S.brokersSel.length ? S.brokersSel : [];
  let brokers = [];
  if(ids.length){
    const { data } = await db.from('brokers').select('*').in('id', ids);
    brokers = ids.map(id => (data || []).find(b => b.id === id)).filter(Boolean);
    for(const b of brokers) b.fotoData = b.foto_url ? await recorte(b.foto_url, 1, 500) : null;
  }
  const f = faixaAtual(), fl = S.filtros || {};
  const criterios = [];
  if(dem) criterios.push(['Demanda: ', nfmt(dem) + ' m²']);
  criterios.push(['Área vaga considerada: ', faixaTxt(f).replace(/^área vaga /, '')]);
  criterios.push(['Regiões: ', regioes.filter(r => r.sub).map(r => r.nome).join(', ')]);
  if(precoMax) criterios.push(['Custo total máximo: ', 'R$ ' + nfmt(precoMax, 2) + '/m²/mês']);
  if(fl.classes && fl.classes.length) criterios.push(['Classes: ', fl.classes.join(', ')]);
  const exig = [fl.piso && 'piso elevado', fl.gerador && 'gerador', fl.ar && 'ar-condicionado central', fl.green && 'Green Building'].filter(Boolean);
  if(exig.length) criterios.push(['Exigências: ', exig.join(', ')]);
  return { cliente, data: MESES[mes - 1] + ', ' + ano, dataArq: String(mes).padStart(2, '0') + '-' + ano, dem, regioes, imoveis, mapaGeral, brokers, criterios };
}

/* ---------- elementos comuns ---------- */
function cabecalho(ad, d, sobre, titulo){
  ad.txt(sobre, 0.75, 0.55, 9, 0.3, { pt: 13, cor: COR.texto });
  ad.txt(titulo, 0.75, 0.85, 11, 0.62, { pt: 32, cor: COR.azul });
  rodape(ad, d);
}
function rodape(ad, d){
  ad.linha(0, 7.08, SW, 7.08, COR.linha, 0.75);
  ad.txt('Site Selection · ' + d.cliente, 0.75, 7.16, 7, 0.2, { pt: 8.5, cor: COR.claro });
  ad.txt(d.data, SW - 3.75, 7.16, 3, 0.2, { pt: 8.5, cor: COR.claro, align: 'right' });
}
function check(ad, x, y){ ad.linha(x, y, x + 0.07, y + 0.075, COR.azul, 1.8); ad.linha(x + 0.07, y + 0.075, x + 0.2, y - 0.09, COR.azul, 1.8); }
const curto = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const ouNI = v => (v == null || v === '') ? NI : String(v);

/* ---------- slides ---------- */
function slideCapa(ad, d){
  ad.novo(COR.navy);
  ad.ret(0, 2.05, 8.1, 3.85, COR.azul);
  ad.ret(0, 1.55, 4.6, 0.75, COR.branco);
  ad.txt('Escritórios', 0.75, 1.62, 3.7, 0.6, { pt: 28, cor: COR.azul, valign: 'middle' });
  ad.linha(0.75, 0, 0.75, 7.08, COR.branco, 0.6); ad.linha(0.75, 7.08, SW, 7.08, COR.branco, 0.6);
  ad.txt(d.data, 1.05, 2.85, 6.8, 0.36, { pt: 15, cor: COR.branco });
  ad.txt('Site Selection', 1.05, 3.25, 6.8, 0.7, { pt: 38, cor: COR.branco, bold: true });
  ad.txt('Preparado para ' + d.cliente, 1.05, 3.95, 6.8, 1.6, { pt: 30, cor: COR.branco });
}
function slideIntro(ad, d){
  ad.novo();
  cabecalho(ad, d, 'SITE SELECTION', 'Introdução');
  const n = d.imoveis.length;
  ad.txt(`Esta apresentação foi elaborada para ${d.cliente} e reúne ${n} ${n === 1 ? 'edifício de escritórios' : 'edifícios de escritórios'} com áreas disponíveis para locação nas regiões definidas para o estudo.`,
    0.75, 1.85, 11.6, 0.8, { pt: 16, cor: COR.texto });
  ad.txt('As opções foram selecionadas de acordo com os seguintes critérios:', 0.75, 2.75, 11.6, 0.4, { pt: 16, cor: COR.texto });
  let y = 3.25;
  d.criterios.forEach(([k, v]) => {
    ad.circ(0.85, y + 0.1, 0.09, COR.azul);
    ad.txt(k + v, 1.1, y, 11.2, 0.4, { pt: 15, cor: COR.titulo });
    y += 0.42;
  });
  ad.txt('As disponibilidades e os valores refletem a base de mercado na data de elaboração deste estudo.', 0.75, Math.min(y + 0.25, 6.5), 11.6, 0.4, { pt: 13, cor: COR.texto });
}
function slideMapa(ad, d){
  ad.novo();
  cabecalho(ad, d, 'DISPONIBILIDADES', 'Mapa das opções');
  if(d.mapaGeral) ad.img(d.mapaGeral, 6.3, 1.7, 6.3, 6.3 * 600 / 820);
  const itens = [];
  d.regioes.forEach(rg => { itens.push({ cab: rg.nome + (rg.sub ? ' · ' + rg.sub : '') }); rg.imoveis.forEach(r => itens.push({ im: d.imoveis.find(i => i.r === r) })); });
  const topo = 1.75, fundo = 6.9, passo = Math.min(0.36, (fundo - topo) / Math.max(1, itens.length)), f = passo / 0.36;
  let y = topo;
  itens.forEach(it => {
    if(it.cab) ad.txt(it.cab.toUpperCase(), 0.75, y, 5.3, passo, { pt: 10 * Math.max(f, 0.7), cor: COR.azul, bold: true, valign: 'middle' });
    else{
      const dd = 0.26 * Math.max(f, 0.65);
      ad.circ(0.75, y + (passo - dd) / 2, dd, COR.azul);
      ad.txt(String(it.im.n), 0.75, y + (passo - dd) / 2, dd, dd, { pt: 8.5 * Math.max(f, 0.7), cor: COR.branco, bold: true, align: 'center', valign: 'middle' });
      ad.txt(curto(it.im.V.nome, 40) + (it.im.e.area_vaga ? '  ·  ' + nfmt(it.im.e.area_vaga) + ' m²' : ''), 0.75 + dd + 0.12, y, 5.2 - dd, passo,
        { pt: 11 * Math.max(f, 0.7), cor: COR.titulo, valign: 'middle' });
    }
    y += passo;
  });
}
function slideRegiao(ad, d, rg){
  ad.novo(COR.navy);
  ad.ret(0, 4.3, 6.2, 1.9, COR.branco);
  ad.ret(0, 3.75, 3.6, 0.7, COR.azul);
  ad.txt(rg.imoveis.length + (rg.imoveis.length === 1 ? ' opção' : ' opções'), 0.75, 3.75, 2.8, 0.7, { pt: 22, cor: COR.branco, valign: 'middle' });
  ad.txt(rg.nome, 0.75, 4.6, 5.3, 0.7, { pt: 30, cor: COR.titulo });
  if(rg.sub) ad.txt(rg.sub, 0.75, 5.35, 5.3, 0.4, { pt: 14, cor: COR.texto, bold: true });
}
function slideLamina(ad, d, im){
  ad.novo();
  const V = im.V, e = im.e;
  ad.circ(0.6, 0.3, 0.42, COR.azul);
  ad.txt(String(im.n), 0.6, 0.3, 0.42, 0.42, { pt: 13, cor: COR.branco, bold: true, align: 'center', valign: 'middle' });
  ad.txt((im.regiao.nome || '').toUpperCase(), 1.15, 0.38, 6.6, 0.26, { pt: 10, cor: COR.claro, bold: true, valign: 'middle' });
  ad.txt(curto(V.nome, 46), 0.6, 0.85, 7.25, 0.55, { pt: 24, cor: COR.azul });
  ad.txt(ouNI(V.endereco), 0.6, 1.4, 7.25, 0.28, { pt: 12, cor: COR.texto });
  ad.txt(ouNI(V.regiao), 0.6, 1.68, 7.25, 0.28, { pt: 12, cor: COR.texto, bold: true });

  // fotos e mapa
  const Y = 2.15, Hm = 4.7;
  if(im.foto){
    ad.img(im.foto, 0.6, Y, 4.55, Hm);
    if(im.foto2){ ad.img(im.foto2, 5.3, Y, 2.55, 2.28); if(im.mapa) ad.img(im.mapa, 5.3, Y + 2.42, 2.55, 2.28); }
    else if(im.mapa) ad.img(im.mapa, 5.3, Y, 2.55, Hm);
  }else if(im.mapa) ad.img(im.mapa, 0.6, Y, 7.25, Hm);
  else{ ad.ret(0.6, Y, 7.25, Hm, COR.cinza); ad.txt('Imagem não disponível', 0.6, Y, 7.25, Hm, { pt: 12, cor: COR.texto, align: 'center', valign: 'middle' }); }
  if(im.mapa && im.link){
    const mx = im.foto ? 5.3 : 0.6, my = im.foto && im.foto2 ? Y + 2.42 : Y;
    ad.ret(mx, my, 1.25, 0.28, COR.azul);
    ad.txt('LOCALIZAÇÃO', mx, my, 1.25, 0.28, { pt: 8.5, cor: COR.branco, bold: true, align: 'center', valign: 'middle', link: im.link });
  }
  if(V.destaque){ ad.ret(0.6, Y + 0.25, 2.9, 0.36, COR.azul); ad.txt(V.destaque, 0.75, Y + 0.25, 2.7, 0.36, { pt: 11, cor: COR.branco, bold: true, valign: 'middle' }); }

  // painel
  const X = 8.2, W = 4.55;
  ad.ret(X, 0.3, W, 6.6, COR.painel);
  let y = 0.48;
  ad.txt('Características', X + 0.25, y, W - 0.5, 0.3, { pt: 12, cor: COR.azul, bold: true }); y += 0.38;
  CHECKLIST.forEach(([k, l]) => {
    check(ad, X + 0.27, y + 0.15);
    ad.txt(l + ': ' + ouNI(V[k]), X + 0.58, y, W - 0.8, 0.32, { pt: 10.5, cor: COR.titulo, valign: 'middle' });
    y += 0.34;
  });
  y += 0.1; ad.linha(X + 0.25, y, X + W - 0.25, y, COR.linha, 1); y += 0.12;
  ad.txt('Quadro de áreas', X + 0.25, y, W - 0.5, 0.28, { pt: 12, cor: COR.azul, bold: true }); y += 0.32;
  const kv = (l, v, forte) => {
    ad.txt(l, X + 0.25, y, 2.2, 0.24, { pt: 9.5, cor: COR.texto, valign: 'middle' });
    ad.txt(ouNI(v), X + 2.35, y, W - 2.6, 0.24, { pt: 9.5, cor: forte ? COR.azul : COR.titulo, bold: true, align: 'right', valign: 'middle' });
    y += 0.25;
  };
  [['classe','Classe'],['area_total','Área locável total'],['area_vaga','Área disponível'],['conjuntos','Conjuntos disponíveis'],['vagas','Vagas de garagem'],['status','Status']]
    .forEach(([k, l]) => kv(l, V[k]));
  y += 0.08; ad.linha(X + 0.25, y, X + W - 0.25, y, COR.linha, 1); y += 0.12;
  ad.txt('Valores pedidos (R$/m²/mês)', X + 0.25, y, W - 0.5, 0.28, { pt: 12, cor: COR.azul, bold: true }); y += 0.32;
  kv('Aluguel', V.aluguel); kv('Condomínio', V.condominio); kv('IPTU', V.iptu); kv('Total', V.total, true);
  if(im.estimativa && y < 6.6) kv('Estimativa mensal (' + nfmt(d.dem) + ' m²)', brl(im.estimativa), true);
  ad.txt('Valores pedidos, sujeitos a negociação. Fonte: base de mercado, ' + d.data.toLowerCase() + '.', 0.6, 7.0, 12, 0.22, { pt: 8, cor: COR.claro });
}
function slidesComparativo(ad, d){
  const COLS = [['#',0.35,'c'],['Edifício',3.1,'l'],['Região',2.0,'l'],['Classe',0.7,'c'],['Área disp. (m²)',1.25,'r'],['Laje tipo (m²)',1.15,'r'],
                ['Aluguel',0.95,'r'],['Cond.',0.85,'r'],['IPTU',0.8,'r'],['Total',0.9,'r']];
  const porPag = 12;
  for(let p = 0; p < d.imoveis.length; p += porPag){
    ad.novo();
    cabecalho(ad, d, 'DISPONIBILIDADES', 'Quadro comparativo' + (d.imoveis.length > porPag ? ` (${p / porPag + 1}/${Math.ceil(d.imoveis.length / porPag)})` : ''));
    let x = 0.75, y = 1.75;
    ad.ret(0.75, y, 12.05, 0.42, COR.azul);
    COLS.forEach(([t, w, a]) => { ad.txt(t, x + 0.06, y, w - 0.12, 0.42, { pt: 9.5, cor: COR.branco, bold: true, valign: 'middle', align: a === 'c' ? 'center' : a === 'r' ? 'right' : 'left' }); x += w; });
    y += 0.42;
    d.imoveis.slice(p, p + porPag).forEach((im, i) => {
      const V = im.V, e = im.e;
      if(i % 2) ad.ret(0.75, y, 12.05, 0.38, COR.painel);
      const vals = [im.n, curto(V.nome, 38), curto(e.regiao || '', 24), e.classe || '—', nfmt(e.area_vaga) || '—', nfmt(e.area_andar_tipo) || '—',
        e.preco_medio ? nfmt(e.preco_medio, 2) : '—', e.condominio ? nfmt(e.condominio, 2) : '—', e.iptu ? nfmt(e.iptu, 2) : '—', totalDe(e) ? nfmt(totalDe(e), 2) : '—'];
      x = 0.75;
      COLS.forEach(([t, w, a], j) => {
        ad.txt(String(vals[j]), x + 0.06, y, w - 0.12, 0.38, { pt: 9.5, cor: j === 9 ? COR.azul : COR.titulo, bold: j === 1 || j === 9, valign: 'middle',
          align: a === 'c' ? 'center' : a === 'r' ? 'right' : 'left' });
        x += w;
      });
      y += 0.38;
    });
    ad.txt('Valores pedidos em R$/m²/mês. Os dados da planilha original podem ter sido ajustados nas lâminas.', 0.75, Math.min(y + 0.15, 6.75), 12, 0.25, { pt: 8.5, cor: COR.texto });
  }
}
function slideTexto(ad, d, sobre, titulo, itens, marcador){
  ad.novo();
  cabecalho(ad, d, sobre, titulo);
  let y = 1.85;
  itens.forEach(t => {
    const nl = Math.max(1, Math.ceil(t.length / 120)), h = nl * 0.27;
    if(marcador) check(ad, 0.8, y + 0.14); else ad.circ(0.82, y + 0.08, 0.08, COR.azul);
    ad.txt(t, 1.15, y, 11.4, h, { pt: marcador ? 15 : 12, cor: COR.texto });
    y += h + (marcador ? 0.3 : 0.2);
  });
}
function slideContato(ad, d){
  ad.novo();
  cabecalho(ad, d, 'SITE SELECTION', 'Contato');
  const bs = d.brokers.slice(0, 4);
  if(!bs.length) return;
  const w = 11.8 / bs.length;
  bs.forEach((b, i) => {
    const x = 0.75 + i * w, cw = Math.min(w - 0.3, 3.2);
    if(b.fotoData) ad.img(b.fotoData, x, 1.95, 1.5, 1.5);
    else{ ad.ret(x, 1.95, 1.5, 1.5, COR.azul); ad.txt(iniciais(b.nome), x, 1.95, 1.5, 1.5, { pt: 30, cor: COR.branco, bold: true, align: 'center', valign: 'middle' }); }
    ad.txt(b.nome, x, 3.65, cw, 0.4, { pt: 15, cor: COR.azul, bold: true });
    let y = 4.05;
    [b.cargo, b.creci && 'CRECI ' + b.creci, b.telefone, b.email].filter(Boolean).forEach(t => { ad.txt(t, x, y, cw, 0.28, { pt: 11, cor: COR.texto }); y += 0.3; });
  });
}
function slideFim(ad, d){
  ad.novo(COR.navy);
  ad.txt('Obrigado', 0.75, 2.9, 11, 0.9, { pt: 46, cor: COR.branco, bold: true });
  ad.txt('Site Selection · ' + d.cliente, 0.75, 3.85, 11, 0.45, { pt: 18, cor: COR.claro });
}

async function gerarArquivo(formato){
  if(!S.resultado.some(r => r.incluido)) return toast('Marque ao menos um edifício.');
  carregando(true, formato === 'pptx' ? 'Gerando PPTX…' : 'Gerando PDF…');
  try{
    const d = await montarDados(t => $('carregando-sub').textContent = t);
    $('carregando-sub').textContent = 'Montando os slides…';
    const ad = formato === 'pptx' ? AdPPTX() : AdPDF();
    slideCapa(ad, d); slideIntro(ad, d); slideMapa(ad, d);
    for(const rg of d.regioes){ slideRegiao(ad, d, rg); d.imoveis.filter(im => im.regiao === rg).forEach(im => slideLamina(ad, d, im)); }
    slidesComparativo(ad, d);
    slideTexto(ad, d, 'SITE SELECTION', 'Próximos passos', PROXIMOS_PASSOS, true);
    slideTexto(ad, d, 'SITE SELECTION', 'Considerações', DISCLAIMER, false);
    slideContato(ad, d);
    slideFim(ad, d);
    const nome = ['SITE_SELECTION', d.cliente.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(), d.dataArq].join('_');
    await ad.salvar(nome);
  }catch(e){ console.error(e); toast('Não gerou o arquivo: ' + (e.message || e), 5000); }
  finally{ carregando(false); }
}
