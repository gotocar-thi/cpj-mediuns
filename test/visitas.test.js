import { test } from 'node:test';
import assert from 'node:assert/strict';

test('quem entrou nas abas: agrupa por grupo do cadastro e monta o texto do WhatsApp', async () => {
  const { agruparVisitas, textoVisitas, abaValida } = await import('../shared/visitas.js');
  const linhas = [
    { chave: 'a:1', aba: 'guias', dia: '2026-11-18', nome: 'Zé Aluno', grupo: 'Turma 10', vezes: 1, ultima: '2026-11-18T22:00:00+00:00' },
    { chave: 'p:1', aba: 'guias', dia: '2026-11-17', nome: 'Bia', grupo: 'Corrente CPJ', vezes: 2, ultima: '2026-11-17T12:00:00+00:00' },
    { chave: 'p:1', aba: 'guias', dia: '2026-11-19', nome: 'Bia', grupo: 'Corrente CPJ', vezes: 1, ultima: '2026-11-19T10:00:00+00:00' },
    { chave: 'p:2', aba: 'guias', dia: '2026-11-19', nome: 'Ana', grupo: 'Corrente CPJ', vezes: 1, ultima: '2026-11-19T09:00:00+00:00' },
    { chave: 'a:2', aba: 'guias', dia: '2026-11-19', nome: 'Novo', grupo: 'Alunos sem turma', vezes: 1, ultima: '2026-11-19T08:00:00+00:00' },
    { chave: 'a:3', aba: 'guias', dia: '2026-11-19', nome: 'Duda', grupo: 'Turma 9', vezes: 1, ultima: '2026-11-19T08:00:00+00:00' },
    { chave: 'p:3', aba: 'gira', dia: '2026-11-19', nome: 'Caio', grupo: 'Corrente CPJ', vezes: 1, ultima: '2026-11-19T08:00:00+00:00' },
  ];
  const g = agruparVisitas(linhas, 'guias');
  assert.deepEqual(g.map((x) => x.grupo), ['Corrente CPJ', 'Turma 9', 'Turma 10', 'Alunos sem turma']);
  assert.deepEqual(g[0].pessoas.map((p) => [p.nome, p.vezes, p.dias, p.ultima.slice(0, 10)]), [['Ana', 1, 1, '2026-11-19'], ['Bia', 3, 2, '2026-11-19']]);
  const t = textoVisitas(g, 'guias', (iso) => iso.slice(0, 10));
  assert.match(t, /^👀 \*Quem entrou na aba Compras\*\nÚltimos 3 dias · 5 pessoas\n\n\*Corrente CPJ\* \(2\)\n• Ana — 2026-11-19\n• Bia — 2026-11-19/);
  assert.equal(abaValida('guias'), true);
  assert.equal(abaValida('usuarios'), false, 'o Admin root não conta');
});
