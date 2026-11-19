// Confere se todos os arquivos do projeto estão no lugar, antes de ligar o servidor.
// Uso (na pasta do projeto, a que tem o package.json):  node verificar.js
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const aqui = import.meta.dirname;
const ARQUIVOS = [
  "server.js", "db.js", "prompt.js", "demo.js", "anexos.js", "intencao.js", "fila.js", "rag.js", "conhecimento.md", ".env",
  "public/index.html", "public/app.js", "public/formulario.js", "public/prints.js", "public/limites.js", "public/ajuda.js", "public/plataformas.js", "public/markdown.js", "public/chat.css",
  "public/painel.html", "public/painel.js", "public/painel.css",
];

let faltas = 0;
let avisos = 0;
const pendencias = []; // passos que ainda faltam fazer (não são arquivos faltando)
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
  if (!achado) {
    // Arquivo na pasta errada é o erro mais comum ao copiar: avisa onde ele está e para onde deve ir
    const pasta = path.dirname(rel);
    const nome = (p) => (p === "." ? "pasta principal" : `pasta ${p}`);
    const fora = [".", "public"].filter((p) => p !== pasta).find((p) => achar(path.posix.join(p, path.basename(rel))));
    falta(fora ? `${rel}  (achei na ${nome(fora)}, mas ele precisa ficar na ${nome(pasta)}. Mova o arquivo para lá)` : `${rel}  (não está na ${nome(pasta)})`, rel);
  } else if (achado !== path.basename(rel)) aviso(`${rel} está com o nome "${achado}". Funciona no Windows, mas o certo é "${path.basename(rel)}".`);
}

// Cópia solta na pasta principal de um arquivo que já está certo dentro de public: sobra e confunde
for (const rel of ARQUIVOS) {
  if (!rel.startsWith("public/") || !achar(rel)) continue;
  const solto = achar(path.basename(rel));
  if (solto) aviso(`${solto} na pasta principal é uma sobra (o certo é ${rel}). Pode apagar o de fora.`);
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

// O servidor precisa aceitar pelo menos tantos prints quanto o formulário deixa anexar; senão os últimos seriam ignorados sem aviso
if (achar("server.js") && achar("public/limites.js")) {
  const servidor = fs.readFileSync(path.join(aqui, achar("server.js")), "utf8");
  const limites = fs.readFileSync(path.join(aqui, "public", achar("public/limites.js")), "utf8");
  const doFormulario = Number(limites.match(/PRINTS_POR_DENUNCIA:\s*(\d+)/)?.[1]);
  const doServidor = Number(servidor.match(/req\.body\.imagens\s*:\s*\[\]\)\.slice\(0,\s*(\d+)\s*\)/)?.[1]);
  if (!/LIMITES\.PRINTS_POR_DENUNCIA/.test(servidor) && doServidor && doFormulario && doServidor < doFormulario) {
    aviso(`O formulário deixa anexar ${doFormulario} prints, mas o servidor só guarda ${doServidor} por denúncia (o resto seria ignorado sem avisar).`);
    pendencias.push("rode  node aplicar-limites.js  (ele ajusta o server.js) e depois reinicie o servidor");
  }
}

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

if (pendencias.length) console.log(`\nAinda falta um passo:\n${pendencias.map((p) => "  -> " + p).join("\n")}`);
console.log(
  faltas
    ? `\n${faltas} problema(s). Coloque os arquivos que faltam no lugar indicado e rode de novo: node verificar.js`
    : pendencias.length
      ? "\nOs arquivos estão no lugar. Faça o passo acima e depois rode: node server.js"
      : "\nTudo certo: todos os arquivos estão no lugar. Pode rodar: node server.js"
);
process.exit(faltas ? 1 : 0);
