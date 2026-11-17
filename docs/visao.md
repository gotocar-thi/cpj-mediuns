# Visão, intenção e roadmap

## O que é

PWA da **Casa do Pai João (CPJ)** para organizar a corrente e as giras:

- cadastro da corrente (médiuns, extras, passes, cambones, senhas, curimba), alunos e licenças;
- presença, entidade do dia, **sorteio de cambones e médiuns de passe** com rodízio, remanejamento de faltas, ajuste manual, publicação da escala e exportação para o **WhatsApp** (texto e imagem PNG);
- perfil de cada pessoa (informações, orixás, guias, guias de atendimento, afinidades);
- eventos da casa, oferendas, compra coletiva de ervas, histórico e estatísticas;
- venda de guias (aba Compras): o admin cadastra grupos e itens com foto, estoque e valor; a corrente pede e o admin fecha cada pedido numerado, marca ok e exporta;
- aulas de curimba (aba à parte): alunos da corrente ou de fora, aulas, presença e gráfico de presença;
- amaci de cada orixá (aba Amaci), com o conteúdo da apostila de orixás; o admin libera os orixás por turma de alunos;
- vídeos do YouTube das giras (aba Vídeos: o admin publica para toda a corrente ou deixa só para os admins), por mês e classificados por orixá/linha;
- álbum de fotos por gira/evento (aba Fotos): todos veem, quem entrou com senha envia; os arquivos ficam no Cloudflare R2 gratuito.

## Para quem

- **Michelle** (admin) monta a escala: presença, sorteio, ajustes, publicação, encerramento.
- **A corrente** entra pelo acesso `cpj` + nome e vê o resultado: a própria função na gira, a escala publicada, eventos, aniversariantes; declara ausência, preenche o perfil, pede ervas e participa das oferendas.
- **Root** cuida de usuários, perfis e correções de histórico.

## Intenção (o que guia as decisões)

- **A escala sai pronta para o WhatsApp.** O fim do ciclo é a mensagem/imagem no grupo da corrente.
- **Sorteio justo e explicável:** rodízio por recência e repetição, respeitando quem está apto em cada linha e as afinidades de cada pessoa.
- **A admin decide no fim:** o sorteio sugere; remanejar, ajuste manual e publicar ficam na mão dela. Nada aparece para a corrente antes de publicar.
- **Celular primeiro:** tudo pensado para 390 px, usado durante a semana e no dia da gira.
- **Custo zero e manutenção mínima:** Vercel Hobby + Neon gratuito, sem framework, sem bundler, sem dependências npm.

## Roadmap

### Em aberto

