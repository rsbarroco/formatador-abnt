/**
 * Renderiza a mesma arvore de blocos como HTML paginado, para imprimir em PDF
 * pelo Chrome headless. As medidas espelham `rules.js`, em cm/pt.
 */

import { RULES, isUnnumbered, normalizeTitle } from './rules.js';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function inline(list) {
  return list
    .map((r) => {
      const t = esc(r.text);
      if (r.bold) return `<strong>${t}</strong>`;
      if (r.italics) return `<em>${t}</em>`;
      return t;
    })
    .join('');
}

const CSS = `
@page {
  size: A4;
  /* NBR 14724 5.2 - esquerda/superior 3 cm, direita/inferior 2 cm */
  margin: 3cm 2cm 2cm 3cm;
}
/* Paginacao no canto superior direito, a 2 cm da borda (NBR 14724 5.3).
   A capa e as pre-textuais ficam sem numero visivel. */
@page textual {
  @top-right { content: counter(page); font-size: 10pt; }
}
html, body { margin: 0; padding: 0; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  text-align: justify;
  color: #000;
}
p { margin: 0; text-indent: 1.25cm; }
/* Resumo: paragrafo unico, sem recuo, espacamento simples (NBR 6028) */
.abstract p { text-indent: 0; line-height: 1; }
.keywords { text-indent: 0; line-height: 1; margin-top: 12pt; }
/* Citacao longa: recuo 4 cm, fonte 10, espaco simples, sem aspas (NBR 10520) */
blockquote {
  margin: 12pt 0 12pt 4cm;
  font-size: 10pt;
  line-height: 1;
  text-indent: 0;
}
/* Titulos - numeracao progressiva da NBR 6024 ja vem no texto */
h1, h2, h3, h4, h5 {
  font-size: 12pt;
  font-weight: normal;
  line-height: 1.5;
  margin: 18pt 0;
  text-align: left;
  page-break-after: avoid;
}
h1 { font-weight: bold; text-transform: uppercase; page-break-before: always; }
h2 { font-weight: bold; }
h4, h5 { font-style: italic; }
h1.unnumbered, h2.unnumbered { text-align: center; }
/* Referencias: alinhadas a esquerda, simples, linha em branco entre entradas */
.reference {
  text-align: left;
  text-indent: 0;
  line-height: 1;
  margin-bottom: 12pt;
}
.sheet { page-break-after: always; }
.cover, .titlepage { text-align: center; }
.cover p, .titlepage p { text-indent: 0; }
.cover .spacer, .titlepage .spacer { height: 1.5em; }
.caps { text-transform: uppercase; }
.bold { font-weight: bold; }
/* Natureza do trabalho recuada a partir do meio da mancha (NBR 14724 4.1.2) */
.nature { margin-left: 8cm; text-align: justify; text-indent: 0; line-height: 1; }
.toc { text-indent: 0; }
.toc li { list-style: none; margin: 0; line-height: 1.5; }
.toc ul { padding-left: 0; margin: 0; }
.toc .lvl2 { padding-left: 1.5em; }
.toc .lvl3 { padding-left: 3em; }
.toc .lvl4 { padding-left: 4.5em; }
.toc .lvl5 { padding-left: 6em; }
.center { text-align: center; }
`;

function coverHtml(meta) {
  const rows = [];
  const line = (txt, cls = '') => rows.push(`<p class="${cls}">${esc(txt)}</p>`);
  const gap = (n) => rows.push(`<div class="spacer" style="height:${n * 1.5}em"></div>`);

  if (meta.instituicao) line(meta.instituicao, 'caps bold');
  if (meta.unidade) line(meta.unidade, 'caps');
  if (meta.curso) line(meta.curso, 'caps');
  gap(4);
  if (meta.autor) line(meta.autor, 'caps');
  gap(4);
  if (meta.titulo) line(meta.titulo, 'caps bold');
  if (meta.subtitulo) line(meta.subtitulo);
  gap(8);
  if (meta.local) line(meta.local, 'caps');
  if (meta.ano) line(String(meta.ano));
  return `<section class="sheet cover">${rows.join('\n')}</section>`;
}

