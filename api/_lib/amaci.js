// Aba Amaci. Rotas em api/pessoas: GET ?lista=amaci e POST { acao: 'amaci', op, ... }.
// Interruptor "Visível para todos" (começa desligado): desligado, só quem administra a aba vê; o servidor recusa os outros.
// O admin libera, por turma de alunos, quais orixás ela vê (cada turma está numa etapa do curso).
// O aluno recebe só os orixás liberados para a turma dele; quem não é aluno (corrente, admins) vê os 14.
// O recado (texto livre do admin; no banco, "orientação") é um por orixá, igual para todas as turmas.
import { validarId, HttpError, hojeBR } from './http.js';
import { db } from './db.js';
import { pode } from '../../shared/permissoes.js';
import { ORIXA_KEYS, ordenarOrixas, limparOrientacao, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS, noTerreiro, pctAmaci } from '../../shared/amaci.js';
import { AMACI } from './amaciDados.js';

const ehAdmin = (eu) => pode(eu, 'amaci:editar');
// Presença no amaci: quem marca presença ou falta de qualquer aluno é o admin root.
const ehRoot = (eu) => pode(eu, 'usuarios:gerenciar');

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
    ...(await presencaAmaci(eu)),
  };
}

// Presença: amaci é todo evento cujo tipo tem "Amaci" no nome (T09 - Amaci, T10 - Amaci…); as turmas de cada um são as
// marcadas no tipo. O aluno recebe os amacis da turma dele e a situação de cada um; o root, os amacis até hoje (com as
// turmas de cada um), os alunos dessas turmas e as marcações.
async function presencaAmaci(eu) {
  const hoje = hojeBR();
  if (eu.grupo === 'alunos') {
    const P = await db.rpc('amaci_presencas_dados', { alunoId: eu.alunoId });
    const st = Object.fromEntries(P.presencas.map((x) => [x.eventoId, x.status]));
    const amacis = P.eventos.filter((e) => !!eu.turmaId && e.turmas.includes(eu.turmaId))
      .map(({ id, data, nome }) => ({ id, data, nome, status: st[id] || null }));
    return { presenca: { hoje, amacis, pct: pctAmaci(amacis, hoje) } };
  }
  if (!ehRoot(eu)) return {};
  const [P, al] = await Promise.all([db.rpc('amaci_presencas_dados'), db.rpc('alunos_estado')]);
  const marcas = {};
  P.presencas.forEach((x) => { (marcas[x.eventoId] ||= {})[x.alunoId] = x.status; });
  const comAmaci = new Set(P.eventos.flatMap((e) => e.turmas));
  return {
    presencaAdmin: {
      hoje,
      amacis: P.eventos.filter((e) => e.data <= hoje).reverse(),
      turmas: al.turmas.filter((t) => comAmaci.has(t.id)),
      alunos: al.alunos.filter((a) => comAmaci.has(a.turmaId)),
      marcas,
    },
  };
}

// O aluno confirma a própria presença: só no dia do amaci da turma dele e dentro do terreiro.
export async function presencaAluno(eu, b) {
  if (eu.grupo !== 'alunos') throw new HttpError(403, 'Só o aluno confirma a própria presença.');
  const eventoId = validarId(b.eventoId, 'Amaci');
  const P = await db.rpc('amaci_presencas_dados', { alunoId: eu.alunoId });
  const ev = P.eventos.find((e) => e.id === eventoId);
  if (!ev || !eu.turmaId || !ev.turmas.includes(eu.turmaId)) throw new HttpError(404, 'Amaci não encontrado para a sua turma.');
  if (ev.data !== hojeBR()) throw new HttpError(409, 'A presença só pode ser confirmada no dia do amaci.');
  if (!noTerreiro(Number(b.lat), Number(b.lon))) throw new HttpError(403, 'Você precisa estar no Terreiro Pai João para confirmar a presença.');
  await db.rpc('amaci_presenca_marcar', { eventoId, alunoId: eu.alunoId, status: 'p', por: 'aluno' });
  return amaci(eu);
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
  if (b.op === 'presenca') {
    if (!ehRoot(eu)) throw new HttpError(403, 'Só o admin root marca a presença dos alunos.');
    if (!['p', 'f', ''].includes(b.status ?? '')) throw new HttpError(400, 'Situação inválida.');
    const eventoId = validarId(b.eventoId, 'Amaci');
    const alunoId = validarId(b.alunoId, 'Aluno');
    const P = await db.rpc('amaci_presencas_dados');
    if (!P.eventos.some((e) => e.id === eventoId)) throw new HttpError(404, 'Amaci não encontrado.');
    await db.rpc('amaci_presenca_marcar', { eventoId, alunoId, status: b.status || null, por: 'root' });
    return amaci(eu);
  }
  throw new HttpError(400, 'Ação inválida.');
}
