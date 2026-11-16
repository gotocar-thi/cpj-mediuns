// Tela "ASAAS" (só o root): liga o Pix na aba Compras (cada Pedir gera um link de pagamento), acompanha
// os pedidos pagos e por pagar, mostra se a Vercel está configurada e o retorno do webhook (os eventos que o
// ASAAS mandou e o que o app fez com cada um).

import { estado, carregarAsaas, acaoAsaas, avisar } from '../estado.js';
import { esc, toast } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';

const R = (v) => reais(centavos(v));
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const URL_WEBHOOK = location.origin + '/api/oferendas?webhook=asaas';
const STATUS = { pendente: ['Aguardando pagamento', 'new'], paga: ['Paga', 'pleno'], vencida: ['Vencida', 're'], cancelada: ['Cancelada', 're'], estornada: ['Estornada', 're'] };
const badge = (s) => { const [t, c] = STATUS[s] || [s, '']; return `<span class="badge ${c}">${esc(t)}</span>`; };

// Todos os blocos e sub-blocos começam minimizados.
const ui = { conexao: false, cobrancas: false, eventos: false, cobGrupos: new Set(), evValores: new Set() };
export function limpar() { ui.conexao = false; ui.cobrancas = false; ui.eventos = false; ui.cobGrupos.clear(); ui.evValores.clear(); }

// Primeiro bloco, minimizado: o toggle do Pix e a configuração. Minimizado, mostra se o Pix está ligado e o ambiente.
function cardConexao(A) {
  const C = A.config;
  const ok = C.chave && C.token;
  const cab = `<button class="grp-h dobra" data-act="asaasdobrar" data-k="conexao" aria-expanded="${ui.conexao}"><h2>Conexão</h2>
    <span class="count">${A.ativo ? 'Pix ligado' : 'Pix desligado'} · ${esc(C.ambiente)} <span class="seta" aria-hidden="true">${ui.conexao ? '▾' : '▸'}</span></span></button>`;
  if (!ui.conexao) return `<div class="card adm">${cab}</div>`;
  const item = (v, t) => `<li>${v ? '✅' : '❌'} ${t}</li>`;
  return `<div class="card adm">${cab}
    <label class="of-sw"><input type="checkbox" role="switch" data-act="asaasativo" ${A.ativo ? 'checked' : ''} ${!ok && !A.ativo ? 'disabled' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Pix visível nas Compras</b></label>
    <p class="muted" style="margin:0">${A.ativo ? 'Cada Pedir na aba Compras gera um link de pagamento Pix.' : 'Desligado: os pedidos da aba Compras não geram link de pagamento.'}</p>
    <ul class="as-cfg">${item(C.chave, 'ASAAS_API_KEY na Vercel')}${item(C.token, 'ASAAS_WEBHOOK_TOKEN na Vercel')}</ul>
    <label class="field">URL do webhook (cole no ASAAS, com o mesmo token)<input type="text" id="as-url" readonly value="${esc(URL_WEBHOOK)}"></label>
    <div class="cp-bts"><button class="btn" data-act="asaascopiar"><span aria-hidden="true">📋</span> Copiar URL</button></div>
    <p class="muted" style="margin:0">As chaves ficam só nas variáveis da Vercel; o app nunca mostra o valor delas.</p></div>`;
}

