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