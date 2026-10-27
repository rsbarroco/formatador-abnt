/**
 * Gerador de .docx editavel aplicando as regras de `rules.js`.
 *
 * O documento sai em tres secoes para resolver a paginacao da NBR 14724 5.3:
 * a contagem comeca na folha de rosto, mas o numero so aparece a partir da
 * primeira folha textual.
 *
 *   secao A - capa             : nao contada, sem numero
 *   secao B - pre-textuais     : contagem comeca em 1, numero oculto
 *   secao C - textual em diante: continua a contagem, numero visivel
 */

import {
  AlignmentType,
  Document,
  Header,
  HeadingLevel,
  LineRuleType,
  PageNumber,
  Paragraph,
  SectionType,
  TabStopType,
  TableOfContents,
  TextRun,
} from 'docx';
import { RULES, isUnnumbered, normalizeTitle } from './rules.js';

const F = RULES.font;
const S = RULES.spacing;
const P = RULES.page;

const HEADING_LEVEL = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
};

/** Converte os runs do parser em `TextRun`s com a fonte do corpo. */
function runs(list, { size = F.bodyHalfPt, bold, italics, caps } = {}) {
  return list.map(
    (r) =>
      new TextRun({
        text: caps ? r.text.toLocaleUpperCase('pt-BR') : r.text,
        bold: bold ?? r.bold,
        italics: italics ?? r.italics,
        font: F.family,
        size,
      }),
  );
}

function plain(text, opts = {}) {
  return runs([{ text }], opts);
}

/** Paragrafo de texto corrido: justificado, 1,5 linha, recuo de 1,25 cm. */
function bodyParagraph(block) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: S.bodyLine, lineRule: LineRuleType.AUTO, after: 0 },
    indent: { firstLine: S.firstLineIndentTwip },
    children: runs(block.runs),
  });
}

/**
 * Citacao: longa (mais de tres linhas) recua 4 cm, cai para fonte 10 e
 * espacamento simples, sem aspas. Curta volta ao corpo entre aspas duplas.
 */
function quoteParagraph(block) {
  if (!block.long) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: S.bodyLine, lineRule: LineRuleType.AUTO },
      indent: { firstLine: S.firstLineIndentTwip },
      children: plain(`"${block.text}"`),
    });
  }
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      line: S.singleLine,
      lineRule: LineRuleType.AUTO,
      before: 12 * 20,
      after: 12 * 20,
    },
    indent: { left: S.longQuoteIndentTwip },
    children: runs(block.runs, { size: F.smallHalfPt }),
  });
}

/** Titulo de secao com o indicativo numerico da NBR 6024. */
function headingParagraph(block) {
  const style = RULES.headings.style[block.level] ?? RULES.headings.style[3];
  const label = block.indicative ? `${block.indicative} ${block.text}` : block.text;
  const unnumbered = isUnnumbered(block.text);

  return new Paragraph({
    heading: HEADING_LEVEL[block.level],
    // Secoes sem indicativo (resumo, sumario, referencias) ficam centralizadas;
    // as numeradas vao alinhadas a esquerda.
    alignment: unnumbered ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: {
      before: S.headingBeforeTwip,
      after: S.headingAfterTwip,
      line: S.bodyLine,
      lineRule: LineRuleType.AUTO,
    },
    // Secao primaria comeca em folha nova
    pageBreakBefore: block.level === 1 && RULES.headings.primaryStartsNewPage,
    children: plain(label, {
      bold: style.bold,
      italics: style.italics,
      caps: style.caps,
    }),
  });
}

/** Resumo: paragrafo unico, sem recuo, espacamento simples (NBR 6028). */
function abstractParagraph(block) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: S.singleLine, lineRule: LineRuleType.AUTO },
    indent: { firstLine: 0 },
    children: runs(block.runs),
  });
}

/** Referencia: alinhada a esquerda, simples, linha em branco entre entradas. */
function referenceParagraph(block) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      line: S.singleLine,
      lineRule: LineRuleType.AUTO,
      after: 12 * 20,
    },
    children: runs(block.runs),
  });
}

function keywordsParagraph(block) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: S.singleLine, lineRule: LineRuleType.AUTO, before: 12 * 20 },
    children: runs(block.runs),
  });
}

function centered(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: S.bodyLine, lineRule: LineRuleType.AUTO },
    children: plain(text, opts),
  });
}

function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [] }));
}

/** Capa (NBR 14724 4.1.1): instituicao, autor, titulo, local e ano. */
function buildCover(meta) {
  const out = [];
  if (meta.instituicao) out.push(centered(meta.instituicao, { bold: true, caps: true }));
  if (meta.unidade) out.push(centered(meta.unidade, { caps: true }));
  if (meta.curso) out.push(centered(meta.curso, { caps: true }));
  out.push(...blank(4));
  if (meta.autor) out.push(centered(meta.autor, { caps: true }));
  out.push(...blank(4));
  if (meta.titulo) out.push(centered(meta.titulo, { bold: true, caps: true }));
  if (meta.subtitulo) out.push(centered(meta.subtitulo));
  out.push(...blank(8));
  if (meta.local) out.push(centered(meta.local, { caps: true }));
  if (meta.ano) out.push(centered(String(meta.ano)));
  return out;
}

/**
 * Folha de rosto (NBR 14724 4.1.2). A natureza do trabalho vai recuada a
 * partir do meio da pagina, em espacamento simples.
 */