// Sub-bloco que abre e fecha (começa minimizado), dentro de Pedidos e pagamentos e de Retorno do ASAAS.
function sub(conjunto, k, titulo, resumo, corpo) {
  const aberto = ui[conjunto].has(k);
  return `<div class="as-sub"><button class="as-sub-h" data-act="asaassub" data-c="${conjunto}" data-k="${esc(k)}" aria-expanded="${aberto}">
    <b>${titulo}</b><span class="as-sub-x">${resumo}<span class="seta" aria-hidden="true">${aberto ? '▾' : '▸'}</span></span></button>
    ${aberto ? `<div class="as-sub-c">${corpo()}</div>` : ''}</div>`;
}
// Junta em grupos mantendo a ordem em que aparecem (a lista já vem da mais nova para a mais antiga).
function juntar(lista, chave) {
  const m = new Map();
  lista.forEach((x) => { const k = chave(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return [...m.entries()];
}

function linhaCobranca(c) {
  return `<li>
    <span class="as-l1"><b>${esc(c.nome)}</b>${badge(c.status)}</span>
    ${c.itens?.length ? `<span class="as-l2">${esc(c.itens.join(', '))}</span>` : ''}
    <span class="as-l2 muted">Pedido nº ${c.pedido} · gerado ${quando(c.criadoEm)}${c.pagoEm ? ' · pago ' + quando(c.pagoEm) : c.status === 'pendente' && c.vencimento ? ' · vence ' + new Date(c.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : ''}${c.link ? ` · <a href="${esc(c.link)}" target="_blank" rel="noopener">link</a>` : ''}</span>
    <span class="as-l3"><b>${R(c.valor)}</b>${c.status === 'pendente'
      ? (estado.confirm === 'asc:' + c.id ? `<button class="btn small danger" data-act="asaascancelar" data-id="${c.id}">Confirmar cancelamento</button>` : `<button class="btn small danger" data-act="askdel" data-k="asc:${c.id}">Cancelar</button>`)
      : ''}</span></li>`;
}

// Pedidos e pagamentos: começa minimizado; dentro, um sub-bloco por grupo da aba Compras (também minimizados).
function cardCobrancas(A) {
  const L = A.cobrancas;
  const cab = `<button class="grp-h dobra" data-act="asaasdobrar" data-k="cobrancas" aria-expanded="${ui.cobrancas}"><h2>Pedidos e pagamentos</h2>
    <span class="count">${L.filter((c) => c.status === 'pendente').length} pendentes · ${L.length} <span class="seta" aria-hidden="true">${ui.cobrancas ? '▾' : '▸'}</span></span></button>`;
  if (!ui.cobrancas) return `<div class="card adm">${cab}</div>`;
  if (!L.length) return `<div class="card adm">${cab}<p class="muted" style="margin:0">Nenhum link de pagamento gerado ainda.</p></div>`;
  const grupos = juntar(L, (c) => (c.grupos?.length ? c.grupos.join(' + ') : 'Sem grupo'));
  return `<div class="card adm">${cab}<div class="as-subs">${grupos.map(([nome, cs]) => {
    const pend = cs.filter((c) => c.status === 'pendente').length;
    return sub('cobGrupos', nome, esc(nome), `${pend ? `${pend} ${pend === 1 ? 'pendente' : 'pendentes'} · ` : ''}${cs.length}`, () => `<ul class="as-lista">${cs.map(linhaCobranca).join('')}</ul>`);
  }).join('')}</div></div>`;
}

// Do que se trata: os itens da cobrança (quando é do app) ou a descrição que veio do ASAAS.
function linhaEvento(e) {
  const oque = e.itens?.length ? e.itens.join(', ') : e.descricao || '';
  return `<li>
      <span class="as-l1"><b>${esc(e.evento)}</b><span class="muted">${quando(e.recebidoEm)}</span></span>
      <span class="as-l2">${e.nome ? `${esc(e.nome)} · pedido nº ${e.pedido}` : esc(e.paymentId || '—')}${e.status ? ` · <span class="muted">${esc(e.status)}</span>` : ''}</span>
      ${oque ? `<span class="as-l2">${esc(oque)}</span>` : ''}
      <span class="as-l2 muted">→ ${esc(e.resultado || '—')}</span></li>`;
}

// Retorno do ASAAS: os eventos juntos por valor; cada valor começa minimizado.
function cardEventos(A) {
  const L = A.eventos;
  const cab = `<button class="grp-h dobra" data-act="asaasdobrar" data-k="eventos" aria-expanded="${ui.eventos}"><h2>Retorno do ASAAS</h2>
    <span class="count">${L.length} <span class="seta" aria-hidden="true">${ui.eventos ? '▾' : '▸'}</span></span></button>`;
  if (!ui.eventos) return `<div class="card adm">${cab}</div>`;
  const porValor = juntar(L, (e) => (e.valor != null && e.valor !== '' ? R(Number(e.valor)) : 'Sem valor'));
  const corpo = L.length ? `<div class="as-subs">${porValor.map(([valor, es]) => sub('evValores', valor, esc(valor), `${es.length} ${es.length === 1 ? 'evento' : 'eventos'} `, () => `<ul class="as-lista">${es.map(linhaEvento).join('')}</ul>`)).join('')}</div>`
    : '<p class="muted" style="margin:0">Nenhum evento recebido ainda.</p>';
  return `<div class="card adm">${cab}${corpo}
    <div class="cp-bts"><button class="btn" data-act="asaasatualizar"><span aria-hidden="true">↻</span> Atualizar</button></div></div>`;
}

export function render() {
  if (estado.asaas === null) { carregarAsaas(); return '<div class="loading">Carregando o ASAAS…</div>'; }
  const A = estado.asaas;
  if (A.erro) return `<section class="panel"><div class="card"><p class="erro">${esc(A.erro)}</p><button class="btn" data-act="asaasatualizar">Tentar de novo</button></div></section>`;
  return `<section class="panel">${cardConexao(A)}${cardCobrancas(A)}${cardEventos(A)}</section>`;
}

export const cliques = {
  asaasdobrar(el) { ui[el.dataset.k] = !ui[el.dataset.k]; avisar(); },
  asaassub(el) { const s = ui[el.dataset.c]; const k = el.dataset.k; if (s.has(k)) s.delete(k); else s.add(k); avisar(); },
  asaasatualizar() { estado.asaas = null; avisar(); },
  async asaascancelar(el) { if (await acaoAsaas('cancelar', { id: el.dataset.id })) toast('Cobrança cancelada.'); },
  asaascopiar() {
    const fb = () => { const t = document.getElementById('as-url'); t.focus(); t.select(); toast('URL selecionada. Copie com o menu do aparelho.'); };
    try { navigator.clipboard.writeText(URL_WEBHOOK).then(() => toast('Copiado.'), fb); } catch { fb(); }
  },
};

export const mudancas = {
  async asaasativo(t) { if (!(await acaoAsaas('ativar', { ativo: t.checked }))) t.checked = !t.checked; },
};
