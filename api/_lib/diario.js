// Aba Diário: o registro pessoal de cada dia (regras e campos em shared/diario.js). Cada pessoa lê e grava só o
// próprio diário, pela chave da sessão; nem o root lê o dos outros (no "Ver como", a aba não abre). Só o root vê a aba
// até ligar "Visível para todos". Acesso da curimba (login do grupo, sem pessoa) não tem diário.
//
//   GET  /api/pessoas?lista=diario  → { publicada, root, dias: [{ data, dados }] }
//   POST /api/pessoas { acao: 'diario', op: 'salvar', data, dados }  → { data, dados }  (dados limpos; {} apaga o dia)
//                     { acao: 'diario', op: 'publicar', publicada }    (só o root) → o mesmo do GET
import { HttpError, validarData, hojeBR } from './http.js';
import { db } from './db.js';
import { pode } from '../../shared/permissoes.js';
import { chavePessoa } from '../../shared/ervas.js';
import { normalizarDia } from '../../shared/diario.js';

const ehRoot = (eu) => pode(eu, 'usuarios:gerenciar');

async function exigirDiario(eu) {
  if (eu.grupo && eu.grupo !== 'alunos') throw new HttpError(403, 'Este acesso não tem diário.');
  if (eu.verComo) throw new HttpError(403, 'O Diário é pessoal: não abre no "Ver como".');
  const publicada = !!(await db.rpc('diario_publicada'));
  if (!publicada && !ehRoot(eu)) throw new HttpError(403, 'A aba Diário não está disponível no momento.');
  return publicada;
}

export async function diario(eu) {
  const [publicada, dias] = await Promise.all([exigirDiario(eu), db.rpc('diario_listar', { chave: chavePessoa(eu) })]);
  return { publicada, root: ehRoot(eu), dias };
}

export async function acaoDiario(eu, b) {
  if (b.op === 'publicar') {
    if (!ehRoot(eu)) throw new HttpError(403, 'Só o admin root muda a visibilidade do Diário.');
    if (typeof b.publicada !== 'boolean') throw new HttpError(400, 'Informe se a aba fica visível para todos.');
    await db.rpc('diario_publicar', { publicada: b.publicada });
    return diario(eu);
  }
  if (b.op !== 'salvar') throw new HttpError(400, 'Ação inválida.');
  await exigirDiario(eu);
  const data = validarData(String(b.data || ''));
  if (data > hojeBR()) throw new HttpError(400, 'O diário não aceita dias que ainda não chegaram.');
  return db.rpc('diario_salvar', { chave: chavePessoa(eu), data, dados: normalizarDia(b.dados) });
}
