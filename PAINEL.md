# Painel do analista

A página onde quem analisa as denúncias vê **o que ler primeiro**.

## Como abrir

1. Na pasta do projeto, rode `node verificar.js`. Tem que terminar com "Tudo certo".
2. Ligue o MySQL no XAMPP e rode `node server.js`. No terminal tem que aparecer `Fila de prioridade e anti-spam: LIGADOS`.
3. No navegador, abra `http://localhost:3000/painel.html`
4. Usuário: `analista`. Senha: a que está em `ADMIN_PASS` no arquivo `.env`.

## O que você vê

- **Quatro quadros no topo:** abertas na fila, críticas, sem resposta há mais de 24 h e na quarentena.
- **Fila principal:** as denúncias abertas, da mais importante para a menos importante. O número grande (0 a 100) é a prioridade; a cor da borda mostra a faixa (vermelho = crítica, laranja = alta, amarelo = média, azul = baixa).
- **Quarentena:** denúncias que parecem spam, trote ou robô. **Nada é apagado.** Cada uma mostra "Por que está aqui".
- **Filtros:** status (Abertas, Todas, Recebidas...), ordem e busca por protocolo, plataforma ou palavra do resumo.
- A página **se atualiza sozinha a cada 30 segundos**. Denúncia nova aparece com a marca "Nova", um aviso na tela e um número no título da aba.
- **Como a fila funciona:** o botão no topo explica a prioridade, a quarentena e os códigos dos prints.

## O que você pode fazer em cada denúncia

Clique nela para abrir. Dentro você vê o resumo da IA, o relato completo, as provas informadas (com botão **Copiar**), os códigos SHA-256 dos prints e o motivo da posição na fila. E pode:

- **Mudar o status:** recebida, em análise, encaminhada, encerrada.
- **Mandar para a quarentena** (pede confirmação) ou **Liberar para a fila principal**.
- **Abrir o relatório** para encaminhar a denúncia.

## Para a apresentação (uns 2 minutos)

1. No site, envie uma denúncia de verdade (por exemplo, um golpe do falso suporte pedindo Pix).
2. No painel, ela aparece na fila (se o painel já estava aberto, em até 30 s, com a marca "Nova").
3. Envie outra com o relato `teste teste teste teste`. Ela vai para a aba **Quarentena**. Mostre o "Por que está aqui".
4. Abra essa denúncia e clique em **Liberar**. Ela volta para a fila principal.
5. Abra a primeira, mude o status para **Em análise** e mostre o **relatório**.

## Se der problema

| O que aparece | O que fazer |
|---|---|
| "A senha não foi aceita" | Aperte F5 e entre de novo. Confira `ADMIN_PASS` no `.env`. |
| "Não consegui carregar as denúncias" | O servidor ou o MySQL está desligado. Ligue o MySQL no XAMPP e reinicie o servidor. |
| "modo antigo" (no terminal: `Fila de prioridade: desligada`) | O banco ainda não tem as colunas da fila. O servidor tenta criá-las ao ligar; se o MySQL estava desligado, ligue-o e reinicie o servidor (Ctrl+C e `node server.js`). A quarentena só aparece depois disso. |
| Painel vazio | Ainda não chegou nenhuma denúncia. Envie uma pelo site. |

## Segurança (para explicar aos jurados)

- Só entra quem tem usuário e senha. A página e a área `/api/admin` pedem login.
- O que a vítima escreve é mostrado **sempre como texto**. Um relato com código malicioso não executa nada.
- Links das provas aparecem só como texto, para ninguém clicar sem querer num link perigoso.
- A IA só **sugere**. Quem muda status, quarentena e liberação é o analista.
- A prioridade é calculada pelo código, não pela IA. Risco de vida nunca fica abaixo de 90 e nunca vai para a quarentena.
