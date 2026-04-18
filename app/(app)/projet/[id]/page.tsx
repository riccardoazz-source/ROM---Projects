import { notFound } from 'next/navigation';
import { getProjetById, getDernierRapport, formatMontantHT } from '@/lib/data';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import CopyShareButton from '@/components/CopyShareButton';
import EvolutionChart from '@/components/charts/EvolutionChart';
import TypesCommandesChart from '@/components/charts/TypesCommandesChart';
import AvancementBarChart from '@/components/charts/AvancementBarChart';
import ProjetNav from '@/components/ProjetNav';
import { Euro, Hash, FileText, TrendingUp } from 'lucide-react';
import { CommandesTableClient, FacturesListClient, BordereauClient } from './ProjetSections';
import type { Facture, HistoriquePoint } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

// Build chart history from facture validation dates when we don't have enough sync history
function buildChartFromFactures(factures: Facture[], commandesHT: number): HistoriquePoint[] {
  const byMonth = new Map<string, number>();
  for (const f of factures) {
    const d = f.dateValidationAMO;
    if (!d || d.length < 10) continue;
    const key = `${d.slice(6, 10)}/${d.slice(3, 5)}`; // YYYY/MM from DD/MM/YYYY
    byMonth.set(key, (byMonth.get(key) ?? 0) + f.montantHT);
  }
  const months = Array.from(byMonth.keys()).sort();
  let cumulative = 0;
  return months.map(date => {
    cumulative += byMonth.get(date)!;
    return { date, montantCommandesHT: commandesHT, montantFacturesHT: cumulative };
  });
}

