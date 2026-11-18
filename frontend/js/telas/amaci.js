// Tela "Amaci": a pessoa escolhe um orixá e vê, sempre nesta ordem, o nome, os recados, ervas, velas, ponto riscado e fatores.
// O seletor só traz os orixás liberados para a turma de quem está logado (o servidor já manda só esses)
// e abre no último liberado. Quem administra liga "Visível para todos", libera os orixás por turma e escreve os recados.
// Cabeçalho: o orixá e, para o aluno, quem está logado, a turma, a data de hoje e o amaci do dia (ou o próximo), pelos
// eventos do tipo Amaci. Presença: o aluno confirma no dia, no terreiro (localização do celular); o admin root marca
// presença ou falta de cada aluno.

import { estado, pode, visaoAtiva, carregarAmaci, acaoAmaci, confirmarPresencaAmaci, avisar } from '../estado.js';
import { esc, toast, hoje, dLong, dDM } from '../util.js';
import { emDemo } from '../auth.js';
import { ORIXAS, ordenarOrixas, ultimoLiberado, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS, ORIENTACAO_VISIVEIS, TERREIRO, noTerreiro } from '/shared/amaci.js';

const NOME = Object.fromEntries(ORIXAS.map((o) => [o.k, o]));

// Estado só desta tela (volta ao padrão ao trocar de aba, como o estado.amaci).
const ui = {
  sel: '',              // orixá escolhido ('' = o último liberado)
  config: false,        // bloco ⚙️ Configuração do admin aberto (começa minimizado)
  turmas: new Set(),    // turmas abertas no bloco do admin
  editando: null,       // recado em edição: { orixa, texto }
  pres: false,          // bloco Presença do aluno aberto
  escolha: {},          // amaci de hoje → 'p' (Presente) ou 'a' (Ausente, o padrão)
  confirmando: false,   // pegando a localização / enviando
  presAdm: false,       // bloco Presença nos amacis do root aberto
  presEv: new Set(),    // amacis abertos no bloco do root
};
export function limpar() {
  ui.sel = '';
  ui.config = false;
  ui.turmas.clear();
  ui.editando = null;
  ui.pres = false;
  ui.escolha = {};
  ui.presAdm = false;
  ui.presEv.clear();
}

const admin = () => pode('amaci:editar') && !!estado.amaci?.admin;
const ehAluno = () => visaoAtiva() === 'alunos';
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
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
// Cabeçalho: ícone e título (o orixá escolhido); para o aluno, quem está logado, a turma, hoje e o amaci do dia.
function cardCabecalho(A, info) {
  const titulo = info ? `<span class="eyebrow">Amaci · ${esc(info.trono)}</span><h2>${esc(info.nome)}</h2>` : '<span class="eyebrow">Casa do Pai João</span><h2>Amaci</h2>';
  let extra = '';
  if (ehAluno()) {
    const P = A.presenca || { hoje: hoje(), amacis: [] };
    const doDia = P.amacis.find((a) => a.data === P.hoje);
    const prox = P.amacis.find((a) => a.data > P.hoje);
    const aula = doDia ? `<b>Hoje tem amaci</b> · ${esc(doDia.nome)}`
      : prox ? `Próximo amaci: <b>${dDM(prox.data)}</b> · ${esc(prox.nome)}` : 'Nenhum amaci marcado na aba Eventos.';
    extra = `<ul class="am-cab-info">
      <li><span aria-hidden="true">👤</span><span>${esc(estado.me?.nome || '')}</span></li>
      <li><span aria-hidden="true">🎓</span><span>${A.turmaNome ? esc(A.turmaNome) : 'Sem turma'}</span></li>
      <li><span aria-hidden="true">📅</span><span>${esc(dLong(P.hoje))}</span></li>
      <li class="${doDia ? 'am-hoje' : ''}"><span aria-hidden="true">✨</span><span>${aula}</span></li></ul>`;
  }
  return `<div class="card am-cab"><div class="am-nome"><span class="am-ico am-ico-g" aria-hidden="true">🙏</span><div>${titulo}</div></div>${extra}</div>`;
}

// Filtro numa linha só: anterior, a lista dos orixás liberados e o próximo. Com um orixá só, não aparece.
function cardFiltro(A, sel) {
  if (A.orixas.length < 2) return '';
  const libs = A.orixas.map((o) => o.k);
  const i = libs.indexOf(sel);
  return `<div class="card am-filtro">
    <button class="btn small pp-ico" data-act="amsel" data-k="${libs[i - 1] || ''}" aria-label="Orixá anterior"${i <= 0 ? ' disabled' : ''}>‹</button>
    <select id="am-orixa" data-act="amescolher" aria-label="Escolher orixá">${A.orixas.map((o) => `<option value="${o.k}"${o.k === sel ? ' selected' : ''}>${esc(NOME[o.k].curto)}</option>`).join('')}</select>
    <button class="btn small pp-ico" data-act="amsel" data-k="${libs[i + 1] || ''}" aria-label="Próximo orixá"${i >= libs.length - 1 ? ' disabled' : ''}>›</button>
    <span class="muted am-filtro-n">${libs.length} de ${ORIXAS.length}</span>
  </div>`;
}

