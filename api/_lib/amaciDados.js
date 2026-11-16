// Conteúdo da aba Amaci: texto LITERAL da Apostila Orixás da Casa do Pai João (sem resumir, sem deduzir, sem acrescentar).
// Só se juntam as palavras quebradas por hífen no fim da linha do PDF. Fica no servidor: a API manda à pessoa só os orixás liberados.
// Cada orixá tem os mesmos blocos, nesta ordem: ervas ("Ervas de ..."), velas (o que a apostila diz das velas),
// pontos (desenhos de "Espaço Mágico ou Ponto Riscado", em frontend/img/amaci/, com o título que a apostila dá; legenda vazia = sem título)
// e fatores ("Fatores de ..."; Mãe Oroiná não tem a seção, então vem da Tabela Geral dos Orixás).
// Cada item é um texto ou [título, [subitens]].

export const AMACI = {
  oxala: {
    ervas: [
      'Boldo, hortelã, manjericão, alecrim, sálvia, rosas brancas, mão de Deus, cipó cruz, alfazema, aniz estrelado, macela, camomila, malva, abre caminho.',
      'Outra opção: banho de água de coco - purificadora.',
      'Banho da cabeça aos pés.',
    ],
    velas: [
      'Velas Brancas (também pode ser usado velas douradas e pratas). Ideal fazer feixe de velas (Fazer 5 pontos de velas).',
    ],
    pontos: [
      { img: 'oxala.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Oxalá' },
      { img: 'oxala-2.png', legenda: 'Cristalino e Ígneo' },
      { img: 'oxala-3.png', legenda: 'Vegetal e Ígneo' },
      { img: 'oxala-4.png', legenda: 'Espaço Mágico Equilibrador' },
      { img: 'oxala-5.png', legenda: 'Espaço Mágico Equilibrador' },
    ],
    fatores: [
      'Congregador (principal) – espaço de terreiro é a “prova viva” deste fator.',
      'Acalmador.',
      'Passificador.',
      'Tranquilizador.',
      'Harmonizador.',
      'Curadora.',
    ],
  },
  loguna: {
    ervas: [
      'Ervas ativas, dê preferência para tomar o banho na parte da manhã.',
      'Opções: eucalipto, folhas de bambu, picão branco, hortelã, catinga de mulata, carqueja, macela ou flores do campo coloridas.',
      'Outra opção: banho de água da chuva fina ou banho do orvalho da madrugada (sereno).',
    ],
    velas: [
      'Velas: azul escuro (ou azul petróleo), brancas e preto.',
      'Circular sua oferenda com 3 círculos de velas: branco, azul escuro e preto',
    ],
    pontos: [
      { img: 'loguna.png', legenda: 'Espaço Mágico ou Ponto Riscado de Mãe Logunã' },
      { img: 'loguna-2.png', legenda: '' },
    ],
    fatores: [
      'Reguladora.',
      'Retornadora: que faz retornar.',
      'Viradora: que faz virar.',
      'Absorvedora.',
      'Revertedora: que faz reverter.',
    ],
  },
  oxum: {
    ervas: [
      'Oriri (ou erva de Jabuti - formato de coração, onda vibratória de Mãe Oxum), erva doce, alfazema blue, camomila, manjericão, jasmin, macela, melissa, rosas cor de rosa - axé harmonizadora, axé de tranquilidade, agregador.',
      'Pitanga, calêndula, hibisco, rosas amarelas, louro, folha da fortuna - axé prosperador e energizador.',
      'Banho com pétalas de 7 rosas de cores diferentes - força regeneradora, força da juventude - indicado desde crianças até mais velhos.',
      'Banho de água de cachoeira de queda somente ou somado a ervas.',
      'Ervas de axé harmonizador, tranquilizador ideal a noite',
      'Ervas de axé prosperadora: na segunda, de manhã',
      'Banho com bastante água, não é “banho de canequinha”',
      'Se possível até pegar as ervas e passar em sua coroa',
      'Indicação de local para ervas frescas: Mercadão da Lapa',
    ],
    velas: [
      'Velas: rosas, amarelas ou douradas. Pode intercalar ou utilizar somente uma cor.',
      'Pode ser feita uma opção de cor de vela OU utilizar em combinação as três ou duas cores escolhidas.',
      'Mãe Oxum é uma Mãe Orixá que facilmente você vai encontrar muito desse questionamento pois ela varia em suas cores, podendo ser: rosa, amarela, dourada ou azul.',
      'ROSA - campo de atuação mais intenso será do amor infinito, do afeto, da harmonia.',
      'AMARELO (ou dourado) - campo da prosperidade, dos minerais, do ouro, agregadora.',
      'AZUL - devido ao grande sincretismo que existe entre Mãe Oxum e Nossa Senhora Aparecida',
    ],
    pontos: [
      { img: 'oxum.png', legenda: 'Espaço Mágico ou Ponto Riscado de Mãe Oxum' },
    ],
    fatores: [
      'Abrandador: tornar-se branco, amolecer.',
      'Agregador: reunir, juntar.',
      'Aprofundador: que faz aprofundar.',
      'Concebedor: que faz gerar e conceber.',
      'Encantador: seduzir, cativar.',
      'Multiplicador.',
      'Unidor.',
      'Harmonizador.',
      'Sensibilizador: tornar sensível, comover.',
    ],
  },
  oxumare: {
    ervas: [
      'Confrei, cavalinha, guiné, folha de manga, folha de café, espinheira santa – axé diluidor.',
      'Todas as flores coloridas, sálvia, pitanga, picão branco, pata de vaca, anis estrelado, semente de guaraná – axé renovador, alegria.',
      'Melhor banho: pétalas de 7 flores coloridas – axé diluidor, axé renovador.',
    ],
    velas: [
      'Velas coloridas.',
      'Senhor do mistério das 7 Cores: qualquer cor utilizada por Pai Oxumaré está correto ou até mesmo as cores unidas, tanto em velas, como guias, como na sua oferenda e firmeza.',
      'Todas as cores são pertencentes a Pai Oxumaré, porém a que mais reverbera em seu mistério é o azul cobalto (vela verde azulada), ou também a vela de 7 cores.',
    ],
    pontos: [
      { img: 'oxumare.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Oxumaré' },
      { img: 'oxumare-2.png', legenda: '' },
    ],
    fatores: [
      'Renovador: renovando o que já não precisa mais ser nosso.',
      'Regenerador: trazendo leveza.',
      'Diluidor: diluindo o que precisa ser diluído.',
      'Alegrador: trazendo alegria.',
      'Coloridor: trazendo cor.',
    ],
  },
  oxossi: {
    ervas: [
      'Samambaia, jurema preta, guiné, arruda, arnica, quebra demanda, erva de bicho, espada de Santa Bárbara, espada de São Jorge, abre caminho, alecrim, folha de café, cipó caboclo, levante',
      'Vaso de Comigo-ninguém-pode em ambiente consagrado para Pai Oxóssi – NÃO FAZER BANHO POR SER TÓXICA E GERAR QUEIMADURAS.',
    ],
    velas: [
      'Pai Oxóssi - naturalmente utiliza vela verde. Mas Pai Oxóssi também carrega o seu axé prosperador, e se você unir a vela dourada para firma-lo, não é errado.',
    ],
    pontos: [
      { img: 'oxossi-1.png', legenda: '1) Triângulo de Forças com velas verdes' },
      { img: 'oxossi-2.png', legenda: '2) Estrela da Vida de Pai Oxóssi' },
      { img: 'oxossi-3.png', legenda: '3) Ponto Riscado com setas e flechas' },
      { img: 'oxossi-4.png', legenda: '4) Ponto Riscado Sétuplo com flechas' },
    ],
    fatores: [
      'Expansor',
      'Racionalizador',
      'Provedor',
      'Prosperador',
      'Curador',
    ],
  },
  oba: {
    ervas: [
      'Hortelã, jurema preta (casca), peregum roxo, alfavaca, folha de pitanga, folha de laranjeira, manjericão roxo, alecrim.',
    ],
    velas: [
      'Vela: Magenta, vermelho ou cor de terra.',
    ],
    pontos: [
      { img: 'oba.png', legenda: 'Ponto riscado de Mãe Obá + velas palito.' },
    ],
    fatores: [
      'Fixadora – firmar, cravar, estabelecer, pregar algo',
      'Racionalizadora – tornar racional',
      'Concentradora',
      'Condensadora – deixar mais intenso',
      'Enraizadora – aterrar, enraizar algo',
    ],
  },
  ogum: {
    ervas: [
      'Guiné, folha de pitanga, folha de manga, eucalipto, espada de São Jorge, anis estrelado, hortelã, bardana, abre caminho, levante',
      'Não esquecer de ativar o banho, verbalizar',
      'Exemplo: “Pai Ogum, que o Senhor possa mediante este banho ordenar meus caminhos, potencializar minha força, possa me fortalecer para eu vencer as batalhas de minha vida, que estas ervas possam me dar potência para eu seguir adiante em meus objetivos.”',
    ],
    velas: [
      'Velas, panos, fitas: cor azul ou vermelha.',
    ],
    pontos: [
      { img: 'ogum.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Ogum' },
    ],
    fatores: [
      'Ordenador (principal)',
      'Controlador',
      'Potencializador',
      'Fortalecedor',
    ],
  },
  iansa: {
    ervas: [
      'Espada de Santa Bárbara, folha de pitanga, calêndula, hibisco, rosa vermelha, rosa amarela, catinga de mulata, canela em pau (alergênica), espinheira santa, artemísia, arnica, flores de tons vermelhos.',
      'água de chuva forte (ou garoa forte).',
      'Verbalizar: peça a Mãe Iansã que ela traga ânimo, vibração, direcionar, movimentar sua vida, recolha espíritos trevosos e sofredores que possam estar próximo de você.',
    ],
    velas: [
      ['Velas e Panos amarelos ou vermelhos', [
        'Vermelho: símbolo de força, conquista, guerra',
        'Amarelo: cor do raio, vibrante',
      ]],
    ],
    pontos: [
      { img: 'iansa.png', legenda: 'Espiral de Iansã' },
    ],
    fatores: [
      'Movimentadora',
      'Direcionadora',
    ],
  },
  xango: {
    ervas: [
      'Banho para ser feito de manhã - Ervas potentes, de fatores animadores',
      'Opções: Erva de São João, hibisco, para raio, calêndula, jurema preta, canela em pau',
    ],
    velas: [
      'Ao centro do prato, vela vermelha de 7 dias',
      'Nos polos da estrela, velas palito vermelha',
      'Cores: vermelho e marrom',
    ],
    pontos: [
      { img: 'xango.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Xangô' },
      { img: 'xango-2.png', legenda: '' },
    ],
    fatores: [
      'Equilibrador',
      'Energizador',
      'Fortalecedor',
      'Ânimador',
      'Purificador',
    ],
  },
  oroina: {
    ervas: [
      'Dupla função: consumidor/purificador e energizador.',
      'Tomar pela manha.',
      'Opções: folha ou talo de cenoura (pode ser único) – energeticamente cansado, espiritualmente cansado, quer se recompor (final de ano, depois de uma gripe/doença.)',
      'Calêndula, folha de laranjeira (e folhas de frutas cítricas – pitanga, mexerica), hibisco, carqueja, macela, canela em pau, rosa vermelha.',
    ],
    velas: [
      'ao centro: vela laranja ou vermelha',
      'Riscar o espaço mágico abaixo, e firmar velas laranjas e vermelha',
      'Cores: vermelho e marrom',
    ],
    pontos: [
      { img: 'oroina-1.jpg', legenda: '1ª possibilidade' },
      { img: 'oroina.png', legenda: '2ª possibilidade' },
    ],
    fatores: [
      'Consumidor, purificador',
    ],
  },
  obaluaye: {
    ervas: [
      'Opções: Folha de beterraba (casos de doenças), sálvia, capim limão, capim cidreira, pinhão roxo (forte), sete sangrias, cipó cruz, macassa, alcachofra, manjericão roxo, folha de rabanete.',
      'Banho de pipoca – estourada no fogão, com água e areia.',
    ],
    velas: [
      'Panos, velas, fitas: cores violeta (cor da transmutação), branca ou preta e branca',
    ],
    pontos: [
      { img: 'obaluaye.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Obaluayê' },
      { img: 'obaluaye-2.png', legenda: '2ª Opção - Alguidar com TERRA úmida e 4 velas por cima' },
    ],
    fatores: [
      'Evolucionista',
      'Transmutador',
      'Curador',
      'Transformador',
    ],
  },
  nana: {
    ervas: [
      ['Ervas Banho Tranquilizador', [
        'Tanchagem',
        'Pinhão roxo',
        'Hortelã',
        'Cipó cruz',
        'Flores de crisântemo',
        'Picão Branco',
        'Sálvia',
        'Jurema',
      ]],
    ],
    velas: [
      'Panos, velas, fitas: cor lilás',
    ],
    pontos: [
      { img: 'nana.png', legenda: 'Espaço Mágico ou Ponto Riscado de Mãe Nanã' },
      { img: 'nana-2.png', legenda: '2ª Opção' },
    ],
    fatores: [
      'Fator decantador e transformador, ajuda a decantar nossos males e tudo o mais que atrasa nossa caminhada.',
    ],
  },
  iemanja: {
    ervas: [
      'Alfazema blue, anis estrelado (a própria estrela geradora da Mãe), rosas brancas, camomila, alecrim, crisântemo branco, erva de bicho, sálvia, capim cidreira, malva, manjericão',
      'Banho harmonizador, tranquilizador, para ser feito de noite',
      ['Foco para estes banhos', [
        'Campo de criatividade: trabalha com arte, com designer, publicitário, marqueteiro',
        'Geracionista: mães gravidas, lavar a barriga durante e no final da gestação, banho para bebês pequenos, pessoas que queiram engravidar, queiram gerar algo',
      ]],
    ],
    velas: [
      'Velas, panos e fitas: azul clara e branco. Também é utilizado a cor prata',
    ],
    pontos: [
      { img: 'iemanja.png', legenda: 'Espaço Mágico ou Ponto Riscado de Mãe Iemanjá' },
    ],
    fatores: [
      'Gerador: nascer algo novo',
      'Criativo: criar algo que ainda não',
    ],
  },
  omolu: {
    ervas: [
      'São ervas de axé forte, brutas, não existe erva branda para Pai Omulu',
      'Manjericão roxo, zimbro, pinhão roxo, picão preto, dandá, casca de ipê roxo, folha de café, casca de jurema preta',
    ],
    velas: [
      'Velas, panos, fitas: roxo ou preto, branco ou preto, branco e vermelho',
    ],
    pontos: [
      { img: 'omolu.png', legenda: 'Espaço Mágico ou Ponto Riscado de Pai Omolu' },
    ],
    fatores: [
      'Paralisador',
      'Ceifador: cortar, segar',
      'Esgotador: secar',
      'Curador',
    ],
  },
};
