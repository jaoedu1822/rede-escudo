// RAG da Rede Escudo: antes de responder, o servidor BUSCA na base de conhecimento (conhecimento.md + plataformas.js + ajuda.js)
// os trechos mais parecidos com a pergunta e entrega à IA junto com ela. Assim a resposta vem do que a equipe escreveu,
// e não só da memória do modelo (que pode errar telefone, prazo ou passo a passo).
//
// A busca tem duas pernas:
//   1) PALAVRAS (BM25): funciona sempre, sem nada instalado, até sem internet e sem Ollama.
//   2) SIGNIFICADO (embeddings): opcional. Usa um modelo do Ollama (ollama pull embeddinggemma) que transforma texto em
//      números; textos com o mesmo sentido ficam "perto". Os números ficam num arquivo (um "banco vetorial" bem simples).
// Quando as duas existem, os resultados são combinados (RRF). Se a segunda falhar, a primeira continua sozinha.
//
// Sem dependências: só o Node.
import fs from "node:fs";
import crypto from "node:crypto";

// ---------- Texto: minúsculas, sem acentos, sem "de/da/o/a" e reduzido ao radical ----------
const sem = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const PARADAS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre ate que se e ou mas como quando onde qual quais quem
   eu tu ele ela vos eles elas me te lhe meu minha meus minhas teu tua seu sua seus suas isso isto aquilo esse essa esses essas este esta estes estas
   aquele aquela ao aos pra pro pros pras ja nao sim tambem so muito muita mais menos ser estar ter ha foi sao era vai vou ir fazer faco posso pode
   podem quero quer preciso precisa tem tenho tinha estou estao estava la aqui ali entao porque pois ai tipo coisa coisas algo alguem ninguem todo
   toda todos todas cada outro outra outros outras mesmo mesma depois antes agora hoje ontem favor ajuda ajudar
   oi ola obrigado obrigada valeu ok certo tudo bem bom boa dia tarde noite tchau conta`.split(/\s+/)
);

/** "ameaçados", "ameaçando" e "ameaça" viram a mesma coisa ("ameac"): bom o bastante para português e muito simples. */
function radical(p) {
  if (/^\d+$/.test(p)) return p;
  let w = p;
  if (w.length > 4 && w.endsWith("s")) w = w.slice(0, -1); // plural
  return w.length > 5 ? w.slice(0, 5) : w;
}

export function tokenizar(texto) {
  return (sem(texto).match(/[a-z0-9]+/g) ?? []).filter((p) => p.length >= 2 && !PARADAS.has(p)).map(radical);
}

const slug = (t) =>
  sem(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

// ---------- Base de conhecimento ----------
/** Lê o conhecimento.md: cada "## Título" é um bloco; a linha "palavras:" é opcional. */
export function lerBaseMarkdown(markdown, origem = "conhecimento.md") {
  const limpo = String(markdown ?? "").replace(/<!--[\s\S]*?-->/g, "");
  return limpo
    .split(/^##[ \t]+/m)
    .slice(1)
    .map((bloco) => {
      const [primeira, ...resto] = bloco.split("\n");
      let corpo = resto.join("\n").trim();
      let palavras = "";
      const m = corpo.match(/^palavras:[ \t]*(.*)(?:\n|$)/i);
      if (m) {
        palavras = m[1].trim();
        corpo = corpo.slice(m[0].length).trim();
      }
      const titulo = primeira.trim();
      return { id: slug(titulo), titulo, palavras, texto: corpo, origem };
    })
    .filter((c) => c.titulo && c.texto);
}

/** As ajudas por plataforma (as mesmas do formulário) viram blocos da base: uma fonte só, sem repetir texto. */
export function blocosDePlataformas(plataformas, notaGeral = "") {
  return Object.entries(plataformas).map(([nome, p]) => ({
    id: slug("plataforma " + nome),
    titulo: p.ajuda.titulo,
    palavras: `${nome}, id, usuário, link, perfil, como achar, como encontro, como pego, copiar, identificar, nome de usuário, ${Object.values(p.pistas).join(", ")}`,
    texto: `${p.ajuda.passos.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n${p.ajuda.nota}${notaGeral ? " " + notaGeral : ""}`,
    origem: "plataformas.js",
  }));
}

/** O glossário do formulário ("O que é um ID?", "Como tiro um print?") também é base: o chat explica igualzinho ao botão "?". */
export function blocosDeAjuda(glossario) {
  return (glossario ?? [])
    .filter((e) => e.rag !== false && Array.isArray(e.resposta) && e.resposta.length)
    .map((e) => ({
      id: slug("ajuda " + e.id),
      titulo: e.pergunta,
      palavras: e.palavras ?? "",
      texto: e.resposta.join("\n\n"),
      origem: "ajuda.js",
      indexarTexto: false,
    }));
}

export function carregarBase({ arquivo, plataformas, notaGeral, glossario }) {
  const md = arquivo && fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf8") : "";
  const blocos = [...lerBaseMarkdown(md), ...(plataformas ? blocosDePlataformas(plataformas, notaGeral) : []), ...blocosDeAjuda(glossario)];
  const vistos = new Set();
  return blocos.filter((b) => (vistos.has(b.id) ? false : vistos.add(b.id)));
}

// ---------- Perna 1: busca por palavras (BM25) ----------
const rep = (lista, n) => Array.from({ length: n }, () => lista).flat();

export function criarIndice(blocos) {
  const docs = blocos.map((b) => {
    // O título e as palavras-chave valem mais que o corpo do texto
    // Blocos de definição (indexarTexto: false) são achados só pela pergunta e pelas palavras-chave: o texto deles repete
    // palavras comuns ("denúncia", "prova", "aconteceu") e puxaria o bloco errado para perguntas sobre o problema da pessoa.
    const tokens = [...rep(tokenizar(b.titulo), 3), ...rep(tokenizar(b.palavras), 2), ...(b.indexarTexto === false ? [] : tokenizar(b.texto))];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { tf, tamanho: tokens.length };
  });
  const N = docs.length || 1;
  const media = docs.reduce((s, d) => s + d.tamanho, 0) / N || 1;
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  const K1 = 1.5, B = 0.75;

  return {
    /**
     * @returns {{ i: number, score: number, cobertura: number, casados: number, termos: number }[]}
     * cobertura = parte do "peso" das palavras que a base conhece que o bloco contém (0 a 1)
     * casados = quantas palavras diferentes da pergunta o bloco contém; termos = quantas a base conhece
     */
    buscar(consulta) {
      const termos = [...new Set(tokenizar(consulta))];
      const conhecidos = termos.filter((t) => df.has(t));
      if (!conhecidos.length) return [];
      const pesoTotal = conhecidos.reduce((s, t) => s + idf(t), 0);
      const saida = [];
      docs.forEach((d, i) => {
        let score = 0, casado = 0, casados = 0;
        for (const t of conhecidos) {
          const f = d.tf.get(t);
          if (!f) continue;
          const w = idf(t);
          score += w * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.tamanho) / media)));
          casado += w;
          casados++;
        }
        if (score > 0) saida.push({ i, score, cobertura: casado / pesoTotal, casados, termos: conhecidos.length, total: termos.length });
      });
      return saida.sort((a, b) => b.score - a.score);
    },
  };
}

// ---------- Perna 2: busca por significado (embeddings do Ollama) ----------
const normalizar = (v) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return Float32Array.from(v, (x) => x / n);
};
const produto = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// Cada modelo de embeddings pede um "prefixo" diferente para pergunta e para documento
function prefixos(modelo) {
  const m = String(modelo).toLowerCase();
  if (m.includes("embeddinggemma")) return { consulta: "task: search result | query: ", doc: (b) => `title: ${b.titulo} | text: ` };
  if (m.includes("nomic")) return { consulta: "search_query: ", doc: () => "search_document: " };
  return { consulta: "", doc: () => "" };
}

export function criarEmbedder({ url, modelo, arquivoCache, fetchImpl = fetch, tempoMs = 60_000, tempoPerguntaMs = 8_000 }) {
  const pref = prefixos(modelo);
  let blocos = [];
  let vetores = []; // um vetor por bloco, na mesma ordem
  let pronto = false;

  async function chamar(textos, limiteMs = tempoMs) {
    let r;
    try {
      r = await fetchImpl(`${url}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, input: textos }),
        signal: AbortSignal.timeout(limiteMs),
      });
    } catch (err) {
      throw new Error(err?.name === "TimeoutError" ? "o Ollama demorou demais para responder" : `não consegui falar com o Ollama em ${url}`);
    }
    if (!r.ok) throw new Error(`o Ollama respondeu ${r.status}. Rode: ollama pull ${modelo}`);
    const d = await r.json();
    if (!Array.isArray(d.embeddings) || d.embeddings.length !== textos.length) throw new Error("resposta de embeddings inesperada");
    return d.embeddings.map(normalizar);
  }

  const textoDoBloco = (b) => `${pref.doc(b)}${b.titulo}\n${b.palavras}\n${b.texto}`;
  const chaveDoBloco = (b) => crypto.createHash("sha256").update(`${modelo}\n${textoDoBloco(b)}`).digest("hex");

  return {
    get pronto() {
      return pronto;
    },
    /** Calcula os vetores que ainda não estão no arquivo de cache (blocos novos ou editados). Devolve quantos calculou. */
    async preparar(lista) {
      blocos = lista;
      let cache = {};
      try {
        if (arquivoCache && fs.existsSync(arquivoCache)) cache = JSON.parse(fs.readFileSync(arquivoCache, "utf8"));
      } catch {
        cache = {};
      }
      const novoCache = {};
      const faltam = [];
      vetores = blocos.map((b, i) => {
        const chave = chaveDoBloco(b);
        if (Array.isArray(cache[chave])) {
          novoCache[chave] = cache[chave];
          return normalizar(cache[chave]);
        }
        faltam.push({ i, chave });
        return null;
      });
      for (let ini = 0; ini < faltam.length; ini += 16) {
        const lote = faltam.slice(ini, ini + 16);
        const v = await chamar(lote.map((x) => textoDoBloco(blocos[x.i])));
        lote.forEach((x, j) => {
          vetores[x.i] = v[j];
          novoCache[x.chave] = Array.from(v[j]);
        });
      }
      if (arquivoCache && faltam.length) {
        try {
          fs.writeFileSync(arquivoCache, JSON.stringify(novoCache));
        } catch {
          /* sem permissão para gravar: tudo bem, só recalcula na próxima vez */
        }
      }
      pronto = vetores.length > 0 && vetores.every(Boolean);
      return faltam.length;
    },
    async vetorDaPergunta(texto) {
      return (await chamar([pref.consulta + texto], tempoPerguntaMs))[0];
    },
    similares(vetor) {
      return vetores.map((v, i) => ({ i, cosseno: produto(vetor, v) })).sort((a, b) => b.cosseno - a.cosseno);
    },
  };
}

