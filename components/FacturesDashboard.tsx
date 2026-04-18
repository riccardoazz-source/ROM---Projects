'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Calendar } from 'lucide-react';

function fmt(v: number) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}

function getMonthKey(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  return `${dateStr.slice(3, 5)}/${dateStr.slice(6, 10)}`;
}

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function monthKeyToLabel(key: string): string {
  const [mm, yyyy] = key.split('/');
  const idx = parseInt(mm, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${FRENCH_MONTHS[idx]} ${yyyy}`;
}

export interface FactureDashRow {
  projetId: string;
  projetNom: string;
  dateFacture: string;
  factureOuSituation: string;
  societe: string;
  dateValidationAMO: string;
  montantHT: number;
  montantTTC: number;
  retenueGarantie: number;
}

export default function FacturesDashboard({ rows }: { rows: FactureDashRow[] }) {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Unique validation months sorted desc
  const months = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) {
      const k = getMonthKey(r.dateValidationAMO);
      if (k) keys.add(k);
    }
    return Array.from(keys).sort((a, b) => {
      const [amm, ayyyy] = a.split('/');
      const [bmm, byyyy] = b.split('/');
      return (parseInt(byyyy) * 100 + parseInt(bmm)) - (parseInt(ayyyy) * 100 + parseInt(amm));
    });
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (selectedMonth && getMonthKey(r.dateValidationAMO) !== selectedMonth) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.projetNom.toLowerCase().includes(q) ||
      r.societe.toLowerCase().includes(q) ||
      r.factureOuSituation.toLowerCase().includes(q)
    );
  }), [rows, search, selectedMonth]);

  const totalHT  = filtered.reduce((s, r) => s + r.montantHT, 0);
  const totalTTC = filtered.reduce((s, r) => s + r.montantTTC, 0);

  return (
    <div className="card overflow-hidden">
      <div className="section-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 sm:pr-4">
        <span className="shrink-0">Récapitulatif des factures — tous projets</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg
                         text-white focus:outline-none focus:bg-white/20 appearance-none w-40"
            >
              <option value="">Tous les mois</option>
              {months.map(k => (
                <option key={k} value={k}>{monthKeyToLabel(k)}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg
                         text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 w-36"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Aucune facture enregistrée</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="rom-table">
            <thead>
              <tr>
                <th>Projet</th>
                <th className="hidden sm:table-cell">N° Facture</th>
                <th className="hidden md:table-cell">Société</th>
                <th className="hidden md:table-cell">Date fact.</th>
                <th>Validation AMO</th>
                <th className="text-right">Montant HT</th>
                <th className="text-right">Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-8 text-sm">
                    Aucune facture correspondante
                  </td>
                </tr>
              ) : filtered.map((r, i) => (
                <tr key={i}>
                  <td>
                    <Link href={`/projet/${r.projetId}`} className="font-semibold text-rom-700 hover:underline text-xs">
                      {r.projetNom}
                    </Link>
                  </td>
                  <td className="text-xs hidden sm:table-cell">{r.factureOuSituation}</td>
                  <td className="text-xs hidden md:table-cell">{r.societe}</td>
                  <td className="text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">{r.dateFacture}</td>
                  <td className="text-xs text-slate-500 whitespace-nowrap">{r.dateValidationAMO}</td>
                  <td className="text-right font-semibold tabular-nums text-xs">{fmt(r.montantHT)}</td>
                  <td className="text-right font-bold tabular-nums text-xs text-rom-700">{fmt(r.montantTTC)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  TOTAL · {filtered.length} facture{filtered.length > 1 ? 's' : ''}
                </td>
                <td className="text-right tabular-nums">{fmt(totalHT)}</td>
                <td className="text-right tabular-nums">{fmt(totalTTC)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
