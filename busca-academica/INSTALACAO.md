# 📦 Guia de Instalação — Busca Acadêmica Integrada

## Pré-requisitos

Antes de começar, instale o **Node.js** (versão 16 ou superior):

👉 https://nodejs.org/pt-br/

Para verificar se já está instalado, abra o terminal e execute:
```
node --version
npm --version
```

---

## Estrutura de Pastas

```
busca-academica/
├── backend/
│   ├── server.js        ← Servidor Node.js
│   └── package.json     ← Dependências
└── frontend/
    └── index.html       ← Interface web
```

---

## Instalação — Passo a Passo

### 1️⃣ Abra o Terminal

- **Windows**: Pesquise "cmd" ou "PowerShell" no menu Iniciar
- **Mac**: Acesse Aplicativos → Utilitários → Terminal
- **Linux**: Ctrl + Alt + T

---

### 2️⃣ Acesse a pasta backend

```bash
cd caminho/para/busca-academica/backend
```

Exemplo no Windows:
```
cd C:\Users\seu-usuario\Desktop\busca-academica\backend
```

Exemplo no Mac/Linux:
```
cd ~/Desktop/busca-academica/backend
```

---

### 3️⃣ Instale as dependências ⚠️ OBRIGATÓRIO

```bash
npm install
```

> ⏳ Este processo pode levar 2 a 5 minutos na primeira vez.

---

### 4️⃣ Inicie o servidor

```bash
npm start
```

Você verá a mensagem:
```
╔══════════════════════════════════════════════════════╗
║   BUSCA ACADÊMICA INTEGRADA — Servidor iniciado      ║
║   Porta: 3000  |  http://localhost:3000              ║
╚══════════════════════════════════════════════════════╝
```

---

### 5️⃣ Abra o frontend

Abra o arquivo `frontend/index.html` no navegador (Chrome, Firefox, Edge, Safari).

- Dê um duplo clique no arquivo **OU**
- No terminal, execute: `start frontend/index.html` (Windows) / `open frontend/index.html` (Mac)

---

## ✅ Pronto para usar!

1. Digite um termo de busca (ex: "Linguística Textual")
2. Selecione as fontes: CAPES, SciELO, BDTD
3. Clique em **Pesquisar**
4. Exporte os resultados em CSV, Excel ou PDF

---

## ⚠️ Resolução de Problemas

| Problema | Solução |
|----------|---------|
| `node: command not found` | Instale o Node.js em nodejs.org |
| `npm install` demora muito | Aguarde — Puppeteer baixa o Chromium (~150 MB) |
| Nenhum resultado aparece | Verifique se o servidor está rodando (`npm start`) |
| Erro de CORS | O backend precisa estar em execução |
| Porta 3000 ocupada | Edite `server.js` e mude `const PORT = 3001` |

---

## 🔄 Para encerrar o servidor

No terminal onde o servidor está rodando, pressione:
```
Ctrl + C
```
