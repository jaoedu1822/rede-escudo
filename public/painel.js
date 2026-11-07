// Painel do analista da Rede Escudo.
// Regras de segurança desta página:
//  - Nada de innerHTML: todo texto vindo de uma denúncia entra por textContent (a vítima pode escrever qualquer coisa).
//  - Links de provas aparecem só como TEXTO, nunca como link clicável.
//  - Quem muda o banco é o analista (status, quarentena). A IA só sugere categoria e urgência.

const ROTULO_STATUS = { recebida: "Recebida", em_analise: "Em análise", encaminhada: "Encaminhada", encerrada: "Encerrada" };
const STATUS_ABERTOS = ["recebida", "em_analise"];
const ROTULO_URGENCIA = { critica: "Urgência crítica", alta: "Urgência alta", media: "Urgência média", baixa: "Urgência baixa" };
const ROTULO_CATEGORIA = {
  extorsao: "Extorsão", aliciamento: "Aliciamento", ameaca: "Ameaça", divulgacao_de_imagens: "Divulgação de imagens",
  golpe: "Golpe", incitacao_automutilacao: "Incitação à automutilação", outro: "Outro",
};
const ROTULO_PROVA = {
  id_usuario: "Usuário ou ID", link: "Link ou convite", servidor: "Servidor ou grupo", data_hora: "Data e hora",
  hash_original: "Arquivo original (calculado no navegador da vítima)", hash_copia_lida: "Cópia reduzida lida pela IA (calculado no servidor)",
};
const FAIXAS = [
  { min: 85, id: "critica", rotulo: "Crítica" },
  { min: 60, id: "alta", rotulo: "Alta" },
  { min: 35, id: "media", rotulo: "Média" },
  { min: 0, id: "baixa", rotulo: "Baixa" },
];
const PESO_URGENCIA = { critica: 90, alta: 70, media: 50, baixa: 20 }; // só para o modo antigo (banco sem a fila de prioridade)
const MS_DIA = 86_400_000;
// ?intervalo=2 (em segundos) serve só para os testes; o normal é atualizar a cada 30 s
const INTERVALO_MS = Math.max(2, Number(new URLSearchParams(location.search).get("intervalo")) || 30) * 1000;

const $ = (id) => document.getElementById(id);
const el = {
  atualizado: $("atualizado"), atualizar: $("atualizar"), comoFunciona: $("como-funciona"),
  rAbertas: $("r-abertas"), rCriticas: $("r-criticas"), rEspera: $("r-espera"), rQuarentena: $("r-quarentena"),
  aviso: $("aviso"), avisoRapido: $("aviso-rapido"),
  abaFila: $("aba-fila"), abaQuarentena: $("aba-quarentena"), nFila: $("n-fila"), nQuarentena: $("n-quarentena"),
  fStatus: $("f-status"), fOrdem: $("f-ordem"), fBusca: $("f-busca"),
  notaQuarentena: $("nota-quarentena"), painelLista: $("painel-lista"), lista: $("lista"), vazio: $("vazio"), rodape: $("rodape-lista"),
  detalhe: $("detalhe"), detSobre: $("det-sobre"), detTitulo: $("det-titulo"), detMeta: $("det-meta"), detCorpo: $("det-corpo"), detAcoes: $("det-acoes"), detFechar: $("det-fechar"),
  ajuda: $("ajuda"), ajFechar: $("aj-fechar"),
  confirmar: $("confirmar"), confTitulo: $("conf-titulo"), confTexto: $("conf-texto"), confOk: $("conf-ok"), confVoltar: $("conf-voltar"),
};

const estado = {
  lista: [], aba: "fila", status: "abertas", busca: "", ordem: "prioridade",
  antigo: false, carregou: false, carregando: false, refazer: false, parou: false, falhou: false,
  vistos: new Set(), novas: new Set(), abertoId: null, ultimaAtualizacao: 0,
};
let sequenciaDetalhe = 0;

