'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, XCircle, ExternalLink, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';

interface CommandeResult {
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
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' €';
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

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<CommandeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAvancement, setFilterAvancement] = useState('');

  useEffect(() => {
    fetch('/api/commandes').then(r => r.json()).then(data => {
      setCommandes(data);
      setLoading(false);
    });
  }, []);

  const projets = Array.from(new Set(commandes.map(c => c.projetNom))).sort();

  const filtered = commandes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.societe.toLowerCase().includes(q) ||
      c.lot.toLowerCase().includes(q) ||
      c.projetNom.toLowerCase().includes(q);
    const matchProjet = !filterProjet || c.projetNom === filterProjet;
    const matchType = !filterType || c.type === filterType;
    const matchAvance =
      filterAvancement === '' ? true :
      filterAvancement === 'done' ? c.pourcentageAvancement === 100 :
      filterAvancement === 'partial' ? c.pourcentageAvancement > 0 && c.pourcentageAvancement < 100 :
      filterAvancement === 'none' ? c.pourcentageAvancement === 0 : true;
    return matchSearch && matchProjet && matchType && matchAvance;
  });

  const totalHT = filtered.reduce((s, c) => s + c.montantHT, 0);
  const totalRestant = filtered.reduce((s, c) => s + c.valeurHtRestante, 0);

  const exportCSV = () => {
    const headers = ['Société', 'LOT / Mission', 'Type', 'Projet', 'Client', 'Montant HT', 'Valeur restante HT', '% Avancement'];
    const rows = filtered.map(c => [
      c.societe, c.lot, TYPE_LABELS[c.type], c.projetNom, c.client,
      c.montantHT.toFixed(2), c.valeurHtRestante.toFixed(2), `${c.pourcentageAvancement}%`
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'commandes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recherche de commandes</h1>
          <p className="text-gray-500 mt-1 text-sm">Consultez et filtrez toutes les commandes par projet, société ou type</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-rom-700 text-rom-700 hover:bg-rom-50 disabled:opacity-40 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rom-card p-5 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par société, LOT, mission, projet..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterProjet} onChange={e => setFilterProjet(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rom-500">
              <option value="">Tous les projets</option>
              {projets.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rom-500">
              <option value="">Tous les types</option>
              <option value="honoraires">Honoraires</option>
              <option value="travaux">Travaux</option>
              <option value="divers">Divers</option>
            </select>
            <select value={filterAvancement} onChange={e => setFilterAvancement(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rom-500">
              <option value="">Tous les avancements</option>
              <option value="done">Terminé (100%)</option>
              <option value="partial">En cours (1–99%)</option>
              <option value="none">Non démarré (0%)</option>
            </select>
            {(search || filterProjet || filterType || filterAvancement) && (
              <button onClick={() => { setSearch(''); setFilterProjet(''); setFilterType(''); setFilterAvancement(''); }}
                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rom-card p-4 bg-blue-50">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Commandes filtrées</p>
          <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="rom-card p-4 bg-slate-50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Total Montant HT</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalHT)}</p>
        </div>
        <div className="rom-card p-4 bg-orange-50">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total Restant HT</p>
          <p className="text-xl font-bold text-orange-700">{fmt(totalRestant)}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rom-card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-rom-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rom-card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Modifiez vos critères de recherche</p>
        </div>
      ) : (
        <div className="rom-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>LOT / Mission</th>
                  <th>Type</th>
                  <th>Projet</th>
                  <th className="text-right">Montant HT</th>
                  <th className="text-right">Valeur restante</th>
                  <th style={{ width: 200 }}>% Avancement</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-gray-900">{c.societe}</td>
                    <td className="text-gray-600">{c.lot}</td>
                    <td>
                      <span className={`badge-avancement border ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td>
                      <Link href={`/projet/${c.projetId}`} className="text-rom-700 font-medium hover:underline text-sm">
                        {c.projetNom}
                      </Link>
                      <p className="text-xs text-gray-400">{c.client}</p>
                    </td>
                    <td className="text-right font-medium">{fmt(c.montantHT)}</td>
                    <td className="text-right">
                      <span className={c.valeurHtRestante === 0 ? 'text-gray-400 text-sm' : 'text-orange-600 font-semibold text-sm'}>
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
                  <td colSpan={4} className="px-4 py-3 text-sm">TOTAL ({filtered.length} commandes)</td>
                  <td className="px-4 py-3 text-right text-sm">{fmt(totalHT)}</td>
                  <td className="px-4 py-3 text-right text-sm">{fmt(totalRestant)}</td>
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
