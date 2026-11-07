// Confere se todos os arquivos do projeto estão no lugar, antes de ligar o servidor.
// Uso (na pasta do projeto, a que tem o package.json):  node verificar.js
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const aqui = import.meta.dirname;
const ARQUIVOS = [
  "server.js", "db.js", "prompt.js", "demo.js", "anexos.js", "intencao.js", "fila.js", "rag.js", "conhecimento.md", ".env",
  "public/index.html", "public/app.js", "public/formulario.js", "public/ajuda.js", "public/plataformas.js", "public/markdown.js", "public/chat.css",
  "public/painel.html", "public/painel.js", "public/painel.css",
];

let faltas = 0;
let avisos = 0;
const jaDito = new Set();
const falta = (t, chave = t) => {
  if (jaDito.has(chave)) return;
  jaDito.add(chave);
  faltas++;
  console.log("  [FALTA] " + t);
};
const aviso = (t) => (avisos++, console.log("  [aviso] " + t));

// Procura o arquivo na pasta; se só achar com outras letras maiúsculas/minúsculas, avisa (no Windows funciona, em outros sistemas não)
function achar(rel) {
  const dir = path.join(aqui, path.dirname(rel));
  const nome = path.basename(rel);
  let lista = [];
  try {
    lista = fs.readdirSync(dir);
  } catch {
    return null;
  }
  if (lista.includes(nome)) return nome;
  return lista.find((n) => n.toLowerCase() === nome.toLowerCase()) ?? null;
}

console.log("Conferindo os arquivos do projeto em " + aqui + "\n");
for (const rel of ARQUIVOS) {
  const achado = achar(rel);
  if (!achado) falta(`${rel}  (não está na pasta ${path.dirname(rel) === "." ? "principal" : path.dirname(rel)})`, rel);
  else if (achado !== path.basename(rel)) aviso(`${rel} está com o nome "${achado}". Funciona no Windows, mas o certo é "${path.basename(rel)}".`);
}

// O que cada arquivo importa também precisa existir (assim um arquivo novo no futuro também é conferido)
const vistos = new Set();
function conferirImports(rel) {
  if (vistos.has(rel) || !rel.endsWith(".js") || !achar(rel)) return;
  vistos.add(rel);
  const codigo = fs.readFileSync(path.join(aqui, path.dirname(rel), achar(rel)), "utf8");
  for (const m of codigo.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
    const alvo = m[1];
    if (alvo.startsWith(".")) {
      const relAlvo = path.posix.normalize(path.posix.join(path.dirname(rel), alvo));
      if (!achar(relAlvo)) falta(`${relAlvo}  (pedido por ${rel})`, relAlvo);
      else conferirImports(relAlvo);
    } else if (rel === "server.js" || rel === "db.js") {
      const pacote = alvo.startsWith("@") ? alvo.split("/").slice(0, 2).join("/") : alvo.split("/")[0];
      if (alvo.startsWith("node:") || builtinModules.includes(pacote)) continue;
      if (!fs.existsSync(path.join(aqui, "node_modules", pacote))) falta(`pacote "${pacote}" não instalado (rode: npm install)`, "pacote:" + pacote);
    }
  }
}
for (const rel of ARQUIVOS) conferirImports(rel);

// Cada página precisa ter os elementos que o seu script usa (se a página estiver antiga, a tela abre sem botões)
for (const [js, pagina] of [["public/app.js", "public/index.html"], ["public/painel.js", "public/painel.html"]]) {
  if (!achar(js) || !achar(pagina)) continue;
  const codigo = fs.readFileSync(path.join(aqui, "public", achar(js)), "utf8");
  const html = fs.readFileSync(path.join(aqui, "public", achar(pagina)), "utf8");
  const ids = [...new Set([...codigo.matchAll(/\$\("([a-z0-9-]+)"\)/gi)].map((m) => m[1]))];
  const semId = ids.filter((id) => !html.includes(`id="${id}"`));
  if (semId.length) falta(`${pagina} está desatualizado: faltam os elementos ${semId.join(", ")}. Use o ${path.basename(pagina)} mais recente.`, pagina + "-antigo");
}

if (achar(".env")) {
  const env = fs.readFileSync(path.join(aqui, ".env"), "utf8");
  if (!/^ADMIN_PASS=.+/m.test(env)) falta(".env: falta a linha ADMIN_PASS=...");
}

console.log(faltas ? `\n${faltas} problema(s). Coloque os arquivos que faltam no lugar indicado e rode de novo: node verificar.js` : "\nTudo certo: todos os arquivos estão no lugar. Pode rodar: node server.js");
process.exit(faltas ? 1 : 0);
