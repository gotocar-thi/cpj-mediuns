// Modo demonstração: login teste@cpj.com / 12345678. Tudo roda aqui no navegador, com dados inventados em memória;
// nada vai para o backend. Recarregar a página volta os dados ao início.
// A escala (presença, sorteio, publicar, encerrar) funciona de verdade, com as mesmas regras de shared/regras.js;
// as outras gravações respondem com o aviso de demonstração.

import { sortear, remanejar, encerrar, reabrir, giraVazia, retratoDaGira } from '/shared/regras.js';
import { PERMISSOES_ROOT, PERFIS_PADRAO } from '/shared/permissoes.js';
import { TIPOS_EVENTO } from '/shared/eventos.js';
import { calcularPedidos } from '/shared/ervas.js';
import { normalizarPerfil, contagemPerfis, pessoasPorOrixaCabeca } from '/shared/perfil.js';

import { DEMO_EMAIL, AVISO_DEMO } from './auth.js';

class ErroDemo extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const copia = (o) => JSON.parse(JSON.stringify(o));
// Sábado desta semana (ou o próximo) e os anteriores, de 7 em 7 dias.
const proximoSabado = (() => { const d = new Date(); return (6 - d.getDay() + 7) % 7; })();

const CONFIG = {
  responsavel: 'Ana', dirigente: 'Mãe Lúcia', sugestao: 'Ana/Mãe Lúcia',
  saudacao: '*Bom dia corrente* ✨', saudacao2: '_Boa semana para nós_', encerramento: 'Contamos com vocês. Axé! 🙏',
};

const P = (n, nome, funcao, extra = {}) => ({
  id: id(n), nome, funcao, experiente: false, linhas: null, limpeza: (n % 3) + 1, entrada: '2024-01-01', saida: null,
  licencas: [], guiasAtendimento: {}, guiaChefe: null, guiaFrente: null, afinidadeExtra: [], afinidadePasse: [], aniversario: null, ...extra,
});
const EU_ID = id(9);

const db = {
  pessoas: [
    P(1, 'Mãe Lúcia', 'medium', { experiente: true, guiaChefe: 'preto-velho', guiaFrente: 'caboclo' }),
    P(2, 'Rafael Moura', 'medium', { experiente: true, guiaChefe: 'exu' }),
    P(3, 'Juliana Prado', 'medium', { guiaChefe: 'cigano', aniversario: dia(3).slice(5) }),
    P(4, 'Marcos Lima', 'medium', { guiaChefe: 'baiano' }),
    P(5, 'Beatriz Souza', 'cambone', { experiente: true }),
    P(6, 'Carla Mendes', 'cambone'),
    P(7, 'Diego Alves', 'cambone'),
    P(8, 'Fernanda Rocha', 'cambone', { licencas: [{ id: id(901), inicio: dia(-2), fim: dia(20), motivo: 'Viagem' }] }),
    P(9, 'Teste CPJ', 'cambone'),
    P(10, 'Gustavo Reis', 'passe', { linhas: ['preto-velho', 'caboclo'] }),
    P(11, 'Helena Castro', 'passe', { linhas: ['caboclo'] }),
    P(12, 'Igor Nunes', 'extra', { linhas: ['exu', 'pomba-gira'] }),
    P(13, 'Larissa Pinto', 'senha'),
    P(14, 'Pedro Tavares', 'curimba'),
  ],
  giras: [],
  perfis: {},
  eventos: [
    { id: id(301), data: dia(proximoSabado), nome: 'Gira de Caboclo', tipo: 'gira' },
    { id: id(302), data: dia(proximoSabado + 14), nome: 'Amaci da turma 1', tipo: 'amaci' },
    { id: id(303), data: dia(proximoSabado + 2), nome: 'Mutirão de limpeza do terreiro', tipo: 'aviso' },
  ],
  oracoes: [
    { id: id(401), texto: 'Pela saúde da minha avó Rosa.', criadoEm: new Date().toISOString(), expiraEm: dia(3), autor: 'p:' + id(6), autorNome: 'Carla Mendes', reacoes: ['p:' + id(1), 'p:' + id(5)] },
    { id: id(402), texto: 'Por um novo emprego para o meu irmão.', criadoEm: new Date().toISOString(), expiraEm: dia(3), autor: 'u:demo', autorNome: 'Teste CPJ', reacoes: [] },
  ],
  turmas: [{ id: id(501), nome: 'Turma 1' }, { id: id(502), nome: 'Turma 2' }],
  alunos: [
    { id: id(601), nome: 'Aline Ferreira', turmaId: id(501) },
    { id: id(602), nome: 'Bruno Costa', turmaId: id(501) },
    { id: id(603), nome: 'Cecília Ramos', turmaId: id(502) },
  ],
  videos: [
    { id: id(701), data: dia(proximoSabado - 7), evento: 'Gira de Preto Velho', youtube: 'dQw4w9WgXcQ', classes: [] },
  ],
  curimba: {
    alunos: [{ id: id(801), nome: 'Pedro Tavares', pessoaId: id(14) }, { id: id(802), nome: 'Bruno Costa', pessoaId: null }],
    aulas: [{ id: id(811), data: dia(-5), nome: 'Toques de Ijexá' }, { id: id(812), data: dia(2), nome: 'Pontos de Caboclo' }],
    presencas: [{ aulaId: id(811), alunoId: id(801), status: 'p' }, { aulaId: id(811), alunoId: id(802), status: 'f' }],
  },
  ervas: [
    { id: id(1001), nome: 'Arruda', preco: 6, precoEstimado: 6, pessoasPorcao: null },
    { id: id(1002), nome: 'Guiné', preco: 8, precoEstimado: 8, pessoasPorcao: null },
    { id: id(1003), nome: 'Alecrim', preco: 5, precoEstimado: 5, pessoasPorcao: null },
    { id: id(1004), nome: 'Manjericão', preco: null, precoEstimado: null, pessoasPorcao: null },
  ],
  escolhas: [
    { chave: 'p:' + id(5), nome: 'Beatriz Souza', ervaId: id(1001), quantidade: 2 },
    { chave: 'p:' + id(5), nome: 'Beatriz Souza', ervaId: id(1003), quantidade: 1 },
    { chave: 'p:' + id(3), nome: 'Juliana Prado', ervaId: id(1002), quantidade: 1 },
  ],
  oferendas: [],
};

