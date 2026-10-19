/* ==========================================================================
   SITE SELECTION · ESCRITÓRIOS
   Banco: Supabase (projeto site-selection). Site aberto, sem login.
   ========================================================================== */
const SUPABASE_URL = 'https://jkmeysyltaezsudzkduh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbWV5c3lsdGFlenN1ZHprZHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Mjg1NzMsImV4cCI6MjEwODAwNDU3M30.Zd7rkmLi3QIF-KeKQ7--cLIolEswApY7y10cZVLYpy0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const UF_NOME = { SP:'São Paulo', RJ:'Rio de Janeiro', MG:'Minas Gerais', PR:'Paraná', RS:'Rio Grande do Sul', DF:'Distrito Federal', SC:'Santa Catarina', BA:'Bahia', PE:'Pernambuco' };
const CLASSES = ['AAA','AA','A','BB','B','C'];
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© OpenStreetMap © CARTO';

/* ---------- estado do estudo em edição ---------- */
const S = {
  id: null, brokers: [], brokersSel: [], disp: [], regioes: [],
  resultado: [], perm: {}, fotos: {}, aberto: null, editando: null, filtros: {}
};

/* ---------- utilitários ---------- */
const $ = id => document.getElementById(id);
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nfmt(v, dec = 0){
  if(v === null || v === undefined || v === '' || isNaN(v)) return null;
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
const brl = v => { const t = nfmt(v, 2); return t === null ? null : 'R$ ' + t; };
const m2 = v => { const t = nfmt(v, 0); return t === null ? null : t + ' m²'; };
const NI = 'Não informado';
const nada = v => v == null || v === '' || /^(informa[cç][aã]o pendente|-)$/i.test(String(v).trim());
function toast(msg, ms = 2600){ const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), ms); }
function carregando(on, txt, sub){ $('carregando').classList.toggle('on', !!on); if(txt) $('carregando-txt').textContent = txt; $('carregando-sub').textContent = sub || ''; }
function iniciais(n){ return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(); }
const chaveReg = r => r.uf + '|' + r.cidade + '|' + r.regiao;

async function emLotes(tabela, coluna, valores, cols = '*'){
  const out = [], uniq = [...new Set(valores)].filter(v => v != null);
  for(let i = 0; i < uniq.length; i += 150){
    const fatia = uniq.slice(i, i + 150);
    for(let de = 0; ; de += 1000){
      const { data, error } = await db.from(tabela).select(cols).in(coluna, fatia).range(de, de + 999);
      if(error) throw error;
      out.push(...data);
      if(data.length < 1000) break;
    }
  }
  return out;
}

/* ---------- navegação ---------- */
const INIT = {
  home: carregarStatusBase, responsavel: initResponsavel, capa: initCapa, regioes: initRegioes,
  demanda: initDemanda, selecao: renderSelecao, lista: carregarLista, base: carregarStatusBase, brokers: carregarBrokers
};
let telaAnterior = 'home';
function go(id){
  const atual = document.querySelector('.screen.active');
  if(atual && atual.id !== id && id === 'brokers') telaAnterior = atual.id;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
  if(INIT[id]) INIT[id]();
}
function voltarDeBrokers(){ go(telaAnterior === 'responsavel' ? 'responsavel' : 'home'); }

function novoEstudo(){ resetEstudo(); go('responsavel'); }
function resetEstudo(){
  Object.assign(S, { id: null, brokersSel: [], regioes: [], resultado: [], perm: {}, fotos: {}, aberto: null, filtros: {} });
  ['inp-cliente','inp-demanda','inp-area-min','inp-area-max','inp-preco'].forEach(i => $(i).value = '');
  ['f-piso','f-gerador','f-ar','f-green'].forEach(i => $(i).checked = false);
  $('f-obra').checked = true; $('f-sempreco').checked = true;
  S.filtros.classes = [];
  initCapa(true);
}

/* ---------- status da base ---------- */
async function carregarStatusBase(){
  const { count } = await db.from('edificios').select('id', { count: 'exact', head: true });
  const { data: ult } = await db.from('edificios').select('importado_em').order('importado_em', { ascending: false }).limit(1);
  const { count: vagos } = await db.from('edificios').select('id', { count: 'exact', head: true }).gt('area_vaga', 0);
  const dt = ult && ult[0] ? new Date(ult[0].importado_em) : null;
  const dtTxt = dt ? dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  $('status-base').innerHTML = count ? `${nfmt(count)} edifícios na base<br>importada em ${dtTxt}` : 'base vazia';
  $('aviso-base').innerHTML = count ? '' :
    '<div class="aviso">A base de edifícios ainda está vazia. Importe a planilha em <b>Base de edifícios</b> antes de montar o primeiro estudo.</div>';
  $('base-stats').innerHTML = `
    <div class="stat"><b>${nfmt(count || 0)}</b><span>edifícios na base</span></div>
    <div class="stat"><b>${nfmt(vagos || 0)}</b><span>com área vaga</span></div>
    <div class="stat"><b style="font-size:15px;padding-top:6px">${dtTxt}</b><span>última importação</span></div>`;
}

/* ==========================================================================
   IMPORTAÇÃO DA PLANILHA
   ========================================================================== */
const normCab = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const MAPA_COLUNAS = {
  id:'id', nome:'nome', endereco:'endereco', numero:'numero', cep:'cep', distrito:'distrito', cidade:'cidade', uf:'uf',
  classe:'classe', perfil:'perfil', latitude:'lat', longitude:'lng', regiaocolliers:'regiao_colliers', classecolliers:'classe_colliers',
  arealocaveltotalm:'area_locavel_total', arealocavelbomatotalm:'area_boma', arealocavelprivativatotalm:'area_privativa',
  arealocaveldisponivelm:'area_disponivel', areavagam:'area_vaga', areaofertadam:'area_ofertada', taxadevacancia:'taxa_vacancia',
  auditorio:'auditorio', arealocavelandartipo1m:'area_andar_tipo', conjuntosandartipo1:'conjuntos_andar_tipo', conjuntos:'conjuntos',
  conjuntosdisponiveis:'conjuntos_disponiveis', vagasandartipo1:'vagas_andar_tipo', vagastotal:'vagas_total', gerador:'gerador',
  heliponto:'heliponto', arcondicionado:'ar_condicionado', piso:'piso', forro:'forro', pedireitom:'pe_direito', greenbuilding:'green_building',
  menorprecopedidormmes:'preco_min', maiorprecopedidormmes:'preco_max', mediadeprecopedidormmes:'preco_medio',
  menorprecovendarmmes:'venda_min', maiorprecovendarmmes:'venda_max', condominiormmes:'condominio', ipturmmes:'iptu', totalrmmes:'total',
  datadeatualizacao:'data_atualizacao', status:'status', categoriadeuso:'categoria_uso'
};
const NUMERICOS = ['lat','lng','area_locavel_total','area_boma','area_privativa','area_disponivel','area_vaga','area_ofertada','taxa_vacancia',
  'area_andar_tipo','pe_direito','preco_min','preco_max','preco_medio','venda_min','venda_max','condominio','iptu','total'];
