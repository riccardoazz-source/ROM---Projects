'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Calendar } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

function fmt(v: number) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}

export interface DashboardRow {
  id: string;
  nom: string;
  client: string;
  mois: string;
  commandesHT: number;
  facturesHT: number;
  commandes: number;
  factures: number;
  avancement: number;
}

export default function DashboardTable({ rows }: { rows: DashboardRow[] }) {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Extract unique months sorted desc
  const months = useMemo(() => {
    const set = new Set(rows.map(r => r.mois));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (selectedMonth && r.mois !== selectedMonth) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.nom.toLowerCase().includes(q) || r.client.toLowerCase().includes(q);
  }), [rows, search, selectedMonth]);

  const totalCmdHT  = filtered.reduce((s, r) => s + r.commandesHT, 0);
  const totalFactHT = filtered.reduce((s, r) => s + r.facturesHT, 0);
  const totalCmd    = filtered.reduce((s, r) => s + r.commandes, 0);
  const totalFact   = filtered.reduce((s, r) => s + r.factures, 0);

  return (
    <div className="card overflow-hidden">
      {/* Header + filters */}
      <div className="section-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 sm:pr-4">
        <span className="shrink-0">Récapitulatif financier — tous projets</span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month filter */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg
                         text-white focus:outline-none focus:bg-white/20 appearance-none w-36"
            >
              <option value="">Tous les mois</option>
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {/* Text search */}
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

      <div className="overflow-x-auto">
        <table className="rom-table">
          <thead>
            <tr>
              <th>Projet</th>
              <th className="hidden sm:table-cell">Client</th>
              <th className="hidden sm:table-cell">Rapport</th>
              <th className="text-right hidden sm:table-cell">Commandes HT</th>
              <th className="text-right">Factures HT</th>
              <th className="text-right hidden md:table-cell">Cmd.</th>
              <th className="text-right hidden md:table-cell">Fact.</th>
              <th className="whitespace-nowrap" style={{ width: 120 }}>Avancement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-8">
                  Aucun projet correspondant
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/projet/${r.id}`} className="font-bold text-rom-700 hover:underline">
                    {r.nom}
                  </Link>
                </td>
                <td className="text-slate-500 font-medium hidden sm:table-cell">{r.client}</td>
                <td className="text-slate-400 text-xs whitespace-nowrap hidden sm:table-cell">{r.mois}</td>
                <td className="text-right font-semibold tabular-nums text-xs whitespace-nowrap hidden sm:table-cell">{fmt(r.commandesHT)}</td>
                <td className="text-right font-semibold tabular-nums text-xs whitespace-nowrap">{fmt(r.facturesHT)}</td>
                <td className="text-right text-slate-500 hidden md:table-cell">{r.commandes}</td>
                <td className="text-right text-slate-500 hidden md:table-cell">{r.factures}</td>
                <td><ProgressBar value={r.avancement} size="sm" showLabel /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="hidden sm:table-cell">
                TOTAL · {filtered.length} projet{filtered.length > 1 ? 's' : ''}
              </td>
              <td className="sm:hidden">TOTAL · {filtered.length}</td>
              <td className="hidden sm:table-cell" />
              <td className="text-right tabular-nums whitespace-nowrap hidden sm:table-cell">{fmt(totalCmdHT)}</td>
              <td className="text-right tabular-nums whitespace-nowrap">{fmt(totalFactHT)}</td>
              <td className="text-right hidden md:table-cell">{totalCmd}</td>
              <td className="text-right hidden md:table-cell">{totalFact}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