function titlePageHtml(meta) {
  const rows = [];
  const line = (txt, cls = '') => rows.push(`<p class="${cls}">${esc(txt)}</p>`);
  const gap = (n) => rows.push(`<div class="spacer" style="height:${n * 1.5}em"></div>`);

  if (meta.autor) line(meta.autor, 'caps');
  gap(4);
  if (meta.titulo) line(meta.titulo, 'caps bold');
  if (meta.subtitulo) line(meta.subtitulo);
  gap(3);

  const natureza = [
    meta.tipo,
    meta.curso ? `apresentado ao curso de ${meta.curso}` : null,
    meta.instituicao ? `da ${meta.instituicao}` : null,
    meta.objetivo ? `como requisito ${meta.objetivo}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  if (natureza) rows.push(`<p class="nature">${esc(natureza)}.</p>`);
  gap(2);
  if (meta.orientador) rows.push(`<p class="nature">Orientador: ${esc(meta.orientador)}</p>`);
  gap(6);
  if (meta.local) line(meta.local, 'caps');
  if (meta.ano) line(String(meta.ano));
  return `<section class="sheet titlepage">${rows.join('\n')}</section>`;
}

/**
 * Sumario (NBR 6027). O Chrome nao resolve `target-counter`, entao o PDF sai
 * com os indicativos e os titulos, sem o numero da folha; o .docx usa o campo
 * nativo do Word e traz a paginacao completa.
 */
function tocHtml(blocks) {
  const items = blocks
    .filter((b) => b.type === 'heading' && !isUnnumbered(b.text))
    .map((b) => {
      const label = b.indicative ? `${b.indicative} ${b.text}` : b.text;
      const caps = b.level === 1 ? ' caps bold' : '';
      return `<li class="lvl${b.level}${caps}">${esc(label)}</li>`;
    })
    .join('\n');
  return `<section class="sheet toc">
<h1 class="unnumbered">SUMÁRIO</h1>
<ul>${items}</ul>
</section>`;
}

function blockHtml(block, ctx) {
  switch (block.type) {
    case 'heading': {
      const label = block.indicative ? `${block.indicative} ${block.text}` : block.text;
      const cls = isUnnumbered(block.text) ? ' class="unnumbered"' : '';
      return `<h${block.level}${cls}>${esc(label)}</h${block.level}>`;
    }
    case 'quote':
      return block.long
        ? `<blockquote>${inline(block.runs)}</blockquote>`
        : `<p>"${inline(block.runs)}"</p>`;
    case 'reference':
      return `<p class="reference">${inline(block.runs)}</p>`;
    case 'keywords':
      return `<p class="keywords">${inline(block.runs)}</p>`;
    default:
      return ctx.inAbstract
        ? `<div class="abstract"><p>${inline(block.runs)}</p></div>`
        : `<p>${inline(block.runs)}</p>`;
  }
}

export function buildHtml({ meta, blocks }) {
  const cut = blocks.findIndex(
    (b) => b.type === 'heading' && b.level === 1 && b.indicative !== null,
  );
  const pre = cut === -1 ? blocks : blocks.slice(0, cut);
  const textual = cut === -1 ? [] : blocks.slice(cut);

  const ctx = { inAbstract: false };
  const render = (list) =>
    list
      .map((b) => {
        if (b.type === 'heading') {
          const t = normalizeTitle(b.text);
          ctx.inAbstract = t === 'resumo' || t === 'abstract';
        }
        return blockHtml(b, ctx);
      })
      .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(meta.titulo || 'Trabalho academico')}</title>
<style>${CSS}</style>
</head>
<body>
${coverHtml(meta)}
${titlePageHtml(meta)}
<section class="sheet">${render(pre)}</section>
${tocHtml(blocks)}
<section class="textual">${render(textual)}</section>
</body>
</html>`;
}
