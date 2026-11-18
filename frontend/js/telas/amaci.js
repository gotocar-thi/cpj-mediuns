// Tela "Amaci": a pessoa escolhe um orixá e vê, sempre nesta ordem, o nome, os recados, ervas, velas, ponto riscado e fatores.
// O seletor só traz os orixás liberados para a turma de quem está logado (o servidor já manda só esses)
// e abre no último liberado. Quem administra liga "Visível para todos", libera os orixás por turma e escreve os recados.
// Cabeçalho: ícone e o orixá. Bloco do filtro: o seletor de orixás e, para o aluno (e o root, que vê como fica), quem
// está logado, a turma, hoje e o amaci do dia (pelos eventos do tipo Amaci), com a presença: o aluno confirma no dia,
// no terreiro (localização do celular). O admin root marca presença ou falta por turma no bloco Presença nos amacis.

import { estado, pode, visaoAtiva, carregarAmaci, acaoAmaci, confirmarPresencaAmaci, carregarEventosTipos, acaoEventos, avisar } from '../estado.js';
import { esc, toast, hoje, dLong, dDM } from '../util.js';
import { emDemo } from '../auth.js';
import { ORIXAS, ordenarOrixas, ultimoLiberado, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS, ORIENTACAO_VISIVEIS, TERREIRO, RAIO_TERREIRO_M, noTerreiro, distanciaM } from '/shared/amaci.js';

const NOME = Object.fromEntries(ORIXAS.map((o) => [o.k, o]));

// Estado só desta tela (volta ao padrão ao trocar de aba, como o estado.amaci).
const ui = {
  sel: '',              // orixá escolhido ('' = o último liberado)
  config: false,        // bloco ⚙️ Configuração do admin aberto (começa minimizado)
  turmas: new Set(),    // turmas abertas no bloco do admin
  editando: null,       // recado em edição: { orixa, texto }
  pres: false,          // bloco Presença do aluno aberto
  escolha: {},          // amaci de hoje → 'p' (Presente) ou 'a' (Ausente, o padrão)
  confirmando: false,   // pegando a localização / enviando
  presAdm: false,       // bloco Presença nos amacis do root aberto
  presTurma: '',        // turma escolhida no bloco do root ('' = a primeira)
  presEv: null,         // amaci aberto no bloco do root (um por vez; todos começam minimizados)
  presQ: null,          // quadradinho aberto no bloco do root: 'eventoId:p' (presentes) ou 'eventoId:a' (ausentes)
  novo: false,          // formulário "Cadastrar amaci que já passou" aberto (bloco do root)
  adm: false,           // bloco ⚙️ Admin (Configuração + Presenças) aberto (começa minimizado)
  geo: null,            // teste de localização do root: { pegando } ou { ok, dist, prec } ou { erro }
};
export function limpar() {
  ui.sel = '';
  ui.config = false;
  ui.turmas.clear();
  ui.editando = null;
  ui.pres = false;
  ui.escolha = {};
  ui.presAdm = false;
  ui.presTurma = '';
  ui.presEv = null;
  ui.presQ = null;
  ui.novo = false;
  ui.adm = false;
  ui.geo = null;
}

const admin = () => pode('amaci:editar') && !!estado.amaci?.admin;
const ehAluno = () => visaoAtiva() === 'alunos';
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// Item: texto ou [título, [subitens]] (como na apostila).
const lista = (itens) => `<ul class="am-lista">${itens.map((t) => (Array.isArray(t) ? `<li>${esc(t[0])}${lista(t[1])}</li>` : `<li>${esc(t)}</li>`)).join('')}</ul>`;
const linhas = (s) => (s ? s.split('\n').length : 0);

