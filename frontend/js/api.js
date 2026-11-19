// Cliente do backend (/api). Envia o token da sessão e trata expiração.

import { token, sair, emDemo } from './auth.js';

export class ErroApi extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let aoExpirar = () => {};
export function quandoSessaoExpirar(fn) { aoExpirar = fn; }

// Root vendo o app como outra pessoa ('p:<pessoa>' ou 'a:<aluno>'): vai em todo pedido; o servidor responde como ela, só leitura.
let verComo = '';
export function definirVerComo(v) { verComo = v || ''; }

// Backoff: erros 5xx seguidos aumentam a espera antes de tentar de novo (evita enxurrar o banco quando a quota estoura).
let servidorBloqueadoAte = 0;
let errosServidor = 0;

export async function api(metodo, rota, corpo) {
  const t = token();
  if (!t) { aoExpirar(); throw new ErroApi(401, 'Faça login.'); }
  // Backoff ativo: recusa chamadas ao servidor até o tempo passar (ações do usuário, como salvar, passam).
  if (servidorBloqueadoAte > Date.now() && metodo === 'GET') {
    throw new ErroApi(503, 'O servidor está indisponível. Aguarde um momento e tente de novo.');
  }
  if (emDemo()) {
    const { demoApi } = await import('./demo.js');
    try { return await demoApi(metodo, rota, corpo, verComo); } catch (e) { throw new ErroApi(e.status || 400, e.message); }
  }
  let r;
  try {
    r = await fetch('/api' + rota, {
      method: metodo,
      headers: { Authorization: 'Bearer ' + t, ...(verComo ? { 'X-Ver-Como': verComo } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão. Verifique a internet e tente de novo.');
  }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { sair(); aoExpirar(); }
  if (!r.ok) {
    // Erro de servidor (5xx): backoff progressivo — 30s, 1min, 2min, 5min.
    if (r.status >= 500) {
      errosServidor++;
      const espera = Math.min(30000 * Math.pow(2, errosServidor - 1), 5 * 60 * 1000);
      servidorBloqueadoAte = Date.now() + espera;
    }
    throw new ErroApi(r.status, j.erro || 'Algo deu errado. Tente de novo.');
  }
  // Sucesso: limpa o backoff.
  errosServidor = 0;
  servidorBloqueadoAte = 0;
  return j;
}
