// Formulário de denúncia que aparece DENTRO do chat.
// O escudo é o guia: o contorno vai se desenhando conforme a pessoa preenche, e as "pílulas" mostram
// o que ajuda nas provas (ID do usuário, link, servidor, data e hora, prints). Só o relato é obrigatório.
// Feito para qualquer idade: passos numerados, ajuda em linguagem simples ao lado de cada campo ("O que é um ID?"),
// lista de dúvidas no fim (os botões Cancelar e Enviar ficam por último) e opção de letras maiores. Os textos de ajuda ficam em ajuda.js e plataformas.js.
// Prints e arquivos são escolhidos aqui mesmo (prints.js): o navegador só calcula o código de cada um e nada é enviado.
// Quantos prints cabem, e de que tamanho, está em limites.js.

import { PLATAFORMAS, NOMES_PLATAFORMAS, NOTA_GERAL } from "./plataformas.js";
import { GLOSSARIO, ajudaDoCampo, duvidasGerais } from "./ajuda.js";
import { LIMITES } from "./limites.js";
import { criarSeletorDePrints } from "./prints.js";

const TIPOS = [
  { id: "id_usuario", rotulo: "Usuário ou ID" },
  { id: "link", rotulo: "Link ou convite" },
  { id: "servidor", rotulo: "Servidor ou grupo" },
  { id: "data_hora", rotulo: "Data e hora" },
];
const MIN_RELATO = 20;
const MAX_RELATO = 5000;
const MAX_PROVAS = LIMITES.PROVAS_POR_DENUNCIA;

// Cria elementos sem innerHTML: tudo que entra é texto
function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "className") el.className = v;
    else if (k === "texto") el.textContent = v;
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...filhos.filter((f) => f != null));
  return el;
}

// Botão "? ..." que abre e fecha uma explicação logo abaixo do campo. rotulo() e conteudo() são lidos a cada abertura,
// por isso a ajuda acompanha o tipo de prova e a plataforma escolhidos.
let seqAjuda = 0;
function ajudaToggle(rotulo, conteudo) {
  const id = `ajuda-${++seqAjuda}`;
  const texto = h("span", { texto: rotulo() });
  const botao = h("button", { type: "button", className: "ajuda-botao", "aria-expanded": "false", "aria-controls": id }, h("span", { className: "icone-ajuda", "aria-hidden": "true", texto: "?" }), texto);
  const painel = h("div", { className: "ajuda-painel", id, hidden: true });
  const desenhar = () => {
    texto.textContent = rotulo();
    if (!painel.hidden) painel.replaceChildren(...conteudo());
  };
  botao.addEventListener("click", () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botao.setAttribute("aria-expanded", String(abrir));
    if (abrir) painel.replaceChildren(...conteudo());
  });
  return { el: h("div", { className: "ajuda-wrap" }, botao, painel), desenhar };
}
const itemDeAjuda = (e, comTitulo = true) =>
  h("div", { className: "ajuda-item" }, comTitulo ? h("h4", { texto: e.pergunta }) : null, ...e.resposta.map((t) => h("p", { texto: t })));

/**
 * @param {object} o
 * @param {() => SVGElement} o.escudo    devolve uma cópia do escudo de progresso
 * @param {(dados) => Promise<{protocolo: string, codigo: string}>} o.enviar  grava a denúncia
 * @param {(opcoes) => Promise<boolean>} o.confirmar  janela de "tem certeza?"
 * @param {() => void} [o.aoCancelar]
 * @param {(resultado) => void} [o.aoConcluir]
 * @param {() => {original: string|null, lida: string|null}[]} [o.imagens]  "impressões digitais" (SHA-256) dos prints enviados no chat (entram na conta do limite)
 */
