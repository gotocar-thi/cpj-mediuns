// Aba Diário: o que cada pessoa registra do próprio dia. Dia de gira: como chegou e como saiu, a linha que atendeu, o
// banho e o conselho do guia. Dia comum: como acordou e como encerrou o dia, e o banho sugerido pelo próprio app quando
// o estado é pesado. Usado na tela e na validação do servidor (api/_lib/diario.js).

import { LINHAS } from './regras.js';
import { BANHO_ORIXA, BANHO_GUIA } from './banhos.js';

export const EMOCOES = [
  ['drenado', 'Cansado/Drenado'], ['ansioso', 'Ansioso'], ['agitado', 'Agitado'], ['irritado', 'Irritado'],
  ['triste', 'Triste'], ['disperso', 'Disperso'], ['paz', 'Em paz'], ['grato', 'Grato'],
];
// Estados pesados: o Orientador sugere um banho de manutenção.
export const DENSAS = ['drenado', 'ansioso', 'agitado', 'irritado', 'triste', 'disperso'];
export const SENSACOES = [['leve', 'Leve'], ['renovado', 'Renovado'], ['sonolento', 'Sonolento'], ['eletrizado', 'Eletrizado'], ['emocionado', 'Emocionado']];
export const SONO = [['bem', 'Dormi bem'], ['pouco', 'Dormi pouco'], ['agitado', 'Sono agitado'], ['sonhos', 'Sonhos marcantes']];
// Linhas que dá para escolher no conselho do guia (sem o Encontro das Linhas, que não é um guia).
export const LINHAS_DIARIO = LINHAS.flatMap((g) => g.itens).filter(([k]) => k !== 'mista');

// ---------- ervas: temperatura ----------
// Classificação usual na Umbanda (quente = descarrego, morna = equilíbrio, fria = atração). Erva fora da lista fica
// sem classificação. A Casa pode ajustar a lista.
export const TEMPERATURAS = { quente: ['Quente', 'Descarrego'], morna: ['Morna', 'Equilíbrio'], fria: ['Fria', 'Atração'] };
const ERVAS_TEMPERATURA = {
  quente: ['arruda', 'guiné', 'sal grosso', 'aroeira', 'pinhão roxo', 'espada de São Jorge', 'espada de Santa Bárbara', 'espada de Ogum', 'espada de Iansã', 'quebra demanda', 'folha de mamona'],
  morna: ['alecrim', 'manjericão', 'alfazema', 'camomila', 'hortelã', 'boldo', 'sálvia', 'louro', 'capim-cidreira', 'capim-limão', 'erva doce', 'melissa', 'macela', 'levante', 'abre caminho', 'eucalipto'],
  fria: ['rosas brancas', 'rosa branca', 'rosas', 'rosa', 'malva', 'jasmim', 'colônia', 'lírio', 'pétalas'],
};
export const AVISO_QUENTE = 'Erva quente: banho do pescoço para baixo. Não jogue na cabeça.';
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const TABELA = Object.entries(ERVAS_TEMPERATURA).flatMap(([t, L]) => L.map((n) => [sem(n), t]))
  .sort((a, b) => b[0].length - a[0].length);   // o nome mais longo primeiro ("rosas brancas" antes de "rosa")
