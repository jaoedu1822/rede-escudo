// Ajuda por plataforma: como achar o usuário, o link e o ID, e o que guardar como prova.
// Fica num arquivo só porque dois lugares usam: o formulário (dicas dos campos) e a base de conhecimento do chat (RAG).
// Para mudar um texto ou acrescentar uma plataforma, é só editar aqui. Os nomes dos menus mudam de tempos em tempos,
// por isso os textos avisam "pode aparecer com outro nome".

export const NOTA_GERAL = "Salve os prints antes de bloquear a pessoa ou sair do grupo. Depois disso, às vezes não dá mais para ver as mensagens.";

export const PLATAFORMAS = {
  Discord: {
    pistas: {
      id_usuario: "Ex.: 123456789012345678",
      link: "Ex.: https://discord.gg/...",
      servidor: "Nome do servidor e do canal",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como encontro o ID de um usuário no Discord?",
      passos: [
        "Abra Configurações do usuário > Avançado e ligue o Modo de desenvolvedor.",
        "Volte à conversa e clique com o botão direito no nome da pessoa (no celular, toque e segure).",
        "Escolha “Copiar ID do usuário” e cole aqui.",
        "Para o servidor, faça igual no ícone dele e escolha “Copiar ID do servidor”, ou cole o link de convite.",
      ],
      nota: "O ID é um número que não muda, mesmo se a pessoa trocar de nome. Anote também o nome do canal onde aconteceu.",
    },
  },

  Instagram: {
    pistas: {
      id_usuario: "Ex.: @nome_do_perfil",
      link: "Ex.: https://instagram.com/nome_do_perfil",
      servidor: "Ex.: nome do grupo de mensagens, se houver",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como pego o usuário e o link de um perfil no Instagram?",
      passos: [
        "Abra o perfil da pessoa. O nome que começa com @ é o usuário.",
        "Toque nos três pontinhos no topo do perfil e escolha “Copiar link do perfil” (pode aparecer como “Copiar URL do perfil”).",
        "Cole o link aqui. Ele é mais seguro que o @, porque a pessoa pode trocar o @ depois.",
        "Tire um print do perfil mostrando o @, a foto e os seguidores, e outro das mensagens, com data e hora.",
      ],
      nota: "Se o menu do seu celular for diferente, o print do perfil inteiro já ajuda bastante.",
    },
  },

  WhatsApp: {
    pistas: {
      id_usuario: "Ex.: +55 11 91234-5678 (com DDD)",
      link: "Ex.: https://chat.whatsapp.com/...",
      servidor: "Nome exato do grupo",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como identifico uma pessoa ou um grupo no WhatsApp?",
      passos: [
        "Para uma pessoa: abra a conversa e toque no nome dela, no topo. O número, com DDD, aparece nos dados do contato.",
        "Para um grupo: toque no nome do grupo e anote o nome exato e quem criou, se aparecer.",
        "Se você tiver o link de convite do grupo (começa com chat.whatsapp.com), cole aqui.",
        "Para guardar a conversa, procure “Exportar conversa” no menu dela (o caminho muda um pouco no iPhone). Prints com data e hora também servem.",
      ],
      nota: "Você não precisa falar com a pessoa de novo. Só guarde o que já existe.",
    },
  },

  TikTok: {
    pistas: {
      id_usuario: "Ex.: @nome_do_perfil",
      link: "Ex.: https://www.tiktok.com/@nome/video/...",
      servidor: "Ex.: nome da live ou do grupo",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como pego o usuário e o link no TikTok?",
      passos: [
        "Abra o perfil da pessoa. O nome com @ é o usuário.",
        "Toque na seta de compartilhar (ou nos três pontinhos) e escolha “Copiar link”.",
        "Para um vídeo ou uma live, abra o vídeo, toque em Compartilhar e depois em “Copiar link”.",
        "Tire um print mostrando o @, o conteúdo e a data, antes que o vídeo seja apagado.",
      ],
      nota: "Vídeos e lives podem sumir rápido. Copie o link e tire o print logo.",
    },
  },

  Telegram: {
    pistas: {
      id_usuario: "Ex.: @nome_de_usuario",
      link: "Ex.: https://t.me/nome_do_grupo",
      servidor: "Nome do grupo ou do canal",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como identifico uma pessoa, um grupo ou um canal no Telegram?",
      passos: [
        "Toque no nome da pessoa, no topo da conversa. Se ela tiver nome de usuário, ele aparece com @ e dá para copiar.",
        "Para um grupo ou canal público, toque no nome dele e copie o link (começa com t.me/).",
        "Para uma mensagem específica de um grupo ou canal público, toque e segure nela e escolha “Copiar link da mensagem”.",
        "Se a pessoa não tem @, anote o nome exato e tire um print do perfil. Não use bots de terceiros para descobrir dados: isso pode expor você.",
      ],
      nota: "Grupos privados não têm link de mensagem. Nesse caso, os prints com data e hora são a melhor prova.",
    },
  },

  Roblox: {
    pistas: {
      id_usuario: "Ex.: 1234567890 (número do perfil) ou o nome de usuário",
      link: "Ex.: https://www.roblox.com/users/1234567890/profile",
      servidor: "Nome do jogo e do servidor",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "Como acho o ID de um jogador no Roblox?",
      passos: [
        "Abra o perfil do jogador pelo site. Olhe o endereço da página: roblox.com/users/NÚMERO/profile.",
        "O NÚMERO no meio do endereço é o ID do jogador. Copie o link inteiro e cole aqui.",
        "Anote o nome de usuário (o que começa com @) e o nome de exibição, que pode ser diferente.",
        "Para o jogo, copie o link da página dele e anote o nome do servidor, se souber.",
      ],
      nota: "No celular, o aplicativo nem sempre mostra o endereço. Se for o caso, abra o perfil pelo navegador.",
    },
  },

  Outra: {
    pistas: {
      id_usuario: "Ex.: o @, o apelido ou o número exato",
      link: "Ex.: link do perfil, da conversa ou do grupo",
      servidor: "Nome do grupo, canal ou jogo",
      data_hora: "Ex.: 20/10/2026, por volta das 22h",
    },
    ajuda: {
      titulo: "O que eu posso anotar se não sei o ID?",
      passos: [
        "Anote o nome de usuário exatamente como aparece, com maiúsculas, números e símbolos.",
        "Copie o link do perfil, do grupo ou da conversa (em geral, no menu de compartilhar).",
        "Tire prints que mostrem o nome da pessoa e a data e a hora das mensagens.",
        "Anote o dia e o horário aproximado, mesmo sem ter certeza.",
      ],
      nota: "Qualquer informação que ajude a achar a pessoa é útil. Não precisa estar completa.",
    },
  },
};

export const NOMES_PLATAFORMAS = Object.keys(PLATAFORMAS);
