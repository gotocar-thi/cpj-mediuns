// Aba Diário: o registro pessoal de cada dia (regras em shared/diario.js; servidor em api/_lib/diario.js).
// No topo, "Como você está hoje?" com os cuidados do dia (preceito, atividade física, água e banho de ervas); depois a
// Pílula de sabedoria (um conselho do guia de um dia anterior), os banhos que faltam tomar e o calendário do mês (ponto
// dourado: gira registrada; lilás: dia comum com manhã e noite; 🌿: banho tomado; 🏋️: atividade física) com a lua do
// dia escolhido. No fim, a Galeria de fotos da corrente (carrossel, curtidas, uma foto por pessoa) e o bloco do root. O dia muda conforme a agenda (ou o interruptor "Dia de gira"): na gira, Chegada, Saída, Linha, Banho e
// Conselho do guia; no dia comum, Manhã, Noite, Reflexão e o Orientador, que sugere um banho quando o estado é pesado.
// Cada check-in tem a escala de rostos (1 a 5), as emoções em dois grupos (leve e densa; até 3) e a energia (barra de
// 1 a 5, do vermelho ao verde).
// Toques salvam na hora; os textos salvam ao sair do campo. O root liga "Visível para todos"; desligado, só ele vê.
// No card Banho, o root também liga e desliga o Orientador para todos (desligado, só ele vê).

import { estado, avisar, carregarDiario, salvarDiaDiario, publicarDiario, orientadorDiario, acaoGaleriaDiario } from '../estado.js';
import { esc, toast, hoje, dLong, dDM, pd } from '../util.js';
import { linhaDaEntidade, LINHA_LABEL } from '/shared/regras.js';
import {
  EMOCOES, GRUPOS_EMOCOES, HUMOR, MAX_EMOCOES, GRUPOS_SENSACOES, SONO, LINHAS_DIARIO, TEMPERATURAS, AVISO_QUENTE, ERVAS_SUGESTOES, MAX_CONSELHO, MAX_REFLEXAO,
  ORIXAS_BANHO, ERVAS_APOSTILA, MAX_ERVAS_BANHO, litros, temperaturaDaErva, sugestaoOrientador, faseDaLua, deltaAxe,
} from '/shared/diario.js';
import { BANHO_ORIXA } from '/shared/banhos.js';

// dia: data aberta; mes: mês do calendário; rasc: textos ainda não salvos por data; ouvindo: campo com o microfone ligado;
// gal: foto escolhida para a galeria (base64), descrição e envio.
const ui = { dia: hoje(), mes: hoje().slice(0, 7), rasc: {}, ouvindo: null, gal: { foto: null, desc: '', enviando: false } };
let reconhecimento = null;
export function limpar() { ui.dia = hoje(); ui.mes = ui.dia.slice(0, 7); }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const LINHAS_OK = new Set(LINHAS_DIARIO.map(([k]) => k));
const copia = (o) => JSON.parse(JSON.stringify(o || {}));
const dadosDe = (data) => estado.diario?.dias?.find((x) => x.data === data)?.dados || {};

// Gira na agenda: gira cadastrada nesse dia ou evento do tipo gira. O amaci conta como gira (também tem preceito e banho)
// e só vale para a corrente e os alunos: o servidor só manda o amaci às turmas marcadas (ex-alunos nem entram no app),
// e o consulente fica de fora aqui também.
const giraDaAgenda = (data) => estado.giras[data] || null;
const amaciNaAgenda = (data) => !estado.me?.consulente && (estado.eventos || []).some((e) => e.data === data && e.tipo === 'amaci');
const agendaTemGira = (data) => !!giraDaAgenda(data) || amaciNaAgenda(data) || (estado.eventos || []).some((e) => e.data === data && e.tipo === 'gira');
const ehGira = (data, d = dadosDe(data)) => (typeof d.gira === 'boolean' ? d.gira : agendaTemGira(data));
const completo = (b) => !!(b?.humor || b?.emo?.length || b?.energia);
// Linha do dia de gira: a escolhida ou, sem escolha, a da gira da agenda.
function linhaDoDia(data, d = dadosDe(data)) {
  if (d.linha) return d.linha;
  const l = linhaDaEntidade(giraDaAgenda(data)?.entidade);
  return LINHAS_OK.has(l) ? l : '';
}

function salvar(muda) {
  const d = copia(dadosDe(ui.dia));
  muda(d);
  return salvarDiaDiario(ui.dia, d);
}

