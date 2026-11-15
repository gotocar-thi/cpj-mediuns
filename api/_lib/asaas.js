// Integração com o ASAAS: Pix dos pedidos da aba Compras.
//
// O navegador nunca fala com o ASAAS e nunca diz o valor: ele pede "pagar o pedido nº N" e o backend
// soma as linhas da própria pessoa (da sessão) que ainda não estão pagas, cria a cobrança e devolve o QR.
// Só o webhook marca como pago, e só depois de conferir no ASAAS (GET /payments/:id) o status e o valor.
//
// Rotas (todas em api/oferendas, para não criar função nova):
//   POST ?webhook=asaas                          — o ASAAS avisa (token no cabeçalho asaas-access-token)
//   POST { acao: 'guias', op: 'pix', pedido, cpf? } — a pessoa gera o Pix do que pediu (cpf só na 1ª vez)
//   GET  ?lista=asaas                            — aba ASAAS (root): situação, cobranças e eventos recebidos
//   POST { acao: 'asaas', op: 'ativar', ativo } · { acao: 'asaas', op: 'cancelar', id }   (root)
//
// Variáveis (só no servidor): ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e ASAAS_API_URL (sem ela, usa o sandbox).
import { HttpError, corpo, validarId, hojeBR } from './http.js';
import { db } from './db.js';
import { iguaisSeguro } from './senhas.js';
import { pode } from '../../shared/permissoes.js';
import { chavePessoa } from '../../shared/ervas.js';

const SANDBOX = 'https://api-sandbox.asaas.com/v3';
const urlApi = () => (process.env.ASAAS_API_URL || SANDBOX).replace(/\/+$/, '');
export const configurado = () => !!(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN);
const PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

// Chamada à API do ASAAS. Erro do ASAAS vira mensagem para a tela; falha de rede, 502.
async function asaas(metodo, caminho, dados, ms = 8000) {
  let r;
  try {
    r = await fetch(urlApi() + caminho, {
      method: metodo,
      headers: { access_token: process.env.ASAAS_API_KEY, 'Content-Type': 'application/json', 'User-Agent': 'cpj-mediuns' },
      body: dados ? JSON.stringify(dados) : undefined,
      signal: AbortSignal.timeout(ms),
    });
  } catch {
    throw new HttpError(502, 'O ASAAS não respondeu. Tente de novo em instantes.');
  }
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = json?.errors?.map((e) => e.description).filter(Boolean).join(' ');
    console.error('[asaas]', metodo, caminho, r.status, msg || '');
    throw new HttpError(r.status >= 500 ? 502 : 400, msg ? 'ASAAS: ' + msg : 'O ASAAS recusou o pedido.');
  }
  return json;
}

// ---------- CPF (só vai para o ASAAS; o app não guarda) ----------
export function cpfValido(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return null;
  const dv = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]) ? d : null;
}

// ---------- pessoa: gerar o Pix ----------
export const pixLigado = async () => configurado() && !!(await db.rpc('asaas_ativo'));

// O que a tela Compras recebe de Pix: se está ligado, se precisa do CPF e as cobranças da pessoa.
export async function pixDaPessoa(eu) {
  if (!(await pixLigado())) return { pix: false };
  const r = await db.rpc('asaas_minhas', { chave: chavePessoa(eu) });
  return { pix: true, pixPrecisaCpf: !r.cliente, cobrancas: r.cobrancas.map((c) => ({ ...c, valor: Number(c.valor) })) };
}

// Antes de pedir com o Pix ligado: sem cliente no ASAAS, o CPF tem de vir válido (senão nem faz o pedido).
// Devolve se o Pix está ligado.
export async function pixAntesDePedir(eu, cpf) {
  if (!(await pixLigado())) return false;
  if (!(await db.rpc('asaas_minhas', { chave: chavePessoa(eu) })).cliente && !cpfValido(cpf)) {
    throw new HttpError(400, 'Informe um CPF válido para gerar o link de pagamento.');
  }
  return true;
}

