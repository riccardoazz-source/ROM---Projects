import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import EvolutionChart from '@/components/charts/EvolutionChart';
import TypesCommandesChart from '@/components/charts/TypesCommandesChart';
import AvancementBarChart from '@/components/charts/AvancementBarChart';
import ProjetNav from '@/components/ProjetNav';
import BudgetRefreshButton from '@/components/BudgetRefreshButton';
import ScrollTableLeft from '@/components/ScrollTableLeft';
import { CommandesTableClient, FacturesListClient, BordereauClient } from '@/app/(app)/projet/[id]/ProjetSections';
import { formatMontantHT } from '@/lib/data';
import { Euro, Hash, FileText, TrendingUp } from 'lucide-react';
import type { RapportMensuel, HistoriquePoint } from '@/types';

interface Props {
  rapport: RapportMensuel;
  chartData: HistoriquePoint[];
  budgetExists: boolean;
  budgetValid: boolean;
  navSections: { id: string; label: string }[];
  pctFacturation: number;
  mode: 'admin' | 'share';
}

export default function ProjetPageContent({ rapport, chartData, budgetExists, budgetValid, navSections, pctFacturation, mode }: Props) {
  return (
    <div className="w-full min-w-0">
      <ProjetNav sections={navSections} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Total Commandes HT" value={formatMontantHT(rapport.montantTotalCommandesHT)} sub={`TTC : ${formatMontantHT(rapport.montantTotalCommandesTTC)}`} icon={Euro} />
        <StatCard label="Total Factures HT" value={formatMontantHT(rapport.montantTotalFacturesHT)} sub={`TTC : ${formatMontantHT(rapport.montantTotalFacturesTTC)}`} icon={FileText} accent="bg-orange-500" />
        <StatCard label="Avancement total" value={`${rapport.pourcentageAvancementTotal}%`} sub={`Facturation : ${pctFacturation}%`} icon={TrendingUp} accent="bg-emerald-600" />
        <StatCard label="Commandes" value={`${rapport.nombreCommandesActives} actives`} sub={`${rapport.nombreTotalCommandes} total · ${rapport.nombreTotalAvenants} avenants`} icon={Hash} accent="bg-violet-600" />
      </div>

      {/* Bordereau */}
      <div id="bordereau" className="scroll-mt-28 md:scroll-mt-14">
        <BordereauClient factures={rapport.factures} />
      </div>

      {/* Récapitulatif + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div id="recap" className="rom-card overflow-hidden scroll-mt-28 md:scroll-mt-14 min-w-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Récapitulatif des dépenses</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            {([
              ['Nb commandes total', String(rapport.nombreTotalCommandes)],
              ['Nb avenants', String(rapport.nombreTotalAvenants)],
              ['Commandes actives', String(rapport.nombreCommandesActives)],
              ['Nb total factures', String(rapport.nombreTotalFactures)],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold">{val}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold text-rom-600">
              <span>Commandes HT</span><span>{formatMontantHT(rapport.montantTotalCommandesHT)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold text-orange-600">
              <span>Factures HT</span><span>{formatMontantHT(rapport.montantTotalFacturesHT)}</span>
            </div>
            {([
              ['Honoraires HT', formatMontantHT(rapport.totalCommandesHonorairesHT)],
              ['Travaux HT', formatMontantHT(rapport.totalCommandesTravauxHT)],
              ['Divers HT', formatMontantHT(rapport.totalCommandesDiversHT)],
              ['TVA Commandes', formatMontantHT(rapport.totalTVACommandes)],
              ['TVA Factures', formatMontantHT(rapport.totalTVAFactures)],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 border-b border-gray-50 font-bold">
              <span>Commandes TTC</span>
              <span className="text-rom-600">{formatMontantHT(rapport.montantTotalCommandesTTC)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Factures TTC</span>
              <span className="text-orange-600">{formatMontantHT(rapport.montantTotalFacturesTTC)}</span>
            </div>
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

        <div className="xl:col-span-2 space-y-6 min-w-0">
          <div id="evolution" className="rom-card overflow-hidden scroll-mt-28 md:scroll-mt-14">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Total Commandes HT et Total Factures HT</h2>
            </div>
            <div className="p-5">
              <EvolutionChart data={chartData} />
            </div>
          </div>
          <div className="rom-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Types de Commandes signées</h2>
            </div>
            <div className="p-5">
              <TypesCommandesChart honoraires={rapport.totalCommandesHonorairesHT} travaux={rapport.totalCommandesTravauxHT} divers={rapport.totalCommandesDiversHT} />
            </div>
          </div>
        </div>
      </div>

      {/* Budget */}
      {budgetExists && (
        <div id="budget" className="rom-card overflow-hidden mb-8 scroll-mt-28 md:scroll-mt-14">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Budget prévisionnel</h2>
            {rapport.budget!.titre && !/^budget$/i.test(rapport.budget!.titre) && (
              <span className="text-xs text-gray-500 italic">{rapport.budget!.titre}</span>
            )}
          </div>
          {!budgetValid ? (
            <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
              {mode === 'admin' ? (
                <BudgetRefreshButton />
              ) : (
                <p className="text-sm text-gray-400">Budget en cours de mise à jour</p>
              )}
            </div>
          ) : (
            <ScrollTableLeft>
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
                    if (ligne.type === 'section') return (
                      <tr key={i} className="bg-rom-50 border-t border-b border-rom-100">
                        <td colSpan={(rapport.budget!.colonnes.length || 0) + 1}
                          className="px-4 py-2 font-bold text-rom-700 uppercase tracking-wide text-[11px]">
                          {ligne.libelle}
                        </td>
                      </tr>
                    );
                    if (ligne.type === 'total') return (
                      <tr key={i} className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                        <td className="px-4 py-2 text-gray-800">{ligne.libelle}</td>
                        {ligne.valeurs.map((v, j) => (
                          <td key={j} className="px-4 py-2 text-right tabular-nums text-gray-800">{v !== 0 ? formatMontantHT(v) : '—'}</td>
                        ))}
                      </tr>
                    );
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">{ligne.libelle}</td>
                        {ligne.valeurs.map((v, j) => (
                          <td key={j} className="px-4 py-2 text-right tabular-nums text-gray-700">{v !== 0 ? formatMontantHT(v) : ''}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollTableLeft>
          )}
        </div>
      )}

      {/* Avancement */}
      <div id="avancement" className="rom-card overflow-hidden mb-8 scroll-mt-28 md:scroll-mt-14">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Tableau récapitulatif des commandes — % d&apos;avancement</h2>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <h3 className="text-xs font-bold text-rom-600 uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">Honoraires</h3>
            <AvancementBarChart commandes={rapport.commandes} type="honoraires" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 border-b border-orange-100 pb-2">Travaux</h3>
            <AvancementBarChart commandes={rapport.commandes} type="travaux" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4 border-b border-green-100 pb-2">Divers</h3>
            <AvancementBarChart commandes={rapport.commandes} type="divers" />
          </div>
        </div>
      </div>

      {/* Commandes */}
      <div id="commandes" className="scroll-mt-28 md:scroll-mt-14">
        <CommandesTableClient commandes={rapport.commandes} />
      </div>

      {/* Factures */}
      <div id="factures" className="scroll-mt-28 md:scroll-mt-14">
        <FacturesListClient factures={rapport.factures} />
      </div>
    </div>
  );
}