// ---------- Juntando as pernas ----------
const MIN_COBERTURA = Number(process.env.RAG_COBERTURA_MINIMA) || 0.4; // fração do "peso" das palavras da pergunta que o bloco contém
const MIN_COSSENO = Number(process.env.RAG_COSSENO_MINIMO) || 0.5; // parecença de significado mínima
const RRF = 60;

export function criarBusca({ blocos, embedder = null, pausaMs = 60_000 }) {
  const indice = criarIndice(blocos);
  let pausadoAte = 0; // se a busca por significado falhar, ela descansa um pouco (a de palavras segue sozinha)

  return {
    blocos,
    /** Para o painel e os logs: quantos trechos há e se a busca por significado está funcionando agora. */
    estado() {
      return { blocos: blocos.length, significado: Boolean(embedder?.pronto) && Date.now() >= pausadoAte };
    },
    /**
     * @returns {Promise<{ id, titulo, texto, origem, score, metodo, cobertura, cosseno, seguro }[]>}
     * "seguro" = dá para responder SÓ com este bloco, sem IA, ou citá-lo como fonte: as duas buscas concordam, ou o
     *   significado é muito parecido, ou o bloco é claramente o melhor por palavras (2+ palavras em comum e bem na frente do segundo).
     * Sem "seguro" o bloco ainda vai para a IA como pista (ela decide se serve), mas não vira resposta nem fonte.
     */
    async buscar(consulta, { k = 3 } = {}) {
      const pergunta = String(consulta ?? "").slice(0, 800);
      const porPalavras = indice
        .buscar(pergunta)
        .filter((r) => r.cobertura >= MIN_COBERTURA)
        .slice(0, 8);

      let porSentido = [];
      if (embedder?.pronto && Date.now() >= pausadoAte) {
        try {
          const v = await embedder.vetorDaPergunta(pergunta);
          porSentido = embedder.similares(v).filter((r) => r.cosseno >= MIN_COSSENO).slice(0, 8);
        } catch (err) {
          pausadoAte = Date.now() + pausaMs;
          console.error(`Busca por significado indisponível (${err.message}). Usando só palavras por ${Math.round(pausaMs / 1000)} s.`);
        }
      }

      const mapa = new Map();
      const pegar = (i) => mapa.get(i) ?? mapa.set(i, { i, rrf: 0, cobertura: null, cosseno: null }).get(i);
      porPalavras.forEach((r, pos) => {
        const x = pegar(r.i);
        x.rrf += 1 / (RRF + pos + 1);
        x.cobertura = r.cobertura;
        x.score = r.score;
      });
      porSentido.forEach((r, pos) => {
        const x = pegar(r.i);
        x.rrf += 1 / (RRF + pos + 1);
        x.cosseno = r.cosseno;
      });

      // O quanto o melhor bloco por palavras está na frente do segundo (se está muito na frente, a pista é clara)
      const margem = porPalavras.length > 1 ? porPalavras[0].score / porPalavras[1].score : porPalavras.length ? 9 : 0;
      const lider = porPalavras[0] ?? null;

      return [...mapa.values()]
        .sort((a, b) => b.rrf - a.rrf)
        .slice(0, k)
        .map((x) => {
          const b = blocos[x.i];
          const nasDuas = x.cobertura !== null && x.cosseno !== null;
          return {
            id: b.id,
            titulo: b.titulo,
            texto: b.texto,
            origem: b.origem,
            score: Math.round((x.rrf ?? 0) * 10000) / 10000,
            metodo: nasDuas ? "palavras+significado" : x.cobertura !== null ? "palavras" : "significado",
            cobertura: x.cobertura === null ? null : Math.round(x.cobertura * 100) / 100,
            cosseno: x.cosseno === null ? null : Math.round(x.cosseno * 100) / 100,
            seguro: nasDuas || (x.cosseno ?? 0) >= 0.7 || (lider !== null && x.i === lider.i && lider.casados >= 2 && lider.cobertura >= 0.6 && margem >= 1.5),
          };
        });
    },
  };
}

