'use client';

import { useState, useMemo } from 'react';
import { Search, XCircle } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import ScrollTableLeft from '@/components/ScrollTableLeft';
import { Commande, Facture } from '@/types';
import { useDataTable, Th, dateKey, type Getter } from '@/components/TableFilter';

function fmt(v: number) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}
const formatMontantHT = fmt;

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── CommandesTableClient ────────────────────────────────────────────────────

const COMMANDE_GETTERS: Record<string, Getter<Commande>> = {
  societe: (c) => c.societe,
  lot: (c) => c.lot || '—',
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
          <td className="font-medium text-gray-900">{c.societe}</td>
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

export function CommandesTableClient({ commandes }: { commandes: Commande[] }) {
  const [search, setSearch] = useState('');

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commandes;
    return commandes.filter(
      (c) => c.societe.toLowerCase().includes(q) || c.lot.toLowerCase().includes(q),
    );
  }, [commandes, search]);

  const table = useDataTable(searched, COMMANDE_GETTERS);

  // Sorting / filtering happen globally on table.view, then rows are grouped
  // by type so each Honoraires / Travaux / Divers subtotal stays correct.
  const groups = useMemo(
    () =>
      (['honoraires', 'travaux', 'divers'] as const)
        .map((type) => ({
          type,
          label: type === 'honoraires' ? 'Honoraires' : type === 'travaux' ? 'Travaux' : 'Divers',
          rows: table.view.filter((c) => c.type === type),
        }))
        .filter((g) => g.rows.length > 0),
    [table.view],
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
            placeholder="Rechercher société, LOT…"
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
          <table className="rom-table compact">
            <thead>
              <tr>
                <Th label="Société" colKey="societe" table={table} />
                <Th label="LOT / Mission" colKey="lot" table={table} className="hidden sm:table-cell" />
                <Th label="Montant HT" colKey="montantHT" table={table} className="text-right" align="right" filterable={false} />
                <Th label="Valeur restante" colKey="valeurHtRestante" table={table} className="text-right hidden sm:table-cell" align="right" filterable={false} />
                <Th label="% Avanc." colKey="pourcentageAvancement" table={table} style={{ width: 150 }} />
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

const FACTURE_GETTERS: Record<string, Getter<Facture>> = {
  dateFacture: (f) => dateKey(f.dateFacture),
  factureOuSituation: (f) => f.factureOuSituation,
  societe: (f) => f.societe,
  dateValidationAMO: (f) => dateKey(f.dateValidationAMO),
  montantHT: (f) => f.montantHT,
  montantTTC: (f) => f.montantTTC,
  retenueGarantie: (f) => f.retenueGarantie,
  pourcentageFactureSurCommande: (f) => f.pourcentageFactureSurCommande,
  pourcentageAvancementTotal: (f) => f.pourcentageAvancementTotal,
};

export function FacturesListClient({ factures }: { factures: Facture[] }) {
  const [search, setSearch] = useState('');

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return factures;
    return factures.filter(
      (f) =>
        f.factureOuSituation.toLowerCase().includes(q) ||
        f.societe.toLowerCase().includes(q),
    );
  }, [factures, search]);

  const table = useDataTable(searched, FACTURE_GETTERS);
  const rows = table.view;

  return (
    <div className="rom-card overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Liste des factures validées
          </h2>
          <span className="text-xs text-gray-500">
            {rows.length} facture{rows.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher N° facture, société…"
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
        <table className="rom-table compact">
          <thead>
            <tr>
              <Th label="Date" colKey="dateFacture" table={table} className="hidden sm:table-cell" filterable={false} />
              <Th label="N° Facture" colKey="factureOuSituation" table={table} filterable={false} />
              <Th label="Société" colKey="societe" table={table} className="hidden sm:table-cell" />
              <Th label="Validation AMO" colKey="dateValidationAMO" table={table} className="hidden md:table-cell" filterable={false} />
              <Th label="Montant HT" colKey="montantHT" table={table} className="hidden sm:table-cell text-right" align="right" filterable={false} />
              <Th label="Montant TTC" colKey="montantTTC" table={table} className="text-right" align="right" filterable={false} />
              <Th label="Retenue" colKey="retenueGarantie" table={table} className="hidden md:table-cell text-right" align="right" />
              <Th label="% Cmd" colKey="pourcentageFactureSurCommande" table={table} className="hidden md:table-cell text-right" align="right" />
              <Th label="% Avanc." colKey="pourcentageAvancementTotal" table={table} className="text-right" align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8 text-sm">
                  Aucune facture correspondante
                </td>
              </tr>
            ) : (
              rows.map((f, i) => (
                <tr key={i}>
                  <td className="hidden sm:table-cell text-gray-500 whitespace-nowrap">{f.dateFacture}</td>
                  <td className="font-medium whitespace-nowrap">{f.factureOuSituation}</td>
                  <td className="hidden sm:table-cell whitespace-nowrap">{f.societe}</td>
                  <td className="hidden md:table-cell text-gray-500 whitespace-nowrap">{f.dateValidationAMO}</td>
                  <td className="hidden sm:table-cell text-right font-medium whitespace-nowrap">{formatMontantHT(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600 whitespace-nowrap">{formatMontantHT(f.montantTTC)}</td>
                  <td className="hidden md:table-cell text-right whitespace-nowrap">
                    {f.retenueGarantie > 0 ? `${f.retenueGarantie}%` : '—'}
                  </td>
                  <td className="hidden md:table-cell text-right font-medium whitespace-nowrap">{f.pourcentageFactureSurCommande}%</td>
                  <td className="text-right whitespace-nowrap">
                    <span
                      className={`font-bold ${
                        f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {f.pourcentageAvancementTotal}%
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
  const [mm, yyyy] = key.split('/');
  const idx = parseInt(mm, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${FRENCH_MONTHS[idx]} ${yyyy}`;
}

export function BordereauClient({ factures }: { factures: Facture[] }) {
  // Group factures by MM/YYYY of dateValidationAMO (format: DD/MM/YYYY)
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const f of factures) {
      const k = getMonthKey(f.dateValidationAMO);
      if (k) keys.add(k);
    }
    return Array.from(keys).sort((a, b) => {
      const [amm, ayyyy] = a.split('/');
      const [bmm, byyyy] = b.split('/');
      return (parseInt(byyyy) * 100 + parseInt(bmm)) - (parseInt(ayyyy) * 100 + parseInt(amm));
    });
  }, [factures]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKeys[0] ?? '');

  const monthFactures = useMemo(
    () =>
      !selectedMonth
        ? factures
        : factures.filter((f) => getMonthKey(f.dateValidationAMO) === selectedMonth),
    [factures, selectedMonth],
  );

  const table = useDataTable(monthFactures, FACTURE_GETTERS);
  const rows = table.view;

  const totalHT = rows.reduce((s, f) => s + f.montantHT, 0);
  const totalTTC = rows.reduce((s, f) => s + f.montantTTC, 0);

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
        {rows.length > 0 && (
          <span className="text-sm font-bold text-rom-600">
            Total TTC : {fmt(totalTTC)}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Aucune facture pour cette période</div>
      ) : (
        <ScrollTableLeft>
          <table className="rom-table compact">
            <thead>
              <tr>
                <Th label="Date" colKey="dateFacture" table={table} className="hidden sm:table-cell" filterable={false} />
                <Th label="N° Facture" colKey="factureOuSituation" table={table} filterable={false} />
                <Th label="Société" colKey="societe" table={table} className="hidden sm:table-cell" />
                <Th label="Validation AMO" colKey="dateValidationAMO" table={table} className="hidden sm:table-cell" filterable={false} />
                <Th label="Montant HT" colKey="montantHT" table={table} className="hidden sm:table-cell text-right" align="right" filterable={false} />
                <Th label="Montant TTC" colKey="montantTTC" table={table} className="text-right" align="right" filterable={false} />
                <Th label="Retenue" colKey="retenueGarantie" table={table} className="hidden sm:table-cell text-right" align="right" />
                <Th label="% Avanc." colKey="pourcentageAvancementTotal" table={table} className="text-right" align="right" />
              </tr>
            </thead>
            <tbody>
              {(() => {
                const primaryDate = rows.find((f) => f.dateValidationAMO)?.dateValidationAMO ?? '';
                return rows.map((f, i) => {
                  const isSecondary = f.dateValidationAMO && f.dateValidationAMO !== primaryDate;
                  return (
                    <tr key={i} className={isSecondary ? 'bg-slate-50 text-slate-400' : undefined}>
                      <td className="hidden sm:table-cell text-gray-500 whitespace-nowrap">{f.dateFacture}</td>
                      <td className="font-medium whitespace-nowrap">{f.factureOuSituation}</td>
                      <td className="hidden sm:table-cell whitespace-nowrap">{f.societe}</td>
                      <td className="hidden sm:table-cell text-gray-500 whitespace-nowrap">{f.dateValidationAMO}</td>
                      <td className="hidden sm:table-cell text-right whitespace-nowrap">{fmt(f.montantHT)}</td>
                      <td className="text-right font-bold text-rom-600 whitespace-nowrap">{fmt(f.montantTTC)}</td>
                      <td className="hidden sm:table-cell text-right text-gray-500 whitespace-nowrap">
                        {f.retenueGarantie > 0 ? `${f.retenueGarantie}%` : '—'}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <span className={`font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
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
                <td className="px-4 py-3 text-sm whitespace-nowrap">TOTAL ({rows.length} fact.)</td>
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
