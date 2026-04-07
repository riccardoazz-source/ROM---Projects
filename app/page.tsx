import { getAllProjets, getDernierRapport, formatMontantHT } from '@/lib/data';
import ProjectCard from '@/components/ProjectCard';
import StatCard from '@/components/StatCard';
import { Euro, FolderOpen, TrendingUp, FileCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const projets = getAllProjets();

  // Aggregated stats
  let totalCommandesHT = 0;
  let totalFacturesHT = 0;
  let totalCommandesTTC = 0;
  let totalFacturesTTC = 0;
  let totalFactures = 0;
  let totalCommandes = 0;
  let sumAvancement = 0;
  let projetsAvecRapport = 0;

  for (const projet of projets) {
    const rapport = getDernierRapport(projet);
    if (!rapport) continue;
    projetsAvecRapport++;
    totalCommandesHT += rapport.montantTotalCommandesHT;
    totalFacturesHT += rapport.montantTotalFacturesHT;
    totalCommandesTTC += rapport.montantTotalCommandesTTC;
    totalFacturesTTC += rapport.montantTotalFacturesTTC;
    totalFactures += rapport.nombreTotalFactures;
    totalCommandes += rapport.nombreTotalCommandes;
    sumAvancement += rapport.pourcentageAvancementTotal;
  }

  const avgAvancement = projetsAvecRapport > 0 ? Math.round(sumAvancement / projetsAvecRapport) : 0;
  const pctFacturation = totalCommandesHT > 0 ? Math.round((totalFacturesHT / totalCommandesHT) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Vue consolidée de tous les projets — {projets.length} projet{projets.length > 1 ? 's' : ''} actif{projets.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Commandes HT"
          value={formatMontantHT(totalCommandesHT)}
          sub={`TTC : ${formatMontantHT(totalCommandesTTC)}`}
          icon={Euro}
          color="blue"
        />
        <StatCard
          label="Total Factures HT"
          value={formatMontantHT(totalFacturesHT)}
          sub={`TTC : ${formatMontantHT(totalFacturesTTC)}`}
          icon={FileCheck}
          color="orange"
        />
        <StatCard
          label="Avancement moyen"
          value={`${avgAvancement}%`}
          sub={`Facturation : ${pctFacturation}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Projets suivis"
          value={`${projets.length}`}
          sub={`${totalCommandes} commandes · ${totalFactures} factures`}
          icon={FolderOpen}
          color="purple"
        />
      </div>

      {/* Résumé financier */}
      <div className="rom-card mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Récapitulatif par projet</h2>
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
                <th className="text-right">Commandes</th>
                <th className="text-right">Factures</th>
                <th className="text-right">% Avancement</th>
              </tr>
            </thead>
            <tbody>
              {projets.map((projet) => {
                const rapport = getDernierRapport(projet);
                if (!rapport) return null;
                return (
                  <tr key={projet.id}>
                    <td>
                      <a href={`/projet/${projet.id}`} className="font-semibold text-rom-600 hover:underline">
                        {projet.nom}
                      </a>
                    </td>
                    <td className="text-gray-600">{projet.client}</td>
                    <td className="text-gray-500">{rapport.mois}</td>
                    <td className="text-right font-medium">{formatMontantHT(rapport.montantTotalCommandesHT)}</td>
                    <td className="text-right font-medium">{formatMontantHT(rapport.montantTotalFacturesHT)}</td>
                    <td className="text-right text-gray-600">{rapport.nombreTotalCommandes}</td>
                    <td className="text-right text-gray-600">{rapport.nombreTotalFactures}</td>
                    <td className="text-right">
                      <span className={`font-bold ${rapport.pourcentageAvancementTotal >= 70 ? 'text-green-600' : rapport.pourcentageAvancementTotal >= 40 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {rapport.pourcentageAvancementTotal}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-rom-600 text-white font-bold">
                <td colSpan={3} className="px-4 py-3 text-sm">TOTAL</td>
                <td className="px-4 py-3 text-right text-sm">{formatMontantHT(totalCommandesHT)}</td>
                <td className="px-4 py-3 text-right text-sm">{formatMontantHT(totalFacturesHT)}</td>
                <td className="px-4 py-3 text-right text-sm">{totalCommandes}</td>
                <td className="px-4 py-3 text-right text-sm">{totalFactures}</td>
                <td className="px-4 py-3 text-right text-sm">{avgAvancement}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Projets</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {projets.map((projet) => (
            <ProjectCard key={projet.id} projet={projet} />
          ))}
        </div>
      </div>
    </div>
  );
}