const INTEIROS = ['conjuntos_andar_tipo','conjuntos','conjuntos_disponiveis','vagas_andar_tipo','vagas_total'];
const ZERO_E_VAZIO = ['lat','lng','area_boma','area_privativa','area_andar_tipo','pe_direito','preco_min','preco_max','preco_medio','venda_min','venda_max','condominio','iptu','total','area_locavel_total'];

function numBR(v){
  if(v == null) return null;
  if(typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).trim();
  if(!s || s === '-' || /pendente/i.test(s)) return null;
  if(s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function converterLinha(o){
  const r = {};
  Object.entries(MAPA_COLUNAS).forEach(([k, campo]) => { if(k in o) r[campo] = o[k]; });
  const id = numBR(r.id); if(!id) return null;
  r.id = Math.round(id);
  NUMERICOS.forEach(c => { if(c in r){ r[c] = numBR(r[c]); if(ZERO_E_VAZIO.includes(c) && r[c] === 0) r[c] = null; } });
  INTEIROS.forEach(c => { if(c in r){ const n = numBR(r[c]); r[c] = n == null ? null : Math.round(n); } });
  ['nome','endereco','numero','cep','distrito','cidade','uf','classe','perfil','regiao_colliers','classe_colliers','auditorio','gerador',
   'heliponto','ar_condicionado','piso','forro','green_building','status','categoria_uso'].forEach(c => {
    if(c in r){ const t = r[c] == null ? '' : String(r[c]).trim(); r[c] = t ? t : null; }
  });
  if(r.cep){ const d = r.cep.replace(/\D/g, ''); if(d.length >= 7 && d.length <= 8){ const p = d.padStart(8, '0'); r.cep = p.slice(0, 5) + '-' + p.slice(5); } }
  if(r.data_atualizacao){
    const t = String(r.data_atualizacao).trim();
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    const b = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    r.data_atualizacao = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}-03:00`
                       : b ? `${b[3]}-${b[2]}-${b[1]}T${b[4] || '00'}:${b[5] || '00'}:00-03:00` : null;
  }
  return r;
}
async function lerPlanilha(file){
  const buf = await file.arrayBuffer();
  const ini = new TextDecoder('latin1').decode(buf.slice(0, 4000));
  let linhas;
  if(/<html|<table/i.test(ini)){
    const enc = /charset=["']?utf-8/i.test(ini) ? 'utf-8' : 'windows-1252';
    const doc = new DOMParser().parseFromString(new TextDecoder(enc).decode(buf), 'text/html');
    linhas = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
  }else{
    const wb = XLSX.read(buf, { type: 'array' });
    linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
  }
  const hi = linhas.findIndex(l => l.some(c => normCab(c || '') === 'id') && l.some(c => normCab(c || '') === 'nome'));
  if(hi < 0) throw new Error('Não encontrei a linha de cabeçalho (colunas ID e Nome).');
  const cab = linhas[hi].map(c => normCab(c || ''));
  return linhas.slice(hi + 1).map(l => { const o = {}; cab.forEach((h, i) => { if(h) o[h] = l[i]; }); return converterLinha(o); }).filter(Boolean);
}
async function importarBase(file){
  if(!file) return;
  $('imp-status').style.display = 'block';
  const barra = $('imp-barra'), txt = $('imp-txt');
  barra.style.width = '0'; txt.textContent = 'Lendo a planilha…';
  try{
    const regs = await lerPlanilha(file);
    if(!regs.length) throw new Error('Nenhum edifício encontrado no arquivo.');
    const agora = new Date().toISOString();
    for(let i = 0; i < regs.length; i += 400){
      const lote = regs.slice(i, i + 400).map(r => ({ ...r, importado_em: agora }));
      const { error } = await db.from('edificios').upsert(lote, { onConflict: 'id' });
      if(error) throw error;
      const feito = Math.min(regs.length, i + 400);
      barra.style.width = (feito / regs.length * 100) + '%';
      txt.textContent = `Gravando ${nfmt(feito)} de ${nfmt(regs.length)} edifícios…`;
    }
    txt.textContent = `Pronto: ${nfmt(regs.length)} edifícios importados ou atualizados.`;
    S.disp = [];
    carregarStatusBase();
  }catch(e){
    console.error(e);
    txt.textContent = 'A importação parou: ' + (e.message || e) + '. Confira o arquivo e tente de novo; o que já foi gravado permanece.';
  }finally{ $('arq-base').value = ''; }
}

/* ==========================================================================
   RESPONSÁVEIS
   ========================================================================== */
let brokerEditando = null;
async function buscarBrokers(){
  const { data, error } = await db.from('brokers').select('*').eq('ativo', true).order('nome');
  if(error) throw error;
  S.brokers = data || [];
  return S.brokers;
}
function avatar(b){ return b.foto_url ? `<img src="${esc(b.foto_url)}" alt="">` : esc(iniciais(b.nome)); }
async function carregarBrokers(){
  const box = $('brokers-lista');
  try{ await buscarBrokers(); }catch(e){ box.innerHTML = '<div class="empty">Não consegui carregar os responsáveis.</div>'; return; }
  box.innerHTML = S.brokers.length ? S.brokers.map(b => `
    <div class="lista-item"><div class="broker" style="border:0;padding:0;flex:1"><div class="av">${avatar(b)}</div>
      <div><b>${esc(b.nome)}</b><span>${esc([b.cargo, b.creci && 'CRECI ' + b.creci].filter(Boolean).join(' · '))}</span><br>
      <span>${esc([b.telefone, b.email].filter(Boolean).join(' · '))}</span></div></div>
      <button class="btn btn-ghost btn-sm" onclick="editarBroker('${b.id}')">Editar</button>
      <button class="btn btn-perigo btn-sm" onclick="desativarBroker('${b.id}')">Remover</button></div>`).join('')
    : '<div class="empty">Nenhum responsável cadastrado. Use o formulário ao lado.</div>';
}
function limparBroker(){ brokerEditando = null; ['br-nome','br-cargo','br-creci','br-tel','br-email','br-foto'].forEach(i => $(i).value = ''); $('bk-form-tit').textContent = 'Novo responsável'; }
function editarBroker(id){
  const b = S.brokers.find(x => x.id === id); if(!b) return;
  brokerEditando = id;
  $('br-nome').value = b.nome || ''; $('br-cargo').value = b.cargo || ''; $('br-creci').value = b.creci || '';
  $('br-tel').value = b.telefone || ''; $('br-email').value = b.email || ''; $('br-foto').value = '';
  $('bk-form-tit').textContent = 'Editando ' + b.nome;
}
async function salvarBroker(){
  const nome = $('br-nome').value.trim();
  if(!nome) return toast('Preencha o nome do responsável.');
  const btn = $('btn-br'); btn.disabled = true; btn.textContent = 'Salvando…';
  try{
    const p = { nome, cargo: $('br-cargo').value.trim() || null, creci: $('br-creci').value.trim() || null,
                telefone: $('br-tel').value.trim() || null, email: $('br-email').value.trim() || null };
    const f = $('br-foto').files[0];
    if(f) p.foto_url = await enviarImagem(f, 'brokers', 600);
    const { error } = brokerEditando ? await db.from('brokers').update(p).eq('id', brokerEditando) : await db.from('brokers').insert(p);
    if(error) throw error;
    toast('Responsável salvo.'); limparBroker(); carregarBrokers();
  }catch(e){ toast('Não salvou: ' + (e.message || e), 4000); }
  finally{ btn.disabled = false; btn.textContent = 'Salvar responsável'; }
}
async function desativarBroker(id){
  if(!confirm('Remover este responsável da lista? Os estudos antigos continuam com ele.')) return;
  await db.from('brokers').update({ ativo: false }).eq('id', id);
  carregarBrokers();
}

async function initResponsavel(){
  const grid = $('broker-grid');
  try{ await buscarBrokers(); }catch(e){ grid.innerHTML = '<div class="empty">Não consegui carregar os responsáveis.</div>'; return; }
  if(!S.brokers.length){ grid.innerHTML = '<div class="empty">Nenhum responsável cadastrado ainda. Clique em "Cadastrar responsável".</div>'; $('btn-resp').disabled = true; return; }
  S.brokersSel = S.brokersSel.filter(id => S.brokers.some(b => b.id === id));
  renderBrokerGrid();
}
function renderBrokerGrid(){
  $('broker-grid').innerHTML = S.brokers.map(b => {
    const i = S.brokersSel.indexOf(b.id);
    return `<button class="broker ${i >= 0 ? 'on' : ''}" onclick="toggleBroker('${b.id}')">
      <div class="av">${avatar(b)}</div><div><b>${esc(b.nome)}</b><span>${esc(b.cargo || '')}</span></div>
      ${i >= 0 ? `<span class="ord">${i === 0 ? 'principal' : i + 1}</span>` : ''}</button>`;
  }).join('');
  $('btn-resp').disabled = !S.brokersSel.length;
}
function toggleBroker(id){
  const i = S.brokersSel.indexOf(id);
  if(i >= 0) S.brokersSel.splice(i, 1); else S.brokersSel.push(id);
  renderBrokerGrid();
}
function salvarResponsavel(){ if(S.brokersSel.length) go('capa'); }

/* ==========================================================================
   CAPA
   ========================================================================== */
function initCapa(reset){
  const d = $('inp-dia'), m = $('inp-mes'), a = $('inp-ano');
  if(!d.options.length){
    for(let i = 1; i <= 31; i++) d.add(new Option(String(i).padStart(2, '0'), i));
    MESES.forEach((n, i) => m.add(new Option(n, i + 1)));
    const y = new Date().getFullYear();
    for(let i = y - 1; i <= y + 2; i++) a.add(new Option(i, i));
    reset = true;
  }
  if(reset === true){ const h = new Date(); d.value = h.getDate(); m.value = h.getMonth() + 1; a.value = h.getFullYear(); }
  atualizarCapa();
}
function atualizarCapa(){
  $('prev-cliente').textContent = $('inp-cliente').value.trim() || '—';
  $('prev-data').textContent = MESES[$('inp-mes').value - 1] + ', ' + $('inp-ano').value;
}
async function salvarCapa(){
  const cliente = $('inp-cliente').value.trim();
  if(!cliente) return toast('Digite o nome do cliente.');
  const btn = $('btn-capa'); btn.disabled = true; btn.textContent = 'Salvando…';
  const p = { cliente, nome_capa_cliente: cliente, data_dia: +$('inp-dia').value, data_mes: +$('inp-mes').value, data_ano: +$('inp-ano').value,
              broker_principal_id: S.brokersSel[0] || null, brokers_extra: S.brokersSel.slice(1), updated_at: new Date().toISOString() };
  try{
    if(S.id){ const { error } = await db.from('site_selections').update(p).eq('id', S.id); if(error) throw error; }
    else{ const { data, error } = await db.from('site_selections').insert({ ...p, status: 'rascunho' }).select().single(); if(error) throw error; S.id = data.id; }
    go('regioes');
  }catch(e){ toast('Não salvou: ' + (e.message || e), 4000); }
  finally{ btn.disabled = false; btn.textContent = 'Salvar e continuar'; }
}

/* ==========================================================================
   REGIÕES
   ========================================================================== */
const abertos = new Set();
async function initRegioes(){
  if(!S.disp.length){
    $('lista-regioes').innerHTML = '<div class="empty">Carregando regiões…</div>';
    const { data, error } = await db.rpc('disponibilidade_por_regiao');
    if(error){ $('lista-regioes').innerHTML = '<div class="empty">Não consegui carregar as regiões.</div>'; return; }
    S.disp = data || [];
  }
  if(!S.disp.length){ $('lista-regioes').innerHTML = '<div class="empty">Nenhum prédio com área vaga na base. Importe a planilha em Base de edifícios.</div>'; }
  else renderRegioes();
  renderSelRegioes();
}
function renderRegioes(){
  const f = normCab($('busca-regiao').value || '');
  const porUF = {};
  S.disp.forEach(r => {
    if(f && !normCab(r.regiao + r.cidade).includes(f)) return;
    ((porUF[r.uf] = porUF[r.uf] || {})[r.cidade] = porUF[r.uf][r.cidade] || []).push(r);
  });
  const ufs = Object.keys(porUF).sort();
  if(!ufs.length){ $('lista-regioes').innerHTML = '<div class="empty">Nenhuma região com esse nome.</div>'; return; }
  $('lista-regioes').innerHTML = ufs.map(uf => {
    const cids = porUF[uf], tot = Object.values(cids).flat().reduce((s, r) => s + Number(r.qtd), 0);
    const nSel = S.regioes.filter(r => r.uf === uf).length;
    return `<div class="acc ${abertos.has(uf) || f ? 'open' : ''}" data-uf="${uf}">
      <button class="acc-h" onclick="toggleUF('${uf}')">${esc(UF_NOME[uf] || uf)} <small>${nfmt(tot)} prédios com vaga${nSel ? ' · ' + nSel + ' selecionada(s)' : ''}</small></button>
      <div class="acc-b">${Object.keys(cids).sort().map(c => `
        <div class="cid"><div class="cid-h">${esc(c)} <button onclick="selecionarCidade('${uf}', this.dataset.c)" data-c="${esc(c)}">selecionar todas</button></div>
        ${cids[c].sort((a, b) => b.qtd - a.qtd).map(r => {
          const i = S.regioes.findIndex(x => chaveReg(x) === chaveReg(r));
          return `<button class="chip ${i >= 0 ? 'on' : ''}" data-k="${esc(chaveReg(r))}" onclick="toggleRegiao(this.dataset.k)">
            ${i >= 0 ? `<span class="ord">${i + 1}</span>` : ''}${esc(r.regiao)} <small>${r.qtd} · até ${nfmt(r.max_vaga)} m²</small></button>`;
        }).join('')}</div>`).join('')}</div></div>`;
  }).join('');
}
function toggleUF(uf){ abertos.has(uf) ? abertos.delete(uf) : abertos.add(uf); renderRegioes(); }
function toggleRegiao(k){
  const i = S.regioes.findIndex(x => chaveReg(x) === k);
  if(i >= 0) S.regioes.splice(i, 1);
  else{ const r = S.disp.find(x => chaveReg(x) === k); if(r) S.regioes.push({ uf: r.uf, cidade: r.cidade, regiao: r.regiao }); }
  renderRegioes(); renderSelRegioes();
}
function selecionarCidade(uf, cidade){
  const regs = S.disp.filter(r => r.uf === uf && r.cidade === cidade);
  const todas = regs.every(r => S.regioes.some(x => chaveReg(x) === chaveReg(r)));
  if(todas) S.regioes = S.regioes.filter(x => !(x.uf === uf && x.cidade === cidade));
  else regs.forEach(r => { if(!S.regioes.some(x => chaveReg(x) === chaveReg(r))) S.regioes.push({ uf, cidade, regiao: r.regiao }); });
  renderRegioes(); renderSelRegioes();
}
function renderSelRegioes(){
  $('regioes-sel').innerHTML = S.regioes.length ? S.regioes.map((r, i) =>
    `<li><span>${esc(r.regiao)} <small>${esc(r.cidade)}/${r.uf}</small></span>
      ${i > 0 ? `<button title="Subir" style="color:var(--navy)" onclick="moverRegiao(${i},-1)">↑</button>` : ''}
      <button title="Remover" onclick="toggleRegiao(this.dataset.k)" data-k="${esc(chaveReg(r))}">×</button></li>`).join('')
    : '<div class="empty">Clique nas regiões à esquerda.</div>';
  $('btn-regioes').disabled = !S.regioes.length;
}
function moverRegiao(i, d){ const [r] = S.regioes.splice(i, 1); S.regioes.splice(i + d, 0, r); renderRegioes(); renderSelRegioes(); }
async function salvarRegioes(){
  if(!S.id) return toast('Estudo não encontrado. Volte ao passo da capa.');
  const btn = $('btn-regioes'); btn.disabled = true; btn.textContent = 'Salvando…';
  const { error } = await db.from('site_selections').update({
    regioes: S.regioes.map((r, i) => ({ estado: r.uf, cidade: r.cidade, regiao: r.regiao, ordem: i + 1 })),
    estados: [...new Set(S.regioes.map(r => r.uf))], updated_at: new Date().toISOString() }).eq('id', S.id);
  btn.disabled = false; btn.textContent = 'Salvar e continuar';
  if(error) return toast('Não salvou: ' + error.message, 4000);
  go('demanda');
}

/* ==========================================================================
   DEMANDA E BUSCA
   ========================================================================== */
const tolerancia = d => Math.min(2000, Math.max(500, Math.round(d * 0.10)));
function faixaDe(demanda, min, max){
  demanda = Number(demanda) || 0; min = Number(min) || 0; max = Number(max) || 0;
  if(!demanda && !min && !max) return { lo: 0.01, hi: Infinity, demanda: 0, manual: false, livre: true };
  const tol = demanda ? tolerancia(demanda) : 0;
  const lo = min || (demanda ? Math.max(0.01, demanda - tol) : 0.01);
  const hi = max || Infinity;
  return { demanda, lo, hi, manual: !!(min || max) };
}
function faixaAtual(){ return faixaDe($('inp-demanda').value, $('inp-area-min').value, $('inp-area-max').value); }
function faixaTxt(f){
  if(f.livre) return 'qualquer prédio com área vaga';
  if(f.hi === Infinity) return 'área vaga a partir de ' + nfmt(f.lo) + ' m²';
  return 'área vaga de ' + nfmt(f.lo) + ' a ' + nfmt(f.hi) + ' m²';
}
function previaFaixa(){
  const d = +$('inp-demanda').value || 0;
  $('inp-area-min').placeholder = d ? 'auto: ' + nfmt(Math.max(0, d - tolerancia(d))) : 'mínimo';
  $('previa-faixa').textContent = 'A busca vai considerar ' + faixaTxt(faixaAtual()) + '.';
}
function initDemanda(){
  const cls = S.filtros.classes || [];
  $('f-classes').innerHTML = CLASSES.map(c => `<button class="chip ${cls.includes(c) ? 'on' : ''}" onclick="toggleClasse('${c}')">${c}</button>`).join('');
  $('demanda-regioes').textContent = S.regioes.map(r => r.regiao + ' (' + r.cidade + '/' + r.uf + ')').join(' · ') || '—';
  previaFaixa();
}
function toggleClasse(c){
  const l = S.filtros.classes = S.filtros.classes || [];
  const i = l.indexOf(c); i >= 0 ? l.splice(i, 1) : l.push(c);
  initDemanda();
}
const RANK_CLASSE = { AAA: 0, AA: 1, A: 2, BB: 3, B: 4, C: 5 };
/* total só faz sentido com aluguel informado; sem ele, a planilha soma só condomínio + IPTU */
const totalDe = e => e.preco_medio ? (e.total || (e.preco_medio + (e.condominio || 0) + (e.iptu || 0))) : null;

async function buscarImoveis(){
  if(!S.regioes.length) return toast('Escolha ao menos uma região.');
  carregando(true, 'Buscando edifícios…');
  try{
    const f = faixaAtual(), precoMax = parseFloat($('inp-preco').value) || 0;
    const fl = { classes: S.filtros.classes || [], piso: $('f-piso').checked, gerador: $('f-gerador').checked, ar: $('f-ar').checked,
                 green: $('f-green').checked, obra: $('f-obra').checked, semPreco: $('f-sempreco').checked };
    S.filtros = fl;
    const chaves = new Set(S.regioes.map(chaveReg));
    const ordem = {}; S.regioes.forEach((r, i) => ordem[chaveReg(r)] = i);
    let eds = await emLotes('edificios', 'regiao', S.regioes.map(r => r.regiao));
    eds = eds.filter(e => chaves.has(chaveReg(e)) && (e.area_vaga || 0) >= f.lo && (e.area_vaga || 0) <= f.hi)
      .filter(e => !fl.classes.length || fl.classes.includes((e.classe || '').toUpperCase()))
      .filter(e => !fl.piso || /piso elevado/i.test(e.piso || ''))
      .filter(e => !fl.gerador || (!nada(e.gerador)))
      .filter(e => !fl.ar || /^central/i.test(e.ar_condicionado || ''))
      .filter(e => !fl.green || /sim/i.test(e.green_building || ''))
      .filter(e => fl.obra || !/constru|projeto/i.test(e.status || ''))
      .filter(e => { const t = totalDe(e); if(!precoMax) return true; return t ? t <= precoMax : fl.semPreco; });
    eds.sort((a, b) => (ordem[chaveReg(a)] - ordem[chaveReg(b)]) || ((RANK_CLASSE[a.classe] ?? 9) - (RANK_CLASSE[b.classe] ?? 9))
      || ((totalDe(a) || 1e9) - (totalDe(b) || 1e9)));

    const antes = {}; S.resultado.forEach(r => antes[r.e.id] = r);
    const novos = eds.map(e => ({ e, incluido: antes[e.id] ? antes[e.id].incluido : false, temp: antes[e.id] ? antes[e.id].temp : {} }));
    const ids = new Set(eds.map(e => e.id));
    S.resultado.filter(r => r.incluido && !ids.has(r.e.id)).forEach(r => novos.push({ ...r, foraDoFiltro: true }));
    S.resultado = novos;
    await carregarExtras(S.resultado.map(r => r.e.id));
    S.aberto = null;
    go('selecao');
  }catch(e){ console.error(e); toast('A busca falhou: ' + (e.message || e), 4000); }
  finally{ carregando(false); }
}
async function carregarExtras(ids){
  S.perm = {}; S.fotos = {};
  if(!ids.length) return;
  const [ovs, fts] = await Promise.all([emLotes('lamina_overrides', 'edificio_id', ids), emLotes('fotos', 'edificio_id', ids)]);
  ovs.forEach(o => (S.perm[o.edificio_id] = S.perm[o.edificio_id] || {})[o.campo] = o.valor);
  fts.sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)).forEach(f => (S.fotos[f.edificio_id] = S.fotos[f.edificio_id] || []).push(f));
}

/* ==========================================================================
   VALORES DA LÂMINA (planilha + edição gravada + edição do estudo)
   ========================================================================== */
const CAMPOS = [
  ['nome','Nome do edifício'], ['endereco','Endereço (sem CEP)'], ['regiao','Região'], ['destaque','Destaque na foto (ex.: Andar inteiro)'],
  ['laje','Laje tipo'], ['ar','Ar-condicionado'], ['piso','Piso'], ['gerador','Gerador'], ['elevadores','Elevadores'], ['leed','Certificação LEED / Green Building'],
  ['classe','Classe'], ['area_total','Área locável total'], ['area_vaga','Área disponível'], ['conjuntos','Conjuntos disponíveis'],
  ['vagas','Vagas de garagem'], ['pe_direito','Pé-direito'], ['status','Status'],
  ['aluguel','Aluguel pedido (R$/m²/mês)'], ['condominio','Condomínio (R$/m²/mês)'], ['iptu','IPTU (R$/m²/mês)'], ['total','Total (R$/m²/mês)']
];
const STATUS_TXT = { 'Pronto para Ocupação': 'Disponibilidade imediata', 'Em Construção': 'Em construção', 'Em Projeto': 'Em projeto', 'Em Construção (Retrofit)': 'Em retrofit' };
function valoresPadrao(e){
  const txt = v => nada(v) ? null : v;
  const precoTxt = e.preco_medio ? brl(e.preco_medio) + (e.preco_min && e.preco_max && e.preco_min !== e.preco_max ? ` (de ${nfmt(e.preco_min, 2)} a ${nfmt(e.preco_max, 2)})` : '') : null;
  return {
    nome: e.nome, endereco: [e.endereco, e.numero].filter(Boolean).join(', '),
    regiao: [e.regiao, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · '), destaque: null,
    laje: m2(e.area_andar_tipo), ar: txt(e.ar_condicionado), piso: txt(e.piso), gerador: txt(e.gerador), elevadores: null,
    leed: /sim/i.test(e.green_building || '') ? 'Green Building' : (/n[aã]o/i.test(e.green_building || '') ? 'Não possui' : null),
    classe: e.classe, area_total: m2(e.area_locavel_total), area_vaga: m2(e.area_vaga),
    conjuntos: e.conjuntos_disponiveis != null ? nfmt(e.conjuntos_disponiveis) + (e.conjuntos ? ' de ' + nfmt(e.conjuntos) : '') : null,
    vagas: e.vagas_total ? nfmt(e.vagas_total) : null, pe_direito: e.pe_direito ? nfmt(e.pe_direito, 2) + ' m' : null,
    status: STATUS_TXT[e.status] || e.status, aluguel: precoTxt, condominio: brl(e.condominio), iptu: brl(e.iptu), total: brl(totalDe(e))
  };
}
function valores(r){
  const v = valoresPadrao(r.e), p = S.perm[r.e.id] || {}, t = r.temp || {};
  Object.keys(v).forEach(k => { if(p[k] != null && p[k] !== '') v[k] = p[k]; if(t[k] != null && t[k] !== '') v[k] = t[k]; });
  return v;
}
const valOuNI = v => (v == null || v === '') ? `<span class="ni">${NI}</span>` : esc(v);
const CHECKLIST = [['laje','Laje tipo'], ['ar','Ar-condicionado'], ['piso','Piso'], ['gerador','Gerador'], ['elevadores','Elevadores'], ['leed','Certificação']];

/* ==========================================================================
   PASSO 5 · SELEÇÃO
   ========================================================================== */
let mapaLeaf = null, camadaPins = null;
function renderSelecao(){
  const res = S.resultado;
  const nSel = res.filter(r => r.incluido).length;
  $('res-resumo').innerHTML = `<b>${res.length}</b> edifício(s) encontrados · <b>${nSel}</b> no estudo · ${faixaTxt(faixaAtual())}`;
  if(!res.length){
    $('res-tabela').innerHTML = '<div class="form-col empty">Nenhum edifício atende aos filtros. Volte e amplie a faixa de área, o preço ou as exigências.</div>';
    desenharMapa(); return;
  }
  let regAtual = null, linhas = '';
  const dem = +$('inp-demanda').value || 0;
  res.forEach((r, i) => {
    const e = r.e, k = r.foraDoFiltro ? '__fora' : chaveReg(e);
    if(k !== regAtual){ regAtual = k; linhas += `<tr class="reg"><td colspan="9">${r.foraDoFiltro ? 'Mantidos do estudo salvo (fora dos filtros atuais)' : esc(e.regiao + ' · ' + e.cidade + '/' + e.uf)}</td></tr>`; }
    const v = valores(r), andares = dem && e.area_andar_tipo ? Math.ceil(dem / e.area_andar_tipo) : null;
    linhas += `<tr class="${r.incluido ? 'sel' : ''}">
      <td><input type="checkbox" ${r.incluido ? 'checked' : ''} onchange="toggleImovel(${i}, this.checked)" aria-label="Incluir"></td>
      <td><div class="nome">${esc(v.nome)}</div><div class="sub">${esc(v.endereco)}</div></td>
      <td><span class="tag cls">${esc(e.classe || '—')}</span> ${/constru|projeto/i.test(e.status || '') ? `<span class="tag ob">${esc(STATUS_TXT[e.status] || e.status)}</span>` : ''}</td>
      <td class="num">${nfmt(e.area_vaga) || '—'}</td>
      <td class="num">${nfmt(e.area_andar_tipo) || '—'}${andares ? `<div class="sub">≈ ${andares} andar${andares > 1 ? 'es' : ''}</div>` : ''}</td>
      <td class="num">${e.preco_medio ? nfmt(e.preco_medio, 2) : '—'}</td>
      <td class="num"><b>${totalDe(e) ? nfmt(totalDe(e), 2) : '—'}</b></td>
      <td>${(S.fotos[e.id] || []).length ? `<span class="tag">${S.fotos[e.id].length} foto(s)</span>` : ''}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="abrirLamina(${i})">${S.aberto === i ? 'Fechar' : 'Lâmina'}</button></td></tr>`;
    if(S.aberto === i) linhas += `<tr class="lam-row"><td colspan="9"><div class="lam-wrap">${laminaHTML(r, i)}</div></td></tr>`;
  });
  $('res-tabela').innerHTML = `<div style="overflow-x:auto"><table class="tabela"><thead><tr><th></th><th>Edifício</th><th>Classe</th>
    <th class="num">Área vaga (m²)</th><th class="num">Laje tipo (m²)</th><th class="num">Aluguel (R$/m²)</th><th class="num">Total (R$/m²)</th><th></th><th></th></tr></thead>
    <tbody>${linhas}</tbody></table></div>`;
  desenharMapa();
}
function desenharMapa(){
  if(!mapaLeaf){
    mapaLeaf = L.map('mapa-resultado', { scrollWheelZoom: false }).setView([-23.55, -46.63], 11);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(mapaLeaf);
  }
  setTimeout(() => mapaLeaf.invalidateSize(), 50);
  if(camadaPins) camadaPins.remove();
  camadaPins = L.layerGroup().addTo(mapaLeaf);
  const pts = [];
  let n = 0;
  S.resultado.forEach((r, i) => {
    const e = r.e; if(!e.lat || !e.lng) return;
    const num = r.incluido ? ++n : null;
    const ic = L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<div style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 11px Inter,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);background:${r.incluido ? '#1C54F4' : '#8A97A8'};color:#fff">${num || ''}</div>` });
    L.marker([e.lat, e.lng], { icon: ic, zIndexOffset: r.incluido ? 1000 : 0 }).addTo(camadaPins)
      .bindTooltip(`<b>${esc(e.nome)}</b><br>${nfmt(e.area_vaga) || 0} m² vagos · classe ${esc(e.classe || '—')}`)
      .on('click', () => abrirLamina(i, true));
    pts.push([e.lat, e.lng]);
  });
  if(pts.length) mapaLeaf.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });
}
function toggleImovel(i, on){ S.resultado[i].incluido = on; renderSelecao(); }
function marcarTodos(on){ S.resultado.forEach(r => r.incluido = on); renderSelecao(); }
function abrirLamina(i, rolar){
  S.aberto = S.aberto === i && !rolar ? null : i;
  renderSelecao();
  if(rolar){ const el = document.querySelector('.lam-row'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function laminaHTML(r, i){
  const v = valores(r), e = r.e, fotos = S.fotos[e.id] || [];
  const dem = +$('inp-demanda').value || 0, tot = totalDe(e);
  const estimativa = dem && tot && !(r.temp || {}).total && !(S.perm[e.id] || {}).total ? brl(dem * tot) : null;
  const editado = Object.keys(S.perm[e.id] || {}).length, editTemp = Object.keys(r.temp || {}).length;
  const mapaUrl = e.lat && e.lng ? `https://www.google.com/maps?q=${e.lat},${e.lng}` : null;
  return `<div class="lamina">
    <div>
      <div class="lam-tit">${esc(v.nome)}</div>
      <div class="lam-end">${valOuNI(v.endereco)}</div>
      <div class="lam-reg">${valOuNI(v.regiao)}</div>
      <div class="lam-midia">
        <div style="${fotos[0] ? `background-image:url('${esc(fotos[0].url)}')` : ''}" class="${fotos[0] ? '' : 'vazio'}">
          ${fotos[0] ? '' : 'Sem foto. Envie abaixo a fachada do prédio.'}${v.destaque ? `<div class="lam-dest">${esc(v.destaque)}</div>` : ''}</div>
        <div class="${e.lat ? '' : 'vazio'}" id="minimapa-${i}">${e.lat ? '' : 'Sem coordenadas'}</div>
      </div>
      <div class="fotos">
        ${fotos.map(f => `<div class="th" style="background-image:url('${esc(f.url)}')"><button title="Remover foto" onclick="removerFoto('${f.id}', ${i})">×</button></div>`).join('')}
        <label>+ Enviar fotos<input type="file" accept="image/*" multiple onchange="enviarFotos(${i}, this.files)"></label>
      </div>
      <div class="lam-acoes">
        <button class="btn btn-primary btn-sm" onclick="abrirEdicao(${i})">Editar lâmina</button>
        ${mapaUrl ? `<a class="btn btn-ghost btn-sm" href="${mapaUrl}" target="_blank" rel="noopener" style="text-decoration:none">Abrir no Google Maps</a>` : ''}
        <label class="check" style="padding:5px 10px"><input type="checkbox" ${r.incluido ? 'checked' : ''} onchange="toggleImovel(${i}, this.checked)"> Incluir no estudo</label>
      </div>
      ${editado || editTemp ? `<div class="selo-ed">${editado ? editado + ' campo(s) com edição gravada' : ''}${editado && editTemp ? ' · ' : ''}${editTemp ? editTemp + ' campo(s) editados só neste estudo' : ''}</div>` : ''}
      <div class="hint">Dados da planilha atualizados em ${e.data_atualizacao ? new Date(e.data_atualizacao).toLocaleDateString('pt-BR') : '—'}.</div>
    </div>
    <div class="painel">
      <h4>Características</h4>
      ${CHECKLIST.map(([k, l]) => `<div class="ck"><span>${l}: <b>${valOuNI(v[k])}</b></span></div>`).join('')}
      <h4 style="margin-top:14px">Quadro de áreas</h4>
      ${[['classe','Classe'],['area_total','Área locável total'],['area_vaga','Área disponível'],['conjuntos','Conjuntos disponíveis'],['vagas','Vagas de garagem'],['pe_direito','Pé-direito'],['status','Status']]
        .map(([k, l]) => `<div class="kv"><span>${l}</span><b>${valOuNI(v[k])}</b></div>`).join('')}
      <h4 style="margin-top:14px">Valores pedidos (R$/m²/mês)</h4>
      ${[['aluguel','Aluguel'],['condominio','Condomínio'],['iptu','IPTU']].map(([k, l]) => `<div class="kv"><span>${l}</span><b>${valOuNI(v[k])}</b></div>`).join('')}
      <div class="kv tot"><span>Total</span><b>${valOuNI(v.total)}</b></div>
      ${estimativa ? `<div class="kv"><span>Estimativa mensal para ${nfmt(dem)} m²</span><b>${estimativa}</b></div>` : ''}
    </div>
  </div>`;
}
const _miniMapas = {};
new MutationObserver(() => {
  document.querySelectorAll('[id^="minimapa-"]').forEach(el => {
    if(el.dataset.ok || el.classList.contains('vazio')) return;
    el.dataset.ok = 1;
    const r = S.resultado[+el.id.split('-')[1]]; if(!r) return;
    const m = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false }).setView([r.e.lat, r.e.lng], 16);
    L.tileLayer(TILE_URL, { subdomains: 'abcd' }).addTo(m);
    L.circleMarker([r.e.lat, r.e.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#1C54F4', fillOpacity: 1 }).addTo(m);
  });
}).observe(document.body, { childList: true, subtree: true });

/* ---------- edição ---------- */
function abrirEdicao(i){
  S.editando = i;
  const r = S.resultado[i], v = valores(r), pad = valoresPadrao(r.e);
  $('ed-tit').textContent = 'Editar lâmina · ' + r.e.nome;
  $('ed-campos').innerHTML = `<div class="grid2">${CAMPOS.map(([k, l]) => `
    <div class="field" style="margin-bottom:10px"><label for="ed-${k}">${l}</label>
    <input type="text" id="ed-${k}" value="${esc(v[k] != null && v[k] !== pad[k] ? v[k] : '')}" placeholder="${esc(pad[k] || NI)}"></div>`).join('')}</div>`;
  $('modal-ed').classList.add('on');
}
function fecharModal(){ $('modal-ed').classList.remove('on'); }
async function salvarEdicao(modo){
  const r = S.resultado[S.editando]; if(!r) return;
  const novos = {};
  CAMPOS.forEach(([k]) => { const val = $('ed-' + k).value.trim(); if(val) novos[k] = val; });
  if(modo === 'temp'){ r.temp = novos; fecharModal(); renderSelecao(); return toast('Edição aplicada só neste estudo.'); }
  try{
    const atuais = S.perm[r.e.id] || {};
    const remover = Object.keys(atuais).filter(k => !(k in novos));
    if(remover.length){ const { error } = await db.from('lamina_overrides').delete().eq('edificio_id', r.e.id).in('campo', remover); if(error) throw error; }
    const linhas = Object.entries(novos).map(([campo, valor]) => ({ edificio_id: r.e.id, campo, valor, updated_at: new Date().toISOString() }));
    if(linhas.length){ const { error } = await db.from('lamina_overrides').upsert(linhas, { onConflict: 'edificio_id,campo' }); if(error) throw error; }
    S.perm[r.e.id] = novos; r.temp = {};
    fecharModal(); renderSelecao(); toast('Edição gravada para os próximos estudos.');
  }catch(e){ toast('Não gravou: ' + (e.message || e), 4000); }
}
async function restaurarLamina(){
  const r = S.resultado[S.editando]; if(!r) return;
  if(!confirm('Apagar as edições deste prédio e voltar aos dados da planilha?')) return;
  await db.from('lamina_overrides').delete().eq('edificio_id', r.e.id);
  S.perm[r.e.id] = {}; r.temp = {};
  fecharModal(); renderSelecao(); toast('Lâmina restaurada.');
}

/* ---------- fotos ---------- */
function carregarImg(src){
  return new Promise((ok, erro) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = erro; im.src = src; });
}
async function reduzir(file, max){
  const url = URL.createObjectURL(file);
  try{
    const im = await carregarImg(url);
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.86));
  }finally{ URL.revokeObjectURL(url); }
}
async function enviarImagem(file, pasta, max = 1800){
  const blob = await reduzir(file, max);
  const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' });
  if(error) throw error;
  return db.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;
}
async function enviarFotos(i, files){
  const r = S.resultado[i]; if(!r || !files.length) return;
  carregando(true, 'Enviando fotos…');
  try{
    let ordem = (S.fotos[r.e.id] || []).length;
    for(const f of files){
      const url = await enviarImagem(f, 'edificios/' + r.e.id);
      const { data, error } = await db.from('fotos').insert({ edificio_id: r.e.id, url, ordem: ordem++, tipo: ordem === 1 ? 'fachada' : 'outra' }).select().single();
      if(error) throw error;
      (S.fotos[r.e.id] = S.fotos[r.e.id] || []).push(data);
    }
    renderSelecao();
  }catch(e){ toast('Envio falhou: ' + (e.message || e), 4000); }
  finally{ carregando(false); }
}
async function removerFoto(id, i){
  const r = S.resultado[i]; if(!confirm('Remover esta foto do prédio?')) return;
  const f = (S.fotos[r.e.id] || []).find(x => x.id === id);
  await db.from('fotos').delete().eq('id', id);
  if(f){ const p = f.url.split('/object/public/fotos/')[1]; if(p) await db.storage.from('fotos').remove([decodeURIComponent(p)]); }
  S.fotos[r.e.id] = (S.fotos[r.e.id] || []).filter(x => x.id !== id);
  renderSelecao();
}

