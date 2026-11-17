// Tela "Transparência" (Painel da Transparência): o saldo da casa, débitos e créditos (mensalidades e doações da conta B
// do ASAAS, outros créditos e o aporte da Mãe Vê), mês a mês. Trocar o mês troca todas as informações.
// Tudo se ajusta na própria tela: ✎ Editar transforma os valores em campos e o Salvar pede confirmação. Quem edita a
// aba (root e Admin financeiro) muda os valores; o root também muda a estrutura no mesmo lugar (adicionar, renomear e
// tirar linhas, valor da mensalidade, descrição das doações, mês de início e saldo inicial), liga Visível para a
// corrente e puxa os dados do ASAAS. Os nomes das mensalidades, das doações e de quem está fora da contagem só aparecem
// para quem vê a aba ASAAS (o servidor só manda para eles).

import { estado, carregarTransparencia, acaoTransparencia, avisar } from '../estado.js';
import { esc, toast } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';

const R = (v) => reais(centavos(v));
const nomeMes = (m) => { const [a, mm] = m.split('-').map(Number); const t = new Date(Date.UTC(a, mm - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dBR = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
const sinal = (v) => (v > 0 ? 'tr-pos' : v < 0 ? 'tr-neg' : '');
const mais = (v) => (v > 0 ? '+' : '') + R(v);
const virgula = (v) => String(Number(v) || 0).replace('.', ',');
// "7.131,59", "7131,59" ou "7131.59" → "7131.59" (com vírgula, o ponto é de milhar).
const numero = (s) => { const t = String(s ?? '').trim().replace(/\s|R\$/g, ''); return t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t; };

// Estado só desta tela (volta ao padrão ao trocar de aba).
// ed: edição em andamento — linhas { debitos: [{ nome, de, valor }], creditos: [...] } (de = nome original, para
//     renomear), aporte e, para o root, mensal, desc, inicio, saldoIni · confirmar: janela do Salvar
// mens: quadradinho aberto ('pagas' | 'abertas' | 'corrente') · doacoes: lista de doações aberta
const ui = { ed: null, confirmar: false, salvando: false, mens: null, doacoes: false };
export function limpar() { Object.assign(ui, { ed: null, confirmar: false, salvando: false, mens: null, doacoes: false }); }
const estrutura = (T) => !!(ui.ed && T.root);

// ---------- topo ----------
function cardTopo(T) {
  const i = T.meses.indexOf(T.mes);
  const ed = !!ui.ed;
  const bts = !T.editar ? '' : ed
    ? `<div class="pp-bts tr-ed-bts"><button type="button" class="btn small" data-act="trcancelar">Cancelar</button><button type="button" class="btn small primary" data-act="trsalvar">Salvar</button></div>`
    : '<button type="button" class="btn small tr-editar" data-act="treditar">✎ Editar</button>';
  return `<div class="card tr-topo">
    <div class="tr-topo-l1"><span class="eyebrow">Painel da transparência</span>
      ${T.root ? `<label class="of-sw tr-vis"><input type="checkbox" role="switch" data-act="trpublicar" ${T.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><span>Visível para a corrente</span></label>` : ''}</div>
    <div class="tr-mes">
      <button class="btn small pp-ico" data-act="trmes" data-d="1" aria-label="Mês anterior"${i >= T.meses.length - 1 || ed ? ' disabled' : ''}>‹</button>
      <select id="tr-mes" aria-label="Escolher o mês"${ed ? ' disabled' : ''}>${T.meses.map((m) => `<option value="${m}"${m === T.mes ? ' selected' : ''}>${esc(nomeMes(m))}</option>`).join('')}</select>
      <button class="btn small pp-ico" data-act="trmes" data-d="-1" aria-label="Próximo mês"${i <= 0 || ed ? ' disabled' : ''}>›</button>
    </div>
    ${ed ? `<p class="tr-aviso">Editando <b>${esc(nomeMes(T.mes))}</b>: os valores valem para este mês e os seguintes, até alguém mudar de novo.${T.root ? ' Linhas, mensalidade, descrição e saldo inicial valem para todos os meses.' : ''}</p>` : ''}
    ${bts}
  </div>`;
}

// ---------- totalizado (logo abaixo do topo: o resumo do mês) ----------
function cardTotal(T) {
  const entradas = T.creditos + T.aporte;
  const ini = estrutura(T)
    ? `<div class="tr-ini"><label class="field">Início do saldo<input type="month" id="tr-inicio" value="${esc(ui.ed.inicio)}" max="${esc(T.meses[0])}" required></label>
        <label class="field">Saldo inicial (R$)<input type="text" id="tr-saldoini" inputmode="decimal" value="${esc(ui.ed.saldoIni)}" required></label></div>` : '';
  return `<div class="card tr-bloco tr-res">
    <div class="tr-saldo"><span class="muted">Saldo total${T.saldoParcial ? ' (parcial)' : ''}</span><b class="${sinal(T.saldo)}">${R(T.saldo)}</b></div>
    <ul class="tr-lista">
      <li><span>Saldo anterior</span><b class="${sinal(T.saldoAnterior)}">${R(T.saldoAnterior)}</b></li>
      <li><span>Entradas (créditos e aporte)</span><b class="tr-pos">${R(entradas)}</b></li>
      <li><span>Débitos</span><b class="tr-neg">− ${R(T.totalDebitos)}</b></li>
    </ul>
    <div class="tr-tot"><span>Resultado do mês</span><b class="${sinal(T.resultado)}">${mais(T.resultado)}</b></div>
    ${ini}
    ${T.saldoParcial ? '<p class="muted" style="margin:0;font-size:.82rem">Algum mês ainda não foi lido do ASAAS: o saldo completa nas próximas aberturas.</p>' : ''}
  </div>`;
}

// ---------- linhas digitadas (débitos e outros créditos) ----------
// Fora da edição: nome e valor. Editando: o valor vira campo; para o root, o nome também, com ✕ e ＋ Adicionar.
function linhas(T, tipo, lista, cls) {
  if (!ui.ed) return lista.length ? `<ul class="tr-lista">${lista.map((l) => `<li><span>${esc(l.nome)}</span><b class="${cls}">${R(l.valor)}</b></li>`).join('')}</ul>` : '';
  const L = ui.ed.linhas[tipo];
  const k = tipo === 'debitos' ? 'd' : 'c';
  const linha = (l, i) => (estrutura(T)
    ? `<div class="tr-lin-r"><input type="text" id="tr-${k}n-${i}" class="tr-n" data-t="${tipo}" data-i="${i}" value="${esc(l.nome)}" maxlength="60" placeholder="Descrição" aria-label="Descrição da linha ${i + 1}" required>
        <input type="text" id="tr-${k}v-${i}" class="tr-v" data-t="${tipo}" data-i="${i}" value="${esc(l.valor)}" inputmode="decimal" placeholder="0,00" aria-label="Valor de ${esc(l.nome || 'linha ' + (i + 1))}">
        <button type="button" class="btn small pp-ico pp-del" data-act="trtirar" data-t="${tipo}" data-i="${i}" aria-label="Tirar ${esc(l.nome || 'linha')}">✕</button></div>`
    : `<li><span>${esc(l.nome)}</span><input type="text" id="tr-${k}v-${i}" class="tr-v" data-t="${tipo}" data-i="${i}" value="${esc(l.valor)}" inputmode="decimal" aria-label="Valor de ${esc(l.nome)}"></li>`);
  return estrutura(T)
    ? `<div class="tr-lins">${L.map(linha).join('')}<button type="button" class="btn small" data-act="trlinha" data-t="${tipo}">＋ Adicionar linha</button></div>`
    : `<ul class="tr-lista">${L.map(linha).join('')}</ul>`;
}

function cardDebitos(T) {
  const vazio = !T.debitos.length && !estrutura(T) ? '<p class="muted" style="margin:0">Nenhum débito.</p>' : '';
  return `<div class="card tr-bloco tr-deb"><div class="tr-h"><h3>📉 Débitos</h3></div>
    ${linhas(T, 'debitos', T.debitos, '')}${vazio}
    <div class="tr-tot"><span>Total de débitos</span><b class="tr-neg">${R(T.totalDebitos)}</b></div>
    ${T.herdado && T.editar && !ui.ed ? `<p class="muted" style="margin:0;font-size:.82rem">Valores repetidos de ${esc(nomeMes(T.herdado))}.</p>` : ''}</div>`;
}

// ---------- créditos ----------
function listaMens(lista, pagas) {
  const itens = lista.filter((x) => x.pago === pagas);
  if (!itens.length) return '<p class="muted" style="margin:0">Ninguém nesta lista.</p>';
  return `<ul class="tr-lista tr-nomes">${itens.map((x) => `<li><span>${esc(x.nome)}${!pagas && x.vencida ? ' <span class="badge re">vencida</span>' : ''}</span>
    <small class="muted">${pagas ? (x.pagoEm ? 'pago ' + dBR(x.pagoEm) : '') : (x.vencimento ? 'vence ' + dBR(x.vencimento) : '')}</small></li>`).join('')}</ul>`;
}
const PUXAR = '<p class="muted" style="margin:0;font-size:.85rem">A lista aparece na próxima leitura do ASAAS (⬇️ Puxar).</p>';
// Quem da corrente (sem a curimba) ficou de fora das mensalidades do mês: sem cobrança, ou sem CPF no Perfil para ligar.
function listaFora(fora) {
  if (!fora) return PUXAR;
  if (!fora.length) return '<p class="muted" style="margin:0">Toda a corrente tem mensalidade neste mês.</p>';
  return `<p class="muted" style="margin:0;font-size:.85rem">${fora.length} fora da contagem das mensalidades:</p>
    <ul class="tr-lista tr-nomes">${fora.map((x) => `<li><span>${esc(x.nome)}</span><small class="muted">${esc(x.motivo)}</small></li>`).join('')}</ul>`;
}
// Doações: quantidade e total; quem vê os nomes toca para abrir a lista de quem doou.
function blocoDoacoes(T, D) {
  const rot = `${D.quantidade} doaç${D.quantidade === 1 ? 'ão' : 'ões'}`;
  if (!T.verNomes || !D.quantidade) return `<div class="tr-tot"><span>${rot}</span><b class="tr-pos">${R(D.total)}</b></div>`;
  const ab = ui.doacoes;
  const lista = !ab ? '' : !D.lista ? PUXAR
    : `<ul class="tr-lista tr-nomes">${D.lista.map((x) => `<li><span>${esc(x.nome)}${x.pagoEm ? ` <small class="muted">${dBR(x.pagoEm)}</small>` : ''}</span><b class="tr-pos">${R(x.valor)}</b></li>`).join('')}</ul>`;
  return `<button type="button" class="tr-tot tr-tot-bt" data-act="trdoacoes" aria-expanded="${ab}"><span>${rot} <span class="seta" aria-hidden="true">${ab ? '▾' : '▸'}</span></span><b class="tr-pos">${R(D.total)}</b></button>${lista}`;
}

function blocoAsaas(T) {
  const A = T.asaas;
  // Valor da mensalidade e descrição das doações: o root muda aqui mesmo, na edição.
  const mensal = estrutura(T)
    ? `<label class="field tr-inline">Valor da mensalidade (R$)<input type="text" id="tr-mensal" inputmode="decimal" value="${esc(ui.ed.mensal)}" required></label>`
    : `<small class="muted">${R(A.valorMensalidade)} · vencimento no mês</small>`;
  const desc = estrutura(T)
    ? `<label class="field tr-inline">Descrição das doações no ASAAS<input type="text" id="tr-desc" maxlength="150" value="${esc(ui.ed.desc)}" required></label>`
    : '<small class="muted">Pix recebidos no mês</small>';
  if (!A.configurado) return `<div class="tr-sub"><b>Mensalidades e doações</b>${mensal}${desc}</div><p class="muted" style="margin:0">A conta B do ASAAS ainda não está ligada no servidor.</p>`;
  // Puxar recarrega o mês: escondido durante a edição, para não perder o que foi digitado.
  const puxar = T.root && !ui.ed ? '<button type="button" class="btn small" data-act="tratualizar">⬇️ Puxar</button>' : '';
  const lido = `<div class="tr-lido"><span class="muted">${A.atualizadoEm ? 'Lido do ASAAS em ' + quando(A.atualizadoEm) : 'Ainda sem leitura do ASAAS'}${T.root ? ' · sozinho, 1 vez por dia' : ''}</span>${puxar}</div>`;
  if (!A.mensalidades) {
    return `<div class="tr-sub"><b>Mensalidades e doações</b>${mensal}${desc}</div>
      ${A.erro ? `<p class="erro" style="margin:0">${esc(A.erro)}</p>` : ''}${lido}`;
  }
  const M = A.mensalidades;
  const quad = (k, n, rot, cls) => {
    const ab = ui.mens === k;
    return T.verNomes
      ? `<button type="button" class="pf-of-total ${cls}${ab ? ' selecionado' : ''}" data-act="trmens" data-k="${k}" aria-expanded="${ab}"><b>${n}</b><span>${rot}</span></button>`
      : `<div class="pf-of-total ${cls}"><b>${n}</b><span>${rot}</span></div>`;
  };
  return `<div class="tr-sub"><b>Mensalidades</b>${mensal}</div>
    <div class="pf-of-totais tr-quads">${quad('pagas', M.pagas, 'Pagas', 'tr-q-ok')}${quad('abertas', M.abertas, 'Em aberto', 'tr-q-ab')}${quad('corrente', A.corrente.total, 'Na corrente', 'tr-q-co')}</div>
    ${!T.verNomes || !ui.mens ? '' : ui.mens === 'corrente' ? listaFora(A.corrente.fora) : listaMens(M.lista || [], ui.mens === 'pagas')}
    <div class="tr-tot"><span>Total pago em mensalidades</span><b class="tr-pos">${R(M.totalPago)}</b></div>
    <div class="tr-sub"><b>Doações das giras</b>${desc}</div>
    ${blocoDoacoes(T, A.doacoes)}
    ${A.erro ? `<p class="erro" style="margin:0">${esc(A.erro)}</p>` : ''}${lido}`;
}

function cardCreditos(T) {
  const temOutros = T.creditosExtras.length || estrutura(T);
  const outros = temOutros ? `<div class="tr-sub"><b>Outros créditos</b></div>${linhas(T, 'creditos', T.creditosExtras, 'tr-pos')}` : '';
  const aporte = ui.ed
    ? `<ul class="tr-lista"><li><span><b>Aporte Mãe Vê</b></span><input type="text" id="tr-aporte" class="tr-v" inputmode="decimal" value="${esc(ui.ed.aporte)}" aria-label="Aporte Mãe Vê"></li></ul>`
    : `<div class="tr-tot"><span><b>Aporte Mãe Vê</b></span><b class="${T.aporte ? 'tr-pos' : ''}">${R(T.aporte)}</b></div>`;
  return `<div class="card tr-bloco tr-cred"><div class="tr-h"><h3>📈 Créditos</h3></div>
    ${blocoAsaas(T)}${outros}${aporte}
    <div class="tr-tot tr-tot-g"><span>Total de entradas</span><b class="tr-pos">${R(T.creditos + T.aporte)}</b></div></div>`;
}

function janelaConfirmar(T) {
  if (!ui.confirmar) return '';
  return `<div class="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="tr-cf-t"><div class="modal">
    <h3 id="tr-cf-t">Salvar as alterações?</h3>
    <p style="margin:0">Os valores de <b>${esc(nomeMes(T.mes))}</b> passam a valer para este mês e para os seguintes, até alguém mudar de novo.${T.root ? ' As linhas, a mensalidade, a descrição das doações e o saldo inicial valem para todos os meses.' : ''} O saldo é recalculado.</p>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" data-act="trconfirmarnao"${ui.salvando ? ' disabled' : ''}>Cancelar</button><button class="btn primary" data-act="trconfirmar"${ui.salvando ? ' disabled' : ''}>${ui.salvando ? 'Salvando…' : 'Confirmar'}</button></div>
  </div></div>`;
}

export function render() {
  const T = estado.transparencia;
  if (T === null) { carregarTransparencia(); return '<div class="loading">Carregando o painel…</div>'; }
  if (T.erro) return `<div class="card"><p class="erro">${esc(T.erro)}</p><button class="btn" data-act="trrecarregar">Tentar de novo</button></div>`;
  if (T.carregando) return '<div class="loading">Carregando o mês…</div>';
  const cards = cardTotal(T) + cardDebitos(T) + cardCreditos(T);
  // Em edição, os campos ficam num formulário só (o que foi digitado volta depois de um redesenho).
  return `<section class="panel tr-tela">${cardTopo(T)}${ui.ed ? `<form id="f-tr-val" class="tr-val" data-rascunho data-id="${esc(T.mes)}" autocomplete="off">${cards}</form>` : cards}${janelaConfirmar(T)}</section>`;
}

// ---------- eventos ----------
// Guarda o que foi digitado antes de redesenhar.
function ler() {
  const E = ui.ed;
  if (!E) return;
  document.querySelectorAll('#f-tr-val .tr-n').forEach((i) => { const l = E.linhas[i.dataset.t][i.dataset.i]; if (l) l.nome = i.value; });
  document.querySelectorAll('#f-tr-val .tr-v[data-t]').forEach((i) => { const l = E.linhas[i.dataset.t][i.dataset.i]; if (l) l.valor = i.value; });
  const v = (id) => document.getElementById(id)?.value;
  E.aporte = v('tr-aporte') ?? E.aporte;
  E.mensal = v('tr-mensal') ?? E.mensal;
  E.desc = v('tr-desc') ?? E.desc;
  E.inicio = v('tr-inicio') ?? E.inicio;
  E.saldoIni = v('tr-saldoini') ?? E.saldoIni;
}
function irPara(mes, atualizar = false) {
  Object.assign(ui, { ed: null, mens: null, doacoes: false });
  estado.transparencia = { ...estado.transparencia, carregando: true };
  avisar();
  carregarTransparencia(mes, atualizar);
}
async function salvar() {
  const T = estado.transparencia;
  const E = ui.ed;
  const lin = (t) => E.linhas[t].map((l) => ({ nome: l.nome.replace(/\s+/g, ' ').trim(), valor: numero(l.valor) || '0' }));
  const dados = { debitos: lin('debitos'), creditos: lin('creditos'), aporte: numero(E.aporte) || '0' };
  if (T.root) {
    dados.config = {
      inicio: E.inicio, saldoInicial: numero(E.saldoIni) || '0', valorMensalidade: numero(E.mensal), descricaoDoacao: E.desc.trim(),
      campos: { debitos: dados.debitos.map((l) => l.nome), creditos: dados.creditos.map((l) => l.nome) },
    };
    // Linha que já existia e mudou de nome: o servidor leva o nome novo para os outros meses.
    dados.renomes = ['debitos', 'creditos'].flatMap((t) => E.linhas[t].filter((l) => l.de && l.de !== l.nome.replace(/\s+/g, ' ').trim())
      .map((l) => ({ tipo: t, de: l.de, para: l.nome.replace(/\s+/g, ' ').trim() })));
  }
  ui.salvando = true;
  avisar();
  const ok = await acaoTransparencia('mes', dados);
  ui.salvando = false;
  ui.confirmar = false;
  if (ok) { ui.ed = null; toast('Alterações salvas.'); }
  avisar();
}

export const cliques = {
  trrecarregar() { estado.transparencia = null; avisar(); },
  trmes(el) {
    const T = estado.transparencia;
    const m = T.meses[T.meses.indexOf(T.mes) + Number(el.dataset.d)];
    if (m) irPara(m);
  },
  tratualizar() { irPara(estado.transparencia.mes, true); },
  trmens(el) { ui.mens = ui.mens === el.dataset.k ? null : el.dataset.k; avisar(); },
  trdoacoes() { ui.doacoes = !ui.doacoes; avisar(); },
  treditar() {
    const T = estado.transparencia;
    const L = (lista) => lista.map((l) => ({ nome: l.nome, de: l.nome, valor: virgula(l.valor) }));
    ui.ed = { linhas: { debitos: L(T.debitos), creditos: L(T.creditosExtras) }, aporte: virgula(T.aporte) };
    if (T.root) {
      const C = T.config;
      Object.assign(ui.ed, { mensal: virgula(C.valorMensalidade), desc: C.descricaoDoacao, inicio: C.inicio || T.meses[T.meses.length - 1], saldoIni: virgula(C.saldoInicial) });
    }
    ui.mens = null;
    ui.doacoes = false;
    avisar();
  },
  trcancelar() { ui.ed = null; avisar(); },
  trsalvar() { ler(); ui.confirmar = true; avisar(); },
  trconfirmarnao() { ui.confirmar = false; avisar(); },
  trconfirmar() { if (!ui.salvando) salvar(); },
  trlinha(el) { ler(); ui.ed.linhas[el.dataset.t].push({ nome: '', de: '', valor: '' }); avisar(); },
  trtirar(el) { ler(); ui.ed.linhas[el.dataset.t].splice(Number(el.dataset.i), 1); avisar(); },
};

// Troca de mês (combo) e o interruptor Visível para a corrente.
export async function mudou(t) {
  if (t.id === 'tr-mes') { irPara(t.value); return; }
  if (t.dataset.act === 'trpublicar' && await acaoTransparencia('publicar', { publicada: t.checked })) {
    toast(t.checked ? 'Painel visível para a corrente.' : 'Painel visível só para quem administra.');
  }
}

// Enter num campo: pede a confirmação, como o Salvar.
export function enviar(form) {
  if (form.id === 'f-tr-val') cliques.trsalvar();
}
