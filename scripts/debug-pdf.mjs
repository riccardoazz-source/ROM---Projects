/**
 * Debug a specific PDF: show raw entries and classification.
 * Usage: node scripts/debug-pdf.mjs GUIDEL
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const target = process.argv[2] ?? 'GUIDEL';

const AMT = '(?:[1-9]\\d{0,2}|0)(?: \\d{3})*,\\d{2}';
const SKIP_LINE_RE = /^(société|montant ht|% d'avancement|valeur ht|honoraires|travaux|divers|bordereau|tableau|budget|liste des|date facture)/i;

function parseMontant(s) {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned.replace(/[^0-9.]/g, '')) || 0;
}

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

function getAllSections(text, startMarker, endMarkers) {
  const lo = text.toLowerCase();
  const marker = startMarker.toLowerCase();
  const results = [];
  let searchFrom = 0;
  while (true) {
    const start = lo.indexOf(marker, searchFrom);
    if (start === -1) break;
    let end = text.length;
    for (const em of endMarkers) {
      const ei = lo.indexOf(em.toLowerCase(), start + marker.length);
      if (ei !== -1 && ei < end) end = ei;
    }
    results.push(text.slice(start, end));
    searchFrom = start + marker.length;
  }
  return results;
}

function extractKV(lines, keyword) {
  const kl = keyword.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(kl)) {
      const sameMatch = lines[i].match(/([\d\s]+[,.][\d]{2})/);
      if (sameMatch) return parseMontant(sameMatch[1]);
      if (i + 1 < lines.length) {
        const nextMatch = lines[i + 1].match(/([\d\s]+[,.][\d]{2})/);
        if (nextMatch) return parseMontant(nextMatch[1]);
      }
    }
  }
  return 0;
}

function parseRecapTotals(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    totalCommandesHonorairesHT: extractKV(lines, 'total commandes honoraires'),
    totalCommandesTravauxHT: extractKV(lines, 'total commandes travaux'),
    totalCommandesDiversHT: extractKV(lines, 'total commandes divers'),
  };
}

function parseAvancementEntries(sectionText) {
  const lines = sectionText.split('\n').map(l => l.trim());
  const results = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!line || SKIP_LINE_RE.test(line)) continue;
    const re = new RegExp(`(${AMT})\\s*(\\d+)%`, 'g');
    let lastEnd = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const societe = line.slice(lastEnd, m.index).trim();
      const montantHT = parseMontant(m[1]);
      const avancement = parseInt(m[2], 10);
      if (societe && !SKIP_LINE_RE.test(societe)) {
        results.push({ societe, montantHT, avancement, lineIdx: li });
      }
      lastEnd = m.index + m[0].length;
    }
  }
  return results;
}

function classifyByTotals(entries, honorairesTarget, travauxTarget) {
  const EPSILON = 1.5;
  let hSum = 0, tSum = 0;
  const byLine = new Map();
  for (const e of entries) {
    if (!byLine.has(e.lineIdx)) byLine.set(e.lineIdx, []);
    byLine.get(e.lineIdx).push(e);
  }
  const result = [];
  for (const [, rowEntries] of [...byLine.entries()].sort(([a], [b]) => a - b)) {
    let colIdx = 0;
    for (const e of rowEntries) {
      while (colIdx < 2) {
        const isFull =
          (colIdx === 0 && Math.abs(hSum - honorairesTarget) < EPSILON) ||
          (colIdx === 1 && Math.abs(tSum - travauxTarget) < EPSILON);
        if (!isFull) break;
        colIdx++;
      }
      let type;
      if (colIdx === 0) { type = 'H'; hSum += e.montantHT; }
      else if (colIdx === 1) { type = 'T'; tSum += e.montantHT; }
      else { type = 'D'; }
      colIdx++;
      result.push({ ...e, type });
    }
  }
  return { result, hSum, tSum };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const dataDir = resolve(rootDir, 'data');
const files = readdirSync(dataDir).filter(f => f.endsWith('.pdf') && f.includes(target));

if (files.length === 0) {
  console.error(`No PDF matching "${target}" found in data/`);
  process.exit(1);
}

const pdfParse = (await import('pdf-parse')).default;

for (const file of files) {
  console.log(`\n=== ${file} ===\n`);
  const buf = readFileSync(resolve(dataDir, file));
  const data = await pdfParse(buf);
  const text = data.text;

  const PAGE_BREAK = 'Bordereau de transmission';
  const SECTION_ENDS = [PAGE_BREAK, 'Budget'];

  const recapSection = getSection(text, 'Tableau récapitulatif du projet',
    [PAGE_BREAK, 'Tableau récapitulatif des commandes', 'Liste des factures', 'Budget']);
  const totals = parseRecapTotals(recapSection);
  const H_target = totals.totalCommandesHonorairesHT;
  const T_target = totals.totalCommandesTravauxHT;
  const D_target = totals.totalCommandesDiversHT;

  console.log(`Targets: H=${H_target.toFixed(0)} T=${T_target.toFixed(0)} D=${D_target.toFixed(0)}`);

  const hasLotsSection = /tableau récapitulatif des commandes \(lots\)/i.test(text);
  console.log(`Format: ${hasLotsSection ? 'C (LOTs)' : 'A/B'}`);

  let avancementSection = '';
  if (hasLotsSection) {
    avancementSection = getSection(text, "Tableau récapitulatif des commandes (% d'avancement)", SECTION_ENDS);
  } else {
    const allSections = getAllSections(text, 'Tableau récapitulatif des commandes',
      [...SECTION_ENDS, 'Tableau récapitulatif des commandes']);
    for (const s of allSections) {
      if (/% d'avancement/i.test(s)) { avancementSection = s; break; }
    }
    if (!avancementSection && allSections.length > 0) avancementSection = allSections[0];
  }

  console.log(`\nAvancement section length: ${avancementSection.length}`);
  if (avancementSection.length < 2000) {
    console.log('\n--- Avancement section ---');
    console.log(avancementSection);
    console.log('--- end ---\n');
  }

  const rawEntries = parseAvancementEntries(avancementSection);
  console.log(`\nRaw entries (${rawEntries.length}):`);
  for (const e of rawEntries) {
    console.log(`  line${e.lineIdx}: [${e.societe}] ${e.montantHT.toFixed(0)} @ ${e.avancement}%`);
  }

  const { result: classified, hSum, tSum } = classifyByTotals(rawEntries, H_target, T_target);
  const dSum = classified.filter(c => c.type === 'D').reduce((a, c) => a + c.montantHT, 0);

  console.log(`\nClassified (${classified.length}):`);
  for (const c of classified) {
    console.log(`  [${c.type}] ${c.societe}: ${c.montantHT.toFixed(0)}`);
  }

  console.log(`\nSums: H=${hSum.toFixed(0)}/${H_target.toFixed(0)} T=${tSum.toFixed(0)}/${T_target.toFixed(0)} D=${dSum.toFixed(0)}/${D_target.toFixed(0)}`);
  const ok = Math.abs(hSum - H_target) < 1.5 && Math.abs(tSum - T_target) < 1.5 && Math.abs(dSum - D_target) < 1.5;
  console.log(ok ? '\n✓ PASS' : '\n✗ FAIL');
}