- **Ação `reiniciar` sem botão.** O Reiniciar saiu do card da gira (refazer o sorteio do zero é pelo ↻); a ação continua em `api/giras/[data]` e nos testes. Remover?
- **Mudar a data da gira não foi testado no banco.** A migração v56 (`gira_mudar_data`) e os testes novos de `test/api.test.js` não rodaram (sem Postgres local).
- **Gestão de Conduta e Risco não foi testada no banco nem na tela.** A tabela `condutas` e suas funções não rodaram no Postgres local; o teste novo em `test/api.test.js` roda no CI. Conferir o bloco no app publicado (corrente e root).
- **Aba Curimba não foi testada no banco.** A migração v57 e o teste de `test/api.test.js` não rodaram (sem Postgres local); conferir no app publicado.
- **Aba Fotos está desligada no código** (`FOTOS_ATIVA = false` em `shared/fotos.js`). Para ligar: criar o bucket no Cloudflare R2 e pôr as 4 variáveis `R2_*` na Vercel (ver `.env.example`) e trocar para `true`. A migração v59 não rodou no Postgres e o R2 de verdade não foi usado: os testes foram com banco e R2 falsos (a assinatura confere com os exemplos da AWS). O Guia da Corrente (PDF) ainda não fala da aba.
- **Preço estimado das ervas não foi testado no banco.** A migração v61 (`preco_estimado`, copiada uma vez do preço atual) não rodou no Postgres; a tela foi conferida com banco falso.
- **Alunos por turma nas oferendas não foi testado no banco.** A migração v62 (`aluno_no_grupo`) não rodou no Postgres; tela e validação conferidas com banco falso.
- **Foto da pessoa no Perfil não foi testada no banco.** A migração v63 (`pessoas_fotos`) não rodou no Postgres; tela e permissões conferidas com banco falso.
- **Trava da escala não foi testada no banco.** A migração v72 (`giras.travada`, `gira_travar`) não rodou no Postgres; tela e regras conferidas com banco falso, e o teste novo em `test/api.test.js` só roda no Linux.
- **Recado da gira não foi testado no banco.** A migração v73 (`giras.recado`, `gira_recado`) não rodou no Postgres; tela e regras conferidas com banco falso, e `test/api.test.js` só roda no Linux.
- **Anamnese não foi testada no banco.** As migrações v70 e v71 (perfil Admin perfil) (`anamnese_perguntas`, `anamnese_respostas`) não rodou no Postgres; tela e regras conferidas com banco falso, e o teste novo em `test/api.test.js` só roda no Linux. O compartilhar do arquivo (.txt) no WhatsApp não foi testado num celular.
- **Ausência antecipada não foi testada no banco.** A migração v69 (`ausencias_previas`) não rodou no Postgres; o fluxo foi conferido com banco falso e o teste novo em `test/api.test.js` só roda no Linux.
- **"Exibir no resumo" das oferendas não foi testado no banco.** A migração v68 (`no_resumo`, `oferenda_resumo` e `oferendas_estado` refeita) não rodou no Postgres.
- **Renomear turma dos alunos não foi testado no banco.** A migração v67 (`turma_aluno_renomear`) não rodou no Postgres.
- **Oferenda que segue o cadastro não foi testada no banco.** A migração v66 (`oferendas_sincronizar`, chamada a cada leitura das oferendas) não rodou no Postgres; o teste novo em `test/api.test.js` só roda no Linux.
- **Orações não foram testadas no banco.** As migrações v64 (`oracoes`, apagadas depois de 7 dias) e v65 (reação 🕯️, `oracoes_reacoes`) não rodaram no Postgres; tela e permissões conferidas com banco falso.
- **Guia da Corrente (PDF) desatualizado:** ainda fala de "Sua presença no ano" (saiu da aba Gira) e não fala das Orações.
- **Aba Vídeos não foi testada no banco.** A migração v58 não rodou (sem Postgres local); a tela foi conferida com uma API falsa. Conferir no app publicado.
- **Afinidade de passe do At. Extra** só existe na aba Pessoas (não no Perfil dele) e não entra na Sugestão Mi/Mãe Vê.
- **Aba Compras (pedidos de guias) não foi testada no banco.** A migração v103 (tabelas `guias_*`, perfis com a aba nova, `inicio_dados` refeita) e o teste novo de `test/api.test.js` só rodam no CI; a tela foi conferida com uma API falsa (sem Postgres local). A foto do item não foi testada num celular.
- **Unidade do item das oferendas não foi testada no banco.** A migração v104 (`unidade` em `oferenda_itens` e `iemanja_itens`, funções de item e de estado refeitas) e o teste novo só rodam no CI.
- **Quantidade quebrada (v105) e troca de pessoas da Iemanjá não foram testadas no banco.** A migração muda o tipo da quantidade dos itens e doações para numeric; o teste novo só roda no CI.
- **Orações de 4 dias e transporte (v106) não foram testados no banco.** A migração e os testes novos só rodam no CI.
- **Aba Amaci não foi testada no banco.** A migração v108 (`amaci_*`, perfis com a aba nova, `inicio_dados` refeita) e o teste novo de `test/api.test.js` só rodam no CI; a tela foi conferida com dados falsos. O Guia da Corrente e o do Administrador (PDF) ainda não falam da aba.
- **Pix do ASAAS nunca rodou contra o ASAAS de verdade.** Os testes usam uma API falsa; falta testar no sandbox (gerar o Pix, pagar pelo painel do sandbox, ver o webhook chegar). Para ligar: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `ASAAS_API_URL` na Vercel (sandbox em Preview/Development, produção só em Production); no ASAAS, o webhook com a URL `https://cpj-mediuns.vercel.app/api/oferendas?webhook=asaas`, o mesmo token e os eventos de cobrança; reativar a fila; ligar **Pix visível nas Compras** na aba ASAAS. Os Guias em PDF ainda não falam do Pix nem da aba ASAAS.
- **Painel da Transparência (v128) não foi testado no banco nem contra o ASAAS de verdade.** A lógica do saldo e a leitura das cobranças foram testadas no Node com banco e ASAAS falsos. Conferir no app publicado: se os filtros `dueDate[ge]`/`paymentDate[ge]` do ASAAS trazem as cobranças certas e se a descrição das doações por Pix é mesmo "Cobrança gerada automaticamente a partir de Pix recebido".
- **Celular único e criar senha pelo login (v127) não foram testados no banco.** Os gatilhos `pessoas_celular_unico`/`alunos_celular_unico` e o novo `login_candidatos` não rodaram no Postgres; conferir no app publicado: limpar a senha de alguém, entrar pelo e-mail e pelo celular sem senha e criar. Celulares repetidos de antes da regra não foram procurados (não há acesso ao banco de produção).
- **UP CPJ com CPF e limite por IP (v126) não foram testados no banco.** `aluno_transferir_cambone` (agora recebe o id da pessoa e o CPF já cifrado) e `consulta_contar` não rodaram no Postgres; a recifra do CPF foi testada só no Node.
- **Ex-alunos (v125) não foram testados no banco.** `aluno_excluir` passou a guardar o cadastro, `aluno_reativar`, `aluno_apagar` e `apagar_excluidos` (só apaga aluno marcado em `apagado_em`) não rodaram no Postgres; o bloco foi conferido só com dados falsos. O `select apagar_excluidos()` solto no meio da lista (limpeza única antiga) saiu da lista para não apagar ex-alunos a cada migração.
- **Login por e-mail/celular, 3 tentativas e Criar cadastro não foram testados no banco.** A migração v124 (`login_candidatos`, `login_falha` com 3 erros, `aluno_autocadastro`) não rodou no Postgres; as telas foram conferidas só no visual (390 px). Conferir no app publicado: entrar por e-mail e por celular, errar 3 vezes, criar cadastro.
- **Redefinir senha por e-mail.** O Esqueci a senha só manda falar com a administração. Para enviar o link: escolher o provedor (Resend, com domínio próprio, ou Brevo, sem domínio e com risco de spam) e pôr a chave na Vercel. SMS grátis não existe.
- **Login só por e-mail/celular.** A palavra-passe (`cpj`, `alunos`, `curimba` + nome) continua liberada; desligar quando todos tiverem senha.
- **Testes no Windows.** `npm test` depende de Linux (`runuser`) e de Postgres local; na pasta atual não roda.
- O doc `claude/regras-sort-mediuns.md` do Project é antigo (out/2026); [regras.md](regras.md) é a referência atual.

### Próximos

_(a definir)_

## Histórico

O que mudou e quando está no `git log`.
