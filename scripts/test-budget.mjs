/**
 * Budget parser test - run with: node scripts/test-budget.mjs
 */
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseRapportFromPdf } from '../lib/pdfParser.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');
const pdfs = fs.readdirSync(dataDir).filter(f => f.endsWith('.pdf'));

for (const pdf of pdfs) {
  const pdfPath = resolve(dataDir, pdf);
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  const result = parseRapportFromPdf(data.text, pdf);

  const name = pdf.split(' - ')[1] || pdf;
  if (result.budget) {
    const b = result.budget;
    console.log('\n=== ' + name + ' ===');
    console.log('cols:', b.colonnes.join(' | '));
    console.log('lignes:', b.lignes.length);
    for (const l of b.lignes) {
      const vals = l.valeurs.filter(v => v !== 0).join(' | ');
      console.log('[' + l.type + '] ' + l.libelle + (vals ? ' → ' + vals : ''));
    }
  } else {
    console.log('\n=== ' + name + ' === NO BUDGET');
  }
}