function amanhaBR() {
  const [y, m, d] = hojeBR().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export async function gerarPix(eu, b) {
  if (!(await pixLigado())) throw new HttpError(403, 'O pagamento por Pix não está disponível no momento.');
  const pedido = Number(b.pedido);
  if (!Number.isInteger(pedido) || pedido < 1) throw new HttpError(400, 'Pedido inválido.');
  const chave = chavePessoa(eu);
  // Cliente no ASAAS: criado uma vez por pessoa, com o CPF que ela digita (o app guarda só o id do cliente).
  let cliente = (await db.rpc('asaas_minhas', { chave })).cliente;
  if (!cliente) {
    const cpf = cpfValido(b.cpf);
    if (!cpf) throw new HttpError(400, 'Informe um CPF válido para gerar o Pix.');
    cliente = (await asaas('POST', '/customers', { name: eu.nome, cpfCnpj: cpf, externalReference: chave, notificationDisabled: true })).id;
    await db.rpc('asaas_cliente_salvar', { chave, clienteId: cliente });
  }
  // Reserva as linhas não pagas da pessoa neste pedido (o valor sai do banco, nunca do navegador).
  const c = await db.rpc('asaas_cobranca_reservar', { chave, nome: eu.nome, pedido });
  try {
    const pg = await asaas('POST', '/payments', {
      customer: cliente, billingType: 'PIX', value: Number(c.valor), dueDate: amanhaBR(),
      description: `CPJ · Compras · pedido nº ${pedido}`, externalReference: c.id,
    });
    let qr = null;
    try { qr = await asaas('GET', `/payments/${encodeURIComponent(pg.id)}/pixQrCode`); } catch { /* o QR pode vir depois: a tela mostra o link */ }
    await db.rpc('asaas_cobranca_criada', {
      id: c.id, asaasId: pg.id, link: pg.invoiceUrl || null,
      payload: qr?.payload || null, imagem: qr?.encodedImage || null, vencimento: pg.dueDate || null,
    });
  } catch (e) {
    await db.rpc('asaas_cobranca_desfazer', { id: c.id }).catch(() => {});
    throw e;
  }
}

// ---------- webhook ----------
export async function webhookAsaas(req) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado) throw new HttpError(503, 'Webhook do ASAAS não configurado.');
  const recebido = req.headers['asaas-access-token'];
  if (typeof recebido !== 'string' || !iguaisSeguro(recebido, esperado)) throw new HttpError(401, 'Token inválido.');
  const b = corpo(req);
  const id = typeof b.id === 'string' ? b.id.trim() : '';
  const evento = typeof b.event === 'string' ? b.event.trim() : '';
  if (!id || !evento || id.length > 100 || evento.length > 100) throw new HttpError(400, 'Evento inválido.');
  const paymentId = typeof b.payment?.id === 'string' ? b.payment.id : null;
  const p = { id, evento, dados: b, paymentId };
  // Pagamento: confere direto no ASAAS antes de liberar. Se o ASAAS não responder, devolve erro
  // e o evento não é gravado, para o ASAAS reenviar depois.
  if (paymentId && (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') && process.env.ASAAS_API_KEY) {
    const real = await asaas('GET', `/payments/${encodeURIComponent(paymentId)}`, null, 5000);
    p.conferido = { status: real.status, valor: Number(real.value) };
  }
  await db.rpc('asaas_evento_processar', p);
  return { ok: true };
}

// ---------- aba ASAAS (root) ----------
function exigirRoot(eu) {
  if (!pode(eu, 'usuarios:gerenciar')) throw new HttpError(403, 'Só o admin root acessa a aba ASAAS.');
}

async function respostaRoot() {
  const e = await db.rpc('asaas_estado');
  return {
    ...e,
    cobrancas: e.cobrancas.map((c) => ({ ...c, valor: Number(c.valor) })),
    config: {
      chave: !!process.env.ASAAS_API_KEY,
      token: !!process.env.ASAAS_WEBHOOK_TOKEN,
      // Só a URL de produção do ASAAS é produção; qualquer outra (sandbox, teste) não é.
      ambiente: urlApi().startsWith('https://api.asaas.com/') ? 'Produção' : 'Sandbox (testes)',
    },
  };
}

export async function respostaAsaas(eu) {
  exigirRoot(eu);
  return respostaRoot();
}

export async function acaoAsaas(eu, b) {
  exigirRoot(eu);
  if (b.op === 'ativar') {
    if (typeof b.ativo !== 'boolean') throw new HttpError(400, 'Informe se o Pix fica ligado.');
    if (b.ativo && !configurado()) throw new HttpError(400, 'Configure ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN na Vercel antes de ligar.');
    await db.rpc('asaas_ativar', { ativo: b.ativo });
  } else if (b.op === 'cancelar') {
    const id = validarId(b.id, 'Cobrança');
    const c = await db.rpc('asaas_cobranca', { id });
    if (!c) throw new HttpError(404, 'Cobrança não encontrada.');
    if (c.status !== 'pendente') throw new HttpError(400, 'Só dá para cancelar cobrança pendente.');
    if (c.asaasId) await asaas('DELETE', `/payments/${encodeURIComponent(c.asaasId)}`);
    await db.rpc('asaas_cobranca_cancelar', { id });
  } else {
    throw new HttpError(400, 'Ação inválida.');
  }
  return respostaRoot();
}
