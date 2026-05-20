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
 * Parse "valeur HT restante" table: returns societe → ordered list of valeurHtRestante.
 * A société can appear multiple times (once per commande type). Using an ordered list
 * lets mergeValeur assign the correct value to each occurrence via a counter.
 * Each entry: (société)(montantHT)(valeur).
 */
function parseValeurEntries(sectionText: string): Map<string, number[]> {
  const result = new Map<string, number[]>();
  const lines = sectionText.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (!line || SKIP_LINE_RE.test(line)) continue;
    const re = new RegExp(`(${AMT})\\s+(-?${AMT})`, 'g');
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const societe = line.slice(lastEnd, m.index).trim();
      if (societe && !SKIP_LINE_RE.test(societe)) {
        if (!result.has(societe)) result.set(societe, []);
        result.get(societe)!.push(parseMontant(m[2]));
      }
      lastEnd = m.index + m[0].length;
    }
  }
  return result;
}

/**
 * Parse LOT table: returns societe → ordered array of lots (one per occurrence).
 * PDF column order is Société | Montant HT | LOT/Mission. When pdf-parse
 * concatenates a row, each entry appears as: SOCIÉTÉ AMOUNT LOT_TEXT [next entry...]
 * We collect all (société, amtEnd) pairs first, then assign LOT = text from
 * the amount-end of entry[i] to the société-start of entry[i+1].
 */