// Perfil (aba Perfil) de algumas pessoas.
const perfilDe = (orixa, chefe, frente, info = {}) => normalizarPerfil({
  orixas: { frente: { nome: orixa } }, guias: { chefe: { linha: chefe }, frente: { linha: frente } }, info,
});
db.perfis[id(1)] = perfilDe('Oxalá', 'preto-velho', 'caboclo', { nome: 'Lúcia Aparecida Santos' });
db.perfis[id(2)] = perfilDe('Ogum', 'exu', 'baiano');
db.perfis[id(3)] = perfilDe('Iansã', 'cigano', 'pomba-gira');
db.perfis[id(4)] = perfilDe('Xangô', 'baiano', '');
db.perfis[id(5)] = perfilDe('Oxum', '', '');
db.perfis[EU_ID] = perfilDe('Oxóssi', 'caboclo', '', { nome: 'Teste da Silva', email: DEMO_EMAIL, celular: '11912345678' });

db.oferendas = [{
  id: id(1101), titulo: 'Oferenda para Oxóssi', data: dia(proximoSabado + 7), status: 'publicado', abaId: id(1150),
  responsavelId: id(1), porMedium: false, noResumo: false, mediuns: [], grupos: [],
  itens: [
    { id: id(1111), nome: 'Milho verde', quantidade: 10, unidade: 'un', entrega: '', entregue: false, doacoes: [{ chave: 'p:' + id(5), nome: 'Beatriz Souza', quantidade: 4 }] },
    { id: id(1112), nome: 'Frutas variadas', quantidade: 3, unidade: 'kg', entrega: '', entregue: false, doacoes: [] },
    { id: id(1113), nome: 'Vela verde', quantidade: 7, unidade: 'un', entrega: '', entregue: false, doacoes: [{ chave: 'p:' + id(2), nome: 'Rafael Moura', quantidade: 7 }] },
  ],
}];
const ABAS_OFERENDA = [{ id: id(1150), nome: 'Oferendas', visivel: true, detalhes: '', ordem: 0 }];

