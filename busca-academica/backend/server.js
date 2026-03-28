/**
 * ============================================================
 *  BUSCA ACADÊMICA INTEGRADA — Backend Node.js
 *  Fontes: CAPES (scraping) | SciELO (API) | BDTD (OAI-PMH)
 * ============================================================
 */

const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const cheerio  = require('cheerio');
const xml2js   = require('xml2js');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

function normalize(obj) {
  return {
    repositorio          : obj.repositorio          || '',
    link_capes           : obj.link_capes           || '',
    link_scielo          : obj.link_scielo          || '',
    revista              : obj.revista              || '',
    classificacao        : obj.classificacao        || '',
    ano_da_publicacao    : obj.ano_da_publicacao    || '',
    volume               : obj.volume               || '',
    titulo_do_periodico  : obj.titulo_do_periodico  || '',
    resumo               : obj.resumo               || '',
    palavras_chaves      : obj.palavras_chaves      || '',
    autor                : obj.autor                || '',
    titulacao            : obj.titulacao            || '',
    instituicao_programa : obj.instituicao_programa || '',
    regiao               : obj.regiao               || '',
    validacao            : obj.validacao            || 'Pendente',
    status_mesclagem     : obj.status_mesclagem     || 'Novo',
  };
}

// ─────────────────────────────────────────────────────────
//  1. CAPES — Catálogo de Teses e Dissertações (scraping)
// ─────────────────────────────────────────────────────────

