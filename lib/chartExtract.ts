/**
 * Reconstruct the "Total Commandes HT et Total factures HT" evolution chart
 * from a ROM report PDF.
 *
 * The chart is stored in the PDF as vector graphics, not text — so pdf-parse
 * only yields the axis labels. Here we read the raw drawing operators, isolate
 * the two coloured polylines (blue = commandes, orange = factures), and map
 * each vertex back to (month, amount) using the axis label positions for
 * calibration. The most recent point of each series is then anchored to the
 * exact total from the report's recap table, which cancels the small constant
 * offset of the vector-to-value mapping.
 */
import type { HistoriquePoint } from '@/types';

const C_RGB = [68, 113, 196]; // blue   — Commandes
const F_RGB = [236, 124, 48]; // orange — Factures

interface Pt { mn: number; val: number } // mn = year*12 + (month-1)
type Vec = [number, number];

function linfit(pts: Vec[]): { m: number; b: number } {
  const n = pts.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const denom = n * sxx - sx * sx;
  const m = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  return { m, b: (sy - m * sx) / n };
}

function rgbEq(c: number[] | null | undefined, target: number[]): boolean {
  return !!c && c.length >= 3 && target.every((t, i) => Math.abs(c[i] - t) <= 14);
}

function monthLabel(mn: number): string {
  return `${Math.floor(mn / 12)}/${String((mn % 12) + 1).padStart(2, '0')}`;
}

async function loadPdfjs(): Promise<any> {
  // pdfjs is bundled inside pdf-parse and ships no type declarations.
  // @ts-ignore
  const mod: any = await import('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js');
  return mod?.default ?? mod;
}

// Extract the two data series from one page, or null if the page has no chart.
async function extractFromPage(page: any, OPS: any): Promise<{ commandes: Pt[]; factures: Pt[] } | null> {
  const NAME: Record<number, string> = {};
  for (const k in OPS) NAME[OPS[k]] = k;

  const tc = await page.getTextContent();
  const items = tc.items.map((it: any) => ({
    s: String(it.str).trim(),
    x: it.transform[4],
    y: it.transform[5],
  }));
  if (!items.some((t: any) => /Total Commandes HT et Total factures/i.test(t.s))) return null;

  // ── Y-axis calibration: numeric labels sharing an x, linear in y ───────────
  const nums = items
    .filter((t: any) => /^[\d   ]+$/.test(t.s) && t.s.length > 0)
    .map((t: any) => ({ v: Number(t.s.replace(/[   ]/g, '')), x: t.x, y: t.y }))
    .filter((t: any) => Number.isFinite(t.v));
  const groups: Record<number, any[]> = {};
  for (const n of nums) {
    const k = Math.round(n.x / 4) * 4;
    (groups[k] = groups[k] || []).push(n);
  }
  let yax: { v: number; y: number }[] | null = null;
  for (const g of Object.values(groups)) {
    const uniq = Array.from(new Map(g.map((n): [number, any] => [n.v, n])).values()).sort((a, b) => a.v - b.v);
    if (uniq.length >= 3 && (!yax || uniq.length > yax.length)) yax = uniq;
  }
  if (!yax) return null;
  const yf = linfit(yax.map((p) => [p.y, p.v] as Vec)); // value = yf.m*y + yf.b

  // ── X-axis calibration: MM/YY labels, linear in x ─────────────────────────
  const mons = items
    .filter((t: any) => /^\d{2}\/\d{2}$/.test(t.s))
    .map((t: any) => {
      const [mm, yy] = t.s.split('/');
      return { x: t.x, mn: (2000 + Number(yy)) * 12 + (Number(mm) - 1) };
    })
    .sort((a: any, b: any) => a.x - b.x);
  if (mons.length < 2) return null;
  const xf = linfit(mons.map((p: any) => [p.x, p.mn] as Vec)); // monthNum = xf.m*x + xf.b

  // Plot-area bounding box — excludes the pie chart / legend on the same page.
  const xMin = mons[0].x - 22;
  const xMax = mons[mons.length - 1].x + 22;
  const ys = yax.map((p) => p.y);
  const yMin = Math.min(...ys) - 10;
  const yMax = Math.max(...ys) + 10;

  // ── Walk the drawing operators, tracking the CTM ──────────────────────────
  const opList = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const mul = (m: number[], n: number[]): number[] => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const apply = (m: number[], x: number, y: number): Vec => [
    m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5],
  ];
  const NEED: Record<number, number> = {
    [OPS.moveTo]: 2, [OPS.lineTo]: 2, [OPS.curveTo]: 6,
    [OPS.curveTo2]: 4, [OPS.curveTo3]: 4, [OPS.closePath]: 0, [OPS.rectangle]: 4,
  };

  let stroke: number[] | null = null;
  const blue: Vec[][] = [];
  const orange: Vec[][] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const name = NAME[opList.fnArray[i]];
    const args = opList.argsArray[i];
    if (name === 'save') stack.push(ctm.slice());
    else if (name === 'restore') ctm = stack.pop() || ctm;
    else if (name === 'transform') ctm = mul(ctm, args);
    else if (name === 'setStrokeRGBColor') stroke = args;
    else if (name === 'constructPath') {
      // The data series are stroked polylines.
      let paint = '';
      for (let j = i + 1; j < opList.fnArray.length; j++) {
        const n2 = NAME[opList.fnArray[j]];
        if (/Color|GState|LineWidth|LineJoin|LineCap|Miter|Dash/.test(n2)) continue;
        paint = n2;
        break;
      }
      if (paint !== 'stroke') continue;
      const which = rgbEq(stroke, C_RGB) ? blue : rgbEq(stroke, F_RGB) ? orange : null;
      if (!which) continue;

      const pathOps: number[] = args[0];
      const coords: number[] = args[1];
      let k = 0;
      const verts: Vec[] = [];
      for (const op of pathOps) {
        if (op === OPS.moveTo || op === OPS.lineTo) verts.push(apply(ctm, coords[k], coords[k + 1]));
        else if (op === OPS.curveTo) verts.push(apply(ctm, coords[k + 4], coords[k + 5]));
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) verts.push(apply(ctm, coords[k + 2], coords[k + 3]));
        k += NEED[op] ?? 0;
      }
      if (verts.length) which.push(verts);
    }
  }

  // Pick the polyline of each colour. Keep only path segments inside the plot
  // area (drops the legend swatches and the pie chart on the same page), then
  // merge them — the data line is sometimes emitted as several sub-paths.
  const pickSeries = (paths: Vec[][]): Vec[] => {
    const inBox = paths
      .map((p) => p.filter(([x, y]) => x >= xMin && x <= xMax && y >= yMin && y <= yMax))
      .filter((p) => p.length >= 2);
    if (inBox.length) return inBox.flat();
    return paths.reduce((a, b) => (b.length > a.length ? b : a), [] as Vec[]);
  };

  const toPoints = (verts: Vec[]): Pt[] => {
    const sorted = [...verts].sort((a, b) => a[0] - b[0]);
    const pts: Pt[] = [];
    for (const [x, y] of sorted) {
      const mn = Math.round(xf.m * x + xf.b);
      const val = yf.m * y + yf.b;
      if (pts.length && pts[pts.length - 1].mn === mn) pts[pts.length - 1] = { mn, val };
      else pts.push({ mn, val });
    }
    return pts;
  };

  return {
    commandes: toPoints(pickSeries(blue)),
    factures: toPoints(pickSeries(orange)),
  };
}

