// Eventos da casa que cada acesso vê. A corrente vê todos os tipos.
// Alunos: gira e evento sempre; os outros tipos, só se a turma do aluno estiver marcada no tipo (filtro no banco).
// Curimba: tudo menos os avisos.
import { db } from './db.js';

export async function eventosDe(eu) {
  if (eu.grupo === 'alunos') return db.rpc('eventos_listar', { aluno: true, turmaId: eu.turmaId || '' });
  const eventos = await db.rpc('eventos_listar');
  return eu.grupo === 'curimba' ? eventos.filter((x) => x.tipo !== 'aviso') : eventos;
}
