import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjetById, getDernierRapport, formatMontantHT } from '@/lib/data';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import CopyShareButton from '@/components/CopyShareButton';
import EvolutionChart from '@/components/charts/EvolutionChart';
import TypesCommandesChart from '@/components/charts/TypesCommandesChart';
import AvancementBarChart from '@/components/charts/AvancementBarChart';
import { ChevronRight, Euro, Hash, FileText, TrendingUp, CheckCircle, ExternalLink } from 'lucide-react';
import { Commande } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

function CommandesSection({ commandes, type, label }: { commandes: Commande[]; type: 'honoraires' | 'travaux' | 'divers'; label: string }) {
  const filtered = commandes.filter((c) => c.type === type);
  if (filtered.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{label}</h4>
      <div className="overflow-x-auto">
        <table className="rom-table">
          <thead>
            <tr>
              <th>Société</th>
              <th>LOT / Mission</th>
              <th className="text-right">Montant HT</th>
              <th className="text-right">Valeur restante</th>
              <th style={{ width: 200 }}>% Avancement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td className="font-medium text-gray-900">{c.societe}</td>
                <td className="text-gray-500">{c.lot}</td>
                <td className="text-right font-medium">{formatMontantHT(c.montantHT)}</td>
                <td className="text-right">
                  <span className={c.valeurHtRestante === 0 ? 'text-gray-400' : 'text-orange-600 font-medium'}>
                    {formatMontantHT(c.valeurHtRestante)}
                  </span>
                </td>
                <td>
                  <ProgressBar
                    value={c.pourcentageAvancement}
                    color={c.pourcentageAvancement === 100 ? 'green' : c.pourcentageAvancement === 0 ? 'gray' : 'blue'}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={2} className="px-4 py-2 text-sm text-gray-700">Sous-total {label}</td>
              <td className="px-4 py-2 text-right text-sm">
                {formatMontantHT(filtered.reduce((s, c) => s + c.montantHT, 0))}
              </td>
              <td className="px-4 py-2 text-right text-sm text-orange-600">
                {formatMontantHT(filtered.reduce((s, c) => s + c.valeurHtRestante, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function ProjetPage({ params }: PageProps) {
  const projet = getProjetById(params.id);
  if (!projet) notFound();

  const rapport = getDernierRapport(projet);
  if (!rapport) notFound();

  const pctFacturation = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100)
    : 0;

  const totalFacturesMois = rapport.facturesMois.reduce((s, f) => s + f.montantTTC, 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-rom-600 transition-colors">Tableau de bord</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/projets" className="hover:text-rom-600 transition-colors">Projets</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium">{projet.nom} — {projet.client}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{projet.nom}</h1>
          <p className="text-gray-500 mt-1 text-sm">{projet.client} · {projet.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Dernier rapport</p>
            <p className="text-sm font-bold text-rom-700">{rapport.mois}</p>
          </div>
          <CopyShareButton shareToken={projet.shareToken} projetNom={projet.nom} />
          <a href={`/partage/${projet.shareToken}`} target="_blank" rel="noopener noreferrer"
            title="Ouvrir la vue partagée"
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rom-600 hover:border-rom-300 transition-colors">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Commandes HT" value={formatMontantHT(rapport.montantTotalCommandesHT)} sub={`TTC : ${formatMontantHT(rapport.montantTotalCommandesTTC)}`} icon={Euro} color="blue" />
        <StatCard label="Total Factures HT" value={formatMontantHT(rapport.montantTotalFacturesHT)} sub={`TTC : ${formatMontantHT(rapport.montantTotalFacturesTTC)}`} icon={FileText} color="orange" />
        <StatCard label="Avancement total" value={`${rapport.pourcentageAvancementTotal}%`} sub={`Ce mois : ${rapport.pourcentageAvancementMois}%`} icon={TrendingUp} color="green" />
        <StatCard label="Commandes" value={`${rapport.nombreCommandesActives} actives`} sub={`${rapport.nombreTotalCommandes} total · ${rapport.nombreTotalAvenants} avenants`} icon={Hash} color="purple" />
      </div>

      {/* Récapitulatif + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Récapitulatif dépenses */}
        <div className="rom-card overflow-hidden">
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
                    <span className="text-gray-600">Ce mois ({rapport.mois})</span>
                    <span className="font-bold">{rapport.pourcentageAvancementMois}%</span>
                  </div>
                  <ProgressBar value={rapport.pourcentageAvancementMois} size="md" />
                </div>
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
          <div className="rom-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Évolution — Total Commandes HT et Factures HT
              </h2>
            </div>
            <div className="p-5">
              <EvolutionChart data={projet.historiqueChart} />
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

      {/* Bordereau du mois */}
      {rapport.facturesMois.length > 0 && (
        <div className="rom-card overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-rom-600 uppercase tracking-wider">
              Bordereau de paiement — {rapport.mois}
            </h2>
            <span className="text-sm font-bold text-rom-600">
              Total TTC : {formatMontantHT(totalFacturesMois)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Facture / Situation</th>
                  <th>Société</th>
                  <th>Date de validation</th>
                  <th className="text-right">Montant HT</th>
                  <th className="text-right">TVA</th>
                  <th className="text-right">Montant TTC</th>
                  <th className="text-right">% Commande</th>
                  <th className="text-right">% Avancement</th>
                </tr>
              </thead>
              <tbody>
                {rapport.facturesMois.map((f, i) => (
                  <tr key={i}>
                    <td className="font-medium">{f.factureOuSituation}</td>
                    <td>{f.societe}</td>
                    <td className="text-gray-500">{f.dateValidation}</td>
                    <td className="text-right">{formatMontantHT(f.montantHT)}</td>
                    <td className="text-right text-gray-500">{formatMontantHT(f.tva)}</td>
                    <td className="text-right font-bold text-rom-600">{formatMontantHT(f.montantTTC)}</td>
                    <td className="text-right">
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {f.pourcentageFactureSurCommande}%
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-xs font-bold text-gray-700">{f.pourcentageAvancementTotal}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rom-600 text-white font-bold">
                  <td colSpan={5} className="px-4 py-3 text-sm">TOTAL DU BORDEREAU</td>
                  <td className="px-4 py-3 text-right text-sm">{formatMontantHT(totalFacturesMois)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* % Avancement par société */}
      <div className="rom-card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Tableau récapitulatif des commandes — % d'avancement
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
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
      <div className="rom-card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Tableau récapitulatif des commandes (LOTs)
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <CommandesSection commandes={rapport.commandes} type="honoraires" label="Honoraires" />
          <CommandesSection commandes={rapport.commandes} type="travaux" label="Travaux" />
          <CommandesSection commandes={rapport.commandes} type="divers" label="Divers" />
        </div>
      </div>

      {/* Liste des factures */}
      <div className="rom-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Liste des factures validées
          </h2>
          <span className="text-xs text-gray-500">{rapport.factures.length} facture{rapport.factures.length > 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="rom-table">
            <thead>
              <tr>
                <th>Date facture</th>
                <th>N° Facture / Situation</th>
                <th>Société</th>
                <th>Date validation AMO</th>
                <th className="text-right">Montant HT</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-right">Retenue</th>
                <th className="text-right">% Commande</th>
                <th className="text-right">% Avancement</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rapport.factures.map((f, i) => (
                <tr key={i}>
                  <td className="text-gray-500 text-xs">{f.dateFacture}</td>
                  <td className="font-medium text-sm">{f.factureOuSituation}</td>
                  <td>{f.societe}</td>
                  <td className="text-gray-500 text-xs">{f.dateValidationAMO}</td>
                  <td className="text-right font-medium">{formatMontantHT(f.montantHT)}</td>
                  <td className="text-right font-bold text-rom-600">{formatMontantHT(f.montantTTC)}</td>
                  <td className="text-right text-xs">{f.retenueGarantie > 0 ? formatMontantHT(f.retenueGarantie) : '—'}</td>
                  <td className="text-right text-xs font-medium">{f.pourcentageFactureSurCommande}%</td>
                  <td className="text-right">
                    <span className={`text-xs font-bold ${f.pourcentageAvancementTotal === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {f.pourcentageAvancementTotal}%
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle className="w-3 h-3" /> Validée
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