// ---------- admin ----------
function cardAdmin(A) {
  const turmas = A.turmas || [];
  const corpo = turmas.length ? turmas.map((t) => {
    const lib = ordenarOrixas(t.orixas);
    const aberta = ui.turmas.has(t.id);
    const ate = lib.length ? ` · até ${esc(NOME[lib.at(-1)].curto)}` : '';
    return `<div class="am-turma">
      <button class="am-turma-h" data-act="amturma" data-id="${t.id}" aria-expanded="${aberta}">
        <b>${esc(t.nome)}</b><span class="am-turma-x">${lib.length} de ${ORIXAS.length}${ate}<span class="seta" aria-hidden="true">${aberta ? '▴' : '▾'}</span></span>
      </button>
      ${aberta ? `<div class="am-chips">${ORIXAS.map((o) => `<label class="chip"><input type="checkbox" data-act="amlib" data-id="${t.id}" value="${o.k}" ${lib.includes(o.k) ? 'checked' : ''}> ${esc(o.curto)}</label>`).join('')}</div>` : ''}
    </div>`;
  }).join('') : '<p class="muted" style="margin:0">Nenhuma turma de alunos cadastrada (aba Pessoas → Alunos).</p>';
  const lib = turmas.filter((t) => t.orixas.length).length;
  const resumo = `${A.publicada ? 'Visível para todos' : 'Escondida'} · ${lib} de ${turmas.length} ${turmas.length === 1 ? 'turma' : 'turmas'} com orixás`;
  const topo = `<button class="grp-h dobra am-cfg-h" data-act="amconfig" aria-expanded="${ui.config}"><h3><span aria-hidden="true">🌿</span> Orixás e visibilidade</h3><span class="am-turma-x">${ui.config ? '' : `<small>${resumo}</small>`}<span class="seta" aria-hidden="true">${ui.config ? '▴' : '▾'}</span></span></button>`;
  if (!ui.config) return `<div class="am-adm-sec">${topo}</div>`;
  return `<div class="am-adm-sec">${topo}
    <label class="of-sw"><input type="checkbox" role="switch" data-act="ampub" ${A.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Visível para todos</b></label>
    <div class="am-adm-t"><h3>Orixás liberados por turma</h3><span class="muted">Cada turma só vê os orixás marcados.</span></div>
    ${corpo}
  </div>`;
}

// Um bloco ADMIN só, minimizado: a configuração (quem administra a aba) e as presenças (só o root), cada uma dobrável.
function cardAdminAmaci(A) {
  const cfg = admin() ? cardAdmin(A) : '';
  const pres = cardPresencaAdmin(A);
  if (!cfg && !pres) return '';
  const resumo = `${A.publicada ? 'Visível para todos' : 'Escondida'}${pres ? ` · ${plural(A.presencaAdmin.amacis.length, 'amaci realizado', 'amacis realizados')}` : ''}`;
  const cab = `<button class="grp-h dobra am-cfg-h" data-act="amadm" aria-expanded="${ui.adm}"><h2><span aria-hidden="true">⚙️</span> Configuração</h2>
    <span class="am-turma-x">${ui.adm ? '' : `<small>${resumo}</small>`}<span class="seta" aria-hidden="true">${ui.adm ? '▴' : '▾'}</span></span></button>`;
  return `<div class="card adm am-adm">${cab}${ui.adm ? cfg + pres : ''}</div>`;
}

// ---------- pessoa ----------
// Cabeçalho: ícone e título (o orixá escolhido).
function cardCabecalho(info) {
  const titulo = info ? `<span class="eyebrow">Amaci · ${esc(info.trono)}</span><h2>${esc(info.nome)}</h2>` : '<span class="eyebrow">Casa do Pai João</span><h2>Amaci</h2>';
  return `<div class="card am-cab"><div class="am-nome"><span class="am-ico am-ico-g" aria-hidden="true">🙏</span><div>${titulo}</div></div></div>`;
}

// Quem vê a parte da presença no bloco do filtro: o aluno (que confirma) e o root (que vê como fica para o aluno).
const raiz = () => pode('usuarios:gerenciar');
const vePresenca = () => ehAluno() || raiz();

// Bloco do filtro: anterior, a lista dos orixás liberados e o próximo (com mais de um orixá) e, para o aluno e o root,
// a presença do dia com as informações de quem está logado.
function cardFiltro(A, sel) {
  const libs = A.orixas.map((o) => o.k);
  const i = libs.indexOf(sel);
  const filtro = libs.length < 2 ? '' : `<div class="am-filtro-l">
    <button class="btn small pp-ico" data-act="amsel" data-k="${libs[i - 1] || ''}" aria-label="Orixá anterior"${i <= 0 ? ' disabled' : ''}>‹</button>
    <select id="am-orixa" data-act="amescolher" aria-label="Escolher orixá">${A.orixas.map((o) => `<option value="${o.k}"${o.k === sel ? ' selected' : ''}>${esc(NOME[o.k].curto)}</option>`).join('')}</select>
    <button class="btn small pp-ico" data-act="amsel" data-k="${libs[i + 1] || ''}" aria-label="Próximo orixá"${i >= libs.length - 1 ? ' disabled' : ''}>›</button>
    <span class="muted am-filtro-n">${libs.length} de ${ORIXAS.length}</span></div>`;
  const pres = vePresenca() ? areaPresenca(A, sel) : '';
  if (!filtro && !pres) return '';
  return `<div class="card am-filtro">${filtro}${pres}</div>`;
}

const SITUACAO = { p: ['Presente', 'pleno'], f: ['Falta', 're'] };
const selo = (st) => { const [t, c] = SITUACAO[st] || ['Ausente', '']; return `<span class="badge ${c}">${t}</span>`; };