// ---------- presença ----------
const SITUACAO = { p: ['Presente', 'pleno'], f: ['Falta', 're'] };
const selo = (st) => { const [t, c] = SITUACAO[st] || ['Ausente', '']; return `<span class="badge ${c}">${t}</span>`; };

function linhaPresenca(a, hojeData) {
  const n = `<span class="am-pres-n"><b>${esc(a.nome)}</b><small class="muted">${a.data === hojeData ? 'Hoje · ' : ''}${dDM(a.data)}</small></span>`;
  if (a.data !== hojeData || a.status === 'p') return `<li>${n}${selo(a.status)}</li>`;
  const e = ui.escolha[a.id] || 'a';
  return `<li class="am-pres-hoje">${n}<div class="am-pres-acao">
    <select data-act="amescolha" data-id="${a.id}" aria-label="Sua presença em ${esc(a.nome)}"><option value="a"${e === 'a' ? ' selected' : ''}>Ausente</option><option value="p"${e === 'p' ? ' selected' : ''}>Presente</option></select>
    <button class="btn primary small" data-act="amconfirmar" data-id="${a.id}"${ui.confirmando ? ' disabled' : ''}>${ui.confirmando ? 'Conferindo…' : 'Confirmar'}</button></div></li>`;
}

// Aluno: o percentual nos amacis já realizados e, aberto, cada amaci com a situação; o de hoje dá para confirmar.
function cardPresenca(A) {
  const P = A.presenca;
  if (!ehAluno() || !P) return '';
  const feitos = P.amacis.filter((a) => a.data <= P.hoje).reverse();
  const presentes = feitos.filter((a) => a.status === 'p').length;
  const pct = feitos.length ? Math.round((presentes / feitos.length) * 100) : null;
  const cab = `<button class="grp-h dobra" data-act="ampres" aria-expanded="${ui.pres}"><h2><span aria-hidden="true">✅</span> Presença</h2>
    <span class="count">${pct === null ? 'sem amaci ainda' : `${pct}% · ${presentes} de ${feitos.length}`} <span class="seta" aria-hidden="true">${ui.pres ? '▾' : '▸'}</span></span></button>`;
  if (!ui.pres) return `<div class="card am-pres">${cab}</div>`;
  const barra = pct === null ? '' : `<div class="am-pres-barra" role="img" aria-label="${pct}% de presença"><span style="width:${pct}%"></span></div>`;
  const lista = feitos.length ? `<ul class="am-pres-l">${feitos.map((a) => linhaPresenca(a, P.hoje)).join('')}</ul>` : '<p class="muted" style="margin:0">Nenhum amaci realizado ainda.</p>';
  return `<div class="card am-pres">${cab}${barra}${lista}
    <p class="muted am-pres-nota">No dia do amaci, escolha Presente e toque em Confirmar dentro do terreiro: o app confere a localização do celular.</p></div>`;
}