// ---------- Utilidades ----------
// Cria elementos sem innerHTML
function h(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "className") e.className = v;
    else if (k === "texto") e.textContent = v;
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...filhos.filter((f) => f != null));
  return e;
}
const normalizar = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tempo = (d) => Date.parse(d?.criado_em) || 0;
const ehQuarentena = (d) => Number(d.quarentena) === 1;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function faixaDe(d) {
  const nota = estado.antigo ? PESO_URGENCIA[d.urgencia] ?? 40 : Number(d.prioridade) || 0;
  return FAIXAS.find((f) => nota >= f.min);
}
const peso = (d) => (estado.antigo ? PESO_URGENCIA[d.urgencia] ?? 40 : Number(d.prioridade) || 0);

function quando(iso) {
  const t = Date.parse(iso);
  if (!t) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${plural(dias, "dia", "dias")}`;
}
const dataCompleta = (iso) => (Date.parse(iso) ? new Date(iso).toLocaleString("pt-BR") : "");
const semResposta = (d) => d.status === "recebida" && tempo(d) > 0 && Date.now() - tempo(d) > MS_DIA;
const hora = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// "urgência alta (+50); categoria extorsao (+8); suspeita 70: texto de teste; a IA achou que parece trote"
const ehMotivoDePrioridade = (m) => /^(urgência |categoria |\d+ tipo\(s\) de prova|relato detalhado|suspeita de spam \(-|risco de vida)/.test(m);
const separarMotivos = (motivos) => {
  const partes = String(motivos ?? "").split(";").map((m) => m.trim()).filter(Boolean);
  return { prioridade: partes.filter(ehMotivoDePrioridade), suspeita: partes.filter((m) => !ehMotivoDePrioridade(m)) };
};

// ---------- Rede ----------
async function api(caminho, { metodo = "GET", corpo } = {}) {
  const r = await fetch(caminho, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  if (r.status === 204) return null;
  let dados = null;
  try {
    dados = await r.json();
  } catch {
    /* algumas respostas de erro não têm corpo */
  }
  if (!r.ok) {
    const e = new Error(dados?.erro || (r.status === 401 ? "A senha não foi aceita." : r.status === 404 ? "Não encontrei esta denúncia." : "O servidor não conseguiu fazer isso agora."));
    e.status = r.status;
    throw e;
  }
  return dados;
}

// ---------- Avisos ----------
let tempoAviso = null;
function avisarRapido(texto) {
  el.avisoRapido.textContent = texto;
  el.avisoRapido.hidden = false;
  clearTimeout(tempoAviso);
  tempoAviso = setTimeout(() => (el.avisoRapido.hidden = true), 5000);
}
function mostrarAviso(texto, { erro = false, botao = null } = {}) {
  el.aviso.className = erro ? "aviso erro" : "aviso";
  el.aviso.replaceChildren(h("span", { texto }), ...(botao ? [botao] : []));
  el.aviso.hidden = false;
}
const esconderAviso = () => (el.aviso.hidden = true);

function confirmar({ titulo, texto, ok, voltar }) {
  el.confTitulo.textContent = titulo;
  el.confTexto.textContent = texto;
  el.confOk.textContent = ok;
  el.confVoltar.textContent = voltar;
  return new Promise((resolver) => {
    el.confirmar.addEventListener("close", () => resolver(el.confirmar.returnValue === "sim"), { once: true });
    el.confirmar.returnValue = "nao";
    el.confirmar.showModal();
  });
}

// ---------- Carregar a lista ----------
async function recarregar({ silencioso = false } = {}) {
  if (estado.parou) return;
  if (estado.carregando) {
    estado.refazer = true; // já tem uma atualização em andamento; pede outra assim que ela acabar (a lista pode ter ficado velha)
    return;
  }
  estado.carregando = true;
  el.atualizar.disabled = true;
  if (!estado.carregou && estado.falhou) {
    estado.falhou = false;
    desenharTudo(); // mostra "Carregando..." de novo enquanto tenta outra vez
  }
  try {
    const lista = await api("/api/admin/denuncias");
    if (!Array.isArray(lista)) throw new Error("Resposta inesperada do servidor.");
    estado.antigo = lista.length > 0 && lista.every((d) => !("prioridade" in d));
    const ids = new Set(lista.map((d) => d.id));
    if (estado.carregou) for (const d of lista) if (!estado.vistos.has(d.id)) estado.novas.add(d.id);
    estado.novas = new Set([...estado.novas].filter((id) => ids.has(id)));
    const novasNaFila = lista.filter((d) => estado.carregou && !estado.vistos.has(d.id) && !ehQuarentena(d)).length;
    estado.vistos = ids;
    estado.lista = lista;
    estado.carregou = true;
    estado.ultimaAtualizacao = Date.now();
    el.atualizado.textContent = `Atualizado às ${hora(estado.ultimaAtualizacao)}`;
    esconderAviso();
    if (novasNaFila) avisarRapido(`${plural(novasNaFila, "nova denúncia chegou", "novas denúncias chegaram")} na fila.`);
    desenharTudo();
  } catch (e) {
    if (e.status === 401) {
      estado.parou = true;
      const recarregarPagina = h("button", { className: "botao", type: "button", texto: "Recarregar a página" });
      recarregarPagina.addEventListener("click", () => location.reload());
      mostrarAviso("A senha não foi aceita ou a sessão acabou. Recarregue a página e entre com o usuário analista.", { erro: true, botao: recarregarPagina });
      if (!estado.carregou) {
        estado.falhou = true;
        el.vazio.hidden = true;
      }
    } else if (!estado.carregou) {
      const tentar = h("button", { className: "botao", type: "button", texto: "Tentar de novo" });
      tentar.addEventListener("click", () => {
        tentar.disabled = true;
        recarregar();
      });
      mostrarAviso(`Não consegui carregar as denúncias: ${e.message}`, { erro: true, botao: tentar });
      estado.falhou = true;
      el.vazio.hidden = true;
    } else if (!silencioso) {
      mostrarAviso(`Não consegui atualizar agora (${e.message}). Mostrando a lista de ${hora(estado.ultimaAtualizacao)}.`, { erro: true });
    } else {
      mostrarAviso(`Sem conexão com o servidor. Mostrando a lista de ${hora(estado.ultimaAtualizacao)}; tento de novo sozinho.`, { erro: true });
    }
  } finally {
    estado.carregando = false;
    el.atualizar.disabled = false;
    if (estado.refazer) {
      estado.refazer = false;
      recarregar({ silencioso });
    }
  }
}

// ---------- Filtros e ordem ----------
function visiveis() {
  const quarentena = estado.aba === "quarentena";
  let l = estado.lista.filter((d) => ehQuarentena(d) === quarentena);
  if (estado.status === "abertas") l = l.filter((d) => STATUS_ABERTOS.includes(d.status));
  else if (estado.status !== "todas") l = l.filter((d) => d.status === estado.status);
  const q = normalizar(estado.busca).trim();
  if (q) l = l.filter((d) => normalizar([d.protocolo, d.resumo, ROTULO_CATEGORIA[d.categoria], d.plataforma].join(" ")).includes(q));
  const ordens = {
    prioridade: (a, b) => peso(b) - peso(a) || tempo(a) - tempo(b),
    recentes: (a, b) => tempo(b) - tempo(a),
    antigas: (a, b) => tempo(a) - tempo(b),
    "menos-suspeitas": (a, b) => (Number(a.suspeita_spam) || 0) - (Number(b.suspeita_spam) || 0) || peso(b) - peso(a),
  };
  return l.sort(ordens[estado.ordem] ?? ordens.prioridade);
}

function desenharOrdem() {
  if (el.fOrdem.dataset.aba === estado.aba && el.fOrdem.options.length) return;
  el.fOrdem.dataset.aba = estado.aba;
  const opcoes = [["prioridade", "Mais prioritárias"], ["recentes", "Mais recentes"], ["antigas", "Mais antigas"]];
  if (estado.aba === "quarentena") opcoes.push(["menos-suspeitas", "Menos suspeitas"]);
  if (!opcoes.some(([v]) => v === estado.ordem)) estado.ordem = "prioridade";
  el.fOrdem.replaceChildren(...opcoes.map(([v, t]) => h("option", { value: v, texto: t })));
  el.fOrdem.value = estado.ordem;
}

// ---------- Desenhar ----------
function criarItem(d) {
  const faixa = faixaDe(d);
  const prio = h("span", { className: "prio" }, ...(estado.antigo ? [] : [h("b", { texto: String(Number(d.prioridade) || 0) })]), h("small", { texto: faixa.rotulo }));
  const linha1 = h("span", { className: "item-linha" },
    h("span", { className: "protocolo", texto: d.protocolo }),
    d.plataforma ? h("span", { className: "chip", texto: d.plataforma }) : null,
    h("span", { className: "chip", texto: ROTULO_CATEGORIA[d.categoria] ?? d.categoria ?? "Sem categoria" }),
    h("span", { className: `chip status-${d.status}`, texto: ROTULO_STATUS[d.status] ?? d.status ?? "" }),
    ehQuarentena(d) && Number(d.suspeita_spam) ? h("span", { className: "chip suspeita", texto: `Suspeita ${d.suspeita_spam}` }) : null,
    estado.novas.has(d.id) ? h("span", { className: "pilula-nova", texto: "Nova" }) : null
  );
  const meta = h("span", { className: "item-meta", title: dataCompleta(d.criado_em) }, quando(d.criado_em));
  if (semResposta(d)) meta.append(" · ", h("span", { className: "espera-longa", texto: "sem resposta" }));
  const porque = ehQuarentena(d) ? separarMotivos(d.motivos).suspeita.join("; ") : "";
  const corpo = h("span", { className: "item-corpo" }, linha1, h("span", { className: "item-resumo", texto: d.resumo || "(sem resumo)" }), meta,
    porque ? h("span", { className: "item-meta", texto: `Por que está aqui: ${porque}` }) : null);
  const botao = h("button", { type: "button", className: "item-botao", "aria-haspopup": "dialog" }, prio, corpo);
  botao.addEventListener("click", () => abrirDetalhe(d.id));
  return h("li", { className: `item faixa-${faixa.id}${estado.novas.has(d.id) ? " nova" : ""}`, "data-id": String(d.id) }, botao);
}

function desenharTudo() {
  if (!estado.carregou) {
    el.vazio.textContent = "Carregando as denúncias...";
    el.vazio.hidden = estado.falhou; // se deu erro, quem fala é o aviso lá em cima
    el.rodape.textContent = "";
    return;
  }
  const todas = estado.lista;
  const abertas = todas.filter((d) => STATUS_ABERTOS.includes(d.status));
  const naFila = abertas.filter((d) => !ehQuarentena(d));
  const naQuarentena = abertas.filter(ehQuarentena);
  el.rAbertas.textContent = String(naFila.length);
  el.rCriticas.textContent = String(naFila.filter((d) => faixaDe(d).id === "critica").length);
  el.rEspera.textContent = String(naFila.filter(semResposta).length);
  el.rQuarentena.textContent = estado.antigo ? "–" : String(naQuarentena.length);
  el.nFila.textContent = String(naFila.length);
  el.nQuarentena.textContent = String(naQuarentena.length);
  el.abaQuarentena.hidden = estado.antigo;
  if (estado.antigo && estado.aba === "quarentena") estado.aba = "fila";
  desenharAbas();
  desenharOrdem();

  if (estado.antigo) mostrarAviso("A fila de prioridade ainda não está ligada no banco (modo antigo). A lista está ordenada pela urgência e a quarentena fica indisponível.");

  const dados = visiveis();
  // não perde o lugar de quem está navegando por teclado
  const focoId = el.lista.contains(document.activeElement) ? document.activeElement.closest("li")?.dataset.id : null;
  el.lista.replaceChildren(...dados.slice(0, 200).map(criarItem));
  if (focoId) el.lista.querySelector(`li[data-id="${CSS.escape(focoId)}"] button`)?.focus({ preventScroll: true });

  const total = todas.filter((d) => ehQuarentena(d) === (estado.aba === "quarentena")).length;
  el.vazio.hidden = dados.length > 0;
  if (!dados.length) {
    el.vazio.textContent = !estado.carregou
      ? "Carregando as denúncias..."
      : total === 0
        ? estado.aba === "quarentena" ? "Nenhuma denúncia na quarentena. Tudo certo por aqui." : "Nenhuma denúncia na fila ainda."
        : "Nenhuma denúncia com estes filtros. Mude o status ou limpe a busca.";
  }
  el.rodape.textContent = dados.length
    ? `Mostrando ${Math.min(dados.length, 200)} de ${dados.length} nesta fila${dados.length > 200 ? " (refine os filtros para ver as outras)" : ""}.${todas.length >= 500 ? " O servidor entrega no máximo 500 denúncias por vez." : ""}`
    : "";
  atualizarTitulo();
}

function desenharAbas() {
  const naQuarentena = estado.aba === "quarentena";
  el.abaFila.setAttribute("aria-selected", String(!naQuarentena));
  el.abaFila.tabIndex = naQuarentena ? -1 : 0;
  el.abaQuarentena.setAttribute("aria-selected", String(naQuarentena));
  el.abaQuarentena.tabIndex = naQuarentena ? 0 : -1;
  el.painelLista.setAttribute("aria-labelledby", naQuarentena ? "aba-quarentena" : "aba-fila");
  el.notaQuarentena.hidden = !naQuarentena;
}

function atualizarTitulo() {
  const novas = [...estado.novas].filter((id) => estado.lista.some((d) => d.id === id && !ehQuarentena(d))).length;
  document.title = `${novas ? `(${novas}) ` : ""}Painel do analista | Rede Escudo`;
}

// ---------- Detalhe ----------
function selosDe(d) {
  const faixa = faixaDe(d);
  return h("div", { className: "selos" },
    h("span", { className: `selo faixa-${faixa.id}`, texto: estado.antigo ? faixa.rotulo : `${faixa.rotulo} ${Number(d.prioridade) || 0}` }),
    h("span", { className: "chip", texto: ROTULO_URGENCIA[d.urgencia] ?? d.urgencia ?? "" }),
    h("span", { className: "chip", texto: ROTULO_CATEGORIA[d.categoria] ?? d.categoria ?? "" }),
    d.plataforma ? h("span", { className: "chip", texto: d.plataforma }) : null
  );
}

function botaoCopiar(valor) {
  const b = h("button", { type: "button", className: "copiar", texto: "Copiar" });
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(valor);
      b.textContent = "Copiado";
    } catch {
      b.textContent = "Selecione e copie";
    }
    setTimeout(() => (b.textContent = "Copiar"), 2000);
  });
  return b;
}
const linhaDeProva = (e) => h("li", { className: "prova" }, h("span", { className: "rotulo", texto: ROTULO_PROVA[e.tipo] ?? e.tipo }), h("code", { texto: e.valor }), botaoCopiar(e.valor));
const bloco = (titulo, ...filhos) => h("section", { className: "bloco" }, h("h3", { texto: titulo }), ...filhos);

function desenharCabecalhoDetalhe(d) {
  el.detSobre.textContent = ehQuarentena(d) ? "Denúncia em quarentena" : "Denúncia";
  el.detTitulo.textContent = d.protocolo ?? "";
  el.detMeta.textContent = [dataCompleta(d.criado_em), quando(d.criado_em)].filter(Boolean).join(" · ");
}

function desenharDetalhe(d) {
  desenharCabecalhoDetalhe(d);
  const motivos = separarMotivos(d.motivos);
  const partes = [selosDe(d)];
  if (ehQuarentena(d)) partes.push(h("p", { className: "faixa-quarentena", texto: "Esta denúncia está na quarentena porque parece spam, trote ou robô. Nada foi apagado. Se for de uma vítima de verdade, clique em Liberar." }));
  partes.push(
    bloco("Resumo feito pela IA", h("p", { texto: d.resumo || "(sem resumo)" }), h("p", { className: "dica", texto: "A IA só resume e sugere. Confira sempre com o relato." })),
    bloco("Relato da vítima", h("div", { className: "relato", texto: d.relato || "(vazio)" }))
  );
  if (d.evidencias?.length) {
    partes.push(bloco("Provas informadas", h("ul", { className: "provas" }, ...d.evidencias.map(linhaDeProva)), h("p", { className: "dica", texto: "Links aparecem só como texto, de propósito: não abra sem cuidado." })));
  }
  if (d.hashes?.length) {
    partes.push(bloco("Códigos dos prints (SHA-256)", h("ul", { className: "provas" }, ...d.hashes.map(linhaDeProva)),
      h("p", { className: "dica", texto: "A imagem não foi guardada, só o código. Para conferir um arquivo entregue pela vítima, no Windows: Get-FileHash arquivo.png -Algorithm SHA256. Se for igual ao do arquivo original, o arquivo não foi alterado." })));
  }
  if (motivos.prioridade.length) partes.push(bloco("Por que está nesta posição da fila", h("ul", { className: "motivos" }, ...motivos.prioridade.map((m) => h("li", { texto: m })))));
  if (motivos.suspeita.length) partes.push(bloco("Sinais de spam e observações", h("ul", { className: "motivos" }, ...motivos.suspeita.map((m) => h("li", { texto: m })))));
  el.detCorpo.replaceChildren(...partes);
  desenharAcoes(d);
}

function desenharAcoes(d) {
  const msg = h("span", { className: "status-msg", role: "status" });
  const seletor = h("select", { id: "det-status", "aria-label": "Status da denúncia" }, ...Object.entries(ROTULO_STATUS).map(([v, t]) => h("option", { value: v, texto: t })));
  seletor.value = d.status;
  seletor.addEventListener("change", () => mudarStatus(d, seletor, msg));
  const relatorio = h("a", { className: "botao fantasma", href: `/api/admin/relatorio/${encodeURIComponent(d.id)}`, target: "_blank", rel: "noopener", texto: "Abrir relatório para encaminhar" });
  const filhos = [h("label", { className: "filtro" }, h("span", { texto: "Status" }), seletor), msg, h("span", { className: "espaco" }), relatorio];
  if (!estado.antigo) {
    const q = ehQuarentena(d);
    const b = h("button", { type: "button", className: q ? "botao" : "botao fantasma", id: "det-quarentena", texto: q ? "Liberar para a fila principal" : "Mandar para a quarentena" });
    b.addEventListener("click", () => alternarQuarentena(d, !q, b));
    filhos.push(b);
  }
  el.detAcoes.replaceChildren(...filhos);
}

async function abrirDetalhe(id) {
  const base = estado.lista.find((d) => d.id === id);
  if (!base) return;
  estado.abertoId = id;
  estado.novas.delete(id);
  atualizarTitulo();
  desenharCabecalhoDetalhe(base);
  el.detCorpo.replaceChildren(h("p", { className: "carregando", texto: "Carregando a denúncia..." }));
  el.detAcoes.replaceChildren();
  if (!el.detalhe.open) el.detalhe.showModal();
  const minha = ++sequenciaDetalhe;
  try {
    const d = await api(`/api/admin/denuncias/${encodeURIComponent(id)}`);
    if (minha !== sequenciaDetalhe) return; // a pessoa já abriu outra
    desenharDetalhe(d);
  } catch (e) {
    if (minha !== sequenciaDetalhe) return;
    const tentar = h("button", { type: "button", className: "botao", texto: "Tentar de novo" });
    tentar.addEventListener("click", () => abrirDetalhe(id));
    el.detCorpo.replaceChildren(h("p", { className: "erro-det", role: "alert", texto: `Não consegui abrir esta denúncia: ${e.message}` }), tentar);
  }
}

function fecharDetalhe() {
  if (el.detalhe.open) el.detalhe.close();
}
el.detalhe.addEventListener("close", () => {
  const id = estado.abertoId;
  estado.abertoId = null;
  sequenciaDetalhe++;
  desenharTudo(); // tira a marca "Nova" do item aberto
  if (id != null) {
    // devolve o foco ao item que estava aberto; se ele saiu da lista (mudou de status ou de fila), vai para a aba
    const botaoDoItem = el.lista.querySelector(`li[data-id="${CSS.escape(String(id))}"] button`);
    (botaoDoItem ?? (estado.aba === "fila" ? el.abaFila : el.abaQuarentena)).focus({ preventScroll: true });
  }
});
// clicar fora da janela (no fundo escuro) também fecha
el.detalhe.addEventListener("click", (e) => {
  if (e.target === el.detalhe) fecharDetalhe();
});
el.detFechar.addEventListener("click", fecharDetalhe);

async function mudarStatus(d, seletor, msg) {
  const anterior = d.status;
  const novo = seletor.value;
  seletor.disabled = true;
  msg.textContent = "Salvando...";
  try {
    await api(`/api/admin/denuncias/${encodeURIComponent(d.id)}/status`, { metodo: "POST", corpo: { status: novo } });
    d.status = novo;
    const naLista = estado.lista.find((x) => x.id === d.id);
    if (naLista) naLista.status = novo;
    msg.textContent = `Status salvo: ${ROTULO_STATUS[novo]}.`;
    desenharTudo();
  } catch (e) {
    seletor.value = anterior;
    msg.textContent = `Não salvei: ${e.message}`;
  } finally {
    seletor.disabled = false;
  }
}

async function alternarQuarentena(d, enviar, botao) {
  if (enviar) {
    const sim = await confirmar({
      titulo: "Mandar para a quarentena?",
      texto: `${d.protocolo} sai da fila principal e vai para a aba Quarentena.\nNada é apagado e você pode liberar depois.`,
      ok: "Mandar para a quarentena",
      voltar: "Cancelar",
    });
    if (!sim) return;
  }
  botao.disabled = true;
  try {
    await api(`/api/admin/denuncias/${encodeURIComponent(d.id)}/quarentena`, { metodo: "POST", corpo: { quarentena: enviar } });
    fecharDetalhe();
    avisarRapido(enviar ? `${d.protocolo} foi para a quarentena.` : `${d.protocolo} voltou para a fila principal.`);
    await recarregar();
  } catch (e) {
    botao.disabled = false;
    el.detAcoes.querySelector(".status-msg").textContent = e.status === 409 ? "A fila de prioridade ainda não está ligada no banco." : `Não consegui: ${e.message}`;
  }
}

// ---------- Eventos ----------
function trocarAba(aba) {
  estado.aba = aba;
  desenharTudo();
}
el.abaFila.addEventListener("click", () => trocarAba("fila"));
el.abaQuarentena.addEventListener("click", () => trocarAba("quarentena"));
for (const aba of [el.abaFila, el.abaQuarentena]) {
  aba.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) || el.abaQuarentena.hidden) return;
    e.preventDefault();
    const alvo = e.key === "ArrowLeft" || e.key === "Home" ? "fila" : "quarentena";
    trocarAba(alvo);
    (alvo === "fila" ? el.abaFila : el.abaQuarentena).focus();
  });
}
el.fStatus.addEventListener("change", () => { estado.status = el.fStatus.value; desenharTudo(); });
el.fOrdem.addEventListener("change", () => { estado.ordem = el.fOrdem.value; desenharTudo(); });
let tempoBusca = null;
el.fBusca.addEventListener("input", () => {
  clearTimeout(tempoBusca);
  tempoBusca = setTimeout(() => { estado.busca = el.fBusca.value; desenharTudo(); }, 120);
});
el.atualizar.addEventListener("click", () => recarregar());
el.comoFunciona.addEventListener("click", () => el.ajuda.showModal());
el.ajFechar.addEventListener("click", () => el.ajuda.close());

// Atualiza sozinho, mas só enquanto a aba está à vista
let temporizador = null;
function agendar() {
  clearTimeout(temporizador);
  temporizador = setTimeout(async () => {
    if (!document.hidden) await recarregar({ silencioso: true });
    if (!estado.parou) agendar();
  }, INTERVALO_MS);
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && estado.carregou && Date.now() - estado.ultimaAtualizacao > INTERVALO_MS) recarregar({ silencioso: true });
});

desenharOrdem();
desenharAbas();
desenharTudo();
recarregar().then(() => agendar());
