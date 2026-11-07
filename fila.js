// Fila de denúncias: PRIORIDADE (o que o analista deve ler primeiro) e SUSPEITA DE SPAM (quarentena).
//
// Princípios:
//  1. A IA nunca mexe no banco. Ela só opina ("parece trote?"). Quem calcula e grava é este código.
//  2. NADA é apagado sozinho. Quem parece spam vai para a QUARENTENA, e o analista pode liberar.
//  3. Risco de vida nunca vai para a quarentena (um alarme falso custa um minuto; um caso perdido custa muito mais).
//  4. Não guardamos IP nem nada que identifique a pessoa: o limite por pessoa vive só na memória do servidor.
//
// Tudo aqui é função simples (sem banco, sem rede), por isso dá para testar sem nada instalado.
import crypto from "node:crypto";

export const LIMITE_QUARENTENA = Number(process.env.LIMITE_QUARENTENA) || 70;

// minúsculas e sem acentos
const sem = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// "Impressão digital" do texto, ignorando maiúsculas, acentos e pontuação (para achar a mesma denúncia enviada de novo)
export const hashRelato = (relato) =>
  crypto
    .createHash("sha256")
    .update(sem(relato).replace(/[^a-z0-9]+/g, " ").trim())
    .digest("hex");

const PALAVRAS_DE_TESTE = new Set([
  "teste", "testes", "testando", "test", "testing", "asdf", "asdfg", "asdfgh", "qwerty", "lorem", "ipsum", "dolor", "sit", "amet", "aaa", "abc", "bla", "blabla", "ola", "oi",
]);

/**
 * Sinais de que a denúncia pode ser spam, trote ou robô. Só olha a FORMA do texto, nunca o assunto:
 * quem escreve com raiva, em maiúsculas ou com palavrão continua sendo uma vítima como as outras.
 * @returns {{ pontos: number, motivos: string[] }}  pontos de 0 a 100+ (quanto maior, mais suspeito)
 */