// Root: cada amaci realizado, com os alunos das turmas marcadas no tipo Amaci; marca presença, falta ou nada (ausente).
function cardPresencaAdmin(A) {
  const P = A.presencaAdmin;
  if (!P || !pode('usuarios:gerenciar')) return '';
  const cab = `<button class="grp-h dobra am-cfg-h" data-act="ampresadm" aria-expanded="${ui.presAdm}"><h2><span aria-hidden="true">✅</span> Presença nos amacis</h2>
    <span class="am-turma-x">${ui.presAdm ? '' : `<small>${plural(P.amacis.length, 'amaci realizado', 'amacis realizados')}</small>`}<span class="seta" aria-hidden="true">${ui.presAdm ? '▴' : '▾'}</span></span></button>`;
  if (!ui.presAdm) return `<div class="card adm am-adm">${cab}</div>`;
  if (!P.turmas.length) return `<div class="card adm am-adm">${cab}<p class="muted" style="margin:0">Marque as turmas no tipo Amaci (Admin root → Eventos) para os alunos aparecerem aqui.</p></div>`;
  if (!P.amacis.length) return `<div class="card adm am-adm">${cab}<p class="muted" style="margin:0">Nenhum evento do tipo Amaci realizado ainda.</p></div>`;
  const corpo = P.amacis.map((ev) => {
    const m = P.marcas[ev.id] || {};
    const aberto = ui.presEv.has(ev.id);
    const pres = P.alunos.filter((a) => m[a.id] === 'p').length;
    const turmas = !aberto ? '' : P.turmas.map((t) => {
      const al = P.alunos.filter((a) => a.turmaId === t.id);
      if (!al.length) return '';
      return `<div class="am-pres-t"><b>${esc(t.nome)}</b>${al.map((a) => `<label class="am-pres-a"><span>${esc(a.nome)}</span>
        <select data-act="ampresmarcar" data-ev="${ev.id}" data-aluno="${a.id}" aria-label="Presença de ${esc(a.nome)} em ${esc(ev.nome)}">
          <option value=""${!m[a.id] ? ' selected' : ''}>Ausente</option><option value="p"${m[a.id] === 'p' ? ' selected' : ''}>Presente</option><option value="f"${m[a.id] === 'f' ? ' selected' : ''}>Falta</option></select></label>`).join('')}</div>`;
    }).join('');
    return `<div class="am-turma"><button class="am-turma-h" data-act="ampresev" data-id="${ev.id}" aria-expanded="${aberto}">
      <b>${esc(ev.nome)}</b><span class="am-turma-x">${dDM(ev.data)} · ${pres}/${P.alunos.length}<span class="seta" aria-hidden="true">${aberto ? '▴' : '▾'}</span></span></button>
      ${aberto ? `<div class="am-pres-ts">${turmas}</div>` : ''}</div>`;
  }).join('');
  return `<div class="card adm am-adm">${cab}${corpo}</div>`;
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
  h += cardPresencaAdmin(A);
  if (!A.orixas.length) {
    const turma = A.turmaNome ? `da ${esc(A.turmaNome)}` : 'da sua turma';
    return h + cardCabecalho(A, null) + cardPresenca(A) + `<div class="card"><p class="muted" style="margin:0">Nenhum orixá liberado ainda para os alunos ${turma}.</p></div></section>`;
  }
  const libs = A.orixas.map((o) => o.k);
  const sel = libs.includes(ui.sel) ? ui.sel : ultimoLiberado(libs);
  const o = A.orixas.find((x) => x.k === sel);
  h += cardCabecalho(A, NOME[sel]) + cardPresenca(A) + cardFiltro(A, sel);
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
  amsel(el) { if (!el.dataset.k) return; ui.sel = el.dataset.k; ui.editando = null; avisar(); },
  ampres() { ui.pres = !ui.pres; avisar(); },
  ampresadm() { ui.presAdm = !ui.presAdm; avisar(); },
  ampresev(el) { const id = el.dataset.id; if (ui.presEv.has(id)) ui.presEv.delete(id); else ui.presEv.add(id); avisar(); },
  async amconfirmar(el) {
    const id = el.dataset.id;
    if ((ui.escolha[id] || 'a') !== 'p') { toast('Escolha Presente para confirmar.'); return; }
    ui.confirmando = true;
    avisar();
    try {
      let lat, lon;
      if (emDemo()) {
        ({ lat, lon } = TERREIRO);
        toast('Demonstração: localização simulada no terreiro.');
      } else {
        if (!navigator.geolocation) { toast('Este aparelho não informa a localização.'); return; }
        const pos = await new Promise((ok, erro) => navigator.geolocation.getCurrentPosition(ok, erro, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        ({ latitude: lat, longitude: lon } = pos.coords);
        if (!noTerreiro(lat, lon)) { toast('Você precisa estar no Terreiro Pai João para confirmar a presença.'); return; }
      }
      if (await confirmarPresencaAmaci(id, lat, lon)) { delete ui.escolha[id]; toast('Presença confirmada. Bom amaci!'); }
    } catch (e) {
      toast(e?.code === 1 ? 'Permita a localização para confirmar a presença.' : 'Não deu para pegar a localização. Tente de novo.');
    } finally {
      ui.confirmando = false;
      avisar();
    }
  },
  amconfig() { ui.config = !ui.config; avisar(); },
  amturma(el) {
    const id = el.dataset.id;
    if (ui.turmas.has(id)) ui.turmas.delete(id); else ui.turmas.add(id);
    avisar();
  },
  amoried() {
    const k = document.getElementById('am-orixa')?.value || ui.sel || ultimoLiberado(estado.amaci.liberados);
    const o = estado.amaci.orixas.find((x) => x.k === k);
    ui.sel = k;
    ui.editando = { orixa: k, texto: o?.orientacao || '' };
    avisar();
  },
  amoricancel() { ui.editando = null; avisar(); },
  amrecarregar() { estado.amaci = null; avisar(); },
};

export const mudancas = {
  amescolher(t) { ui.sel = t.value; ui.editando = null; avisar(); },
  amescolha(t) { ui.escolha[t.dataset.id] = t.value; },
  async ampresmarcar(t) {
    if (await acaoAmaci('presenca', { eventoId: t.dataset.ev, alunoId: t.dataset.aluno, status: t.value })) toast('Presença salva.');
  },
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
