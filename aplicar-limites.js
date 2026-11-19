// Faz o servidor aceitar o MESMO número de prints que o formulário (o número está em public/limites.js).
//
// Por que existe: o servidor só guardava o código de 10 prints por denúncia. O formulário agora deixa anexar mais.
// Sem este ajuste, os prints a partir do 11º seriam ignorados em silêncio.
//
// Como usar (no terminal, DENTRO da pasta do projeto, a que tem o server.js):
//
//   node aplicar-limites.js
//
// Ele mexe só em 2 pontos do server.js (um "import" novo e o número 10 da linha dos prints) e guarda uma cópia
// antes (server.js.bak). Antes de gravar, ele confere se o arquivo novo não tem erro de sintaxe. Pode rodar de novo à vontade.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const aqui = import.meta.dirname;
const servidor = path.join(aqui, "server.js");
const limitesJs = path.join(aqui, "public", "limites.js");

function sair(codigo, ...linhas) {
  console.log("\n" + linhas.join("\n") + "\n");
  process.exit(codigo);
}
const MANUAL = [
  "Se preferir fazer à mão: abra o server.js, aperte Ctrl+F e procure por  req.body.imagens",
  "Na mesma linha tem  .slice(0, 10)  . Troque o 10 pelo número de prints que você quer (o mesmo de public/limites.js)",
  "e salve. Depois reinicie o servidor.",
];

if (!fs.existsSync(servidor)) sair(1, "Não achei o server.js nesta pasta.", "Entre na pasta do projeto (a que tem o server.js) com o comando cd e rode de novo.");
if (!fs.existsSync(limitesJs)) sair(1, "Não achei o public/limites.js.", "Copie o arquivo limites.js do pacote para a pasta public do projeto e rode de novo.");

// 1) Qual é o número que o formulário usa?
let maximo;
try {
  ({ LIMITES: { PRINTS_POR_DENUNCIA: maximo } } = await import(pathToFileURL(limitesJs).href));
} catch (err) {
  sair(1, "Não consegui ler o public/limites.js: " + err.message);
}
if (!Number.isInteger(maximo) || maximo < 1 || maximo > 100) {
  sair(1, `O número em public/limites.js (PRINTS_POR_DENUNCIA = ${maximo}) precisa ser inteiro, de 1 a 100.`, "Acima de 100 o envio ficaria pesado demais para o servidor.");
}

// 2) O server.js já está atualizado?
const original = fs.readFileSync(servidor, "utf8");
const quebra = original.includes("\r\n") ? "\r\n" : "\n";
if (/LIMITES\.PRINTS_POR_DENUNCIA/.test(original) && /from\s+["']\.\/public\/limites\.js["']/.test(original)) {
  sair(0, `O server.js já está atualizado: ele aceita ${maximo} prints por denúncia (o número de public/limites.js).`, "Se você acabou de mudar esse número, é só reiniciar o servidor.");
}

// 3) Acha a linha dos prints
const alvo = /(req\.body\.imagens\s*:\s*\[\]\)\.slice\(0,\s*)(\d+)(\s*\))/g;
const achados = [...original.matchAll(alvo)];
if (achados.length !== 1) {
  sair(1, "Não achei (ou achei mais de uma) a linha dos prints no server.js. Talvez ele tenha sido mudado.", "Não alterei nada.", "", ...MANUAL);
}
if (/\bLIMITES\b/.test(original)) {
  sair(1, "O server.js já usa o nome LIMITES para outra coisa, então não posso adicionar o import sem bagunçar.", "Não alterei nada.", "", ...MANUAL);
}

// 4) Monta o texto novo: troca o número e coloca o import junto dos outros
let novo = original.replace(alvo, "$1LIMITES.PRINTS_POR_DENUNCIA$3");
const importLimites = 'import { LIMITES } from "./public/limites.js";';
const linhaAjuda = /^import\s.+["']\.\/public\/ajuda\.js["'];?[ \t]*$/m;
const todosImports = [...novo.matchAll(/^import\s.+\sfrom\s+["'][^"']+["'];?[ \t]*$/gm)];
const ancora = novo.match(linhaAjuda) ?? todosImports.at(-1);
if (!ancora) sair(1, "Não achei onde ficam os imports no começo do server.js. Não alterei nada.", "", ...MANUAL);
const fimDaLinha = ancora.index + ancora[0].length;
novo = novo.slice(0, fimDaLinha) + quebra + importLimites + novo.slice(fimDaLinha);

// 5) Confere a sintaxe do texto novo ANTES de gravar (num arquivo temporário .mjs, que o Node sempre lê como módulo)
const temporario = path.join(os.tmpdir(), `server-novo-${process.pid}.mjs`);
try {
  fs.writeFileSync(temporario, novo);
  execFileSync(process.execPath, ["--check", temporario], { stdio: "pipe" });
} catch (err) {
  sair(1, "Depois da mudança o server.js ficaria com erro de sintaxe, então não alterei nada.", String(err.stderr ?? err.message).split("\n").slice(0, 6).join("\n"), "", ...MANUAL);
} finally {
  fs.rmSync(temporario, { force: true });
}

// 6) Cópia de segurança e gravação
let copia = path.join(aqui, "server.js.bak");
for (let n = 2; fs.existsSync(copia); n++) copia = path.join(aqui, `server.js.bak${n}`);
fs.copyFileSync(servidor, copia);
fs.writeFileSync(servidor, novo);

sair(0,
  `Pronto! O servidor agora aceita ${maximo} prints por denúncia, o mesmo número do formulário.`,
  `Guardei uma cópia do arquivo antigo em ${path.basename(copia)} (pode apagar depois que testar).`,
  "",
  "Agora reinicie o servidor: no terminal dele aperte Ctrl+C e rode  node server.js",
  `Para mudar o número no futuro: edite PRINTS_POR_DENUNCIA em public/limites.js, rode este comando de novo e reinicie o servidor.`
);
