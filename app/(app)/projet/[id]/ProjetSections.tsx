'use client';

import { useState, useMemo } from 'react';
import { Search, XCircle, CheckCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import ScrollTableLeft from '@/components/ScrollTableLeft';
import { Commande, Facture } from '@/types';

function fmt(v: number) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}
const formatMontantHT = fmt;

// ─── French month names ──────────────────────────────────────────────────────

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Sorting helpers ─────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';
interface SortState { key: string; dir: SortDir; }

// Three-state click cycle: ascending → descending → unsorted.
function useSort(initial: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(initial);
  const toggle = (key: string) =>
    setSort((s) =>
      s && s.key === key
        ? (s.dir === 'asc' ? { key, dir: 'desc' as SortDir } : null)
        : { key, dir: 'asc' as SortDir },
    );
  return { sort, toggle };
}

function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  getters: Record<string, (r: T) => string | number>,
): T[] {
  if (!sort) return rows;
  const get = getters[sort.key];
  if (!get) return rows;
  const arr = [...rows];
  arr.sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    let cmp: number;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), 'fr', { numeric: true, sensitivity: 'base' });
    return sort.dir === 'asc' ? cmp : -cmp;
  });
  return arr;
}

// "DD/MM/YYYY" → "YYYYMMDD" so dates sort chronologically as plain strings.
function dateSortKey(d: string): string {
  if (!d || d.length < 10) return '0';
  return d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
}