// Giras: três já encerradas (sorteadas e fechadas pelas mesmas regras do app) e a próxima, ainda em aberto.
function montarGiras() {
  const passadas = [[-21, 'Exu', id(7)], [-14, 'Preto Velho', id(4)], [-7, 'Baiano', id(13)]];
  for (const [n, entidade, faltou] of passadas) {
    let g = { ...giraVazia(dia(proximoSabado + n)), entidade, publicada: true, pendentePadrao: false };
    g.presenca = Object.fromEntries(db.pessoas.filter((p) => p.funcao !== 'curimba').map((p) => [p.id, p.id === faltou ? 'f' : 'p']));
    g = { ...g, ...sortear(db.pessoas, db.giras, g).patch };
    g = { ...g, ...encerrar(db.pessoas, g).patch, atendimentos: { preferencial: 6, normal: 38, passe: 21 } };
    db.giras.push(g);
  }
  db.giras.push({ ...giraVazia(dia(proximoSabado)), entidade: 'Caboclo', recado: 'Venham de branco. Tragam uma vela verde.' });
}
montarGiras();

const giraDe = (data) => db.giras.find((g) => g.data === data);
function salvarGira(g) {
  const i = db.giras.findIndex((x) => x.data === g.data);
  if (i >= 0) db.giras[i] = g; else db.giras.push(g);
  return g;
}
const girasOrdenadas = () => copia([...db.giras].sort((a, b) => b.data.localeCompare(a.data)));

const me = () => ({
  id: 'u-demo', nome: 'Teste CPJ', email: DEMO_EMAIL, papel: 'root', papelNome: 'Admin root', pessoaId: EU_ID,
  permissoes: PERMISSOES_ROOT, corrente: false, videosPublicada: true, ervasPublicada: true, guiasPublicada: true,
  amaciPublicada: true, transparenciaPublicada: true, oferendasPublica: true, iemanjaAba: false, iemanjaPublica: false,
});

const oracoes = () => db.oracoes.map(({ autor, reacoes, ...o }) => ({
  ...o, deAluno: false, meu: autor === 'u:demo', apagar: true, reacoes: reacoes.length, reagi: reacoes.includes('u:demo'),
}));

const inicio = () => ({
  me: me(), versao: 'demo', config: CONFIG, pessoas: copia(db.pessoas), giras: girasOrdenadas(),
  eventos: copia(db.eventos), minhaCurimba: null, oracoes: oracoes(), entidadesApelidos: [],
});

const todosPerfis = () => db.pessoas.filter((p) => !p.saida).map((p) => ({ pessoaId: p.id, nome: p.nome, funcao: p.funcao, perfil: db.perfis[p.id] || normalizarPerfil({}) }));
function perfil() {
  const todos = todosPerfis();
  return {
    eu: todos.find((x) => x.pessoaId === EU_ID) || null,
    todos,
    contatos: todos.map((x) => ({ pessoaId: x.pessoaId, nome: x.nome, contatoNome: x.perfil.info.contatoNome || '', contatoTelefone: x.perfil.info.contatoTelefone || '' })),
    guias: todos.filter((x) => x.perfil.guias.chefe.linha || x.perfil.guias.frente.linha)
      .map((x) => ({ pessoaId: x.pessoaId, nome: x.nome, chefe: x.perfil.guias.chefe.linha, frente: x.perfil.guias.frente.linha })),
  };
}

function ervas() {
  const eu = { chave: 'u:demo', nome: 'Teste CPJ' };
  return {
    frete: 12, aberta: true, gira: 'Gira de Caboclo', data: dia(proximoSabado), ervas: copia(db.ervas),
    minhas: db.escolhas.filter((s) => s.chave === eu.chave).map(({ ervaId, quantidade }) => ({ ervaId, quantidade })),
    eu, participantes: new Set(db.escolhas.map((s) => s.chave)).size, euParticipo: db.escolhas.some((s) => s.chave === eu.chave),
    pedidos: calcularPedidos(db.ervas, db.escolhas, 12), publicada: true,
  };
}

const oferendas = () => ({ oferendas: copia(db.oferendas), eu: { chave: 'u:demo', nome: 'Teste CPJ' }, abas: copia(ABAS_OFERENDA), publica: true });

const SEM_DADOS = 'Demonstração: esta aba usa integrações (ASAAS, armazenamento) e fica sem dados aqui.';

