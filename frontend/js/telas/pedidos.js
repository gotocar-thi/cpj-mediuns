// Sub-aba "Pedidos" (aba Compras): só quem administra a aba Compras (o root e o Admin; o servidor confere).
// Bloco "Pedidos em andamento": uma linha por pedido (cada linha das Compras, sem as doações) com descrição, quem pediu,
// pagamento (Pago / Pendente) e andamento, agrupadas pelo andamento. O andamento muda no combo da própria linha.
// Quem tem cobrança vencida no ASAAS (última leitura do CPJ - Pgto atrasado) ganha o selo vermelho "pendências R$ X".

import { estado, carregarPedidos, mudarAndamento, avisar } from '../estado.js';
import { esc } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';

const R = (v) => reais(centavos(v));
// Ordem dos grupos na tela e das opções do combo.
const ANDAMENTOS = [
  ['pendente', 'Pendente'],
  ['em_confeccao', 'Em confecção'],
  ['falta_materia', 'Falta matéria-prima'],
  ['concluido', 'Concluído'],
  ['entregue', 'Entregue'],
];
// fechados: grupos minimizados (Entregue começa assim); salvando: id da linha indo ao servidor.
const ui = { fechados: new Set(['entregue']), salvando: null };
export function limpar() { ui.fechados = new Set(['entregue']); ui.salvando = null; }

function linha(l, pend) {
  const p = pend[l.chave] || 0;
  const opcoes = ANDAMENTOS.map(([k, rot]) => `<option value="${k}"${l.andamento === k ? ' selected' : ''}>${rot}</option>`).join('');
  return `<li class="pd-l">
    <div class="pd-l1"><span class="pd-d">${l.quantidade > 1 ? `${l.quantidade}x ` : ''}${esc(l.descricao)}</span><span class="pd-v">${R(l.valor * l.quantidade)}</span></div>
    <div class="pd-l2"><span class="pd-nome">${esc(l.nome)}</span><span class="muted pd-n">nº ${l.pedido}</span>
      ${l.pago ? '<span class="badge pleno">Pago</span>' : '<span class="badge pd-pend">Pendente</span>'}
      ${p > 0 ? `<span class="badge pd-divida" title="Cobranças vencidas no ASAAS">pendências ${R(p)}</span>` : ''}</div>
    <select class="pd-and" data-act="pdandamento" data-id="${esc(l.id)}" aria-label="Andamento do pedido de ${esc(l.nome)}"${ui.salvando === l.id ? ' disabled' : ''}>${opcoes}</select>
  </li>`;
}

export function render() {
  const P = estado.pedidos;
  if (P === null) { carregarPedidos(); return '<div class="loading">Carregando os pedidos…</div>'; }
  if (P.erroTela) return `<section class="panel"><div class="card"><p class="erro">${esc(P.erroTela)}</p><button class="btn" data-act="pdrecarregar">Tentar de novo</button></div></section>`;
  const lista = P.pedidos || [];
  const pend = P.pendencias || {};
  const abertos = lista.filter((l) => l.andamento !== 'entregue').length;
  let h = `<section class="panel pd-tela"><div class="card adm adm-compras"><div class="grp-h"><h2>📦 Pedidos em andamento</h2><span class="count">${abertos}</span></div>`;
  if (!lista.length) return h + '<p class="muted" style="margin:0">Nenhum pedido ainda.</p></div></section>';
  h += ANDAMENTOS.map(([k, rot]) => {
    const L = lista.filter((l) => l.andamento === k).sort((a, b) => b.pedido - a.pedido || a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!L.length) return '';
    const aberto = !ui.fechados.has(k);
    const cab = `<button class="grp-h dobra" data-act="pddobrar" data-k="${k}" aria-expanded="${aberto}"><h3>${rot}</h3>
      <span class="count">${L.length} <span class="seta" aria-hidden="true">${aberto ? '▾' : '▸'}</span></span></button>`;
    return `<div class="pd-grupo pd-${k}">${cab}${aberto ? `<ul class="pd-lista">${L.map((l) => linha(l, pend)).join('')}</ul>` : ''}</div>`;
  }).join('');
  return h + '</div></section>';
}

export const cliques = {
  pddobrar(el) { const k = el.dataset.k; if (ui.fechados.has(k)) ui.fechados.delete(k); else ui.fechados.add(k); avisar(); },
  pdrecarregar() { estado.pedidos = null; avisar(); },
};

export const mudancas = {
  async pdandamento(t) {
    // Com erro, o redesenho volta o combo para o andamento que está no servidor.
    ui.salvando = t.dataset.id;
    avisar();
    await mudarAndamento(t.dataset.id, t.value);
    ui.salvando = null;
    avisar();
  },
};
