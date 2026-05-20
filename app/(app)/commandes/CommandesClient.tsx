'use client';

import { useState, useMemo } from 'react';
import { Search, XCircle, ExternalLink, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import { useDataTable, Th, type Getter } from '@/components/TableFilter';

export interface CommandeResult {
  societe: string;
  montantHT: number;
  lot: string;
  type: 'honoraires' | 'travaux' | 'divers';
  valeurHtRestante: number;
  pourcentageAvancement: number;
  projetId: string;
  projetNom: string;
  client: string;
}

function fmt(v: number) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}

const TYPE_LABELS: Record<string, string> = {
  honoraires: 'Honoraires',
  travaux: 'Travaux',
  divers: 'Divers',
};

const TYPE_COLORS: Record<string, string> = {
  honoraires: 'bg-blue-100 text-blue-700 border-blue-200',
  travaux: 'bg-orange-100 text-orange-700 border-orange-200',
  divers: 'bg-green-100 text-green-700 border-green-200',
};

const GETTERS: Record<string, Getter<CommandeResult>> = {
  societe: (c) => c.societe,
  lot: (c) => c.lot || '—',
  type: (c) => TYPE_LABELS[c.type],
  projet: (c) => c.projetNom,
  montantHT: (c) => c.montantHT,
  valeurHtRestante: (c) => c.valeurHtRestante,
  avancement: (c) => c.pourcentageAvancement,
};

export default function CommandesClient({ commandes }: { commandes: CommandeResult[] }) {
  const [search, setSearch] = useState('');

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commandes;
    return commandes.filter(
      (c) =>
        c.societe.toLowerCase().includes(q) ||
        c.lot.toLowerCase().includes(q) ||
        c.projetNom.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q),
    );
  }, [commandes, search]);

  const table = useDataTable(searched, GETTERS);
  const rows = table.view;

  const totalHT = rows.reduce((s, c) => s + c.montantHT, 0);
  const totalRestant = rows.reduce((s, c) => s + c.valeurHtRestante, 0);

  const exportCSV = () => {
    const headers = ['Société', 'LOT / Mission', 'Type', 'Projet', 'Client', 'Montant HT', 'Valeur restante HT', '% Avancement'];
    const data = rows.map((c) => [
      c.societe, c.lot, TYPE_LABELS[c.type], c.projetNom, c.client,
      c.montantHT.toFixed(2), c.valeurHtRestante.toFixed(2), `${c.pourcentageAvancement}%`,
    ]);
    const csv = [headers, ...data].map((r) => r.map((v) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'commandes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recherche de commandes</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Triez et filtrez chaque colonne — cliquez l&apos;en-tête pour trier, l&apos;entonnoir pour filtrer
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="self-start flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-rom-700 text-rom-700 hover:bg-rom-50 disabled:opacity-40 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      <div className="rom-card p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par société, LOT, projet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
        {(search || table.activeFilters > 0) && (
          <button
            onClick={() => { setSearch(''); table.clearFilters(); }}
            className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 self-start sm:self-auto"
          >
            <XCircle className="w-4 h-4" /> Réinitialiser{table.activeFilters > 0 ? ` (${table.activeFilters})` : ''}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
        <div className="rom-card p-3 sm:p-4 bg-blue-50">
          <p className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Affichées</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{rows.length}</p>
        </div>
        <div className="rom-card p-3 sm:p-4 bg-slate-50">
          <p className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Total HT</p>
          <p className="text-sm sm:text-xl font-bold text-gray-900 break-all">{fmt(totalHT)}</p>
        </div>
        <div className="rom-card p-3 sm:p-4 bg-orange-50">
          <p className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Restant HT</p>
          <p className="text-sm sm:text-xl font-bold text-orange-700 break-all">{fmt(totalRestant)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rom-card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Modifiez la recherche ou les filtres de colonne</p>
        </div>
      ) : (
        <div className="rom-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rom-table compact">
              <thead>
                <tr>
                  <Th label="Société" colKey="societe" table={table} />
                  <Th label="LOT / Mission" colKey="lot" table={table} />
                  <Th label="Type" colKey="type" table={table} />
                  <Th label="Projet" colKey="projet" table={table} />
                  <Th label="Montant HT" colKey="montantHT" table={table} align="right" className="text-right" filterable={false} />
                  <Th label="Restante" colKey="valeurHtRestante" table={table} align="right" className="text-right" filterable={false} />
                  <Th label="% Avanc." colKey="avancement" table={table} style={{ width: 170 }} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-gray-900">{c.societe}</td>
                    <td className="text-gray-600">{c.lot || '—'}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td>
                      <Link href={`/projet/${c.projetId}`} className="text-rom-700 font-medium hover:underline">
                        {c.projetNom}
                      </Link>
                      <p className="text-[10px] text-gray-400">{c.client}</p>
                    </td>
                    <td className="text-right font-medium whitespace-nowrap">{fmt(c.montantHT)}</td>
                    <td className="text-right whitespace-nowrap">
                      <span className={c.valeurHtRestante === 0 ? 'text-gray-400' : 'text-orange-600 font-semibold'}>
                        {fmt(c.valeurHtRestante)}
                      </span>
                    </td>
                    <td>
                      <ProgressBar
                        value={c.pourcentageAvancement}
                        color={c.pourcentageAvancement === 100 ? 'green' : c.pourcentageAvancement === 0 ? 'gray' : 'blue'}
                        size="sm"
                      />
                    </td>
                    <td>
                      <Link href={`/projet/${c.projetId}`} className="text-gray-300 hover:text-rom-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAL ({rows.length} commandes)</td>
                  <td className="text-right">{fmt(totalHT)}</td>
                  <td className="text-right">{fmt(totalRestant)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