// Amacis do orixá escolhido no filtro: o nome do evento tem o nome do orixá ("Amaci de Oxalá"), sem diferença de acento.
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const APELIDOS = { obaluaye: ['obaluae', 'obaluaie'], loguna: ['logunan'] };
const doOrixa = (a, k) => !k || [semAcento(NOME[k].curto), k, ...(APELIDOS[k] || [])].some((x) => semAcento(a.nome).includes(x));
// Hoje primeiro, depois os próximos (o mais perto antes) e os que já passaram (o mais recente antes).
const ordemAmacis = (l, hojeData) => [...l].sort((a, b) => {
  const g = (x) => (x.data === hojeData ? 0 : x.data > hojeData ? 1 : 2);
  return g(a) - g(b) || (g(a) === 1 ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data));
});

// Um amaci na área do aluno: o status dele (Presente, Falta, Ausente) e, quando ele pode marcar, a escolha e Confirmar:
// hoje (no terreiro) ou o que já passou e foi cadastrado pelo root na aba Amaci (de qualquer lugar).
function linhaAmaci(a, hojeData, aluno) {
  const quando = a.data === hojeData ? 'Hoje' : dDM(a.data);
  const nome = `<span class="am-pres-n"><b>${esc(a.nome)}</b><small class="muted">${quando}</small></span>`;
  if (!aluno) return `<div class="am-pres-dia">${nome}</div>`;
  if (a.data > hojeData) return `<div class="am-pres-dia">${nome}<span class="badge">Em breve</span></div>`;
  const marca = a.status !== 'p' && (a.data === hojeData || a.retroativo);
  if (!marca) return `<div class="am-pres-dia">${nome}${selo(a.status)}</div>`;
  const e = ui.escolha[a.id] || 'a';
  const nota = a.data === hojeData ? 'Confirme dentro do terreiro: o app confere a localização do celular.'
    : 'Amaci cadastrado depois pela administração: você pode marcar a sua presença daqui.';
  return `<div class="am-pres-dia am-pres-hoje">${nome}${selo(a.status)}
    <div class="am-pres-acao">
      <select data-act="amescolha" data-id="${a.id}" aria-label="Sua presença em ${esc(a.nome)}"><option value="a"${e === 'a' ? ' selected' : ''}>Ausente</option><option value="p"${e === 'p' ? ' selected' : ''}>Presente</option></select>
      <button class="btn primary small" data-act="amconfirmar" data-id="${a.id}"${ui.confirmando ? ' disabled' : ''}>${ui.confirmando ? 'Conferindo…' : 'Confirmar'}</button>
    </div><small class="muted am-pres-nota">${nota}</small></div>`;
}

// Presença do aluno no orixá escolhido: cada amaci da turma com o nome do orixá, com o status; o de hoje (de qualquer
// orixá) aparece sempre, para confirmar. O root vê a mesma área, sem status, com o teste de localização.
function areaPresenca(A, sel) {
  const aluno = ehAluno();
  const P = aluno ? A.presenca : A.presencaAdmin;
  const hojeData = P?.hoje || hoje();
  const amacis = P?.amacis || [];
  const doDia = amacis.find((a) => a.data === hojeData);
  const lista = amacis.filter((a) => doOrixa(a, sel));
  if (doDia && !lista.includes(doDia)) lista.push(doDia);
  const prox = aluno ? amacis.find((a) => a.data > hojeData) : null;
  const info = `<ul class="am-cab-info">
    <li><span aria-hidden="true">👤</span><span>${esc(estado.me?.nome || '')}</span></li>
    <li><span aria-hidden="true">🎓</span><span>${aluno ? (A.turmaNome ? esc(A.turmaNome) : 'Sem turma') : 'Admin root'}</span></li>
    <li><span aria-hidden="true">📅</span><span>${esc(dLong(hojeData))}</span></li></ul>`;
  const orixa = sel ? NOME[sel].curto : '';
  let acao = lista.length
    ? `<div class="am-pres-lista">${ordemAmacis(lista, hojeData).map((a) => linhaAmaci(a, hojeData, aluno)).join('')}</div>`
    : `<p class="muted am-pres-nota">Nenhum amaci${orixa ? ` de ${esc(orixa)}` : ''} cadastrado${aluno ? ' para a sua turma' : ''}.</p>`;
  if (!doDia && prox && !lista.includes(prox)) acao += `<p class="muted am-pres-nota">Sem amaci hoje. Próximo amaci: <b>${dDM(prox.data)}</b> · ${esc(prox.nome)}.</p>`;
  if (!aluno) acao += '<p class="muted am-pres-nota">Assim o aluno vê. Ele confirma o de hoje no terreiro; para marcar por ele, use Presenças na Configuração.</p>';
  if (!aluno) acao += testeLocalizacao();
  // Ícone: ✅ presença de hoje confirmada, 🕒 amaci hoje ainda sem confirmar, 📋 sem amaci hoje (ou o root olhando).
  const icone = aluno && doDia?.status === 'p' ? '✅' : aluno && doDia ? '🕒' : '📋';
  return `<div class="am-pres-area"><h3><span aria-hidden="true">${icone}</span> Presença${orixa ? ` · Amaci de ${esc(orixa)}` : ' no amaci'}</h3>${info}${acao}</div>`;
}

