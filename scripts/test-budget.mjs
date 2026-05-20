/**
 * Budget parser test - run with: npx tsx scripts/test-budget.mjs
 */
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseRapportFromPdf, extractPdf } from '../lib/pdfParser.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');
const only = process.argv[2];
const pdfs = fs.readdirSync(dataDir).filter(f => f.endsWith('.pdf') && (!only || f.includes(only)));

for (const pdf of pdfs) {
  const buf = fs.readFileSync(resolve(dataDir, pdf));
  const { text, pages } = await extractPdf(buf);
  const result = parseRapportFromPdf(text, pdf, pages);

  const name = pdf.split(' - ')[1] || pdf;
  if (result.budget) {
    const b = result.budget;
    console.log('\n=== ' + name + ' ===');
    if (b.titre) console.log('titre:', b.titre);
    if (b.groupes) console.log('groupes:', b.groupes.map(g => `${g.label}[${g.debut}+${g.span}]`).join('  '));
    console.log('colonnes:', b.colonnes.map((c, i) => `${i}:${c || '∅'}`).join(' | '));
    console.log('lignes:', b.lignes.length);
    for (const l of b.lignes) {
      const cells = (l.cellules || []).map(c => c || '·').join(' | ');
      console.log(`  [${l.type}] ${l.libelle}  »  ${cells}`);
    }
  } else {
    console.log('\n=== ' + name + ' === NO BUDGET');
  }
}