// ---------- peças ----------
function chips(campo, lista, valor) {
  return `<div class="di-chips">${lista.map(([k, t]) => `<button type="button" class="di-chip" data-act="dichip" data-campo="${campo}" data-v="${k}" aria-pressed="${valor === k}">${t}</button>`).join('')}</div>`;
}
// Escala de rostos: como a pessoa se sente, de 1 (muito mal) a 5 (muito bem).
function rostos(campo, valor) {
  return `<div class="di-rostos" role="group" aria-label="Como você se sente, de 1 a 5">${HUMOR.map(([n, ico, t]) => `<button type="button" class="di-rosto" data-act="dienergia" data-campo="${campo}" data-v="${n}" aria-pressed="${valor === n}" aria-label="${t}">
    <span class="di-rosto-i" aria-hidden="true">${ico}</span><span class="di-rosto-t">${t}</span></button>`).join('')}</div>`;
}
// Emoções em dois grupos; marcadas até MAX_EMOCOES; embaixo, o que é cada uma das marcadas.
function emocoes(campo, marcadas = []) {
  const grupos = GRUPOS_EMOCOES.map((g) => `<div class="di-grupo di-grupo-${g.k}"><p class="di-grupo-h"><b>${g.k === 'leve' ? '☀️' : '🌧️'} ${g.titulo}</b><span>${g.sub}</span></p>
    <div class="di-chips">${g.itens.map(([k, t]) => {
      const on = marcadas.includes(k);
      return `<button type="button" class="di-chip" data-act="diemo" data-campo="${campo}" data-v="${k}" aria-pressed="${on}" ${!on && marcadas.length >= MAX_EMOCOES ? 'aria-disabled="true"' : ''}>${on ? '✓ ' : ''}${t}</button>`;
    }).join('')}</div></div>`).join('');
  const sel = EMOCOES.filter(([k]) => marcadas.includes(k));
  return `${grupos}${sel.length ? `<ul class="di-emo-sel">${sel.map(([, t, x]) => `<li><b>${t}</b> · ${x}</li>`).join('')}</ul>` : ''}`;
}
// Energia: barra de 1 (vermelho) a 5 (verde). Sem marcação, o pino fica apagado no meio até a pessoa tocar.
const NIVEL_ENERGIA = ['', 'Muito baixa', 'Baixa', 'Média', 'Boa', 'Alta'];
const textoEnergia = (n) => (n ? `${n} · ${NIVEL_ENERGIA[n]}` : 'Toque ou arraste para marcar');
function energia(campo, valor) {
  return `<div class="di-slide${valor ? '' : ' vazio'}" style="--cor:${valor ? corEnergia(valor) : 'var(--line)'}">
    <div class="di-slide-h"><output>${textoEnergia(valor)}</output>${valor ? `<button type="button" class="btn link small" data-act="dienlimpar" data-campo="${campo}">Limpar</button>` : ''}</div>
    <input type="range" min="1" max="5" step="1" value="${valor || 3}" data-act="dienslide" data-campo="${campo}" aria-label="Energia de 1 a 5" aria-valuetext="${textoEnergia(valor)}">
    <div class="di-en-leg muted"><span>baixa</span><span>alta</span></div></div>`;
}
// fixo: o campo mostra até 4 linhas e rola o resto (o conselho do guia pode ter umas 20 linhas).
function campoTexto(campo, rotulo, valor, max, voz, fixo = false) {
  const v = ui.rasc[ui.dia]?.[campo] ?? valor ?? '';
  const mic = voz && SR ? `<button type="button" class="btn small di-mic${ui.ouvindo === campo ? ' ouvindo' : ''}" data-act="divoz" data-campo="${campo}">${ui.ouvindo === campo ? '⏹ Parar' : '🎤 Falar'}</button>` : '';
  const linhas = fixo ? 4 : Math.min(8, Math.max(3, v.split('\n').length + 1));
  return `<label class="field di-txt${fixo ? ' di-txt-fixo' : ''}"><span class="di-txt-h">${rotulo}${mic}</span>
    <textarea id="di-${campo}" rows="${linhas}" maxlength="${max}" data-diario="${campo}" data-act="ditexto">${esc(v)}</textarea></label>`;
}
const corEnergia = (n) => `var(--di-en-${n})`;
const ORIGEM = { guia: 'recomendado pelo guia', orientador: 'sugerido pelo Orientador', proprio: 'anotado por você' };

