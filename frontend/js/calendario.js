// Calendário do mês, usado na aba Diário e na aba Gira. Cada tela guarda o mês e o dia escolhido e diz as marcas de
// cada dia; o toque no dia vai para data-act=acaoDia (data-d) e as setas do mês para data-act=acaoMes (data-v = -1 ou 1).
import { hoje, dLong } from './util.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// 'AAAA-MM' somado de passo meses.
export function mesMais(mes, passo) {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 1 + passo, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

// marcas(data): HTML das marcas embaixo do número; classe(data): classe a mais da célula;
// ate: último dia que dá para escolher ('' = sem limite; o mês seguinte também trava).
export function calendarioMes({ mes, sel, acaoDia, acaoMes, marcas = () => '', classe = () => '', ate = '' }) {
  const [y, m] = mes.split('-').map(Number);
  const primeiro = new Date(y, m - 1, 1).getDay();
  const total = new Date(y, m, 0).getDate();
  const hj = hoje();
  let cel = '';
  for (let i = 0; i < primeiro; i++) cel += '<span></span>';
  for (let d = 1; d <= total; d++) {
    const data = `${mes}-${String(d).padStart(2, '0')}`;
    const cls = ['di-d', data === sel ? 'sel' : '', data === hj ? 'hoje' : '', classe(data)].filter(Boolean).join(' ');
    cel += `<button type="button" class="${cls}" data-act="${acaoDia}" data-d="${data}" ${ate && data > ate ? 'disabled' : ''} aria-label="${dLong(data)}" aria-pressed="${data === sel}">
      <span>${d}</span><span class="di-marcas">${marcas(data)}</span></button>`;
  }
  return `<div class="di-cal-h"><button type="button" class="btn small" data-act="${acaoMes}" data-v="-1" aria-label="Mês anterior">◂</button>
      <h2>${MESES[m - 1].replace(/^./, (c) => c.toUpperCase())} de ${y}</h2>
      <button type="button" class="btn small" data-act="${acaoMes}" data-v="1" aria-label="Próximo mês" ${ate && mes >= ate.slice(0, 7) ? 'disabled' : ''}>▸</button></div>
    <div class="di-grade">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s) => `<b>${s}</b>`).join('')}${cel}</div>`;
}
