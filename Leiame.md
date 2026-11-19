# Rede Escudo – Acolhimento com IA e Triagem Segura de Denúncias

Módulo de Inteligência Artificial e gestão anônima de denúncias desenvolvido pela equipe **Zagatec** (2º ano de **Análise e Desenvolvimento de Sistemas – ADS**, **ETEC Polivalente de Americana – Extensão FATEC**) para o **Hackathon TeenTech 2026** (Instituto TecKids).

## Sobre o projeto

A **Rede Escudo** é o núcleo operacional do ecossistema **Zagatec**. O sistema oferece um ambiente 100% anônimo onde vítimas ou testemunhas de violência e abuso digital podem receber acolhimento imediato, registrar relatos e preservar evidências sem expor sua identidade.

### Principais funcionalidades
- **Assistente de Acolhimento com IA e RAG:** chatbot empático que orienta sobre preservação de provas digitais e consulta uma base de conhecimento estruturada (*Retrieval-Augmented Generation*), com acesso rápido aos canais **190**, **100** e **188**.
- **Anonimato e Protocolo Criptografado:** gera automaticamente um protocolo único e um código secreto armazenado via hash SHA-256 para acompanhamento posterior sem cadastro ou coleta de IP.
- **Integridade de Evidências (SHA-256):** calcula a assinatura digital dos prints enviados sem armazenar arquivos íntimos no servidor.
- **Painel do Analista e Anti-Spam:** fila priorizada por urgência com quarentena automática de trotes e geração de relatório técnico para encaminhamento às autoridades.

> **Nota de disponibilidade:** Como o servidor está hospedado no plano gratuito do Render, o primeiro acesso após inatividade pode levar de 30 a 50 segundos para inicializar.

## Links do projeto

- **Aplicação Online (Rede Escudo):** https://rede-escudo.onrender.com
- **Portal Institucional Zagatec:** https://joaoeduardo.site.je
- **Repositório do Portal (PHP + MySQL):** https://github.com/jaoedu1822/Hackaton_Teentech_2026

## Integrantes

- Felipe Holanda
- Gustavo Silvério
- João Eduardo
- Sanderson Zanini
- Vinicius Torres

## Tecnologias utilizadas

- **Back-end e API:** Node.js, Express, Helmet, Express Rate Limit, Express Basic Auth
- **Front-end:** HTML5, CSS3, JavaScript (Vanilla com sanitização via `textContent`)
- **Inteligência Artificial:** Groq API (LLM em nuvem), Ollama (execução e visão local), RAG com embeddings
- **Banco de Dados e Segurança:** MySQL / SQLite, criptografia SHA-256
- **Infraestrutura:** Render

## Créditos

Desenvolvido no âmbito do **Hackathon TeenTech 2026** (Instituto TecKids).