// Rescale a series so its most recent point matches the exact report total.
function anchor(pts: Pt[], known?: number): Pt[] {
  if (!pts.length || !known || known <= 0) return pts;
  const last = pts[pts.length - 1].val;
  if (!last || last <= 0) return pts;
  const f = known / last;
  if (f < 0.3 || f > 3) return pts; // implausible — leave as-is
  return pts.map((p) => ({ mn: p.mn, val: p.val * f }));
}

/**
 * Extract the historic chart from a report PDF. Returns one point per month
 * present in either series, with both cumulative totals carried forward.
 * Returns [] when the PDF has no recognisable chart.
 */
export async function extractHistoriqueChart(
  buffer: Buffer,
  knownCommandesHT?: number,
  knownFacturesHT?: number,
): Promise<HistoriquePoint[]> {
  let pdfjs: any;
  try {
    pdfjs = await loadPdfjs();
  } catch {
    return [];
  }

  let series: { commandes: Pt[]; factures: Pt[] } | null = null;
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const maxPage = Math.min(doc.numPages, 3);
    for (let pn = 1; pn <= maxPage; pn++) {
      const page = await doc.getPage(pn);
      series = await extractFromPage(page, pdfjs.OPS);
      if (series) break;
    }
  } catch {
    return [];
  }
  if (!series) return [];

  const commandes = anchor(series.commandes, knownCommandesHT);
  const factures = anchor(series.factures, knownFacturesHT);
  if (commandes.length < 2 && factures.length < 2) return [];

  // Merge both series onto the shared time axis, carrying each total forward.
  const monthsSet = new Set<number>();
  for (const p of commandes) monthsSet.add(p.mn);
  for (const p of factures) monthsSet.add(p.mn);
  const months = Array.from(monthsSet).sort((a, b) => a - b);

  const valueAt = (pts: Pt[], mn: number): number => {
    let v = 0;
    for (const p of pts) {
      if (p.mn <= mn) v = p.val;
      else break;
    }
    return v;
  };

  const result = months.map((mn) => ({
    date: monthLabel(mn),
    montantCommandesHT: Math.round(valueAt(commandes, mn)),
    montantFacturesHT: Math.round(valueAt(factures, mn)),
  }));

  // Safety net: a correct extraction ends exactly on the report totals (the
  // anchor guarantees it). If it doesn't, a wrong path was picked — discard
  // the chart rather than display wrong figures.
  const last = result[result.length - 1];
  if (knownCommandesHT && Math.abs(last.montantCommandesHT - knownCommandesHT) > knownCommandesHT * 0.01 + 2) return [];
  if (knownFacturesHT && Math.abs(last.montantFacturesHT - knownFacturesHT) > knownFacturesHT * 0.01 + 2) return [];

  return result;
}