// Root: confere se o celular está pegando a localização e se, daqui, o aluno conseguiria confirmar (dentro do terreiro).
function testeLocalizacao() {
  const G = ui.geo;
  const res = !G || G.pegando ? ''
    : G.erro ? `<p class="erro am-pres-nota">${esc(G.erro)}</p>`
    : `<p class="am-geo ${G.ok ? 'ok' : 'fora'}">${G.ok ? '✅ Localização ok: dentro do terreiro' : '📍 Fora do terreiro'} · ${G.dist < 1000 ? `${G.dist} m` : `${(G.dist / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`} do terreiro (limite ${RAIO_TERREIRO_M} m)${G.prec ? ` · precisão ±${G.prec} m` : ''}</p>`;
  return `<div class="am-geo-t"><button class="btn small" data-act="amtestargeo"${G?.pegando ? ' disabled' : ''}>${G?.pegando ? 'Pegando a localização…' : '📍 Testar localização'}</button>${res}</div>`;
}

const pegarLocalizacao = () => new Promise((ok, erro) => {
  if (!navigator.geolocation) { erro({ code: 0 }); return; }
  navigator.geolocation.getCurrentPosition(ok, erro, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
});
const msgGeo = (e) => (e?.code === 1 ? 'Permita a localização para o app no navegador.' : e?.code === 0 ? 'Este aparelho não informa a localização.' : 'Não deu para pegar a localização. Tente de novo.');

// Aluno: o percentual nos amacis já realizados e, aberto, cada amaci com a situação.
function cardPresenca(A) {
  const P = A.presenca;
  if (!ehAluno() || !P) return '';
  const feitos = P.amacis.filter((a) => a.data <= P.hoje).reverse();
  const presentes = feitos.filter((a) => a.status === 'p').length;
  const pct = feitos.length ? Math.round((presentes / feitos.length) * 100) : null;
  const cab = `<button class="grp-h dobra" data-act="ampres" aria-expanded="${ui.pres}"><h2><span aria-hidden="true">📊</span> Minha presença</h2>
    <span class="count">${pct === null ? 'sem amaci ainda' : `${pct}% · ${presentes} de ${feitos.length}`} <span class="seta" aria-hidden="true">${ui.pres ? '▾' : '▸'}</span></span></button>`;
  if (!ui.pres) return `<div class="card am-pres">${cab}</div>`;
  const barra = pct === null ? '' : `<div class="am-pres-barra" role="img" aria-label="${pct}% de presença"><span style="width:${pct}%"></span></div>`;
  const lista = feitos.length
    ? `<ul class="am-pres-l">${feitos.map((a) => `<li><span class="am-pres-n"><b>${esc(a.nome)}</b><small class="muted">${a.data === P.hoje ? 'Hoje · ' : ''}${dDM(a.data)}</small></span>${selo(a.status)}</li>`).join('')}</ul>`
    : '<p class="muted" style="margin:0">Nenhum amaci realizado ainda.</p>';
  return `<div class="card am-pres">${cab}${barra}${lista}</div>`;
}

// Root: escolhe a turma ao lado do título; cada amaci realizado com os quadradinhos Presentes e Ausentes (falta e sem
// registro); tocar abre a lista dos alunos da turma (cadastro de alunos), onde o root marca presença, falta ou ausente.
function cardPresencaAdmin(A) {
  const P = A.presencaAdmin;
  if (!P || !raiz()) return '';
  const turma = P.turmas.find((t) => t.id === ui.presTurma) || P.turmas[0];
  const sel = P.turmas.length ? `<select class="am-padm-t" data-act="ampresturma" aria-label="Turma">${P.turmas.map((t) => `<option value="${t.id}"${t.id === turma.id ? ' selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>` : '';
  const cab = `<div class="am-padm-h"><button class="grp-h dobra am-cfg-h" data-act="ampresadm" aria-expanded="${ui.presAdm}"><h3><span aria-hidden="true">📋</span> Presenças</h3>
    <span class="am-turma-x"><span class="seta" aria-hidden="true">${ui.presAdm ? '▴' : '▾'}</span></span></button>${sel}</div>`;
  if (!ui.presAdm) return `<div class="am-adm-sec">${cab}</div>`;
  if (!turma) return `<div class="am-adm-sec">${cab}<p class="muted" style="margin:0">Cadastre um tipo de evento com Amaci no nome (ex.: T09 - Amaci), marque a turma nele (Admin root → Eventos) e os alunos aparecem aqui.</p></div>`;
  const amacis = P.amacis.filter((ev) => !ev.turmas || ev.turmas.includes(turma.id));
  const novo = blocoNovoAmaci(turma);
  if (!amacis.length) return `<div class="am-adm-sec">${cab}${novo}<p class="muted" style="margin:0">Nenhum amaci da ${esc(turma.nome)} realizado ainda.</p></div>`;
  const alunos = P.alunos.filter((a) => a.turmaId === turma.id);
  if (!alunos.length) return `<div class="am-adm-sec">${cab}<p class="muted" style="margin:0">Nenhum aluno cadastrado na ${esc(turma.nome)}.</p></div>`;
  const corpo = amacis.map((ev) => {
    const m = P.marcas[ev.id] || {};
    const grupos = { p: alunos.filter((a) => m[a.id] === 'p'), a: alunos.filter((a) => m[a.id] !== 'p') };
    const quad = (k, rot, cls) => {
      const ab = ui.presQ === `${ev.id}:${k}`;
      return `<button type="button" class="pf-of-total ${cls}${ab ? ' selecionado' : ''}" data-act="ampresq" data-q="${ev.id}:${k}" aria-expanded="${ab}" ${grupos[k].length ? '' : 'disabled'}><b>${grupos[k].length}</b><span>${rot}</span></button>`;
    };
    const aberto = ui.presQ?.startsWith(ev.id + ':') ? grupos[ui.presQ.slice(-1)] : null;
    const lista = !aberto ? '' : `<div class="am-pres-t">${aberto.map((a) => `<label class="am-pres-a"><span>${esc(a.nome)}</span>
      <select data-act="ampresmarcar" data-ev="${ev.id}" data-aluno="${a.id}" aria-label="Presença de ${esc(a.nome)} em ${esc(ev.nome)}">
        <option value=""${!m[a.id] ? ' selected' : ''}>Ausente</option><option value="p"${m[a.id] === 'p' ? ' selected' : ''}>Presente</option><option value="f"${m[a.id] === 'f' ? ' selected' : ''}>Falta</option></select></label>`).join('')}</div>`;
    // Minimizado: uma linha com o nome, a data e presentes/total; aberto, os quadradinhos e a lista.
    const ab = ui.presEv === ev.id;
    const linha = `<button class="am-turma-h" data-act="ampresev" data-id="${ev.id}" aria-expanded="${ab}">
      <span class="am-padm-ev-n">${esc(ev.nome)}</span>
      <span class="am-turma-x"><small>${ev.data === P.hoje ? 'Hoje' : dDM(ev.data)}</small><span class="am-padm-cont" aria-label="${grupos.p.length} de ${alunos.length} presentes"><b>${grupos.p.length}</b>/${alunos.length}</span><span class="seta" aria-hidden="true">${ab ? '▴' : '▾'}</span></span></button>`;
    if (!ab) return `<div class="am-turma">${linha}</div>`;
    return `<div class="am-turma">${linha}<div class="am-padm-ev">
      <div class="pf-of-totais am-padm-q">${quad('p', 'Presentes', 'am-q-p')}${quad('a', 'Ausentes', 'am-q-a')}</div>${lista}</div></div>`;
  }).join('');
  return `<div class="am-adm-sec">${cab}${novo}<p class="muted am-pres-nota">${esc(turma.nome)} · ${plural(alunos.length, 'aluno', 'alunos')} · ${plural(amacis.length, 'amaci', 'amacis')}</p><div class="am-padm-lista">${corpo}</div></div>`;
}

// Tipos de evento de amaci (com "Amaci" no nome) em que a turma está marcada: é neles que o amaci da turma é cadastrado.
const tiposAmaciDa = (turmaId) => (estado.eventosTipos?.tipos || [])
  .filter((t) => (t.chave === 'amaci' || /amaci/i.test(t.nome)) && (t.turmas || []).includes(turmaId));

// Root: cadastra aqui um amaci que já aconteceu (data digitada, sem calendário), no tipo de amaci da turma escolhida;
// depois marca a presença na lista.
function blocoNovoAmaci(turma) {
  if (!ui.novo) return `<button class="btn small am-novo-bt" data-act="amnovo">＋ Cadastrar amaci que já passou</button>`;
  if (estado.eventosTipos === null) { carregarEventosTipos(); return '<p class="muted am-pres-nota">Carregando os tipos de evento…</p>'; }
  const tipos = tiposAmaciDa(turma.id);
  if (!tipos.length) {
    return `<div class="am-novo"><p class="muted am-pres-nota">A ${esc(turma.nome)} não está marcada em nenhum tipo de amaci. Crie o tipo (ex.: <b>${esc(turma.nome)} - Amaci</b>) em Admin root → Eventos e marque a turma nele.</p>
      <button class="btn small" data-act="amnovocancel">Fechar</button></div>`;
  }
  return `<form id="f-amaci-novo" class="am-novo" autocomplete="off">
    <b>Amaci que já passou · ${esc(turma.nome)}</b>
    <div class="am-novo-l">
      <label class="field">Data<input type="text" name="data" inputmode="numeric" maxlength="10" placeholder="31/10/2026" required></label>
      ${tipos.length > 1 ? `<label class="field">Tipo<select name="tipo">${tipos.map((t) => `<option value="${esc(t.chave)}">${esc(t.nome)}</option>`).join('')}</select></label>` : `<input type="hidden" name="tipo" value="${esc(tipos[0].chave)}">`}
    </div>
    <label class="field">Nome<input type="text" name="nome" maxlength="120" placeholder="Ex.: Amaci de Oxalá" required></label>
    <div class="row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn small" data-act="amnovocancel">Cancelar</button><button class="btn small primary" type="submit">Cadastrar</button></div>
  </form>`;
}

// "31/10/2026", "31/10/26" ou "31/10" (sem o ano: a data mais recente que já passou) → 'AAAA-MM-DD', ou null.
function dataPassada(txt, hojeData) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2}|\d{4}))?$/);
  if (!m) return null;
  const d = Number(m[1]), mes = Number(m[2]);
  const montar = (a) => {
    const x = new Date(Date.UTC(a, mes - 1, d));
    return x.getUTCFullYear() === a && x.getUTCMonth() === mes - 1 && x.getUTCDate() === d ? x.toISOString().slice(0, 10) : null;
  };
  const ano = Number(hojeData.slice(0, 4));
  if (m[3]) return montar(Number(m[3].length === 2 ? '20' + m[3] : m[3]));
  const este = montar(ano);
  return este && este <= hojeData ? este : montar(ano - 1);
}

