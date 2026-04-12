'use client';

import { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { Facture } from '@/types';

export interface FactureResult extends Facture {
  projetId: string;
  projetNom: string;
  client: string;
}

function formatMontant(value: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' €';
}

export default function FacturesClient({ factures }: { factures: FactureResult[] }) {
  const [search, setSearch] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterSociete, setFilterSociete] = useState('');

  const projets = Array.from(new Set(factures.map(f => f.projetNom))).sort();
  const societes = Array.from(new Set(factures.map(f => f.societe))).sort();

  const filtered = factures.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      f.factureOuSituation.toLowerCase().includes(q) ||
      f.societe.toLowerCase().includes(q) ||
      f.projetNom.toLowerCase().includes(q) ||
      f.client.toLowerCase().includes(q);
    const matchProjet = !filterProjet || f.projetNom === filterProjet;
    const matchSociete = !filterSociete || f.societe === filterSociete;
    return matchSearch && matchProjet && matchSociete;
  });

  const totalHT = filtered.reduce((s, f) => s + f.montantHT, 0);
  const totalTTC = filtered.reduce((s, f) => s + f.montantTTC, 0);

  const exportCSV = () => {
    const headers = ['Date facture', 'N° Facture', 'Société', 'Projet', 'Client', 'Date validation AMO', 'Montant HT', 'Montant TTC', 'Retenue', '% Commande', '% Avancement'];
    const rows = filtered.map(f => [
      f.dateFacture, f.factureOuSituation, f.societe, f.projetNom, f.client,
      f.dateValidationAMO, f.montantHT.toFixed(2), f.montantTTC.toFixed(2),
      f.retenueGarantie.toFixed(2), `${f.pourcentageFactureSurCommande}%`, `${f.pourcentageAvancementTotal}%`
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'factures.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recherche de factures</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Consultez et recherchez toutes les factures validées de tous les projets
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-rom-700 text-rom-700 hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="rom-card p-5 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par N° facture, société, projet..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rom-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={filterProjet} onChange={e => setFilterProjet(e.target.value)}
                className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rom-500">
                <option value="">Tous les projets</option>
                {projets.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <select value={filterSociete} onChange={e => setFilterSociete(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rom-500">
              <option value="">Toutes les sociétés</option>
              {societes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(search || filterProjet || filterSociete) && (
              <button onClick={() => { setSearch(''); setFilterProjet(''); setFilterSociete(''); }}
                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{filtered.length}</span> facture{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== factures.length && ` sur ${factures.length}`}
        </p>
        {filtered.length > 0 && (
          <p className="text-sm text-gray-600">
            Total HT : <span className="font-bold">{formatMontant(totalHT)}</span> ·
            TTC : <span className="font-bold text-rom-600">{formatMontant(totalTTC)}</span>
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rom-card p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune facture trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Modifiez vos critères de recherche</p>
        </div>
      ) : (
        <div className="rom-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Date facture</th>
                  <th>N° Facture / Situation</th>
                  <th>Société</th>
                  <th>Projet</th>
                  <th>Date validation AMO</th>
                  <th className="text-right">Montant HT</th>
                  <th className="text-right">Montant TTC</th>
                  <th className="text-right">% Avancement</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={i}>
                    <td className="text-gray-500 text-xs whitespace-nowrap">{f.dateFacture}</td>
                    <td className="font-medium text-sm">{f.factureOuSituation}</td>
                    <td className="font-medium">{f.societe}</td>
                    <td>
                      <Link href={`/projet/${f.projetId}`} className="text-rom-600 hover:underline text-sm font-medium">
                        {f.projetNom}
                      </Link>
                      <p className="text-xs text-gray-400">{f.client}</p>
                    </td>
                    <td className="text-gray-500 text-xs whitespace-nowrap">{f.dateValidationAMO}</td>
                    <td className="text-right font-medium">{formatMontant(f.montantHT)}</td>
                    <td className="text-right font-bold text-rom-600">{formatMontant(f.montantTTC)}</td>
                    <td className="text-right">
                      <span className={`text-xs font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {f.pourcentageAvancementTotal}%
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        <CheckCircle className="w-3 h-3" /> Validée
                      </span>
                    </td>
                    <td>
                      <Link href={`/projet/${f.projetId}`} className="text-gray-400 hover:text-rom-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rom-600 text-white font-bold">
                  <td colSpan={5} className="px-4 py-3 text-sm">TOTAL ({filtered.length} factures)</td>
                  <td className="px-4 py-3 text-right text-sm">{formatMontant(totalHT)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatMontant(totalTTC)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
