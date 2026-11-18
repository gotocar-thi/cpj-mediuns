// Tela "Transparência" (Painel da Transparência): o saldo da casa, débitos e créditos (mensalidades e doações da conta B
// do ASAAS, outros créditos e o aporte da Mãe Vê), mês a mês. Trocar o mês troca todas as informações.
// ✎ Editar transforma os valores em campos e o Salvar pede confirmação. Quem edita a aba (root e Admin financeiro) muda
// os valores; o root também muda, no mesmo lugar, as linhas, o mês de início e o saldo inicial, e liga Visível para a
// corrente. O que o app busca no ASAAS (valor da mensalidade, descrição das doações, pagadores que entram como aporte)
// fica no bloco ADMIN ROOT "Busca no ASAAS", com o Puxar. Os nomes (mensalidades, doações, aporte e quem está fora da
// contagem) só aparecem para quem vê a aba ASAAS (o servidor só manda para eles).

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
const aporteDoAsaas = (T) => T.aporteAsaas?.total || 0;

// Estado só desta tela (volta ao padrão ao trocar de aba).
// ed: edição dos valores — linhas { debitos: [{ nome, de, valor }], creditos: [...] } (de = nome original, para
//     renomear), aporte e, para o root, inicio e saldoIni · busca: bloco Busca no ASAAS { aberto, mensal, desc, pagadores }
// confirmar: 'valores' | 'busca' (janela do Salvar) · aberto: lista aberta ('pagas' | 'abertas' | 'corrente' | 'doacoes' | 'aporte')
const ui = { ed: null, busca: null, confirmar: null, salvando: false, aberto: null };
export function limpar() { Object.assign(ui, { ed: null, busca: null, confirmar: null, salvando: false, aberto: null }); }
const estrutura = (T) => !!(ui.ed && T.root);

// ---------- ADMIN ROOT: o que o app busca no ASAAS ----------
function cardBusca(T) {
  const A = T.asaas;
  const ab = !!ui.busca;
  const cab = `<button class="grp-h dobra" data-act="trbusca" aria-expanded="${ab}"><h2>🔎 Busca no ASAAS</h2>
    <span class="count">${A.atualizadoEm ? 'lido ' + quando(A.atualizadoEm) : 'sem leitura'} <span class="seta" aria-hidden="true">${ab ? '▾' : '▸'}</span></span></button>`;
  if (!ab) return `<div class="card adm root">${cab}</div>`;
  const B = ui.busca;
  return `<div class="card adm root">${cab}
    <form id="f-tr-busca" class="tr-busca" data-rascunho data-id="busca" autocomplete="off">
      <label class="field">Valor da mensalidade (R$)<input type="text" id="tr-mensal" inputmode="decimal" value="${esc(B.mensal)}" required></label>
      <small class="muted">Mensalidade = cobrança da conta B com esse valor e vencimento no mês.</small>
      <label class="field">Descrição das doações<input type="text" id="tr-desc" maxlength="150" value="${esc(B.desc)}" required></label>
      <small class="muted">Doação = cobrança cuja descrição contém esse texto, paga no mês.</small>
      <div class="tr-lins"><b>Pagadores que entram como Aporte Mãe Vê</b>
        ${B.pagadores.map((n, i) => `<div class="tr-lin-p"><input type="text" id="tr-pg-${i}" class="tr-pg" data-i="${i}" value="${esc(n)}" maxlength="60" placeholder="Nome do cliente no ASAAS" aria-label="Pagador ${i + 1}" required>
          <button type="button" class="btn small pp-ico pp-del" data-act="trpgtirar" data-i="${i}" aria-label="Tirar ${esc(n || 'pagador')}">✕</button></div>`).join('')}
        <button type="button" class="btn small" data-act="trpg">＋ Adicionar pagador</button>
        <small class="muted">A doação de um destes (nome do cliente no ASAAS) soma no aporte, não nas doações.</small></div>
      <button type="button" class="btn small primary" data-act="trbuscasalvar">Salvar busca</button>
    </form>
    ${A.configurado ? `<div class="tr-lido"><span class="muted">${A.atualizadoEm ? esc(nomeMes(T.mes)) + ' lido em ' + quando(A.atualizadoEm) : 'Mês ainda não lido'} · sozinho, 1 vez por dia, às 9h</span>
      <button type="button" class="btn small" data-act="tratualizar">⬇️ Puxar dados do ASAAS</button></div>`
      : '<p class="muted" style="margin:0">A conta B do ASAAS não está ligada no servidor.</p>'}
  </div>`;
}