function lerGet(caminho, q) {
  const lista = q.get('lista');
  if (caminho === '/auth/inicio') return q.get('atualizar') ? { versao: 'demo', semMudanca: true } : inicio();
  if (caminho === '/auth/me') return me();
  if (caminho === '/auth/perfil') return perfil();
  if (caminho === '/auth/anamnese') {
    return {
      visivel: true,
      perguntas: [{ id: id(1201), texto: 'Você tem alguma alergia?', tipo: 'texto' }, { id: id(1202), texto: 'Já participou de outra casa de Umbanda?', tipo: 'simnao' }],
      minhas: {}, todas: [],
    };
  }
  if (caminho === '/auth/foto') return { foto: null };
  if (caminho === '/auth/cpf') return { cpf: '' };
  if (caminho === '/giras') {
    if (!lista) return girasOrdenadas();
    if (lista === 'oracoes') return oracoes();
    if (lista === 'eventos') return copia(db.eventos);
    if (lista === 'eventosTipos') return { tipos: TIPOS_EVENTO.map(([chave, nome]) => ({ chave, nome, turmas: [] })), turmas: copia(db.turmas), eventos: copia(db.eventos) };
    if (lista === 'videos') return copia(db.videos);
    if (lista === 'ausencias') return [];
    if (lista === 'conduta') return { ativa: true, relatos: [] };
    if (lista === 'atrasos') return { configurado: false, contas: {}, root: true, atrasos: [] };
    if (lista === 'fotos') return { albuns: [], fotos: [], usado: 0, limite: 0, configurado: false };
    if (lista === 'transparencia') throw new ErroDemo(400, SEM_DADOS);
  }
  const mGira = caminho.match(/^\/giras\/(\d{4}-\d{2}-\d{2})$/);
  if (mGira) return copia(giraDe(mGira[1]) || giraVazia(mGira[1]));
  if (caminho === '/pessoas') {
    if (!lista) return copia(db.pessoas);
    if (lista === 'alunos') return { turmas: copia(db.turmas), alunos: copia(db.alunos) };
    if (lista === 'curimba') return copia(db.curimba);
    if (lista === 'minhaCurimba') return null;
    if (lista === 'perfis') { const t = todosPerfis(); return { ...contagemPerfis(t), cabecaNomes: pessoasPorOrixaCabeca(t) }; }
    if (lista === 'amaci') return { publicada: false, liberados: [], orixas: [], admin: true, turmas: db.turmas.map((t) => ({ ...t, orixas: [] })) };
  }
  if (caminho === '/usuarios') {
    const usuarios = [{ id: 'u-demo', nome: 'Teste CPJ', email: DEMO_EMAIL, papel: 'root', papelNome: 'Admin root', pessoaId: EU_ID }];
    const senhas = db.pessoas.filter((p) => !p.saida).map((p) => ({ pessoaId: p.id, nome: p.nome, temSenha: p.funcao === 'medium' }));
    if (lista === 'perfis') return copia(PERFIS_PADRAO);
    if (lista === 'senhas') return senhas;
    if (lista === 'tudo') return { usuarios, perfis: copia(PERFIS_PADRAO), senhas };
    return usuarios;
  }
  if (caminho === '/ervas') return lista === 'historico' ? [] : ervas();
  if (caminho === '/oferendas') {
    if (!lista) return oferendas();
    if (lista === 'guias') return { admin: true, publicada: true, grupos: [], pedidos: [], meus: [] };
    if (lista === 'iemanja' || lista === 'asaas') throw new ErroDemo(400, SEM_DADOS);
  }
  throw new ErroDemo(404, 'Demonstração: sem dados para esta tela.');
}

const pessoaSemSaida = () => db.pessoas;

