// Aba Amaci: regras e conteúdo (sem banco).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ORIXAS, ORIXA_KEYS, ordenarOrixas, ultimoLiberado, limparOrientacao, ORIENTACAO_LINHAS, ORIENTACAO_LETRAS } from '../shared/amaci.js';
import { AMACI } from '../api/_lib/amaciDados.js';
import { liberadosPara } from '../api/_lib/amaci.js';
import { PERFIS_PADRAO, PERMISSOES_GRUPO, permissoesDe } from '../shared/permissoes.js';

test('amaci: 14 orixás, cada um com todos os blocos e as imagens que existem', () => {
  assert.equal(ORIXAS.length, 14);
  assert.deepEqual(Object.keys(AMACI).sort(), [...ORIXA_KEYS].sort());
  for (const k of ORIXA_KEYS) {
    const o = AMACI[k];
    const itemOk = (t) => (typeof t === 'string' ? t.trim().length > 0 : Array.isArray(t) && typeof t[0] === 'string' && t[1].length && t[1].every(itemOk));
    for (const campo of ['velas', 'ervas']) assert.ok(o[campo].length && o[campo].every(itemOk), `${k}.${campo}`);
    for (const campo of ['itens', 'pratos', 'onde']) assert.ok(o.oferenda[campo].length && o.oferenda[campo].every(itemOk), `${k}.oferenda.${campo}`);
    assert.ok((o.firmeza || []).every(itemOk), `${k}.firmeza`);
    assert.equal(o.nota, undefined, `${k}: nada de texto que não seja da apostila`);
    for (const p of o.pontos) assert.ok(existsSync(new URL(`../frontend/img/amaci/${p.img}`, import.meta.url)), p.img);
  }
});

test('amaci: liberados na ordem da apostila; abre no último liberado', () => {
  assert.deepEqual(ordenarOrixas(['oba', 'oxala', 'xxx', 'oxala', 'oxum']), ['oxala', 'oxum', 'oba']);
  assert.deepEqual(ordenarOrixas(null), []);
  assert.equal(ultimoLiberado(['oba', 'oxala', 'loguna']), 'oba');
  assert.equal(ultimoLiberado([]), '');
});

test('amaci: aluno vê só a turma dele; corrente e admin veem os 14', () => {
  const turmas = [{ id: 't9', nome: 'Turma 09', orixas: ['loguna', 'oxala'] }, { id: 't10', nome: 'Turma 10', orixas: [] }];
  const aluno = (turmaId) => ({ grupo: 'alunos', turmaId, permissoes: PERMISSOES_GRUPO.alunos });
  assert.deepEqual(liberadosPara(aluno('t9'), turmas), ['oxala', 'loguna']);
  assert.deepEqual(liberadosPara(aluno('t10'), turmas), []);
  assert.deepEqual(liberadosPara(aluno(null), turmas), [], 'aluno sem turma não vê nenhum');
  assert.deepEqual(liberadosPara({ pessoaId: 'p', permissoes: ['amaci:ver'] }, turmas), ORIXA_KEYS);
  assert.deepEqual(liberadosPara({ grupo: 'alunos', turmaId: 't10', permissoes: ['amaci:editar'] }, turmas), ORIXA_KEYS);
});

test('amaci: todos os perfis veem; só root e Admin administram; o aluno vê, a curimba não', () => {
  for (const p of PERFIS_PADRAO) {
    const perms = permissoesDe(p.chave, p.abas);
    assert.ok(perms.includes('amaci:ver'), p.chave);
    assert.equal(perms.includes('amaci:editar'), ['root', 'admin'].includes(p.chave), p.chave);
  }
  assert.ok(PERMISSOES_GRUPO.alunos.includes('amaci:ver'));
  assert.ok(!PERMISSOES_GRUPO.curimba.includes('amaci:ver'));
});

test('amaci: orientação até 10 linhas, sem espaços nas pontas', () => {
  assert.equal(limparOrientacao('  a  \n b \n'), 'a\nb');
  assert.equal(limparOrientacao(Array(ORIENTACAO_LINHAS).fill('x').join('\n')).split('\n').length, ORIENTACAO_LINHAS);
  assert.equal(limparOrientacao(Array(ORIENTACAO_LINHAS + 1).fill('x').join('\n')), null);
  assert.equal(limparOrientacao('x'.repeat(ORIENTACAO_LETRAS + 1)), null);
  assert.equal(limparOrientacao(null), '');
});
