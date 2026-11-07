const lista = document.getElementById("lista");
const STATUS = [
  ["recebida", "Recebida"],
  ["em_analise", "Em análise"],
  ["encaminhada", "Encaminhada"],
  ["encerrada", "Encerrada"],
];

function cartao(c) {
  const div = document.createElement("div");
  div.className = "caixa urg-" + c.urgencia;

  const titulo = document.createElement("b");
  titulo.textContent = `${c.protocolo} · ${c.categoria} · urgência ${c.urgencia}`;

  const resumo = document.createElement("p");
  resumo.textContent = c.resumo || "(sem resumo)";

  const data = document.createElement("small");
  data.textContent = "Recebida em " + c.criado_em;

  const sel = document.createElement("select");
  for (const [valor, rotulo] of STATUS) {
    const o = document.createElement("option");
    o.value = valor;
    o.textContent = rotulo;
    if (valor === c.status) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    fetch(`/api/admin/denuncias/${c.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: sel.value }),
    });
  });

  const rel = document.createElement("a");
  rel.href = `/api/admin/relatorio/${c.id}`;
  rel.target = "_blank";
  rel.rel = "noopener";
  rel.textContent = "Abrir relatório";

  div.append(titulo, resumo, data, sel, rel);
  return div;
}

async function carregar() {
  const r = await fetch("/api/admin/denuncias");
  if (!r.ok) {
    lista.textContent = "Não foi possível carregar. Confira o usuário e a senha.";
    return;
  }
  const casos = await r.json();
  lista.textContent = "";
  if (!casos.length) {
    lista.textContent = "Nenhuma denúncia ainda.";
    return;
  }
  for (const c of casos) lista.appendChild(cartao(c));
}

carregar();