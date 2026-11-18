// CPF do Perfil: dado sensível, guardado cifrado (AES-256-GCM) na tabela pessoas_cpf, fora do perfil.
// A chave fica só na variável CPF_CHAVE da Vercel: quem tiver só o banco (ou um backup) não lê o CPF.
// O id da pessoa entra como dado autenticado: o texto cifrado de uma pessoa não serve na linha de outra.
//   GET  /api/auth/cpf?pessoaId=…        → { tem, mascarado, atualizadoEm }
//   GET  /api/auth/cpf?pessoaId=…&ver=1  → o mesmo + { cpf } (o número inteiro, só quando a pessoa toca em Mostrar)
//   POST /api/auth/cpf { pessoaId?, cpf }  grava (cpf '' apaga) → como o GET, sem o número
// Só a própria pessoa e o admin root; quem é de grupo (alunos, curimba) não tem CPF.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { HttpError, corpo, validarId } from './http.js';
import { db } from './db.js';
import { pode } from '../../shared/permissoes.js';
import { cpfValido, cpfMascarado } from '../../shared/perfil.js';

const CHAVE_MINIMA = 32;

function chave() {
  const k = process.env.CPF_CHAVE || '';
  if (k.length < CHAVE_MINIMA) throw new HttpError(503, 'O CPF ainda não está configurado no servidor.');
  return createHash('sha256').update(k).digest();
}

// Hash do CPF (HMAC com a mesma chave): liga o aluno às cobranças do ASAAS sem decifrar nada no banco.
export const hashCpf = (cpf) => createHmac('sha256', chave()).update(String(cpf)).digest('hex');

// 'v1.<iv>.<tag>.<cifrado>' em base64url.
export function cifrar(cpf, pessoaId) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  c.setAAD(Buffer.from(pessoaId));
  const dados = Buffer.concat([c.update(cpf, 'utf8'), c.final()]);
  return ['v1', iv, c.getAuthTag(), dados].map((x) => (typeof x === 'string' ? x : x.toString('base64url'))).join('.');
}

export function decifrar(texto, pessoaId) {
  const [v, iv, tag, dados] = String(texto || '').split('.');
  if (v !== 'v1' || !iv || !tag || !dados) throw new HttpError(500, 'CPF guardado em formato desconhecido.');
  try {
    const d = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64url'));
    d.setAAD(Buffer.from(pessoaId));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(dados, 'base64url')), d.final()]).toString('utf8');
  } catch {
    // Chave trocada ou linha adulterada: não mostra nada.
    throw new HttpError(500, 'Não foi possível ler o CPF guardado.');
  }
}

// De quem é o CPF: a própria pessoa (id da sessão) ou, só para o root, a pessoa escolhida.
function alvo(eu, pedido) {
  if (eu.grupo) throw new HttpError(403, 'Este acesso não tem CPF.');
  const id = pedido ? validarId(String(pedido), 'Pessoa') : eu.pessoaId;
  if (!id) throw new HttpError(400, 'Seu usuário não está ligado a uma pessoa da corrente.');
  if (id !== eu.pessoaId && !pode(eu, 'usuarios:gerenciar')) throw new HttpError(403, 'Só o admin root vê o CPF de outra pessoa.');
  return id;
}

function resposta(linha, pessoaId, ver) {
  if (!linha) return { tem: false, mascarado: '', atualizadoEm: null };
  const cpf = decifrar(linha.cifrado, pessoaId);
  return { tem: true, mascarado: cpfMascarado(cpf), atualizadoEm: linha.atualizadoEm, ...(ver ? { cpf } : {}) };
}

export async function rotaCpf(req, eu) {
  if (req.method === 'GET') {
    const pessoaId = alvo(eu, req.query.pessoaId);
    return resposta(await db.rpc('cpf_ler', { pessoaId }), pessoaId, req.query.ver === '1');
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const b = corpo(req);
  const pessoaId = alvo(eu, b.pessoaId);
  const bruto = String(b.cpf ?? '').trim();
  let cifrado = '';
  let hash = '';
  if (bruto) {
    const cpf = cpfValido(bruto);
    if (!cpf) throw new HttpError(400, 'CPF inválido. Confira os 11 números.');
    cifrado = cifrar(cpf, pessoaId);
    hash = hashCpf(cpf);
  }
  const linha = await db.rpc('cpf_salvar', { pessoaId, cifrado, hash, por: eu.nome || '' });
  return resposta(linha, pessoaId, false);
}

// Quem tem esse CPF (já validado): pessoa ativa da corrente ou aluno ativo (Criar cadastro e login pelo CPF).
// Antes, preenche o hash dos CPFs da corrente gravados sem ele (de antes da v130 e do UP CPJ).
export async function cadastroPorCpf(cpf) {
  await preencherHashes();
  return db.rpc('cadastro_por_cpf', { hash: hashCpf(cpf) });
}

// Hash do CPF → pessoa ativa da corrente (atrasos e Transparência ligam as cobranças do ASAAS sem decifrar os CPFs).
export async function pessoasPorHashCpf() {
  try { await preencherHashes(); } catch { /* sem CPF_CHAVE: só os hashes que já estão gravados */ }
  return new Map(((await db.rpc('cpf_hashes')) || []).map((l) => [l.hash, l.pessoaId]));
}

// Hash dos CPFs da corrente gravados sem ele (de antes da v130 e do UP CPJ). Também usado pela leitura dos atrasos.
export async function preencherHashes() {
  const semHash = await db.rpc('cpf_sem_hash');
  const itens = (semHash || []).map((l) => {
    try { return { pessoaId: l.pessoaId, hash: hashCpf(decifrar(l.cifrado, l.pessoaId)) }; } catch { return null; }
  }).filter(Boolean);
  if (itens.length) await db.rpc('cpf_hash_definir', { itens });
}