export function criarFormulario({ escudo, enviar, confirmar, aoCancelar, aoConcluir, imagens = () => [] }) {
  let estado = "preenchendo"; // preenchendo | enviando | enviado | fechado
  const abertoEm = performance.now(); // quanto tempo a pessoa levou (um robô envia em menos de 1 segundo)

  // ---------- Cabeçalho (o escudo fica o tempo todo) ----------
  const svg = escudo();
  const avanco = svg.querySelector(".avanco");
  const titulo = h("h2", { texto: "Denúncia anônima" });
  const subtitulo = h("p", { texto: "Só o relato é obrigatório. Não pedimos nome, e-mail nem telefone." });
  const botaoLetras = h("button", { type: "button", className: "letras", "aria-pressed": "false", title: "Aumenta o tamanho das letras do formulário", texto: "Letras maiores" });
  const topo = h("div", { className: "cd-topo" }, svg, h("div", { className: "cd-titulos" }, titulo, subtitulo), botaoLetras);
  const corpo = h("div", { className: "cd-corpo" });
  const el = h("article", { className: "cartao-denuncia", "aria-label": "Formulário de denúncia" }, topo, corpo);
  botaoLetras.addEventListener("click", () => {
    const grande = el.classList.toggle("letras-grandes");
    botaoLetras.setAttribute("aria-pressed", String(grande));
    botaoLetras.textContent = grande ? "Letras normais" : "Letras maiores";
  });

  // ---------- Campos ----------
  const relato = h("textarea", { rows: "4", maxlength: String(MAX_RELATO), placeholder: "Ex.: Um grupo no Discord disse que vai espalhar minhas fotos se eu não pagar 200 reais." });
  const ajudaRelato = ajudaToggle(() => ajudaDoCampo("relato")[0].pergunta, () => ajudaDoCampo("relato").map((e) => itemDeAjuda(e, false)));
  const contador = h("small", { className: "contador", texto: `0/${MAX_RELATO}` });
  // Aviso de "relato curto demais": aparece logo abaixo do campo (é para lá que a página sobe), não lá embaixo junto dos botões
  const erroRelato = h("p", { className: "cd-erro cd-erro-relato", role: "alert", hidden: true });
  const plataforma = h("select");
  for (const p of NOMES_PLATAFORMAS) plataforma.append(h("option", { value: p, texto: p }));
  // A dica de cada campo e a ajuda mudam conforme a plataforma escolhida
  const pista = (tipo) => PLATAFORMAS[plataforma.value]?.pistas[tipo] ?? "";

  const listaProvas = h("div", { className: "provas" });
  const ajudasDasLinhas = []; // para atualizar a ajuda quando muda o tipo ou a plataforma
  const quantasProvas = () => listaProvas.querySelectorAll(".prova").length;
  const passosDaPlataforma = () => {
    const a = PLATAFORMAS[plataforma.value].ajuda;
    return h("div", { className: "ajuda-item ajuda-plataforma" }, h("h4", { texto: a.titulo }), h("ol", {}, ...a.passos.map((t) => h("li", { texto: t }))), h("p", { texto: `${a.nota} ${NOTA_GERAL}` }));
  };
  const botaoAdd = h("button", { type: "button", className: "adicionar", texto: "+ Adicionar outra prova" });
  const pilulasEl = h("ul", { className: "pilulas", "aria-label": "O que já foi preenchido" });
  const pilulas = {};
  for (const [id, rotulo] of [["relato", "Relato"], ...TIPOS.map((t) => [t.id, t.rotulo]), ["prints", "Prints"]]) {
    pilulas[id] = h("li", { className: "pilula", texto: rotulo });
    pilulasEl.append(pilulas[id]);
  }

  const leitura = () => [...listaProvas.querySelectorAll(".prova")].map((l) => ({ tipo: l.querySelector("select").value, valor: l.querySelector("input").value.trim() }));
  const sujo = () => relato.value.trim() !== "" || leitura().some((p) => p.valor !== "") || prints.total() > 0;

  function atualizar() {
    const relatoOk = relato.value.trim().length >= MIN_RELATO;
    if (relatoOk) erroRelato.hidden = true;
    const comValor = new Set(leitura().filter((p) => p.valor).map((p) => p.tipo));
    pilulas.relato.classList.toggle("ok", relatoOk);
    for (const t of TIPOS) pilulas[t.id].classList.toggle("ok", comValor.has(t.id));
    const comPrints = totalDePrints() > 0;
    pilulas.prints.classList.toggle("ok", comPrints);
    // O relato vale 40 e cada uma das 5 pílulas (4 tipos de prova + prints) vale 12: 40 + 5 × 12 = 100
    const pontos = (relatoOk ? 40 : 0) + TIPOS.reduce((s, t) => s + (comValor.has(t.id) ? 12 : 0), 0) + (comPrints ? 12 : 0);
    avanco.style.strokeDashoffset = String(100 - pontos); // o contorno do escudo se desenha com o progresso
    contador.textContent = `${relato.value.length}/${MAX_RELATO}`;
    botaoAdd.disabled = quantasProvas() >= MAX_PROVAS;
    prints.atualizar();
  }

  function novaLinha(tipo = "id_usuario") {
    const sel = h("select", { "aria-label": "Tipo de prova" });
    for (const t of TIPOS) sel.append(h("option", { value: t.id, texto: t.rotulo }));
    sel.value = tipo;
    const inp = h("input", { type: "text", maxlength: "300", placeholder: pista(tipo), "aria-label": "Valor da prova" });
    const rem = h("button", { type: "button", className: "remover", "aria-label": "Remover esta prova", title: "Remover", texto: "×" });
    const linha = h("div", { className: "prova" }, sel, inp, rem);
    // Ajuda do tipo escolhido: "O que é um ID?", "O que é um link?"... (o ID mostra também o passo a passo da plataforma)
    const ajuda = ajudaToggle(
      () => ajudaDoCampo(sel.value)[0]?.pergunta ?? "Preciso de ajuda com este campo",
      () => [...ajudaDoCampo(sel.value).map((e, _, todas) => itemDeAjuda(e, todas.length > 1)), ...(sel.value === "id_usuario" ? [passosDaPlataforma()] : [])]
    );
    ajudasDasLinhas.push(ajuda);
    const bloco = h("div", { className: "prova-bloco" }, linha, ajuda.el);
    sel.addEventListener("change", () => { inp.placeholder = pista(sel.value); ajuda.desenhar(); atualizar(); });
    inp.addEventListener("input", atualizar);
    rem.addEventListener("click", () => { ajudasDasLinhas.splice(ajudasDasLinhas.indexOf(ajuda), 1); bloco.remove(); atualizar(); });
    listaProvas.append(bloco);
    return inp;
  }
  for (const t of TIPOS) novaLinha(t.id);
  botaoAdd.addEventListener("click", () => { if (quantasProvas() < MAX_PROVAS) novaLinha("id_usuario").focus(); atualizar(); });
  relato.addEventListener("input", atualizar);

  function trocouPlataforma() {
    for (const linha of listaProvas.querySelectorAll(".prova")) linha.querySelector("input").placeholder = pista(linha.querySelector("select").value);
    for (const a of ajudasDasLinhas) a.desenhar(); // o passo a passo do ID muda com a plataforma
  }
  plataforma.addEventListener("change", trocouPlataforma);

  // ---------- Prints e arquivos ----------
  // O arquivo nunca sai do aparelho: o navegador calcula o "código" (SHA-256, a "impressão digital") e só ele vai junto
  // com a denúncia. Os prints enviados no chat também entram: o chat já guardou o código deles.
  const codigosDoChat = () => imagens().filter((i) => i && (i.original || i.lida));
  const totalDePrints = () => codigosDoChat().length + prints.total();
  const marcar = h("input", { type: "checkbox", id: `guardar-codigo-${++seqAjuda}`, checked: true });
  const marcarRotulo = h("label", { className: "marcar", for: marcar.id }, marcar, h("span", { texto: "Guardar o código dos meus prints junto com a denúncia" }));
  const resumoPrints = h("p", { className: "prints-resumo", hidden: true });
  const ajudaPrint = ajudaToggle(() => GLOSSARIO.find((e) => e.id === "print").pergunta, () => [itemDeAjuda(GLOSSARIO.find((e) => e.id === "print"), false)]);
  const ajudaHash = ajudaToggle(() => GLOSSARIO.find((e) => e.id === "hash").pergunta, () => [itemDeAjuda(GLOSSARIO.find((e) => e.id === "hash"), false)]);
  const prints = criarSeletorDePrints({
    h,
    maximo: LIMITES.PRINTS_POR_DENUNCIA,
    jaTem: () => codigosDoChat().length,
    repetido: (codigo) => codigosDoChat().some((i) => i.original === codigo || i.lida === codigo),
    aoMudar: aoMudarPrints,
  });
  const blocoPrints = h("div", { className: "prints-bloco" },
    h("h4", { texto: "Prints e arquivos" }),
    h("p", { className: "prints-texto", texto: "Os arquivos não são enviados nem guardados: o navegador só calcula um código (a “impressão digital”) de cada um, e só esse código vai junto com a denúncia. Guarde os originais." }),
    h("p", { className: "prints-aviso", texto: "Não anexe fotos íntimas. Conte o que aconteceu no relato e guarde só os prints das mensagens." }),
    prints.el, resumoPrints, marcarRotulo, ajudaPrint.el, ajudaHash.el);
  function desenharPrints() {
    const noChat = codigosDoChat().length;
    const n = noChat + prints.total();
    resumoPrints.hidden = n === 0;
    resumoPrints.textContent = marcar.checked
      ? `${n} código${n > 1 ? "s vão" : " vai"} junto com a denúncia${noChat ? ` (${noChat} da conversa)` : ""}.`
      : "Nenhum código será guardado (você desmarcou a opção).";
    marcarRotulo.hidden = n === 0;
    blocoPrints.classList.toggle("com-prints", n > 0);
    prints.atualizar();
  }
  function aoMudarPrints() {
    desenharPrints();
    atualizar();
  }
  marcar.addEventListener("change", desenharPrints);
  desenharPrints();

  // Código de cada print: primeiro os da conversa, depois os escolhidos aqui. Sem repetir e até o limite do servidor.
  function codigosParaEnviar() {
    const vistos = new Set();
    const saida = [];
    const todos = [...codigosDoChat().map((i) => ({ original: i.original ?? null, lida: i.lida ?? null })), ...prints.itens().map((i) => ({ original: i.hash, lida: null }))];
    for (const c of todos) {
      const chave = c.original || c.lida;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push(c);
      if (saida.length >= LIMITES.PRINTS_POR_DENUNCIA) break;
    }
    return saida;
  }

  // ---------- Dúvidas: ficam no fim do formulário, ANTES dos botões, e só trazem o que não aparece no "?" de um campo ----------
  const duvidas = h("section", { className: "duvidas" }, h("h3", { className: "passo-titulo", texto: "Ainda tem dúvidas?" }),
    ...duvidasGerais().map((e) => h("details", { className: "duvida" }, h("summary", { texto: e.pergunta }), ...e.resposta.map((t) => h("p", { texto: t })))));

  // === ISCA (anti-robô) ===
  // Campo-isca: invisível para gente (e fora do Tab), mas robôs de spam costumam preencher tudo
  const isca = h("input", { type: "text", name: "isca", tabindex: "-1", autocomplete: "off", "aria-hidden": "true", className: "isca" });

  const erro = h("p", { className: "cd-erro", role: "alert", hidden: true });
  const mostrarErro = (t) => { erro.textContent = t; erro.hidden = false; };

  const botaoEnviar = h("button", { type: "submit", className: "primario", texto: "Enviar denúncia" });
  const botaoCancelar = h("button", { type: "button", className: "fantasma", texto: "Cancelar" });

  const form = h("form", { className: "cd-form", novalidate: true },
    isca,
    pilulasEl,
    h("section", { className: "passo" },
      h("h3", { className: "passo-titulo", texto: "1. Conte o que aconteceu" }),
      h("label", { className: "campo" }, h("span", { texto: "O que aconteceu?" }), h("small", { className: "dica", texto: "Escreva do seu jeito. Não precisa ser perfeito." }), relato, contador),
      erroRelato,
      ajudaRelato.el
    ),
    h("section", { className: "passo" },
      h("h3", { className: "passo-titulo", texto: "2. Onde isso aconteceu?" }),
      h("label", { className: "campo" }, h("span", { texto: "Aplicativo ou site" }), h("small", { className: "dica", texto: "Se não achar o seu na lista, escolha “Outra”." }), plataforma)
    ),
    h("section", { className: "passo" },
      h("h3", { className: "passo-titulo", texto: "3. Provas que você já tem (pode pular)" }),
      h("small", { className: "dica", texto: "Tudo opcional. Quanto mais informação, mais fácil para os analistas. Em dúvida? Toque no botão com “?” embaixo de cada campo." }),
      listaProvas, botaoAdd, blocoPrints
    ),
    duvidas,
    erro,
    h("div", { className: "cd-acoes" }, botaoCancelar, botaoEnviar)
  );
  corpo.append(form);
  atualizar();
  prints.ligarEm(el, blocoPrints); // arrastar arquivos para cá e colar (Ctrl+V) um print

  // Enter dentro de um campo de uma linha NÃO envia a denúncia (evita enviar sem querer)
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
  });

  function travar(sim) {
    prints.travar(sim);
    for (const c of form.querySelectorAll("textarea, input, select, button")) c.disabled = sim;
    if (!sim) atualizar();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (estado !== "preenchendo") return;
    erro.hidden = true;
    erroRelato.hidden = true;
    if (prints.ocupado()) {
      mostrarErro("Espere um instante: ainda estou lendo os prints. Quando terminar, é só enviar.");
      return;
    }
    const texto = relato.value.trim();
    if (texto.length < MIN_RELATO) {
      erroRelato.textContent = "Conte um pouco mais do que aconteceu (pelo menos 20 letras). Pode ser sem formalidade.";
      erroRelato.hidden = false;
      relato.focus();
      return;
    }
    estado = "enviando";
    const codigos = marcar.checked ? codigosParaEnviar() : [];
    travar(true);
    svg.classList.add("pensando");
    botaoEnviar.textContent = "Enviando...";
    try {
      const r = await enviar({
        relato: texto,
        plataforma: plataforma.value,
        evidencias: leitura().filter((p) => p.valor),
        ...(codigos.length ? { imagens: codigos } : {}),
        isca: isca.value,
        segundos: Math.round((performance.now() - abertoEm) / 1000),
      });
      estado = "enviado";
      svg.classList.remove("pensando");
      mostrarResultado(r);
      aoConcluir?.(r);
    } catch (err) {
      estado = "preenchendo";
      svg.classList.remove("pensando");
      botaoEnviar.textContent = "Enviar denúncia";
      travar(false);
      mostrarErro(err?.message || "Não consegui enviar agora. Tente de novo em instantes.");
    }
  });

  botaoCancelar.addEventListener("click", async () => {
    if (estado !== "preenchendo") return;
    if (sujo()) {
      const sim = await confirmar({
        titulo: "Descartar a denúncia?",
        texto: "O que você escreveu aqui será apagado e nada será enviado.",
        ok: "Descartar",
        voltar: "Continuar preenchendo",
      });
      if (!sim) return;
    }
    estado = "fechado";
    prints.travar(true);
    el.classList.add("cancelada");
    el.replaceChildren(h("p", { className: "nota", texto: "Denúncia cancelada. Nada foi enviado. Quando quiser, é só clicar em “Fazer denúncia”." }));
    aoCancelar?.();
  });

  // ---------- Resultado: protocolo e código (aparecem uma vez só) ----------
  function dado(rotulo, valor) {
    const copiar = h("button", { type: "button", className: "fantasma", texto: "Copiar" });
    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(valor);
        copiar.textContent = "Copiado";
      } catch {
        copiar.textContent = "Anote à mão";
      }
      setTimeout(() => (copiar.textContent = "Copiar"), 2000);
    });
    return h("div", { className: "dado" }, h("span", { className: "rotulo-dado", texto: rotulo }), h("code", { texto: valor }), copiar);
  }

  function mostrarResultado({ protocolo, codigo }) {
    el.classList.add("enviada");
    titulo.textContent = "Denúncia registrada";
    subtitulo.textContent = "Sua denúncia chegou aos analistas.";
    corpo.replaceChildren(
      h("p", { className: "aviso-codigo" }, h("strong", { texto: "Guarde estes dois dados agora." }), " Eles aparecem só desta vez e nem a equipe consegue recuperar o código."),
      dado("Protocolo", protocolo),
      dado("Código secreto", codigo),
      h("p", { className: "nota" }, "Com eles você acompanha o andamento em ", h("a", { href: "status.html", target: "_blank", rel: "noopener", texto: "Acompanhar denúncia" }), ".")
    );
  }

  return {
    el,
    aberto: () => estado === "preenchendo" || estado === "enviando",
    sujo,
    atualizarImagens: aoMudarPrints,
    focar() {
      // Mostra o formulário desde o começo (escudo e título), não o fim dele
      el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      relato.focus({ preventScroll: true });
    },
    mostrarInicio() {
      el.scrollIntoView({ block: "start" });
    },
  };
}
