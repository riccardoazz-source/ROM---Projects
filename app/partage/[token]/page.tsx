import { notFound } from 'next/navigation';
import { getProjetByToken, getDernierRapport, formatMontantHT } from '@/lib/data';
import ProgressBar from '@/components/ProgressBar';
import EvolutionChart from '@/components/charts/EvolutionChart';
import TypesCommandesChart from '@/components/charts/TypesCommandesChart';
import { CheckCircle, Calendar, BarChart2, FileText, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps { params: { token: string } }

function RomLogoShare() {
  return (
    <svg width="90" height="28" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="22"
        letterSpacing="3" fill="#1C3D54">ROM</text>
      <rect x="58" y="4" width="2" height="20" fill="#2589A8" rx="1" />
      <g transform="translate(64, 2)">
        {[0,3,6,9,12,15,18].map((y, i) => (
          <rect key={i} x={i % 2 === 0 ? 0 : 1} y={y} width={14 - i * 0.5} height="2.2"
            fill={i % 2 === 0 ? '#2589A8' : '#1C6A87'} rx="0.5" />
        ))}
      </g>
    </svg>
  );
}

export default async function PartageProjetPage({ params }: PageProps) {
  const projet = await getProjetByToken(params.token);
  if (!projet) notFound();

  const rapport = getDernierRapport(projet);
  if (!rapport) notFound();

  const pctFacturation = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100)
    : 0;

  const totalMois = rapport.facturesMois.reduce((s, f) => s + f.montantTTC, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <RomLogoShare />
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Rapport partagé</p>
              <p className="text-sm font-bold text-gray-700">{rapport.mois}</p>
            </div>
            <div className="w-px h-10 bg-slate-200 hidden sm:block" />
            <div className="min-w-0 text-right sm:text-left">
              <p className="text-sm font-bold text-rom-800 truncate">{projet.nom}</p>
              <p className="text-xs text-gray-500 font-medium">{rapport.mois}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Share notice banner */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-xs text-blue-700 font-medium">
            Vue partagée en lecture seule — Projet <span className="font-bold">{projet.nom} — {projet.client}</span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Commandes HT', value: formatMontantHT(rapport.montantTotalCommandesHT), sub: `TTC: ${formatMontantHT(rapport.montantTotalCommandesTTC)}`, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { label: 'Total Factures HT', value: formatMontantHT(rapport.montantTotalFacturesHT), sub: `TTC: ${formatMontantHT(rapport.montantTotalFacturesTTC)}`, color: 'bg-orange-50 border-orange-100', text: 'text-orange-600' },
            { label: 'Avancement global', value: `${rapport.pourcentageAvancementTotal}%`, sub: `Ce mois : ${rapport.pourcentageAvancementMois}%`, color: 'bg-green-50 border-green-100', text: 'text-green-600' },
            { label: 'Commandes actives', value: `${rapport.nombreCommandesActives}`, sub: `${rapport.nombreTotalCommandes} total · ${rapport.nombreTotalAvenants} avenants`, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl border p-3 sm:p-5 ${kpi.color}`}>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 ${kpi.text}`}>{kpi.label}</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 break-all">{kpi.value}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Progression bars */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rom-500" /> Progression du paiement
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 font-medium">Avancement — {rapport.mois}</span>
                <span className="font-bold">{rapport.pourcentageAvancementMois}%</span>
              </div>
              <ProgressBar value={rapport.pourcentageAvancementMois} size="lg" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 font-medium">Avancement total</span>
                <span className="font-bold text-blue-700">{rapport.pourcentageAvancementTotal}%</span>
              </div>
              <ProgressBar value={rapport.pourcentageAvancementTotal} size="lg" color="blue" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 font-medium">Taux de facturation</span>
                <span className="font-bold text-orange-600">{pctFacturation}%</span>
              </div>
              <ProgressBar value={pctFacturation} size="lg" color="orange" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-rom-500" /> Évolution Commandes / Factures HT
            </h2>
            <EvolutionChart data={projet.historiqueChart} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Types de commandes</h2>
            <TypesCommandesChart
              honoraires={rapport.totalCommandesHonorairesHT}
              travaux={rapport.totalCommandesTravauxHT}
              divers={rapport.totalCommandesDiversHT}
            />
          </div>
        </div>

        {/* Récap financier */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #1C3D54, #1C4F6C)' }}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Récapitulatif financier</h2>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Nb total commandes', rapport.nombreTotalCommandes],
                ['Nb avenants', rapport.nombreTotalAvenants],
                ['Commandes actives', rapport.nombreCommandesActives],
                ['Nb total factures', rapport.nombreTotalFactures],
                ['Nb factures avec retenue', rapport.nombreFacturesAvecRetenue],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Commandes HT', formatMontantHT(rapport.montantTotalCommandesHT), 'text-rom-700'],
                ['Factures HT', formatMontantHT(rapport.montantTotalFacturesHT), 'text-orange-600'],
                ['Honoraires HT', formatMontantHT(rapport.totalCommandesHonorairesHT), ''],
                ['Travaux HT', formatMontantHT(rapport.totalCommandesTravauxHT), ''],
                ['Divers HT', formatMontantHT(rapport.totalCommandesDiversHT), ''],
                ['Commandes TTC', formatMontantHT(rapport.montantTotalCommandesTTC), 'font-bold text-rom-700'],
                ['Factures TTC', formatMontantHT(rapport.montantTotalFacturesTTC), 'font-bold text-orange-600'],
              ].map(([label, val, cls]) => (
                <div key={String(label)} className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bordereau du mois */}
        {rapport.facturesMois.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-blue-100 bg-blue-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h2 className="text-sm font-bold text-rom-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Bordereau du mois — {rapport.mois}
              </h2>
              <span className="text-sm font-bold text-rom-700">Total TTC : {formatMontantHT(totalMois)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="rom-table">
                <thead>
                  <tr>
                    <th>Facture / Situation</th>
                    <th>Société</th>
                    <th>Date validation</th>
                    <th className="text-right">HT</th>
                    <th className="text-right">TVA</th>
                    <th className="text-right">TTC</th>
                    <th className="text-right">% Avancement</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.facturesMois.map((f, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{f.factureOuSituation}</td>
                      <td>{f.societe}</td>
                      <td className="text-gray-400">{f.dateValidation}</td>
                      <td className="text-right">{formatMontantHT(f.montantHT)}</td>
                      <td className="text-right text-gray-400">{formatMontantHT(f.tva)}</td>
                      <td className="text-right font-bold text-rom-700">{formatMontantHT(f.montantTTC)}</td>
                      <td className="text-right font-bold text-sm">{f.pourcentageAvancementTotal}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Liste factures */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1C3D54, #1C4F6C)' }}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Liste des factures validées
            </h2>
            <span className="text-xs text-blue-200">{rapport.factures.length} factures</span>
          </div>
          <div className="overflow-x-auto">
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Date facture</th>
                  <th>N° Facture</th>
                  <th>Société</th>
                  <th>Date validation</th>
                  <th className="text-right">Montant HT</th>
                  <th className="text-right">Montant TTC</th>
                  <th className="text-right">% Avancement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rapport.factures.map((f, i) => (
                  <tr key={i}>
                    <td className="text-gray-400 text-xs">{f.dateFacture}</td>
                    <td className="font-semibold">{f.factureOuSituation}</td>
                    <td>{f.societe}</td>
                    <td className="text-gray-400 text-xs">{f.dateValidationAMO}</td>
                    <td className="text-right font-medium">{formatMontantHT(f.montantHT)}</td>
                    <td className="text-right font-bold text-rom-700">{formatMontantHT(f.montantTTC)}</td>
                    <td className="text-right">
                      <span className={`text-xs font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {f.pourcentageAvancementTotal}%
                      </span>
                    </td>
                    <td>
                      <span className="badge-validated">
                        <CheckCircle className="w-3 h-3" /> Validée
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Document généré par <span className="font-semibold text-rom-700">ROM — Roux Oeuvre Maitrise</span> · Vue partagée en lecture seule
          </p>
        </div>
      </div>
    </div>
  );
}