export async function enviarNovoAmaci(form) {
  const hojeData = estado.amaci?.presencaAdmin?.hoje || hoje();
  const data = dataPassada(form.elements.data.value, hojeData);
  const nome = form.elements.nome.value.replace(/\s+/g, ' ').trim();
  if (!data) { toast('Data inválida. Use o formato 31/10/2026.'); form.elements.data.focus(); return; }
  if (data > hojeData) { toast('Aqui é só para amaci que já passou. Amaci futuro: Admin root → Eventos.'); form.elements.data.focus(); return; }
  if (!nome) { toast('Digite o nome do amaci.'); form.elements.nome.focus(); return; }
  if (await acaoEventos('evento', { data, nome, tipo: form.elements.tipo.value, retroativo: true })) {
    ui.novo = false;
    estado.amaci = null;   // busca de novo: o amaci novo entra na lista para marcar a presença
    toast(`Amaci cadastrado em ${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}. Agora é só marcar a presença.`);
    avisar();
  }
}

// Bloco de conteúdo: ícone na frente do título e o texto da apostila. Sem conteúdo, o bloco não aparece.
const bloco = (cls, icone, titulo, corpo) => `<section class="card am-bloco ${cls}"><div class="am-bloco-h"><span class="am-ico" aria-hidden="true">${icone}</span><h3>${titulo}</h3></div>${corpo}</section>`;

