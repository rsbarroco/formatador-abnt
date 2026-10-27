#!/usr/bin/env node
/**
 * CLI do motor ABNT.
 *
 *   node src/cli.js samples/trabalho.md --out out/trabalho
 *
 * Produz <out>.docx, <out>.pdf e <out>.report.json, e imprime o relatorio
 * de conformidade.
 */

import { Packer } from 'docx';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parse } from './parse.js';
import { buildDocument } from './docx.js';
import { buildHtml } from './html.js';
import { buildPdf } from './pdf.js';
import { validate } from './validate.js';

function parseArgs(argv) {
  const args = { input: null, out: null, skipPdf: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--no-pdf') args.skipPdf = true;
    else if (a === '--json') args.json = true;
    else if (!a.startsWith('-') && !args.input) args.input = a;
  }
  return args;
}

const SEV_LABEL = { erro: 'ERRO ', aviso: 'AVISO', info: 'INFO ' };

function printReport(report) {
  const { counts, checked, findings } = report;
  console.log('');
  console.log('Relatório de conformidade ABNT');
  console.log('------------------------------');
  console.log(
    `seções: ${checked.headings}   citações: ${checked.citations}   ` +
      `referências: ${checked.references}   citações longas: ${checked.quotes}`,
  );
  console.log(
    `erros: ${counts.erro}   avisos: ${counts.aviso}   observações: ${counts.info}`,
  );
  console.log('');
  if (!findings.length) {
    console.log('  Nenhum achado. Documento conforme as regras verificadas.');
  }
  for (const f of findings) {
    console.log(`  [${SEV_LABEL[f.severity]}] ${f.rule} — ${f.message}`);
    if (f.where) console.log(`          em: ${f.where}`);
  }
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('uso: node src/cli.js <entrada.md> [--out caminho/sem-extensao] [--no-pdf] [--json]');
    process.exit(2);
  }

  const inputPath = resolve(args.input);
  const src = await readFile(inputPath, 'utf8');
  const doc = parse(src);

  const report = validate(doc);

  const outBase = resolve(args.out ?? inputPath.replace(/\.[^.]+$/, ''));
  await mkdir(dirname(outBase), { recursive: true });

  const docxPath = `${outBase}.docx`;
  const pdfPath = `${outBase}.pdf`;
  const reportPath = `${outBase}.report.json`;

  const buffer = await Packer.toBuffer(buildDocument(doc));
  await writeFile(docxPath, buffer);

  const html = buildHtml(doc);

  let pdf = { path: null, engine: null, notes: ['PDF não solicitado.'] };
  if (!args.skipPdf) {
    pdf = await buildPdf({ docxPath, html, pdfPath });
  }

  await writeFile(
    reportPath,
    JSON.stringify({ meta: doc.meta, report, outputs: { docxPath, pdfPath: pdf.path } }, null, 2),
    'utf8',
  );

  if (args.json) {
    console.log(JSON.stringify({ report, outputs: { docxPath, pdf } }, null, 2));
  } else {
    console.log(`docx:   ${docxPath}`);
    console.log(`pdf:    ${pdf.path ?? '(não gerado)'}${pdf.engine ? ` [${pdf.engine}]` : ''}`);
    console.log(`report: ${reportPath}`);
    for (const n of pdf.notes) console.log(`nota:   ${n}`);
    printReport(report);
  }

  // Sai com 1 quando ha erro de norma, para encaixar em CI ou fila de jobs.
  process.exit(report.conformant ? 0 : 1);
}

main().catch((err) => {
  console.error('falhou:', err?.stack || err);
  process.exit(3);
});
