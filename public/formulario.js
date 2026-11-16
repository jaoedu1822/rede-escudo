
// Formulário de denúncia que aparece DENTRO do chat.
// O escudo é o guia: o contorno vai se desenhando conforme a pessoa preenche, e as "pílulas" mostram
// o que ajuda nas provas (ID do usuário, link, servidor, data e hora). Só o relato é obrigatório.
// Feito para qualquer idade: passos numerados, ajuda em linguagem simples ao lado de cada campo ("O que é um ID?"),
// lista de dúvidas no fim e opção de letras maiores. Os textos de ajuda ficam em ajuda.js e plataformas.js.

import { PLATAFORMAS, NOMES_PLATAFORMAS, NOTA_GERAL } from "./plataformas.js";
import { GLOSSARIO, ajudaDoCampo } from "./ajuda.js";

const TIPOS = [
  { id: "id_usuario", rotulo: "Usuário ou ID" },
  { id: "link", rotulo: "Link ou convite" },
  { id: "servidor", rotulo: "Servidor ou grupo" },
  { id: "data_hora", rotulo: "Data e hora" },
];

const MIN_RELATO = 20;
const MAX_RELATO = 5000;
const MAX_PROVAS = 10;

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

// Botão de ajuda
let seqAjuda = 0;

function ajudaToggle(rotulo, conteudo) {
  const id = `ajuda-${++seqAjuda}`;
  const texto = h("span", { texto: rotulo() });

  const botao = h(
    "button",
    {
      type: "button",
      className: "ajuda-botao",
      "aria-expanded": "false",
      "aria-controls": id,
    },
    h("span", {
      className: "icone-ajuda",
      "aria-hidden": "true",
      texto: "?",
    }),
    texto
  );

  const painel = h("div", {
    className: "ajuda-painel",
    id,
    hidden: true,
  });

  const desenhar = () => {
    texto.textContent = rotulo();

    if (!painel.hidden) {
      painel.replaceChildren(...conteudo());
    }
  };

  botao.addEventListener("click", () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;

    botao.setAttribute("aria-expanded", String(abrir));

    if (abrir) {
      painel.replaceChildren(...conteudo());
    }
  });

  return {
    el: h("div", { className: "ajuda-wrap" }, botao, painel),
    desenhar,
  };
}

const itemDeAjuda = (e, comTitulo = true) =>
  h(
    "div",
    { className: "ajuda-item" },
    comTitulo ? h("h4", { texto: e.pergunta }) : null,
    ...e.resposta.map((t) => h("p", { texto: t }))
  );

/**
 * @param {object} o
 * @param {() => SVGElement} o.escudo
 * @param {(dados) => Promise<{protocolo: string, codigo: string}>} o.enviar
 * @param {(opcoes) => Promise<boolean>} o.confirmar
 * @param {() => void} [o.aoCancelar]
 * @param {(resultado) => void} [o.aoConcluir]
 * @param {() => {original: string|null, lida: string|null}[]} [o.imagens]
 */