function blocoPontos(o) {
  if (!o.pontos.length) return '';
  return bloco('am-c-ponto', '✴️', 'Ponto Riscado', `<div class="am-pontos${o.pontos.length > 1 ? ' varios' : ''}">${o.pontos.map((p) => `<figure class="am-ponto"><img src="/img/amaci/${esc(p.img)}" alt="${esc(p.legenda || 'Ponto riscado')}" loading="lazy">${p.legenda ? `<figcaption>${esc(p.legenda)}</figcaption>` : ''}</figure>`).join('')}</div>`);
}

// Fatores: o nome do fator em negrito (o que vem antes de ":" ou " – "), o resto como está na apostila.
const fator = (t) => {
  const m = t.match(/^(.+?)(: | – )(.+)$/);
  return `<li>${m ? `<b>${esc(m[1])}</b>${esc(m[2])}${esc(m[3])}` : `<b>${esc(t)}</b>`}</li>`;
};
function blocoFatores(o) {
  if (!o.fatores?.length) return '';
  return bloco('am-c-fator', '✨', 'Fatores', `<ul class="am-fatores">${o.fatores.map(fator).join('')}</ul>`);
}

// Recados: texto livre de quem administra a aba, um por orixá (no banco é a "orientação"). Sem texto, não aparece.
const ICONE_CASA = '<span class="am-ico am-ico-casa" aria-hidden="true"><img src="/img/terreiro.png" alt=""></span>';
function blocoOrientacao(o) {
  const ed = ui.editando?.orixa === o.k ? ui.editando : null;
  if (ed) {
    const n = linhas(ed.texto);
    return `<form class="card am-bloco am-ori" id="f-amaci-ori" data-k="${o.k}" autocomplete="off">
      <div class="am-bloco-h">${ICONE_CASA}<h3>Recados</h3></div>
      <textarea id="am-ori" rows="${ORIENTACAO_VISIVEIS}" maxlength="${ORIENTACAO_LETRAS}" placeholder="Escreva o recado para ${esc(NOME[o.k].nome)}.">${esc(ed.texto)}</textarea>
      <span class="muted am-conta">Cabem até ${ORIENTACAO_LINHAS} linhas (${ORIENTACAO_LETRAS} letras) · <span id="am-ori-n">${n}/${ORIENTACAO_LINHAS} linhas</span></span>
      <div class="row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn" data-act="amoricancel">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`;
  }
  // Sem texto, o bloco não aparece; quem administra vê para poder escrever.
  if (!o.orientacao && !admin()) return '';
  const bt = admin() ? `<button class="btn link small" data-act="amoried">✎ ${o.orientacao ? 'Editar' : 'Escrever'}</button>` : '';
  return `<div class="card am-bloco am-ori"><div class="am-bloco-h">${ICONE_CASA}<h3>Recados</h3>${bt}</div>
    ${o.orientacao ? `<p class="am-ori-txt">${esc(o.orientacao)}</p>` : '<p class="muted" style="margin:0">Sem recado: o bloco fica escondido para a corrente e os alunos.</p>'}</div>`;
}

