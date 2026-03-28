# Busca Acadêmica Integrada

Ferramenta de busca bibliográfica que consulta simultaneamente **CAPES**, **SciELO** e **BDTD**, retornando resultados em formato tabular com exportação em CSV, Excel e PDF.

## Fontes de dados

| Fonte | Tipo | Método de acesso |
|-------|------|-----------------|
| **CAPES** | Teses e dissertações | API interna + Dados Abertos |
| **SciELO** | Artigos científicos | API ArticleMeta |
| **BDTD** | Teses e dissertações | OAI-PMH + API REST |

## Colunas retornadas

`repositorio` · `link_capes` · `link_scielo` · `revista` · `classificacao` · `ano_da_publicacao` · `volume` · `titulo_do_periodico` · `resumo` · `palavras_chaves` · `autor` · `titulacao` · `instituicao_programa` · `regiao` · `validacao` · `status_mesclagem`

## Instalação

Consulte o arquivo **INSTALACAO.md** para instruções detalhadas.

```bash
cd backend
npm install
npm start
```

Abra `frontend/index.html` no navegador.

## Tecnologias

- **Backend**: Node.js · Express · Axios · Cheerio · XML2JS
- **Frontend**: HTML5 · CSS3 · JavaScript puro
- **Fontes tipográficas**: Playfair Display · Source Serif 4 · JetBrains Mono