// 'quente' | 'morna' | 'fria' | '' para o nome digitado.
export function temperaturaDaErva(nome) {
  const n = sem(nome);
  if (!n) return '';
  return TABELA.find(([k]) => n.startsWith(k) || n.includes(' ' + k))?.[1] || '';
}
// Sugestões do campo de ervas: as das apostilas (banhos de orixá e de guia) e as da tabela de temperatura.
export const ERVAS_SUGESTOES = [...new Set([
  ...Object.values(ERVAS_TEMPERATURA).flat(),
  ...Object.values(BANHO_ORIXA).flatMap((x) => x.ervas),
  ...Object.values(BANHO_GUIA).flatMap((x) => x.ervas),
])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

// ---------- Orientador (dia comum) ----------
const MANUTENCAO = {
  alecrim: { nome: 'Alecrim', fundamento: 'Erva morna de alegria e clareza: devolve o ânimo a quem está drenado ou triste.' },
  manjericao: { nome: 'Manjericão', fundamento: 'Erva morna de limpeza suave e proteção: ajuda a recolher o pensamento disperso.' },
  alfazema: { nome: 'Alfazema', fundamento: 'Erva morna de paz: acalma a agitação e a irritação.' },
  camomila: { nome: 'Camomila', fundamento: 'Erva morna de tranquilidade: alivia a ansiedade e ajuda no sono.' },
};
const ERVA_POR_EMOCAO = { drenado: 'alecrim', triste: 'alecrim', disperso: 'manjericao', agitado: 'alfazema', irritado: 'alfazema', ansioso: 'camomila' };
// O estado pesado mais recente do dia (o da noite vale mais que o da manhã) e a erva de manutenção para ele.
export function sugestaoOrientador(dia) {
  const emo = [dia?.depois?.emo, dia?.antes?.emo].find((e) => DENSAS.includes(e));
  return emo ? { emo, ...MANUTENCAO[ERVA_POR_EMOCAO[emo]] } : null;
}

// ---------- lua ----------
// Fase pela elongação (longitude da Lua menos a do Sol, com os principais termos de perturbação: erro de poucas horas).
// Como nos calendários, cada fase começa no dia (horário de Brasília) em que acontece e vale até a seguinte.
export const FASES_LUA = [
  ['nova', 'Lua Nova', '🌑', 'Recolhimento: bom para firmar intenções e recomeçar.'],
  ['crescente', 'Lua Crescente', '🌓', 'Crescimento: bom para atrair e fortalecer.'],
  ['cheia', 'Lua Cheia', '🌕', 'Energia no auge: axé forte e emoções à flor da pele.'],
  ['minguante', 'Lua Minguante', '🌗', 'Limpeza: bom para descarregar e soltar o que pesa.'],
];
const sen = (g) => Math.sin(g * Math.PI / 180);
function elongacao(ms) {
  const d = (ms - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const Lm = 218.316 + 13.176396 * d, Mm = 134.963 + 13.064993 * d, Ms = 357.529 + 0.98560028 * d;
  const D = 297.850 + 12.190749 * d, F = 93.272 + 13.229350 * d;
  const lua = Lm + 6.289 * sen(Mm) + 1.274 * sen(2 * D - Mm) + 0.658 * sen(2 * D) - 0.186 * sen(Ms) - 0.114 * sen(2 * F)
    - 0.059 * sen(2 * D - 2 * Mm) - 0.057 * sen(2 * D - Ms - Mm) + 0.053 * sen(2 * D + Mm) + 0.046 * sen(2 * D - Ms) + 0.041 * sen(Mm - Ms);
  const sol = 280.459 + 0.98564736 * d + 1.915 * sen(Ms) + 0.020 * sen(2 * Ms);
  return (((lua - sol) % 360) + 360) % 360;
}
export function faseDaLua(data) {
  return FASES_LUA[Math.floor(elongacao(Date.parse(data + 'T23:59:00-03:00')) / 90) % 4];   // fim do dia em Brasília
}

// ---------- dados do dia ----------
const chaves = (L) => L.map(([k]) => k);
const umDe = (v, L) => (chaves(L).includes(v) ? v : undefined);
const energia = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : undefined);
const texto = (v, max) => (typeof v === 'string' && v.trim() ? v.replace(/\r/g, '').trim().slice(0, max) : undefined);
const limpo = (o) => {
  const r = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(r).length ? r : undefined;
};
export const MAX_CONSELHO = 2000;
export const MAX_REFLEXAO = 1000;
export const MAX_ERVAS = 15;

// Só os campos conhecidos, com os valores válidos; o resto cai fora. Dia sem nada: {}.
//   gira: true|false (só quando a pessoa mudou; sem ele vale a agenda)
//   antes: { emo, energia, sono }  · depois: { emo, energia, sensacao }
//   linha, conselho (dia de gira) · reflexao (dia comum)
//   banho: { ervas: [..], feito, origem: 'guia' | 'orientador' | 'proprio' (anotado pela pessoa num dia comum) }
export function normalizarDia(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
  const ervas = Array.isArray(d.banho?.ervas)
    ? [...new Set(d.banho.ervas.map((e) => texto(e, 60)).filter(Boolean))].slice(0, MAX_ERVAS) : [];
  return limpo({
    gira: typeof d.gira === 'boolean' ? d.gira : undefined,
    antes: limpo({ emo: umDe(d.antes?.emo, EMOCOES), energia: energia(d.antes?.energia), sono: umDe(d.antes?.sono, SONO) }),
    depois: limpo({ emo: umDe(d.depois?.emo, EMOCOES), energia: energia(d.depois?.energia), sensacao: umDe(d.depois?.sensacao, SENSACOES) }),
    linha: umDe(d.linha, LINHAS_DIARIO),
    conselho: texto(d.conselho, MAX_CONSELHO),
    reflexao: texto(d.reflexao, MAX_REFLEXAO),
    banho: ervas.length ? { ervas, feito: d.banho.feito === true, origem: ['orientador', 'proprio'].includes(d.banho.origem) ? d.banho.origem : 'guia' } : undefined,
  }) || {};
}

// Delta de Axé: energia depois menos antes (null sem os dois).
export const deltaAxe = (dia) => (dia?.antes?.energia && dia?.depois?.energia ? dia.depois.energia - dia.antes.energia : null);
