'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

function fmt(v: number) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' €';
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

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.nom.toLowerCase().includes(q) || r.client.toLowerCase().includes(q);
  });

  const totalCmdHT  = filtered.reduce((s, r) => s + r.commandesHT, 0);
  const totalFactHT = filtered.reduce((s, r) => s + r.facturesHT, 0);
  const totalCmd    = filtered.reduce((s, r) => s + r.commandes, 0);
  const totalFact   = filtered.reduce((s, r) => s + r.factures, 0);

  return (
    <div className="card overflow-hidden">
      {/* Header + filter */}
      <div className="section-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 sm:pr-4">
        <span>Récapitulatif financier — tous projets</span>
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrer projet / client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg
                       text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 w-full sm:w-48"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="rom-table">
          <thead>
            <tr>
              <th>Projet</th>
              <th>Client</th>
              <th>Dernier rapport</th>
              <th className="text-right">Commandes HT</th>
              <th className="text-right">Factures HT</th>
              <th className="text-right">Cmd.</th>
              <th className="text-right">Fact.</th>
              <th style={{ width: 140 }}>Avancement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-8">
                  Aucun projet correspond à &laquo; {search} &raquo;
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/projet/${r.id}`} className="font-bold text-rom-700 hover:underline">
                    {r.nom}
                  </Link>
                </td>
                <td className="text-slate-500 font-medium">{r.client}</td>
                <td className="text-slate-400">{r.mois}</td>
                <td className="text-right font-semibold tabular-nums">{fmt(r.commandesHT)}</td>
                <td className="text-right font-semibold tabular-nums">{fmt(r.facturesHT)}</td>
                <td className="text-right text-slate-500">{r.commandes}</td>
                <td className="text-right text-slate-500">{r.factures}</td>
                <td><ProgressBar value={r.avancement} size="sm" showLabel /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                TOTAL CONSOLIDÉ · {filtered.length} projet{filtered.length > 1 ? 's' : ''}
              </td>
              <td className="text-right tabular-nums">{fmt(totalCmdHT)}</td>
              <td className="text-right tabular-nums">{fmt(totalFactHT)}</td>
              <td className="text-right">{totalCmd}</td>
              <td className="text-right">{totalFact}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