// ---------- cuidados do dia ----------
function cuidados(d) {
  const H = d.habitos || {};
  const caixa = (k, t) => `<label class="di-hab-c"><input type="checkbox" data-act="dihab" data-k="${k}" ${H[k] ? 'checked' : ''}><span>${t}</span></label>`;
  let h = `<div class="di-hab">${caixa('preceito', '🕯️ Preceito ok')}${caixa('atividade', '🏋️ Fez atividade física?')}${caixa('agua', '💧 Tomou água?')}`;
  if (H.agua) {
    h += `<label class="field di-hab-sub">Quantos litros?<input type="text" inputmode="decimal" maxlength="5" data-act="dilitros" placeholder="Ex.: 1,5" value="${H.litros ? String(H.litros).replace('.', ',') : ''}"></label>`;
  }
  h += caixa('banho', '🌿 Tomou banho de ervas?');
  if (H.banho) {
    h += `<div class="di-hab-sub"><label class="field">Banho de orixá<select data-act="dihaborixa"><option value="">—</option>
      ${ORIXAS_BANHO.map((o) => `<option value="${esc(o)}" ${o === H.orixa ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    if (H.orixa) {
      h += `<p class="muted di-hab-ervas">Ervas de ${esc(H.orixa)}: ${esc(BANHO_ORIXA[H.orixa].ervas.join(', '))}</p>`;
    } else {
      const E = H.ervas || [];
      h += `<p class="di-rot">ou as ervas <span class="muted">(até ${MAX_ERVAS_BANHO})</span></p>`;
      if (E.length) h += `<div class="di-ervas">${E.map((e, i) => `<span class="di-erva">${esc(e)}<button type="button" data-act="dirmhaberva" data-i="${i}" aria-label="Tirar ${esc(e)}">×</button></span>`).join('')}</div>`;
      if (E.length < MAX_ERVAS_BANHO) {
        h += `<select data-act="dihaberva" aria-label="Escolher erva"><option value="">＋ Escolher erva…</option>
          ${ERVAS_APOSTILA.filter((e) => !E.includes(e)).map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join('')}</select>`;
      }
    }
    h += '</div>';
  }
  return h + '</div>';
}

function cabecalho() {
  const d = dadosDe(ui.dia);
  const gira = ehGira(ui.dia, d);
  const auto = agendaTemGira(ui.dia);
  const nome = String(estado.me?.nome || '').split(' ')[0];
  const ehHoje = ui.dia === hoje();
  return `<div class="card di-cab"><p class="di-ola">${ehHoje ? `Olá${nome ? ', ' + esc(nome) : ''} 🤍` : 'Seu registro de'}</p>
    <h2>${ehHoje ? 'Como você está hoje?' : dLong(ui.dia)}</h2>${ehHoje ? `<p class="muted di-data">${dLong(ui.dia)}</p>` : ''}
    <label class="of-sw"><input type="checkbox" role="switch" data-act="digira" ${gira ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>${ehHoje ? 'Hoje é dia de gira' : 'Dia de gira'}</b>
      <span class="muted">${auto ? (amaciNaAgenda(ui.dia) && !giraDaAgenda(ui.dia) ? '(amaci na agenda)' : '(pela agenda)') : ''}</span></label>${cuidados(d)}</div>`;
}

// ---------- Galeria de fotos da corrente ----------
// src: só no modo demo (a foto fica na memória da página).
const fotoUrl = (f) => f.src || `/api/pessoas?lista=diarioFoto&id=${encodeURIComponent(f.id)}&v=${encodeURIComponent(f.v)}`;
function galeria(D) {
  if (!D.galeria) return '';
  const L = D.galeria, g = ui.gal;
  let h = `<div class="card di-gal"><div class="grp-h"><h2>📸 Galeria de fotos</h2>${L.length ? `<span class="count">${L.length}</span>` : ''}</div>
    <p class="muted di-gal-sub">Uma foto por pessoa. Toda terça-feira a galeria recomeça do zero.</p>`;
  h += L.length ? `<div class="di-gal-l" role="list">${L.map((f) => {
    const apagar = f.minha || D.root;
    const conf = estado.confirm === 'dg:' + f.id;
    return `<figure class="di-gal-i" role="listitem"><img src="${fotoUrl(f)}" alt="${esc(f.descricao || 'Foto de ' + f.nome)}" loading="lazy">
      <figcaption><b>${esc(f.nome)}</b>${f.descricao ? `<span>${esc(f.descricao)}</span>` : ''}</figcaption>
      <div class="di-gal-a"><button type="button" class="di-cur" data-act="dicurtir" data-id="${f.id}" aria-pressed="${f.curti}" aria-label="${f.curti ? 'Descurtir' : 'Curtir'}">${f.curti ? '❤️' : '🤍'} ${f.curtidas}</button>
        ${apagar ? (conf ? `<button type="button" class="btn small danger" data-act="digalexcluir" data-id="${f.id}">Excluir?</button>`
          : `<button type="button" class="btn small link" data-act="askdel" data-k="dg:${f.id}">Excluir</button>`) : ''}</div></figure>`;
  }).join('')}</div>` : '<p class="muted" style="margin:0">Nenhuma foto nesta semana ainda.</p>';
  if (!L.some((f) => f.minha)) {
    h += g.foto ? `<div class="di-gal-novo"><img class="di-gal-prev" src="data:image/jpeg;base64,${g.foto}" alt="Foto escolhida">
        <label class="field">Descrição<input type="text" maxlength="200" data-diario="galdesc" placeholder="Opcional" value="${esc(g.desc)}"></label>
        <div class="di-gal-bt"><button type="button" class="btn primary" data-act="digalenviar" ${g.enviando ? 'disabled' : ''}>${g.enviando ? 'Enviando…' : 'Confirmar'}</button>
          <button type="button" class="btn" data-act="digalcancelar" ${g.enviando ? 'disabled' : ''}>Cancelar</button></div></div>`
      : `<label class="btn primary di-gal-subir">📷 Subir foto<input type="file" accept="image/*" data-act="digalfoto" hidden></label>`;
  }
  return h + '</div>';
}

function cardRoot(D) {
  if (!D.root) return '';
  return `<div class="card adm ervas-pub"><label class="of-sw"><input type="checkbox" role="switch" data-act="dipub" ${D.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Visível para todos</b></label>
    <p class="muted" style="margin:0;font-size:.85rem">${D.publicada ? 'A corrente e os alunos veem a aba (cada um, só o próprio diário).' : 'Desligado: só o root vê esta aba.'}</p></div>`;
}

// Pílula de sabedoria: um conselho do guia de um dia anterior; troca a cada dia.
function pilula(D) {
  const L = D.dias.filter((x) => x.dados.conselho && x.data < hoje());
  if (!L.length) return '';
  const n = Math.floor(pd(hoje()).getTime() / 864e5);
  const c = L[((n % L.length) + L.length) % L.length];
  const quem = c.dados.linha && LINHA_LABEL[c.dados.linha] ? `seu ${LINHA_LABEL[c.dados.linha]}` : 'seu guia';
  const t = c.dados.conselho.length > 280 ? c.dados.conselho.slice(0, 280).trimEnd() + '…' : c.dados.conselho;
  return `<div class="card di-pilula"><p class="eyebrow">💊 Pílula de sabedoria</p>
    <p class="di-pilula-t">Em ${dDM(c.data)}, ${esc(quem)} aconselhou: <q>${esc(t)}</q></p></div>`;
}

function pendencias(D) {
  const L = D.dias.filter((x) => x.dados.banho?.ervas?.length && !x.dados.banho.feito).sort((a, b) => b.data.localeCompare(a.data));
  if (!L.length) return '';
  return `<div class="card di-pend"><div class="grp-h"><h2>🌿 Banhos para tomar</h2><span class="count">${L.length}</span></div>
    <div class="di-pend-l" data-rolar="4">${L.map((x) => `<div class="di-pend-i"><div><b>${esc(x.dados.banho.ervas.join(', '))}</b>
      <span class="muted">${dDM(x.data)} · ${ORIGEM[x.dados.banho.origem] || ORIGEM.guia}</span></div>
      <button class="btn small" data-act="ditomei" data-d="${x.data}">Tomei</button></div>`).join('')}</div></div>`;
}

function calendario(D) {
  const [y, m] = ui.mes.split('-').map(Number);
  const primeiro = new Date(y, m - 1, 1).getDay();
  const total = new Date(y, m, 0).getDate();
  const hj = hoje();
  const porData = Object.fromEntries(D.dias.map((x) => [x.data, x.dados]));
  let cel = '';
  for (let i = 0; i < primeiro; i++) cel += '<span></span>';
  for (let d = 1; d <= total; d++) {
    const data = `${ui.mes}-${String(d).padStart(2, '0')}`;
    const x = porData[data];
    const marcas = [];
    if (x && ehGira(data, x)) marcas.push('<i class="di-p di-p-gira"></i>');
    else if (x && completo(x.antes) && completo(x.depois)) marcas.push('<i class="di-p di-p-dia"></i>');
    if (x?.banho?.feito || x?.habitos?.banho) marcas.push('<i class="di-folha">🌿</i>');
    if (x?.habitos?.atividade) marcas.push('<i class="di-folha">🏋️</i>');
    if (amaciNaAgenda(data)) marcas.push('<i class="di-folha">🕊️</i>');
    const cls = ['di-d', data === ui.dia ? 'sel' : '', data === hj ? 'hoje' : '', !x && agendaTemGira(data) ? 'agenda' : ''].filter(Boolean).join(' ');
    cel += `<button type="button" class="${cls}" data-act="didia" data-d="${data}" ${data > hj ? 'disabled' : ''} aria-label="${dLong(data)}" aria-pressed="${data === ui.dia}">
      <span>${d}</span><span class="di-marcas">${marcas.join('')}</span></button>`;
  }
  const [, nomeLua, iconeLua, textoLua] = faseDaLua(ui.dia);
  return `<div class="card di-cal">
    <div class="di-cal-h"><button class="btn small" data-act="dimes" data-v="-1" aria-label="Mês anterior">◂</button>
      <h2>${MESES[m - 1].replace(/^./, (c) => c.toUpperCase())} de ${y}</h2>
      <button class="btn small" data-act="dimes" data-v="1" aria-label="Próximo mês" ${ui.mes >= hj.slice(0, 7) ? 'disabled' : ''}>▸</button></div>
    <div class="di-grade">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s) => `<b>${s}</b>`).join('')}${cel}</div>
    <div class="di-leg muted"><span><i class="di-p di-p-gira"></i> gira</span><span><i class="di-p di-p-dia"></i> manhã e noite</span><span>🌿 banho tomado</span><span>🏋️ atividade física</span><span>🕊️ amaci</span></div>
    <p class="di-lua" title="${esc(textoLua)}"><span aria-hidden="true">${iconeLua}</span> <b>${nomeLua}</b> · ${esc(textoLua)}</p></div>`;
}

function termometro(d, gira) {
  const delta = deltaAxe(d);
  if (delta === null) return '';
  const face = (n) => HUMOR.find(([x]) => x === n)?.[1];
  const humor = face(d.antes.humor) && face(d.depois.humor) ? `<p class="di-termo-rostos" aria-label="Como se sentiu"><span>${face(d.antes.humor)}</span><span class="muted">→</span><span>${face(d.depois.humor)}</span></p>` : '';
  const a = d.antes.energia, b = d.depois.energia;
  const msg = delta > 0 ? (gira ? 'Você saiu da gira mais forte do que chegou.' : 'Você termina o dia com mais energia.')
    : delta < 0 ? (gira ? 'Você saiu com menos energia: descanse e cuide-se.' : 'O dia pesou: um banho de manutenção ajuda.')
    : 'Energia estável.';
  return `<div class="card di-termo"><p class="eyebrow">🌡️ Termômetro de Axé</p>${humor}
    <div class="di-termo-b" style="background:linear-gradient(90deg, ${corEnergia(a)}, ${corEnergia(b)})">
      <span>${gira ? 'Chegada' : 'Manhã'} ${a}</span><span>${gira ? 'Saída' : 'Noite'} ${b}</span></div>
    <p class="di-termo-t"><b>Delta de Axé ${delta > 0 ? '+' : ''}${delta}</b> · ${msg}</p></div>`;
}

function banho(d, gira) {
  const B = d.banho || { ervas: [] };
  const temps = B.ervas.map(temperaturaDaErva);
  const lista = B.ervas.map((e, i) => {
    const t = temps[i];
    return `<span class="di-erva di-t-${t || 'x'}">${esc(e)}${t ? ` <small>${TEMPERATURAS[t][0]}</small>` : ''}<button type="button" data-act="dirmerva" data-i="${i}" aria-label="Tirar ${esc(e)}">×</button></span>`;
  }).join('');
  const quente = temps.includes('quente') ? `<p class="di-aviso">⚠️ ${AVISO_QUENTE}</p>` : '';
  const D = estado.diario || {};
  const oriOn = D.orientador !== false;
  const sug = !gira && (oriOn || D.root) && sugestaoOrientador(d);
  const chave = D.root && !gira ? `<label class="of-sw"><input type="checkbox" role="switch" data-act="diori" ${oriOn ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Orientador visível para todos</b></label>
    ${oriOn ? '' : '<p class="muted" style="margin:0;font-size:.85rem">Desligado: só o root vê a sugestão de banho.</p>'}` : '';
  const orientador = sug ? `<div class="di-ori"><p class="eyebrow">🧭 Orientador</p>
      <p>Você registrou <b>${esc(EMOCOES.find(([k]) => k === sug.emo)[1])}</b>. Sugestão de banho de manutenção: <b>${sug.nome}</b>.</p>
      <p class="muted">${sug.fundamento}</p>
      ${B.ervas.some((e) => e.toLowerCase() === sug.nome.toLowerCase()) ? '' : `<button class="btn small" data-act="disugestao">Quero esse banho</button>`}</div>` : '';
  return `<div class="card di-banho"><h3>🌿 ${gira ? 'Banho recomendado pelo guia' : 'Banho'}</h3>${chave}${orientador}
    ${lista ? `<div class="di-ervas">${lista}</div>` : '<p class="muted" style="margin:0">Nenhuma erva anotada.</p>'}${quente}
    <form id="f-di-erva" class="di-add"><input type="text" id="di-erva" list="di-ervas-lista" placeholder="Erva (ex.: alecrim)" maxlength="60" autocomplete="off">
      <button class="btn small">Adicionar</button></form>
    <datalist id="di-ervas-lista">${ERVAS_SUGESTOES.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
    ${B.ervas.length ? `<label class="of-sw"><input type="checkbox" role="switch" data-act="difeito" ${B.feito ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Banho tomado</b></label>` : ''}</div>`;
}

function dia() {
  const d = dadosDe(ui.dia);
  const gira = ehGira(ui.dia, d);
  const linha = gira ? linhaDoDia(ui.dia, d) : '';
  const A = d.antes || {}, P = d.depois || {};
  let h = `<div class="card di-check di-check-a"><h3>${gira ? '🕯️ Antes da gira' : '🌅 Ao acordar'}</h3>
    <p class="di-rot">${gira ? 'Como você está chegando?' : 'Como você acordou?'}</p>${rostos('antes.humor', A.humor)}
    <p class="di-rot">O que você sente? <span class="muted">(até ${MAX_EMOCOES})</span></p>${emocoes('antes.emo', A.emo)}
    ${gira ? '' : `<p class="di-rot">Sono e sonhos</p>${chips('antes.sono', SONO, A.sono)}`}
    <p class="di-rot">Energia ${gira ? 'física e espiritual' : 'da manhã'}</p>${energia('antes.energia', A.energia)}</div>`;
  h += `<div class="card di-check di-check-b"><h3>${gira ? '✨ Depois da gira' : '🌙 Ao fim do dia'}</h3>
    <p class="di-rot">${gira ? 'Como você está saindo?' : 'Como você está encerrando o dia?'}</p>${rostos('depois.humor', P.humor)}
    <p class="di-rot">O que você sente? <span class="muted">(até ${MAX_EMOCOES})</span></p>${emocoes('depois.emo', P.emo)}
    <p class="di-rot">Energia ${gira ? 'depois do trabalho' : 'da noite'}</p>${energia('depois.energia', P.energia)}
    ${gira ? `<p class="di-rot">Sensação</p>${GRUPOS_SENSACOES.map((g) => `<div class="di-sens"><span class="muted">${g.titulo}</span>${chips('depois.sensacao', g.itens, P.sensacao)}</div>`).join('')}`
      : campoTexto('reflexao', 'Reflexão, gratidão ou sincronicidades (opcional)', d.reflexao, MAX_REFLEXAO, true)}</div>`;
  h += termometro(d, gira);
  if (gira) {
    h += `<div class="card"><h3>🙏 Orientações do guia</h3>
      <label class="field">Linha / falange<select data-act="dilinha"><option value="">—</option>${LINHAS_DIARIO.map(([k, t]) => `<option value="${k}" ${k === linha ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${campoTexto('conselho', 'Conselho do guia', d.conselho, MAX_CONSELHO, true, true)}</div>`;
  }
  return h + banho(d, gira);
}

export function render() {
  const D = estado.diario;
  if (D === null) { carregarDiario(); return '<div class="loading">Carregando o diário…</div>'; }
  if (D.erro) return `<section class="panel"><div class="card"><p class="erro">${esc(D.erro)}</p><button class="btn" data-act="direcarregar">Tentar de novo</button></div></section>`;
  if (ui.dia > hoje()) limpar();
  return `<section class="panel di-tela">${cabecalho()}${pilula(D)}${pendencias(D)}${calendario(D)}${dia()}${galeria(D)}${cardRoot(D)}</section>`;
}

// ---------- ações ----------
// Campo "antes.emo" → d.antes.emo (tocar de novo no mesmo valor tira).
function marcar(campo, v) {
  const [g, k] = campo.split('.');
  return salvar((d) => {
    d[g] = d[g] || {};
    if (d[g][k] === v) delete d[g][k]; else d[g][k] = v;
  });
}
function salvarTexto(campo) {
  const data = ui.dia;
  const v = ui.rasc[data]?.[campo];
  if (v === undefined) return;
  if ((dadosDe(data)[campo] || '') === v.trim()) { delete ui.rasc[data][campo]; return; }
  // O conselho leva junto a linha da agenda, se a pessoa não escolheu outra (a Pílula de sabedoria diz quem aconselhou).
  salvar((d) => { d[campo] = v; if (campo === 'conselho' && !d.linha && linhaDoDia(data, d)) d.linha = linhaDoDia(data, d); }).then((ok) => { if (ok && ui.rasc[data]) delete ui.rasc[data][campo]; });
}
export function digitando(t) {
  if (t.dataset.diario === 'galdesc') { ui.gal.desc = t.value; return; }
  (ui.rasc[ui.dia] ||= {})[t.dataset.diario] = t.value;
}
// Barra de energia enquanto arrasta: só a cor e o texto (salva ao soltar).
export function arrastando(t) {
  const n = Number(t.value);
  const box = t.closest('.di-slide');
  box.classList.remove('vazio');
  box.style.setProperty('--cor', corEnergia(n));
  box.querySelector('output').textContent = textoEnergia(n);
}
function mudarHabitos(muda) {
  return salvar((d) => { d.habitos = { ...(d.habitos || {}) }; muda(d.habitos); });
}

async function abrirImagem(arquivo) {
  try { return await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); } catch { /* tenta pelo <img> */ }
  const url = URL.createObjectURL(arquivo);
  try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { URL.revokeObjectURL(url); }
}
function canvasDe(img, lado) {
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
// ---------- galeria: a foto é reduzida no aparelho (maior lado 1280 px, JPEG até ~600 KB) ----------
async function escolherFotoGaleria(arquivo) {
  try {
    const c = canvasDe(await abrirImagem(arquivo), 1280);
    for (let q = 0.82; q > 0.3; q -= 0.12) {
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));
      if (blob && blob.size <= 600 * 1024) {
        ui.gal.foto = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = erro; r.readAsDataURL(blob); });
        avisar();
        return;
      }
    }
    toast('Foto grande demais.');
  } catch { toast('Não foi possível abrir essa foto.'); }
}
export async function addErva(form) {
  const el = form.querySelector('#di-erva');
  const nome = el.value.replace(/\s+/g, ' ').trim();
  if (!nome) return;
  const d = dadosDe(ui.dia);
  if ((d.banho?.ervas || []).some((e) => e.toLowerCase() === nome.toLowerCase())) { el.value = ''; return; }
  if ((d.banho?.ervas || []).length >= 15) { toast('Máximo de 15 ervas no banho.'); return; }
  const gira = ehGira(ui.dia, d);
  if (await salvar((x) => { x.banho = { ervas: [...(x.banho?.ervas || []), nome], feito: !!x.banho?.feito, origem: x.banho?.origem || (gira ? 'guia' : 'proprio') }; })) {
    document.getElementById('di-erva')?.focus();
  }
}

function ouvir(campo) {
  if (reconhecimento) { reconhecimento.stop(); return; }
  const r = new SR();
  r.lang = 'pt-BR';
  r.continuous = true;
  r.interimResults = false;
  const data = ui.dia;
  r.onresult = (ev) => {
    const novo = [...ev.results].slice(ev.resultIndex).filter((x) => x.isFinal).map((x) => x[0].transcript.trim()).join(' ');
    if (!novo) return;
    const atual = ui.rasc[data]?.[campo] ?? dadosDe(data)[campo] ?? '';
    (ui.rasc[data] ||= {})[campo] = (atual ? atual.replace(/\s+$/, '') + ' ' : '') + novo;
    avisar();
  };
  r.onerror = (ev) => { if (ev.error === 'not-allowed') toast('Libere o microfone para falar o texto.'); else if (ev.error !== 'no-speech' && ev.error !== 'aborted') toast('Não foi possível ouvir agora.'); };
  r.onend = () => {
    reconhecimento = null;
    ui.ouvindo = null;
    if (ui.dia === data) salvarTexto(campo);
    avisar();
  };
  try { r.start(); } catch { toast('Não foi possível ligar o microfone.'); return; }
  reconhecimento = r;
  ui.ouvindo = campo;
  avisar();
}

export const cliques = {
  direcarregar() { estado.diario = null; avisar(); },
  didia(el) { if (reconhecimento) reconhecimento.stop(); ui.dia = el.dataset.d; avisar(); },
  dimes(el) {
    const [y, m] = ui.mes.split('-').map(Number);
    const dt = new Date(y, m - 1 + Number(el.dataset.v), 1);
    const mes = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (mes <= hoje().slice(0, 7)) ui.mes = mes;
    avisar();
  },
  dichip(el) { marcar(el.dataset.campo, el.dataset.v); },
  // Emoção: tocar marca ou desmarca; com MAX_EMOCOES marcadas, avisa.
  diemo(el) {
    const [g, k] = el.dataset.campo.split('.');
    const atual = dadosDe(ui.dia)[g]?.[k] || [];
    const v = el.dataset.v;
    if (!atual.includes(v) && atual.length >= MAX_EMOCOES) { toast(`Escolha até ${MAX_EMOCOES}: desmarque uma para trocar.`); return; }
    salvar((d) => {
      d[g] = d[g] || {};
      const L = (d[g][k] || []).includes(v) ? d[g][k].filter((x) => x !== v) : [...(d[g][k] || []), v];
      if (L.length) d[g][k] = L; else delete d[g][k];
    });
  },
  dienergia(el) { marcar(el.dataset.campo, Number(el.dataset.v)); },
  dienlimpar(el) {
    const [g, k] = el.dataset.campo.split('.');
    salvar((d) => { if (d[g]) delete d[g][k]; });
  },
  dirmhaberva(el) {
    const i = Number(el.dataset.i);
    mudarHabitos((h) => { h.ervas = (h.ervas || []).filter((_, j) => j !== i); });
  },
  dicurtir(el) { acaoGaleriaDiario('fotoCurtir', { id: el.dataset.id }); },
  async digalexcluir(el) { if (await acaoGaleriaDiario('fotoExcluir', { id: el.dataset.id })) toast('Foto excluída.'); },
  digalcancelar() { ui.gal = { foto: null, desc: '', enviando: false }; avisar(); },
  async digalenviar() {
    const g = ui.gal;
    if (!g.foto || g.enviando) return;
    g.enviando = true;
    avisar();
    const ok = await acaoGaleriaDiario('fotoEnviar', { foto: g.foto, descricao: g.desc });
    ui.gal = ok ? { foto: null, desc: '', enviando: false } : { ...g, enviando: false };
    if (ok) toast('Foto na galeria. 📸');
    avisar();
  },
  dirmerva(el) {
    const i = Number(el.dataset.i);
    salvar((d) => {
      const ervas = (d.banho?.ervas || []).filter((_, j) => j !== i);
      if (ervas.length) d.banho.ervas = ervas; else delete d.banho;
    });
  },
  disugestao() {
    const sug = sugestaoOrientador(dadosDe(ui.dia));
    if (!sug) return;
    salvar((d) => { d.banho = { ervas: [...(d.banho?.ervas || []), sug.nome], feito: false, origem: d.banho?.origem || 'orientador' }; });
  },
  ditomei(el) {
    const d = copia(dadosDe(el.dataset.d));
    if (!d.banho) return;
    d.banho.feito = true;
    salvarDiaDiario(el.dataset.d, d).then((ok) => { if (ok) toast('Banho marcado como tomado. 🌿'); });
  },
  divoz(el) { if (SR) ouvir(el.dataset.campo); },
};

export const mudancas = {
  async dipub(t) {
    if (await publicarDiario(t.checked)) toast(t.checked ? 'Diário visível para todos.' : 'Diário: só o root vê.');
    else t.checked = !t.checked;
  },
  async diori(t) {
    if (await orientadorDiario(t.checked)) toast(t.checked ? 'Orientador visível para todos.' : 'Orientador: só o root vê.');
    else t.checked = !t.checked;
  },
  digira(t) {
    const auto = agendaTemGira(ui.dia);
    salvar((d) => { if (t.checked === auto) delete d.gira; else d.gira = t.checked; });
  },
  dilinha(t) { salvar((d) => { if (t.value) d.linha = t.value; else delete d.linha; }); },
  difeito(t) { salvar((d) => { if (d.banho) d.banho.feito = t.checked; }); },
  // Energia: salva o valor ao soltar (o toque sem arrastar também marca: ver main.js).
  dienslide(t) {
    const [g, k] = t.dataset.campo.split('.');
    const v = Number(t.value);
    if (dadosDe(ui.dia)[g]?.[k] === v) return;
    salvar((d) => { d[g] = d[g] || {}; d[g][k] = v; });
  },
  dihab(t) {
    const k = t.dataset.k;
    mudarHabitos((h) => {
      if (t.checked) { h[k] = true; return; }
      delete h[k];
      if (k === 'agua') delete h.litros;
      if (k === 'banho') { delete h.orixa; delete h.ervas; }
    });
  },
  dilitros(t) {
    const v = t.value.trim();
    const n = litros(v);
    if (v && n === undefined) { toast('Litros: um número até 20 (ex.: 1,5).'); return; }
    mudarHabitos((h) => { if (n) h.litros = n; else delete h.litros; });
  },
  dihaborixa(t) { mudarHabitos((h) => { if (t.value) { h.orixa = t.value; delete h.ervas; } else delete h.orixa; }); },
  dihaberva(t) {
    const e = t.value;
    if (!e) return;
    mudarHabitos((h) => { h.ervas = [...new Set([...(h.ervas || []), e])].slice(0, MAX_ERVAS_BANHO); });
  },
  digalfoto(t) { const f = t.files?.[0]; t.value = ''; if (f) escolherFotoGaleria(f); },
  ditexto(t) { if (ui.ouvindo !== t.dataset.diario) salvarTexto(t.dataset.diario); },
};
