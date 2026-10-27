/**
 * Regras de formatacao ABNT como dados.
 *
 * Fontes normativas:
 *  - NBR 14724:2011 - trabalhos academicos: apresentacao
 *  - NBR 6024:2012  - numeracao progressiva das secoes
 *  - NBR 6027:2012  - sumario
 *  - NBR 6028:2021  - resumo
 *  - NBR 10520:2023 - citacoes
 *  - NBR 6023:2018  - referencias
 *
 * Unidades: TWIP (1 cm = 567 twips, 1 pt = 20 twips). A lib `docx` trabalha em
 * twips para medidas de pagina/recuo e em half-points para tamanho de fonte.
 */

export const CM = 567;
export const PT = 20;

export const RULES = {
  page: {
    // NBR 14724 5.1: A4 (21 x 29,7 cm)
    widthTwip: Math.round(21 * CM),
    heightTwip: Math.round(29.7 * CM),
    // NBR 14724 5.2: esquerda e superior 3 cm; direita e inferior 2 cm
    marginTopTwip: 3 * CM,
    marginLeftTwip: 3 * CM,
    marginRightTwip: 2 * CM,
    marginBottomTwip: 2 * CM,
    // NBR 14724 5.3: paginacao no canto superior direito, a 2 cm da borda
    headerDistanceTwip: 2 * CM,
    footerDistanceTwip: 2 * CM,
  },

  font: {
    // NBR 14724 5.1 recomenda Arial ou Times New Roman
    family: 'Arial',
    // tamanho 12 para o texto
    bodyHalfPt: 24,
    // tamanho menor (10) para citacoes longas, notas, paginacao e legendas
    smallHalfPt: 20,
  },

  spacing: {
    // NBR 14724 5.2: espacamento 1,5 entre as linhas do texto
    bodyLine: 360, // 1,5 linhas em 240ths
    // espacamento simples para citacoes longas, notas, referencias e legendas
    singleLine: 240,
    // recuo de 1,25 cm na primeira linha do paragrafo
    firstLineIndentTwip: Math.round(1.25 * CM),
    // citacao longa: recuo de 4 cm da margem esquerda
    longQuoteIndentTwip: 4 * CM,
    // espaco antes/depois dos titulos de secao: uma linha de 1,5
    headingBeforeTwip: 18 * PT,
    headingAfterTwip: 18 * PT,
  },

  quote: {
    // NBR 10520: mais de tres linhas = citacao longa (recuo, fonte menor, sem aspas)
    longQuoteLineThreshold: 3,
  },

  abstract: {
    // NBR 6028: paragrafo unico, sem recuo, seguido de palavras-chave
    minWords: 150,
    maxWords: 500,
  },

  headings: {
    // NBR 6024: indicativo numerico alinhado a esquerda, sem ponto final,
    // separado do titulo por um espaco. Seccoes primarias em nova pagina.
    maxLevel: 5,
    primaryStartsNewPage: true,
    // Convencao usual de diferenciacao tipografica por nivel
    style: {
      1: { bold: true, caps: true, italics: false },
      2: { bold: true, caps: false, italics: false },
      3: { bold: false, caps: false, italics: false },
      4: { bold: false, caps: false, italics: true },
      5: { bold: false, caps: false, italics: true },
    },
  },

  // Secoes pre-textuais que nao recebem indicativo numerico (NBR 6024 4.1)
  unnumberedSections: [
    'resumo',
    'abstract',
    'agradecimentos',
    'dedicatoria',
    'epigrafe',
    'sumario',
    'referencias',
    'anexo',
    'apendice',
    'lista de figuras',
    'lista de tabelas',
    'lista de abreviaturas e siglas',
  ],
};

/**
 * Caracteres que cabem numa linha do corpo do texto.
 *
 * Derivado da mancha grafica, nao chutado: a largura util e a pagina menos as
 * margens laterais, e a largura media de um caractere em Arial fica em torno
 * de 0,5 em (metade do corpo da fonte). Para A4 com margens de 3 cm e 2 cm e
 * fonte 12 pt isso da ~75 caracteres, que e a ordem de grandeza observada em
 * texto corrido em portugues.
 *
 * Importa porque a NBR 10520 define citacao longa por numero de linhas, e a
 * contagem exata so existiria depois do layout. Esta estimativa decide antes.
 */
export function charsPerLine({
  fontHalfPt = RULES.font.bodyHalfPt,
  leftIndentTwip = 0,
} = {}) {
  const usableTwip =
    RULES.page.widthTwip -
    RULES.page.marginLeftTwip -
    RULES.page.marginRightTwip -
    leftIndentTwip;
  // 1 pt = 20 twips; largura media do glifo ~= 0,5 * corpo da fonte
  const avgGlyphTwip = (fontHalfPt / 2) * PT * 0.5;
  return Math.max(20, Math.floor(usableTwip / avgGlyphTwip));
}

/** Normaliza um titulo para comparar com `unnumberedSections`. */
export function normalizeTitle(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Diz se uma secao de titulo `text` deve ficar sem indicativo numerico. */
export function isUnnumbered(text) {
  const t = normalizeTitle(text);
  return RULES.unnumberedSections.some((s) => t === s || t.startsWith(s + ' '));
}
