// Pagamentos em atraso (aba Geral), lidos da conta B do ASAAS pelo servidor (api/_lib/atrasos.js).
// Pessoa: só as próprias cobranças vencidas, com o link para pagar; sem nenhuma, o bloco não aparece.
// Admin root: todas, com o nome (da corrente, pelo CPF do Perfil, ou o do cliente no ASAAS) e lembrete no WhatsApp.
// Atualizar: para todos (quem acabou de pagar vê sumir); o servidor segura toques repetidos da pessoa.
// É o primeiro bloco da aba Geral. Para o root começa minimizado (tocar no título abre; vale até sair do app),
// com o rótulo ADMIN FINANCEIRO na moldura.

import { estado, pode, carregarAtrasos, avisar } from '../estado.js';
import { esc, dShort, hoje, pd } from '../util.js';
import { centavos, reais } from '/shared/ervas.js';
import { ICONE_WHATS } from './giraComum.js';

const R = (v) => reais(centavos(v));
let minimizado = true;
const ehRoot = () => pode('usuarios:gerenciar');
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

const linha = (a, root) => `<div class="at-item">
    <div class="at-info">${root ? `<b>${esc(a.nome || 'Sem nome')}</b>${a.ligado ? '' : ' <span class="badge re" title="O CPF do ASAAS não bate com nenhum Perfil">sem ligação</span>'}` : ''}
      <span class="${root ? 'muted' : ''}">${esc(a.descricao || 'Cobrança')}</span>
      <span class="muted at-venc">${atraso(a.vencimento)}</span></div>
    <div class="at-lado"><b class="at-valor">${R(a.valor)}</b><span class="at-bts">${pagar(a)}${root ? lembrete(a) : ''}</span></div>
  </div>`;

export function cardAtrasos() {
  if (estado.atrasos === null) { carregarAtrasos(); return ''; }
  const A = estado.atrasos;
  const root = A.root && ehRoot();
  const lista = A.atrasos || [];
  if (!root && (!A.configurado || A.semSenha || !lista.length)) return '';
  const titulo = root
    ? `<button class="grp-h dobra" data-act="atdobrar" aria-expanded="${!minimizado}" aria-label="${minimizado ? 'Expandir' : 'Minimizar'}"><h2><span aria-hidden="true">💳</span> Pagamentos em atraso</h2>
        <span class="count">${lista.length} <span class="seta" aria-hidden="true">${minimizado ? '▸' : '▾'}</span></span></button>`
    : `<div class="grp-h"><h2><span aria-hidden="true">💳</span> Pagamentos em atraso</h2><span class="count">${lista.length}</span></div>`;
  if (root && minimizado) return `<div class="card adm adm-financeiro">${titulo}</div>`;
  if (!A.configurado) {
    return `<div class="card adm adm-financeiro">${titulo}<p class="muted" style="margin:0">A conta B do ASAAS não está conectada (variável <code>ASAAS2_API_KEY</code> na Vercel).</p></div>`;
  }
  const total = lista.reduce((s, a) => s + Number(a.valor || 0), 0);
  const quando = A.atualizadoEm ? new Date(A.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ') : '';
  const corpo = lista.length ? `<div class="at-lista">${lista.map((a) => linha(a, root)).join('')}</div>`
    : '<p class="muted" style="margin:0">Nenhum pagamento em atraso.</p>';
  const rodape = root ? `<div class="at-rodape"><span class="muted">${lista.length ? `Total ${R(total)} · ` : ''}${quando ? `lido em ${quando}` : 'ainda não lido'}</span>
      <button class="btn small" data-act="atatualizar">↻ Atualizar</button></div>`
    : '<div class="at-rodape"><span></span><button class="btn small" data-act="atatualizar">↻ Atualizar</button></div>';
  return `<div class="card ${root ? 'adm adm-financeiro' : 'at-meu'}">${titulo}${A.erro ? `<p class="muted at-erro">${esc(A.erro)}</p>` : ''}
    ${root ? '' : '<p class="muted" style="margin:0;font-size:.85rem">Toque em Pagar para abrir o Pix ou o boleto. Já pagou? Toque em Atualizar.</p>'}${corpo}${rodape}</div>`;
}

export const cliquesAtrasos = {
  atatualizar() { carregarAtrasos({ atualizar: true }); },
  atdobrar() { minimizado = !minimizado; avisar(); },
};