// Ações da escala que funcionam na demonstração.
function acaoGira(data, b) {
  const atual = giraDe(data) || giraVazia(data);
  const pessoas = pessoaSemSaida();
  const com = (patch, mensagem) => ({ gira: copia(salvarGira({ ...atual, ...patch })), mensagem });
  switch (b.acao) {
    case 'encerrar': {
      if (atual.encerrada) return { gira: copia(atual), mensagem: 'A gira já estava encerrada.' };
      const { patch, mensagem } = encerrar(pessoas, atual);
      return com({ ...patch, atendimentos: b.atendimentos || null, participantes: b.participantes ?? null }, mensagem);
    }
    case 'reabrir': {
      if (!atual.encerrada) return { gira: copia(atual), mensagem: 'A gira já estava aberta.' };
      const { patch, mensagem } = reabrir(pessoas, atual);
      return com(patch, mensagem);
    }
    case 'publicar': return com({ publicada: !!b.publicada }, b.publicada ? 'Escala publicada: agora todos veem o sorteio.' : 'Publicação desfeita: só os admins veem o sorteio.');
    case 'travar': return com({ travada: !!b.travada }, b.travada ? 'Escala travada: marcar falta não muda a escala.' : 'Trava desligada: faltas voltam a tirar a pessoa da escala.');
    case 'recado': return com({ recado: String(b.recado || '') }, b.recado ? 'Recado salvo: todos veem no evento.' : 'Recado retirado.');
    case 'cancelarSorteio': return com({ pares: [], passes: [], publicada: false }, 'Sorteio cancelado: as duplas foram apagadas.');
    case 'corrigirPresenca': return com({ presenca: { ...atual.presenca, [b.pessoaId]: b.status } }, 'Presença corrigida.');
    case 'ausencia': return com({ presenca: { ...atual.presenca, [EU_ID]: 'a' } }, 'Ausência registrada. Obrigado por avisar! #boa gira');
    case 'reiniciar': return com({ presenca: {}, papeis: {}, pares: [], passes: [], publicada: false }, 'Gira reiniciada: todos voltaram para Pendente.');
    case 'mudarData': {
      if (giraDe(b.para)) throw new ErroDemo(409, 'Já existe gira nesta data.');
      db.giras = db.giras.filter((g) => g.data !== data);
      const [y, m, d] = b.para.split('-');
      return { gira: copia(salvarGira({ ...atual, data: b.para })), mensagem: `Data da gira alterada para ${d}/${m}/${y}.` };
    }
    default: throw new ErroDemo(400, AVISO_DEMO);
  }
}

function escrever(metodo, caminho, b) {
  const mGira = caminho.match(/^\/giras\/(\d{4}-\d{2}-\d{2})(?:\/(sortear|remanejar))?$/);
  if (mGira) {
    const [, data, sub] = mGira;
    if (metodo === 'DELETE') { db.giras = db.giras.filter((g) => g.data !== data); return { ok: true }; }
    if (metodo === 'PUT') return copia(salvarGira({ ...(giraDe(data) || giraVazia(data)), ...b, data }));
    if (sub) {
      const g = giraDe(data) || giraVazia(data);
      if (g.encerrada) throw new ErroDemo(409, 'A gira está encerrada. Reabra para mudar.');
      const r = (sub === 'sortear' ? sortear : remanejar)(db.pessoas, db.giras, g);
      return { gira: copia(salvarGira({ ...g, ...(r.patch || {}) })), mensagem: r.mensagem };
    }
    return acaoGira(data, b || {});
  }
  const mPessoa = caminho.match(/^\/pessoas\/([\w-]+)$/);
  if (mPessoa && metodo === 'PATCH') {
    const p = db.pessoas.find((x) => x.id === mPessoa[1]);
    if (!p) throw new ErroDemo(404, 'Pessoa não encontrada.');
    Object.assign(p, b);
    return copia(p);
  }
  if (caminho === '/giras' && b?.acao === 'oracao') {
    db.oracoes.unshift({ id: id(4000 + db.oracoes.length), texto: String(b.texto || '').trim(), criadoEm: new Date().toISOString(), expiraEm: dia(4), autor: 'u:demo', autorNome: 'Teste CPJ', reacoes: [] });
    return oracoes();
  }
  if (caminho === '/giras' && b?.acao === 'reagirOracao') {
    const o = db.oracoes.find((x) => x.id === b.id);
    if (o) o.reacoes = o.reacoes.includes('u:demo') ? o.reacoes.filter((r) => r !== 'u:demo') : [...o.reacoes, 'u:demo'];
    return oracoes();
  }
  if (caminho === '/giras' && b?.acao === 'excluirOracao') { db.oracoes = db.oracoes.filter((x) => x.id !== b.id); return oracoes(); }
  if (caminho === '/auth/perfil' && b?.perfil) {
    db.perfis[EU_ID] = normalizarPerfil(b.perfil);
    return perfil().eu;
  }
  throw new ErroDemo(400, AVISO_DEMO);
}

// Mesmo contrato de api(): devolve o JSON ou lança erro com { status, message }.
export async function demoApi(metodo, rota, corpo) {
  const u = new URL(rota, 'http://demo');
  try {
    return metodo === 'GET' ? lerGet(u.pathname, u.searchParams) : escrever(metodo, u.pathname, corpo);
  } catch (e) {
    if (e instanceof ErroDemo) throw e;
    console.error('[demo]', metodo, rota, e);
    throw new ErroDemo(500, 'Demonstração: algo deu errado nesta tela.');
  }
}
