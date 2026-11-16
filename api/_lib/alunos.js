// Dados dos alunos da CPJ (bloco Alunos, aba Pessoas): nome completo, celular, e-mail e CPF, e as pendências
// (cobranças vencidas do ASAAS ligadas ao aluno pelo CPF ou pelo cliente que o app criou).
// Quem edita Alunos vê e preenche tudo; o CPF vai mascarado (só os 2 últimos) e o número inteiro só em Mostrar.
// Nome completo, celular e e-mail ficam no perfil do aluno (os mesmos que ele preenche no Perfil); o CPF fica cifrado
// (api/_lib/cpf.js), com o hash para ligar às cobranças.
import { HttpError, validarId } from './http.js';
import { db } from './db.js';
import { pode } from '../../shared/permissoes.js';
import { cpfValido, cpfMascarado, emailValido } from '../../shared/perfil.js';
import { cifrar, decifrar, hashCpf } from './cpf.js';

const soNumeros = (v) => String(v ?? '').replace(/\D/g, '');

// Campos que vieram no pedido, já conferidos. cpf: '' apaga; ausente, não mexe.
export function dadosAluno(b) {
  const d = {};
  if ('nomeCompleto' in b) {
    d.nomeCompleto = String(b.nomeCompleto ?? '').replace(/\s+/g, ' ').trim();
    if (d.nomeCompleto.length > 80) throw new HttpError(400, 'Nome completo pode ter até 80 letras.');
  }
  if ('celular' in b) {
    d.celular = soNumeros(b.celular);
    if (d.celular && (d.celular.length < 10 || d.celular.length > 11)) throw new HttpError(400, 'Celular inválido: use DDD e número (10 ou 11 números).');
  }
  if ('email' in b) {
    const bruto = String(b.email ?? '').trim();
    d.email = emailValido(bruto);
    if (bruto && !d.email) throw new HttpError(400, 'E-mail inválido.');
  }
  if ('cpf' in b) {
    const bruto = String(b.cpf ?? '').trim();
    d.cpf = bruto ? cpfValido(bruto) : '';
    if (d.cpf === null) throw new HttpError(400, 'CPF inválido. Confira os 11 números.');
  }
  return d;
}
export const temDados = (d) => Object.keys(d).length > 0;

export async function salvarDadosAluno(id, d, eu) {
  const { cpf, ...resto } = d;
  if (temDados(resto)) await db.rpc('aluno_dados_salvar', { id, ...resto });
  if (cpf !== undefined) {
    await db.rpc('aluno_cpf_salvar', cpf ? { id, cifrado: cifrar(cpf, id), hash: hashCpf(cpf), por: eu.nome || '' } : { id, cifrado: '' });
  }
}

// Junta ao estado dos alunos os dados e as pendências (só para quem edita Alunos).
export async function comExtras(estado, eu) {
  if (!pode(eu, 'alunos:editar') || !estado?.alunos) return estado;
  const x = await db.rpc('alunos_extras');
  const dados = {};
  for (const a of x.dados) {
    let cpf = '';
    if (a.cifrado) { try { cpf = cpfMascarado(decifrar(a.cifrado, a.id)); } catch { cpf = 'guardado'; } }
    dados[a.id] = { nomeCompleto: a.nomeCompleto, celular: a.celular, email: a.email, temCpf: !!a.cifrado, cpf };
  }
  const pendencias = Object.fromEntries(x.pendencias.map((p) => [p.alunoId, p.itens]));
  return { ...estado, dados, pendencias, pendenciasEm: x.atualizadoEm };
}

// O CPF inteiro, quando quem edita Alunos toca em Mostrar.
export async function cpfDoAluno(b) {
  const id = validarId(b.id, 'Aluno');
  const cifrado = await db.rpc('aluno_cpf_ler', { id });
  if (!cifrado) throw new HttpError(404, 'Este aluno não tem CPF cadastrado.');
  return { cpf: decifrar(cifrado, id) };
}
