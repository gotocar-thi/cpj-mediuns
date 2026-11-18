// Aba Diário: o registro pessoal de cada dia (regras em shared/diario.js; servidor em api/_lib/diario.js).
// No topo, a Pílula de sabedoria (um conselho do guia de um dia anterior) e os banhos que faltam tomar; depois o
// calendário do mês (ponto dourado: gira registrada; lilás: dia comum com manhã e noite; 🌿: banho tomado) com a lua do
// dia escolhido. O dia muda conforme a agenda (ou o interruptor "Dia de gira"): na gira, Chegada, Saída, Linha, Banho e
// Conselho do guia; no dia comum, Manhã, Noite, Reflexão e o Orientador, que sugere um banho quando o estado é pesado.
// Toques salvam na hora; os textos salvam ao sair do campo. O root liga "Visível para todos"; desligado, só ele vê.

import { estado, avisar, carregarDiario, salvarDiaDiario, publicarDiario } from '../estado.js';
import { esc, toast, hoje, dLong, dDM, pd } from '../util.js';
import { linhaDaEntidade, LINHA_LABEL } from '/shared/regras.js';
import {
  EMOCOES, SENSACOES, SONO, LINHAS_DIARIO, TEMPERATURAS, AVISO_QUENTE, ERVAS_SUGESTOES, MAX_CONSELHO, MAX_REFLEXAO,
  temperaturaDaErva, sugestaoOrientador, faseDaLua, deltaAxe,
} from '/shared/diario.js';

// dia: data aberta; mes: mês do calendário; rasc: textos ainda não salvos por data; ouvindo: campo com o microfone ligado.
const ui = { dia: hoje(), mes: hoje().slice(0, 7), rasc: {}, ouvindo: null };
let reconhecimento = null;
export function limpar() { ui.dia = hoje(); ui.mes = ui.dia.slice(0, 7); }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const LINHAS_OK = new Set(LINHAS_DIARIO.map(([k]) => k));
const copia = (o) => JSON.parse(JSON.stringify(o || {}));
const dadosDe = (data) => estado.diario?.dias?.find((x) => x.data === data)?.dados || {};

// Gira na agenda: gira cadastrada nesse dia ou evento do tipo gira.
const giraDaAgenda = (data) => estado.giras[data] || null;
const agendaTemGira = (data) => !!giraDaAgenda(data) || (estado.eventos || []).some((e) => e.data === data && e.tipo === 'gira');
const ehGira = (data, d = dadosDe(data)) => (typeof d.gira === 'boolean' ? d.gira : agendaTemGira(data));
const completo = (b) => !!(b?.emo || b?.energia);
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
function energia(campo, valor) {
  return `<div class="di-en" role="group" aria-label="Energia de 1 a 5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="di-en-b di-en-${n}" data-act="dienergia" data-campo="${campo}" data-v="${n}" aria-pressed="${valor === n}" aria-label="Energia ${n}">${n}</button>`).join('')}</div>
    <div class="di-en-leg muted"><span>baixa</span><span>alta</span></div>`;
}
function campoTexto(campo, rotulo, valor, max, voz) {
  const v = ui.rasc[ui.dia]?.[campo] ?? valor ?? '';
  const mic = voz && SR ? `<button type="button" class="btn small di-mic${ui.ouvindo === campo ? ' ouvindo' : ''}" data-act="divoz" data-campo="${campo}">${ui.ouvindo === campo ? '⏹ Parar' : '🎤 Falar'}</button>` : '';
  return `<label class="field di-txt"><span class="di-txt-h">${rotulo}${mic}</span>
    <textarea id="di-${campo}" rows="${Math.min(8, Math.max(3, v.split('\n').length + 1))}" maxlength="${max}" data-diario="${campo}" data-act="ditexto">${esc(v)}</textarea></label>`;
}
const corEnergia = (n) => `var(--di-en-${n})`;
const ORIGEM = { guia: 'recomendado pelo guia', orientador: 'sugerido pelo Orientador', proprio: 'anotado por você' };

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
    if (x?.banho?.feito) marcas.push('<i class="di-folha">🌿</i>');
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
    <div class="di-leg muted"><span><i class="di-p di-p-gira"></i> gira</span><span><i class="di-p di-p-dia"></i> manhã e noite</span><span>🌿 banho tomado</span></div>
    <p class="di-lua" title="${esc(textoLua)}"><span aria-hidden="true">${iconeLua}</span> <b>${nomeLua}</b> · ${esc(textoLua)}</p></div>`;
}

