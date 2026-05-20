'use client';

import { useState, useMemo } from 'react';
import { Search, XCircle, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { Facture } from '@/types';
import { useDataTable, Th, dateKey, type Getter } from '@/components/TableFilter';

export interface FactureResult extends Facture {
  projetId: string;
  projetNom: string;
  client: string;
}

function formatMontant(value: number): string {
  const n = typeof value === 'number' && isFinite(value) ? value : 0;
  const [int, dec] = n.toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
}

const GETTERS: Record<string, Getter<FactureResult>> = {
  dateFacture: (f) => dateKey(f.dateFacture),
  factureOuSituation: (f) => f.factureOuSituation,
  societe: (f) => f.societe,
  projet: (f) => f.projetNom,
  dateValidationAMO: (f) => dateKey(f.dateValidationAMO),
  montantHT: (f) => f.montantHT,
  montantTTC: (f) => f.montantTTC,
  avancement: (f) => f.pourcentageAvancementTotal,
};

export default function FacturesClient({ factures }: { factures: FactureResult[] }) {
  const [search, setSearch] = useState('');

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return factures;
    return factures.filter(
      (f) =>
        f.factureOuSituation.toLowerCase().includes(q) ||
        f.societe.toLowerCase().includes(q) ||
        f.projetNom.toLowerCase().includes(q) ||
        f.client.toLowerCase().includes(q),
    );
  }, [factures, search]);

  const table = useDataTable(searched, GETTERS);
  const rows = table.view;

  const totalHT = rows.reduce((s, f) => s + f.montantHT, 0);
  const totalTTC = rows.reduce((s, f) => s + f.montantTTC, 0);

  const exportCSV = () => {
    const headers = ['Date facture', 'N° Facture', 'Société', 'Projet', 'Client', 'Date validation AMO', 'Montant HT', 'Montant TTC', '% Avancement'];
    const data = rows.map((f) => [
      f.dateFacture, f.factureOuSituation, f.societe, f.projetNom, f.client,
      f.dateValidationAMO, f.montantHT.toFixed(2), f.montantTTC.toFixed(2), `${f.pourcentageAvancementTotal}%`,
    ]);
    const csv = [headers, ...data].map((r) => r.map((v) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'factures.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recherche de factures</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Triez et filtrez chaque colonne — cliquez l&apos;en-tête pour trier, l&apos;entonnoir pour filtrer
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="self-start flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-rom-700 text-rom-700 hover:bg-rom-50 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="rom-card p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par N° facture, société, projet…"
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

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{rows.length}</span> facture{rows.length !== 1 ? 's' : ''}
          {rows.length !== factures.length && ` sur ${factures.length}`}
        </p>
        {rows.length > 0 && (
          <p className="text-sm text-gray-600">
            Total HT : <span className="font-bold">{formatMontant(totalHT)}</span> ·
            TTC : <span className="font-bold text-rom-600">{formatMontant(totalTTC)}</span>
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rom-card p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune facture trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Modifiez la recherche ou les filtres de colonne</p>
        </div>
      ) : (
        <div className="rom-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rom-table compact">
              <thead>
                <tr>
                  <Th label="Date" colKey="dateFacture" table={table} filterable={false} />
                  <Th label="N° Facture" colKey="factureOuSituation" table={table} filterable={false} />
                  <Th label="Société" colKey="societe" table={table} />
                  <Th label="Projet" colKey="projet" table={table} />
                  <Th label="Validation AMO" colKey="dateValidationAMO" table={table} filterable={false} />
                  <Th label="Montant HT" colKey="montantHT" table={table} align="right" className="text-right" filterable={false} />
                  <Th label="Montant TTC" colKey="montantTTC" table={table} align="right" className="text-right" filterable={false} />
                  <Th label="% Avanc." colKey="avancement" table={table} align="right" className="text-right" />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f, i) => (
                  <tr key={i}>
                    <td className="text-gray-500 whitespace-nowrap">{f.dateFacture}</td>
                    <td className="font-medium text-gray-800">{f.factureOuSituation}</td>
                    <td className="font-medium">{f.societe}</td>
                    <td>
                      <Link href={`/projet/${f.projetId}`} className="text-rom-600 hover:underline font-medium">
                        {f.projetNom}
                      </Link>
                      <p className="text-[10px] text-gray-400">{f.client}</p>
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">{f.dateValidationAMO}</td>
                    <td className="text-right font-medium whitespace-nowrap">{formatMontant(f.montantHT)}</td>
                    <td className="text-right font-bold text-rom-600 whitespace-nowrap">{formatMontant(f.montantTTC)}</td>
                    <td className="text-right">
                      <span className={`font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {f.pourcentageAvancementTotal}%
                      </span>
                    </td>
                    <td>
                      <Link href={`/projet/${f.projetId}`} className="text-gray-300 hover:text-rom-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rom-600 text-white font-bold">
                  <td colSpan={5}>TOTAL ({rows.length} factures)</td>
                  <td className="text-right">{formatMontant(totalHT)}</td>
                  <td className="text-right">{formatMontant(totalTTC)}</td>
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
