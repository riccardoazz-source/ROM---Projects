'use client';

import { useState, useMemo } from 'react';
import { Search, XCircle, CheckCircle } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
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

// ─── Internal helpers ────────────────────────────────────────────────────────

function CommandesSubSection({ commandes, type, label }: {
  commandes: Commande[];
  type: 'honoraires' | 'travaux' | 'divers';
  label: string;
}) {
  const filtered = commandes.filter((c) => c.type === type);
  if (filtered.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{label}</h4>
      <div className="overflow-x-auto">
        <table className="rom-table">
          <thead>
            <tr>
              <th>Société</th>
              <th>LOT / Mission</th>
              <th className="text-right">Montant HT</th>
              <th className="text-right">Valeur restante</th>
              <th style={{ width: 200 }}>% Avancement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td className="font-medium text-gray-900">{c.societe}</td>
                <td className="text-gray-500">{c.lot}</td>
                <td className="text-right font-medium">{formatMontantHT(c.montantHT)}</td>
                <td className="text-right">
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
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={2} className="px-4 py-2 text-sm text-gray-700">Sous-total {label}</td>
              <td className="px-4 py-2 text-right text-sm">
                {formatMontantHT(filtered.reduce((s, c) => s + c.montantHT, 0))}
              </td>
              <td className="px-4 py-2 text-right text-sm text-orange-600">
                {formatMontantHT(filtered.reduce((s, c) => s + c.valeurHtRestante, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── CommandesTableClient ────────────────────────────────────────────────────

export function CommandesTableClient({ commandes }: { commandes: Commande[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return commandes;
    const q = search.toLowerCase();
    return commandes.filter(
      (c) => c.societe.toLowerCase().includes(q) || c.lot.toLowerCase().includes(q),
    );
  }, [commandes, search]);

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
      <div className="p-6 space-y-6">
        <CommandesSubSection commandes={filtered} type="honoraires" label="Honoraires" />
        <CommandesSubSection commandes={filtered} type="travaux" label="Travaux" />
        <CommandesSubSection commandes={filtered} type="divers" label="Divers" />
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-4 text-sm">Aucune commande correspondante</p>
        )}
      </div>
    </div>
  );
}

// ─── FacturesListClient ──────────────────────────────────────────────────────

export function FacturesListClient({ factures }: { factures: Facture[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return factures;
    const q = search.toLowerCase();
    return factures.filter(
      (f) =>
        f.factureOuSituation.toLowerCase().includes(q) ||
        f.societe.toLowerCase().includes(q),
    );
  }, [factures, search]);

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
      <div className="overflow-x-auto">
        <table className="rom-table">
          <thead>
            <tr>
              <th>Date facture</th>
              <th>N° Facture / Situation</th>
              <th>Société</th>
              <th>Date validation AMO</th>
              <th className="text-right">Montant HT</th>
              <th className="text-right">Montant TTC</th>
              <th className="text-right">Retenue</th>
              <th className="text-right">% Commande</th>
              <th className="text-right">% Avancement</th>
              <th>Statut</th>
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
                  <td className="text-gray-500 text-xs">{f.dateFacture}</td>
                  <td className="font-medium text-sm">{f.factureOuSituation}</td>
                  <td>{f.societe}</td>
                  <td className="text-gray-500 text-xs">{f.dateValidationAMO}</td>
                  <td className="text-right font-medium">{formatMontantHT(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600">{formatMontantHT(f.montantTTC)}</td>
                  <td className="text-right text-xs">
                    {f.retenueGarantie > 0 ? formatMontantHT(f.retenueGarantie) : '—'}
                  </td>
                  <td className="text-right text-xs font-medium">{f.pourcentageFactureSurCommande}%</td>
                  <td className="text-right">
                    <span
                      className={`text-xs font-bold ${
                        f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {f.pourcentageAvancementTotal}%
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle className="w-3 h-3" /> Validée
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
    if (!selectedMonth) return factures;
    return factures.filter((f) => getMonthKey(f.dateValidationAMO) === selectedMonth);
  }, [factures, selectedMonth]);

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
        <div className="overflow-x-auto">
          <table className="rom-table">
            <thead>
              <tr>
                <th>Date facture</th>
                <th>N° Facture / Situation</th>
                <th>Société</th>
                <th>Date validation AMO</th>
                <th className="text-right">Montant HT</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-right">Retenue</th>
                <th className="text-right">% Avancement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={i}>
                  <td className="text-gray-500 text-xs whitespace-nowrap">{f.dateFacture}</td>
                  <td className="font-medium">{f.factureOuSituation}</td>
                  <td>{f.societe}</td>
                  <td className="text-gray-500 text-xs whitespace-nowrap">{f.dateValidationAMO}</td>
                  <td className="text-right">{fmt(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600">{fmt(f.montantTTC)}</td>
                  <td className="text-right text-xs text-gray-500">
                    {f.retenueGarantie > 0 ? fmt(f.retenueGarantie) : '—'}
                  </td>
                  <td className="text-right">
                    <span className={`text-xs font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {f.pourcentageAvancementTotal}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-rom-600 text-white font-bold">
                <td colSpan={4} className="px-4 py-3 text-sm">TOTAL ({filtered.length} factures)</td>
                <td className="px-4 py-3 text-right text-sm">{fmt(totalHT)}</td>
                <td className="px-4 py-3 text-right text-sm">{fmt(totalTTC)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