function termometro(d, gira) {
  const delta = deltaAxe(d);
  if (delta === null) return '';
  const a = d.antes.energia, b = d.depois.energia;
  const msg = delta > 0 ? (gira ? 'Você saiu da gira mais forte do que chegou.' : 'Você termina o dia com mais energia.')
    : delta < 0 ? (gira ? 'Você saiu com menos energia: descanse e cuide-se.' : 'O dia pesou: um banho de manutenção ajuda.')
    : 'Energia estável.';
  return `<div class="card di-termo"><p class="eyebrow">🌡️ Termômetro de Axé</p>
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
  const sug = !gira && sugestaoOrientador(d);
  const orientador = sug ? `<div class="di-ori"><p class="eyebrow">🧭 Orientador</p>
      <p>Você registrou <b>${esc(EMOCOES.find(([k]) => k === sug.emo)[1])}</b>. Sugestão de banho de manutenção: <b>${sug.nome}</b>.</p>
      <p class="muted">${sug.fundamento}</p>
      ${B.ervas.some((e) => e.toLowerCase() === sug.nome.toLowerCase()) ? '' : `<button class="btn small" data-act="disugestao">Quero esse banho</button>`}</div>` : '';
  return `<div class="card di-banho"><h3>🌿 ${gira ? 'Banho recomendado pelo guia' : 'Banho'}</h3>${orientador}
    ${lista ? `<div class="di-ervas">${lista}</div>` : '<p class="muted" style="margin:0">Nenhuma erva anotada.</p>'}${quente}
    <form id="f-di-erva" class="di-add"><input type="text" id="di-erva" list="di-ervas-lista" placeholder="Erva (ex.: alecrim)" maxlength="60" autocomplete="off">
      <button class="btn small">Adicionar</button></form>
    <datalist id="di-ervas-lista">${ERVAS_SUGESTOES.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
    ${B.ervas.length ? `<label class="of-sw"><input type="checkbox" role="switch" data-act="difeito" ${B.feito ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Banho tomado</b></label>` : ''}</div>`;
}

function dia(D) {
  const d = dadosDe(ui.dia);
  const gira = ehGira(ui.dia, d);
  const auto = agendaTemGira(ui.dia);
  const linha = gira ? linhaDoDia(ui.dia, d) : '';
  const A = d.antes || {}, P = d.depois || {};
  let h = `<div class="card di-cab"><h2>${ui.dia === hoje() ? 'Hoje · ' : ''}${dLong(ui.dia)}</h2>
    <label class="of-sw"><input type="checkbox" role="switch" data-act="digira" ${gira ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>${ui.dia === hoje() ? 'Hoje é dia de gira' : 'Dia de gira'}</b>
      <span class="muted">${auto ? '(pela agenda)' : ''}</span></label></div>`;
  h += `<div class="card"><h3>${gira ? '🕯️ Antes da gira · Chegada' : '🌅 Check-in da manhã'}</h3>
    <p class="di-rot">${gira ? 'Como você está chegando?' : 'Como você acordou?'}</p>${chips('antes.emo', EMOCOES, A.emo)}
    ${gira ? '' : `<p class="di-rot">Sono e sonhos</p>${chips('antes.sono', SONO, A.sono)}`}
    <p class="di-rot">Energia ${gira ? 'física e espiritual' : 'da manhã'}</p>${energia('antes.energia', A.energia)}</div>`;
  h += `<div class="card"><h3>${gira ? '✨ Depois da gira · Saída' : '🌙 Check-in do fim do dia'}</h3>
    <p class="di-rot">${gira ? 'Como você está saindo?' : 'Como você está encerrando o dia?'}</p>${chips('depois.emo', EMOCOES, P.emo)}
    <p class="di-rot">Energia ${gira ? 'depois do trabalho' : 'da noite'}</p>${energia('depois.energia', P.energia)}
    ${gira ? `<p class="di-rot">Sensação</p>${chips('depois.sensacao', SENSACOES, P.sensacao)}`
      : campoTexto('reflexao', 'Reflexão, gratidão ou sincronicidades (opcional)', d.reflexao, MAX_REFLEXAO, true)}</div>`;
  h += termometro(d, gira);
  if (gira) {
    h += `<div class="card"><h3>🙏 Orientações do guia</h3>
      <label class="field">Linha / falange<select data-act="dilinha"><option value="">—</option>${LINHAS_DIARIO.map(([k, t]) => `<option value="${k}" ${k === linha ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${campoTexto('conselho', 'Conselho do guia', d.conselho, MAX_CONSELHO, true)}</div>`;
  }
  return h + banho(d, gira);
}

export function render() {
  const D = estado.diario;
  if (D === null) { carregarDiario(); return '<div class="loading">Carregando o diário…</div>'; }
  if (D.erro) return `<section class="panel"><div class="card"><p class="erro">${esc(D.erro)}</p><button class="btn" data-act="direcarregar">Tentar de novo</button></div></section>`;
  if (ui.dia > hoje()) limpar();
  return `<section class="panel di-tela">${cardRoot(D)}${pilula(D)}${pendencias(D)}${calendario(D)}${dia(D)}</section>`;
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
  (ui.rasc[ui.dia] ||= {})[t.dataset.diario] = t.value;
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
  dienergia(el) { marcar(el.dataset.campo, Number(el.dataset.v)); },
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
  digira(t) {
    const auto = agendaTemGira(ui.dia);
    salvar((d) => { if (t.checked === auto) delete d.gira; else d.gira = t.checked; });
  },
  dilinha(t) { salvar((d) => { if (t.value) d.linha = t.value; else delete d.linha; }); },
  difeito(t) { salvar((d) => { if (d.banho) d.banho.feito = t.checked; }); },
  ditexto(t) { if (ui.ouvindo !== t.dataset.diario) salvarTexto(t.dataset.diario); },
};
