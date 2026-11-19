// Prints e arquivos DENTRO do formulário de denúncia.
//
// Como funciona (e por que é seguro para quem denuncia):
//  - O arquivo NUNCA sai do aparelho. O navegador lê o arquivo aqui mesmo, calcula o "código" dele (SHA-256, uma
//    "impressão digital") e guarda só esse código. É só o código que vai junto com a denúncia.
//  - Por isso não depende da IA nem do Ollama: funciona também no site publicado (Render) e não gasta a cota de leitura de prints.
//  - Depois, quem entregar o arquivo original às autoridades pode provar que ele é o mesmo de hoje: o código bate.
//  - Os nomes dos arquivos só aparecem nesta tela. Não são enviados.
//
// Aceita imagens (print, foto), PDF e .txt. O limite de quantos e de quanto pesa cada um está em limites.js.

import { LIMITES } from "./limites.js";

const MB = 1024 * 1024;
const ROTULOS = { imagem: "IMG", pdf: "PDF", texto: "TXT" };
const EXTENSAO_IMAGEM = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;

// ---------- SHA-256 ----------
// O navegador só oferece crypto.subtle em endereço seguro (https ou localhost). Se a pessoa abrir o site pelo IP do
// computador, no celular, ele não existe. Para o print nunca ficar sem código, esta versão em JavaScript entra no lugar.
const K = Uint32Array.of(
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
);

/** SHA-256 em JavaScript puro. Recebe um Uint8Array e devolve os 32 bytes do resultado. */
export function sha256Js(dados) {
  const H = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
  const W = new Uint32Array(64);
  const comprimir = (b, p) => {
    for (let i = 0; i < 16; i++, p += 4) W[i] = (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15];
      const y = W[i - 2];
      W[i] = (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + W[i - 7] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + W[i - 16];
    }
    let a = H[0], b1 = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const t1 = h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + W[i];
      const t2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b1) ^ (a & c) ^ (b1 & c));
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b1; b1 = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b1; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  };

  const n = dados.length;
  const inteiros = n - (n % 64);
  for (let p = 0; p < inteiros; p += 64) comprimir(dados, p);
  // Sobra + byte 0x80 + zeros + tamanho em bits (8 bytes): cabe em 1 bloco se a sobra tiver até 55 bytes, senão em 2
  const cauda = new Uint8Array(n % 64 < 56 ? 64 : 128);
  cauda.set(dados.subarray(inteiros));
  cauda[n % 64] = 0x80;
  const vista = new DataView(cauda.buffer);
  vista.setUint32(cauda.length - 8, Math.floor((n * 8) / 2 ** 32));
  vista.setUint32(cauda.length - 4, (n * 8) >>> 0);
  for (let p = 0; p < cauda.length; p += 64) comprimir(cauda, p);

  const saida = new Uint8Array(32);
  const fim = new DataView(saida.buffer);
  H.forEach((v, i) => fim.setUint32(i * 4, v));
  return saida;
}

const emHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** Código (SHA-256, 64 letras e números) de um ArrayBuffer. Usa o do navegador e, se não existir, o de JavaScript. */
export async function sha256Hex(buffer) {
  try {
    if (globalThis.crypto?.subtle) return emHex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", buffer)));
  } catch {
    /* cai na versão em JavaScript, logo abaixo */
  }
  return emHex(sha256Js(new Uint8Array(buffer)));
}

// ---------- Arquivos ----------
/** "imagem", "pdf", "texto" ou null (tipo que não aceitamos). */
export function tipoDoArquivo(arquivo) {
  const nome = String(arquivo?.name ?? "");
  const mime = String(arquivo?.type ?? "");
  if (mime.startsWith("image/") || EXTENSAO_IMAGEM.test(nome)) return "imagem";
  if (mime === "application/pdf" || /\.pdf$/i.test(nome)) return "pdf";
  if (mime === "text/plain" || /\.txt$/i.test(nome)) return "texto";
  return null;
}

const tamanho = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const curto = (nome, max = 32) => (nome.length > max ? `${nome.slice(0, max - 1)}…` : nome);
const pausa = () => new Promise((r) => setTimeout(r, 0)); // deixa a tela se desenhar entre um arquivo e outro