/* ---------- finalizar ---------- */
async function finalizarEstudo(){
  const marcados = S.resultado.filter(r => r.incluido);
  if(!marcados.length) return toast('Marque ao menos um edifício.');
  if(!S.id) return toast('Estudo não encontrado. Refaça o passo da capa.');
  carregando(true, 'Salvando estudo…');
  try{
    let { error } = await db.from('site_selection_itens').delete().eq('site_selection_id', S.id);
    if(error) throw error;
    ({ error } = await db.from('site_selection_itens').insert(marcados.map((r, i) => ({
      site_selection_id: S.id, edificio_id: r.e.id, area_m2: r.e.area_vaga, incluido: true, ordem: i + 1, temp_overrides: r.temp || {} }))));
    if(error) throw error;
    ({ error } = await db.from('site_selections').update({
      demanda_m2: +$('inp-demanda').value || null, area_min_m2: +$('inp-area-min').value || null, area_max_m2: +$('inp-area-max').value || null,
      filtro_preco_max: +$('inp-preco').value || null, filtros: S.filtros, status: 'finalizado', updated_at: new Date().toISOString() }).eq('id', S.id));
    if(error) throw error;
    toast('Estudo finalizado com ' + marcados.length + ' edifício(s).');
    go('lista');
  }catch(e){ toast('Não finalizou: ' + (e.message || e), 4000); }
  finally{ carregando(false); }
}

