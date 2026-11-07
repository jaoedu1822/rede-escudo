// Ajuda em linguagem simples, para qualquer idade.
// Dois lugares usam estes textos: o formulário de denúncia (ajuda ao lado de cada campo e a lista de dúvidas)
// e a base de conhecimento do chat (a IA também sabe responder "o que é um ID?"). Para mudar um texto, é só editar aqui.
//
// Cada item:
//   id        nome interno (não aparece para a pessoa)
//   campos    onde a ajuda aparece ao lado de um campo: relato, id_usuario, link, servidor, data_hora, prints.
//             "geral" = só na lista "Ainda tem dúvidas?", no fim do formulário.
//   pergunta  o texto do botão (e o título da dúvida)
//   resposta  parágrafos curtos, um por item da lista
//   palavras  jeitos de falar que ajudam o chat a achar este texto (a pessoa não vê)
//   rag       false = este texto NÃO entra na base da IA, porque o conhecimento.md já explica o assunto (evita fontes repetidas)

export const GLOSSARIO = [
  {
    id: "id",
    campos: ["id_usuario"],
    pergunta: "O que é um ID?",
    resposta: [
      "ID é como o número de identidade de uma conta na internet. Cada pessoa tem um, e ele não se repete.",
      "O nome de usuário pode ser trocado quando a pessoa quiser. O ID não muda. Por isso ele ajuda a achar a mesma pessoa, mesmo que ela troque de nome.",
      "No Discord, por exemplo, o ID é um número comprido, como 123456789012345678.",
      "Não achou o ID? Sem problema: o nome de usuário e um print do perfil já ajudam bastante.",
    ],
    palavras: "id, identificador, número da conta, número do usuário, o que significa id, o que é id, id de usuário",
  },
  {
    id: "usuario",
    campos: ["id_usuario"],
    pergunta: "O que é nome de usuário ou @?",
    resposta: [
      "É o nome que a pessoa usa na internet. Em muitos lugares ele começa com @, como @nome_da_pessoa.",
      "Ele pode ser diferente do nome que aparece no perfil. Copie exatamente como está escrito, com letras, números e símbolos.",
    ],
    palavras: "usuário, nome de usuário, arroba, @, apelido, nick, nickname, perfil, user",
  },
  {
    id: "link",
    campos: ["link"],
    pergunta: "O que é um link?",
    resposta: [
      "Link é o endereço de uma página, de um perfil, de um convite ou de uma mensagem. Em geral começa com https://.",
      "Dá para copiar e colar aqui. Procure o botão “Copiar link” ou “Compartilhar” no perfil, no grupo ou na mensagem.",
    ],
    palavras: "link, endereço, url, convite, copiar link, compartilhar, https, site",
  },
  {
    id: "servidor",
    campos: ["servidor"],
    pergunta: "O que é servidor, grupo ou canal?",
    resposta: [
      "É o lugar onde a conversa aconteceu. No Discord, o servidor é a comunidade e o canal é uma sala dentro dela. No WhatsApp e no Telegram, é o grupo.",
      "Em jogos, pode ser o nome do jogo e do servidor ou da partida. Escreva o nome do jeito que aparece.",
    ],
    palavras: "servidor, grupo, canal, sala, comunidade, chat, lobby, partida",
  },
  {
    id: "data",
    campos: ["data_hora"],
    pergunta: "Não sei a data nem a hora. E agora?",
    resposta: [
      "Não tem problema. Escreva o que você lembra, como “ontem à noite” ou “semana passada”.",
      "Se você tiver um print, a data e a hora costumam aparecer nele.",
    ],
    palavras: "data, hora, quando, horário, dia, não lembro, não sei quando",
  },
  {
    id: "print",
    campos: ["prints"],
    pergunta: "O que é um print e como eu tiro um?",
    resposta: [
      "Print (ou captura de tela) é uma foto do que aparece na tela, como uma conversa. Ele serve de prova.",
      "Celular Android: aperte juntos o botão de ligar e o de diminuir o volume.",
      "iPhone sem botão Home: aperte juntos o botão lateral e o de aumentar o volume. Com botão Home: o botão Home e o lateral.",
      "Windows: aperte a tecla Windows junto com PrtScn (em alguns notebooks, Fn + PrtScn). O print vai para a pasta Imagens, em Capturas de tela.",
      "Mac: aperte Command + Shift + 4 e escolha a área.",
      "Não corte nem edite o print: a tela inteira, com o nome e a data, vale mais como prova.",
    ],
    palavras: "print, prints, captura de tela, screenshot, tirar print, printar, foto da tela, como tirar print, como printar",
  },
  {
    id: "hash",
    campos: ["prints"],
    pergunta: "O que é o “código” (impressão digital) do print?",
    resposta: [
      "É uma sequência de letras e números criada a partir do print, como uma impressão digital. Dois prints iguais têm o mesmo código. Se alguém mudar o print, o código muda.",
      "Guardamos só esse código, nunca a imagem. Depois, ele ajuda a provar que o print que você entregar às autoridades é o mesmo de hoje, sem alterações.",
      "Se você não quiser que o código seja guardado, é só desmarcar a opção.",
    ],
    palavras: "hash, impressão digital, código do print, sha, sha256, verificação, integridade, prova de que não mudou",
  },
  {
    id: "prova",
    campos: ["geral"],
    pergunta: "O que é uma prova?",
    resposta: [
      "É qualquer coisa que mostre o que aconteceu: prints, links, nomes de usuário, datas. Você não precisa ter tudo.",
      "Quanto mais informação, mais fácil é para a equipe ajudar. Mas dá para enviar a denúncia só com o relato.",
    ],
    palavras: "prova, provas, evidência, evidências, o que é prova",
  },
  {
    id: "relato",
    campos: ["relato"],
    pergunta: "O que escrevo em “O que aconteceu?”",
    resposta: [
      "Conte do seu jeito, como se estivesse explicando para um amigo: o que aconteceu, quando começou e o que a pessoa pediu ou ameaçou.",
      "Exemplo: “Um grupo no Discord disse que vai espalhar minhas fotos se eu não pagar 200 reais. Começou ontem à noite.”",
      "Não precisa escrever bonito nem perfeito. Se ficar difícil, escreva só o começo.",
    ],
    palavras: "relato, o que escrever, o que escrevo, exemplo de relato, não sei o que escrever",
  },
  {
    id: "anonimato",
    rag: false,
    campos: ["geral"],
    pergunta: "Minha denúncia é anônima?",
    resposta: [
      "Sim. Não pedimos nome, e-mail nem telefone, e não guardamos o seu IP (o “endereço” do seu aparelho na internet).",
      "Evite escrever no relato dados que identifiquem você, como nome completo, endereço ou telefone.",
    ],
    palavras: "anônima, anonimato, identidade, privacidade, ip, quem vai saber, vão saber quem sou",
  },
  {
    id: "codigo",
    rag: false,
    campos: ["geral"],
    pergunta: "O que são o protocolo e o código secreto?",
    resposta: [
      "Quando você envia a denúncia, aparecem dois dados: o protocolo (o número da denúncia) e o código secreto (a sua “senha”). Eles aparecem só uma vez.",
      "Com os dois você acompanha o andamento em “Acompanhar denúncia”. Anote em um lugar seguro: nem a equipe consegue recuperar o código.",
    ],
    palavras: "protocolo, código secreto, senha, acompanhar, andamento, anotar",
  },
  {
    id: "obrigatorio",
    campos: ["geral"],
    pergunta: "Preciso preencher tudo?",
    resposta: ["Não. Só o relato (“O que aconteceu?”) é obrigatório. O resto ajuda, mas pode ficar em branco."],
    palavras: "obrigatório, preencher tudo, campos, opcional, pular",
  },
  {
    id: "intima",
    rag: false,
    campos: ["prints", "geral"],
    pergunta: "Posso mandar fotos íntimas como prova?",
    resposta: [
      "Não. Nunca envie fotos ou vídeos íntimos, nem para a gente. Se alguém está te ameaçando com isso, conte o que aconteceu com palavras e guarde só os prints das ameaças.",
      "Existem ferramentas gratuitas para impedir que essas imagens se espalhem: Take It Down (para menores de 18 anos) e StopNCII (para adultos).",
    ],
    palavras: "foto íntima, nude, imagem íntima, mandar nude, prova íntima",
  },
  {
    id: "menor",
    rag: false,
    campos: ["geral"],
    pergunta: "Tenho menos de 18 anos. Posso denunciar?",
    resposta: [
      "Pode, sim. O que aconteceu não é culpa sua. Se puder, conte também para um adulto de confiança.",
      "Se contar em casa parecer difícil, procure o Conselho Tutelar ou ligue 100.",
    ],
    palavras: "menor de idade, adolescente, criança, tenho 14 anos, posso denunciar, pais",
  },
];

/** Entradas que aparecem ao lado de um campo do formulário. */
export const ajudaDoCampo = (campo) => GLOSSARIO.filter((e) => e.campos.includes(campo));