async function searchCAPES(query, page = 1) {
  console.log(`[CAPES] Buscando: "${query}" — página ${page}`);
  const results = [];

  try {
    const url = `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/`;
    // CAPES usa uma API interna JSON — tentamos acessar diretamente
    const apiUrl = `https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca?q=${encodeURIComponent(query)}&filtros=&pagina=${page}&tamanho=20`;

    const { data } = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'Accept'          : 'application/json, text/plain, */*',
        'Accept-Language' : 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer'         : 'https://catalogodeteses.capes.gov.br/',
        'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin'          : 'https://catalogodeteses.capes.gov.br',
      },
    });

    const items = data.teses || data.items || data.results || [];

    for (const item of items) {
      results.push(normalize({
        repositorio          : 'CAPES',
        link_capes           : item.idTese
          ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${item.idTese}`
          : '',
        titulo_do_periodico  : item.titulo     || item.title       || '',
        autor                : item.autor      || item.autores?.[0] || '',
        ano_da_publicacao    : String(item.anoDaDefesa || item.ano || ''),
        titulacao            : item.grau       || item.nivel       || '',
        instituicao_programa : item.siglaIes   || item.instituicao || '',
        regiao               : item.regiao     || '',
        resumo               : item.resumo     || item.abstract    || '',
        palavras_chaves      : Array.isArray(item.palavrasChave)
          ? item.palavrasChave.join('; ')
          : (item.palavrasChave || ''),
        classificacao        : item.grau || '',
      }));
    }

    if (results.length === 0) {
      console.log('[CAPES] API interna sem resultados — tentando HTML scraping...');
      return await scrapeCAPESHTML(query);
    }
  } catch (err) {
    console.warn('[CAPES] API interna falhou:', err.message);
    // fallback: scraping HTML
    return await scrapeCAPESHTML(query);
  }

  console.log(`[CAPES] ${results.length} resultado(s) encontrado(s)`);
  return results;
}

async function scrapeCAPESHTML(query) {
  const results = [];
  try {
    // Dados abertos CAPES — conjunto de dados de teses (CSV/JSON público)
    const openUrl = `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=b7003093-4fab-4b88-b0fa-b7d8df0bcb77&q=${encodeURIComponent(query)}&limit=20`;
    const { data } = await axios.get(openUrl, { timeout: 10000 });

    const records = data?.result?.records || [];
    for (const r of records) {
      results.push(normalize({
        repositorio          : 'CAPES',
        link_capes           : '',
        titulo_do_periodico  : r.NM_TITULO || r.titulo || '',
        autor                : r.NM_AUTOR  || r.autor  || '',
        ano_da_publicacao    : String(r.AN_BASE || r.ano || ''),
        titulacao            : r.NM_GRAU_ACADEMICO || '',
        instituicao_programa : r.SG_IES   || r.NM_IES || '',
        regiao               : r.NM_REGIAO || '',
        resumo               : r.DS_RESUMO || '',
        palavras_chaves      : r.DS_PALAVRA_CHAVE || '',
      }));
    }
  } catch (err) {
    console.warn('[CAPES] Dados abertos também falharam:', err.message);
  }
  return results;
}

// ─────────────────────────────────────────────────────────
//  2. SciELO — Article Meta API
// ─────────────────────────────────────────────────────────

async function searchSciELO(query, count = 20) {
  console.log(`[SciELO] Buscando: "${query}"`);
  const results = [];

  try {
    // SciELO Article Meta API
    const url = `http://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(query)}&collection=scl&count=${count}&offset=0&format=json`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });

    const items = data.objects || data.articles || [];

    for (const item of items) {
      const citations = item.citations ? item.citations.length : '';
      const titles = item.titles || {};
      const titulo  = titles['pt'] || titles['en'] || titles['es'] || Object.values(titles)[0] || '';
      const abstracts = item.abstracts || {};
      const resumo = abstracts['pt'] || abstracts['en'] || Object.values(abstracts)[0] || '';
      const authors = (item.authors || []).map(a => `${a.given_names || ''} ${a.surname || ''}`.trim()).join('; ');
      const keywords = (item.keywords || {});
      const kw = Object.values(keywords).flat().join('; ');

      results.push(normalize({
        repositorio         : 'SciELO',
        link_scielo         : item.doi ? `https://doi.org/${item.doi}` : '',
        titulo_do_periodico : titulo,
        revista             : item.journal_title || item.source || '',
        autor               : authors,
        ano_da_publicacao   : String(item.publication_date || item.year || ''),
        volume              : item.volume || '',
        resumo              : resumo,
        palavras_chaves     : kw,
        classificacao       : 'Artigo Científico',
      }));
    }
  } catch (err) {
    console.warn('[SciELO] Tentativa 1 falhou:', err.message);
    // Fallback: SciELO Search API
    try {
      const url2 = `https://search.scielo.org/?q=${encodeURIComponent(query)}&lang=pt&count=${count}&from=0&output=json&format=json`;
      const { data: d2 } = await axios.get(url2, { timeout: 12000 });
      const hits = d2?.hits?.hits || [];
      for (const h of hits) {
        const s = h._source || {};
        results.push(normalize({
          repositorio         : 'SciELO',
          link_scielo         : s.doi ? `https://doi.org/${s.doi}` : (s.url || ''),
          titulo_do_periodico : s.ti_pt || s.ti_en || s.title || '',
          revista             : s.ta || '',
          autor               : Array.isArray(s.au) ? s.au.join('; ') : (s.au || ''),
          ano_da_publicacao   : String(s.da || s.year || ''),
          volume              : s.vi || '',
          resumo              : s.ab_pt || s.ab_en || '',
          palavras_chaves     : Array.isArray(s.wok_subject_categories) ? s.wok_subject_categories.join('; ') : '',
          classificacao       : 'Artigo Científico',
        }));
      }
    } catch (err2) {
      console.warn('[SciELO] Fallback também falhou:', err2.message);
    }
  }

  console.log(`[SciELO] ${results.length} resultado(s)`);
  return results;
}

// ─────────────────────────────────────────────────────────
//  3. BDTD — OAI-PMH
// ─────────────────────────────────────────────────────────

async function searchBDTD(query) {
  console.log(`[BDTD] Buscando: "${query}"`);
  const results = [];

  try {
    const url = `https://bdtd.ibict.br/vufind/OAI/Server?verb=Search&query=${encodeURIComponent(query)}&queryType=AllFields&method=POST`;
    const { data } = await axios.get(url, { timeout: 15000 });

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(data);

    const records = parsed?.['OAI-PMH']?.ListRecords?.record || [];
    const list = Array.isArray(records) ? records : [records];

    for (const rec of list) {
      const meta = rec?.metadata?.['oai_dc:dc'] || {};
      const get  = (k) => {
        const v = meta[k];
        if (!v) return '';
        if (Array.isArray(v)) return v.join('; ');
        if (typeof v === 'object') return v._ || '';
        return v;
      };

      results.push(normalize({
        repositorio         : 'BDTD',
        titulo_do_periodico : get('dc:title'),
        autor               : get('dc:creator'),
        ano_da_publicacao   : get('dc:date'),
        resumo              : get('dc:description'),
        palavras_chaves     : get('dc:subject'),
        titulacao           : get('dc:type'),
        instituicao_programa: get('dc:publisher'),
        link_capes          : get('dc:identifier'),
        classificacao       : get('dc:type'),
      }));
    }
  } catch (err) {
    console.warn('[BDTD] OAI-PMH falhou — tentando API REST:', err.message);
    try {
      const url2 = `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(query)}&type=AllFields&sort=relevance&page=1&limit=20`;
      const { data: d2 } = await axios.get(url2, { timeout: 12000 });
      const records2 = d2?.records || [];
      for (const r of records2) {
        results.push(normalize({
          repositorio         : 'BDTD',
          titulo_do_periodico : r.title     || '',
          autor               : Array.isArray(r.authors) ? r.authors.join('; ') : (r.authors || ''),
          ano_da_publicacao   : String(r.publicationDates?.[0] || ''),
          resumo              : r.summary?.[0] || '',
          palavras_chaves     : Array.isArray(r.subjects) ? r.subjects.flat().join('; ') : '',
          titulacao           : r.formats?.[0] || '',
          instituicao_programa: r.institutions?.[0] || '',
          link_capes          : r.urls?.[0]?.url || '',
        }));
      }
    } catch (err2) {
      console.warn('[BDTD] REST API também falhou:', err2.message);
    }
  }

  console.log(`[BDTD] ${results.length} resultado(s)`);
  return results;
}

// ─────────────────────────────────────────────────────────
//  ROTA PRINCIPAL — /api/search
// ─────────────────────────────────────────────────────────

app.get('/api/search', async (req, res) => {
  const { q, fontes = 'capes,scielo,bdtd', pagina = 1 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ erro: 'Informe um termo de busca com ao menos 2 caracteres.' });
  }

  console.log(`\n🔍 NOVA BUSCA: "${q}" | Fontes: ${fontes} | Página: ${pagina}`);

  const lista = fontes.split(',').map(f => f.trim().toLowerCase());
  const promessas = [];

  if (lista.includes('capes'))  promessas.push(searchCAPES(q, Number(pagina)));
  if (lista.includes('scielo')) promessas.push(searchSciELO(q));
  if (lista.includes('bdtd'))   promessas.push(searchBDTD(q));

  const resolvidos = await Promise.allSettled(promessas);
  const resultados = resolvidos
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  console.log(`✅ Total: ${resultados.length} resultado(s)\n`);

  res.json({
    query     : q,
    total     : resultados.length,
    pagina    : Number(pagina),
    resultados,
  });
});

// ─────────────────────────────────────────────────────────
//  ROTA DE STATUS
// ─────────────────────────────────────────────────────────

app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', versao: '1.0.0', fontes: ['CAPES', 'SciELO', 'BDTD'] });
});

// ─────────────────────────────────────────────────────────
//  INICIAR SERVIDOR
// ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   BUSCA ACADÊMICA INTEGRADA — Servidor iniciado      ║');
  console.log(`║   Porta: ${PORT}  |  http://localhost:${PORT}               ║`);
  console.log('║   Fontes: CAPES · SciELO · BDTD                      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
});