export default async function ProjetPage({ params }: PageProps) {
  const projet = await getProjetById(params.id);
  if (!projet) notFound();

  const rapport = getDernierRapport(projet);
  if (!rapport) notFound();

  const pctFacturation = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100)
    : 0;

  const hasBudget = !!(rapport.budget && rapport.budget.lignes.length > 0);

  // Use sync history when ≥2 months, otherwise derive from factures (cumulative by validation month)
  const chartData = projet.historiqueChart.length >= 2
    ? projet.historiqueChart
    : buildChartFromFactures(rapport.factures, rapport.montantTotalCommandesHT);

  const navSections = [
    { id: 'bordereau', label: 'Bordereau' },
    { id: 'recap', label: 'Récapitulatif' },
    { id: 'evolution', label: 'Évolution' },
    ...(hasBudget ? [{ id: 'budget', label: 'Budget' }] : []),
    { id: 'avancement', label: 'Avancement' },
    { id: 'commandes', label: 'Commandes' },
    { id: 'factures', label: 'Factures' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{projet.nom}</h1>
          <p className="text-gray-500 mt-1 text-sm">{projet.client} · {projet.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-500 font-medium">Dernier rapport</p>
            <p className="text-sm font-bold text-rom-700">{rapport.mois}</p>
          </div>
          <CopyShareButton projetId={projet.id} projetNom={projet.nom} />
        </div>
      </div>

      {/* Sticky section tabs */}
      <ProjetNav sections={navSections} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Total Commandes HT" value={formatMontantHT(rapport.montantTotalCommandesHT)} sub={`TTC : ${formatMontantHT(rapport.montantTotalCommandesTTC)}`} icon={Euro} />
        <StatCard label="Total Factures HT"  value={formatMontantHT(rapport.montantTotalFacturesHT)}  sub={`TTC : ${formatMontantHT(rapport.montantTotalFacturesTTC)}`}  icon={FileText}  accent="bg-orange-500" />
        <StatCard label="Avancement total"   value={`${rapport.pourcentageAvancementTotal}%`}         sub={`Facturation : ${pctFacturation}%`} icon={TrendingUp} accent="bg-emerald-600" />
        <StatCard label="Commandes"          value={`${rapport.nombreCommandesActives} actives`}      sub={`${rapport.nombreTotalCommandes} total · ${rapport.nombreTotalAvenants} avenants`} icon={Hash} accent="bg-violet-600" />
      </div>

      {/* Bordereau de paiement */}
      <div id="bordereau" className="scroll-mt-28 md:scroll-mt-14">
        <BordereauClient factures={rapport.factures} />
      </div>

      {/* Récapitulatif + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Récapitulatif dépenses */}
        <div id="recap" className="rom-card overflow-hidden scroll-mt-28 md:scroll-mt-14">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Récapitulatif des dépenses</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Nb commandes total</span>
              <span className="font-semibold">{rapport.nombreTotalCommandes}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Nb avenants</span>
              <span className="font-semibold">{rapport.nombreTotalAvenants}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Commandes actives</span>
              <span className="font-semibold">{rapport.nombreCommandesActives}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Nb total factures</span>
              <span className="font-semibold">{rapport.nombreTotalFactures}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold text-rom-600">
              <span>Commandes HT</span>
              <span>{formatMontantHT(rapport.montantTotalCommandesHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold text-orange-600">
              <span>Factures HT</span>
              <span>{formatMontantHT(rapport.montantTotalFacturesHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Honoraires HT</span>
              <span className="font-medium">{formatMontantHT(rapport.totalCommandesHonorairesHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Travaux HT</span>
              <span className="font-medium">{formatMontantHT(rapport.totalCommandesTravauxHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Divers HT</span>
              <span className="font-medium">{formatMontantHT(rapport.totalCommandesDiversHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">TVA Commandes</span>
              <span className="font-medium">{formatMontantHT(rapport.totalTVACommandes)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-600">TVA Factures</span>
              <span className="font-medium">{formatMontantHT(rapport.totalTVAFactures)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold">
              <span>Commandes TTC</span>
              <span className="text-rom-600">{formatMontantHT(rapport.montantTotalCommandesTTC)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Factures TTC</span>
              <span className="text-orange-600">{formatMontantHT(rapport.montantTotalFacturesTTC)}</span>
            </div>

            {/* Progression */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Progression du paiement</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600">Avancement total</span>
                    <span className="font-bold text-rom-600">{rapport.pourcentageAvancementTotal}%</span>
                  </div>
                  <ProgressBar value={rapport.pourcentageAvancementTotal} size="md" color="blue" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600">Taux de facturation</span>
                    <span className="font-bold text-orange-600">{pctFacturation}%</span>
                  </div>
                  <ProgressBar value={pctFacturation} size="md" color="orange" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="xl:col-span-2 space-y-6">
          {/* Évolution */}
          <div id="evolution" className="rom-card overflow-hidden scroll-mt-28 md:scroll-mt-14">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Évolution — Total Commandes HT et Factures HT
              </h2>
            </div>
            <div className="p-5">
              <EvolutionChart data={chartData} />
            </div>
          </div>

          {/* Types de commandes */}
          <div className="rom-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Types de Commandes signées</h2>
            </div>
            <div className="p-5">
              <TypesCommandesChart
                honoraires={rapport.totalCommandesHonorairesHT}
                travaux={rapport.totalCommandesTravauxHT}
                divers={rapport.totalCommandesDiversHT}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget prévisionnel */}
      {hasBudget && (
        <div id="budget" className="rom-card overflow-hidden mb-8 scroll-mt-28 md:scroll-mt-14">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Budget prévisionnel</h2>
            {rapport.budget!.titre && !/^budget$/i.test(rapport.budget!.titre) && (
              <span className="text-xs text-gray-500 italic">{rapport.budget!.titre}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-semibold text-gray-600 min-w-[180px]">Libellé</th>
                  {rapport.budget!.colonnes.map((col, i) => (
                    <th key={i} className="px-4 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rapport.budget!.lignes.map((ligne, i) => {
                  if (ligne.type === 'section') {
                    return (
                      <tr key={i} className="bg-rom-50 border-t border-b border-rom-100">
                        <td colSpan={(rapport.budget!.colonnes.length || 0) + 1}
                          className="px-4 py-2 font-bold text-rom-700 uppercase tracking-wide text-[11px]">
                          {ligne.libelle}
                        </td>
                      </tr>
                    );
                  }
                  if (ligne.type === 'total') {
                    return (
                      <tr key={i} className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                        <td className="px-4 py-2 text-gray-800">{ligne.libelle}</td>
                        {ligne.valeurs.map((v, j) => (
                          <td key={j} className="px-4 py-2 text-right tabular-nums text-gray-800">
                            {v !== 0 ? formatMontantHT(v) : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{ligne.libelle}</td>
                      {ligne.valeurs.map((v, j) => (
                        <td key={j} className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {v !== 0 ? formatMontantHT(v) : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* % Avancement par société */}
      <div id="avancement" className="rom-card overflow-hidden mb-8 scroll-mt-28 md:scroll-mt-14">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Tableau récapitulatif des commandes — % d&apos;avancement
          </h2>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <h3 className="text-xs font-bold text-rom-600 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">
              Honoraires
            </h3>
            <AvancementBarChart commandes={rapport.commandes} type="honoraires" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2">
              Travaux
            </h3>
            <AvancementBarChart commandes={rapport.commandes} type="travaux" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4 border-b border-green-100 pb-2">
              Divers
            </h3>
            <AvancementBarChart commandes={rapport.commandes} type="divers" />
          </div>
        </div>
      </div>

      {/* Tableau des commandes LOTs */}
      <div id="commandes" className="scroll-mt-28 md:scroll-mt-14">
        <CommandesTableClient commandes={rapport.commandes} />
      </div>

      {/* Liste des factures validées */}
      <div id="factures" className="scroll-mt-28 md:scroll-mt-14">
        <FacturesListClient factures={rapport.factures} />
      </div>
    </div>
  );
}
