// Login pelo backend do app. O token da sessão fica no localStorage deste navegador.

const CHAVE = 'sortmediuns:token';
// Modo demonstração (frontend/js/demo.js): este login entra sem o backend, com dados inventados.
export const DEMO_EMAIL = 'teste@cpj.com';
const DEMO_SENHA = '12345678';
const DEMO_TOKEN = 'demo:' + DEMO_EMAIL;
export const AVISO_DEMO = 'Modo demonstração: esta ação não é salva.';
let tok = null;
try { tok = localStorage.getItem(CHAVE); } catch { tok = null; }

function guardar(t) {
  tok = t;
  try {
    if (t) localStorage.setItem(CHAVE, t);
    else localStorage.removeItem(CHAVE);
  } catch { /* navegador sem armazenamento: a sessão dura até fechar a aba */ }
}

async function chamar(metodo, acao, corpo, comToken = false) {
  if (comToken && emDemo()) throw new Error(AVISO_DEMO);
  let r;
  try {
    r = await fetch('/api/auth/' + acao, {
      method: metodo,
      headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(comToken && tok ? { Authorization: 'Bearer ' + tok } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Sem conexão. Verifique a internet e tente de novo.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.erro || 'Algo deu errado. Tente de novo.');
    e.status = r.status;
    throw e;
  }
  return j;
}

export const logado = () => !!tok;
export const token = () => tok;
export const emDemo = () => tok === DEMO_TOKEN;

export const estadoDoApp = () => chamar('GET', 'estado');

// Sem senha: devolve { criarSenha, confirmar } e não entra.
export async function entrar(email, senha) {
  if (String(email).trim().toLowerCase() === DEMO_EMAIL) {
    if (senha !== DEMO_SENHA) throw new Error('E-mail ou senha incorretos.');
    guardar(DEMO_TOKEN);
    return {};
  }
  const r = await chamar('POST', 'entrar', { email, senha });
  if (r.criarSenha) return { criarSenha: true, confirmar: r.confirmar };
  guardar(r.token);
  return {};
}

// Sem senha, entrando com e-mail ou celular: confirma com o outro contato do cadastro, cria a senha e já entra.
export async function criarSenhaContato(contato, confirmacao, senha) {
  const r = await chamar('POST', 'criarSenhaContato', { contato, confirmacao, senha });
  guardar(r.token);
}

// Criar cadastro, primeiro passo: o CPF já tem cadastro? → { existe, temSenha, confirmar }
export const verificarCpf = (cpf) => chamar('POST', 'cadastrar', { cpf, verificar: true });

// CPF que já tem cadastro com senha: entra com ela.
export async function entrarCpf(cpf, senha) {
  const r = await chamar('POST', 'entrar', { cpf, senha });
  if (r.criarSenha) return { criarSenha: true, confirmar: r.confirmar };
  guardar(r.token);
  return {};
}

// CPF que já tem cadastro sem senha: confirma o celular (ou e-mail) do cadastro, cria a senha e já entra.
export async function criarSenhaCpf(cpf, confirmacao, senha) {
  const r = await chamar('POST', 'criarSenhaContato', { cpf, confirmacao, senha });
  guardar(r.token);
}

// Criar cadastro na tela de login (entra como aluno sem turma) e já fica logado.
export async function cadastrar(dados) {
  const r = await chamar('POST', 'cadastrar', dados);
  guardar(r.token);
}

export async function instalar(dados) {
  const r = await chamar('POST', 'instalar', dados);
  guardar(r.token);
}

export async function trocarSenha(atual, nova) {
  const r = await chamar('POST', 'senha', { atual, nova }, true);
  guardar(r.token);
}

// Acesso da corrente (ou aluno): cria a própria senha (PIN); o celular digitado tem de bater com o do cadastro.
// A sessão é renovada (as outras são encerradas).
export async function criarSenhaCorrente(senha, celular) {
  const r = await chamar('POST', 'criarSenha', { senha, celular }, true);
  guardar(r.token);
}

export function sair() {
  guardar(null);
}