export function avaliarSuspeita({ relato, evidencias = [], isca = false, segundos = null, duplicadaDe = null, volumeAlto = false }) {
  const motivos = [];
  let pontos = 0;
  const soma = (p, m) => {
    pontos += p;
    motivos.push(m);
  };

  if (isca) soma(100, "campo escondido preenchido (robô)");
  if (duplicadaDe) soma(70, `texto igual ao da denúncia ${duplicadaDe}`);
  if (volumeAlto) soma(40, "muitas denúncias em pouco tempo (modo proteção)");

  const texto = String(relato ?? "").trim();
  const semLinks = texto.replace(/https?:\/\/\S+|www\.\S+|\b[\w-]+\.(gg|me|com|app)\/\S*/gi, " ");
  const limpo = sem(semLinks);
  const letras = limpo.match(/[a-z]/g) ?? [];
  const palavras = limpo.match(/[a-z]{2,}/g) ?? [];

  if (letras.length >= 15 && new Set(letras).size <= 3) soma(70, "só repete poucas letras");

  if (palavras.length >= 8) {
    const variedade = new Set(palavras).size / palavras.length;
    if (variedade < 0.2) soma(70, "repete sempre as mesmas palavras");
    else if (variedade < 0.3) soma(50, "repete as mesmas palavras");
  }

  // Teclas aleatórias: palavra comprida com 5 ou mais consoantes seguidas ("asdfghjkl"). Em português isso quase não existe.
  const longas = palavras.filter((p) => p.length >= 6);
  if (longas.length >= 3 && longas.filter((p) => /[^aeiou]{5,}/.test(p)).length / longas.length >= 0.5) soma(70, "texto sem sentido (teclas aleatórias)");

  if (palavras.length > 0 && palavras.every((p) => PALAVRAS_DE_TESTE.has(p))) soma(70, "texto de teste");

  const visiveis = limpo.replace(/\s/g, "").length;
  if (visiveis >= 20) {
    const proporcaoDeLetras = letras.length / visiveis;
    if (proporcaoDeLetras < 0.25) soma(70, "quase só símbolos e números");
    else if (proporcaoDeLetras < 0.4) soma(40, "poucas letras para um relato");
  }

  if ((texto.match(/https?:\/\/|www\.|discord\.gg\/|t\.me\//gi) ?? []).length >= 4) soma(30, "muitos links no relato");

  if (/\S{30,}/.test(semLinks)) soma(20, "palavra gigante sem espaços");

  if (typeof segundos === "number" && Number.isFinite(segundos) && segundos >= 0 && segundos < 4) soma(25, "enviado rápido demais (menos de 4 s)");

  const valores = evidencias.map((e) => String(e?.valor ?? "").trim().toLowerCase()).filter(Boolean);
  if (valores.length >= 5 && new Set(valores).size <= Math.ceil(valores.length / 3)) soma(20, "provas repetidas");

  return { pontos, motivos };
}

/**
 * Decide se vai para a quarentena.
 * A IA sozinha NUNCA esconde uma denúncia: ela só reforça quando já existe algum indício na forma do texto.
 */
export function decidirQuarentena({ pontos, iaTrote = false, risco = false, isca = false, limite = LIMITE_QUARENTENA }) {
  if (isca) return true; // robô comprovado
  if (risco) return false; // risco de vida nunca fica escondido
  if (pontos >= limite) return true;
  return iaTrote && pontos >= 40;
}

const BASE_URGENCIA = { critica: 70, alta: 50, media: 30, baixa: 10 };
const BONUS_CATEGORIA = { aliciamento: 10, incitacao_automutilacao: 10, extorsao: 8, divulgacao_de_imagens: 8, ameaca: 5, golpe: 2, outro: 0 };

/**
 * Prioridade de 0 a 100: o que o analista deve ler primeiro.
 * Urgência pesa mais; categoria mais grave, provas que dá para investigar e relato detalhado somam;
 * a suspeita de spam subtrai (até 35). Risco de vida nunca fica abaixo de 90.
 * @returns {{ pontos: number, motivos: string[] }}
 */
export function calcularPrioridade({ urgencia, categoria, evidencias = [], relato = "", suspeita = 0, risco = false }) {
  const motivos = [];
  let p = BASE_URGENCIA[urgencia] ?? 30;
  motivos.push(`urgência ${urgencia ?? "media"} (+${p})`);

  const cat = BONUS_CATEGORIA[categoria] ?? 0;
  if (cat) {
    p += cat;
    motivos.push(`categoria ${categoria} (+${cat})`);
  }

  const tipos = new Set(evidencias.filter((e) => String(e?.valor ?? "").trim()).map((e) => String(e.tipo ?? "")));
  const provas = Math.min(tipos.size, 4) * 4;
  if (provas) {
    p += provas;
    motivos.push(`${Math.min(tipos.size, 4)} tipo(s) de prova (+${provas})`);
  }

  if (String(relato).trim().length >= 150) {
    p += 4;
    motivos.push("relato detalhado (+4)");
  }

  const penalidade = Math.min(35, Math.floor(suspeita / 2));
  if (penalidade) {
    p -= penalidade;
    motivos.push(`suspeita de spam (-${penalidade})`);
  }

  p = Math.max(0, Math.min(100, p));
  if (risco && p < 90) {
    p = 90;
    motivos.push("risco de vida (mínimo 90)");
  }
  return { pontos: p, motivos };
}

/**
 * Modo proteção: conta quantas denúncias chegaram na última hora (só na memória, sem guardar nada de ninguém).
 * Se passar do máximo, as novas ficam mais suspeitas. Elas continuam sendo gravadas: nenhuma vítima real se perde.
 */
export function criarMedidorDeVolume({ janelaMs = 3_600_000, maximo = Number(process.env.MAX_DENUNCIAS_HORA) || 60 } = {}) {
  const marcas = [];
  return {
    registrar(agora = Date.now()) {
      while (marcas.length && marcas[0] < agora - janelaMs) marcas.shift();
      marcas.push(agora);
      return marcas.length > maximo;
    },
  };
}

// Colunas novas da tabela "denuncias". O servidor cria sozinho se ainda não existirem (XAMPP/MariaDB).
const COLUNAS = {
  prioridade: "TINYINT UNSIGNED NOT NULL DEFAULT 0",
  suspeita_spam: "TINYINT UNSIGNED NOT NULL DEFAULT 0",
  quarentena: "TINYINT(1) NOT NULL DEFAULT 0",
  motivos: "VARCHAR(500) NULL",
  relato_hash: "CHAR(64) NULL",
};

/** Confere (e cria, se faltar) as colunas da fila. Devolve true se estão prontas; se falhar, o servidor segue no modo antigo. */
export async function garantirColunas(db) {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM denuncias");
    const tem = new Set(rows.map((r) => r.Field));
    const faltam = Object.keys(COLUNAS).filter((c) => !tem.has(c));
    for (const c of faltam) await db.query(`ALTER TABLE denuncias ADD COLUMN ${c} ${COLUNAS[c]}`);
    if (faltam.length) {
      for (const sql of ["CREATE INDEX idx_fila ON denuncias (quarentena, prioridade)", "CREATE INDEX idx_hash ON denuncias (relato_hash)"]) {
        try {
          await db.query(sql);
        } catch {
          /* o índice já existe: tudo bem */
        }
      }
      console.log("Fila de prioridade: colunas criadas na tabela denuncias (" + faltam.join(", ") + ").");
    }
    return true;
  } catch (err) {
    console.error("Fila de prioridade desligada (não consegui preparar a tabela):", err.message);
    return false;
  }
}