function parseLotEntries(sectionText: string, knownSocietes: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!sectionText || knownSocietes.length === 0) return result;
  const sorted = [...knownSocietes].sort((a, b) => b.length - a.length);

  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (SKIP_LINE_RE.test(line)) continue;

    // Collect (société, socStart, amtEnd) triples in left-to-right order
    const entries: Array<{ societe: string; socStart: number; amtEnd: number }> = [];
    let searchFrom = 0;

    while (searchFrom < line.length) {
      // Find the earliest known société at or after searchFrom
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

      // Amount must follow the société name (Société | Montant HT | LOT column order)
      const after = line.slice(bestIdx + bestSociete.length);
      const amtMatch = after.match(/^\s*((?:[1-9]\d{0,2}|0)(?: \d{3})*,\d{2})/);
      if (!amtMatch) {
        searchFrom = bestIdx + bestSociete.length;
        continue;
      }

      entries.push({
        societe: bestSociete,
        socStart: bestIdx,
        amtEnd: bestIdx + bestSociete.length + amtMatch[0].length,
      });
      searchFrom = entries[entries.length - 1].amtEnd;
    }

    // Assign LOT: text from entry[i].amtEnd → entry[i+1].socStart (or end of line)
    for (let i = 0; i < entries.length; i++) {
      const { societe, amtEnd } = entries[i];
      const nextStart = i + 1 < entries.length ? entries[i + 1].socStart : line.length;
      const rawLot = line.slice(amtEnd, nextStart).replace(/\s+/g, ' ').trim();

      if (!result.has(societe)) result.set(societe, []);
      result.get(societe)!.push(rawLot);
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

function mergeValeur(commandes: RawCommande[], valeurMap: Map<string, number[]>): void {
  const counters = new Map<string, number>();
  for (const c of commandes) {
    const vals = valeurMap.get(c.societe);
    if (!vals || vals.length === 0) continue;
    const idx = counters.get(c.societe) ?? 0;
    c.valeurHtRestante = vals[Math.min(idx, vals.length - 1)];
    counters.set(c.societe, idx + 1);
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

  // Guard: reject if this looks like a factures/bordereau section.
  // Strategy: count ALL lines containing a DD/MM/YYYY date pattern.
  // A real budget table has ≤2 date references (e.g. the title "Budget - Mars 2026").
  // A factures section has one date per invoice row → many date-containing lines.
  const BUDGET_KEYWORDS_RE = /engag[ée]|coûts futurs|reste à facturer|pr[ée]visionnel|al[ée]as|impr[ée]vus|pr[ée]vision|d[ée]penses pr[ée]v|pr[ée]vus|montant total|désignation|intitulé|libellé/i;
  const FACTURE_DATE_RE = /\d{2}\/\d{2}\/\d{4}/;
  const dateLineCount = lines.filter(l => FACTURE_DATE_RE.test(l)).length;
  if (dateLineCount > 2) return undefined;
  // Budget keywords can appear anywhere in the section
  if (!BUDGET_KEYWORDS_RE.test(lines.join(' '))) return undefined;

  const SKIP = /^(société|montant ht|% d'avancement|valeur ht|bordereau de transmission|tableau|liste des|date facture|bordereau de paiement|intitulés?\s*total\s*ht|dce\s+ind\.?\s*\d*\s*entreprise|programme\s+aps|conception\s+execution|entreprise\s+marche)/i;
  // Commande-category labels that appear as section dividers in the budget raw text but
  // are not column headers. Exclude them from preDataLines so they don't pollute the
  // column-header detection heuristics.
  const SECTION_LABEL_RE = /^(travaux|honoraires|divers|prestations|études|moe|maîtrise d'œuvre)\s*$/i;
  // Match amounts that are clearly budget values: either have decimal comma OR use space-grouped
  // thousands (≥ 1 000). Plain integers "1", "02", "15" are lot numbers, not budget amounts.
  const AMT_BUDGET = '(?:[1-9]\\d{0,2}(?: \\d{3})+(?:,\\d{1,2})?|(?:[1-9]\\d{0,2}|0),\\d{1,2})';
  const AMT_RE_B = new RegExp(AMT_BUDGET, 'g');
  const TOTAL_RE = /^(total|sous-total|sous total|aléas|imprévus|r[eé]serve)\b/i;

  function getAmounts(line: string): number[] {
    AMT_RE_B.lastIndex = 0;
    const amts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = AMT_RE_B.exec(line)) !== null) {
      const after = line[m.index + m[0].length];
      if (after === '%') continue;
      // Skip quantities/coefficients ≤ 100 that immediately follow a letter (no space before)
      // e.g. "GBL1,00" (Qt=1) or "NORTEC18,00" — not monetary amounts
      const before = m.index > 0 ? line[m.index - 1] : ' ';
      const val = parseMontant(m[0]);
      if (val <= 100 && /[a-zA-ZÀ-ÿ]/.test(before)) continue;
      if (val > 0) amts.push(val);
    }
    return amts;
  }

  function getLibelle(line: string): string {
    let r = line.replace(AMT_RE_B, '').replace(/\d+\s*%/g, '');
    r = r.replace(/(?:^|\s)-(?:\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
    return r.replace(/[.:,;]+$/, '').trim();
  }

  // Extract title ("Budget - 23 février 26").
  // If no "Budget" title is present (e.g. 42RBOUL), leave startIdx=0 so that
  // pre-data lines (column headers like CONCEPTION/Estimation/Programme/APS…)
  // are not consumed as pseudo-titles.
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
  }

  // ── Pass 1: determine dataStartIdx and collect pre-data header lines ─────────
  let dataStartIdx = startIdx;
  const preDataLines: string[] = []; // non-amount lines between title and first data row

  for (let i = startIdx; i < lines.length; i++) {
    if (!lines[i] || SKIP.test(lines[i])) continue;
    if (getAmounts(lines[i]).length > 0) { dataStartIdx = i; break; }
    if (!/^budget\s*$/i.test(lines[i]) && !/^budget\s*[-–]/i.test(lines[i]) && !SECTION_LABEL_RE.test(lines[i])) {
      preDataLines.push(lines[i]);
    }
  }

  // ── Pass 2: maxAmts ───────────────────────────────────────────────────────────
  // Exclude subtotal/total rows: pdf-parse can concatenate a row number (e.g. "1")
  // directly onto a monetary value ("0,00") producing "10,00" which inflates the count.
  let maxAmts = 0;
  for (let i = dataStartIdx; i < lines.length; i++) {
    if (TOTAL_RE.test(lines[i])) continue;
    const n = getAmounts(lines[i]).length;
    if (n > maxAmts) maxAmts = n;
  }
  if (maxAmts === 0) return undefined;

  // ── Pass 3: find the best header line anywhere in the section ────────────────
  // Strategy A) Multi-space split ("Coûts futurs  Facturés  Reste à facturer  …")
  // Strategy B) Tab split
  // Strategy C) CamelCase split ("IntitulésGombertLibertéTotal HT" → real names)
  // Strategy D) Consecutive pre-data single lines each = one column header
  //   (handles PDFs where pdf-parse puts each header cell on its own line)
  // Pick the candidate whose count is closest to maxAmts.
  const ROW_LABEL_RE = /^(intitulé|libellé|désignation|prestation)\b/i;
  const DATE_FRAG_RE = /^\d{1,2}\s+\w+\s+\d{2,4}$|^\d{2}\/\d{2}\/\d{4}$/;

  function extractHeaderParts(l: string): string[] {
    // A) multi-space
    let parts = l.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;

    // B) tab
    const tabParts = l.split(/\t/).map(s => s.trim()).filter(Boolean);
    if (tabParts.length >= 2) return tabParts;

    // C) CamelCase split: split at lowercase→uppercase boundary
    // Uses explicit ranges instead of \p{Ll}/\p{Lu} to avoid requiring the `u` flag
    const camels = l.split(/(?<=[a-zà-öø-ÿ])(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
    if (camels.length >= 2) return camels;

    // single token
    return l.trim() ? [l.trim()] : [];
  }

  // Scan ALL non-data lines (before AND after data) for header candidates
  let bestParts: string[] = [];
  let bestScore = -1;

  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    if (!l || SKIP.test(l)) continue;
    if (/^budget\s*$/i.test(l) || /^budget\s*[-–]/i.test(l)) continue;
    if (getAmounts(l).length > 0) continue; // skip data rows

    const raw = extractHeaderParts(l);
    const filtered = raw.filter(p => !DATE_FRAG_RE.test(p));
    const parts = ROW_LABEL_RE.test(filtered[0] ?? '') ? filtered.slice(1) : filtered;
    if (parts.length === 0) continue;

    const score = parts.length - Math.abs(parts.length - maxAmts);
    if (score > bestScore) { bestScore = score; bestParts = parts; }
  }

  // Strategy D: treat each pre-data line as its own column header.
  // This handles PDFs where pdf-parse puts each header cell on a separate line.
  // Only applied when strategies A-C haven't found a good match (bestScore ≤ 0).
  // Skip apparent span/group headers: all-uppercase, ≥ 7 chars (e.g. CONCEPTION, EXECUTION,
  // TRAVAUX, HONORAIRES) — short abbreviations like APS, APE, DCE, MARCHE (≤ 6 chars) are kept.
  if (bestScore <= 0 && preDataLines.length >= 2) {
    const SPAN_HEADER_RE = /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ\s]{6,}$/;
    const filtered = preDataLines.filter(l => !DATE_FRAG_RE.test(l) && !SPAN_HEADER_RE.test(l.trim()) && !SECTION_LABEL_RE.test(l.trim()));
    const candidate = ROW_LABEL_RE.test(filtered[0] ?? '') ? filtered.slice(1) : filtered;
    if (candidate.length >= 2) {
      const score = candidate.length - Math.abs(candidate.length - maxAmts);
      if (score > bestScore) { bestScore = score; bestParts = candidate; }
    }
  }

  // Deduplicate and pad
  const seen = new Map<string, number>();
  const dedupedHeaders = bestParts.map(h => {
    const key = h.toLowerCase().trim();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count > 1 ? `${h} ${count}` : h;
  });
  const colonnes: string[] = dedupedHeaders.slice(0, maxAmts);
  const FALLBACK = ['Estimation', 'Marché', 'Travaux soldés', 'Disponible', 'Reste', 'Écart'];
  while (colonnes.length < maxAmts) {
    const fb = FALLBACK[colonnes.length] ?? `Montant ${colonnes.length + 1}`;
    colonnes.push(fb);
  }

  // Parse data rows
  const lignes: BudgetLigne[] = [];
  // Lines that are only repeated "Total HT" or header concatenations are noise
  const HEADER_NOISE = /^(?:\s*(?:total\s*ht|intitulés?|programme|aps|ape|apd|dce\s*(?:ind\.?)?\s*\d*|marche|ts|entreprise|estimation|conception|execution)\s*){2,}$/i;
  // Split a spurious subtotal row number glued to the first amount by pdf-parse:
  // "Sous-total travaux 1" + "0,00" → "Sous-total travaux 10,00" — reinsert the space
  // so the row number stays in the libellé and the first amount parses as 0,00.
  function stripSubtotalRowNumber(line: string): string {
    return line.replace(/^(\s*sous[- ]total\s+\S+\s+)(\d{1,2})(0,\d{2})/i, '$1$2 $3');
  }

  for (let i = dataStartIdx; i < lines.length; i++) {
    let line = lines[i];
    if (!line || SKIP.test(line)) continue;
    if (/^budget\s*$/i.test(line) || /^budget\s*[-–]/i.test(line)) continue;
    if (HEADER_NOISE.test(line)) continue;
    if (TOTAL_RE.test(line)) line = stripSubtotalRowNumber(line);

    const amts = getAmounts(line);
    const libelle = getLibelle(line);
    if (!libelle && amts.length === 0) continue;
    // Skip lines whose libelle is pure header noise even after amount-stripping
    if (HEADER_NOISE.test(libelle)) continue;

    const type: BudgetLigne['type'] =
      amts.length === 0 ? 'section' :
      TOTAL_RE.test(libelle) ? 'total' : 'item';

    const trimmed = amts.slice(0, maxAmts);
    const valeurs = [...trimmed, ...new Array(maxAmts - trimmed.length).fill(0)];
    lignes.push({ libelle: libelle || '—', type, valeurs });
  }

  if (lignes.filter(l => l.type !== 'section').length === 0) return undefined;

  // Drop "page-header" section clusters: on multi-page budgets, pdf-parse emits
  // the repeated column-header band (project name + CONCEPTION/EXECUTION/
  // PROGRAMME/APS/APD/…) as a run of section rows between real data. Detect
  // runs of consecutive section rows; if any row in the run is a single-word
  // column-header keyword, drop the entire run (including a project-name
  // header like "42RBOUL" that rides along with it).
  const COL_HEADER_ONLY = /^(programme|aps|ape|apd|dce(?:\s+ind\.?\s*\d*)?|marche|ts|entreprise|estimation|conception|execution|intitulés?|total(?:\s+ht)?)$/i;
  // Project-code-style header (e.g. "42RBOUL", "LOT3B") — all-caps+digits, short.
  // These appear as page-top project-name banners on multi-page budgets.
  const PROJECT_CODE_RE = /^[A-Z][A-Z0-9]*\d[A-Z0-9]*$|^\d[A-Z0-9]*[A-Z][A-Z0-9]*$/;
  const stripAccents = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleaned: BudgetLigne[] = [];
  for (let i = 0; i < lignes.length; ) {
    if (lignes[i].type !== 'section') { cleaned.push(lignes[i]); i++; continue; }
    let j = i;
    while (j < lignes.length && lignes[j].type === 'section') j++;
    const run = lignes.slice(i, j);
    const isNoise = run.some(l => {
      const lib = l.libelle.trim();
      if (COL_HEADER_ONLY.test(lib) || PROJECT_CODE_RE.test(lib)) return true;
      // Drop section rows whose libellé contains every detected column name —
      // these are column-header bands repeated at the top of each PDF page.
      if (colonnes.length >= 3) {
        const libN = stripAccents(lib);
        if (colonnes.every(c => libN.includes(stripAccents(c)))) return true;
      }
      return false;
    });
    if (!isNoise) cleaned.push(...run);
    i = j;
  }
  lignes.length = 0;
  lignes.push(...cleaned);

  // Merge: a 'section' row (text label, no amounts) immediately followed by an 'item'
  // row with libellé '—' (amounts only, no label). This happens when pdf-parse extracts
  // a row's label and its amounts on separate lines. Merge them into one correctly-typed row.
  // Guard: never merge generic section-header labels (Travaux, Honoraires, Divers…).
  const mergedLignes: BudgetLigne[] = [];
  for (let i = 0; i < lignes.length; i++) {
    const curr = lignes[i];
    const next = lignes[i + 1];
    if (
      curr.type === 'section' &&
      !SECTION_LABEL_RE.test(curr.libelle.trim()) &&
      next !== undefined &&
      next.libelle === '—' &&
      next.valeurs.some(v => v !== 0)
    ) {
      const mergedType: BudgetLigne['type'] = TOTAL_RE.test(curr.libelle) ? 'total' : 'item';
      mergedLignes.push({ libelle: curr.libelle, type: mergedType, valeurs: next.valeurs });
      i++; // skip the orphan-amounts row
    } else {
      mergedLignes.push(curr);
    }
  }
  lignes.length = 0;
  lignes.push(...mergedLignes);

  // Semantic reordering: if ALL detected column names are recognized budget vocabulary,
  // sort columns (and their values) into the standard visual left-to-right order.
  // This fixes PDFs (like MIRROR) where pdf-parse reads the header row in a non-visual order.
  // Projects with custom column names (e.g. "Gombert", "Liberté") are left untouched.
  const COL_RANK: Record<string, number> = {
    'budget': 0, 'budget initial': 0, 'budget previsionnel': 0, 'budget global': 0,
    'programme': 1,
    'aps': 2, 'ape': 3, 'dce': 4,
    'marche': 5, 'marche initial': 5, 'marche signe': 5,
    'avenant': 6, 'avenants': 6,
    'engage': 7, 'engages': 7,
    'couts futurs': 8,
    'facture': 9, 'factures': 9,
    'reste a facturer': 10, 'reste': 10,
    'disponible': 11, 'ecart': 12,
    'total ht': 13, 'total': 13, 'total general': 13,
  };
  const normCol = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/\.?\s*\d+$/, '').replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const colRanks = colonnes.map(c => {
    const k = normCol(c);
    if (k in COL_RANK) return COL_RANK[k];
    for (const [key, val] of Object.entries(COL_RANK)) {
      if (k.startsWith(key) || key.startsWith(k)) return val;
    }
    return null;
  });
  // IMPORTANT: pdf-parse extracts the data rows in VISUAL left-to-right order,
  // but the column header row can be extracted in a different (stream) order.
  // Therefore, when all columns are recognized, reorder ONLY the column labels
  // into standard visual order; the data values are already correctly positioned.
  if (colRanks.every(r => r !== null) && colonnes.length >= 2) {
    const order = Array.from({ length: colonnes.length }, (_, i) => i)
      .sort((a, b) => (colRanks[a] as number) - (colRanks[b] as number));
    if (!order.every((v, i) => v === i)) {
      const origCols = [...colonnes];
      for (let i = 0; i < colonnes.length; i++) colonnes[i] = origCols[order[i]];
      // Note: intentionally do NOT reorder ligne.valeurs — pdf-parse extracts data
      // rows in visual order even when headers are in a different stream order.
    }
  }

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
  const valeurMap = hasValeurRestante ? parseValeurEntries(valeurSection) : new Map<string, number[]>();
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
    // Match "budget" at start of a line (with optional dash/date/prévisionnel after)
    const pos = lo.search(/(?:^|\n)budget(?:\s|$|\s*[-–]|\s*pr)/m);
    if (pos === -1) return '';
    const lineStart = searchText[pos] === '\n' ? pos + 1 : pos;

    // Patterns that mark a genuine end of the budget section
    const HARD_END_RE = /\nliste des factures\b|\nbordereau de paiement\b|\ntableau récapitulatif\b|\ndate facture\b/;
    // "Bordereau de transmission" is just a page-break header; after skipping it we
    // check whether the content that follows is still budget or a new section.
    const PAGE_BREAK_RE = /\nbordereau de transmission\b/;
    // After a page break, stop if content looks like a new section OR facture data.
    // Factures start with a DD/MM/YYYY date (optionally preceded by a short project name line).
    const NEW_SECTION_START_RE = /^(?:liste des factures|tableau récapitulatif|bordereau de paiement|date facture)\b/i;
    const FACTURE_START_RE = /^\d{2}\/\d{2}\/\d{4}/m;

    const parts: string[] = [];
    let cursor = lineStart;

    while (cursor < searchText.length) {
      const segLo = lo.slice(cursor);
      const hardEndIdx = segLo.search(HARD_END_RE);
      const pageBreakIdx = segLo.search(PAGE_BREAK_RE);

      const nextStop = Math.min(
        hardEndIdx >= 0 ? hardEndIdx : segLo.length,
        pageBreakIdx >= 0 ? pageBreakIdx : segLo.length,
      );

      parts.push(searchText.slice(cursor, cursor + nextStop));

      if (hardEndIdx >= 0 && (pageBreakIdx < 0 || hardEndIdx <= pageBreakIdx)) break;
      if (pageBreakIdx < 0) break;

      // Skip the "Bordereau de transmission" header line entirely
      const breakLineStart = cursor + pageBreakIdx + 1; // +1 for the \n before "Bordereau"
      const breakLineEnd = searchText.indexOf('\n', breakLineStart + 'bordereau de transmission'.length);
      cursor = breakLineEnd >= 0 ? breakLineEnd + 1 : searchText.length;

      // Peek at the next few non-empty lines to decide if this is budget continuation
      // or the start of the factures section (which begins with raw date lines).
      const nextContent = searchText.slice(cursor).trimStart();
      if (NEW_SECTION_START_RE.test(nextContent)) break;
      // Check the first few lines for a facture-style date start → stop
      const peek = nextContent.split('\n').slice(0, 3).map(l => l.trim()).filter(Boolean);
      if (peek.some(l => FACTURE_START_RE.test(l))) break;
      // Otherwise continue — this is a budget continuation page
    }

    return parts.join('\n');
  }

  // Fallback for PDFs where the budget section has no explicit "Budget" title
  // (e.g. 42RBOUL): the budget sits between the "% d'avancement" section and
  // the "Liste des factures" / first facture date. Collect that content,
  // stripping the page-break "Bordereau de transmission" headers.
  function findBudgetRawByPosition(searchText: string): string {
    const lo = searchText.toLowerCase();
    const avMarker = lo.indexOf("(% d'avancement)");
    if (avMarker === -1) return '';
    // Skip past the avancement section: find its end marker (next major section / page)
    const pageBreakRe = /\nbordereau de transmission\b/;
    const lfMarker = lo.indexOf('liste des factures', avMarker);
    const factureDateRe = /\n\d{2}\/\d{2}\/\d{4}/;

    // Find end of avancement section: first page break after the marker
    const avRest = lo.slice(avMarker);
    const firstBreak = avRest.search(pageBreakRe);
    if (firstBreak === -1) return '';
    const budgetStart = avMarker + firstBreak + 1; // skip the \n

    // Determine budget end: first "Liste des factures" OR first facture-style date line
    const bRest = lo.slice(budgetStart);
    const lfIdx = lfMarker !== -1 ? lfMarker - budgetStart : -1;
    const dateIdx = bRest.search(factureDateRe);
    const candidates = [lfIdx, dateIdx].filter(i => i >= 0);
    if (candidates.length === 0) return '';
    const budgetEnd = budgetStart + Math.min(...candidates);

    // Extract and strip "Bordereau de transmission" + project-name page-break noise
    const raw = searchText.slice(budgetStart, budgetEnd);
    return raw
      .split('\n')
      .filter(l => !/^\s*bordereau de transmission\s*$/i.test(l))
      .join('\n');
  }

  const bpIdx = text.toLowerCase().indexOf('bordereau de paiement');
  const afterBordereau = bpIdx !== -1 ? text.slice(bpIdx) : text;
  let budgetRaw = findBudgetRaw(afterBordereau);
  // If not found after bordereau, search entire text as fallback
  if (!budgetRaw) budgetRaw = findBudgetRaw(text);
  // Final fallback: PDFs without an explicit "Budget" title
  if (!budgetRaw) budgetRaw = findBudgetRawByPosition(text);
  const budget = budgetRaw ? parseBudgetTable(budgetRaw) : undefined;

  return {
    ...totals,
    commandes,
    factures,
    facturesMois,
    ...(budget ? { budget } : {}),
  };
}