// ---------- topo ----------
function cardTopo(T) {
  const i = T.meses.indexOf(T.mes);
  const ed = !!ui.ed;
  const bts = !T.editar ? '' : ed
    ? `<div class="pp-bts tr-ed-bts"><button type="button" class="btn small" data-act="trcancelar">Cancelar</button><button type="button" class="btn small primary" data-act="trsalvar">Salvar</button></div>`
    : '<button type="button" class="btn small tr-editar" data-act="treditar">✎ Editar valores</button>';
  return `<div class="card tr-topo">
    <div class="tr-topo-l1"><span class="eyebrow">Painel da transparência</span>
      ${T.root ? `<label class="of-sw tr-vis"><input type="checkbox" role="switch" data-act="trpublicar" ${T.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><span>Visível para a corrente</span></label>` : ''}</div>
    <div class="tr-mes">
      <button class="btn small pp-ico" data-act="trmes" data-d="1" aria-label="Mês anterior"${i >= T.meses.length - 1 || ed ? ' disabled' : ''}>‹</button>
      <select id="tr-mes" aria-label="Escolher o mês"${ed ? ' disabled' : ''}>${T.meses.map((m) => `<option value="${m}"${m === T.mes ? ' selected' : ''}>${esc(nomeMes(m))}</option>`).join('')}</select>
      <button class="btn small pp-ico" data-act="trmes" data-d="-1" aria-label="Próximo mês"${i <= 0 || ed ? ' disabled' : ''}>›</button>
    </div>
    ${ed ? `<p class="tr-aviso">Editando <b>${esc(nomeMes(T.mes))}</b>: os valores valem para este mês e os seguintes, até alguém mudar de novo.${T.root ? ' Linhas, início e saldo inicial valem para todos os meses.' : ''}</p>` : ''}
    ${bts}
  </div>`;
}

// ---------- resumo do mês (logo abaixo do topo) ----------
function cardTotal(T) {
  const aporte = T.aporte + aporteDoAsaas(T);
  const ini = estrutura(T)
    ? `<div class="tr-ini"><label class="field">Início do saldo<input type="month" id="tr-inicio" value="${esc(ui.ed.inicio)}" max="${esc(T.meses[0])}" required></label>
        <label class="field">Saldo inicial (R$)<input type="text" id="tr-saldoini" inputmode="decimal" value="${esc(ui.ed.saldoIni)}" required></label></div>` : '';
  return `<div class="card tr-bloco tr-res">
    <div class="tr-saldo"><span class="muted">Saldo total${T.saldoParcial ? ' (parcial)' : ''}</span><b class="${sinal(T.saldo)}">${R(T.saldo)}</b></div>
    <ul class="tr-lista">
      <li><span>Saldo anterior</span><b class="${sinal(T.saldoAnterior)}">${R(T.saldoAnterior)}</b></li>
      <li><span>📈 Créditos</span><b class="tr-pos">+ ${R(T.creditos)}</b></li>
      <li><span>🤲 Aporte Mãe Vê</span><b class="${aporte ? 'tr-pos' : ''}">+ ${R(aporte)}</b></li>
      <li><span>📉 Débitos</span><b class="tr-neg">− ${R(T.totalDebitos)}</b></li>
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
const PUXAR = '<p class="muted" style="margin:0;font-size:.85rem">A lista aparece na próxima leitura do ASAAS.</p>';
function listaMens(lista, pagas) {
  const itens = lista.filter((x) => x.pago === pagas);
  if (!itens.length) return '<p class="muted" style="margin:0">Ninguém nesta lista.</p>';
  return `<ul class="tr-lista tr-nomes">${itens.map((x) => `<li><span>${esc(x.nome)}${!pagas && x.vencida ? ' <span class="badge re">vencida</span>' : ''}</span>
    <small class="muted">${pagas ? (x.pagoEm ? 'pago ' + dBR(x.pagoEm) : '') : (x.vencimento ? 'vence ' + dBR(x.vencimento) : '')}</small></li>`).join('')}</ul>`;
}
// Quem da corrente (sem a curimba) ficou de fora das mensalidades do mês: sem cobrança, ou sem CPF no Perfil para ligar.
function listaFora(fora) {
  if (!fora) return PUXAR;
  if (!fora.length) return '<p class="muted" style="margin:0">Toda a corrente tem mensalidade neste mês.</p>';
  return `<p class="muted" style="margin:0;font-size:.85rem">${fora.length} fora da contagem das mensalidades:</p>
    <ul class="tr-lista tr-nomes">${fora.map((x) => `<li><span>${esc(x.nome)}</span><small class="muted">${esc(x.motivo)}</small></li>`).join('')}</ul>`;
}
// Linha com quantidade e total; quem vê os nomes toca para abrir a lista de pagamentos (doações ou aporte do ASAAS).
function linhaPagamentos(T, k, rot, D) {
  if (!T.verNomes || !D.quantidade) return `<div class="tr-tot"><span>${rot}</span><b class="tr-pos">${R(D.total)}</b></div>`;
  const ab = ui.aberto === k;
  const lista = !ab ? '' : !D.lista ? PUXAR
    : `<ul class="tr-lista tr-nomes">${D.lista.map((x) => `<li><span>${esc(x.nome)}${x.pagoEm ? ` <small class="muted">${dBR(x.pagoEm)}</small>` : ''}</span><b class="tr-pos">${R(x.valor)}</b></li>`).join('')}</ul>`;
  return `<button type="button" class="tr-tot tr-tot-bt" data-act="trabrir" data-k="${k}" aria-expanded="${ab}"><span>${rot} <span class="seta" aria-hidden="true">${ab ? '▾' : '▸'}</span></span><b class="tr-pos">${R(D.total)}</b></button>${lista}`;
}

// Caixa de um item: título, explicação curta, o conteúdo e o total do item.
const grupo = (titulo, dica, corpo, total) => `<div class="tr-grupo"><div class="tr-grupo-h"><b>${titulo}</b>${dica ? `<small class="muted">${dica}</small>` : ''}</div>${corpo}${total || ''}</div>`;
const totalItem = (rot, v, cls = 'tr-pos') => `<div class="tr-tot"><span>${rot}</span><b class="${cls}">${R(v)}</b></div>`;

function gruposAsaas(T) {
  const A = T.asaas;
  if (!A.configurado) return '<p class="muted" style="margin:0">Mensalidades e doações: a conta B do ASAAS ainda não está ligada no servidor.</p>';
  if (!A.mensalidades) return A.erro ? `<p class="erro" style="margin:0">${esc(A.erro)}</p>` : '<p class="muted" style="margin:0">Mensalidades e doações: ainda sem leitura do ASAAS para este mês.</p>';
  const M = A.mensalidades;
  const quad = (k, n, rot, cls) => {
    const ab = ui.aberto === k;
    return T.verNomes
      ? `<button type="button" class="pf-of-total ${cls}${ab ? ' selecionado' : ''}" data-act="trabrir" data-k="${k}" aria-expanded="${ab}"><b>${n}</b><span>${rot}</span></button>`
      : `<div class="pf-of-total ${cls}"><b>${n}</b><span>${rot}</span></div>`;
  };
  const lista = !T.verNomes ? '' : ui.aberto === 'corrente' ? listaFora(A.corrente.fora)
    : ui.aberto === 'pagas' || ui.aberto === 'abertas' ? listaMens(M.lista || [], ui.aberto === 'pagas') : '';
  const D = A.doacoes;
  return grupo('Mensalidades', `${R(A.valorMensalidade)} cada · vencimento no mês`,
      `<div class="pf-of-totais tr-quads">${quad('pagas', M.pagas, 'Pagas', 'tr-q-ok')}${quad('abertas', M.abertas, 'Em aberto', 'tr-q-ab')}${quad('corrente', A.corrente.total, 'Na corrente', 'tr-q-co')}</div>${lista}`,
      totalItem('Total pago', M.totalPago))
    + grupo('Doações das giras', 'Pix recebidos no mês', linhaPagamentos(T, 'doacoes', `${D.quantidade} doaç${D.quantidade === 1 ? 'ão' : 'ões'}`, D))
    + (A.erro ? `<p class="erro" style="margin:0">${esc(A.erro)}</p>` : '');
}

function cardCreditos(T) {
  const extras = T.creditosExtras.length || estrutura(T)
    ? grupo('Outros créditos', 'Lançados à mão', linhas(T, 'creditos', T.creditosExtras, 'tr-pos'), T.creditosExtras.length && !ui.ed ? totalItem('Total', T.creditosExtras.reduce((x, c) => x + c.valor, 0)) : '')
    : '';
  // Admin financeiro (vê os nomes, sem o bloco Busca do root): o Puxar fica aqui.
  const puxar = T.verNomes && !T.root ? ' <button type="button" class="btn small" data-act="tratualizar">⬇️ Puxar dados do ASAAS</button>' : '';
  const lido = T.asaas.configurado ? `<p class="muted tr-lido-c" style="margin:0;font-size:.8rem">${T.asaas.atualizadoEm ? 'Lido do ASAAS em ' + quando(T.asaas.atualizadoEm) : 'Ainda sem leitura do ASAAS'} · 1 vez por dia, às 9h.${puxar}</p>` : '';
  return `<div class="card tr-bloco tr-cred"><div class="tr-h"><h3>📈 Créditos</h3></div>
    ${gruposAsaas(T)}${extras}
    <div class="tr-tot tr-tot-g"><span>Total de créditos</span><b class="tr-pos">${R(T.creditos)}</b></div>${lido}</div>`;
}

// Aporte Mãe Vê: um bloco próprio, com o que veio do ASAAS (doações dos pagadores do aporte) e o lançado à mão.
function cardAporte(T) {
  const P = T.aporteAsaas;
  const quem = T.root && T.config?.pagadoresAporte?.length ? 'Pix de ' + esc(T.config.pagadoresAporte.join(', ')) : 'Pix recebidos de quem paga o aporte';
  const pelo = !T.asaas.configurado ? ''
    : grupo('Pelo ASAAS', quem, P && P.quantidade
      ? linhaPagamentos(T, 'aporte', `${P.quantidade} pagamento${P.quantidade === 1 ? '' : 's'}`, P)
      : totalItem(P ? 'Nenhum pagamento no mês' : 'Ainda sem leitura do ASAAS', 0, ''));
  const mao = grupo('Lançado à mão', 'Valor que quem administra informa no mês', ui.ed
    ? `<ul class="tr-lista"><li><span>Valor do mês</span><input type="text" id="tr-aporte" class="tr-v" inputmode="decimal" value="${esc(ui.ed.aporte)}" aria-label="Aporte Mãe Vê lançado à mão"></li></ul>`
    : totalItem('Valor do mês', T.aporte, T.aporte ? 'tr-pos' : ''));
  const total = T.aporte + aporteDoAsaas(T);
  return `<div class="card tr-bloco tr-apo"><div class="tr-h"><h3>🤲 Aporte Mãe Vê</h3></div>
    <p class="muted" style="margin:0;font-size:.85rem">Contribuição da Mãe Vê no mês. Entra no saldo junto com os créditos.</p>
    ${pelo}${mao}
    <div class="tr-tot tr-tot-g"><span>Total do aporte</span><b class="${total ? 'tr-pos' : ''}">${R(total)}</b></div></div>`;
}

function janelaConfirmar(T) {
  if (!ui.confirmar) return '';
  const texto = ui.confirmar === 'busca'
    ? 'O app passa a buscar no ASAAS com o novo valor da mensalidade, a nova descrição das doações e os pagadores do aporte. Os meses são lidos de novo na próxima abertura.'
    : `Os valores de <b>${esc(nomeMes(T.mes))}</b> passam a valer para este mês e para os seguintes, até alguém mudar de novo.${T.root ? ' As linhas, o início e o saldo inicial valem para todos os meses.' : ''} O saldo é recalculado.`;
  return `<div class="modal-fundo" role="dialog" aria-modal="true" aria-labelledby="tr-cf-t"><div class="modal">
    <h3 id="tr-cf-t">Salvar as alterações?</h3>
    <p style="margin:0">${texto}</p>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" data-act="trconfirmarnao"${ui.salvando ? ' disabled' : ''}>Cancelar</button><button class="btn primary" data-act="trconfirmar"${ui.salvando ? ' disabled' : ''}>${ui.salvando ? 'Salvando…' : 'Confirmar'}</button></div>
  </div></div>`;
}

export function render() {
  const T = estado.transparencia;
  if (T === null) { carregarTransparencia(); return '<div class="loading">Carregando o painel…</div>'; }
  if (T.erro) return `<div class="card"><p class="erro">${esc(T.erro)}</p><button class="btn" data-act="trrecarregar">Tentar de novo</button></div>`;
  if (T.carregando) return '<div class="loading">Carregando o mês…</div>';
  const cards = cardTotal(T) + cardDebitos(T) + cardCreditos(T) + cardAporte(T);
  // Em edição, os campos ficam num formulário só (o que foi digitado volta depois de um redesenho).
  return `<section class="panel tr-tela">${T.root ? cardBusca(T) : ''}${cardTopo(T)}${ui.ed ? `<form id="f-tr-val" class="tr-val" data-rascunho data-id="${esc(T.mes)}" autocomplete="off">${cards}</form>` : cards}${janelaConfirmar(T)}</section>`;
}

// ---------- eventos ----------
// Guarda o que foi digitado antes de redesenhar.
function ler() {
  const E = ui.ed;
  if (E) {
    document.querySelectorAll('#f-tr-val .tr-n').forEach((i) => { const l = E.linhas[i.dataset.t][i.dataset.i]; if (l) l.nome = i.value; });
    document.querySelectorAll('#f-tr-val .tr-v[data-t]').forEach((i) => { const l = E.linhas[i.dataset.t][i.dataset.i]; if (l) l.valor = i.value; });
    const v = (id) => document.getElementById(id)?.value;
    E.aporte = v('tr-aporte') ?? E.aporte;
    E.inicio = v('tr-inicio') ?? E.inicio;
    E.saldoIni = v('tr-saldoini') ?? E.saldoIni;
  }
  const B = ui.busca;
  if (B && document.getElementById('f-tr-busca')) {
    B.mensal = document.getElementById('tr-mensal').value;
    B.desc = document.getElementById('tr-desc').value;
    B.pagadores = [...document.querySelectorAll('#f-tr-busca .tr-pg')].map((i) => i.value);
  }
}
function irPara(mes, atualizar = false) {
  Object.assign(ui, { ed: null, aberto: null });
  estado.transparencia = { ...estado.transparencia, carregando: true };
  avisar();
  carregarTransparencia(mes, atualizar);
}
async function salvarValores() {
  const T = estado.transparencia;
  const E = ui.ed;
  const lin = (t) => E.linhas[t].map((l) => ({ nome: l.nome.replace(/\s+/g, ' ').trim(), valor: numero(l.valor) || '0' }));
  const dados = { debitos: lin('debitos'), creditos: lin('creditos'), aporte: numero(E.aporte) || '0' };
  if (T.root) {
    dados.config = { inicio: E.inicio, saldoInicial: numero(E.saldoIni) || '0', campos: { debitos: dados.debitos.map((l) => l.nome), creditos: dados.creditos.map((l) => l.nome) } };
    // Linha que já existia e mudou de nome: o servidor leva o nome novo para os outros meses.
    dados.renomes = ['debitos', 'creditos'].flatMap((t) => E.linhas[t].filter((l) => l.de && l.de !== l.nome.replace(/\s+/g, ' ').trim())
      .map((l) => ({ tipo: t, de: l.de, para: l.nome.replace(/\s+/g, ' ').trim() })));
  }
  return acaoTransparencia('mes', dados);
}
function salvarBusca() {
  const B = ui.busca;
  return acaoTransparencia('config', { valorMensalidade: numero(B.mensal), descricaoDoacao: B.desc.trim(), pagadoresAporte: B.pagadores.map((n) => n.replace(/\s+/g, ' ').trim()) });
}

export const cliques = {
  trrecarregar() { estado.transparencia = null; avisar(); },
  trmes(el) {
    const T = estado.transparencia;
    const m = T.meses[T.meses.indexOf(T.mes) + Number(el.dataset.d)];
    if (m) irPara(m);
  },
  tratualizar() { irPara(estado.transparencia.mes, true); },
  trabrir(el) { ui.aberto = ui.aberto === el.dataset.k ? null : el.dataset.k; avisar(); },
  trbusca() {
    const C = estado.transparencia.config;
    ui.busca = ui.busca ? null : { mensal: virgula(C.valorMensalidade), desc: C.descricaoDoacao, pagadores: [...(C.pagadoresAporte || [])] };
    avisar();
  },
  trpg() { ler(); ui.busca.pagadores.push(''); avisar(); },
  trpgtirar(el) { ler(); ui.busca.pagadores.splice(Number(el.dataset.i), 1); avisar(); },
  trbuscasalvar() { ler(); ui.confirmar = 'busca'; avisar(); },
  treditar() {
    const T = estado.transparencia;
    const L = (lista) => lista.map((l) => ({ nome: l.nome, de: l.nome, valor: virgula(l.valor) }));
    ui.ed = { linhas: { debitos: L(T.debitos), creditos: L(T.creditosExtras) }, aporte: virgula(T.aporte) };
    if (T.root) Object.assign(ui.ed, { inicio: T.config.inicio || T.meses[T.meses.length - 1], saldoIni: virgula(T.config.saldoInicial) });
    ui.aberto = null;
    avisar();
  },
  trcancelar() { ui.ed = null; avisar(); },
  trsalvar() { ler(); ui.confirmar = 'valores'; avisar(); },
  trconfirmarnao() { ui.confirmar = null; avisar(); },
  async trconfirmar() {
    if (ui.salvando) return;
    const qual = ui.confirmar;
    ui.salvando = true;
    avisar();
    const ok = await (qual === 'busca' ? salvarBusca() : salvarValores());
    ui.salvando = false;
    ui.confirmar = null;
    if (ok) {
      if (qual === 'busca') ui.busca = null; else ui.ed = null;
      toast('Alterações salvas.');
    }
    avisar();
  },
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
  if (form.id === 'f-tr-busca') cliques.trbuscasalvar();
}
