// Telas de entrada: login e instalação (primeiro acesso).

import { esc } from '../util.js';

const LOGO = `<div class="logo-terreiro"><img src="/img/terreiro.png" width="200" height="200" alt="Casa do Pai João · Terreiro de Umbanda"></div>`;

export function render(erro, email = '', candidatos = null) {
  if (candidatos) {
    return `${LOGO}<div class="card login">
      <h2>Quem é você?</h2>
      <p class="muted" style="margin:0;font-size:.92rem">Não encontrei exatamente esse nome. Toque no seu nome como está cadastrado na corrente:</p>
      <div class="candidatos">${candidatos.map((n) => `<button class="btn" data-soueu="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <button class="btn link" data-soueu="">Não sou nenhum destes · digitar de novo</button>
    </div>`;
  }
  return `${LOGO}<div class="card login">
    <h2>Entrar</h2>
    ${erro ? `<div class="erro" role="alert">${esc(erro)}</div>` : ''}
    <form id="f-login">
      <label class="field">E-mail, celular ou palavra-passe<input type="text" inputmode="email" id="l-email" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(email)}"></label>
      <label class="field"><span id="l-senha-rotulo">Senha</span><input type="password" id="l-senha" autocomplete="current-password"></label>
      <button class="btn primary" type="submit" id="l-btn">Entrar</button>
    </form>
    <p class="muted" style="margin:0;font-size:.85rem">Primeiro acesso ou senha apagada pela administração? Digite o e-mail ou o celular, deixe a senha em branco e toque em Entrar.</p>
    <button class="btn link" data-conta="esqueci">Esqueci a senha</button>
    <button class="btn" data-conta="cadastro">Criar cadastro</button>
  </div>`;
}

// Quem entrou com e-mail ou celular e ainda não tem senha: confirma com o outro contato do cadastro e cria a senha.
export function renderCriarSenha(erro, contato, confirmar) {
  const cel = confirmar === 'celular';
  return `${LOGO}<div class="card login">
    <h2>Crie a sua senha</h2>
    <p class="muted" style="margin:0;font-size:.92rem">Você ainda não tem senha. Para confirmar que é você, digite o seu <b>${cel ? 'celular' : 'e-mail'}</b> como está no cadastro.</p>
    ${erro ? `<div class="erro" role="alert">${esc(erro)}</div>` : ''}
    <form id="f-criarsenha" autocomplete="off">
      <label class="field">Entrando com<input type="text" value="${esc(contato)}" disabled></label>
      ${cel
        ? '<label class="field">Seu celular com DDD<input type="tel" id="cs-conf" data-mascara="tel" required inputmode="tel" autocomplete="tel-national" placeholder="(11) 91234-5678"></label>'
        : '<label class="field">Seu e-mail<input type="email" id="cs-conf" required maxlength="120" autocomplete="email" autocapitalize="none" spellcheck="false"></label>'}
      <label class="field">Nova senha<input type="password" id="cs-senha" required inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" autocomplete="new-password" placeholder="6 a 8 números"></label>
      <label class="field">Repita a senha<input type="password" id="cs-senha2" required inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" autocomplete="new-password"></label>
      <button class="btn primary" type="submit" id="cs-btn">Criar senha e entrar</button>
    </form>
    <button class="btn link" data-conta="voltarlogin">Voltar</button>
  </div>`;
}

// Sem envio de e-mail ou SMS por enquanto: quem esqueceu pede para a administração.
export function renderEsqueci() {
  return `${LOGO}<div class="card login">
    <h2>Esqueci a senha</h2>
    <p class="muted" style="margin:0;font-size:.92rem">Por enquanto, a senha é redefinida pela administração da casa. Fale com ela pelo WhatsApp; depois é só entrar e criar a senha nova.</p>
    <button class="btn link" data-conta="voltarlogin">Voltar</button>
  </div>`;
}

// Cadastro feito pela própria pessoa: entra como aluno sem turma (a administração põe no lugar certo depois).
export function renderCadastro(erro) {
  return `${LOGO}<div class="card login">
    <h2>Criar cadastro</h2>
    <p class="muted" style="margin:0;font-size:.92rem">Você entra como aluno. Depois a administração coloca você na turma ou na corrente.</p>
    ${erro ? `<div class="erro" role="alert">${esc(erro)}</div>` : ''}
    <form id="f-cadastro">
      <label class="field">Nome e sobrenome<input type="text" id="c-nome" required minlength="3" maxlength="80" autocomplete="name"></label>
      <label class="field">Celular com DDD<input type="tel" id="c-celular" data-mascara="tel" required inputmode="tel" autocomplete="tel-national" placeholder="(11) 91234-5678"></label>
      <label class="field">E-mail<input type="email" id="c-email" required maxlength="120" autocomplete="email" autocapitalize="none" spellcheck="false"></label>
      <label class="field">CPF<input type="text" id="c-cpf" required inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"></label>
      <label class="field">Senha<input type="password" id="c-senha" required inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" autocomplete="new-password" placeholder="6 a 8 números"></label>
      <label class="field">Repita a senha<input type="password" id="c-senha2" required inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" autocomplete="new-password"></label>
      <button class="btn primary" type="submit" id="c-btn">Criar cadastro e entrar</button>
    </form>
    <button class="btn link" data-conta="voltarlogin">Já tenho cadastro · voltar</button>
  </div>`;
}

// Acesso da corrente de quem criou senha: pede a senha (as antigas têm 4 a 8 números; as novas, 6 a 8).
export function renderPin(erro, nome) {
  return `${LOGO}<div class="card login">
    <h2>Olá, ${esc(nome)}!</h2>
    ${erro ? `<div class="erro" role="alert">${esc(erro)}</div>` : ''}
    <form id="f-pin" autocomplete="off">
      <label class="field">Sua senha<input type="password" id="l-pin" inputmode="numeric" pattern="[0-9]{4,8}" minlength="4" maxlength="8" autocomplete="current-password" required placeholder="Só números"></label>
      <button class="btn primary" type="submit" id="l-btn">Entrar</button>
    </form>
    <button class="btn link" data-conta="voltarlogin">Não sou eu · voltar</button>
  </div>`;
}

export function renderInstalacao(erro) {
  return `${LOGO}<div class="card login">
    <h2>Instalar o app</h2>
    <p class="muted" style="margin:0;font-size:.92rem">Primeiro acesso: crie o usuário admin da corrente. O código de instalação é o valor de <b>CODIGO_INSTALACAO</b> cadastrado na Vercel.</p>
    ${erro ? `<div class="erro" role="alert">${esc(erro)}</div>` : ''}
    <form id="f-instalar" autocomplete="off">
      <label class="field">Código de instalação<input type="password" id="i-codigo" required autocomplete="off"></label>
      <label class="field">Seu nome<input type="text" id="i-nome" required maxlength="80"></label>
      <label class="field">E-mail<input type="email" id="i-email" required autocomplete="username"></label>
      <label class="field">Senha (mínimo 8 caracteres)<input type="password" id="i-senha" required minlength="8" autocomplete="new-password"></label>
      <label class="field">Repita a senha<input type="password" id="i-senha2" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary" type="submit" id="i-btn">Criar admin e entrar</button>
    </form>
  </div>`;
}

// Com uma palavra-chave de grupo no primeiro campo, o segundo vira "Seu nome".
export function ajustarCampoSenha(ehCorrente, preservarValor = false) {
  const rot = document.getElementById('l-senha-rotulo');
  const inp = document.getElementById('l-senha');
  if (!rot || !inp) return;
  // No acesso da corrente o botão procura o nome na lista; com e-mail e senha, entra.
  const btn = document.getElementById('l-btn');
  if (btn && !btn.disabled) btn.textContent = ehCorrente ? 'Procurar usuário' : 'Entrar';
  if (ehCorrente && inp.type !== 'text') {
    const valor = inp.value;
    rot.textContent = 'Seu nome';
    inp.type = 'text';
    inp.required = true;
    inp.value = preservarValor ? valor : '';
    inp.autocomplete = 'name';
    inp.placeholder = 'Seu nome como está cadastrado na corrente';
  } else if (!ehCorrente && inp.type !== 'password') {
    const valor = inp.value;
    rot.textContent = 'Senha';
    inp.type = 'password';
    inp.required = false;
    inp.value = preservarValor ? valor : '';
    inp.autocomplete = 'current-password';
    inp.placeholder = '';
  }
}
