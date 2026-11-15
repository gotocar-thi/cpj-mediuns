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
