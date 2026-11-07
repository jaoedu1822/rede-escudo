// Reconhece quando a pessoa pede para fazer uma denúncia ("quero fazer uma denúncia AGORA").
//
// É uma regra FIXA (sem IA), como a regra do 190/188: assim funciona sempre, até sem internet,
// sem o Ollama e na hora da apresentação. O servidor só usa isto DEPOIS de checar o risco de vida.
// Perguntas sobre o processo ("o que acontece se eu denunciar?") NÃO abrem o formulário: vão para a IA.

export const MSG_ABRIR_DENUNCIA =
  "Claro, vou abrir o formulário aqui mesmo. Preencha o que souber: **só o relato é obrigatório** e você pode enviar mesmo sem todas as provas. Se mudar de ideia, é só cancelar.";

// minúsculas e sem acentos, para "denúncia" e "denuncia" valerem igual
const limpo = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const NEGACAO = /\b(nao|n|jamais|nunca)\s+(quero|vou|preciso|pretendo|consigo|posso|tenho como|desejo)\b.{0,20}\bdenunci/;
const E_PERGUNTA = /\b(saber|entender|duvida|perguntar|pergunta|adianta|funciona|acontece|serve|vale a pena|medo|riscos?)\b/;
const SOZINHA = /^\W*(denunciar|denuncia|fazer denuncia|fazer uma denuncia|abrir denuncia|nova denuncia)\W*$/;
const DESEJO = /\b(quero|queria|quer|vou|vamos|preciso|precisamos|gostaria|desejo|pretendo|bora|posso|da pra|como faco pra|como faco para|como eu faco pra|como eu faco para)\b.{0,30}\b(denunciar|denuncia|registrar (uma |a )?(denuncia|ocorrencia|queixa))/;
const ABRIR = /\b(abrir|abre|abra|mostrar|mostra|mostre)\b.{0,25}\b(formulario|denuncia)/;

export function querDenunciar(texto) {
  const t = limpo(texto);
  if (!t || t.length > 300) return false;
  if (NEGACAO.test(t)) return false;
  if (SOZINHA.test(t)) return true;
  if (E_PERGUNTA.test(t)) return false;
  return DESEJO.test(t) || ABRIR.test(t);
}