/* ==========================================================================
   LISTA DE ESTUDOS
   ========================================================================== */
async function carregarLista(){
  const box = $('lista-container');
  const { data, error } = await db.from('site_selections').select('*').order('created_at', { ascending: false });
  if(error){ box.textContent = 'Não consegui carregar os estudos.'; return; }
  if(!data.length){ box.innerHTML = 'Nenhum estudo criado ainda.'; return; }
  const itens = await emLotes('site_selection_itens', 'site_selection_id', data.map(s => s.id), 'site_selection_id');
  const qtd = {}; itens.forEach(i => qtd[i.site_selection_id] = (qtd[i.site_selection_id] || 0) + 1);
  if(!S.brokers.length) try{ await buscarBrokers(); }catch(e){}
  box.innerHTML = data.map(s => {
    const br = S.brokers.find(b => b.id === s.broker_principal_id);
    const meta = [s.data_mes ? MESES[s.data_mes - 1] + '/' + s.data_ano : null, qtd[s.id] ? qtd[s.id] + ' edifício(s)' : 'sem edifícios',
      s.demanda_m2 ? nfmt(s.demanda_m2) + ' m²' : null, br ? br.nome : null].filter(Boolean).join(' · ');
    const regs = (s.regioes || []).map(r => r.regiao).join(', ');
    return `<div class="lista-item"><div class="info"><b>${esc(s.cliente || 'Sem cliente')}</b> <span class="st ${s.status}">${s.status}</span>
      <div class="meta">${esc(meta)}${regs ? '<br>' + esc(regs) : ''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="abrirEstudo('${s.id}')">Abrir</button>
      <button class="btn btn-perigo btn-sm" onclick="excluirEstudo('${s.id}', this.dataset.n)" data-n="${esc(s.cliente || '')}">Excluir</button></div>`;
  }).join('');
}
async function excluirEstudo(id, nome){
  if(!confirm('Excluir o estudo de ' + (nome || 'cliente sem nome') + '? Não dá para desfazer.')) return;
  const { error } = await db.from('site_selections').delete().eq('id', id);
  if(error) return toast('Não excluiu: ' + error.message, 4000);
  carregarLista();
}
async function abrirEstudo(id){
  carregando(true, 'Abrindo estudo…');
  try{
    const { data: s, error } = await db.from('site_selections').select('*').eq('id', id).single();
    if(error) throw error;
    resetEstudo();
    S.id = s.id;
    S.brokersSel = [s.broker_principal_id, ...(s.brokers_extra || [])].filter(Boolean);
    S.regioes = (s.regioes || []).map(r => ({ uf: r.estado, cidade: r.cidade, regiao: r.regiao }));
    S.filtros = s.filtros || {};
    $('inp-cliente').value = s.cliente || '';
    if(s.data_dia) $('inp-dia').value = s.data_dia; if(s.data_mes) $('inp-mes').value = s.data_mes; if(s.data_ano) $('inp-ano').value = s.data_ano;
    atualizarCapa();
    $('inp-demanda').value = s.demanda_m2 || ''; $('inp-area-min').value = s.area_min_m2 || ''; $('inp-area-max').value = s.area_max_m2 || '';
    $('inp-preco').value = s.filtro_preco_max || '';
    const fl = S.filtros;
    $('f-piso').checked = !!fl.piso; $('f-gerador').checked = !!fl.gerador; $('f-ar').checked = !!fl.ar; $('f-green').checked = !!fl.green;
    $('f-obra').checked = fl.obra !== false; $('f-sempreco').checked = fl.semPreco !== false;
    const { data: itens } = await db.from('site_selection_itens').select('*').eq('site_selection_id', id).order('ordem');
    if(itens && itens.length){
      const eds = await emLotes('edificios', 'id', itens.map(i => i.edificio_id));
      const porId = {}; eds.forEach(e => porId[e.id] = e);
      S.resultado = itens.filter(i => porId[i.edificio_id]).map(i => ({ e: porId[i.edificio_id], incluido: true, temp: i.temp_overrides || {} }));
      await carregarExtras(S.resultado.map(r => r.e.id));
      if(S.resultado.length < itens.length) toast((itens.length - S.resultado.length) + ' edifício(s) saíram da base e foram retirados do estudo.', 4500);
      go('selecao');
    }else go('capa');
  }catch(e){ toast('Não abriu: ' + (e.message || e), 4000); }
  finally{ carregando(false); }
}

/* ---------- início ---------- */
initCapa(true);
carregarStatusBase();
