// Sub-aba "Pagamentos" (aba Compras): o histórico de cobranças do ASAAS de quem está logado, pelo CPF do Perfil
// (api/_lib/pagamentos.js), agrupado pelo mês de vencimento. No topo, três quadradinhos (Pago, Pendente, Atraso) com o
// total e quantas; tocar num deles mostra só as cobranças daquela situação, numa lista só. Cada cobrança vem minimizada
// (descrição, valor e situação); tocar abre Descrição, Valor, Forma de pagamento e Vencimento e, se falta pagar, Pagar.
// O root liga "Visível para todos"; desligado, só ele vê.

import { estado, carregarPagamentos, publicarPagamentos, avisar } from '../estado.js';
import { esc, toast } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';

const R = (v) => reais(centavos(v));
// aberta: id da cobrança aberta (uma por vez); filtro: quadradinho escolhido ('pago', 'pendente', 'atraso' ou null).
const ui = { meses: new Set(), iniciado: false, atualizando: false, aberta: null, filtro: null };
export function limpar() { ui.meses.clear(); ui.iniciado = false; ui.aberta = null; ui.filtro = null; }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`.replace(/^./, (c) => c.toUpperCase());
const dBR = (s) => (/^\d{4}-\d{2}-\d{2}/.test(String(s || '')) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s);

// Situação e forma de pagamento como o ASAAS manda, em português.
const STATUS = {
  PENDING: ['Aguardando pagamento', 'new'], RECEIVED: ['Recebida', 'pleno'], CONFIRMED: ['Confirmada', 'pleno'], RECEIVED_IN_CASH: ['Recebida em dinheiro', 'pleno'],
  OVERDUE: ['Vencida', 're'], REFUNDED: ['Estornada', 're'], REFUND_REQUESTED: ['Estorno pedido', 're'], REFUND_IN_PROGRESS: ['Estorno em andamento', 're'],
  CHARGEBACK_REQUESTED: ['Contestação', 're'], CHARGEBACK_DISPUTE: ['Contestação em disputa', 're'], AWAITING_CHARGEBACK_REVERSAL: ['Aguardando reversão', 're'],
  DUNNING_REQUESTED: ['Negativação pedida', 're'], DUNNING_RECEIVED: ['Recuperada', 'pleno'], AWAITING_RISK_ANALYSIS: ['Em análise', 'new'],
};
const FORMA = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', UNDEFINED: 'A definir', TRANSFER: 'Transferência', DEPOSIT: 'Depósito' };
const mesDe = (c) => String(c.dueDate || c.dateCreated || '').slice(0, 7) || 'sem data';
const selo = (s) => { const [t, cls] = STATUS[s] || [s || '—', '']; return `<span class="badge ${cls}">${esc(t)}</span>`; };

// Os três quadradinhos: quais situações do ASAAS entram em cada um.
const GRUPOS = [
  ['pago', 'Pago', 'as-q-ok', ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED']],
  ['pendente', 'Pendente', 'as-q-pend', ['PENDING', 'AWAITING_RISK_ANALYSIS']],
  ['atraso', 'Atraso', 'as-q-atr', ['OVERDUE', 'DUNNING_REQUESTED']],
];
const grupoDe = (c) => GRUPOS.find(([, , , st]) => st.includes(c.status))?.[0] || null;
const falta = (c) => grupoDe(c) === 'pendente' || grupoDe(c) === 'atraso';
const soma = (L) => L.reduce((s, c) => s + Number(c.value || 0), 0);

function cardRoot(P) {
  if (!P.root) return '';
  return `<div class="card adm ervas-pub"><label class="of-sw"><input type="checkbox" role="switch" data-act="pagpub" ${P.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Visível para todos</b></label>
    <p class="muted" style="margin:0;font-size:.85rem">${P.publicada ? 'Todos veem os próprios pagamentos.' : 'Desligado: só o root vê esta sub-aba.'}</p></div>`;
}

// Uma cobrança: minimizada (descrição, valor e situação); aberta, os quatro dados e, se falta pagar, o botão da fatura.
function item(c) {
  const ab = ui.aberta === c.id;
  const linha = `<button type="button" class="pg-l" data-act="pagitem" data-id="${esc(c.id)}" aria-expanded="${ab}">
    <span class="pg-l-d">${esc(c.description || 'Cobrança')}</span><span class="pg-l-v">${R(c.value)}</span>${selo(c.status)}<span class="seta" aria-hidden="true">${ab ? '▾' : '▸'}</span></button>`;
  if (!ab) return `<div class="pg-item">${linha}</div>`;
  const pagar = falta(c) && /^https:\/\//.test(c.invoiceUrl || '')
    ? `<a class="btn primary small pg-pagar" href="${esc(c.invoiceUrl)}" target="_blank" rel="noopener noreferrer">Pagar</a>` : '';
  return `<div class="pg-item aberta">${linha}<dl class="pg-dados">
    <div class="pg-d pg-d-full"><dt>Descrição</dt><dd>${esc(c.description || '—')}</dd></div>
    <div class="pg-d"><dt>Valor</dt><dd>${R(c.value)}</dd></div>
    <div class="pg-d"><dt>Forma de pagamento</dt><dd>${esc(FORMA[c.billingType] || c.billingType || '—')}</dd></div>
    <div class="pg-d"><dt>Vencimento</dt><dd>${c.dueDate ? dBR(c.dueDate) : '—'}</dd></div>
    ${pagar ? `<div class="pg-d pg-d-pagar">${pagar}</div>` : ''}
  </dl></div>`;
}

export function render() {
  const P = estado.pagamentos;
  if (P === null) { carregarPagamentos(); return '<div class="loading">Carregando os pagamentos…</div>'; }
  if (P.erroTela) return `<section class="panel"><div class="card"><p class="erro">${esc(P.erroTela)}</p><button class="btn" data-act="pagatualizar">Tentar de novo</button></div></section>`;
  let h = `<section class="panel pg-tela">${cardRoot(P)}`;
  if (P.configurado === false) return h + '<div class="card"><p class="muted" style="margin:0">O ASAAS não está ligado no servidor.</p></div></section>';
  if (!P.temCpf) return h + '<div class="card"><h2>💳 Meus pagamentos</h2><p class="muted" style="margin:0">Cadastre o seu CPF na aba Perfil para ver o histórico de pagamentos do ASAAS.</p></div></section>';
  const lista = P.pagamentos || [];
  const quando = P.atualizadoEm ? new Date(P.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ') : '';
  // Quadradinhos: total e quantas de cada situação; tocar filtra (tocar de novo volta aos meses).
  const quads = GRUPOS.map(([k, rot, cls]) => {
    const L = lista.filter((c) => grupoDe(c) === k);
    const sel = ui.filtro === k;
    return `<button type="button" class="pf-of-total ${cls}${sel ? ' selecionado' : ''}" data-act="pagfiltro" data-k="${k}" aria-pressed="${sel}" ${L.length ? '' : 'disabled'}>
      <b>${R(soma(L))}</b><span>${rot} · ${L.length}</span></button>`;
  }).join('');
  h += `<div class="card pg-cab"><div class="grp-h"><h2>💳 Meus pagamentos</h2><span class="count">${lista.length}</span></div>
    <div class="pf-of-totais pg-quads">${quads}</div>
    ${P.erro ? `<p class="muted at-erro">${esc(P.erro)}</p>` : ''}
    <div class="at-rodape"><span class="muted">${quando ? `Lido em ${quando} · 1 vez por dia, às 9h` : 'Ainda não lido'}</span><button class="btn small" data-act="pagatualizar"${ui.atualizando ? ' disabled' : ''}>${ui.atualizando ? 'Atualizando…' : '↻ Atualizar'}</button></div></div>`;
  if (!lista.length) return h + '<div class="card"><p class="muted" style="margin:0">Nenhuma cobrança no seu CPF.</p></div></section>';
  // Filtro: só as cobranças da situação escolhida, numa lista (as que falta pagar, da que vence antes).
  if (ui.filtro) {
    const [, rot] = GRUPOS.find(([k]) => k === ui.filtro);
    const L = lista.filter((c) => grupoDe(c) === ui.filtro)
      .sort((a, b) => (ui.filtro === 'pago' ? String(b.dueDate || '').localeCompare(String(a.dueDate || '')) : String(a.dueDate || '').localeCompare(String(b.dueDate || ''))));
    return h + `<div class="card pg-mes"><div class="grp-h"><h3>${rot}</h3><span class="count">${L.length} · ${R(soma(L))}</span></div>
      <div class="pg-lista">${L.map(item).join('')}</div>
      <button class="btn link small" data-act="pagfiltro" data-k="${ui.filtro}">Ver todos os meses</button></div></section>`;
  }
  // Um bloco por mês, do mais recente; o primeiro começa aberto.
  const porMes = new Map();
  lista.forEach((c) => { const m = mesDe(c); if (!porMes.has(m)) porMes.set(m, []); porMes.get(m).push(c); });
  const meses = [...porMes.keys()].sort().reverse();
  if (!ui.iniciado) { ui.iniciado = true; if (meses[0]) ui.meses.add(meses[0]); }
  h += meses.map((m) => {
    const L = porMes.get(m).sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));
    const aberto = ui.meses.has(m);
    const cab = `<button class="grp-h dobra" data-act="pagmes" data-m="${esc(m)}" aria-expanded="${aberto}"><h3>${esc(m === 'sem data' ? 'Sem data' : nomeMes(m))}</h3>
      <span class="count">${L.length} · ${R(soma(L))} <span class="seta" aria-hidden="true">${aberto ? '▾' : '▸'}</span></span></button>`;
    if (!aberto) return `<div class="card pg-mes">${cab}</div>`;
    return `<div class="card pg-mes">${cab}<div class="pg-lista">${L.map(item).join('')}</div></div>`;
  }).join('');
  return h + '</section>';
}

export const cliques = {
  pagitem(el) { ui.aberta = ui.aberta === el.dataset.id ? null : el.dataset.id; avisar(); },
  pagfiltro(el) { ui.filtro = ui.filtro === el.dataset.k ? null : el.dataset.k; ui.aberta = null; avisar(); },
  pagmes(el) { const m = el.dataset.m; if (ui.meses.has(m)) ui.meses.delete(m); else ui.meses.add(m); avisar(); },
  async pagatualizar() {
    if (ui.atualizando) return;
    ui.atualizando = true;
    avisar();
    await carregarPagamentos(true);
    ui.atualizando = false;
    if (estado.pagamentos?.erro) toast(estado.pagamentos.erro);
    avisar();
  },
};

export const mudancas = {
  async pagpub(t) {
    if (await publicarPagamentos(t.checked)) toast(t.checked ? 'Pagamentos visíveis para todos.' : 'Pagamentos: só o root vê.');
    else t.checked = !t.checked;
  },
};
