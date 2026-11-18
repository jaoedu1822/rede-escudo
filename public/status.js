const ROTULOS = {
  recebida: "Recebida",
  em_analise: "Em análise pela equipe",
  encaminhada: "Encaminhada às autoridades",
  encerrada: "Encerrada",
};

async function consultar() {
  const saida = document.getElementById("saida");
  saida.classList.remove("oculto");
  saida.textContent = "Consultando...";
  try {
    const r = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        protocolo: document.getElementById("protocolo").value.trim().toUpperCase(),
        codigo: document.getElementById("codigo").value.trim(),
      }),
    });
    const d = await r.json();
    saida.textContent = r.ok
      ? `Situação: ${ROTULOS[d.status] || d.status} (registrado em ${d.criado_em})`
      : d.erro;
  } catch {
    saida.textContent = "Sem conexão com o servidor.";
  }
}

document.getElementById("consultar").addEventListener("click", consultar);

const ETAPAS = [
  {
    chave: "recebida",
    titulo: "Denúncia recebida",
    descricao: "Seu relato foi registrado com segurança e entrou na fila de triagem.",
  },
  {
    chave: "em_analise",
    titulo: "Em análise pela equipe",
    descricao: "Nossa equipe está avaliando as informações e evidências enviadas.",
  },
  {
    chave: "encaminhada",
    titulo: "Encaminhada às autoridades",
    descricao: "O dossiê anônimo foi enviado aos órgãos competentes para investigação.",
  },
  {
    chave: "encerrada",
    titulo: "Caso encerrado",
    descricao: "O fluxo de acompanhamento desta denúncia foi concluído.",
  },
];

function renderizarProgresso(statusAtual, criadoEm) {
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === statusAtual);

  if (indiceAtual === -1) {
    return `<p><strong>Situação:</strong> ${statusAtual} (registrado em ${criadoEm})</p>`;
  }

  const itensHtml = ETAPAS.map((etapa, index) => {
    let classeEstado = "pendente";
    let icone = "";

    if (index < indiceAtual) {
      classeEstado = "concluido";
      icone = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (index === indiceAtual) {
      classeEstado = "atual";
      icone = `<span style="width:8px;height:8px;border-radius:50%;background:#fff;"></span>`;
    }

    const mostrarDescricao = index <= indiceAtual;

    return `
      <li class="timeline-item ${classeEstado}">
        <span class="timeline-marcador" aria-hidden="true">${icone}</span>
        <span class="timeline-titulo">${etapa.titulo}</span>
        ${mostrarDescricao ? `<span class="timeline-desc">${etapa.descricao}</span>` : ""}
      </li>
    `;
  }).join("");

  return `
    <div class="status-cabecalho">
      <strong>Andamento do protocolo</strong>
      <span class="status-data">Registrado em ${criadoEm}</span>
    </div>
    <ol class="timeline">
      ${itensHtml}
    </ol>
  `;
}

async function consultar() {
  const saida = document.getElementById("saida");
  saida.classList.remove("oculto");
  saida.innerHTML = `<p style="color: var(--texto-suave);">Consultando...</p>`;

  try {
    const r = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        protocolo: document.getElementById("protocolo").value.trim().toUpperCase(),
        codigo: document.getElementById("codigo").value.trim(),
      }),
    });
    const d = await r.json();

    if (r.ok) {
      saida.innerHTML = renderizarProgresso(d.status, d.criado_em);
    } else {
      saida.innerHTML = `<p class="erro" style="margin:0;">${d.erro}</p>`;
    }
  } catch {
    saida.innerHTML = `<p class="erro" style="margin:0;">Sem conexão com o servidor.</p>`;
  }
}

document.getElementById("consultar").addEventListener("click", consultar);
