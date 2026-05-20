import { BudgetTable, BudgetLigne } from '@/types';

function formatFr(n: number): string {
  if (!n) return '';
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return (neg ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec;
}

// Cells of a budget row, with a fallback for legacy rows that only stored numbers.
function cellsOf(ligne: BudgetLigne): string[] {
  if (ligne.cellules) return ligne.cellules;
  return (ligne.valeurs ?? []).map(v => (v ? formatFr(v) : ''));
}

const NUMERIC_RE = /^-?[\d   ]+,\d{1,2}\s*%?$/;
function isNumeric(s: string): boolean {
  const t = s.trim();
  return t === '-' || t === '—' || NUMERIC_RE.test(t);
}

// Build the spanning group-header row covering every data column.
function groupSegments(nCols: number, groupes: BudgetTable['groupes']) {
  if (!groupes || groupes.length === 0) return null;
  const segs: { label: string; span: number }[] = [];
  let i = 0;
  while (i < nCols) {
    const g = groupes.find(gr => gr.debut === i);
    if (g) { segs.push({ label: g.label, span: g.span }); i += g.span; }
    else {
      let span = 0;
      while (i < nCols && !groupes.find(gr => gr.debut === i)) { i++; span++; }
      segs.push({ label: '', span });
    }
  }
  return segs;
}

export default function BudgetTableView({ budget }: { budget: BudgetTable }) {
  const { colonnes, lignes, groupes } = budget;
  const segments = groupSegments(colonnes.length, groupes);

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        {segments && (
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="bg-gray-100" />
            {segments.map((s, i) => (
              <th
                key={i}
                colSpan={s.span}
                className={`px-3 py-1.5 text-center font-bold uppercase tracking-wide text-[10px] ${
                  s.label ? 'text-rom-700 border-l border-gray-200' : 'text-transparent'
                }`}
              >
                {s.label || '·'}
              </th>
            ))}
          </tr>
        )}
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[170px]">Libellé</th>
          {colonnes.map((col, i) => (
            <th
              key={i}
              className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap min-w-[90px]"
            >
              {col || '—'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne, i) => {
          if (ligne.type === 'section') {
            return (
              <tr key={i} className="bg-rom-50 border-t border-b border-rom-100">
                <td
                  colSpan={colonnes.length + 1}
                  className="px-3 py-2 font-bold text-rom-700 uppercase tracking-wide text-[11px]"
                >
                  {ligne.libelle}
                </td>
              </tr>
            );
          }
          const isTotal = ligne.type === 'total';
          const cells = cellsOf(ligne);
          return (
            <tr
              key={i}
              className={
                isTotal
                  ? 'bg-gray-100 border-t border-gray-300 font-semibold'
                  : 'border-b border-gray-50 hover:bg-gray-50'
              }
            >
              <td className={`px-3 py-1.5 ${isTotal ? 'text-gray-800' : 'text-gray-700'}`}>
                {ligne.libelle === '—' ? '' : ligne.libelle}
              </td>
              {colonnes.map((_, j) => {
                const c = cells[j] ?? '';
                const num = isNumeric(c);
                return (
                  <td
                    key={j}
                    className={`px-3 py-1.5 ${
                      num ? 'text-right tabular-nums whitespace-nowrap' : 'text-left'
                    } ${isTotal ? 'text-gray-800' : 'text-gray-600'}`}
                  >
                    {c}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
