# Como funciona o RAG da Rede Escudo

**Em uma frase:** antes de responder, o servidor procura na base de conhecimento os trechos mais parecidos com a pergunta e entrega à IA. Assim a resposta vem do que a equipe escreveu, e não só da memória do modelo (que pode errar telefone, prazo ou passo a passo).

## O caminho de uma mensagem no chat
1. A pessoa escreve.
2. **Regra fixa de risco** (falou em se machucar): responde a mensagem fixa com 188/190 e para aqui. Sem busca e sem IA.
3. **Pedido de denúncia** ("quero denunciar agora"): abre o formulário. Sem busca e sem IA.
4. **Busca na base** (no servidor): por palavras (BM25) e, se estiver ligada, por significado (embeddings no Ollama local). Os resultados são combinados (RRF).
5. Os trechos achados entram no prompt da IA, com a ordem de não inventar telefones, prazos, leis ou sites.
6. A IA responde. Se nenhuma IA estiver disponível, a base responde sozinha **só quando a busca tem certeza**; senão, segue o roteiro de demonstração.
7. A tela mostra "Baseado em: …" quando a busca teve certeza do trecho.

## Arquivos
| Arquivo | Para que serve |
|---|---|
| `conhecimento.md` | A base. É aqui que a equipe escreve e corrige. |
| `public/plataformas.js` | Ajudas por plataforma (Discord, Instagram...). O formulário e o RAG usam o mesmo texto. |
| `public/ajuda.js` | Explicações simples para qualquer idade ("O que é um ID?", "Como tiro um print?"). O botão "?" do formulário e a IA usam o mesmo texto. Para uma explicação não entrar na base da IA, coloque `rag: false` nela. |
| `rag.js` | A busca (palavras, significado, junção e resposta sem IA). |
| `server.js` | Liga tudo ao chat. |
| `conhecimento.vetores.json` | Criado sozinho: guarda os "números" de cada trecho (um banco vetorial simples). Pode apagar; ponha no `.gitignore`. |

## Como editar a base
- Cada bloco começa com `## Título`. A linha `palavras:` é opcional: coloque jeitos de falar e gírias que as pessoas usam.
- Escreva curto, claro e acolhedor. Depois de salvar, **reinicie o servidor** (Ctrl+C e `node server.js`).
- Telefones, prazos e nomes de ferramentas mudam: reconfira de vez em quando.

## Busca por significado (opcional, recomendada)
1. `ollama pull embeddinggemma` (modelo pequeno, cerca de 600 MB).
2. Reinicie o servidor. O log deve mostrar `Busca por significado: LIGADA`.
3. Sem o modelo, nada quebra: a busca por palavras continua sozinha e o log explica o que falta.

## Conferir o que a busca acha (área do analista)
Abra `http://localhost:3000/api/admin/rag?q=perdi meu código secreto` (usuário `analista` e a senha do `.env`).
- `metodo`: `palavras`, `significado` ou `palavras+significado`.
- `cobertura`: parte das palavras da pergunta que o trecho contém. `cosseno`: parecença de sentido (0 a 1).
- `seguro`: `true` quando dá para citar o trecho como fonte (e responder sem IA).
- Sem `?q=`, mostra o estado (quantos trechos, se o significado está ligado) e a lista de títulos.

## Variáveis do `.env` (todas opcionais)
| Variável | Padrão | O que faz |
|---|---|---|
| `RAG` | `sim` | `nao` desliga tudo e o chat volta a ser como antes. |
| `OLLAMA_EMBED` | `embeddinggemma` | Modelo de significado. `nao` desliga só essa parte. |
| `RAG_COSSENO_MINIMO` | `0.5` | Parecença mínima de significado para um trecho entrar. Ajuste olhando o `cosseno` no `/api/admin/rag`. |
| `RAG_COBERTURA_MINIMA` | `0.4` | Parte mínima das palavras da pergunta que o trecho precisa conter. |

## Segurança e privacidade
- A IA **nunca** acessa o banco nem os arquivos: ela só recebe os trechos que o servidor escolheu.
- A pergunta só vai para os embeddings no **Ollama local**. O que foi lido de prints **não** entra na busca.
- Risco de vida nunca passa pela busca nem pela IA.
- "Baseado em" só aparece quando a busca tem certeza, para não dizer que a resposta veio de um trecho que não tem a ver.
- Se a busca por significado falhar, ela descansa 1 minuto e o chat segue só com palavras.

## Limites (para falar com honestidade na apresentação)
- A base é pequena (cerca de 30 trechos): cobre o essencial. Fora dela, a IA orienta de forma geral e indica 190, 100 ou 188.
- Os testes de busca foram escritos junto com a base, então o resultado deles é otimista. Teste com perguntas reais e acrescente `palavras:` onde errar.
- O limiar de `cosseno` foi escolhido sem o modelo real: calibre no seu computador.
