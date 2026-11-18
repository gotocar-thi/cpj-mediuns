// Sub-aba Pagamentos (aba Compras): o histórico de cobranças do ASAAS de quem está logado, achado pelo CPF do Perfil
// (o CPF é decifrado só aqui, em memória, para a busca; nunca vai para a tela). Lê as duas contas ligadas: a A (Compras)
// e a B (mensalidades, doações…). Por custo, a leitura fica guardada (asaas_historico) e é refeita 1 vez por dia, a partir
// das 9h (corteDiario em asaas.js); o Atualizar da pessoa lê de novo no máximo a cada 10 minutos (o do root, sempre).
// Só o root vê a sub-aba até ligar "Visível para todos".
//
//   GET  /api/oferendas?lista=pagamentos[&atualizar=1]
//     → { publicada, root, temCpf, atualizadoEm, erro?, pagamentos: [{ conta, ...campos do ASAAS }] }
//   POST /api/oferendas { acao: 'pagamentos', op: 'publicar', publicada }  (só o root) → o mesmo do GET
import { HttpError } from './http.js';
import { db } from './db.js';
import { chamarAsaas, leituraDoDia } from './asaas.js';
import { decifrar } from './cpf.js';
import { pode } from '../../shared/permissoes.js';
import { chavePessoa } from '../../shared/ervas.js';

const CONTAS = { A: 'ASAAS', B: 'ASAAS2' };
const ligada = (k) => !!process.env[CONTAS[k] + '_API_KEY'];
const INTERVALO_ATUALIZAR_MS = 10 * 60 * 1000;
const MAX_PAGINAS = 10;
const ehRoot = (eu) => pode(eu, 'usuarios:gerenciar');

// CPF de quem está logado: pessoa da corrente (Perfil) ou aluno. Sem CPF guardado: ''.
async function cpfDe(eu) {
  if (eu.alunoId) {
    const cifrado = await db.rpc('aluno_cpf_ler', { id: eu.alunoId });
    return cifrado ? decifrar(cifrado, eu.alunoId) : '';
  }
  if (!eu.pessoaId) return '';
  const linha = await db.rpc('cpf_ler', { pessoaId: eu.pessoaId });
  return linha?.cifrado ? decifrar(linha.cifrado, eu.pessoaId) : '';
}

// Todas as cobranças do CPF numa conta: os clientes com esse CPF e as cobranças de cada um (páginas de 100).
async function buscarConta(k, cpf) {
  const clientes = (await chamarAsaas(CONTAS[k], 'GET', `/customers?cpfCnpj=${encodeURIComponent(cpf)}&limit=100`))?.data || [];
  const lista = [];
  for (const cli of clientes) {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const r = await chamarAsaas(CONTAS[k], 'GET', `/payments?customer=${encodeURIComponent(cli.id)}&limit=100&offset=${pagina * 100}`);
      lista.push(...(r?.data || []).map((c) => ({ conta: k, ...c })));
      if (!r?.hasMore) break;
    }
  }
  return lista;
}

export async function respostaPagamentos(eu, atualizar = false) {
  if (eu.grupo && eu.grupo !== 'alunos') throw new HttpError(403, 'Este acesso não tem pagamentos.');
  const publicada = !!(await db.rpc('pagamentos_publicada'));
  const root = ehRoot(eu);
  if (!publicada && !root && !eu.verComo) throw new HttpError(403, 'A sub-aba Pagamentos não está disponível no momento.');
  const base = { publicada, root };
  const contas = ['A', 'B'].filter(ligada);
  if (!contas.length) return { ...base, configurado: false, temCpf: false, pagamentos: [] };
  const cpf = await cpfDe(eu);
  if (!cpf) return { ...base, configurado: true, temCpf: false, pagamentos: [] };
  const chave = chavePessoa(eu);
  let guardado = await db.rpc('asaas_historico_ler', { chave });
  const idade = guardado?.atualizadoEm ? Date.now() - Date.parse(guardado.atualizadoEm) : Infinity;
  const forcar = atualizar && (root || idade > INTERVALO_ATUALIZAR_MS);
  let erro;
  if (forcar || !leituraDoDia(guardado?.atualizadoEm)) {
    try {
      const lista = (await Promise.all(contas.map((k) => buscarConta(k, cpf)))).flat();
      guardado = await db.rpc('asaas_historico_salvar', { chave, dados: lista });
    } catch (e) {
      console.error('[pagamentos]', e.message);
      if (!guardado) throw e;
      erro = 'Não foi possível consultar o ASAAS agora; mostrando a última leitura.';
    }
  }
  return { ...base, configurado: true, temCpf: true, atualizadoEm: guardado?.atualizadoEm || null, ...(erro ? { erro } : {}), pagamentos: guardado?.dados || [] };
}

export async function acaoPagamentos(eu, b) {
  if (b.op !== 'publicar') throw new HttpError(400, 'Ação inválida.');
  if (!ehRoot(eu)) throw new HttpError(403, 'Só o admin root muda a visibilidade dos Pagamentos.');
  if (typeof b.publicada !== 'boolean') throw new HttpError(400, 'Informe se a sub-aba fica visível para todos.');
  await db.rpc('pagamentos_publicar', { publicada: b.publicada });
  return respostaPagamentos(eu);
}
