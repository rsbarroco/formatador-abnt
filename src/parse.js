/**
 * Parser da entrada. Aceita um markdown reduzido com front matter YAML-ish:
 *
 *   ---
 *   titulo: ...
 *   autor: ...
 *   ---
 *   # Introducao
 *   Paragrafo normal.
 *   > Citacao longa, recuada 4 cm.
 *   # Referencias
 *   SOBRENOME, Nome. **Titulo**. Local: Editora, 2020.
 *
 * Produz `{ meta, blocks }`, onde cada bloco e um no tipado que o gerador
 * de .docx e o de PDF consomem sem precisar reinterpretar texto.
 */

import { RULES, charsPerLine, isUnnumbered, normalizeTitle } from './rules.js';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Le o front matter `chave: valor` e devolve `[meta, resto]`. */
function readFrontMatter(src) {
  const m = src.match(FRONT_MATTER);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return [meta, src.slice(m[0].length)];
}

/**
 * Quebra o texto corrido em `**negrito**` e `*italico*`, devolvendo os
 * fragmentos que viram `TextRun`s distintos no .docx.
 */
export function parseInline(text) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ text: m[1], bold: true });
    else runs.push({ text: m[2], italics: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}

/**
 * Decide se uma citacao e longa pela NBR 10520: mais de tres linhas.
 * Sem renderizar o texto nao ha contagem exata de linhas, entao estimamos
 * pela largura util da pagina (ver RULES.quote.charsPerLine).
 */
export function isLongQuote(text) {
  const lines = Math.ceil(text.trim().length / charsPerLine());
  return lines > RULES.quote.longQuoteLineThreshold;
}

/** Aplica a numeracao progressiva da NBR 6024 sobre os titulos. */
function numberHeadings(blocks) {
  const counters = [0, 0, 0, 0, 0];
  for (const b of blocks) {
    if (b.type !== 'heading') continue;
    if (isUnnumbered(b.text)) {
      b.indicative = null;
      continue;
    }
    const i = b.level - 1;
    counters[i] += 1;
    for (let j = i + 1; j < counters.length; j++) counters[j] = 0;
    // "1", "1.1", "1.1.1" - sem ponto final (NBR 6024 4.2)
    b.indicative = counters.slice(0, b.level).join('.');
  }
  return blocks;
}

export function parse(src) {
  const [meta, body] = readFrontMatter(src);
  const blocks = [];

  // Separa por linhas em branco, preservando os marcadores de linha
  const lines = body.split(/\r?\n/);
  let buffer = [];
  let mode = 'paragraph';

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
    buffer = [];
    if (!text) return;

    if (mode === 'quote') {
      blocks.push({
        type: 'quote',
        long: isLongQuote(text),
        runs: parseInline(text),
        text,
      });
      return;
    }
    if (mode === 'reference') {
      blocks.push({ type: 'reference', runs: parseInline(text), text });
      return;
    }
    // "Palavras-chave:" fecha o resumo (NBR 6028)
    if (/^palavras[- ]chave\s*:/i.test(text) || /^keywords\s*:/i.test(text)) {
      blocks.push({ type: 'keywords', runs: parseInline(text), text });
      return;
    }
    blocks.push({ type: 'paragraph', runs: parseInline(text), text });
  };

  let inReferences = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    const h = line.match(/^(#{1,5})\s+(.*)$/);
    if (h) {
      flush();
      mode = 'paragraph';
      const text = h[2].trim();
      blocks.push({ type: 'heading', level: h[1].length, text });
      inReferences = normalizeTitle(text).startsWith('referencias');
      continue;
    }

    if (!line.trim()) {
      flush();
      mode = inReferences ? 'reference' : 'paragraph';
      continue;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      if (mode !== 'quote') flush();
      mode = 'quote';
      buffer.push(q[1]);
      continue;
    }

    if (mode === 'quote') {
      flush();
      mode = 'paragraph';
    }
    if (inReferences) mode = 'reference';
    buffer.push(line.trim());
  }
  flush();

  numberHeadings(blocks);
  return { meta, blocks };
}
