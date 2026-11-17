// Tela "Transparência" (Painel da Transparência): débitos, créditos (mensalidades e doações da conta B do ASAAS e os
// campos digitados), aporte da Mãe Vê e o saldo da casa, mês a mês. Trocar o mês troca todas as informações.
// Bloco ADMIN ROOT (só o root): Visível para a corrente, início e saldo inicial, valor da mensalidade, descrição das
// doações, os campos de débito e de crédito e o Puxar dados do ASAAS. Fora dele, quem edita a aba (root e Admin
// financeiro) toca em ✎ Editar valores, muda os valores do mês e confirma no Salvar. Os nomes das mensalidades só
// aparecem para quem vê a aba ASAAS (o servidor só manda para eles).

import { estado, carregarTransparencia, acaoTransparencia, avisar } from '../estado.js';
import { esc, toast } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';

const R = (v) => reais(centavos(v));
const nomeMes = (m) => { const [a, mm] = m.split('-').map(Number); const t = new Date(Date.UTC(a, mm - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dBR = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
const sinal = (v) => (v > 0 ? 'tr-pos' : v < 0 ? 'tr-neg' : '');
const virgula = (v) => String(Number(v) || 0).replace('.', ',');
// "7.131,59", "7131,59" ou "7131.59" → "7131.59" (com vírgula, o ponto é de milhar).
const numero = (s) => { const t = String(s ?? '').trim().replace(/\s|R\$/g, ''); return t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t; };

// Estado só desta tela (volta ao padrão ao trocar de aba).
// editando: valores do mês em edição { d: { nome: texto }, c: { nome: texto }, aporte } · confirmar: janela do Salvar
// cfg: campos em edição no bloco ADMIN ROOT { debitos: [nome], creditos: [nome] } · mens: 'pagas' | 'abertas'
const ui = { root: false, editando: null, confirmar: false, salvando: false, cfg: null, mens: null };
export function limpar() { Object.assign(ui, { root: false, editando: null, confirmar: false, salvando: false, cfg: null, mens: null }); }

// ---------- ADMIN ROOT ----------
function camposEd(tipo, rot) {
  const l = ui.cfg[tipo];
  return `<div class="tr-campos"><b>${rot}</b>
    ${l.map((n, i) => `<div class="tr-campo"><input type="text" id="tr-c-${tipo}-${i}" class="tr-cnome" data-t="${tipo}" value="${esc(n)}" maxlength="60" aria-label="${rot} ${i + 1}" required>
      <button type="button" class="btn small pp-ico pp-del" data-act="trcampotirar" data-t="${tipo}" data-i="${i}" aria-label="Tirar ${esc(n || 'campo')}">✕</button></div>`).join('')}
    ${l.length ? '' : '<p class="muted" style="margin:0;font-size:.85rem">Nenhum campo.</p>'}
    <button type="button" class="btn small" data-act="trcampo" data-t="${tipo}">＋ Adicionar campo</button></div>`;
}

function cardRoot(T) {
  const cab = `<button class="grp-h dobra" data-act="trdobrar" aria-expanded="${ui.root}"><h2>⚙️ Configuração do painel</h2>
    <span class="count">${T.publicada ? 'Visível para a corrente' : 'Só para quem administra'} <span class="seta" aria-hidden="true">${ui.root ? '▾' : '▸'}</span></span></button>`;
  if (!ui.root) return `<div class="card adm root">${cab}</div>`;
  const C = T.config;
  ui.cfg ||= { debitos: [...C.campos.debitos], creditos: [...C.campos.creditos] };
  return `<div class="card adm root">${cab}
    <label class="of-sw"><input type="checkbox" role="switch" data-act="trpublicar" ${T.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Visível para a corrente</b></label>
    <p class="muted" style="margin:0">${T.publicada ? 'Toda a corrente vê a aba (alunos e curimba, não).' : 'Desligado: só o root e quem administra a aba veem.'}</p>
    <form id="f-tr-cfg" class="tr-cfg" data-rascunho data-id="cfg" autocomplete="off">
      <label class="field">Mês de início do saldo<input type="month" id="tr-inicio" value="${esc(C.inicio)}" max="${esc(T.meses[0])}" required></label>
      <label class="field">Saldo inicial (R$)<input type="text" id="tr-saldo" inputmode="decimal" value="${esc(virgula(C.saldoInicial))}" required></label>
      <label class="field">Valor da mensalidade (R$)<input type="text" id="tr-mensal" inputmode="decimal" value="${esc(virgula(C.valorMensalidade))}" required></label>
      <label class="field">Descrição das doações no ASAAS<input type="text" id="tr-desc" maxlength="150" value="${esc(C.descricaoDoacao)}" required></label>
      ${camposEd('debitos', 'Campos de débito')}
      ${camposEd('creditos', 'Campos de crédito')}
      <button class="btn small primary" type="submit">Salvar configuração</button>
    </form>
    <p class="muted" style="margin:0;font-size:.85rem">Mensalidade = cobrança da conta B com esse valor e vencimento no mês. Doação = cobrança cuja descrição contém o texto acima, paga no mês. O saldo começa no mês de início com o saldo inicial e soma créditos e aporte menos débitos de cada mês.</p>
    ${T.asaas.configurado ? `<div class="tr-asaas"><button class="btn small" data-act="tratualizar">⬇️ Puxar dados do ASAAS</button>
      <span class="muted">${T.asaas.atualizadoEm ? 'Última leitura de ' + esc(nomeMes(T.mes)) + ': ' + quando(T.asaas.atualizadoEm) : 'Mês ainda não lido'} · sozinho, no máximo 1 vez por dia</span></div>`
      : '<p class="muted" style="margin:0">A conta B do ASAAS não está ligada no servidor.</p>'}
  </div>`;
}

// ---------- blocos ----------
function cardTopo(T) {
  const i = T.meses.indexOf(T.mes);
  const ed = ui.editando;
  const bts = !T.editar ? '' : ed
    ? `<div class="pp-bts tr-ed-bts"><button type="button" class="btn small" data-act="trcancelar">Cancelar</button><button type="button" class="btn small primary" data-act="trsalvar">Salvar</button></div>`
    : '<button type="button" class="btn small tr-editar" data-act="treditar">✎ Editar valores</button>';
  return `<div class="card tr-topo">
    <span class="eyebrow">Painel da transparência</span>
    <div class="tr-mes">
      <button class="btn small pp-ico" data-act="trmes" data-d="1" aria-label="Mês anterior"${i >= T.meses.length - 1 || ed ? ' disabled' : ''}>‹</button>
      <select id="tr-mes" aria-label="Escolher o mês"${ed ? ' disabled' : ''}>${T.meses.map((m) => `<option value="${m}"${m === T.mes ? ' selected' : ''}>${esc(nomeMes(m))}</option>`).join('')}</select>
      <button class="btn small pp-ico" data-act="trmes" data-d="-1" aria-label="Próximo mês"${i <= 0 || ed ? ' disabled' : ''}>›</button>
    </div>
    <div class="tr-saldo">
      <span class="muted">Saldo total${T.saldoParcial ? ' (parcial)' : ''}</span>
      <b class="${sinal(T.saldo)}">${R(T.saldo)}</b>
      <span class="muted">Resultado do mês: <b class="${sinal(T.resultado)}">${T.resultado > 0 ? '+' : ''}${R(T.resultado)}</b></span>
    </div>
    ${ed ? `<p class="tr-aviso">Editando os valores de <b>${esc(nomeMes(T.mes))}</b>. Eles valem também para os meses seguintes, até alguém mudar de novo.</p>` : ''}
    ${bts}
    ${T.saldoParcial ? '<p class="muted" style="margin:0;font-size:.82rem">Algum mês ainda não foi lido do ASAAS: o saldo completa nas próximas aberturas.</p>' : ''}
  </div>`;
}

// Uma linha de valor: em edição vira campo; fora dela, o valor.
const linhaValor = (tipo, l, cls, i) => (ui.editando
  ? `<li><span>${esc(l.nome)}</span><input type="text" id="tr-v-${tipo}-${i}" class="tr-v" data-t="${tipo}" data-nome="${esc(l.nome)}" inputmode="decimal" value="${esc(ui.editando[tipo][l.nome] ?? virgula(l.valor))}" aria-label="Valor de ${esc(l.nome)}"></li>`
  : `<li><span>${esc(l.nome)}</span><b class="${cls}">${R(l.valor)}</b></li>`);

function cardDebitos(T) {
  return `<div class="card tr-bloco tr-deb"><div class="tr-h"><h3>📉 Débitos</h3></div>
    ${T.debitos.length ? `<ul class="tr-lista">${T.debitos.map((d, i) => linhaValor('d', d, '', i)).join('')}</ul>` : '<p class="muted" style="margin:0">Nenhum campo de débito.</p>'}
    <div class="tr-tot"><span>Total de débitos</span><b class="tr-neg">${R(T.totalDebitos)}</b></div>
    ${T.herdado && T.editar && !ui.editando ? `<p class="muted" style="margin:0;font-size:.82rem">Valores repetidos de ${esc(nomeMes(T.herdado))}.</p>` : ''}</div>`;
}

function listaMens(lista, pagas) {
  const itens = lista.filter((x) => x.pago === pagas);
  if (!itens.length) return '<p class="muted" style="margin:0">Ninguém nesta lista.</p>';
  return `<ul class="tr-lista tr-nomes">${itens.map((x) => `<li><span>${esc(x.nome)}${!pagas && x.vencida ? ' <span class="badge re">vencida</span>' : ''}</span>
    <small class="muted">${pagas ? (x.pagoEm ? 'pago ' + dBR(x.pagoEm) : '') : (x.vencimento ? 'vence ' + dBR(x.vencimento) : '')}</small></li>`).join('')}</ul>`;
}

function blocoAsaas(T) {
  const A = T.asaas;
  if (!A.configurado) return '<p class="muted" style="margin:0">Mensalidades e doações: a conta B do ASAAS ainda não está ligada no servidor.</p>';
  if (!A.mensalidades) return `<p class="${A.erro ? 'erro' : 'muted'}" style="margin:0">${esc(A.erro || 'Mensalidades e doações: ainda sem leitura do ASAAS para este mês.')}</p>`;
  const M = A.mensalidades;
  const quad = (k, n, rot, cls) => {
    const ab = ui.mens === k;
    return T.verNomes
      ? `<button type="button" class="pf-of-total ${cls}${ab ? ' selecionado' : ''}" data-act="trmens" data-k="${k}" aria-expanded="${ab}"><b>${n}</b><span>${rot}</span></button>`
      : `<div class="pf-of-total ${cls}"><b>${n}</b><span>${rot}</span></div>`;
  };
  return `<div class="tr-sub"><b>Mensalidades</b><small class="muted">${R(A.valorMensalidade)} · vencimento no mês</small></div>
    <div class="pf-of-totais tr-quads">${quad('pagas', M.pagas, 'Pagas', 'tr-q-ok')}${quad('abertas', M.abertas, 'Em aberto', 'tr-q-ab')}</div>
    ${T.verNomes && ui.mens ? listaMens(M.lista || [], ui.mens === 'pagas') : ''}
    <div class="tr-tot"><span>Total pago em mensalidades</span><b class="tr-pos">${R(M.totalPago)}</b></div>
    <div class="tr-sub"><b>Doações das giras</b><small class="muted">Pix recebidos no mês</small></div>
    <div class="tr-tot"><span>${A.doacoes.quantidade} doaç${A.doacoes.quantidade === 1 ? 'ão' : 'ões'}</span><b class="tr-pos">${R(A.doacoes.total)}</b></div>
    ${A.erro ? `<p class="erro" style="margin:0">${esc(A.erro)}</p>` : ''}
    ${A.atualizadoEm ? `<p class="muted" style="margin:0;font-size:.8rem">Lido do ASAAS em ${quando(A.atualizadoEm)}.</p>` : ''}`;
}

function cardCreditos(T) {
  const extras = T.creditosExtras.length
    ? `<div class="tr-sub"><b>Outros créditos</b></div><ul class="tr-lista">${T.creditosExtras.map((c, i) => linhaValor('c', c, 'tr-pos', i)).join('')}</ul>` : '';
  return `<div class="card tr-bloco tr-cred"><div class="tr-h"><h3>📈 Créditos</h3></div>
    ${blocoAsaas(T)}${extras}
    <div class="tr-tot tr-tot-g"><span>Total de créditos</span><b class="tr-pos">${R(T.creditos)}</b></div></div>`;
}

function cardAporte(T) {
  const corpo = ui.editando
    ? `<ul class="tr-lista"><li><span>No mês</span><input type="text" id="tr-aporte" class="tr-v" inputmode="decimal" value="${esc(ui.editando.aporte)}" aria-label="Aporte Mãe Vê"></li></ul>`
    : `<div class="tr-tot"><span>No mês</span><b class="${T.aporte ? 'tr-pos' : ''}">${R(T.aporte)}</b></div>`;
  return `<div class="card tr-bloco tr-apo"><div class="tr-h"><h3>🤲 Aporte Mãe Vê</h3></div>${corpo}</div>`;
}

function cardTotal(T) {
  return `<div class="card tr-bloco tr-res"><div class="tr-h"><h3>🧮 Totalizado</h3></div>
    <ul class="tr-lista">
      <li><span>Créditos</span><b class="tr-pos">${R(T.creditos)}</b></li>
      <li><span>Aporte Mãe Vê</span><b class="tr-pos">${R(T.aporte)}</b></li>
      <li><span>Débitos</span><b class="tr-neg">− ${R(T.totalDebitos)}</b></li>
    </ul>
    <div class="tr-tot"><span>Resultado do mês</span><b class="${sinal(T.resultado)}">${T.resultado > 0 ? '+' : ''}${R(T.resultado)}</b></div>
    <ul class="tr-lista"><li><span>Saldo anterior</span><b class="${sinal(T.saldoAnterior)}">${R(T.saldoAnterior)}</b></li></ul>
    <div class="tr-tot tr-tot-g"><span>Saldo total${T.saldoParcial ? ' (parcial)' : ''}</span><b class="${sinal(T.saldo)}">${R(T.saldo)}</b></div>
  </div>`;
}

function janelaConfirmar(T) {
  if (!ui.confirmar) return '';
  return `<div class="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="tr-cf-t"><div class="modal">
    <h3 id="tr-cf-t">Salvar os valores?</h3>
    <p style="margin:0">Os valores de <b>${esc(nomeMes(T.mes))}</b> passam a valer para este mês e para os seguintes, até alguém mudar de novo. O saldo é recalculado.</p>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" data-act="trconfirmarnao"${ui.salvando ? ' disabled' : ''}>Cancelar</button><button class="btn primary" data-act="trconfirmar"${ui.salvando ? ' disabled' : ''}>${ui.salvando ? 'Salvando…' : 'Confirmar'}</button></div>
  </div></div>`;
}

export function render() {
  const T = estado.transparencia;
  if (T === null) { carregarTransparencia(); return '<div class="loading">Carregando o painel…</div>'; }
  if (T.erro) return `<div class="card"><p class="erro">${esc(T.erro)}</p><button class="btn" data-act="trrecarregar">Tentar de novo</button></div>`;
  if (T.carregando) return '<div class="loading">Carregando o mês…</div>';
  let h = '<section class="panel tr-tela">';
  if (T.root) h += cardRoot(T);
  const cards = cardDebitos(T) + cardCreditos(T) + cardAporte(T) + cardTotal(T);
  // Em edição, os campos dos blocos ficam num formulário só (o que foi digitado volta depois de um redesenho).
  h += cardTopo(T) + (ui.editando ? `<form id="f-tr-val" class="tr-val" data-rascunho data-id="${esc(T.mes)}" autocomplete="off">${cards}</form>` : cards);
  return h + janelaConfirmar(T) + '</section>';
}

// ---------- eventos ----------
// Guarda o que foi digitado antes de redesenhar.
function lerValores() {
  if (!ui.editando) return;
  document.querySelectorAll('#f-tr-val .tr-v[data-t]').forEach((i) => { ui.editando[i.dataset.t][i.dataset.nome] = i.value; });
  const a = document.getElementById('tr-aporte');
  if (a) ui.editando.aporte = a.value;
}
function lerCampos() {
  if (!ui.cfg) return;
  for (const t of ['debitos', 'creditos']) ui.cfg[t] = [...document.querySelectorAll(`#f-tr-cfg .tr-cnome[data-t="${t}"]`)].map((i) => i.value);
}
function irPara(mes, atualizar = false) {
  ui.editando = null;
  ui.mens = null;
  estado.transparencia = { ...estado.transparencia, carregando: true };
  avisar();
  carregarTransparencia(mes, atualizar);
}
async function salvarValores() {
  const T = estado.transparencia;
  const E = ui.editando;
  const linhas = (lista, t) => lista.map((l) => ({ nome: l.nome, valor: numero(E[t][l.nome] ?? virgula(l.valor)) || '0' }));
  ui.salvando = true;
  avisar();
  const ok = await acaoTransparencia('mes', { debitos: linhas(T.debitos, 'd'), creditos: linhas(T.creditosExtras, 'c'), aporte: numero(E.aporte) || '0' });
  ui.salvando = false;
  ui.confirmar = false;
  if (ok) { ui.editando = null; toast('Valores do mês salvos.'); }
  avisar();
}

export const cliques = {
  trrecarregar() { estado.transparencia = null; avisar(); },
  trdobrar() { ui.root = !ui.root; if (!ui.root) ui.cfg = null; avisar(); },
  trmes(el) {
    const T = estado.transparencia;
    const m = T.meses[T.meses.indexOf(T.mes) + Number(el.dataset.d)];
    if (m) irPara(m);
  },
  tratualizar() { irPara(estado.transparencia.mes, true); },
  trmens(el) { ui.mens = ui.mens === el.dataset.k ? null : el.dataset.k; avisar(); },
  treditar() {
    const T = estado.transparencia;
    ui.editando = { d: {}, c: {}, aporte: virgula(T.aporte) };
    avisar();
  },
  trcancelar() { ui.editando = null; avisar(); },
  trsalvar() { lerValores(); ui.confirmar = true; avisar(); },
  trconfirmarnao() { ui.confirmar = false; avisar(); },
  trconfirmar() { if (!ui.salvando) salvarValores(); },
  trcampo(el) { lerCampos(); ui.cfg[el.dataset.t].push(''); avisar(); },
  trcampotirar(el) { lerCampos(); ui.cfg[el.dataset.t].splice(Number(el.dataset.i), 1); avisar(); },
};

// Troca de mês (combo) e o interruptor Visível para a corrente.
export async function mudou(t) {
  if (t.id === 'tr-mes') { irPara(t.value); return; }
  if (t.dataset.act === 'trpublicar' && await acaoTransparencia('publicar', { publicada: t.checked })) {
    toast(t.checked ? 'Painel visível para a corrente.' : 'Painel visível só para quem administra.');
  }
}

export async function enviar(form) {
  if (form.id === 'f-tr-val') { cliques.trsalvar(); return; }   // Enter num campo: pede a confirmação, como o Salvar
  lerCampos();
  const v = (id) => document.getElementById(id).value.trim();
  const campos = { debitos: ui.cfg.debitos.map((n) => n.trim()), creditos: ui.cfg.creditos.map((n) => n.trim()) };
  if (await acaoTransparencia('config', { inicio: v('tr-inicio'), saldoInicial: numero(v('tr-saldo')), valorMensalidade: numero(v('tr-mensal')), descricaoDoacao: v('tr-desc'), campos })) {
    ui.cfg = null;
    toast('Configuração salva.');
    avisar();
  }
}