export function render() {
  if (estado.amaci === null) { carregarAmaci(); return '<div class="loading">Carregando o amaci…</div>'; }
  const A = estado.amaci;
  if (A.erro) return `<div class="card"><p class="erro">${esc(A.erro)}</p><button class="btn" data-act="amrecarregar">Tentar de novo</button></div>`;
  let h = '<section class="panel am-tela">';
  h += cardAdminAmaci(A);
  if (!A.orixas.length) {
    const turma = A.turmaNome ? `da ${esc(A.turmaNome)}` : 'da sua turma';
    return h + cardCabecalho(null) + cardFiltro(A, '') + cardPresenca(A) + `<div class="card"><p class="muted" style="margin:0">Nenhum orixá liberado ainda para os alunos ${turma}.</p></div></section>`;
  }
  const libs = A.orixas.map((o) => o.k);
  const sel = libs.includes(ui.sel) ? ui.sel : ultimoLiberado(libs);
  const o = A.orixas.find((x) => x.k === sel);
  h += cardCabecalho(NOME[sel]) + cardFiltro(A, sel) + cardPresenca(A);
  h += blocoOrientacao(o);
  if (o.ervas.length) h += bloco('am-c-erva', '🌿', 'Ervas', lista(o.ervas));
  if (o.velas.length) h += bloco('am-c-vela', '🕯️', 'Velas', lista(o.velas));
  h += blocoPontos(o);
  h += blocoFatores(o);
  return h + '<p class="muted am-fonte">Fonte: Apostila Orixás da Casa do Pai João.</p></section>';
}

// ---------- eventos ----------
// Recado: não deixa passar de 10 linhas e guarda o texto para um redesenho não apagar.
export function digitando(t) {
  const ls = t.value.split('\n');
  if (ls.length > ORIENTACAO_LINHAS) t.value = ls.slice(0, ORIENTACAO_LINHAS).join('\n');
  if (ui.editando) ui.editando.texto = t.value;
  const n = document.getElementById('am-ori-n');
  if (n) n.textContent = `${linhas(t.value)}/${ORIENTACAO_LINHAS} linhas`;
}

export async function enviar(form) {
  const k = form.dataset.k;
  const texto = document.getElementById('am-ori')?.value ?? '';
  if (await acaoAmaci('orientacao', { orixa: k, texto })) {
    ui.editando = null;
    avisar();
    toast('Recado salvo.');
  }
}

