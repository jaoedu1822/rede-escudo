// Transforma o texto da IA em elementos da página SEM usar innerHTML.
// Tudo entra como texto (nós de texto), então nada que a IA escrever vira código da página.
//
// Aceita: parágrafos, listas com "-", "*" ou "1.", **negrito**, *itálico*, `código` e títulos (#, viram negrito).

const INLINE = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`|(?<![\w*])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![\w*])/g;

function inline(pai, texto) {
  let ultimo = 0;
  for (const m of texto.matchAll(INLINE)) {
    if (m.index > ultimo) pai.append(texto.slice(ultimo, m.index));
    let el;
    if (m[1] !== undefined) {
      el = document.createElement("strong");
      el.textContent = m[1];
    } else if (m[2] !== undefined) {
      el = document.createElement("code");
      el.textContent = m[2];
    } else {
      el = document.createElement("em");
      el.textContent = m[3];
    }
    pai.append(el);
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) pai.append(texto.slice(ultimo));
}

export function renderMarkdown(texto) {
  const frag = document.createDocumentFragment();
  const linhas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n");
  let paragrafo = [];
  let lista = null; // { tipo, el }

  const fecharParagrafo = () => {
    if (!paragrafo.length) return;
    const p = document.createElement("p");
    paragrafo.forEach((l, i) => {
      if (i) p.append(document.createElement("br"));
      inline(p, l);
    });
    frag.append(p);
    paragrafo = [];
  };

  for (const bruta of linhas) {
    const linha = bruta.trimEnd();

    // Linha em branco fecha o parágrafo, mas NÃO a lista (a IA costuma pular linha entre os itens)
    if (!linha.trim()) {
      fecharParagrafo();
      continue;
    }

    const item = /^\s*(?:([-*•])|(\d{1,3})[.)])\s+(.*)$/.exec(linha);
    if (item) {
      fecharParagrafo();
      const tipo = item[1] ? "ul" : "ol";
      if (!lista || lista.tipo !== tipo) {
        lista = { tipo, el: document.createElement(tipo) };
        if (tipo === "ol") lista.el.start = Number(item[2]);
        frag.append(lista.el);
      }
      const li = document.createElement("li");
      inline(li, item[3]);
      lista.el.append(li);
      continue;
    }

    // Linha recuada logo depois de um item: continua o mesmo item
    if (lista && /^\s{2,}\S/.test(bruta)) {
      const li = lista.el.lastElementChild;
      li.append(document.createElement("br"));
      inline(li, linha.trim());
      continue;
    }

    lista = null;
    const titulo = /^#{1,6}\s+(.*)$/.exec(linha);
    if (titulo) {
      fecharParagrafo();
      const p = document.createElement("p");
      const b = document.createElement("strong");
      inline(b, titulo[1]);
      p.append(b);
      frag.append(p);
      continue;
    }
    paragrafo.push(linha.trim());
  }
  fecharParagrafo();
  return frag;
}
