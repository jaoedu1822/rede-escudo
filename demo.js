// Modo demonstração: respostas pré-programadas, sem IA e sem custo.
// Com uma chave de API real no .env, o servidor deixa de usar este arquivo.

const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const tem = (texto, palavras) => palavras.some((p) => texto.includes(p));

// Detecção de risco. O texto já é comparado sem acento e em minúsculas.
// Nenhuma lista pega todas as frases: é por isso que existem a IA e o analista humano.
const RISCO_FRASES = [
  "me matar", "se matar", "suicid", "quero morrer", "queria morrer", "vou morrer",
  "tirar minha vida", "tirar a minha vida", "acabar com minha vida", "acabar com tudo",
  "nao quero mais viver", "nao aguento mais", "sumir pra sempre", "melhor sem mim",
  "me machucar", "me cortar", "me enforcar", "automutil", "overdose",
  "de morte", "te matar", "matar minha", "vao me matar",
];

const RISCO_PADROES = [
  /\bme\s+(jog|atir|lanc)\w*/, // "me jogar", "me atirar" (pode pegar frases inocentes: tudo bem, é o lado seguro)
  /\bpul\w*\s+(d|n)[aeo]s?\s+(\w+\s+){0,3}(ponte|predio|janela|penhasco|viaduto|laje|telhado|sacada)/,
  /\b(penhasco|ponte|viaduto|sacada|laje)\b.*\b(pular|jogar|me jogo|acabar)/,
  /\bvou\s+(tomar|engolir)\s+(todos\s+os\s+)?(remedios|comprimidos|pilulas)/,
];

const temRisco = (texto) => tem(texto, RISCO_FRASES) || RISCO_PADROES.some((r) => r.test(texto));

const AVISO = "[Modo demonstração: respostas automáticas pré-programadas, sem IA.]";

const MSG_RISCO =
  "Sinto muito que você esteja passando por isso. Sua segurança vem primeiro. " +
  "Se você está em perigo agora, ligue 190 (emergência). Se está com vontade de se machucar " +
  "ou muito mal, ligue 188 (CVV, apoio emocional) e procure um adulto de confiança perto de você. " +
  "Quando estiver mais seguro(a), eu continuo aqui para organizar o caso.";

const MSG_RISCO_CONTINUA =
  "Estou preocupada com você e não vou seguir com as perguntas agora. Sua vida importa mais do que qualquer denúncia. " +
  "Ligue 188 (CVV) ou 190 se estiver em perigo, e fale agora com um adulto de confiança que esteja perto. " +
  "Se puder, afaste-se de qualquer lugar ou objeto que possa te machucar. Quando estiver mais seguro(a), a gente volta ao caso.";

const ROTEIRO = [
  "Obrigada por contar isso. Você não tem culpa e não está sozinho(a). Antes de tudo: não pague nada, não confronte essas pessoas e não apague as conversas. Em que plataforma isso aconteceu (Discord, Instagram, WhatsApp...)?",
  "Entendi. Você sabe o nome ou o link do servidor ou grupo? No Discord, dá para copiar o link de convite.",
  "Certo. Quais usuários estão envolvidos? Se puder, anote o apelido e o ID de cada um (no Discord, ative o Modo Desenvolvedor em Configurações > Avançado e use \"Copiar ID\"). O ID não muda, mesmo que a pessoa troque de apelido.",
  "Você lembra as datas aproximadas e o que foi exigido ou ameaçado? Guarde prints das conversas e os links das mensagens, mas não envie fotos íntimas a ninguém.",
  "Já tenho o essencial. Agora você pode preencher o formulário de denúncia anônima (menu \"Fazer denúncia\"). A Rede Escudo organiza o caso e o encaminha às autoridades, mas não consigo prometer prazo nem resultado.",
];

const MSG_FINAL =
  "Se lembrar de mais algum detalhe, coloque no formulário de denúncia. Se algo piorar ou você se sentir em perigo, ligue 190 ou 188.";

export function responderDemo(historico) {
  const msgs = historico.filter((m) => m.role === "user");
  const n = msgs.length - 1; // quantas mensagens vieram antes desta
  const ultima = normalizar(msgs[n]?.content);
  const riscoAntes = msgs.slice(0, n).some((m) => temRisco(normalizar(m.content)));

  let resposta;
  if (riscoAntes) resposta = MSG_RISCO_CONTINUA;       // já houve risco: não volta ao roteiro
  else if (temRisco(ultima)) resposta = MSG_RISCO;
  else resposta = n < ROTEIRO.length ? ROTEIRO[n] : MSG_FINAL;

  return n === 0 ? AVISO + " " + resposta : resposta;
}

export function triagemSimples(relato) {
  const t = normalizar(relato);

  let categoria = "outro";
  if (tem(t, ["se matar", "se cortar", "automutil", "suicid"])) categoria = "incitacao_automutilacao";
  else if (tem(t, ["alicia", "pediu foto", "pediu nude", "pedindo foto", "pedindo nude", "encontrar pessoalmente"])) categoria = "aliciamento";
  else if (tem(t, ["vazar", "vazou", "vazaram", "divulg", "expor", "expos", "nudes", "fotos intimas"])) categoria = "divulgacao_de_imagens";
  else if (tem(t, ["pix", "pagar", "pague", "dinheiro", "extors", "chantag"])) categoria = "extorsao";
  else if (tem(t, ["ameac", "matar", "agredir", "bater em"])) categoria = "ameaca";
  else if (tem(t, ["golpe", "fraude", "link falso", "clonaram", "clonou", "hackearam"])) categoria = "golpe";

  let urgencia = "media";
  if (temRisco(t) || ["incitacao_automutilacao", "aliciamento"].includes(categoria)) urgencia = "critica";
  else if (["extorsao", "divulgacao_de_imagens", "ameaca"].includes(categoria)) urgencia = "alta";

  const resumo = "[Modo demonstração] " + String(relato ?? "").replace(/\s+/g, " ").slice(0, 160);
  return { categoria, urgencia, resumo };
}
export { MSG_RISCO };
export const detectaRisco = (texto) => temRisco(normalizar(texto));