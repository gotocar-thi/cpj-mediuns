// Aba Amaci. Rotas em api/pessoas: GET ?lista=amaci e POST { acao: 'amaci', op, ... }.
// Interruptor "Visível para todos" (começa desligado): desligado, só quem administra a aba vê; o servidor recusa os outros.
// O admin libera, por turma de alunos, quais orixás ela vê (cada turma está numa etapa do curso).
// O aluno recebe só os orixás liberados para a turma dele; quem não é aluno (corrente, admins) vê os 14.
// O recado (texto livre do admin; no banco, "orientação") é um por orixá, igual para todas as turmas.
import { validarId, HttpError } from './http.js';
import { db } from './db.js';
import { pode } from '../../shared/permissoes.js';
import { ORIXA_KEYS, ordenarOrixas, limparOrientacao, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS } from '../../shared/amaci.js';
import { AMACI } from './amaciDados.js';

const ehAdmin = (eu) => pode(eu, 'amaci:editar');

// Orixás que a pessoa pode ver. turmas = [{ id, nome, orixas }].
export function liberadosPara(eu, turmas) {
  if (ehAdmin(eu) || eu.grupo !== 'alunos') return [...ORIXA_KEYS];
  const t = (turmas || []).find((x) => x.id === eu.turmaId);
  return t ? ordenarOrixas(t.orixas) : [];
}

// → { publicada, liberados, turmaNome?, orixas: [{ k, ervas, velas, pontos, fatores, orientacao }], admin?, turmas? }
export async function amaci(eu, dados) {
  const d = dados || (await db.rpc('amaci_estado'));
  const admin = ehAdmin(eu);
  if (!admin && !d.publicada) throw new HttpError(403, 'A aba Amaci ainda não está liberada.');
  const liberados = liberadosPara(eu, d.turmas);
  const orientacoes = d.orientacoes || {};
  const turmaNome = eu.grupo === 'alunos' ? (d.turmas.find((x) => x.id === eu.turmaId)?.nome || '') : undefined;
  return {
    publicada: !!d.publicada, liberados, ...(turmaNome !== undefined ? { turmaNome } : {}),
    orixas: liberados.map((k) => ({ k, ...AMACI[k], orientacao: orientacoes[k] || '' })),
    ...(admin ? { admin: true, turmas: d.turmas.map((t) => ({ ...t, orixas: ordenarOrixas(t.orixas) })) } : {}),
  };
}

export async function acaoAmaci(eu, b) {
  if (!ehAdmin(eu)) throw new HttpError(403, 'Só quem administra a aba Amaci pode mudar isso.');
  if (b.op === 'publicar') {
    if (typeof b.publicada !== 'boolean') throw new HttpError(400, 'Informe se a aba fica visível para todos.');
    return amaci(eu, await db.rpc('amaci_publicar', { publicada: b.publicada }));
  }
  if (b.op === 'turma') {
    if (!Array.isArray(b.orixas) || b.orixas.some((k) => !ORIXA_KEYS.includes(k))) throw new HttpError(400, 'Orixá inválido.');
    return amaci(eu, await db.rpc('amaci_turma', { turmaId: validarId(b.turmaId, 'Turma'), orixas: ordenarOrixas(b.orixas) }));
  }
  if (b.op === 'orientacao') {
    if (!ORIXA_KEYS.includes(b.orixa)) throw new HttpError(400, 'Orixá inválido.');
    const texto = limparOrientacao(b.texto);
    if (texto === null) throw new HttpError(400, `O recado pode ter até ${ORIENTACAO_LINHAS} linhas (${ORIENTACAO_LETRAS} letras).`);
    return amaci(eu, await db.rpc('amaci_orientacao', { orixa: b.orixa, texto }));
  }
  throw new HttpError(400, 'Ação inválida.');
}
