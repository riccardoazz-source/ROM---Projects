import { RapportMensuel, Commande, Facture, FactureMois, BudgetLigne, BudgetTable } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseMontant(s: string): number {
  if (!s) return 0;
  // French format: "1 234 567,89" – remove spaces, replace comma with dot
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned.replace(/[^0-9.]/g, '')) || 0;
}

export function extractMoisFromFilename(filename: string): string {
  const m = filename.match(/(\d{8})/);
  if (!m) return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const year = m[1].slice(0, 4);
  const month = parseInt(m[1].slice(4, 6), 10);
  const names = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${names[month - 1]} ${year}`;
}

export function extractDateFromFilename(filename: string): string {
  const m = filename.match(/(\d{8})/);
  return m ? m[1] : new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// ─── Section extraction ──────────────────────────────────────────────────────

function getSection(text: string, startMarker: string, endMarkers: string[]): string {
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

function getAllSections(text: string, startMarker: string, endMarkers: string[]): string[] {
  const lo = text.toLowerCase();
  const marker = startMarker.toLowerCase();
  const results: string[] = [];
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

// ─── Récapitulatif totals ────────────────────────────────────────────────────

function extractKV(lines: string[], keyword: string): number {
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

function extractKVInt(lines: string[], keyword: string): number {
  const kl = keyword.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(kl)) {
      const m = lines[i].match(/\b(\d+)\b/g);
      if (m) return parseInt(m[m.length - 1], 10);
      if (i + 1 < lines.length) {
        const m2 = lines[i + 1].match(/\b(\d+)\b/);
        if (m2) return parseInt(m2[1], 10);
      }
    }
  }
  return 0;
}

function extractPercent(lines: string[], keyword: string): number {
  const kl = keyword.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(kl)) {
      const m = lines[i].match(/(\d+)%/);
      if (m) return parseInt(m[1], 10);
      if (i + 1 < lines.length) {
        const m2 = lines[i + 1].match(/(\d+)%/);
        if (m2) return parseInt(m2[1], 10);
      }
    }
  }
  return 0;
}

// Normalize smart quotes and various apostrophe forms to plain ASCII
function normalizeApos(s: string): string {
  return s.replace(/[\u2018\u2019\u02BC\u0060]/g, "'");
}

function parseRecapTotals(text: string) {
  // Normalize apostrophes so "d\u2019avenants" matches "d'avenants"
  const lines = text.split('\n').map(l => normalizeApos(l.trim())).filter(Boolean);
  return {
    nombreTotalCommandes: extractKVInt(lines, 'nombre total de commandes') || extractKVInt(lines, 'nb commandes'),
    nombreTotalAvenants:
      extractKVInt(lines, "nombre total d'avenants") ||
      extractKVInt(lines, "nombre d'avenants") ||
      extractKVInt(lines, 'nb avenants') ||
      extractKVInt(lines, 'total avenants'),
    nombreCommandesActives: extractKVInt(lines, 'nombre de commandes actives'),
    nombreTotalFactures: extractKVInt(lines, 'nombre total factures'),
    montantTotalCommandesHT: extractKV(lines, 'montant total commandes (ht)') || extractKV(lines, 'montant total commandes'),
    montantTotalFacturesHT: extractKV(lines, 'montant total factures (ht)') || extractKV(lines, 'montant total factures'),
    totalCommandesHonorairesHT: extractKV(lines, 'total commandes honoraires'),
    totalCommandesTravauxHT: extractKV(lines, 'total commandes travaux'),
    totalCommandesDiversHT: extractKV(lines, 'total commandes divers'),
    totalTVACommandes: extractKV(lines, 'total tva commandes'),
    totalTVAFactures: extractKV(lines, 'total tva factures'),
    nombreFacturesAvecRetenue: extractKVInt(lines, 'nombre de factures avec retenue'),
    montantTotalRetenueGarantieHT: extractKV(lines, 'montant total retenue de garantie'),
    montantTotalCommandesTTC: extractKV(lines, 'montant total commandes (ttc)'),
    montantTotalFacturesTTC: extractKV(lines, 'montant total factures (ttc)'),
    pourcentageAvancementMois: extractPercent(lines, "d'avancement -"),
    pourcentageAvancementTotal: extractPercent(lines, "d'avancement total"),
  };
}

// ─── Commandes parsing ───────────────────────────────────────────────────────

interface RawEntry {
  societe: string;
  montantHT: number;
  avancement: number;
  lineIdx: number;
}

interface RawCommande {
  societe: string;
  montantHT: number;
  avancement: number;
  valeurHtRestante: number;
  lot: string;
  type: 'honoraires' | 'travaux' | 'divers';
}

const SKIP_LINE_RE = /^(société|montant ht|% d'avancement|valeur ht|honoraires|travaux|divers|bordereau|tableau|budget|liste des|date facture)/i;

// Proper French accounting number: "1 234 567,89"
// Leading digit must be 1-9 (no leading zeros) OR exactly "0".
// Followed by groups of exactly 3 digits preceded by a space.
// Never greedily matches trailing digits from a preceding company name.
const AMT = '(?:[1-9]\\d{0,2}|0)(?: \\d{3})*,\\d{2}';
const AMT_RE = new RegExp(AMT, 'g');
const AMT_PCT_RE = new RegExp(`(${AMT})\\s*[€£]?\\s*(\\d+)%`, 'g');
const AMT_AMT_RE = new RegExp(`(${AMT})\\s+(-?${AMT})`, 'g');

/**
 * Parse entries from a "% d'avancement" table section.
 * Each line contains N triplets of (société)(amount)(%).
 * Returns entries tagged with their line index (= PDF row).
 */
function parseAvancementEntries(sectionText: string): RawEntry[] {
  const lines = sectionText.split('\n').map(l => l.trim());
  const results: RawEntry[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!line || SKIP_LINE_RE.test(line)) continue;
    // Each entry: text before amount, amount, percentage
    const re = new RegExp(`(${AMT})\\s*[€£]?\\s*(\\d+)%`, 'g');
    let lastEnd = 0;
    let m: RegExpExecArray | null;
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

/**
 * Parse "valeur HT restante" table: returns societe → valeurHtRestante.
 * Each entry: (société)(montantHT)(valeur).
 */
function parseValeurEntries(sectionText: string): Map<string, number> {
  const result = new Map<string, number>();
  const lines = sectionText.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (!line || SKIP_LINE_RE.test(line)) continue;
    const re = new RegExp(`(${AMT})\\s+(-?${AMT})`, 'g');
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const societe = line.slice(lastEnd, m.index).trim();
      if (societe && !SKIP_LINE_RE.test(societe)) {
        result.set(societe, parseMontant(m[2]));
      }
      lastEnd = m.index + m[0].length;
    }
  }
  return result;
}

/**
 * Parse LOT table: returns societe → ordered array of lots (one per occurrence).
 * PDF column order is LOT/Mission | Société | Montant HT, so when pdf-parse
 * concatenates columns, the lot text appears BEFORE the société name in each line.
 * We process line by line, finding (lot_text, société, amount) triplets.
 */
function parseLotEntries(sectionText: string, knownSocietes: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!sectionText || knownSocietes.length === 0) return result;
  const sorted = [...knownSocietes].sort((a, b) => b.length - a.length);
  const AMT_INLINE = /(?:[1-9]\d{0,2}|0)(?: \d{3})*,\d{2}/g;

  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (SKIP_LINE_RE.test(line)) continue;

    // Within each line find all (lot, société, amount) triplets left-to-right
    let searchFrom = 0;
    let prevEnd = 0;

    while (searchFrom < line.length) {
      // Find the earliest société at or after searchFrom (longest wins on tie)
      let bestIdx = -1;
      let bestSociete = '';
      for (const societe of sorted) {
        const idx = line.indexOf(societe, searchFrom);
        if (idx === -1) continue;
        if (bestIdx === -1 || idx < bestIdx || (idx === bestIdx && societe.length > bestSociete.length)) {
          bestIdx = idx;
          bestSociete = societe;
        }
      }
      if (bestIdx === -1) break;

      // Amount must follow the société name directly (with optional spaces)
      const after = line.slice(bestIdx + bestSociete.length);
      const amtMatch = after.match(/^\s*((?:[1-9]\d{0,2}|0)(?: \d{3})*,\d{2})/);
      if (!amtMatch) {
        searchFrom = bestIdx + bestSociete.length;
        continue;
      }

      // Lot text = text between the previous amount end and this société start
      const rawLot = line.slice(prevEnd, bestIdx)
        .replace(AMT_INLINE, '')   // strip stray amounts (e.g. from a previous column)
        .replace(/\s+/g, ' ').trim();

      if (!result.has(bestSociete)) result.set(bestSociete, []);
      result.get(bestSociete)!.push(rawLot);

      prevEnd = bestIdx + bestSociete.length + amtMatch[0].length;
      searchFrom = prevEnd;
    }
  }
  return result;
}

/**
 * Classify entries into Honoraires/Travaux/Divers using running sums vs targets.
 *
 * Algorithm: process entries row by row. Within each row, maintain a column pointer
 * (colIdx) that advances for each entry. Skip columns already "full" (sum ≈ target).
 * Columns: 0=Honoraires, 1=Travaux, 2=Divers.
 */
function classifyByTotals(
  entries: RawEntry[],
  honorairesTarget: number,
  travauxTarget: number,
  _diversTarget: number,
): RawCommande[] {
  const EPSILON = 1.5;
  let hSum = 0, tSum = 0;

  const byLine = new Map<number, RawEntry[]>();
  for (const e of entries) {
    if (!byLine.has(e.lineIdx)) byLine.set(e.lineIdx, []);
    byLine.get(e.lineIdx)!.push(e);
  }

  const result: RawCommande[] = [];

  for (const [, rowEntries] of Array.from(byLine.entries()).sort(([a], [b]) => a - b)) {
    let colIdx = 0;

    for (const e of rowEntries) {
      // Advance past full columns (only check col 0 and 1; col 2 is always the catch-all)
      while (colIdx < 2) {
        const isFull =
          (colIdx === 0 && Math.abs(hSum - honorairesTarget) < EPSILON) ||
          (colIdx === 1 && Math.abs(tSum - travauxTarget) < EPSILON);
        if (!isFull) break;
        colIdx++;
      }

      let type: 'honoraires' | 'travaux' | 'divers';
      if (colIdx === 0) {
        type = 'honoraires';
        hSum += e.montantHT;
      } else if (colIdx === 1) {
        type = 'travaux';
        tSum += e.montantHT;
      } else {
        type = 'divers';
      }

      colIdx++;
      result.push({
        societe: e.societe,
        montantHT: e.montantHT,
        avancement: e.avancement,
        valeurHtRestante: 0,
        lot: '',
        type,
      });
    }
  }

  return result;
}

function mergeValeur(commandes: RawCommande[], valeurMap: Map<string, number>): void {
  for (const c of commandes) {
    if (valeurMap.has(c.societe)) {
      c.valeurHtRestante = valeurMap.get(c.societe)!;
    }
  }
}

function mergeLot(commandes: RawCommande[], lotMap: Map<string, string[]>): void {
  const counters = new Map<string, number>();
  for (const c of commandes) {
    const lots = lotMap.get(c.societe);
    if (!lots || lots.length === 0) continue;
    const idx = counters.get(c.societe) ?? 0;
    c.lot = lots[Math.min(idx, lots.length - 1)];
    counters.set(c.societe, idx + 1);
  }
}

// ─── Factures / Bordereau parsing ────────────────────────────────────────────

/**
 * Split "factureRefSociété" into ref and société using known société names.
 * The société is the LAST part of the combined string.
 */
function splitRefSociete(combined: string, knownSocietes: string[]): { ref: string; societe: string } {
  // Try longest match first to avoid partial matches
  const sorted = [...knownSocietes].sort((a, b) => b.length - a.length);
  for (const s of sorted) {
    const idx = combined.indexOf(s);
    if (idx !== -1) {
      return { ref: combined.slice(0, idx).trim(), societe: s };
    }
  }
  // Fallback: split at last run of uppercase letter at a word boundary
  const m = combined.match(/^(.+?)([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][A-Za-zÀ-ÿ\s\-()]+)$/);
  if (m) return { ref: m[1].trim(), societe: m[2].trim() };
  return { ref: combined, societe: 'Inconnu' };
}

/**
 * Parse a "Liste des factures" line (starts with DD/MM/YYYY, has 2 dates).
 */
function parseFactureLine(line: string, knownSocietes: string[]): Facture | null {
  const dr = /\d{2}\/\d{2}\/\d{4}/g;
  const dates: string[] = [];
  const positions: number[] = [];
  let dm: RegExpExecArray | null;
  while ((dm = dr.exec(line)) !== null) {
    dates.push(dm[0]);
    positions.push(dm.index);
  }
  if (dates.length < 2) return null;

  const dateFacture = dates[0];
  const dateValidationAMO = dates[1];
  const date1End = positions[0] + 10;
  const date2End = positions[1] + 10;

  const between = line.slice(date1End, positions[1]);
  const tail = line.slice(date2End).trim();

  const { ref, societe } = splitRefSociete(between.trim(), knownSocietes);

  // Extract monetary amounts (proper French accounting format)
  const amounts: number[] = [];
  const ar = new RegExp(AMT, 'g');
  let am: RegExpExecArray | null;
  while ((am = ar.exec(tail)) !== null) {
    amounts.push(parseMontant(am[0]));
  }
  if (amounts.length < 2) return null;

  const montantHT = amounts[0];
  const montantTTC = amounts[1];

  // Extract percentages (handles "0,00%" → "00%")
  const pcts: number[] = [];
  const pr = /(\d+)%/g;
  let pm: RegExpExecArray | null;
  while ((pm = pr.exec(tail)) !== null) {
    pcts.push(parseInt(pm[1], 10));
  }

  let retenueGarantie = 0;
  let pourcentageFactureSurCommande = 0;
  let pourcentageAvancementTotal = 0;

  if (pcts.length >= 3) {
    retenueGarantie = pcts[0];
    pourcentageFactureSurCommande = pcts[1];
    pourcentageAvancementTotal = pcts[2];
  } else if (pcts.length === 2) {
    pourcentageFactureSurCommande = pcts[0];
    pourcentageAvancementTotal = pcts[1];
  } else if (pcts.length === 1) {
    pourcentageAvancementTotal = pcts[0];
  }

  return {
    dateFacture,
    factureOuSituation: ref || between.trim(),
    societe,
    dateValidationAMO,
    montantHT,
    montantTTC,
    retenueGarantie,
    pourcentageFactureSurCommande,
    pourcentageAvancementTotal,
  };
}

/**
 * Parse a "Bordereau de paiement" line (has exactly 1 date, does NOT start with a date).
 * Format: factureRef+société + DD/MM/YYYY + HT + TVA + TTC + pct% + avancement%
 */
function parseBordereauLine(line: string, knownSocietes: string[]): FactureMois | null {
  const dr = /\d{2}\/\d{2}\/\d{4}/g;
  const dates: string[] = [];
  const positions: number[] = [];
  let dm: RegExpExecArray | null;
  while ((dm = dr.exec(line)) !== null) {
    dates.push(dm[0]);
    positions.push(dm.index);
  }
  if (dates.length !== 1) return null; // Must have exactly 1 date

  const dateValidation = dates[0];
  const before = line.slice(0, positions[0]).trim();
  const tail = line.slice(positions[0] + 10).trim();

  if (!before || before.length < 2) return null;

  const { ref, societe } = splitRefSociete(before, knownSocietes);

  const amounts: number[] = [];
  const ar = new RegExp(AMT, 'g');
  let am: RegExpExecArray | null;
  while ((am = ar.exec(tail)) !== null) {
    amounts.push(parseMontant(am[0]));
  }
  if (amounts.length < 2) return null;

  // Bordereau: HT + TVA + TTC (3 amounts) or HT + TTC (2)
  let montantHT = 0, tva = 0, montantTTC = 0;
  if (amounts.length >= 3) {
    montantHT = amounts[0];
    tva = amounts[1];
    montantTTC = amounts[2];
  } else {
    montantHT = amounts[0];
    montantTTC = amounts[1];
    tva = montantTTC - montantHT;
  }

  const pcts: number[] = [];
  const pr = /(\d+)%/g;
  let pm: RegExpExecArray | null;
  while ((pm = pr.exec(tail)) !== null) {
    pcts.push(parseInt(pm[1], 10));
  }

  return {
    factureOuSituation: ref || before,
    societe,
    dateValidation,
    montantHT,
    tva,
    montantTTC,
    pourcentageFactureSurCommande: pcts[0] ?? 0,
    pourcentageAvancementTotal: pcts[1] ?? 0,
  };
}

// ─── Budget table parser ─────────────────────────────────────────────────────

/**
 * Parse the budget section (after Bordereau de paiement) into a typed table.
 * Handles variable column counts and multi-page budgets (page separators filtered inline).
 */
function parseBudgetTable(rawText: string): BudgetTable | undefined {
  if (!rawText.trim()) return undefined;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;

  // Guard: reject if this looks like a factures section rather than a real budget table.
  // A budget table must have budget-specific column keywords, and must NOT have
  // invoice date lines (DD/MM/YYYY) in the first 20 lines.
  const BUDGET_KEYWORDS_RE = /engag[ée]|coûts futurs|reste à facturer|pr[ée]visionnel|al[ée]as|impr[ée]vus|pr[ée]vision|d[ée]penses pr[ée]v/i;
  const FACTURE_DATE_RE = /\d{2}\/\d{2}\/\d{4}/;
  const earlyLines = lines.slice(0, Math.min(20, lines.length));
  const hasFactureDates = earlyLines.some(l => FACTURE_DATE_RE.test(l));
  const hasBudgetKeywords = BUDGET_KEYWORDS_RE.test(earlyLines.join(' '));
  if (hasFactureDates || !hasBudgetKeywords) return undefined;

  const SKIP = /^(société|montant ht|% d'avancement|valeur ht|bordereau de transmission|tableau|liste des|date facture|bordereau de paiement)\b/i;
  const TOTAL_RE = /^(total|sous-total|sous total|aléas|imprévus|r[eé]serve)\b/i;
  // Extended amount pattern: also matches integers with space-separated thousands (no decimal)
  const AMT_BUDGET = '(?:[1-9]\\d{0,2}|0)(?: \\d{3})*(?:,\\d{1,2})?';
  const AMT_RE_B = new RegExp(AMT_BUDGET, 'g');

  function getAmounts(line: string): number[] {
    AMT_RE_B.lastIndex = 0;
    const amts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = AMT_RE_B.exec(line)) !== null) {
      const after = line[m.index + m[0].length];
      if (after === '%' || after === ',') continue; // skip percentages and decimal continuations
      const val = parseMontant(m[0]);
      if (val > 0) amts.push(val); // skip zeros (likely not real amounts)
    }
    return amts;
  }

  function getLibelle(line: string): string {
    let r = line.replace(new RegExp(AMT + '%?', 'g'), '');
    r = r.replace(/(?:^|\s)-(?:\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
    return r.replace(/[.:,;]+$/, '').trim();
  }

  // Extract title ("Budget - 23 février 26")
  let titre = '';
  let startIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    if (/^budget\s*$/i.test(l) || /^budget\s*[-–]/i.test(l) || /^budget\s+\d/i.test(l)) {
      titre = l;
      startIdx = i + 1;
      break;
    }
    if (getAmounts(l).length > 0) { startIdx = i; break; }
    startIdx = i + 1;
  }

  // Detect column header lines (no amounts, before first data row)
  const headerParts: string[] = [];
  let dataStartIdx = startIdx;

  for (let i = startIdx; i < Math.min(startIdx + 8, lines.length); i++) {
    const l = lines[i];
    if (!l || SKIP.test(l)) continue;
    const amts = getAmounts(l);
    if (amts.length > 0) { dataStartIdx = i; break; }
    // Split on 2+ spaces to separate column names
    const parts = l.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      // Skip first part if it's a row-label header like "Intitulés", "Désignation"
      const toAdd = /^(intitulé|libellé|désignation|prestation)/i.test(parts[0]) ? parts.slice(1) : parts;
      headerParts.push(...toAdd);
    }
    dataStartIdx = i + 1;
  }

  // Find max amount columns from all data rows
  let maxAmts = 0;
  for (let i = dataStartIdx; i < lines.length; i++) {
    const n = getAmounts(lines[i]).length;
    if (n > maxAmts) maxAmts = n;
  }
  if (maxAmts === 0) return undefined;

  // Build colonnes (trim or pad to maxAmts)
  const colonnes: string[] = headerParts.slice(0, maxAmts);
  while (colonnes.length < maxAmts) colonnes.push(`Montant ${colonnes.length + 1}`);

  // Parse data rows
  const lignes: BudgetLigne[] = [];
  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line || SKIP.test(line)) continue;
    if (/^budget\s*$/i.test(line) || /^budget\s*[-–]/i.test(line)) continue;

    const amts = getAmounts(line);
    const libelle = getLibelle(line);
    if (!libelle && amts.length === 0) continue;

    const type: BudgetLigne['type'] =
      amts.length === 0 ? 'section' :
      TOTAL_RE.test(libelle) ? 'total' : 'item';

    const valeurs = [...amts, ...new Array(maxAmts - amts.length).fill(0)];
    lignes.push({ libelle: libelle || '—', type, valeurs });
  }

  if (lignes.filter(l => l.type !== 'section').length === 0) return undefined;
  return { titre, colonnes, lignes };
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseRapportFromPdf(
  text: string,
  filename: string,
): Partial<RapportMensuel> {
  const PAGE_BREAK = 'Bordereau de transmission';
  const SECTION_ENDS = [PAGE_BREAK, 'Budget'];

  // ── 1. Totals ────────────────────────────────────────────────────────────
  const recapSection = getSection(text, 'Tableau récapitulatif du projet',
    [PAGE_BREAK, 'Tableau récapitulatif des commandes', 'Liste des factures', 'Budget']);
  const totals = parseRecapTotals(recapSection);

  // ── 2. Commandes ─────────────────────────────────────────────────────────
  const hasLotsSection = /tableau récapitulatif des commandes \(lots\)/i.test(text);
  const hasValeurRestante = /valeur ht rest/i.test(text);

  let avancementSection = '';
  let valeurSection = '';
  let lotsSection = '';

  if (hasLotsSection) {
    // Format C: separate LOTs + valeur HT restante + % d'avancement tables
    lotsSection = getSection(text, 'Tableau récapitulatif des commandes (LOTs)',
      [...SECTION_ENDS, 'Tableau récapitulatif des commandes (valeur', 'Tableau récapitulatif des commandes (%']);
    valeurSection = getSection(text, 'Tableau récapitulatif des commandes (valeur',
      [...SECTION_ENDS, "Tableau récapitulatif des commandes (%"]);
    avancementSection = getSection(text, "Tableau récapitulatif des commandes (% d'avancement)",
      SECTION_ENDS);
  } else {
    // Format A or B: find all commandes sections and classify by column headers
    const allSections = getAllSections(text, 'Tableau récapitulatif des commandes',
      [...SECTION_ENDS, 'Tableau récapitulatif des commandes']);
    for (const s of allSections) {
      if (/% d'avancement/i.test(s)) avancementSection = s;
      else if (/valeur ht/i.test(s)) valeurSection = s;
    }
    if (!avancementSection && allSections.length > 0) avancementSection = allSections[0];
  }

  const rawEntries = parseAvancementEntries(avancementSection);
  const valeurMap = hasValeurRestante ? parseValeurEntries(valeurSection) : new Map<string, number>();
  const knownSocietes = rawEntries.map(e => e.societe).filter((s, i, a) => a.indexOf(s) === i);

  const lotMap = hasLotsSection
    ? parseLotEntries(lotsSection, knownSocietes)
    : new Map<string, string[]>();

  const classified = classifyByTotals(
    rawEntries,
    totals.totalCommandesHonorairesHT,
    totals.totalCommandesTravauxHT,
    totals.totalCommandesDiversHT,
  );

  mergeValeur(classified, valeurMap);
  mergeLot(classified, lotMap);

  const commandes: Commande[] = classified.map(c => ({
    societe: c.societe,
    montantHT: c.montantHT,
    lot: c.lot,
    type: c.type,
    valeurHtRestante: c.valeurHtRestante,
    pourcentageAvancement: c.avancement,
  }));

  // ── 3. Liste des factures ────────────────────────────────────────────────
  // KEY INSIGHT: In these PDFs, facture data lines appear BEFORE the section title
  // in the raw text. We detect them by scanning ALL lines for date-starting lines
  // that contain TWO dates (dateFacture + dateValidation).
  const allLines = text.split('\n').map(l => l.trim());
  const factures: Facture[] = [];
  const seenFactures = new Set<string>();

  // Build full société list (commandes + any extra from factures)
  const allKnownSocietes = [...knownSocietes];

  for (const l of allLines) {
    if (!l || !/^\d{2}\/\d{2}\/\d{4}/.test(l)) continue;
    const dateMatches = l.match(/\d{2}\/\d{2}\/\d{4}/g);
    if (!dateMatches || dateMatches.length < 2) continue;

    const f = parseFactureLine(l, allKnownSocietes);
    if (f && f.montantHT > 0) {
      const key = `${f.dateFacture}|${f.factureOuSituation}|${f.societe}|${f.montantHT}`;
      if (!seenFactures.has(key)) {
        seenFactures.add(key);
        factures.push(f);
      }
    }
  }

  // ── 4. Bordereau de paiement ─────────────────────────────────────────────
  // KEY INSIGHT: For Bordereau, the section title IS before the data, so we can
  // use getSection correctly.
  const bordereauSection = getSection(text, 'Bordereau de paiement',
    [PAGE_BREAK, 'Tableau récapitulatif du projet', 'Liste des factures', 'Budget']);
  const facturesMois: FactureMois[] = [];

  // Build société list including facture sociétés
  const bordereauSocietes = Array.from(new Set(allKnownSocietes.concat(factures.map(f => f.societe))));
  const bordereauLines = bordereauSection.split('\n').map(l => l.trim());

  for (const l of bordereauLines) {
    if (!l) continue;
    // Must have a date but NOT start with one (Bordereau lines have 1 date in middle)
    if (/^\d{2}\/\d{2}\/\d{4}/.test(l)) continue; // skip facture-style lines
    if (!/\d{2}\/\d{2}\/\d{4}/.test(l)) continue; // must have at least 1 date
    if (!/\d+%/.test(l)) continue; // must have percentage(s)

    const fm = parseBordereauLine(l, bordereauSocietes);
    if (fm && fm.montantHT > 0) facturesMois.push(fm);
  }

  // ── 5. Budget ────────────────────────────────────────────────────────────
  // Search for "Budget" section. Prefer the occurrence after "Bordereau de paiement"
  // but fall back to the entire text so PDFs without a Bordereau still work.
  // We try multiple title variants: "Budget", "Budget prévisionnel", "BUDGET".
  function findBudgetRaw(searchText: string): string {
    const lo = searchText.toLowerCase();
    // Match "budget" at start of a line (with optional dash/date after)
    const pos = lo.search(/(?:^|\n)budget(?:\s|$|\s*[-–]|\s*pr)/m);
    if (pos === -1) return '';
    const lineStart = searchText[pos] === '\n' ? pos + 1 : pos;
    return searchText.slice(lineStart);
  }

  const bpIdx = text.toLowerCase().indexOf('bordereau de paiement');
  const afterBordereau = bpIdx !== -1 ? text.slice(bpIdx) : text;
  let budgetRaw = findBudgetRaw(afterBordereau);
  // If not found after bordereau, search entire text as fallback
  if (!budgetRaw) budgetRaw = findBudgetRaw(text);
  const budget = budgetRaw ? parseBudgetTable(budgetRaw) : undefined;

  return {
    ...totals,
    commandes,
    factures,
    facturesMois,
    ...(budget ? { budget } : {}),
  };
}
