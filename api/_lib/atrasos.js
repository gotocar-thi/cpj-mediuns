// Pagamentos em atraso das duas contas do ASAAS, no bloco da aba Geral: a B (mensalidades, doações…, cobranças feitas
// no próprio ASAAS) e a A (a das Compras, cujos links o app gera). O app só lê as vencidas (status OVERDUE) e liga cada
// uma à pessoa: na conta A, pela referência do cliente que o app criou (a chave da pessoa); nas duas, pelo CPF do Perfil
// (o CPF é decifrado só aqui, em memória; nunca vai para a tela). Link da conta A que já foi trocado por outro, ou de
// item pago ou cancelado, não conta (o filtro fica em atrasos_ler).
// A leitura fica guardada em asaas2_atrasos e é refeita no máximo a cada 10 minutos, ou no Atualizar:
// o do root lê sempre; o da pessoa só se a última leitura tiver mais de 1 minuto (toques repetidos não viram chamadas ao ASAAS).
// Não usa webhook: a fonte é sempre o ASAAS na hora da leitura.
//
//   GET /api/giras?lista=atrasos[&atualizar=1]
//     → { configurado, contas: { A, B } (quais estão ligadas), root, atualizadoEm, erro?, semSenha?, atrasos: [...] }
//   Cada item traz a conta ('A' ou 'B'). Pessoa: só as próprias (id, conta, valor, vencimento, descricao, link).
//   Root: todas, com nome e telefone para o lembrete.
//
// Variáveis (só no servidor): ASAAS2_API_KEY e ASAAS2_API_URL (conta B) · ASAAS_API_KEY e ASAAS_API_URL (conta A).
// Sem a URL, usa o sandbox.

import { HttpError } from './http.js';
import { db } from './db.js';
import { chamarAsaas } from './asaas.js';
import { decifrar, hashCpf } from './cpf.js';
import { pode } from '../../shared/permissoes.js';

const CONTAS = { A: 'ASAAS', B: 'ASAAS2' };
const VALIDADE_MS = 10 * 60 * 1000;
const INTERVALO_PESSOA_MS = 60 * 1000;
const MAX_COBRANCAS = 1000;
const LOTE_CLIENTES = 10;

const ligada = (k) => !!process.env[CONTAS[k] + '_API_KEY'];
export const configuradoB = () => ligada('B');
const soNumeros = (v) => String(v ?? '').replace(/\D/g, '');

// Lê no ASAAS as cobranças vencidas de uma conta e os clientes delas; liga cada uma à pessoa.
async function buscarNoAsaas(k, porCpf) {
  const CONTA = CONTAS[k];
  const cobrancas = [];
  for (let offset = 0; offset < MAX_COBRANCAS; offset += 100) {
    const r = await chamarAsaas(CONTA, 'GET', `/payments?status=OVERDUE&limit=100&offset=${offset}`);
    cobrancas.push(...(r?.data || []));
    if (!r?.hasMore) break;
  }
  const ids = [...new Set(cobrancas.map((c) => c.customer).filter(Boolean))];
  const clientes = new Map();
  for (let i = 0; i < ids.length; i += LOTE_CLIENTES) {
    await Promise.all(ids.slice(i, i + LOTE_CLIENTES).map(async (id) => {
      try { clientes.set(id, await chamarAsaas(CONTA, 'GET', `/customers/${encodeURIComponent(id)}`)); } catch { /* fica sem nome/CPF */ }
    }));
  }
  return cobrancas.map((c) => {
    const cli = clientes.get(c.customer) || {};
    // Cliente que o app criou na conta A: a referência é a chave da pessoa ('p:<id>') ou do aluno ('a:<id>').
    const ref = String(cli.externalReference || '');
    const daChave = /^p:[0-9a-f-]{36}$/.test(ref) ? ref.slice(2) : null;
    const doAluno = /^a:[0-9a-f-]{36}$/.test(ref) ? ref.slice(2) : '';
    // Hash do CPF do cliente: liga ao aluno pelo CPF dele (alunos_cpf), sem decifrar nada no banco.
    const cpf = soNumeros(cli.cpfCnpj);
    let cpfHash = '';
    if (cpf.length === 11) { try { cpfHash = hashCpf(cpf); } catch { /* sem CPF_CHAVE: não liga por CPF */ } }
    return {
      id: String(c.id),
      referencia: String(c.externalReference || ''),
      alunoId: doAluno,
      cpfHash,
      pessoaId: daChave || porCpf.get(cpf) || null,
      nome: String(cli.name || ''),
      telefone: soNumeros(cli.mobilePhone || cli.phone),
      valor: Number(c.value) || 0,
      vencimento: c.dueDate || null,
      descricao: String(c.description || ''),
      link: /^https:\/\//.test(c.invoiceUrl || '') ? c.invoiceUrl : '',
    };
  });
}

export async function atrasos(eu, atualizar) {
  if (eu.grupo) throw new HttpError(403, 'Este acesso não tem pagamentos.');
  // Visão de todos (ADMIN FINANCEIRO): quem vê a aba ASAAS (root e Admin financeiro).
  const root = pode(eu, 'asaas:ver');
  const contas = { A: ligada('A'), B: ligada('B') };
  if (!contas.A && !contas.B) return { configurado: false, contas, root, atrasos: [] };
  // Pelo acesso da corrente, só com a senha criada: sem ela, qualquer um entra com o nome de outra pessoa.
  if (!root && eu.papel === 'corrente' && !eu.temSenha) return { configurado: true, contas, root, semSenha: true, atrasos: [] };
  let s = await db.rpc('atrasos_ler');
  let erro;
  const idade = s.atualizadoEm ? Date.now() - Date.parse(s.atualizadoEm) : Infinity;
  const forcar = atualizar && (root || idade > INTERVALO_PESSOA_MS);
  if (forcar || idade > VALIDADE_MS) {
    // Cada conta é lida e guardada sozinha: se uma falhar, a outra continua atualizada.
    const porCpf = new Map();
    for (const l of (await db.rpc('cpf_todos')) || []) {
      try { porCpf.set(decifrar(l.cifrado, l.pessoaId), l.pessoaId); } catch { /* sem chave ou linha ruim: não liga */ }
    }
    const falhas = [];
    for (const k of ['B', 'A'].filter((x) => contas[x])) {
      try {
        await db.rpc('atrasos_salvar', { conta: k, itens: await buscarNoAsaas(k, porCpf) });
      } catch (e) {
        console.error('[atrasos] leitura da conta', k, e.message);
        falhas.push({ k, e });
      }
    }
    if (falhas.length && forcar && root && falhas.length === Object.values(contas).filter(Boolean).length) throw falhas[0].e;
    if (falhas.length) erro = `Não foi possível consultar ${falhas.length > 1 ? 'as contas' : `a conta ${falhas[0].k}`} do ASAAS agora; mostrando a última leitura.`;
    s = await db.rpc('atrasos_ler');
  }
  const itens = root ? s.itens
    : s.itens.filter((i) => eu.pessoaId && i.pessoaId === eu.pessoaId)
      .map(({ id, conta, valor, vencimento, descricao, link }) => ({ id, conta, valor, vencimento, descricao, link }));
  return { configurado: true, contas, root, atualizadoEm: s.atualizadoEm, ...(erro ? { erro } : {}), atrasos: itens };
}
