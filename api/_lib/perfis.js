// Perfis (tabela perfis) que podem ser dados a um usuário com e-mail.
// O "corrente" é só do acesso pelo nome, não vai para usuários.
import { db } from './db.js';

export async function papelValido(papel) {
  // Corrente e Consulentes são de quem entra pelo próprio cadastro: não vão para um usuário de e-mail.
  if (!papel || papel === 'corrente' || papel === 'consulente') return false;
  return (await db.rpc('perfis_config')).some((f) => f.chave === papel);
}