// ---------- Uso nas respostas ----------
/** Texto que vai no prompt da IA com os trechos encontrados. Vazio se não achou nada. */
export function montarContexto(achados) {
  if (!achados?.length) return "";
  return `

Base de conhecimento da Rede Escudo (material confiável, escrito pela equipe). Use estes trechos para responder, com suas próprias palavras, quando ajudarem na pergunta. Não invente telefones, prazos, leis, sites ou passos que não estejam aqui. Se os trechos não responderem à pergunta, seja honesto sobre isso e oriente a pessoa a procurar um adulto de confiança ou o 190, o 100 ou o 188, conforme o caso. Não diga "segundo o trecho" nem cite números de trechos.

${achados.map((a, i) => `[${i + 1}] ${a.titulo}\n${a.texto}`).join("\n\n")}`;
}

/** Resposta SEM IA, só com a base: usada quando nenhuma IA está disponível e a busca tem certeza do bloco. */
export function responderPorTrechos(achados) {
  const principal = achados?.[0];
  if (!principal?.seguro) return null; // só responde sozinha quando o melhor bloco é claramente o certo
  const outros = achados.slice(1).filter((a) => a.seguro).slice(0, 2);
  return (
    `Aqui vai o que a Rede Escudo recomenda sobre isso:\n\n${principal.texto}` +
    (outros.length ? `\n\nTambém pode ajudar: ${outros.map((o) => `**${o.titulo}**`).join(" e ")}. É só perguntar.` : "") +
    `\n\nSe quiser registrar o que aconteceu, o botão **Fazer denúncia**, no topo, abre o formulário aqui mesmo.`
  );
}

/** A pergunta de busca junta a última fala com a anterior, para "e como eu faço isso?" ainda achar o assunto. */
export function consultaDaConversa(falasDaPessoa) {
  const ultimas = falasDaPessoa.slice(-2).map((f) => String(f ?? "").slice(0, 400));
  return ultimas.join("\n").trim();
}

/** Busca pela última fala; se ela for curta demais ("e agora?") ou não achar nada, usa também a fala anterior. */
export async function buscarNaConversa(busca, falasDaPessoa, { k = 3 } = {}) {
  const ultima = String(falasDaPessoa.at(-1) ?? "");
  let achados = await busca.buscar(ultima, { k });
  if (!achados.length || tokenizar(ultima).length < 3) {
    const comContexto = consultaDaConversa(falasDaPessoa);
    if (comContexto && comContexto !== ultima) achados = await busca.buscar(comContexto, { k });
  }
  return achados;
}