function buildTitlePage(meta) {
  const out = [];
  if (meta.autor) out.push(centered(meta.autor, { caps: true }));
  out.push(...blank(4));
  if (meta.titulo) out.push(centered(meta.titulo, { bold: true, caps: true }));
  if (meta.subtitulo) out.push(centered(meta.subtitulo));
  out.push(...blank(3));

  const natureza = [
    meta.tipo,
    meta.curso ? `apresentado ao curso de ${meta.curso}` : null,
    meta.instituicao ? `da ${meta.instituicao}` : null,
    meta.objetivo ? `como requisito ${meta.objetivo}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (natureza) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: S.singleLine, lineRule: LineRuleType.AUTO },
        // recuo a partir do meio da mancha grafica (8 cm da margem esquerda)
        indent: { left: Math.round(8 * 567) },
        children: plain(natureza + '.'),
      }),
    );
  }
  out.push(...blank(2));
  if (meta.orientador) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: S.singleLine, lineRule: LineRuleType.AUTO },
        indent: { left: Math.round(8 * 567) },
        children: plain(`Orientador: ${meta.orientador}`),
      }),
    );
  }
  out.push(...blank(6));
  if (meta.local) out.push(centered(meta.local, { caps: true }));
  if (meta.ano) out.push(centered(String(meta.ano)));
  return out;
}

/** Sumario como campo nativo do Word, para atualizar junto com o documento. */
function buildSummary() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: S.headingAfterTwip, line: S.bodyLine },
      children: plain('SUMÁRIO', { bold: true, caps: true }),
    }),
    new TableOfContents('Sumário', {
      hyperlink: true,
      headingStyleRange: '1-5',
      // 2 = numero de pagina alinhado a direita com preenchimento de pontos
      captionLabel: undefined,
    }),
  ];
}

/** Numeracao no canto superior direito (NBR 14724 5.3), fonte 10. */
function pageNumberHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        tabStops: [{ type: TabStopType.RIGHT, position: 8800 }],
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: F.family,
            size: F.smallHalfPt,
          }),
        ],
      }),
    ],
  });
}

const PAGE_PROPS = {
  page: {
    size: { width: P.widthTwip, height: P.heightTwip },
    margin: {
      top: P.marginTopTwip,
      right: P.marginRightTwip,
      bottom: P.marginBottomTwip,
      left: P.marginLeftTwip,
      header: P.headerDistanceTwip,
      footer: P.footerDistanceTwip,
    },
  },
};

/** Converte um bloco do parser no paragrafo .docx correspondente. */
function renderBlock(block, ctx) {
  switch (block.type) {
    case 'heading':
      return headingParagraph(block);
    case 'quote':
      return quoteParagraph(block);
    case 'reference':
      return referenceParagraph(block);
    case 'keywords':
      return keywordsParagraph(block);
    case 'paragraph':
      return ctx.inAbstract ? abstractParagraph(block) : bodyParagraph(block);
    default:
      return bodyParagraph(block);
  }
}

/**
 * Parte os blocos em pre-textuais (resumo, abstract, listas) e textuais.
 * O corte e a primeira secao primaria numerada - normalmente a introducao.
 */
function splitPreTextual(blocks) {
  const cut = blocks.findIndex(
    (b) => b.type === 'heading' && b.level === 1 && b.indicative !== null,
  );
  if (cut === -1) return [blocks, []];
  return [blocks.slice(0, cut), blocks.slice(cut)];
}

export function buildDocument({ meta, blocks }) {
  const [pre, textual] = splitPreTextual(blocks);

  const ctx = { inAbstract: false };
  const render = (list) =>
    list.map((b) => {
      if (b.type === 'heading') {
        const t = normalizeTitle(b.text);
        ctx.inAbstract = t === 'resumo' || t === 'abstract';
      }
      return renderBlock(b, ctx);
    });

  const styles = {
    default: {
      document: {
        run: { font: F.family, size: F.bodyHalfPt },
        paragraph: { spacing: { line: S.bodyLine, lineRule: LineRuleType.AUTO } },
      },
    },
    // Os estilos de titulo existem para alimentar o sumario automatico;
    // a aparencia vem dos runs montados em headingParagraph.
    paragraphStyles: [1, 2, 3, 4, 5].map((lvl) => ({
      id: `Heading${lvl}`,
      name: `Heading ${lvl}`,
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { font: F.family, size: F.bodyHalfPt, color: '000000' },
    })),
  };

  const sections = [
    // A - capa: fora da contagem de folhas
    {
      properties: { ...PAGE_PROPS, type: SectionType.NEXT_PAGE },
      children: buildCover(meta),
    },
    // B - pre-textuais: contagem comeca aqui, numero oculto
    {
      properties: {
        ...PAGE_PROPS,
        type: SectionType.NEXT_PAGE,
        page: { ...PAGE_PROPS.page, pageNumbers: { start: 1 } },
      },
      children: [
        ...buildTitlePage(meta),
        new Paragraph({ children: [], pageBreakBefore: true }),
        ...render(pre),
        new Paragraph({ children: [], pageBreakBefore: true }),
        ...buildSummary(),
      ],
    },
  ];

  if (textual.length) {
    // C - textual: continua a contagem e passa a exibir o numero
    sections.push({
      properties: { ...PAGE_PROPS, type: SectionType.NEXT_PAGE },
      headers: { default: pageNumberHeader() },
      children: render(textual),
    });
  }

  return new Document({
    creator: meta.autor || 'formatador-abnt',
    title: meta.titulo || 'Trabalho academico',
    description: 'Documento formatado pelo motor ABNT (formatador-abnt)',
    styles,
    features: { updateFields: true },
    sections,
  });
}
