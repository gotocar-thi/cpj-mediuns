// Conteúdo da aba Amaci, tirado da Apostila Orixás da Casa do Pai João (sem acréscimos).
// Fica no servidor: a API manda à pessoa só os orixás liberados para a turma dela.
// pontos: imagens em frontend/img/amaci/ (os desenhos da apostila); nota: texto da apostila sobre o ponto/firmeza.

export const AMACI = {
  oxala: {
    pontos: [{ img: 'oxala.png', legenda: 'Espaço mágico ou ponto riscado de Pai Oxalá' }],
    nota: 'Firmeza em casa: cruz riscada com pemba branca (fator estabilizador), uma vela em cada ponta e uma ao centro, com 4 cristais ou 4 ervas iguais nos polos.',
    velas: ['Brancas (também podem ser douradas e prateadas).', 'Ideal fazer feixe de velas: 5 pontos de velas.'],
    ervas: ['Boldo, hortelã, manjericão, alecrim, sálvia, rosas brancas, mão de Deus, cipó cruz, alfazema, anis estrelado, macela, camomila, malva, abre caminho.', 'Outra opção: banho de água de coco (purificadora).', 'Banho da cabeça aos pés.'],
    oferenda: {
      itens: ['Bebida (uma opção): água de coco, leite, água mineral ou vinho branco.', 'Frutas de miolo branco: uva verde, melão, coco verde, pera, fruta do conde, goiaba branca, em cesta de vime.', 'Pão francês (salgado, redondo).', 'Flores: rosas brancas e lírios brancos.', 'Ramos de trigo e farinha de trigo para rodear a oferenda.', 'Pemba branca (ralada ou sólida) e panos brancos quadrados.'],
      pratos: ['Canjica cozida na água, regada com mel na hora, em tigela ou prato branco.', 'Arroz cozido no leite com canela em pó, em tigela branca.', 'Acaçá: farinha de milho branca em bolinhos ou em triângulos na folha de bananeira.'],
      onde: ['Espaço aberto, onde se consegue ver o céu.', 'Melhor horário: 6h ou 12h.'],
    },
  },
  loguna: {
    pontos: [{ img: 'loguna.png', legenda: 'Espaço mágico ou ponto riscado de Mãe Logunã' }],
    nota: 'Firmeza em casa: ponto riscado com pemba branca e 5 velas: 4 azul-escuro nas extremidades e 1 branca ao centro. Se possível, em ambiente aberto ("no tempo").',
    velas: ['Azul-escuro (ou azul-petróleo), brancas e pretas.', 'Circular a oferenda com 3 círculos de velas: branco, azul-escuro e preto.'],
    ervas: ['Ervas ativas: dê preferência ao banho de manhã.', 'Eucalipto, folhas de bambu, picão branco, hortelã, catinga de mulata, carqueja, macela ou flores do campo coloridas.', 'Outra opção: água da chuva fina ou orvalho da madrugada (sereno).'],
    oferenda: {
      itens: ['Panos brancos ou azul-escuro.', 'Frutas: maracujá, uva verde, carambola.', 'Bebida: licor de anis ou licor de menta, em taça de vidro.', 'Pedras: cristal ou quartzo fumê (não tão escuro), sodalita e prata.', 'Flores: rosa branca ou champanhe, lírios brancos e flores do campo.', 'Ferramentas: ampulheta, espada.'],
      pratos: ['Arroz doce cozido na água, regado com mel ao chegar no local, em tigela ou prato branco.'],
      onde: ['Campo aberto, sem cobertura; campina.', 'Horário: todo o dia.'],
    },
  },
  oxum: {
    pontos: [{ img: 'oxum.png', legenda: 'Espaço mágico ou ponto riscado de Mãe Oxum' }],
    velas: ['Rosas, amarelas ou douradas: pode intercalar ou usar uma cor só.', 'Rosa: amor, afeto, harmonia. Amarelo (ou dourado): prosperidade, minerais, ouro. Azul: pelo sincretismo com Nossa Senhora Aparecida.'],
    ervas: ['Axé harmonizador e tranquilizador (ideal à noite): oriri (erva de jabuti), erva doce, alfazema blue, camomila, manjericão, jasmim, macela, melissa, rosas cor-de-rosa.', 'Axé prosperador (na segunda, de manhã): pitanga, calêndula, hibisco, rosas amarelas, louro, folha da fortuna.', 'Pétalas de 7 rosas de cores diferentes: força regeneradora.', 'Água de cachoeira, só ou com ervas. Banho com bastante água.'],
    oferenda: {
      itens: ['Bebida: champanhe rosé, em taça.', 'Frutas sementeiras: pêssego, maçã, melancia, uva rosada, romã, cereja, framboesa, goiaba, figo, melão, em cestas de vime.', 'Pedras: quartzo rosa, pirita, esmeralda, citrino, fluorita.', 'Flores: rosas, principalmente cor-de-rosa, champanhe e amarelas, em vasos.', 'Panos e fitas amarelo e rosa.', 'Espelho de Mãe Oxum (abebê).'],
      pratos: ['Apetê: 8 bananas-da-terra em rodelas cozidas com 2 xícaras de água e 1 de açúcar, com canela em pó; em tigela de barro, porcelana ou alguidar.', 'Omolocum: feijão fradinho refogado no dendê com cebola e camarão seco, com no mínimo 4 ovos cozidos por cima, em tigela de porcelana.'],
      onde: ['Cachoeira de queda forte.'],
    },
  },
  oxumare: {
    pontos: [{ img: 'oxumare.png', legenda: 'Ondas de Pai Oxumaré: diluidora e renovadora' }],
    nota: 'Firmeza em casa: estrela de sete pontas riscada com pemba branca, preenchida com as ondas diluidoras e renovadoras. Ao centro, vela azul cobalto, azul-clara, branca ou sete linhas; nos polos, uma vela de cada cor (amarela, vermelha, verde, azul-escuro, violeta, branca, rosa).',
    velas: ['Coloridas: qualquer cor serve para Pai Oxumaré, inclusive as cores unidas.', 'A que mais reverbera no mistério dele: azul cobalto (verde-azulada) ou a vela de 7 cores.'],
    ervas: ['Axé diluidor: confrei, cavalinha, guiné, folha de manga, folha de café, espinheira santa.', 'Axé renovador e alegria: todas as flores coloridas, sálvia, pitanga, picão branco, pata de vaca, anis estrelado, semente de guaraná.', 'Melhor banho: pétalas de 7 flores coloridas.'],
    oferenda: {
      itens: ['Panos, velas e pembas coloridos.', 'Frutas diversas e coloridas: maçã, banana, pera, melão, abacate, em cesta de vime.', 'Fitas coloridas para rodear a oferenda e amarrar as velas.', 'Bebida: vinho licoroso, em taça pequena.', 'Pedras: 7 tipos de cristais coloridos ou fluorita multicolorida.'],
      pratos: ['Arroz doce cozido com leite, em prato ou tigela colorida.', 'Cobra de Pai Oxumaré: purê de batata doce (ou baroa/mandioquinha) com mel, moldado em cobra, olhos de feijão fradinho e língua de tomate, sobre cama de flores coloridas ou alface, em prato de barro.'],
      onde: ['Perto de cachoeiras com queda, onde o arco-íris aparece.'],
    },
  },
  oxossi: {
    pontos: [
      { img: 'oxossi-1.png', legenda: 'Triângulo de forças com velas verdes' },
      { img: 'oxossi-2.png', legenda: 'Estrela da Vida de Pai Oxóssi' },
      { img: 'oxossi-3.png', legenda: 'Ponto riscado com setas e flechas' },
      { img: 'oxossi-4.png', legenda: 'Ponto riscado sétuplo com flechas' },
    ],
    nota: 'A apostila traz estes 4 espaços mágicos como opções de ponto riscado para as firmezas.',
    velas: ['Verdes, naturalmente.', 'Pelo axé prosperador, unir vela dourada para firmá-lo não é errado.'],
    ervas: ['Samambaia, jurema preta, guiné, arruda, arnica, quebra-demanda, erva de bicho, espada de Santa Bárbara, espada de São Jorge, abre caminho, alecrim, folha de café, cipó caboclo, levante.', 'Comigo-ninguém-pode só em vaso, no ambiente: não fazer banho (é tóxica e queima).'],
    oferenda: {
      itens: ['Bebida: cerveja branca ou vinho tinto, em copo de vidro, com charutos acesos apoiados nos copos.', 'Frutas: no mínimo 7 tipos (laranja, banana, mamão, abacate, maçã, pera, mexerica, carambola), em cesta ou sobre folhagens.', 'Folhagens e raízes: samambaia, folha de bananeira, cipó, raízes secas.', 'Grãos, sementes e fubá para circundar a oferenda; milho cozido; coco seco fechado.', 'Flores coloridas e girassóis.', 'Cristais: quartzo verde, amazonita, malaquita, esmeralda.', 'Ferramentas: ofá, facão, flecha.'],
      pratos: ['Moranga cozida, recheada (frutas picadas com açúcar cristal, canjica amarela ou carne seca) ou só a moranga.', 'Feijão preto ou fradinho selado no dendê, em alguidar, com lascas de coco seco.', 'Canjica branca ou amarela cozida, em alguidar.', 'Abacate aberto com o nome escrito dentro, amarrado com fita verde em 7 voltas.'],
      onde: ['Mata fechada: quanto menos mexida pelo homem, melhor.', 'Oferendas no período diurno.'],
    },
  },
  oba: {
    pontos: [{ img: 'oba.png', legenda: 'Ponto riscado de Mãe Obá com velas palito' }],
    nota: 'Firmezas em casa: vela de 7 dias com alguidar de terra fértil em cima do ponto riscado, ou o ponto riscado com velas palito.',
    velas: ['Magenta, vermelho ou cor de terra.'],
    ervas: ['Hortelã, jurema preta (casca), peregum roxo, alfavaca, folha de pitanga, folha de laranjeira, manjericão roxo, alecrim.'],
    oferenda: {
      itens: ['Elemento principal: terra fértil.', 'Bebida: vinho tinto ou água de coco verde.', 'Frutas avermelhadas e roxas: uva rosada, ameixa, romã, manga, maçã, tangerina.', 'Panos e fitas magenta.', 'Quartinha de barro com terra (ou de cobre).', 'Pedras: crisocola, âmbar, madeira petrificada, unakita, turmalina rosa, turmalina verde, rubi zoisita, rodocrosita.', 'Flores vermelhas ou magenta.', 'Ferramenta: espada e escudo de cobre.'],
      pratos: ['Batata doce roxa em rodelas, com casca, regada com mel.', 'Beterraba em rodelas, sem casca, regada com mel.', 'Bolas de feijão vermelho amassado, regadas com dendê, em múltiplos de 3.', 'Rabanete em rodelas regado com dendê.', 'Servir em alguidar ou prato de barro.'],
      onde: ['Em terra fértil, na mata, clareira na mata, perto de cachoeira.'],
    },
  },
  ogum: {
    pontos: [],
    nota: 'A apostila não traz o desenho do ponto riscado de Pai Ogum. Firmeza em casa: velas azuis e/ou vermelhas nos polos da estrela de 5 pontas e uma azul ao centro.',
    velas: ['Azul ou vermelha.'],
    ervas: ['Guiné, folha de pitanga, folha de manga, eucalipto, espada de São Jorge, anis estrelado, hortelã, bardana, abre caminho, levante.', 'Não esquecer de ativar o banho: verbalizar o pedido.'],
    oferenda: {
      itens: ['Panos e fitas azul ou vermelho.', 'Ferramentas: espada (metálica ou vegetal), ferradura, escudo, trilho de trem, bigorna, pregos e parafusos de ferro.', 'Pedras: cianita azul, quartzo azul, sodalita, lápis-lazúli, granada, hematita.', 'Frutas: caqui, fruta do conde (pinha), figo.', 'Flores: cravo vermelho. Espadas de São Jorge: no mínimo 7.', 'Bebida: cerveja branca (não deixar a latinha). Canela em pau.'],
      pratos: ['Feijoada completa, com pouco líquido, em alguidar ou prato de barro.', 'Farofa de Pai Ogum: feijão fradinho refogado com dendê e cebola, com farinha de milho, em alguidar.', 'Paliteiro: cará ou inhame com casca, cozido ou assado, coberto de palitos, regado com mel ou dendê.'],
      onde: ['Sem conhecer a hierarquia do Pai Ogum que te acompanha: campo aberto (pasto, campina, sem cobertura).', 'Ogum Beira Mar e Sete Ondas: praia. Rompe Mato: mata. Matinata: campo aberto.'],
    },
  },
  iansa: {
    pontos: [{ img: 'iansa.png', legenda: 'Espiral de Iansã' }],
    nota: 'Firmeza em casa: espaço mágico riscado com pemba branca (espiral ou estrela), uma vela amarela e/ou vermelha em cada ponta com coroa de abacaxi (ou espadas de Santa Bárbara) e uma vela ao centro.',
    velas: ['Amarelas ou vermelhas.', 'Vermelho: força, conquista, guerra. Amarelo: cor do raio, vibrante.'],
    ervas: ['Espada de Santa Bárbara, folha de pitanga, calêndula, hibisco, rosa vermelha, rosa amarela, catinga de mulata, canela em pau (alergênica), espinheira santa, artemísia, arnica, flores de tons vermelhos.', 'Água de chuva forte (ou garoa forte).', 'Verbalizar: pedir ânimo, direção e movimento, e que recolha espíritos trevosos e sofredores.'],
    oferenda: {
      itens: ['Panos amarelos ou vermelhos e fitas amarelas para circular a oferenda.', 'Tacho de cobre.', 'Pedras: citrino, quartzo com enxofre, ágata de fogo, calcita amarela ou laranja.', 'Frutas cítricas: maracujá, laranja, mexerica, abacaxi.', 'Bebida: champanhe rosé, em taça de vidro ou de cobre.', 'Adaga, chifre de búfalo, leque amarelo ou vermelho, espada de cobre ou espadas de Santa Bárbara.', 'Quartinha amarela ou de cobre, com alça, com água de chuva. Incensos.'],
      pratos: ['Acarajé: no mínimo 9 bolinhos fritos no dendê, em cesta de vime coberta com pano amarelo ou vermelho.', '9 maçãs cozidas em água, regadas com mel, em alguidar.', '9 pepinos em rodelas, em espiral no prato, regados com dendê.'],
      onde: ['Perto de um bambuzal, sem cobertura.'],
    },
  },
  xango: {
    pontos: [{ img: 'xango.png', legenda: 'Espaço mágico ou ponto riscado de Pai Xangô' }],
    nota: 'Firmeza em casa: estrela de 6 pontas (onda equilibradora), prato branco com azeite doce ou dendê ao centro com vela vermelha de 7 dias, e velas palito vermelhas nos polos. De preferência a cada 15 dias.',
    velas: ['Vermelhas.', 'Cores de Pai Xangô: vermelho e marrom.'],
    ervas: ['Banho de manhã, com ervas potentes, de fatores animadores.', 'Erva de São João, hibisco, para-raio, calêndula, jurema preta, canela em pau.'],
    oferenda: {
      itens: ['Caldeirão de ferro (ou panela de ferro) ao centro, para ativar o elemento fogo.', 'No mínimo 6 focos de fogo (alguidares envernizados, feixes, caldeirões); acender primeiro o do centro, com cuidado.', 'Panos e fitas vermelho e marrom.', 'Pedras: jaspe vermelho, olho de boi, olho de tigre, jaspe sanguíneo, olho de falcão, ágata de fogo, quartzo vermelho.', 'Frutas: caqui, laranja, mexerica, manga vermelha, em cesta de vime.', 'Flor: cravo vermelho. Bebida: cerveja preta, em copo de vidro (sem deixar a latinha).', 'Dois machados para consagrar.'],
      pratos: ['Sempre em gamela, e a comida chega quente ao local.', 'Rabada ou peito de boi selado no dendê com cebola e 12 quiabos em rodelas, enfeitado com quiabos crus de pontas para cima.', 'Rabada ou peito de boi com polenta sem sal, enfeitado com quiabos crus.', 'Amalá: 12 quiabos crus em rodelas bem finas com meio copo de açúcar cristal e um pouco de água, batido na mão, na gamela.'],
      onde: ['Pedreira seca (sem contato com água) ou pedra mesa.', 'Melhor horário: meio-dia (até 15h, no máximo).'],
    },
  },
  oroina: {
    pontos: [{ img: 'oroina.png', legenda: 'Espaço mágico de Mãe Oroiná' }],
    nota: 'Firmeza em casa: riscar o espaço mágico e firmar velas laranjas e vermelhas; ao centro, vela ou caldeirão (opcional: 7 pimentas dedo-de-moça dentro). Pode ser feito com velas de 7 dias.',
    velas: ['Laranjas e vermelhas.', 'Cores da oferenda: vermelho e marrom.'],
    ervas: ['Tomar pela manhã: dupla função, consumidor/purificador e energizador.', 'Folha ou talo de cenoura (pode ser único), calêndula, folha de laranjeira (e de cítricas: pitanga, mexerica), hibisco, carqueja, macela, canela em pau, rosa vermelha.'],
    oferenda: {
      itens: ['Caldeirão de ferro (ou panela de ferro) ao centro e no mínimo 6 focos de fogo; acender primeiro o do centro, com cuidado.', 'Panos e fitas vermelho e marrom.', 'Pedras: jaspe vermelho, olho de boi, olho de tigre, jaspe sanguíneo, olho de falcão, ágata de fogo, quartzo vermelho.', 'Frutas: caqui, laranja, mexerica, manga vermelha, em cesta de vime.', 'Flor: cravo vermelho. Bebida: cerveja preta, em copo de vidro.'],
      pratos: ['Moranga cozida recheada com carne bovina em pedaços (ou língua) selada com tomate, coentro e dendê.', 'Moranga cozida com laranja, mexerica e maçã picadas, açúcar cristal e canela.', 'Doce de laranja ou mexerica, em prato ou gamela pequena.'],
      onde: ['Pedreira seca.', 'Melhor horário: meio-dia (até 15h, no máximo).'],
    },
  },
  obaluaye: {
    pontos: [{ img: 'obaluaye.png', legenda: 'Espaço mágico ou ponto riscado de Pai Obaluayê' }],
    nota: 'Firmeza em casa: cruz riscada com pemba branca, preenchida com pipoca (estourada com água e areia), com copos de água e vela violeta nos polos. Ou alguidar com terra úmida e 4 velas por cima.',
    velas: ['Violeta (cor da transmutação), branca, ou preta e branca.'],
    ervas: ['Folha de beterraba (casos de doença), sálvia, capim-limão, capim-cidreira, pinhão roxo (forte), sete sangrias, cipó cruz, macassá, alcachofra, manjericão roxo, folha de rabanete.', 'Banho de pipoca: estourada no fogão, com água e areia.'],
    oferenda: {
      itens: ['Panos e fitas violeta, branco, ou preto e branco.', 'Flores: crisântemos violeta ou brancos.', 'Pedras: ametista, cristal translúcido, ônix com cristal leitoso, cacoxenita, shungita.', 'Bebida: água ou vinho tinto licoroso.', 'Cruz de madeira, pano da costa e pipoca.'],
      pratos: ['Costela de porco selada no dendê com cebola roxa (pode ir com feijão branco), em alguidar.', 'Pipoca estourada com água e areia da praia.', 'Pipoca com dendê e sal grosso (casos de doenças, magias negativas).', 'No mínimo 4 beterrabas ou batatas doces roxas em rodelas, cozidas, em prato branco, regadas com mel.'],
      onde: ['Onde há divisa de planos: areia e mar, beira de rio, porta de terreiro, cruzeiro do cemitério.'],
    },
  },
  nana: {
    pontos: [{ img: 'nana.png', legenda: 'Espaço mágico ou ponto riscado de Mãe Nanã' }],
    nota: 'Firmeza em casa: prato com terra fértil preta no centro do ponto riscado, com água até virar lama, e 4 velas lilás nas extremidades. Pode incluir pedras de ametista.',
    velas: ['Lilás.'],
    ervas: ['Banho tranquilizador: tanchagem, pinhão roxo, hortelã, cipó cruz, flores de crisântemo, picão branco, sálvia, jurema.'],
    oferenda: {
      itens: ['Panos e fitas lilás; cama da oferenda com pano lilás ou florido.', 'Flores brancas e violetas.', 'Pedras: ametista, cacoxenita.', 'Bebida: licor de menta (mais indicado) ou vinho licoroso rosé.', 'Frutas: figo, ameixa roxa.'],
      pratos: ['Feijão preto com toucinho e linguiça calabresa, refogado no dendê com cebola roxa, em alguidar.', 'Beterraba em fatias grossas, cozida, com mel.'],
      onde: ['Perto de lago ou lagoa.'],
    },
  },
  iemanja: {
    pontos: [],
    nota: 'A apostila não traz o desenho do ponto riscado de Mãe Iemanjá. Na oferenda: levar instrumento para traçar o espaço mágico na areia e preencher com areia da praia ou rosas brancas.',
    velas: ['Azul-clara e branca. Também se usa a cor prata.'],
    ervas: ['Alfazema blue, anis estrelado, rosas brancas, camomila, alecrim, crisântemo branco, erva de bicho, sálvia, capim-cidreira, malva, manjericão.', 'Banho harmonizador e tranquilizador, para ser feito à noite.'],
    oferenda: {
      itens: ['Panos e fitas azul-claro e branco (ou prata).', 'Flores: rosas brancas, palmas brancas, lírios brancos.', 'Frutas sementeiras: carambola, uva verde, pera, melão, goiaba branca, melancia.', 'Bebida: champanhe branca ou vinho de uva verde.', 'Minerais: madrepérola, água-marinha, amazonita, calcita azul, apatita.', 'Quartinha, louças brancas, perfumes (jasmim, macela, capim-limão, lavanda, verbena), alfazema líquida, pente, espelho, estrelas e conchas do mar.', 'Todos os elementos devem ser recolhidos da praia ao término (após 30 minutos).'],
      pratos: ['Peixe de água salgada assado (sugestão: tainha), sem as vísceras e com escamas e barbatanas, em travessa de porcelana branca com alface ou rosas brancas.', 'Arroz com frutos do mar (marisco, camarão com cabeça e peixe firme), em travessa branca.', 'Peixe sem espinho (cação, badejo, meca) cozido com tomate, cebola branca e leite de coco.', 'Manjar com leite de coco, regado com mel.'],
      onde: ['De frente para o mar (nunca de costas), de roupa branca, pedindo licença aos guardiões do local.', 'Melhor horário: 6h, ou 21h na lua cheia.'],
    },
  },
  omolu: {
    pontos: [{ img: 'omolu.png', legenda: 'Espaço mágico ou ponto riscado de Pai Omolu' }],
    velas: ['Roxo ou preto, branco ou preto, branco e vermelho.'],
    ervas: ['Ervas de axé forte (não existe erva branda para Pai Omolu).', 'Manjericão roxo, zimbro, pinhão roxo, picão preto, dandá, casca de ipê roxo, folha de café, casca de jurema preta.'],
    oferenda: {
      itens: ['Panos e fitas: roxo ou preto, branco ou preto, branco e vermelho.', 'Frutas: ameixa preta, uva preta, jabuticaba, figo, coco seco.', 'Cristais: shungita, muanita, turmalina, ônix, ágata negra, mica preta, cristal turmalinado.', 'Terra seca: areia da praia seca.', 'Bebida: água ou vinho licoroso tinto.', 'Flores: crisântemos roxos ou violeta.'],
      pratos: ['Costela de porco selada no dendê com cebola roxa, em alguidar.', 'Beterraba em fatias grossas, cozida, regada com mel.', 'Coco seco em fatias regado com mel.', 'Pipoca estourada com dendê, em alguidar.'],
      onde: ['Cemitério (atrás do cruzeiro) ou terra seca, estéril: desertos, restingas, areia seca do mar (voltado para o continente).', 'Para apresentação ao Orixá: lua crescente ou cheia.'],
    },
  },
};
