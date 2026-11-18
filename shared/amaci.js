// Aba Amaci: os 14 orixás na ordem da Apostila Orixás da CPJ (é a ordem em que as turmas aprendem).
// O conteúdo de cada orixá fica só no servidor (api/_lib/amaciDados.js): a pessoa recebe só os orixás liberados para ela.

export const ORIXAS = [
  { k: 'oxala', nome: 'Pai Oxalá', curto: 'Oxalá', trono: 'Trono da Fé' },
  { k: 'loguna', nome: 'Mãe Logunã', curto: 'Logunã', trono: 'Trono da Fé' },
  { k: 'oxum', nome: 'Mãe Oxum', curto: 'Oxum', trono: 'Trono do Amor' },
  { k: 'oxumare', nome: 'Pai Oxumaré', curto: 'Oxumaré', trono: 'Trono do Amor' },
  { k: 'oxossi', nome: 'Pai Oxóssi', curto: 'Oxóssi', trono: 'Trono do Conhecimento' },
  { k: 'oba', nome: 'Mãe Obá', curto: 'Obá', trono: 'Trono do Conhecimento' },
  { k: 'ogum', nome: 'Pai Ogum', curto: 'Ogum', trono: 'Trono da Lei' },
  { k: 'iansa', nome: 'Mãe Iansã', curto: 'Iansã', trono: 'Trono da Lei' },
  { k: 'xango', nome: 'Pai Xangô', curto: 'Xangô', trono: 'Trono da Justiça' },
  { k: 'oroina', nome: 'Mãe Oroiná', curto: 'Oroiná', trono: 'Trono da Justiça' },
  { k: 'obaluaye', nome: 'Pai Obaluayê', curto: 'Obaluayê', trono: 'Trono da Evolução' },
  { k: 'nana', nome: 'Mãe Nanã', curto: 'Nanã', trono: 'Trono da Evolução' },
  { k: 'iemanja', nome: 'Mãe Iemanjá', curto: 'Iemanjá', trono: 'Trono da Geração' },
  { k: 'omolu', nome: 'Pai Omolu', curto: 'Omolu', trono: 'Trono da Geração' },
];
export const ORIXA_KEYS = ORIXAS.map((o) => o.k);

// Lista de chaves sem repetição, só as conhecidas e na ordem da apostila.
export const ordenarOrixas = (lista) => {
  const s = new Set(Array.isArray(lista) ? lista : []);
  return ORIXA_KEYS.filter((k) => s.has(k));
};

// O que fica selecionado ao abrir: o último liberado (na ordem da apostila); sem nenhum, vazio.
export const ultimoLiberado = (liberados) => ordenarOrixas(liberados).at(-1) || '';

// Orientação (texto livre do admin, por orixá): até 10 linhas e 1000 letras; a tela mostra 5 e rola o resto.
export const ORIENTACAO_LINHAS = 10;
export const ORIENTACAO_LETRAS = 1000;
export const ORIENTACAO_VISIVEIS = 5;
// Tira os espaços das pontas de cada linha; null se passar do limite.
export function limparOrientacao(v) {
  const s = String(v ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim()).join('\n').trim();
  if (s.split('\n').length > ORIENTACAO_LINHAS || s.length > ORIENTACAO_LETRAS) return null;
  return s;
}

// Presença no amaci: o aluno confirma no dia, dentro do Terreiro Pai João (Rua Osmar Fregona, 137 - Jardim Prudência, São Paulo).
// O raio cobre a imprecisão do GPS do celular dentro do terreiro.
export const TERREIRO = { lat: -23.657490334040926, lon: -46.66805779097073 };
export const RAIO_TERREIRO_M = 200;
// Distância em metros entre dois pontos (fórmula de haversine).
export function distanciaM(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
export const noTerreiro = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && distanciaM(TERREIRO, { lat, lon }) <= RAIO_TERREIRO_M;
// Percentual de presença: presentes ÷ amacis já realizados (até hoje). Sem amaci realizado, null.
export function pctAmaci(amacis, hoje) {
  const feitos = amacis.filter((a) => a.data <= hoje);
  return feitos.length ? Math.round((feitos.filter((a) => a.status === 'p').length / feitos.length) * 100) : null;
}