/** Quadradinho de 96 px da imagem (data:image/jpeg bem leve) só para a pessoa reconhecer o print. null se não der. */
async function miniaturaDe(arquivo) {
  let bmp;
  try {
    bmp = await createImageBitmap(arquivo);
  } catch {
    return null; // formato que o navegador não abre (ex.: HEIC no Chrome): fica o ícone
  }
  try {
    const lado = 96;
    const tela = document.createElement("canvas");
    tela.width = lado;
    tela.height = lado;
    const g = tela.getContext("2d");
    g.fillStyle = "#16233f";
    g.fillRect(0, 0, lado, lado);
    const escala = Math.max(lado / bmp.width, lado / bmp.height);
    const w = bmp.width * escala;
    const alt = bmp.height * escala;
    g.drawImage(bmp, (lado - w) / 2, (lado - alt) / 2, w, alt);
    return tela.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  } finally {
    bmp.close?.();
  }
}

let seq = 0;

/**
 * Cria o seletor de prints. Devolve o pedaço de tela (el) e as funções para o formulário usar.
 * @param {object} o
 * @param {Function} o.h           criador de elementos do formulário (sem innerHTML)
 * @param {number}   o.maximo      quantos prints/arquivos no total (os da conversa + os escolhidos aqui)
 * @param {() => number} [o.jaTem] quantos prints já vieram da conversa (entram na conta do total)
 * @param {(codigo: string) => boolean} [o.repetido] true se esse código já veio da conversa
 * @param {() => void} [o.aoMudar] chamado quando a lista muda
 */
