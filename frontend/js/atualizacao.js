// Service worker: guarda os arquivos do app no aparelho (respostas da API, nunca). O build gera o /sw.js.
// O app pergunta ao servidor se há versão nova ao abrir, ao dar refresh e ao voltar do segundo plano.
// A versão nova baixa só o que mudou e fica esperando pronta: ela só assume junto com o recarregamento da página
// (nunca no meio do uso, para não misturar arquivos de duas versões). Recarrega sozinha se a pessoa ainda não mexeu
// em nada; senão aparece o aviso para atualizar.

import { toast } from './util.js';

const FORA_MINIMO = 5 * 60 * 1000;   // tanto tempo fora vale como abrir o app de novo
const BUSCA_MINIMA = 60 * 1000;      // intervalo mínimo entre as perguntas ao servidor
const ESPERA_TROCA = 4000;           // se a troca não confirmar nesse tempo, recarrega mesmo assim

// A versão que está servindo esta página (o service worker responde).
function mostrarVersao() {
  const el = document.getElementById('versao-app');
  const ativo = navigator.serviceWorker?.controller;
  if (!el || !ativo) return;
  const canal = new MessageChannel();
  canal.port1.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    el.textContent = 'versão ' + e.data.slice(0, 6);
    el.hidden = false;
  };
  ativo.postMessage('versao', [canal.port2]);
}

export function iniciarAtualizacao({ pendente, digitando }) {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  let registro = null;
  let interagiu = false;
  let saiuEm = 0;
  let buscouEm = 0;
  let recarregando = false;
  let trocando = false;   // esta página pediu a troca e vai recarregar

  const recarregar = () => {
    if (recarregando) return;
    recarregando = true;
    location.reload();
  };

  // Ativa a versão que está esperando e recarrega a página com ela.
  function ativar() {
    const espera = registro?.waiting;
    if (!espera) { recarregar(); return; }
    trocando = true;
    espera.postMessage('atualizar');
    setTimeout(recarregar, ESPERA_TROCA);
  }

  function mostrarAviso() {
    if (document.getElementById('nova-versao')) return;
    const aviso = document.createElement('div');
    aviso.id = 'nova-versao';
    aviso.className = 'nova-versao';
    aviso.setAttribute('role', 'status');
    aviso.innerHTML = '<span>Nova versão disponível</span><button type="button" class="btn small primary">Atualizar</button>';
    aviso.querySelector('button').addEventListener('click', () => {
      if (pendente()) toast('Aguarde terminar de salvar e toque em Atualizar de novo.');
      else ativar();
    });
    document.body.appendChild(aviso);
  }

  // Versão nova pronta (baixada e esperando): troca já se a pessoa não mexeu em nada; senão, avisa.
  function pronta() {
    if (!registro?.waiting || !sw.controller) return;   // sem controlador é a primeira visita: nada a trocar
    if (!interagiu && !pendente() && !digitando()) ativar();
    else mostrarAviso();
  }

  function acompanhar(r) {
    r.addEventListener('updatefound', () => {
      const novo = r.installing;
      novo?.addEventListener('statechange', () => { if (novo.state === 'installed') pronta(); });
    });
  }

  function procurar() {
    if (!registro || Date.now() - buscouEm < BUSCA_MINIMA) return;
    buscouEm = Date.now();
    registro.update().catch(() => { /* sem conexão: tenta na próxima */ });
  }
  function voltou(fora) {
    if (fora >= FORA_MINIMO) interagiu = false;
    pronta();
    procurar();
  }

  addEventListener('pointerdown', () => { interagiu = true; }, { capture: true });
  addEventListener('keydown', () => { interagiu = true; }, { capture: true });
  // A troca pedida por esta página: recarrega. Pedida por outra aba (ou app antigo que troca sozinho): esta página
  // ficou com arquivos de outra versão, então recarrega também (ou avisa, se a pessoa está mexendo).
  // Primeira visita (sem controlador): o service worker instala e assume sem recarregar (a página já veio do servidor).
  let tinhaControlador = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    if (!tinhaControlador) { tinhaControlador = true; mostrarVersao(); return; }
    if (trocando || (!interagiu && !pendente() && !digitando())) recarregar();
    else mostrarAviso();
  });

  sw.register('/sw.js').then((r) => {
    registro = r;
    acompanhar(r);
    mostrarVersao();
    pronta();
    procurar();
  }).catch(() => { /* sem service worker (ex.: desenvolvimento): o app funciona igual */ });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { saiuEm = Date.now(); return; }
    if (saiuEm) voltou(Date.now() - saiuEm);
  });
  // Página restaurada da memória do navegador, sem carregar de novo.
  addEventListener('pageshow', (e) => { if (e.persisted) voltou(FORA_MINIMO); });
}
