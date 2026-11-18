// Pagamentos em atraso das duas contas do ASAAS, no bloco da aba Geral: a B (mensalidades, doações…, cobranças feitas
// no próprio ASAAS) e a A (a das Compras, cujos links o app gera). O app só lê as vencidas (status OVERDUE) e liga cada
// uma à pessoa: na conta A, pela referência do cliente que o app criou (a chave da pessoa); nas duas, pelo CPF do Perfil
// (o CPF é decifrado só aqui, em memória; nunca vai para a tela). Link da conta A que já foi trocado por outro, ou de
// item pago ou cancelado, não conta (o filtro fica em atrasos_ler).
// A leitura fica guardada em asaas2_atrasos e é refeita no máximo a cada 10 minutos, ou no Atualizar:
// o do root lê sempre; o da pessoa só se a última leitura tiver mais de 1 minuto (toques repetidos não viram chamadas ao ASAAS).
// Não usa webhook: a fonte é sempre o ASAAS na hora da leitura. Os dados dos clientes (nome, telefone, hash do CPF e
// referência) ficam guardados por 7 dias (asaas_clientes_info): cada leitura busca só as cobranças e os clientes novos;
// o Atualizar do root renova todos. A pessoa é achada pelo hash do CPF do Perfil, sem decifrar os CPFs.
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
import { hashCpf, preencherHashes } from './cpf.js';
import { pode } from '../../shared/permissoes.js';

const CONTAS = { A: 'ASAAS', B: 'ASAAS2' };
const VALIDADE_MS = 10 * 60 * 1000;
const INTERVALO_PESSOA_MS = 60 * 1000;
const MAX_COBRANCAS = 1000;
const LOTE_CLIENTES = 10;

const ligada = (k) => !!process.env[CONTAS[k] + '_API_KEY'];
export const configuradoB = () => ligada('B');
const soNumeros = (v) => String(v ?? '').replace(/\D/g, '');

// Lê no ASAAS as cobranças vencidas de uma conta e os clientes delas (os guardados há menos de 7 dias não são buscados de
// novo, a não ser com renovar); liga cada uma à pessoa pelo hash do CPF.
async function buscarNoAsaas(k, porHash, renovar) {
  const CONTA = CONTAS[k];
  const cobrancas = [];
  for (let offset = 0; offset < MAX_COBRANCAS; offset += 100) {
    const r = await chamarAsaas(CONTA, 'GET', `/payments?status=OVERDUE&limit=100&offset=${offset}`);
    cobrancas.push(...(r?.data || []));
    if (!r?.hasMore) break;
  }
  const ids = [...new Set(cobrancas.map((c) => c.customer).filter(Boolean))];
  const clientes = new Map();
  if (!renovar && ids.length) (await db.rpc('asaas_clientes_info_ler', { conta: k, ids })).forEach((c) => clientes.set(c.id, c));
  const novos = [];
  const faltam = ids.filter((id) => !clientes.has(id));
  for (let i = 0; i < faltam.length; i += LOTE_CLIENTES) {
    await Promise.all(faltam.slice(i, i + LOTE_CLIENTES).map(async (id) => {
      try {
        const cli = await chamarAsaas(CONTA, 'GET', `/customers/${encodeURIComponent(id)}`);
        // Hash do CPF do cliente (o CPF aberto não é guardado): liga à pessoa e ao aluno sem decifrar nada.
        const cpf = soNumeros(cli.cpfCnpj);
        let cpfHash = '';
        if (cpf.length === 11) { try { cpfHash = hashCpf(cpf); } catch { /* sem CPF_CHAVE: não liga por CPF */ } }
        const info = { id, nome: String(cli.name || ''), telefone: soNumeros(cli.mobilePhone || cli.phone), cpfHash, referencia: String(cli.externalReference || '') };
        clientes.set(id, info);
        novos.push(info);
      } catch { /* fica sem nome/CPF */ }
    }));
  }
  if (novos.length) await db.rpc('asaas_clientes_info_salvar', { conta: k, itens: novos });
  return cobrancas.map((c) => {
    const cli = clientes.get(c.customer) || {};
    // Cliente que o app criou na conta A: a referência é a chave da pessoa ('p:<id>') ou do aluno ('a:<id>').
    const ref = String(cli.referencia || '');
    const daChave = /^p:[0-9a-f-]{36}$/.test(ref) ? ref.slice(2) : null;
    const doAluno = /^a:[0-9a-f-]{36}$/.test(ref) ? ref.slice(2) : '';
    const cpfHash = cli.cpfHash || '';
    return {
      id: String(c.id),
      referencia: String(c.externalReference || ''),
      alunoId: doAluno,
      cpfHash,
      pessoaId: daChave || (cpfHash && porHash.get(cpfHash)) || null,
      nome: String(cli.nome || ''),
      telefone: String(cli.telefone || ''),
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
    try { await preencherHashes(); } catch { /* sem CPF_CHAVE: liga só pela referência */ }
    const porHash = new Map(((await db.rpc('cpf_hashes')) || []).map((l) => [l.hash, l.pessoaId]));
    const falhas = [];
    for (const k of ['B', 'A'].filter((x) => contas[x])) {
      try {
        await db.rpc('atrasos_salvar', { conta: k, itens: await buscarNoAsaas(k, porHash, forcar && root) });
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
