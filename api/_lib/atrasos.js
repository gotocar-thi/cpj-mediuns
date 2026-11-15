// Pagamentos em atraso da conta B do ASAAS (mensalidades, doações…), no bloco da aba Geral.
// As cobranças nascem no próprio ASAAS: o app só lê as vencidas (status OVERDUE) e liga cada uma
// à pessoa pelo CPF do Perfil (o CPF é decifrado só aqui, em memória; nunca vai para a tela).
// A leitura fica guardada em asaas2_atrasos e é refeita no máximo a cada 10 minutos, ou no Atualizar:
// o do root lê sempre; o da pessoa só se a última leitura tiver mais de 1 minuto (toques repetidos não viram chamadas ao ASAAS).
// Não usa webhook: a fonte é sempre o ASAAS na hora da leitura.
//
//   GET /api/giras?lista=atrasos[&atualizar=1]
//     → { configurado, root, atualizadoEm, erro?, semSenha?, atrasos: [...] }
//   Pessoa: só as próprias (id, valor, vencimento, descricao, link). Root: todas, com nome e telefone para o lembrete.
//
// Variáveis (só no servidor): ASAAS2_API_KEY e ASAAS2_API_URL (sem ela, usa o sandbox).

import { HttpError } from './http.js';
import { db } from './db.js';
import { chamarAsaas } from './asaas.js';
import { decifrar } from './cpf.js';
import { pode } from '../../shared/permissoes.js';

const CONTA = 'ASAAS2';
const VALIDADE_MS = 10 * 60 * 1000;
const INTERVALO_PESSOA_MS = 60 * 1000;
const MAX_COBRANCAS = 1000;
const LOTE_CLIENTES = 10;

export const configuradoB = () => !!process.env[CONTA + '_API_KEY'];
const soNumeros = (v) => String(v ?? '').replace(/\D/g, '');

// Lê no ASAAS as cobranças vencidas e os clientes delas; liga cada uma à pessoa pelo CPF.
async function buscarNoAsaas() {
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
  const porCpf = new Map();
  for (const l of (await db.rpc('cpf_todos')) || []) {
    try { porCpf.set(decifrar(l.cifrado, l.pessoaId), l.pessoaId); } catch { /* sem chave ou linha ruim: não liga */ }
  }
  return cobrancas.map((c) => {
    const cli = clientes.get(c.customer) || {};
    return {
      id: String(c.id),
      pessoaId: porCpf.get(soNumeros(cli.cpfCnpj)) || null,
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
  const root = pode(eu, 'usuarios:gerenciar');
  if (!configuradoB()) return { configurado: false, root, atrasos: [] };
  // Pelo acesso da corrente, só com a senha criada: sem ela, qualquer um entra com o nome de outra pessoa.
  if (!root && eu.papel === 'corrente' && !eu.temSenha) return { configurado: true, root, semSenha: true, atrasos: [] };
  let s = await db.rpc('atrasos_ler');
  let erro;
  const idade = s.atualizadoEm ? Date.now() - Date.parse(s.atualizadoEm) : Infinity;
  const forcar = atualizar && (root || idade > INTERVALO_PESSOA_MS);
  if (forcar || idade > VALIDADE_MS) {
    try {
      await db.rpc('atrasos_salvar', { itens: await buscarNoAsaas() });
      s = await db.rpc('atrasos_ler');
    } catch (e) {
      if (forcar && root) throw e;
      console.error('[asaas2] leitura', e.message);
      erro = 'Não foi possível consultar o ASAAS agora; mostrando a última leitura.';
    }
  }
  const itens = root ? s.itens
    : s.itens.filter((i) => eu.pessoaId && i.pessoaId === eu.pessoaId)
      .map(({ id, valor, vencimento, descricao, link }) => ({ id, valor, vencimento, descricao, link }));
  return { configurado: true, root, atualizadoEm: s.atualizadoEm, ...(erro ? { erro } : {}), atrasos: itens };
}
