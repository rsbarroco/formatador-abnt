/**
 * Relatorio de conformidade: o que o documento tem fora da norma.
 *
 * Esta e a parte do motor que nao da para terceirizar, e que diferencia um
 * formatador de uma macro de Word - ela responde "por que eu perderia nota".
 *
 * Cada achado tem `severity`:
 *   erro   - descumpre a norma de forma verificavel
 *   aviso  - provavel problema, depende do regulamento da instituicao
 *   info   - observacao que vale conferir
 */

import { RULES, isUnnumbered, normalizeTitle } from './rules.js';

/** Citacao autor-data: (SOBRENOME, 2020) ou (SOBRENOME, 2020, p. 15) */
const CITATION_RE = /\(([A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ\s.;'-]{1,60}),\s*(\d{4}[a-z]?)(?:\s*,\s*p\.\s*\d+(?:-\d+)?)?\)/g;
/** Citacao no texto: Sobrenome (2020) */
const NARRATIVE_CITATION_RE = /([A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][a-zá-ú]+(?:\s+(?:e|&)\s+[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][a-zá-ú]+)?)\s*\((\d{4}[a-z]?)(?:\s*,\s*p\.\s*\d+(?:-\d+)?)?\)/g;

const REQUIRED_SECTIONS = [
  { keys: ['introducao'], label: 'Introdução' },
  {
    keys: ['conclusao', 'consideracoes finais', 'conclusoes'],
    label: 'Conclusão ou Considerações finais',
  },
  { keys: ['referencias'], label: 'Referências' },
];

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Extrai o sobrenome de abertura de uma referencia NBR 6023. */
function referenceSurname(text) {
  const m = text.match(/^([A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ\s'-]+),/);
  return m ? m[1].trim() : null;
}

/**
 * Chave de autor para casar citacao com referencia.
 *
 * Uma citacao de obra com dois ou tres autores nomeia todos ("COSTA; LIMA" ou
 * "Costa e Lima"), enquanto a referencia abre pelo primeiro. Reduzir os dois
 * lados ao primeiro sobrenome evita acusar de ausente uma referencia que esta
 * ali - era o falso positivo que a primeira versao deste validador produzia.
 */
function authorKey(name) {
  const first = normalizeTitle(name)
    .split(/\s*;\s*|\s+(?:e|&)\s+/)[0]
    .replace(/\bet\s+al\.?\b/g, '')
    .trim();
  // Guarda so a ultima palavra: "ana paula costa" e "costa" casam.
  const parts = first.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : first;
}

/** Ano de publicacao declarado na referencia. */
function referenceYear(text) {
  const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]);
  return years.length ? years[years.length - 1] : null;
}

export function validate({ meta, blocks }) {
  const findings = [];
  const add = (severity, rule, message, where) =>
    findings.push({ severity, rule, message, where });

  const headings = blocks.filter((b) => b.type === 'heading');
  const headingKeys = headings.map((h) => normalizeTitle(h.text));

  // ---- Folha de rosto (NBR 14724 4.1.2) ----
  for (const [field, label] of [
    ['titulo', 'título'],
    ['autor', 'autor'],
    ['instituicao', 'instituição'],
    ['local', 'local'],
    ['ano', 'ano'],
  ]) {
    if (!meta[field]) {
      add('erro', 'NBR 14724 4.1.2', `Folha de rosto sem ${label}.`, 'front matter');
    }
  }
  if (!meta.orientador) {
    add('aviso', 'NBR 14724 4.1.2', 'Folha de rosto sem orientador.', 'front matter');
  }

  // ---- Secoes obrigatorias ----
  for (const req of REQUIRED_SECTIONS) {
    const found = headingKeys.some((k) => req.keys.some((want) => k.startsWith(want)));
    if (!found) {
      add('erro', 'NBR 14724 4.2', `Falta a seção "${req.label}".`, 'estrutura');
    }
  }

  // ---- Resumo (NBR 6028) ----
  const resumoIdx = blocks.findIndex(
    (b) => b.type === 'heading' && normalizeTitle(b.text) === 'resumo',
  );
  if (resumoIdx === -1) {
    add('erro', 'NBR 6028', 'Documento sem resumo.', 'estrutura');
  } else {
    const body = [];
    let keywords = null;
    for (let i = resumoIdx + 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === 'heading') break;
      if (b.type === 'keywords') keywords = b;
      else if (b.type === 'paragraph') body.push(b);
    }
    const count = body.reduce((n, b) => n + words(b.text).length, 0);
    if (body.length > 1) {
      add(
        'erro',
        'NBR 6028 4.1',
        `Resumo em ${body.length} parágrafos; a norma pede parágrafo único.`,
        'Resumo',
      );
    }
    if (count && count < RULES.abstract.minWords) {
      add(
        'aviso',
        'NBR 6028 4.2',
        `Resumo com ${count} palavras; o intervalo recomendado é ${RULES.abstract.minWords}-${RULES.abstract.maxWords}.`,
        'Resumo',
      );
    }
    if (count > RULES.abstract.maxWords) {
      add(
        'erro',
        'NBR 6028 4.2',
        `Resumo com ${count} palavras, acima do limite de ${RULES.abstract.maxWords}.`,
        'Resumo',
      );
    }
    if (!keywords) {
      add('erro', 'NBR 6028 4.3', 'Resumo sem palavras-chave.', 'Resumo');
    } else {
      const list = keywords.text.replace(/^[^:]*:\s*/, '').trim();
      if (!/;/.test(list)) {
        add(
          'aviso',
          'NBR 6028 4.3',
          'Palavras-chave devem ser separadas por ponto e vírgula.',
          'Resumo',
        );
      }
      if (!/\.\s*$/.test(list)) {
        add('info', 'NBR 6028 4.3', 'Palavras-chave devem terminar em ponto.', 'Resumo');
      }
    }
  }

  // ---- Numeracao progressiva (NBR 6024) ----
  let lastLevel = 0;
  for (const h of headings) {
    if (isUnnumbered(h.text)) continue;
    if (h.level > lastLevel + 1 && lastLevel > 0) {
      add(
        'erro',
        'NBR 6024 4.2',
        `Seção "${h.text}" pula do nível ${lastLevel} para ${h.level}.`,
        h.text,
      );
    }
    if (/\.$/.test(h.text)) {
      add('aviso', 'NBR 6024 4.2', `Título "${h.text}" não leva ponto final.`, h.text);
    }
    lastLevel = h.level;
  }

  // ---- Citacoes (NBR 10520) e referencias (NBR 6023) ----
  const refs = blocks.filter((b) => b.type === 'reference');
  const refIndex = refs.map((r) => ({
    surname: referenceSurname(r.text),
    year: referenceYear(r.text),
    text: r.text,
  }));

  const cited = new Map();
  for (const b of blocks) {
    if (b.type !== 'paragraph' && b.type !== 'quote') continue;
    for (const re of [CITATION_RE, NARRATIVE_CITATION_RE]) {
      for (const m of b.text.matchAll(re)) {
        cited.set(`${authorKey(m[1])}|${m[2]}`, { surname: m[1], year: m[2] });
      }
    }
  }

  // Citacao longa sem indicacao de fonte
  for (const b of blocks) {
    if (b.type !== 'quote' || !b.long) continue;
    const hasSource =
      CITATION_RE.test(b.text) || NARRATIVE_CITATION_RE.test(b.text);
    CITATION_RE.lastIndex = 0;
    NARRATIVE_CITATION_RE.lastIndex = 0;
    if (!hasSource) {
      add(
        'erro',
        'NBR 10520 5.1',
        'Citação longa sem indicação de autor, ano e página.',
        b.text.slice(0, 60) + '…',
      );
    }
  }

  // Citado no texto mas ausente das referencias
  for (const [key, c] of cited) {
    const [author, year] = key.split('|');
    const match = refIndex.some(
      (r) => r.surname && authorKey(r.surname) === author && r.year === year,
    );
    if (!match) {
      add(
        'erro',
        'NBR 10520 / 6023',
        `Citação "${c.surname}, ${c.year}" não tem referência correspondente.`,
        'Referências',
      );
    }
  }

  // Referenciado mas nunca citado
  for (const r of refIndex) {
    if (!r.surname || !r.year) {
      add(
        'aviso',
        'NBR 6023',
        `Referência sem autor ou ano reconhecíveis: "${r.text.slice(0, 60)}…"`,
        'Referências',
      );
      continue;
    }
    const used = cited.has(`${authorKey(r.surname)}|${r.year}`);
    if (!used) {
      add(
        'aviso',
        'NBR 6023 4.1',
        `Referência "${r.surname}, ${r.year}" não é citada no texto.`,
        'Referências',
      );
    }
  }

  // Ordem alfabetica das referencias
  const surnames = refIndex.map((r) => r.surname).filter(Boolean);
  const sorted = [...surnames].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (surnames.join('|') !== sorted.join('|')) {
    add(
      'erro',
      'NBR 6023 4.1',
      'Lista de referências fora da ordem alfabética.',
      'Referências',
    );
  }

  const counts = { erro: 0, aviso: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;

  return {
    findings,
    counts,
    conformant: counts.erro === 0,
    checked: {
      headings: headings.length,
      references: refs.length,
      citations: cited.size,
      quotes: blocks.filter((b) => b.type === 'quote').length,
    },
  };
}
