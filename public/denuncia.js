const lista = document.getElementById("evidencias");
const TIPOS = [
  ["link", "Link"],
  ["id_usuario", "ID de usuário"],
  ["servidor", "Servidor"],
  ["data_hora", "Data e hora"],
];

function novaLinha() {
  const linha = document.createElement("div");
  linha.className = "ev";

  const tipo = document.createElement("select");
  for (const [valor, rotulo] of TIPOS) {
    const o = document.createElement("option");
    o.value = valor;
    o.textContent = rotulo;
    tipo.appendChild(o);
  }

  const valor = document.createElement("input");
  valor.placeholder = "Cole aqui";

  linha.append(tipo, valor);
  lista.appendChild(linha);
}

async function enviar() {
  const botao = document.getElementById("enviar");
  const erro = document.getElementById("erro");
  erro.textContent = "";

  const evidencias = [...lista.querySelectorAll(".ev")]
    .map((l) => ({ tipo: l.querySelector("select").value, valor: l.querySelector("input").value.trim() }))
    .filter((e) => e.valor);

  botao.disabled = true;
  try {
    const r = await fetch("/api/denuncia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plataforma: document.getElementById("plataforma").value,
        relato: document.getElementById("relato").value.trim(),
        evidencias,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      erro.textContent = d.erro || "Não foi possível enviar.";
      return;
    }
    document.getElementById("protocolo").textContent = d.protocolo;
    document.getElementById("codigo").textContent = d.codigo;
    document.getElementById("form").classList.add("oculto");
    document.getElementById("resultado").classList.remove("oculto");
  } catch {
    erro.textContent = "Sem conexão com o servidor. Se for urgente, ligue 190 ou 188.";
  } finally {
    botao.disabled = false;
  }
}

novaLinha();
document.getElementById("add").addEventListener("click", novaLinha);
document.getElementById("enviar").addEventListener("click", enviar);