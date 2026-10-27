/**
 * Geracao do PDF, em duas estrategias:
 *
 *  1. LibreOffice (`soffice`), convertendo o .docx ja formatado. E a preferida:
 *     preserva as tres secoes de paginacao e o campo de sumario.
 *  2. Chrome headless imprimindo o HTML de `html.js`. Funciona em qualquer
 *     maquina com Chrome, mas o Chrome nao implementa as margin boxes de
 *     `@page`, entao essa saida fica sem o numero de folha.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { dirname, join, basename, extname } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const SOFFICE_CANDIDATES = [
  'C:/Program Files/LibreOffice/program/soffice.exe',
  'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
];

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBinary(candidates) {
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Converte o .docx em PDF pelo LibreOffice. Devolve o caminho do PDF. */
async function viaLibreOffice(soffice, docxPath) {
  const outDir = dirname(docxPath);
  await run(
    soffice,
    ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', outDir, docxPath],
    { timeout: 180000 },
  );
  const produced = join(outDir, basename(docxPath, extname(docxPath)) + '.pdf');
  if (!existsSync(produced)) throw new Error('LibreOffice nao produziu o PDF esperado');
  return produced;
}

/** Imprime o HTML em PDF pelo Chrome headless. Devolve o caminho do PDF. */
async function viaChrome(chrome, html, pdfPath) {
  const htmlPath = pdfPath.replace(/\.pdf$/, '.print.html');
  await writeFile(htmlPath, html, 'utf8');
  const tmpPdf = pdfPath + '.tmp.pdf';
  await run(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      `--print-to-pdf=${tmpPdf}`,
      'file:///' + htmlPath.replace(/\\/g, '/'),
    ],
    { timeout: 180000 },
  );
  if (!existsSync(tmpPdf)) throw new Error('Chrome nao produziu o PDF esperado');
  await rename(tmpPdf, pdfPath);
  return pdfPath;
}

/**
 * Gera o PDF usando a melhor estrategia disponivel.
 * Devolve `{ path, engine, notes }`; `path` e null se nenhuma estiver presente.
 */
export async function buildPdf({ docxPath, html, pdfPath }) {
  const notes = [];

  const soffice = findBinary(SOFFICE_CANDIDATES);
  if (soffice && docxPath) {
    try {
      const path = await viaLibreOffice(soffice, docxPath);
      return { path, engine: 'libreoffice', notes };
    } catch (err) {
      notes.push(`LibreOffice falhou (${err.message}); caindo para o Chrome.`);
    }
  } else {
    notes.push('LibreOffice nao encontrado; usando o Chrome headless.');
  }

  const chrome = findBinary(CHROME_CANDIDATES);
  if (!chrome) {
    notes.push('Nenhum Chrome/Edge encontrado: PDF nao gerado.');
    return { path: null, engine: null, notes };
  }
  try {
    const path = await viaChrome(chrome, html, pdfPath);
    notes.push(
      'PDF impresso pelo Chrome: sai sem o numero de folha, porque o Chrome ' +
        'nao implementa as margin boxes de @page. O .docx tem a paginacao correta.',
    );
    return { path, engine: 'chrome', notes };
  } catch (err) {
    notes.push(`Chrome falhou: ${err.message}`);
    return { path: null, engine: null, notes };
  }
}