function SortTh({
  label, sortKey, sort, onSort, className = '', align = 'left', style,
}: {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort: (k: string) => void;
  className?: string;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  const active = sort?.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={style}
      className={`cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {active ? (
          sort!.dir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-rom-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-rom-600" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </span>
    </th>
  );
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const COMMANDE_GETTERS: Record<string, (c: Commande) => string | number> = {
  societe: (c) => c.societe.toLowerCase(),
  lot: (c) => (c.lot || '').toLowerCase(),
  montantHT: (c) => c.montantHT,
  valeurHtRestante: (c) => c.valeurHtRestante,
  pourcentageAvancement: (c) => c.pourcentageAvancement,
};

function SectionRows({ commandes, label }: { commandes: Commande[]; label: string }) {
  const totalHT = commandes.reduce((s, c) => s + c.montantHT, 0);
  const totalVal = commandes.reduce((s, c) => s + c.valeurHtRestante, 0);
  return (
    <>
      <tr className="bg-rom-50 border-t border-b border-rom-100">
        <td colSpan={5} className="px-4 py-2 font-bold text-rom-700 uppercase tracking-wide text-[11px]">
          {label}
        </td>
      </tr>
      {commandes.map((c, i) => (
        <tr key={i}>
          <td className="font-medium text-gray-900 text-xs">{c.societe}</td>
          <td className="text-gray-500 hidden sm:table-cell">{c.lot || '—'}</td>
          <td className="text-right font-medium whitespace-nowrap">{formatMontantHT(c.montantHT)}</td>
          <td className="text-right hidden sm:table-cell whitespace-nowrap">
            <span className={c.valeurHtRestante === 0 ? 'text-gray-400' : 'text-orange-600 font-medium'}>
              {formatMontantHT(c.valeurHtRestante)}
            </span>
          </td>
          <td>
            <ProgressBar
              value={c.pourcentageAvancement}
              color={c.pourcentageAvancement === 100 ? 'green' : c.pourcentageAvancement === 0 ? 'gray' : 'blue'}
              size="sm"
            />
          </td>
        </tr>
      ))}
      <tr className="bg-gray-50 font-semibold border-t border-gray-200">
        <td className="px-4 py-2 text-sm text-gray-700 sm:hidden">Sous-total</td>
        <td colSpan={2} className="px-4 py-2 text-sm text-gray-700 hidden sm:table-cell">Sous-total {label}</td>
        <td className="px-4 py-2 text-right text-sm whitespace-nowrap">{formatMontantHT(totalHT)}</td>
        <td className="px-4 py-2 text-right text-sm text-orange-600 whitespace-nowrap hidden sm:table-cell">{formatMontantHT(totalVal)}</td>
        <td />
      </tr>
    </>
  );
}

// ─── CommandesTableClient ────────────────────────────────────────────────────

export function CommandesTableClient({ commandes }: { commandes: Commande[] }) {
  const [search, setSearch] = useState('');
  const { sort, toggle } = useSort();

  const filtered = useMemo(() => {
    if (!search) return commandes;
    const q = search.toLowerCase();
    return commandes.filter(
      (c) => c.societe.toLowerCase().includes(q) || c.lot.toLowerCase().includes(q),
    );
  }, [commandes, search]);

  // Sorting is applied within each Honoraires / Travaux / Divers group so the
  // group structure and its subtotals stay correct.
  const groups = useMemo(
    () =>
      (['honoraires', 'travaux', 'divers'] as const)
        .map((type) => ({
          type,
          label: type === 'honoraires' ? 'Honoraires' : type === 'travaux' ? 'Travaux' : 'Divers',
          rows: sortRows(filtered.filter((c) => c.type === type), sort, COMMANDE_GETTERS),
        }))
        .filter((g) => g.rows.length > 0),
    [filtered, sort],
  );

  return (
    <div className="rom-card overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Tableau récapitulatif des commandes (LOTs)
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer société, LOT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <ScrollTableLeft>
        {groups.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune commande correspondante</p>
        ) : (
          <table className="rom-table">
            <thead>
              <tr>
                <SortTh label="Société" sortKey="societe" sort={sort} onSort={toggle} />
                <SortTh label="LOT / Mission" sortKey="lot" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="Montant HT" sortKey="montantHT" sort={sort} onSort={toggle} className="text-right" align="right" />
                <SortTh label="Valeur restante" sortKey="valeurHtRestante" sort={sort} onSort={toggle} className="text-right hidden sm:table-cell" align="right" />
                <SortTh label="% Avanc." sortKey="pourcentageAvancement" sort={sort} onSort={toggle} style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <SectionRows key={g.type} commandes={g.rows} label={g.label} />
              ))}
            </tbody>
          </table>
        )}
      </ScrollTableLeft>
    </div>
  );
}

// ─── FacturesListClient ──────────────────────────────────────────────────────

const FACTURE_GETTERS: Record<string, (f: Facture) => string | number> = {
  dateFacture: (f) => dateSortKey(f.dateFacture),
  factureOuSituation: (f) => f.factureOuSituation.toLowerCase(),
  societe: (f) => f.societe.toLowerCase(),
  dateValidationAMO: (f) => dateSortKey(f.dateValidationAMO),
  montantHT: (f) => f.montantHT,
  montantTTC: (f) => f.montantTTC,
  retenueGarantie: (f) => f.retenueGarantie,
  pourcentageFactureSurCommande: (f) => f.pourcentageFactureSurCommande,
  pourcentageAvancementTotal: (f) => f.pourcentageAvancementTotal,
};

export function FacturesListClient({ factures }: { factures: Facture[] }) {
  const [search, setSearch] = useState('');
  const { sort, toggle } = useSort();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = !search
      ? factures
      : factures.filter(
          (f) =>
            f.factureOuSituation.toLowerCase().includes(q) ||
            f.societe.toLowerCase().includes(q),
        );
    return sortRows(base, sort, FACTURE_GETTERS);
  }, [factures, search, sort]);

  return (
    <div className="rom-card overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Liste des factures validées
          </h2>
          <span className="text-xs text-gray-500">
            {factures.length} facture{factures.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer N° facture, société…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <ScrollTableLeft>
        <table className="rom-table">
          <thead>
            <tr>
              <SortTh label="Date facture" sortKey="dateFacture" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
              <SortTh label="N° Facture / Situation" sortKey="factureOuSituation" sort={sort} onSort={toggle} />
              <SortTh label="Société" sortKey="societe" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
              <SortTh label="Date validation AMO" sortKey="dateValidationAMO" sort={sort} onSort={toggle} className="hidden md:table-cell" />
              <SortTh label="Montant HT" sortKey="montantHT" sort={sort} onSort={toggle} className="hidden sm:table-cell text-right" align="right" />
              <SortTh label="Montant TTC" sortKey="montantTTC" sort={sort} onSort={toggle} className="text-right" align="right" />
              <SortTh label="Retenue" sortKey="retenueGarantie" sort={sort} onSort={toggle} className="hidden md:table-cell text-right" align="right" />
              <SortTh label="% Commande" sortKey="pourcentageFactureSurCommande" sort={sort} onSort={toggle} className="hidden md:table-cell text-right" align="right" />
              <SortTh label="% Avanc." sortKey="pourcentageAvancementTotal" sort={sort} onSort={toggle} className="text-right" align="right" />
              <th className="hidden sm:table-cell whitespace-nowrap">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-gray-400 py-8 text-sm">
                  Aucune facture correspondante
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr key={i}>
                  <td className="hidden sm:table-cell text-gray-500 text-xs whitespace-nowrap">{f.dateFacture}</td>
                  <td className="font-medium text-xs whitespace-nowrap">{f.factureOuSituation}</td>
                  <td className="hidden sm:table-cell text-xs whitespace-nowrap">{f.societe}</td>
                  <td className="hidden md:table-cell text-gray-500 text-xs whitespace-nowrap">{f.dateValidationAMO}</td>
                  <td className="hidden sm:table-cell text-right font-medium whitespace-nowrap">{formatMontantHT(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600 whitespace-nowrap">{formatMontantHT(f.montantTTC)}</td>
                  <td className="hidden md:table-cell text-right text-xs whitespace-nowrap">
                    {f.retenueGarantie > 0 ? `${f.retenueGarantie}%` : '—'}
                  </td>
                  <td className="hidden md:table-cell text-right text-xs font-medium whitespace-nowrap">{f.pourcentageFactureSurCommande}%</td>
                  <td className="text-right whitespace-nowrap">
                    <span
                      className={`text-xs font-bold ${
                        f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {f.pourcentageAvancementTotal}%
                    </span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      <CheckCircle className="w-3 h-3" /> Validée
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollTableLeft>
    </div>
  );
}

// ─── BordereauClient ─────────────────────────────────────────────────────────

function getMonthKey(dateStr: string): string {
  // dateStr format: DD/MM/YYYY → returns MM/YYYY
  if (!dateStr || dateStr.length < 10) return '';
  return `${dateStr.slice(3, 5)}/${dateStr.slice(6, 10)}`;
}

function monthKeyToLabel(key: string): string {
  // key: MM/YYYY → "Mois YYYY"
  const [mm, yyyy] = key.split('/');
  const idx = parseInt(mm, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${FRENCH_MONTHS[idx]} ${yyyy}`;
}

export function BordereauClient({ factures }: { factures: Facture[] }) {
  const { sort, toggle } = useSort();

  // Group factures by MM/YYYY of dateValidationAMO (format: DD/MM/YYYY)
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const f of factures) {
      const k = getMonthKey(f.dateValidationAMO);
      if (k) keys.add(k);
    }
    // Sort descending: most recent month first
    return Array.from(keys).sort((a, b) => {
      const [amm, ayyyy] = a.split('/');
      const [bmm, byyyy] = b.split('/');
      return (parseInt(byyyy) * 100 + parseInt(bmm)) - (parseInt(ayyyy) * 100 + parseInt(amm));
    });
  }, [factures]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKeys[0] ?? '');

  const filtered = useMemo(() => {
    const base = !selectedMonth
      ? factures
      : factures.filter((f) => getMonthKey(f.dateValidationAMO) === selectedMonth);
    return sortRows(base, sort, FACTURE_GETTERS);
  }, [factures, selectedMonth, sort]);

  const totalHT  = filtered.reduce((s, f) => s + f.montantHT, 0);
  const totalTTC = filtered.reduce((s, f) => s + f.montantTTC, 0);

  if (factures.length === 0) return null;

  return (
    <div className="rom-card overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 bg-blue-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-rom-600 uppercase tracking-wider">
            Bordereau de paiement
          </h2>
          {monthKeys.length > 1 ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-rom-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rom-500 bg-white text-rom-700 font-medium"
            >
              {monthKeys.map((k) => (
                <option key={k} value={k}>{monthKeyToLabel(k)}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-rom-700 font-medium">{monthKeyToLabel(monthKeys[0] ?? '')}</span>
          )}
        </div>
        {filtered.length > 0 && (
          <span className="text-sm font-bold text-rom-600">
            Total TTC : {fmt(totalTTC)}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Aucune facture pour cette période</div>
      ) : (
        <ScrollTableLeft>
          <table className="rom-table">
            <thead>
              <tr>
                <SortTh label="Date facture" sortKey="dateFacture" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="N° Facture / Situation" sortKey="factureOuSituation" sort={sort} onSort={toggle} />
                <SortTh label="Société" sortKey="societe" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="Date validation AMO" sortKey="dateValidationAMO" sort={sort} onSort={toggle} className="hidden sm:table-cell" />
                <SortTh label="Montant HT" sortKey="montantHT" sort={sort} onSort={toggle} className="hidden sm:table-cell text-right" align="right" />
                <SortTh label="Montant TTC" sortKey="montantTTC" sort={sort} onSort={toggle} className="text-right" align="right" />
                <SortTh label="Retenue" sortKey="retenueGarantie" sort={sort} onSort={toggle} className="hidden sm:table-cell text-right" align="right" />
                <SortTh label="% Avanc." sortKey="pourcentageAvancementTotal" sort={sort} onSort={toggle} className="text-right" align="right" />
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Identify the first (primary) AMO validation date; later dates get muted styling
                const primaryDate = filtered.find(f => f.dateValidationAMO)?.dateValidationAMO ?? '';
                return filtered.map((f, i) => {
                  const isSecondary = f.dateValidationAMO && f.dateValidationAMO !== primaryDate;
                  return (
                <tr key={i} className={isSecondary ? 'bg-slate-50 text-slate-400' : undefined}>
                  <td className="hidden sm:table-cell text-gray-500 text-xs whitespace-nowrap">{f.dateFacture}</td>
                  <td className="font-medium text-xs whitespace-nowrap">{f.factureOuSituation}</td>
                  <td className="hidden sm:table-cell text-xs whitespace-nowrap">{f.societe}</td>
                  <td className="hidden sm:table-cell text-gray-500 text-xs whitespace-nowrap">{f.dateValidationAMO}</td>
                  <td className="hidden sm:table-cell text-right whitespace-nowrap">{fmt(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600 whitespace-nowrap">{fmt(f.montantTTC)}</td>
                  <td className="hidden sm:table-cell text-right text-xs text-gray-500 whitespace-nowrap">
                    {f.retenueGarantie > 0 ? `${f.retenueGarantie}%` : '—'}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <span className={`text-xs font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {f.pourcentageAvancementTotal}%
                    </span>
                  </td>
                </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="bg-rom-600 text-white font-bold">
                <td className="hidden sm:table-cell" />
                <td className="px-4 py-3 text-sm whitespace-nowrap">TOTAL ({filtered.length} fact.)</td>
                <td className="hidden sm:table-cell" />
                <td className="hidden sm:table-cell" />
                <td className="hidden sm:table-cell px-4 py-3 text-right text-sm whitespace-nowrap">{fmt(totalHT)}</td>
                <td className="px-4 py-3 text-right text-sm whitespace-nowrap">{fmt(totalTTC)}</td>
                <td className="hidden sm:table-cell" />
                <td />
              </tr>
            </tfoot>
          </table>
        </ScrollTableLeft>
      )}
    </div>
  );
}
