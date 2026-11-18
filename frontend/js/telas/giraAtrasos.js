// Pagamentos em atraso (aba Geral), lidos das duas contas do ASAAS pelo servidor (api/_lib/atrasos.js):
// a B (mensalidades e outras cobranças feitas no ASAAS) e a A (links das Compras).
// Pessoa (corrente ou aluno, com a senha criada): só as próprias cobranças vencidas, com o link para pagar; sem nenhuma,
// o bloco não aparece. No "Ver como" do root aparece mesmo sem a senha, com o aviso de que a pessoa ainda não vê.
// Admin root: todas, separadas por conta, com o nome (da corrente, pelo CPF do Perfil, ou o do cliente no ASAAS) e lembrete no WhatsApp.
// Atualizar: para todos (quem acabou de pagar vê sumir); o servidor segura toques repetidos da pessoa.
// É o primeiro bloco da aba Geral. Para o root começa minimizado (tocar no título abre; vale até sair do app),
// com o rótulo ADMIN FINANCEIRO na moldura. Aberto, o admin vê um quadradinho por grupo — Corrente, cada turma de alunos,
// aluno sem turma e sem ligação (o CPF do ASAAS não bate com ninguém) — com quantas pendências; tocar abre os nomes do
// grupo, e cada nome abre as cobranças (Pagar, lembrete no WhatsApp).

import { estado, pode, carregarAtrasos, avisar } from '../estado.js';
import { esc, dShort, hoje, pd } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';
import { ICONE_WHATS } from './giraComum.js';

const R = (v) => reais(centavos(v));
let minimizado = true;
const pessoasAbertas = new Set();   // root: pessoas expandidas ('conta:nome'); todas começam minimizadas
let grupoAberto = null;             // root: quadradinho aberto — 'corrente', 't:<turma>', 'semturma' ou 'semligacao'
// ADMIN FINANCEIRO: quem vê a aba ASAAS (root e Admin financeiro) vê todas as pendências.
const ehRoot = () => pode('asaas:ver');
const dias = (venc) => Math.max(0, Math.round((pd(hoje()) - pd(venc)) / 86400000));
const atraso = (venc) => (venc ? `Venceu em ${dShort(venc)}${dias(venc) ? ` · ${dias(venc)} ${dias(venc) === 1 ? 'dia' : 'dias'}` : ''}` : 'Sem vencimento');
const pagar = (a) => (a.link ? `<a class="btn small primary" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">Pagar</a>` : '');

// Lembrete pronto para o WhatsApp da pessoa (celular do Perfil ou do cadastro no ASAAS).
function lembrete(a) {
  const tel = String(a.telefone || '').replace(/\D/g, '');
  if (tel.length < 10) return '';
  const nome = String(a.nome || '').split(/\s+/)[0];
  const txt = `Olá${nome ? ', ' + nome : ''}! Passando para lembrar do pagamento em aberto: ${a.descricao || 'cobrança'} — ${R(a.valor)}`
    + `${a.vencimento ? `, vencido em ${dShort(a.vencimento)}` : ''}.${a.link ? ` Para pagar: ${a.link}` : ''}`;
  return `<a class="btn small wa-bt" href="https://wa.me/55${tel}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener noreferrer" aria-label="Lembrete no WhatsApp para ${esc(a.nome)}"><span class="wa-ico" aria-hidden="true">${ICONE_WHATS}</span></a>`;
}

// comNome = false: dentro do grupo da pessoa; comDesc = false: dentro do grupo da descrição (já estão no título do grupo).
const linha = (a, root, comNome = true, comDesc = true) => `<div class="at-item">
    <div class="at-info">${root && comNome ? `<b>${esc(a.nome || 'Sem nome')}</b>${a.ligado ? '' : ' <span class="badge re" title="O CPF do ASAAS não bate com nenhum Perfil">sem ligação</span>'}` : ''}
      ${comDesc ? `<span class="${root ? 'muted' : ''}">${!root && a.conta === 'A' ? '<span class="badge new">Compras</span> ' : ''}${esc(a.descricao || 'Cobrança')}</span>` : ''}
      <span class="muted at-venc">${atraso(a.vencimento)}</span></div>
    <div class="at-lado"><b class="at-valor">${R(a.valor)}</b><span class="at-bts">${pagar(a)}${root ? lembrete(a) : ''}</span></div>
  </div>`;

