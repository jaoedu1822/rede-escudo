// Limites de prints e arquivos da denúncia, num lugar só. Para mudar um número, mude aqui.
//
// Quem lê este arquivo: o formulário (formulario.js e prints.js), a ajuda (ajuda.js) e, depois de rodar UMA vez
// "node aplicar-limites.js", o servidor (server.js). Se mudar PRINTS_POR_DENUNCIA, reinicie o servidor.
//
// Por que estes números?
//  - Os prints NÃO sobem para o servidor: o navegador só calcula o código (SHA-256) de cada um. Por isso o custo de
//    cada print é quase zero: 20 códigos pesam uns 3 KB (o servidor aceita até 200 KB por envio).
//  - 20 cobre uma conversa longa (vinte telas) e ainda é fácil de o analista conferir. Não passe de 100.
//  - 20 MB por arquivo cobre foto de celular, print de tela inteira e PDF. O arquivo é lido um por vez, então o
//    navegador não guarda 20 arquivos na memória ao mesmo tempo.

export const LIMITES = Object.freeze({
  /** Quantos prints/arquivos têm o código guardado numa denúncia (os da conversa e os do formulário, somados). */
  PRINTS_POR_DENUNCIA: 20,
  /** Tamanho máximo de cada arquivo escolhido no formulário, em megabytes. */
  MB_POR_ARQUIVO: 20,
  /** Quantas provas escritas (usuário, link, servidor, data e hora) cabem no formulário. */
  PROVAS_POR_DENUNCIA: 10,
});