export function criarSeletorDePrints({ h, maximo, jaTem = () => 0, repetido = () => false, aoMudar = () => {} }) {
  const itens = []; // { nome, bytes, tipo, hash, miniatura }
  let lendo = 0;
  let travado = false;
  let fila = Promise.resolve();
  const restantes = () => Math.max(0, maximo - jaTem() - itens.length);

  const idDica = `prints-dica-${++seq}`;
  const entrada = h("input", { type: "file", multiple: true, accept: "image/*,.pdf,.txt,application/pdf,text/plain", hidden: true, tabindex: "-1", "aria-hidden": "true" });
  const botao = h("button", { type: "button", className: "adicionar", "aria-describedby": idDica, texto: "+ Adicionar prints ou arquivos" });
  const contador = h("span", { className: "prints-contador" });
  const lista = h("ul", { className: "prints-lista", "aria-label": "Arquivos adicionados", hidden: true });
  const dica = h("p", { className: "prints-dica", id: idDica, texto: `Escolha vários de uma vez, arraste para cá ou cole com Ctrl+V. Até ${maximo} no total e ${LIMITES.MB_POR_ARQUIVO} MB cada. Aceito imagens, PDF e arquivos .txt.` });
  const status = h("p", { className: "prints-status", role: "status", "aria-live": "polite", hidden: true });
  const el = h("div", { className: "prints-picker" }, lista, h("div", { className: "prints-acoes" }, botao, contador), dica, status, entrada);

  function mostrar(texto, alerta = false) {
    status.textContent = texto;
    status.hidden = !texto;
    status.classList.toggle("alerta", alerta);
  }

  function linha(item) {
    const rem = h("button", { type: "button", className: "remover", "aria-label": `Remover ${item.nome}`, title: "Remover", texto: "×" });
    rem.addEventListener("click", () => remover(item));
    const mini = item.miniatura
      ? h("img", { className: "print-mini", src: item.miniatura, alt: "", width: "48", height: "48" })
      : h("span", { className: "print-mini print-icone", "aria-hidden": "true", texto: ROTULOS[item.tipo] });
    return h("li", { className: "print-item" }, mini,
      h("div", { className: "print-info" },
        h("span", { className: "print-nome", title: item.nome, texto: item.nome }),
        h("small", { className: "print-meta", title: `Código completo: ${item.hash}`, texto: `${tamanho(item.bytes)} · código ${item.hash.slice(0, 8)}…` })),
      rem);
  }

  // Só o contador e o botão. É leve de propósito: o formulário chama isto a cada letra digitada.
  function ajustar() {
    contador.textContent = `${jaTem() + itens.length} de ${maximo}`;
    botao.disabled = travado || restantes() <= 0;
    botao.title = restantes() <= 0 ? "Você chegou ao limite de prints e arquivos" : "";
  }

  function desenhar() {
    lista.replaceChildren(...itens.map(linha));
    lista.hidden = itens.length === 0;
    ajustar();
  }

  function remover(item) {
    const i = itens.indexOf(item);
    if (i < 0) return;
    itens.splice(i, 1);
    mostrar("");
    desenhar();
    aoMudar();
    botao.focus();
  }

  // Um arquivo por vez: a memória do navegador nunca guarda vários arquivos grandes ao mesmo tempo
  async function processar(arquivos) {
    lendo++;
    desenhar();
    const recusas = [];
    let novos = 0;
    let semEspaco = 0;
    try {
      for (let i = 0; i < arquivos.length; i++) {
        if (travado) break;
        if (restantes() <= 0) {
          semEspaco = arquivos.length - i;
          break;
        }
        const f = arquivos[i];
        const nome = f.name || "arquivo sem nome";
        const tipo = tipoDoArquivo(f);
        if (!tipo) {
          recusas.push(`“${curto(nome)}” não é print, PDF nem .txt.`);
          continue;
        }
        if (f.size === 0) {
          recusas.push(`“${curto(nome)}” está vazio.`);
          continue;
        }
        if (f.size > LIMITES.MB_POR_ARQUIVO * MB) {
          recusas.push(`“${curto(nome)}” tem ${tamanho(f.size)} (o limite é ${LIMITES.MB_POR_ARQUIVO} MB).`);
          continue;
        }
        mostrar(arquivos.length > 1 ? `Lendo ${i + 1} de ${arquivos.length}: ${curto(nome)}…` : `Lendo ${curto(nome)}…`);
        await pausa();
        let hash;
        try {
          hash = await sha256Hex(await f.arrayBuffer());
        } catch {
          recusas.push(`Não consegui ler “${curto(nome)}”. Tente de novo.`);
          continue;
        }
        if (itens.some((x) => x.hash === hash) || repetido(hash)) {
          recusas.push(`“${curto(nome)}” já foi adicionado.`);
          continue;
        }
        const miniatura = tipo === "imagem" ? await miniaturaDe(f) : null;
        if (restantes() <= 0) {
          semEspaco = arquivos.length - i; // o espaço acabou enquanto este era lido (print novo na conversa)
          break;
        }
        itens.push({ nome, bytes: f.size, tipo, hash, miniatura });
        novos++;
        desenhar();
        aoMudar();
      }
    } catch {
      recusas.push("Algo deu errado ao ler os arquivos. Tente de novo.");
    } finally {
      lendo--;
    }
    const partes = [];
    if (novos) partes.push(novos === 1 ? "1 arquivo adicionado." : `${novos} arquivos adicionados.`);
    if (semEspaco) partes.push(`Chegou ao limite de ${maximo}: ${semEspaco === 1 ? "1 arquivo não foi adicionado" : `${semEspaco} arquivos não foram adicionados`}.`);
    partes.push(...recusas.slice(0, 3));
    if (recusas.length > 3) partes.push(`E mais ${recusas.length - 3} que não ${recusas.length - 3 > 1 ? "foram adicionados" : "foi adicionado"}.`);
    mostrar(partes.join(" "), recusas.length > 0 || semEspaco > 0);
    desenhar();
  }

  /** Adiciona arquivos (da janela de escolher, de arrastar ou de colar). Vários chamados seguidos entram na fila. */
  function adicionar(arquivos) {
    const lote = Array.from(arquivos ?? []);
    if (!lote.length || travado) return fila;
    fila = fila.then(() => processar(lote));
    return fila;
  }

  botao.addEventListener("click", () => entrada.click());
  entrada.addEventListener("change", () => {
    const escolhidos = Array.from(entrada.files ?? []);
    entrada.value = ""; // permite escolher o mesmo arquivo de novo depois de removê-lo
    adicionar(escolhidos);
  });

  /** Arrastar e colar: vale na tela toda do formulário (soltar um arquivo fora do lugar faria o navegador abandonar a página). */
  function ligarEm(raiz, realce = el) {
    const comArquivos = (e) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    raiz.addEventListener("dragover", (e) => {
      if (!comArquivos(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = travado ? "none" : "copy";
      if (!travado) realce.classList.add("arrastando");
    });
    raiz.addEventListener("dragleave", (e) => {
      if (!raiz.contains(e.relatedTarget)) realce.classList.remove("arrastando");
    });
    raiz.addEventListener("drop", (e) => {
      if (!comArquivos(e)) return;
      e.preventDefault();
      realce.classList.remove("arrastando");
      adicionar(e.dataTransfer.files);
    });
    raiz.addEventListener("paste", (e) => {
      const colados = Array.from(e.clipboardData?.files ?? []);
      if (!colados.length || e.clipboardData.getData("text/plain")) return; // texto colado continua sendo texto
      adicionar(colados);
    });
  }

  desenhar();
  return {
    el,
    itens: () => itens.map((i) => ({ ...i })),
    total: () => itens.length,
    ocupado: () => lendo > 0,
    adicionar,
    ligarEm,
    atualizar: ajustar,
    travar(sim) {
      travado = sim;
      ajustar();
    },
  };
}