export const cliques = {
  amsel(el) { if (!el.dataset.k) return; ui.sel = el.dataset.k; ui.editando = null; avisar(); },
  ampres() { ui.pres = !ui.pres; avisar(); },
  ampresadm() { ui.presAdm = !ui.presAdm; avisar(); },
  amnovo() { ui.novo = true; avisar(); },
  amadm() { ui.adm = !ui.adm; avisar(); },
  async amtestargeo() {
    ui.geo = { pegando: true };
    avisar();
    try {
      const pos = await pegarLocalizacao();
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      const ok = noTerreiro(lat, lon);
      ui.geo = { ok, dist: Math.round(distanciaM(TERREIRO, { lat, lon })), prec: Math.round(accuracy || 0) };
      toast(ok ? 'Localização ok: dentro do terreiro.' : 'Fora do terreiro.');
    } catch (e) {
      ui.geo = { erro: msgGeo(e) };
      toast(ui.geo.erro);
    }
    avisar();
  },
  amnovocancel() { ui.novo = false; avisar(); },
  ampresq(el) { ui.presQ = ui.presQ === el.dataset.q ? null : el.dataset.q; avisar(); },
  ampresev(el) { ui.presEv = ui.presEv === el.dataset.id ? null : el.dataset.id; ui.presQ = null; avisar(); },
  async amconfirmar(el) {
    const id = el.dataset.id;
    if ((ui.escolha[id] || 'a') !== 'p') { toast('Escolha Presente para confirmar.'); return; }
    const P = estado.amaci?.presenca;
    const a = P?.amacis.find((x) => x.id === id);
    ui.confirmando = true;
    avisar();
    try {
      let lat, lon;
      if (a && a.data < P.hoje) {
        // Amaci que já passou, cadastrado pelo root: sem localização.
        if (await confirmarPresencaAmaci(id)) { delete ui.escolha[id]; toast('Presença registrada.'); }
        return;
      }
      if (emDemo()) {
        ({ lat, lon } = TERREIRO);
        toast('Demonstração: localização simulada no terreiro.');
      } else {
        if (!navigator.geolocation) { toast('Este aparelho não informa a localização.'); return; }
        const pos = await new Promise((ok, erro) => navigator.geolocation.getCurrentPosition(ok, erro, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        ({ latitude: lat, longitude: lon } = pos.coords);
        if (!noTerreiro(lat, lon)) { toast('Você precisa estar no Terreiro Pai João para confirmar a presença.'); return; }
      }
      if (await confirmarPresencaAmaci(id, lat, lon)) { delete ui.escolha[id]; toast('Presença confirmada. Bom amaci!'); }
    } catch (e) {
      toast(e?.code === 1 ? 'Permita a localização para confirmar a presença.' : 'Não deu para pegar a localização. Tente de novo.');
    } finally {
      ui.confirmando = false;
      avisar();
    }
  },
  amconfig() { ui.config = !ui.config; avisar(); },
  amturma(el) {
    const id = el.dataset.id;
    if (ui.turmas.has(id)) ui.turmas.delete(id); else ui.turmas.add(id);
    avisar();
  },
  amoried() {
    const k = document.getElementById('am-orixa')?.value || ui.sel || ultimoLiberado(estado.amaci.liberados);
    const o = estado.amaci.orixas.find((x) => x.k === k);
    ui.sel = k;
    ui.editando = { orixa: k, texto: o?.orientacao || '' };
    avisar();
  },
  amoricancel() { ui.editando = null; avisar(); },
  amrecarregar() { estado.amaci = null; avisar(); },
};

export const mudancas = {
  amescolher(t) { ui.sel = t.value; ui.editando = null; avisar(); },
  amescolha(t) { ui.escolha[t.dataset.id] = t.value; },
  ampresturma(t) { ui.presTurma = t.value; ui.presEv = null; ui.presQ = null; avisar(); },
  async ampresmarcar(t) {
    if (await acaoAmaci('presenca', { eventoId: t.dataset.ev, alunoId: t.dataset.aluno, status: t.value })) toast('Presença salva.');
  },
  async ampub(t) {
    if (await acaoAmaci('publicar', { publicada: t.checked })) toast(t.checked ? 'Aba Amaci visível para todos.' : 'Aba Amaci escondida: só quem administra vê.');
    else t.checked = !t.checked;
  },
  async amlib(t) {
    const turma = (estado.amaci.turmas || []).find((x) => x.id === t.dataset.id);
    if (!turma) return;
    const atual = new Set(turma.orixas);
    if (t.checked) atual.add(t.value); else atual.delete(t.value);
    if (!(await acaoAmaci('turma', { turmaId: turma.id, orixas: ordenarOrixas([...atual]) }))) t.checked = !t.checked;
  },
};
