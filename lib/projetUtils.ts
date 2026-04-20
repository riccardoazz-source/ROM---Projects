import type { Projet, RapportMensuel, Facture, HistoriquePoint } from '@/types';

// ─── Month label ─────────────────────────────────────────────────────────────
// "Juin" and "Juillet" both start with "jui" — need explicit disambiguation

export function getMoisLabel(mois: string): string {
  const m = mois.toLowerCase();
  if (m.startsWith('juil')) return 'JUL';
  if (m.startsWith('juin')) return 'JUN';
  return mois.substring(0, 3).toUpperCase();
}

// ─── Chart building ──────────────────────────────────────────────────────────

export function buildChartFromRapports(rapports: RapportMensuel[]): HistoriquePoint[] {
  return rapports
    .filter(r => r.date && r.mois)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({
      date: getMoisLabel(r.mois) + '/' + r.mois.slice(-2),
      montantCommandesHT: r.montantTotalCommandesHT,
      montantFacturesHT: r.montantTotalFacturesHT,
    }));
}

// When only one rapport exists, derive monthly timeline from factures.
// Commandes grows proportionally alongside factures so both lines are visible.
export function buildChartFromFactures(factures: Facture[], commandesHT: number): HistoriquePoint[] {
  const byMonth = new Map<string, number>();
  for (const f of factures) {
    const d = f.dateValidationAMO;
    if (!d || d.length < 10) continue;
    const key = `${d.slice(6, 10)}/${d.slice(3, 5)}`; // YYYY/MM
    byMonth.set(key, (byMonth.get(key) ?? 0) + f.montantHT);
  }
  const months = Array.from(byMonth.keys()).sort();
  if (months.length === 0) return [];
  const totalFactures = Array.from(byMonth.values()).reduce((s, v) => s + v, 0) || 1;
  let cumFactures = 0;
  return months.map(date => {
    cumFactures += byMonth.get(date)!;
    const ratio = Math.min(cumFactures / totalFactures, 1);
    return {
      date,
      montantCommandesHT: Math.round(commandesHT * ratio),
      montantFacturesHT: cumFactures,
    };
  });
}

export function prepareChartData(projet: Projet, rapport: RapportMensuel): HistoriquePoint[] {
  if (projet.historiqueChart.length >= 2) return projet.historiqueChart;
  if (projet.rapports.length >= 2) return buildChartFromRapports(projet.rapports);
  return buildChartFromFactures(rapport.factures, rapport.montantTotalCommandesHT);
}

// ─── Budget validation ───────────────────────────────────────────────────────

const FAKE_RE = /\d{2}\/\d{2}\/20\d{2}|\d+%\d+%/;
const FAKE_COL_RE = /montant\s+ttc|retenue\s+de\s+gar|validation\s+amo|date\s+facture|n°\s+facture/i;
const GENERIC_COL_RE = /^montant\s+\d+$/i; // "Montant 1", "Montant 2" etc. = parser fallback names

export function checkBudget(rapport: RapportMensuel): { budgetExists: boolean; budgetValid: boolean } {
  const budgetExists = !!(rapport.budget && rapport.budget.lignes.length > 0);
  const budgetValid = budgetExists &&
    !rapport.budget!.colonnes.some(c => FAKE_COL_RE.test(c)) &&
    !rapport.budget!.colonnes.some(c => GENERIC_COL_RE.test(c)) &&
    rapport.budget!.lignes.filter(l => FAKE_RE.test(l.libelle)).length === 0;
  return { budgetExists, budgetValid };
}