// Dentro da conta, uma linha por grupo — a pessoa (nome) ou a descrição da cobrança (a REF) —, com quantas pendências
// e o total, minimizada; tocar abre a lista. Ordem: mais pendências primeiro (depois o maior total e o nome).
// No grupo da pessoa, as cobranças não repetem o nome; no da descrição, mostram de quem é.
const MODOS = {
  pessoa: { chave: (a) => a.nome || 'Sem nome', comNome: false, comDesc: true },
  desc: { chave: (a) => String(a.descricao || '').trim() || 'Sem descrição', comNome: true, comDesc: false },
};
function agrupado(modo, k, itens) {
  const M = MODOS[modo];
  const grupos = new Map();
  itens.forEach((a) => {
    const rotulo = M.chave(a);
    const id = rotulo.toLocaleLowerCase('pt-BR');
    if (!grupos.has(id)) grupos.set(id, { rotulo, L: [] });
    grupos.get(id).L.push(a);
  });
  const soma = (L) => L.reduce((s, a) => s + Number(a.valor || 0), 0);
  const ordem = [...grupos.values()].sort((x, y) => y.L.length - x.L.length || soma(y.L) - soma(x.L) || x.rotulo.localeCompare(y.rotulo, 'pt-BR'));
  return `<div class="at-pessoas">${ordem.map(({ rotulo, L }) => {
    const chave = `${modo}:${k}:${rotulo}`;
    const aberto = pessoasAbertas.has(chave);
    const semLigacao = modo === 'pessoa' && L.some((a) => !a.ligado) ? ' <span class="badge re" title="O CPF do ASAAS não bate com nenhum Perfil">sem ligação</span>' : '';
    return `<div class="at-pessoa"><button class="at-pessoa-h" data-act="atpessoa" data-k="${esc(chave)}" aria-expanded="${aberto}">
      <b>${esc(rotulo)}${semLigacao}</b><span class="at-pessoa-x">${L.length} ${L.length === 1 ? 'pendência' : 'pendências'} · ${R(soma(L))}<span class="seta" aria-hidden="true">${aberto ? '▾' : '▸'}</span></span></button>
      ${aberto ? `<div class="at-lista">${L.map((a) => linha(a, true, M.comNome, M.comDesc)).join('')}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

// Root: uma seção por conta, com o total de cada uma (conta desligada avisa qual variável falta).
const CONTAS = [['B', 'Mensalidades e outras (conta B)', 'ASAAS2_API_KEY'], ['A', 'Compras (conta A)', 'ASAAS_API_KEY']];
function secoesRoot(A, lista, modo) {
  return CONTAS.map(([k, nome, variavel]) => {
    const itens = lista.filter((a) => (a.conta || 'B') === k);
    const total = itens.reduce((s, a) => s + Number(a.valor || 0), 0);
    const corpo = !A.contas?.[k] ? `<p class="muted" style="margin:0">Conta não conectada (variável <code>${variavel}</code> na Vercel).</p>`
      : itens.length ? agrupado(modo, k, itens)
        : '<p class="muted" style="margin:0">Nenhum pagamento em atraso.</p>';
    return `<div class="at-conta"><div class="at-conta-h"><h4>${nome}</h4><span class="muted">${itens.length ? `${itens.length} · ${R(total)}` : ''}</span></div>${corpo}</div>`;
  }).join('');
}

// Root: dois blocos com as mesmas cobranças — por nome e por descrição —, os dois começando minimizados.
const blocosAbertos = new Set();
function blocoRoot(A, lista, modo, icone, titulo) {
  const aberto = blocosAbertos.has(modo);
  return `<div class="at-bloco"><button class="at-bloco-h" data-act="atbloco" data-k="${modo}" aria-expanded="${aberto}">
    <h3><span aria-hidden="true">${icone}</span> ${titulo}</h3><span class="seta" aria-hidden="true">${aberto ? '▾' : '▸'}</span></button>
    ${aberto ? `<div class="at-bloco-c">${secoesRoot(A, lista, modo)}</div>` : ''}</div>`;
}

// Grupo de cada pendência, para os quadradinhos do admin.
const grupoDe = (a) => (a.pessoaId ? 'corrente' : a.alunoId ? (a.turmaId ? 't:' + a.turmaId : 'semturma') : 'semligacao');
// Um quadradinho por grupo que tem pendência (com a quantidade); tocar abre embaixo os nomes do grupo, cada um com as cobranças.
function quadrosGrupos(lista) {
  const turmas = new Map();
  lista.forEach((a) => { if (a.alunoId && a.turmaId) turmas.set('t:' + a.turmaId, a.turmaNome || 'Turma'); });
  const grupos = [['corrente', 'Corrente', 'at-q-cor'],
    ...[...turmas].sort((x, y) => x[1].localeCompare(y[1], 'pt-BR')).map(([k, nome]) => [k, nome, 'at-q-tur']),
    ['semturma', 'Aluno sem turma', 'at-q-sem'], ['semligacao', 'Sem ligação', 'at-q-lig']]
    .map(([k, nome, cls]) => ({ k, nome, cls, L: lista.filter((a) => grupoDe(a) === k) })).filter((g) => g.L.length);
  if (!grupos.length) return '';
  if (grupoAberto && !grupos.some((g) => g.k === grupoAberto)) grupoAberto = null;
  const quads = grupos.map((g) => `<button type="button" class="pf-of-total ${g.cls}${g.k === grupoAberto ? ' selecionado' : ''}" data-act="atgrupo" data-g="${esc(g.k)}" aria-expanded="${g.k === grupoAberto}" aria-label="${esc(g.nome)}: ${g.L.length} pendências"><b>${g.L.length}</b><span>${esc(g.nome)}</span></button>`).join('');
  const aberto = grupos.find((g) => g.k === grupoAberto);
  const soma = (L) => L.reduce((t, a) => t + Number(a.valor || 0), 0);
  const lista2 = aberto ? `<div class="at-grupo"><div class="at-conta-h"><h4>${esc(aberto.nome)}</h4><span class="muted">${aberto.L.length} · ${R(soma(aberto.L))}</span></div>${agrupado('pessoa', 'g:' + aberto.k, aberto.L)}</div>` : '';
  return `<div class="pf-of-totais at-quads">${quads}</div>${lista2}`;
}

export function cardAtrasos() {
  if (estado.atrasos === null) { carregarAtrasos(); return ''; }
  const A = estado.atrasos;
  // Root na visão CPJ/Alunos sem "Ver como": a lista é a de todos, mas a visão simula uma pessoa sem ninguém escolhido.
  if (A.root && !ehRoot()) return '';
  const root = A.root;
  const lista = A.atrasos || [];
  if (!root && (!A.configurado || A.semSenha || !lista.length)) return '';
  const titulo = root
    ? `<button class="grp-h dobra" data-act="atdobrar" aria-expanded="${!minimizado}" aria-label="${minimizado ? 'Expandir' : 'Minimizar'}"><h2 class="at-tit"><span aria-hidden="true">💳</span> CPJ - Pgto atrasado</h2>
        <span class="count">${lista.length} <span class="seta" aria-hidden="true">${minimizado ? '▸' : '▾'}</span></span></button>`
    : `<div class="grp-h"><h2 class="at-tit"><span aria-hidden="true">💳</span> CPJ - Pgto atrasado</h2><span class="count">${lista.length}</span></div>`;
  if (root && minimizado) return `<div class="card adm adm-financeiro">${titulo}</div>`;
  if (!A.configurado) {
    return `<div class="card adm adm-financeiro">${titulo}<p class="muted" style="margin:0">Nenhuma conta do ASAAS está conectada (variáveis <code>ASAAS_API_KEY</code> e <code>ASAAS2_API_KEY</code> na Vercel).</p></div>`;
  }
  const total = lista.reduce((s, a) => s + Number(a.valor || 0), 0);
  const quando = A.atualizadoEm ? new Date(A.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ') : '';
  const corpo = root ? quadrosGrupos(lista) + blocoRoot(A, lista, 'pessoa', '👤', 'Por nome') + blocoRoot(A, lista, 'desc', '🧾', 'Por descrição')
    : `<div class="at-lista">${lista.map((a) => linha(a, root)).join('')}</div>`;
  const rodape = root ? `<div class="at-rodape"><span class="muted">${lista.length ? `Total ${R(total)} · ` : ''}${quando ? `lido em ${quando}` : 'ainda não lido'}</span>
      <button class="btn small" data-act="atatualizar">↻ Atualizar</button></div>`
    : '<div class="at-rodape"><span></span><button class="btn small" data-act="atatualizar">↻ Atualizar</button></div>';
  return `<div class="card ${root ? 'adm adm-financeiro' : 'at-meu'}">${titulo}${A.erro ? `<p class="muted at-erro">${esc(A.erro)}</p>` : ''}
    ${A.verComoSemSenha ? '<p class="at-aviso">Esta pessoa ainda não criou a senha: ela não vê este bloco.</p>' : ''}
    ${root ? '' : '<p class="muted" style="margin:0;font-size:.85rem">Toque em Pagar para abrir o Pix ou o boleto. Já pagou? Toque em Atualizar.</p>'}${corpo}${rodape}</div>`;
}

export const cliquesAtrasos = {
  atgrupo(el) { grupoAberto = grupoAberto === el.dataset.g ? null : el.dataset.g; avisar(); },
  atatualizar() { carregarAtrasos({ atualizar: true }); },
  atdobrar() { minimizado = !minimizado; avisar(); },
  atbloco(el) { const k = el.dataset.k; if (blocosAbertos.has(k)) blocosAbertos.delete(k); else blocosAbertos.add(k); avisar(); },
  atpessoa(el) { const k = el.dataset.k; if (pessoasAbertas.has(k)) pessoasAbertas.delete(k); else pessoasAbertas.add(k); avisar(); },
};
