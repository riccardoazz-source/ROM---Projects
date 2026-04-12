/**
 * Debug the recap section for failing PDFs.
 * Usage: node scripts/debug-recap.mjs GUIDEL
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const target = process.argv[2] ?? 'GUIDEL';

function getSection(text, startMarker, endMarkers) {
  const lo = text.toLowerCase();
  const start = lo.indexOf(startMarker.toLowerCase());
  if (start === -1) return '';
  let end = text.length;
  for (const em of endMarkers) {
    const ei = lo.indexOf(em.toLowerCase(), start + startMarker.length);
    if (ei !== -1 && ei < end) end = ei;
  }
  return text.slice(start, end);
}

const dataDir = resolve(rootDir, 'data');
const files = readdirSync(dataDir).filter(f => f.endsWith('.pdf') && f.includes(target));
const pdfParse = (await import('pdf-parse')).default;

for (const file of files) {
  console.log(`\n=== ${file} ===\n`);
  const buf = readFileSync(resolve(dataDir, file));
  const data = await pdfParse(buf);
  const text = data.text;

  const PAGE_BREAK = 'Bordereau de transmission';
  const recapSection = getSection(text, 'Tableau récapitulatif du projet',
    [PAGE_BREAK, 'Tableau récapitulatif des commandes', 'Liste des factures', 'Budget']);

  console.log('--- Recap section ---');
  console.log(recapSection);
  console.log('--- end ---');
}
