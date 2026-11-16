// Tela "Amaci": a pessoa escolhe um orixá e vê, sempre nesta ordem, o nome, os recados, ervas, velas, ponto riscado e fatores.
// O seletor só traz os orixás liberados para a turma de quem está logado (o servidor já manda só esses)
// e abre no último liberado. Quem administra liga "Visível para todos", libera os orixás por turma e escreve os recados.

import { estado, pode, carregarAmaci, acaoAmaci, avisar } from '../estado.js';
import { esc, toast } from '../util.js';
import { ORIXAS, ordenarOrixas, ultimoLiberado, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS, ORIENTACAO_VISIVEIS } from '/shared/amaci.js';

const NOME = Object.fromEntries(ORIXAS.map((o) => [o.k, o]));

// Estado só desta tela (volta ao padrão ao trocar de aba, como o estado.amaci).
const ui = {
  sel: '',              // orixá escolhido ('' = o último liberado)
  config: false,        // bloco ⚙️ Configuração do admin aberto (começa minimizado)
  turmas: new Set(),    // turmas abertas no bloco do admin
  editando: null,       // recado em edição: { orixa, texto }
};
export function limpar() {
  ui.sel = '';
  ui.config = false;
  ui.turmas.clear();
  ui.editando = null;
}

const admin = () => pode('amaci:editar') && !!estado.amaci?.admin;
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
  const topo = `<button class="grp-h dobra am-cfg-h" data-act="amconfig" aria-expanded="${ui.config}"><h2><span aria-hidden="true">⚙️</span> Configuração</h2><span class="am-turma-x">${ui.config ? '' : `<small>${resumo}</small>`}<span class="seta" aria-hidden="true">${ui.config ? '▴' : '▾'}</span></span></button>`;
  if (!ui.config) return `<div class="card adm am-adm">${topo}</div>`;
  return `<div class="card adm am-adm">${topo}
    <label class="of-sw"><input type="checkbox" role="switch" data-act="ampub" ${A.publicada ? 'checked' : ''}><span class="of-sw-t" aria-hidden="true"></span><b>Visível para todos</b></label>
    <div class="am-adm-t"><h3>Orixás liberados por turma</h3><span class="muted">Cada turma só vê os orixás marcados.</span></div>
    ${corpo}
  </div>`;
}

// ---------- pessoa ----------
function seletor(A, sel) {
  if (A.orixas.length < 2) return '';
  return `<div class="am-sel" role="tablist" aria-label="Escolher orixá">${A.orixas.map((o) => `<button role="tab" class="am-sel-b" data-act="amsel" data-k="${o.k}" aria-selected="${o.k === sel}">${esc(NOME[o.k].curto)}</button>`).join('')}</div>`;
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
  if (admin()) h += cardAdmin(A);
  if (!A.orixas.length) {
    const turma = A.turmaNome ? `da ${esc(A.turmaNome)}` : 'da sua turma';
    return h + `<div class="card"><h2>Amaci</h2><p class="muted" style="margin:0">Nenhum orixá liberado ainda para os alunos ${turma}.</p></div></section>`;
  }
  const libs = A.orixas.map((o) => o.k);
  const sel = libs.includes(ui.sel) ? ui.sel : ultimoLiberado(libs);
  const o = A.orixas.find((x) => x.k === sel);
  const info = NOME[sel];
  h += `<div class="card am-topo">
    ${seletor(A, sel)}
    <div class="am-nome"><span class="am-ico am-ico-g" aria-hidden="true">🙏</span><div><span class="eyebrow">Amaci · ${esc(info.trono)}</span><h2>${esc(info.nome)}</h2>${A.turmaNome ? `<span class="muted am-turma-nome">${esc(A.turmaNome)} · ${libs.length} de ${ORIXAS.length} orixás liberados</span>` : ''}</div></div>
  </div>`;
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
  amsel(el) { ui.sel = el.dataset.k; ui.editando = null; avisar(); },
  amconfig() { ui.config = !ui.config; avisar(); },
  amturma(el) {
    const id = el.dataset.id;
    if (ui.turmas.has(id)) ui.turmas.delete(id); else ui.turmas.add(id);
    avisar();
  },
  amoried() {
    const k = document.querySelector('.am-sel-b[aria-selected="true"]')?.dataset.k || ui.sel || ultimoLiberado(estado.amaci.liberados);
    const o = estado.amaci.orixas.find((x) => x.k === k);
    ui.sel = k;
    ui.editando = { orixa: k, texto: o?.orientacao || '' };
    avisar();
  },
  amoricancel() { ui.editando = null; avisar(); },
  amrecarregar() { estado.amaci = null; avisar(); },
};

export const mudancas = {
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