export function criarFormulario({
  escudo,
  enviar,
  confirmar,
  aoCancelar,
  aoConcluir,
  imagens = () => [],
}) {
  let estado = "preenchendo";

  const abertoEm = performance.now();

  // ---------- Cabeçalho ----------

  const svg = escudo();
  const avanco = svg.querySelector(".avanco");

  const titulo = h("h2", {
    texto: "Denúncia anônima",
  });

  const subtitulo = h("p", {
    texto: "Só o relato é obrigatório. Não pedimos nome, e-mail nem telefone.",
  });

  const botaoLetras = h("button", {
    type: "button",
    className: "letras",
    "aria-pressed": "false",
    title: "Aumenta o tamanho das letras do formulário",
    texto: "Letras maiores",
  });

  const topo = h(
    "div",
    { className: "cd-topo" },
    svg,
    h("div", { className: "cd-titulos" }, titulo, subtitulo),
    botaoLetras
  );

  const corpo = h("div", { className: "cd-corpo" });

  const el = h(
    "article",
    {
      className: "cartao-denuncia",
      "aria-label": "Formulário de denúncia",
    },
    topo,
    corpo
  );

  botaoLetras.addEventListener("click", () => {
    const grande = el.classList.toggle("letras-grandes");

    botaoLetras.setAttribute("aria-pressed", String(grande));

    botaoLetras.textContent = grande
      ? "Letras normais"
      : "Letras maiores";
  });

  // ---------- Campos ----------

  const relato = h("textarea", {
    rows: "4",
    maxlength: String(MAX_RELATO),
    placeholder:
      "Ex.: Um grupo no Discord disse que vai espalhar minhas fotos se eu não pagar 200 reais.",
  });

  const ajudaRelato = ajudaToggle(
    () => ajudaDoCampo("relato")[0].pergunta,
    () => ajudaDoCampo("relato").map((e) => itemDeAjuda(e, false))
  );

  const contador = h("small", {
    className: "contador",
    texto: `0/${MAX_RELATO}`,
  });

  const plataforma = h("select");

  for (const p of NOMES_PLATAFORMAS) {
    plataforma.append(
      h("option", {
        value: p,
        texto: p,
      })
    );
  }

  const pista = (tipo) =>
    PLATAFORMAS[plataforma.value]?.pistas[tipo] ?? "";

  const listaProvas = h("div", { className: "provas" });

  const ajudasDasLinhas = [];

  const quantasProvas = () =>
    listaProvas.querySelectorAll(".prova").length;

  const passosDaPlataforma = () => {
    const a = PLATAFORMAS[plataforma.value].ajuda;

    return h(
      "div",
      { className: "ajuda-item ajuda-plataforma" },
      h("h4", { texto: a.titulo }),
      h("ol", {}, ...a.passos.map((t) => h("li", { texto: t }))),
      h("p", { texto: `${a.nota} ${NOTA_GERAL}` })
    );
  };

  const botaoAdd = h("button", {
    type: "button",
    className: "adicionar",
    texto: "+ Adicionar outra prova",
  });

  const pilulasEl = h("ul", {
    className: "pilulas",
    "aria-label": "O que já foi preenchido",
  });

  const pilulas = {};

  for (const [id, rotulo] of [
    ["relato", "Relato"],
    ...TIPOS.map((t) => [t.id, t.rotulo]),
  ]) {
    pilulas[id] = h("li", {
      className: "pilula",
      texto: rotulo,
    });

    pilulasEl.append(pilulas[id]);
  }

  const leitura = () =>
    [...listaProvas.querySelectorAll(".prova")].map((l) => ({
      tipo: l.querySelector("select").value,
      valor: l.querySelector("input").value.trim(),
    }));

  const sujo = () =>
    relato.value.trim() !== "" ||
    leitura().some((p) => p.valor !== "");

  function atualizar() {
    const relatoOk = relato.value.trim().length >= MIN_RELATO;

    const comValor = new Set(
      leitura()
        .filter((p) => p.valor)
        .map((p) => p.tipo)
    );

    pilulas.relato.classList.toggle("ok", relatoOk);

    for (const t of TIPOS) {
      pilulas[t.id].classList.toggle("ok", comValor.has(t.id));
    }

    const pontos =
      (relatoOk ? 40 : 0) +
      TIPOS.reduce(
        (s, t) => s + (comValor.has(t.id) ? 15 : 0),
        0
      );

    avanco.style.strokeDashoffset = String(100 - pontos);

    contador.textContent =
      `${relato.value.length}/${MAX_RELATO}`;

    botaoAdd.disabled = quantasProvas() >= MAX_PROVAS;
  }

  function novaLinha(tipo = "id_usuario") {
    const sel = h("select", {
      "aria-label": "Tipo de prova",
    });

    for (const t of TIPOS) {
      sel.append(
        h("option", {
          value: t.id,
          texto: t.rotulo,
        })
      );
    }

    sel.value = tipo;

    const inp = h("input", {
      type: "text",
      maxlength: "300",
      placeholder: pista(tipo),
      "aria-label": "Valor da prova",
    });

    const rem = h("button", {
      type: "button",
      className: "remover",
      "aria-label": "Remover esta prova",
      title: "Remover",
      texto: "×",
    });

    const linha = h("div", {
      className: "prova",
    }, sel, inp, rem);

    const ajuda = ajudaToggle(
      () =>
        ajudaDoCampo(sel.value)[0]?.pergunta ??
        "Preciso de ajuda com este campo",

      () => [
        ...ajudaDoCampo(sel.value).map((e, _, todas) =>
          itemDeAjuda(e, todas.length > 1)
        ),
        ...(sel.value === "id_usuario"
          ? [passosDaPlataforma()]
          : []),
      ]
    );

    ajudasDasLinhas.push(ajuda);

    const bloco = h(
      "div",
      { className: "prova-bloco" },
      linha,
      ajuda.el
    );

    sel.addEventListener("change", () => {
      inp.placeholder = pista(sel.value);
      ajuda.desenhar();
      atualizar();
    });

    inp.addEventListener("input", atualizar);

    rem.addEventListener("click", () => {
      ajudasDasLinhas.splice(
        ajudasDasLinhas.indexOf(ajuda),
        1
      );

      bloco.remove();
      atualizar();
    });

    listaProvas.append(bloco);

    return inp;
  }

  for (const t of TIPOS) {
    novaLinha(t.id);
  }

  botaoAdd.addEventListener("click", () => {
    if (quantasProvas() < MAX_PROVAS) {
      novaLinha("id_usuario").focus();
    }

    atualizar();
  });

  relato.addEventListener("input", atualizar);

  function trocouPlataforma() {
    for (const linha of listaProvas.querySelectorAll(".prova")) {
      linha.querySelector("input").placeholder = pista(
        linha.querySelector("select").value
      );
    }

    for (const a of ajudasDasLinhas) {
      a.desenhar();
    }
  }

  plataforma.addEventListener("change", trocouPlataforma);

  // ---------- Prints enviados no chat ----------

  const marcar = h("input", {
    type: "checkbox",
    id: `guardar-codigo-${++seqAjuda}`,
    checked: true,
  });

  const marcarRotulo = h(
    "label",
    { className: "marcar", for: marcar.id },
    marcar,
    h("span", {
      texto: "Guardar o código dos meus prints junto com a denúncia",
    })
  );

  const textoPrints = h("p", {
    className: "prints-texto",
  });

  const ajudaPrint = ajudaToggle(
    () => GLOSSARIO.find((e) => e.id === "print").pergunta,
    () => [
      itemDeAjuda(
        GLOSSARIO.find((e) => e.id === "print"),
        false
      ),
    ]
  );

  const ajudaHash = ajudaToggle(
    () => GLOSSARIO.find((e) => e.id === "hash").pergunta,
    () => [
      itemDeAjuda(
        GLOSSARIO.find((e) => e.id === "hash"),
        false
      ),
    ]
  );

  const blocoPrints = h(
    "div",
    { className: "prints-bloco" },
    h("h4", { texto: "Prints" }),
    textoPrints,
    marcarRotulo,
    ajudaPrint.el,
    ajudaHash.el
  );

  const codigosDosPrints = () =>
    imagens().filter((i) => i && (i.original || i.lida));

  function desenharPrints() {
    const n = codigosDosPrints().length;

    textoPrints.textContent = n
      ? `Você enviou ${n} print${n > 1 ? "s" : ""} na conversa. Podemos guardar só o código (a “impressão digital”) ${n > 1 ? "de cada um" : "dele"}, nunca a imagem.`
      : "Quer incluir prints? Envie pelo botão de clipe, ao lado da caixa de mensagem. Eles são lidos só aqui, no computador do projeto, e a imagem não é guardada. Se quiser, guardamos só o código (a “impressão digital”) de cada print.";

    marcarRotulo.hidden = n === 0;

    blocoPrints.classList.toggle("com-prints", n > 0);
  }

  desenharPrints();

  // ---------- Dúvidas ----------

  const duvidas = h(
    "section",
    { className: "duvidas" },
    h("h3", {
      className: "passo-titulo",
      texto: "Ainda tem dúvidas?",
    }),

    ...GLOSSARIO.map((e) =>
      h(
        "details",
        { className: "duvida" },
        h("summary", { texto: e.pergunta }),
        ...e.resposta.map((t) => h("p", { texto: t }))
      )
    )
  );

  // Campo-isca anti-robô
  const isca = h("input", {
    type: "text",
    name: "isca",
    tabindex: "-1",
    autocomplete: "off",
    "aria-hidden": "true",
    className: "isca",
  });

  const erro = h("p", {
    className: "cd-erro",
    role: "alert",
    hidden: true,
  });

  const mostrarErro = (t) => {
    erro.textContent = t;
    erro.hidden = false;
  };

  const botaoEnviar = h("button", {
    type: "submit",
    className: "primario",
    texto: "Enviar denúncia",
  });

  const botaoCancelar = h("button", {
    type: "button",
    className: "fantasma",
    texto: "Cancelar",
  });

  // ---------- Formulário ----------

  const form = h(
    "form",
    {
      className: "cd-form",
      novalidate: true,
    },

    isca,
    pilulasEl,

    h(
      "section",
      { className: "passo" },
      h("h3", {
        className: "passo-titulo",
        texto: "1. Conte o que aconteceu",
      }),

      h(
        "label",
        { className: "campo" },
        h("span", { texto: "O que aconteceu?" }),
        h("small", {
          className: "dica",
          texto: "Escreva do seu jeito. Não precisa ser perfeito.",
        }),
        relato,
        contador
      ),

      ajudaRelato.el
    ),

    h(
      "section",
      { className: "passo" },
      h("h3", {
        className: "passo-titulo",
        texto: "2. Onde isso aconteceu?",
      }),

      h(
        "label",
        { className: "campo" },
        h("span", { texto: "Aplicativo ou site" }),
        h("small", {
          className: "dica",
          texto: "Se não achar o seu na lista, escolha “Outra”.",
        }),
        plataforma
      )
    ),

    h(
      "section",
      { className: "passo" },
      h("h3", {
        className: "passo-titulo",
        texto: "3. Provas que você já tem (pode pular)",
      }),

      h("small", {
        className: "dica",
        texto: "Tudo opcional. Quanto mais informação, mais fácil para os analistas. Em dúvida? Toque no botão com “?” embaixo de cada campo.",
      }),

      listaProvas,
      botaoAdd,
      blocoPrints
    ),

    duvidas,
    erro,

    h(
      "div",
      { className: "cd-acoes" },
      botaoCancelar,
      botaoEnviar
    )
  );

  corpo.append(form);
  atualizar();

  // Enter dentro de um campo de uma linha NÃO envia a denúncia
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  });

  function travar(sim) {
    for (const c of form.querySelectorAll(
      "textarea, input, select, button"
    )) {
      c.disabled = sim;
    }

    if (!sim) atualizar();
  }

  // ---------- Envio ----------

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (estado !== "preenchendo") return;

    erro.hidden = true;

    const texto = relato.value.trim();

    if (texto.length < MIN_RELATO) {
      mostrarErro(
        "Conte um pouco mais do que aconteceu (pelo menos 20 letras). Pode ser sem formalidade."
      );

      relato.focus();
      return;
    }

    estado = "enviando";
    travar(true);

    svg.classList.add("pensando");
    botaoEnviar.textContent = "Enviando...";

    try {
      const r = await enviar({
        relato: texto,
        plataforma: plataforma.value,
        evidencias: leitura().filter((p) => p.valor),

        ...(marcar.checked && codigosDosPrints().length
          ? {
              imagens: codigosDosPrints().map((i) => ({
                original: i.original ?? null,
                lida: i.lida ?? null,
              })),
            }
          : {}),

        isca: isca.value,

        segundos: Math.round(
          (performance.now() - abertoEm) / 1000
        ),
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

      mostrarErro(
        err?.message ||
        "Não consegui enviar agora. Tente de novo em instantes."
      );
    }
  });

  // ---------- Cancelamento ----------

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

    el.classList.add("cancelada");

    el.replaceChildren(
      h("p", {
        className: "nota",
        texto: "Denúncia cancelada. Nada foi enviado. Quando quiser, é só clicar em “Fazer denúncia”.",
      })
    );

    aoCancelar?.();
  });

  // ---------- Resultado ----------

  function dado(rotulo, valor) {
    const copiar = h("button", {
      type: "button",
      className: "fantasma",
      texto: "Copiar",
    });

    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(valor);
        copiar.textContent = "Copiado";
      } catch {
        copiar.textContent = "Anote à mão";
      }

      setTimeout(() => {
        copiar.textContent = "Copiar";
      }, 2000);
    });

    return h(
      "div",
      { className: "dado" },
      h("span", {
        className: "rotulo-dado",
        texto: `${rotulo}:`,
      }),
      h("code", { texto: valor }),
      copiar
    );
  }

  function mostrarResultado({ protocolo, codigo }) {
    el.classList.add("enviada");

    titulo.textContent = "Denúncia registrada";

    subtitulo.textContent =
      "Sua denúncia chegou aos analistas.";

    corpo.replaceChildren(
      h(
        "p",
        { className: "aviso-codigo" },
        h("strong", {
          texto: "Guarde estes dois dados agora.",
        }),
        " Eles aparecem só desta vez e nem a equipe consegue recuperar o código."
      ),

      dado("Protocolo", protocolo),
      dado("Código secreto", codigo)
    );
  }

  // =====================================================
  // CORREÇÃO DA ROLAGEM
  // Controla diretamente a rolagem da área .chat.
  // =====================================================

  function posicionarNoTopo(behavior = "auto") {
    const chat = el.closest(".chat");

    // Caso não encontre a área .chat, utiliza o método convencional.
    if (!chat) {
      el.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior,
      });

      return;
    }

    const ajustarRolagem = () => {
      // Evita tentar posicionar um formulário que já foi removido.
      if (!el.isConnected || !chat.isConnected) return;

      const topoChat = chat.getBoundingClientRect();
      const topoFormulario = el.getBoundingClientRect();

      // Calcula a posição do formulário dentro da área rolável.
      const deslocamento =
        topoFormulario.top -
        topoChat.top -
        chat.clientTop;

      const destino =
        chat.scrollTop + deslocamento - 8;

      // Move somente a área de conversa, não a página inteira.
      chat.scrollTo({
        top: Math.max(0, destino),
        behavior,
      });
    };

    // Aguarda dois quadros para garantir que o formulário
    // já esteja inserido e que o navegador tenha calculado o layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(ajustarRolagem);
    });
  }

  // ---------- Retorno ----------

  return {
    el,

    aberto: () =>
      estado === "preenchendo" || estado === "enviando",

    sujo,

    atualizarImagens: desenharPrints,

    focar() {
      const movimentoReduzido = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      posicionarNoTopo(
        movimentoReduzido ? "auto" : "smooth"
      );

      // Coloca o cursor no relato sem provocar nova rolagem.
      relato.focus({ preventScroll: true });
    },

    mostrarInicio() {
      posicionarNoTopo("auto");
    },
  };
}
