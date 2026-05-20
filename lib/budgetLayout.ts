/**
 * Position-aware budget table extraction.
 *
 * pdf-parse only yields a flat text stream, which destroys the column structure
 * of multi-column budget tables. This module instead works from per-item x/y
 * coordinates (captured via a custom pdf-parse pagerender) and reconstructs the
 * real grid: columns, spanning group headers (e.g. CONCEPTION / EXECUTION) and
 * cells — including text cells like an "Entreprise" column.
 */
import { BudgetTable, BudgetLigne, BudgetGroupe } from '@/types';

export interface PdfItem { str: string; x: number; y: number; w: number; }
export type PdfPage = PdfItem[];

const TOTAL_RE = /^(total|sous[- ]total|aléas|impr[ée]vus|r[eé]serve)\b/i;
const FOOTER_RE = /^bordereau de transmission$/i;

// A cell is numeric when, ignoring spaces, it is a French amount/percent or a lone dash.
function isNumericCell(s: string): boolean {
  const t = s.trim();
  if (t === '-' || t === '—') return true;
  return /^-?\d[\d\s ]*,\d{1,2}\s*%?$/.test(t);
}

function parseCellNumber(s: string): number {
  const t = s.replace(/[\s %]/g, '').replace(',', '.');
  const n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

const spaceless = (s: string) => s.toLowerCase().replace(/[\s ]/g, '');

interface Row { y: number; items: PdfItem[]; }

// Cluster a page's items into visual rows (same y within a tolerance), top→bottom.
function clusterRows(page: PdfPage, tol = 4): Row[] {
  const items = page.filter(i => i.str.trim().length > 0)
    .slice()
    .sort((a, b) => b.y - a.y);
  const rows: Row[] = [];
  for (const it of items) {
    let row = rows.find(r => Math.abs(r.y - it.y) <= tol);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

function rowHasAmount(row: Row): boolean {
  return row.items.some(i => isNumericCell(i.str) && i.str.trim() !== '-' && i.str.trim() !== '—');
}

function rowText(row: Row): string {
  return row.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
}

// Split a budget page into header rows and data rows.
function splitPage(rows: Row[]): { headers: Row[]; data: Row[] } {
  let i = 0;
  // Skip leading single-item title rows (project name, "Budget - …").
  while (i < rows.length && rows[i].items.length < 2) i++;
  // Header region: consecutive multi-item rows with no monetary amount.
  const headers: Row[] = [];
  while (i < rows.length && rows[i].items.length >= 2 && !rowHasAmount(rows[i])) {
    headers.push(rows[i]);
    i++;
  }
  const data: Row[] = [];
  for (; i < rows.length; i++) {
    const r = rows[i];
    if (r.items.length === 0) continue;
    if (FOOTER_RE.test(rowText(r))) continue;
    data.push(r);
  }
  return { headers, data };
}

// Merge item x-intervals into column bands separated by empty vertical gaps.
function detectBands(items: PdfItem[]): { start: number; end: number }[] {
  const intervals = items
    .map(i => [i.x, i.x + Math.max(i.w, 1)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const bands: { start: number; end: number }[] = [];
  const GAP = 7;
  for (const [s, e] of intervals) {
    const last = bands[bands.length - 1];
    if (last && s <= last.end + GAP) last.end = Math.max(last.end, e);
    else bands.push({ start: s, end: e });
  }
  return bands;
}

// Assign an x-coordinate to a column index given ascending left-boundaries.
function colAt(bounds: number[], x: number): number {
  let idx = 0;
  for (let i = 0; i < bounds.length; i++) {
    if (x + 1.5 >= bounds[i]) idx = i;
    else break;
  }
  return idx;
}

export function parseBudgetFromPages(pages: PdfPage[], budgetRaw: string): BudgetTable | undefined {
  if (!pages || pages.length === 0) return undefined;
  const rawSL = spaceless(budgetRaw);
  if (rawSL.length < 30) return undefined;

  // 1. Identify budget pages by text overlap with the already-isolated budget text.
  const budgetPages: { headers: Row[]; data: Row[] }[] = [];
  for (const page of pages) {
    const rows = clusterRows(page);
    if (rows.length < 3) continue;
    let match = 0, total = 0;
    for (const r of rows) {
      const t = spaceless(r.items.map(i => i.str).join(''));
      if (t.length < 12) continue;
      total++;
      if (rawSL.includes(t.slice(0, 40))) match++;
    }
    if (total >= 3 && match / total >= 0.4) budgetPages.push(splitPage(rows));
  }
  if (budgetPages.length === 0) return undefined;

  // 2. Header rows come from the first budget page.
  const headerRows = budgetPages[0].headers;
  if (headerRows.length === 0) return undefined;

  // The topmost header row is a group-header row when it has fewer cells than
  // the row directly below it (e.g. CONCEPTION / EXECUTION above the real names).
  let groupRow: Row | undefined;
  let nameRows = headerRows;
  if (headerRows.length >= 2 && headerRows[0].items.length < headerRows[1].items.length) {
    groupRow = headerRows[0];
    nameRows = headerRows.slice(1);
  }

  // 3. All data items / rows across every budget page.
  const allDataRows: Row[] = budgetPages.flatMap(p => p.data);
  const allDataItems = allDataRows.flatMap(r => r.items);
  if (allDataItems.length < 4) return undefined;

  // 4. Determine column left-boundaries.
  //    Prefer the primary header row's item x-positions (clean, one per column);
  //    fall back to gap analysis of the data when the headers are too sparse.
  const primaryHeader = nameRows.reduce((a, b) => (b.items.length > a.items.length ? b : a), nameRows[0]);
  const headerXs = primaryHeader.items.map(i => i.x).sort((a, b) => a - b);
  const labelX = Math.min(...allDataRows.map(r => r.items[0]?.x ?? 1e9));

  let headerBounds = headerXs.slice();
  if (headerBounds.length > 0 && headerBounds[0] - labelX > 25) {
    headerBounds = [labelX, ...headerBounds];
  }

  const bands = detectBands(allDataItems);
  const dataBounds: number[] = [];
  for (let i = 0; i < bands.length; i++) {
    if (i === 0) dataBounds.push(bands[i].start - 2);
    else dataBounds.push((bands[i - 1].end + bands[i].start) / 2);
  }

  // The header row is the ground truth for column boundaries; gap analysis of the
  // data is only a fallback because text cells ("inc", "-") that sit at a column's
  // left edge while numbers are right-aligned split one column into phantom bands.
  // Header boundaries are rejected only when too coarse — detected by monetary
  // values landing in the label column (which means a value column was missed).
  const labelColHasNumbers = (bnds: number[]): boolean =>
    allDataRows.some(r => r.items.some(it => {
      if (colAt(bnds, it.x) !== 0) return false;
      const t = it.str.trim();
      return t !== '' && t !== '-' && t !== '—' && isNumericCell(t);
    }));

  let bounds: number[];
  if (headerBounds.length >= 3 && !labelColHasNumbers(headerBounds)) {
    bounds = headerBounds;
  } else {
    bounds = dataBounds;
  }
  const D = bounds.length;
  if (D < 2) return undefined;

  // 5. Column names.
  const colNames: string[] = new Array(D).fill('');
  const exactRow = nameRows.find(r => r.items.length === D);
  const nearRow = nameRows.find(r => r.items.length === D - 1);
  if (exactRow) {
    exactRow.items.forEach((it, i) => { colNames[i] = it.str.trim(); });
  } else if (nearRow) {
    nearRow.items.forEach((it, i) => { colNames[i + 1] = it.str.trim(); });
  } else {
    // Nearest assignment, processing rows closest to the data first (they win ties).
    for (const r of [...nameRows].reverse()) {
      for (const it of r.items) {
        const c = colAt(bounds, it.x);
        if (!colNames[c]) colNames[c] = it.str.trim();
      }
    }
  }

  // 6. Group headers.
  let groupes: BudgetGroupe[] | undefined;
  if (groupRow) {
    const marks = groupRow.items
      .map(it => ({ col: colAt(bounds, it.x), label: it.str.trim() }))
      .filter(m => m.col >= 1)
      .sort((a, b) => a.col - b.col);
    if (marks.length > 0) {
      groupes = marks.map((m, i) => {
        const nextCol = i + 1 < marks.length ? marks[i + 1].col : D;
        return { label: m.label, debut: m.col - 1, span: nextCol - m.col };
      });
    }
  }

  // 7. Build data rows.
  const lignes: BudgetLigne[] = [];
  for (const r of allDataRows) {
    let libelle = '';
    const cellules: string[] = new Array(D - 1).fill('');
    for (const it of r.items) {
      const c = colAt(bounds, it.x);
      const txt = it.str.trim();
      if (!txt) continue;
      if (c === 0) {
        libelle = libelle ? `${libelle} ${txt}` : txt;
      } else {
        const ci = c - 1;
        cellules[ci] = cellules[ci] ? `${cellules[ci]} ${txt}` : txt;
      }
    }
    libelle = libelle.replace(/\s+/g, ' ').trim();
    const hasCells = cellules.some(c => c !== '');
    if (!libelle && !hasCells) continue;
    if (FOOTER_RE.test(libelle)) continue;

    const type: BudgetLigne['type'] =
      !hasCells && libelle ? 'section' :
      TOTAL_RE.test(libelle) ? 'total' : 'item';

    const valeurs = cellules.map(parseCellNumber);
    lignes.push({ libelle: libelle || '—', type, cellules, valeurs });
  }

  if (lignes.filter(l => l.type !== 'section').length < 2) return undefined;

  // 8. Title — first "Budget - …" item anywhere on the budget pages.
  let titre = '';
  for (const page of pages) {
    for (const it of page) {
      if (/^budget\s*[-–]/i.test(it.str.trim())) { titre = it.str.trim(); break; }
    }
    if (titre) break;
  }

  return { titre, colonnes: colNames.slice(1), groupes, lignes };
}
