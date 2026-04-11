import { getAllProjets, getDernierRapport, formatMontantHT } from '@/lib/data';
import ProjectCard from '@/components/ProjectCard';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import { Euro, TrendingUp, FolderKanban, Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const projets = await getAllProjets();

  let totalCommandesHT = 0, totalFacturesHT = 0;
  let totalCommandesTTC = 0, totalFacturesTTC = 0;
  let totalFactures = 0, totalCommandes = 0, sumAvance = 0, n = 0;

  for (const p of projets) {
    const r = getDernierRapport(p);
    if (!r) continue;
    n++;
    totalCommandesHT  += r.montantTotalCommandesHT;
    totalFacturesHT   += r.montantTotalFacturesHT;
    totalCommandesTTC += r.montantTotalCommandesTTC;
    totalFacturesTTC  += r.montantTotalFacturesTTC;
    totalFactures     += r.nombreTotalFactures;
    totalCommandes    += r.nombreTotalCommandes;
    sumAvance         += r.pourcentageAvancementTotal;
  }

  const avgAvance  = n > 0 ? Math.round(sumAvance / n) : 0;
  const pctFacture = totalCommandesHT > 0 ? Math.round((totalFacturesHT / totalCommandesHT) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
        <p className="text-slate-500 mt-1 text-sm">{projets.length} projets en suivi · données à jour</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Commandes HT"  value={formatMontantHT(totalCommandesHT)}  sub={`TTC : ${formatMontantHT(totalCommandesTTC)}`}             icon={Euro}         />
        <StatCard label="Total Factures HT"   value={formatMontantHT(totalFacturesHT)}   sub={`TTC : ${formatMontantHT(totalFacturesTTC)}`}             icon={Receipt}      accent="bg-orange-500"  />
        <StatCard label="Avancement moyen"    value={`${avgAvance}%`}                    sub={`Facturation : ${pctFacture}%`}                           icon={TrendingUp}   accent="bg-emerald-600" />
        <StatCard label="Projets suivis"      value={`${projets.length}`}                sub={`${totalCommandes} commandes · ${totalFactures} factures`} icon={FolderKanban} accent="bg-violet-600"  />
      </div>

      <div className="card overflow-hidden">
        <div className="section-header">Récapitulatif financier — tous projets</div>
        <div className="overflow-x-auto">
          <table className="rom-table">
            <thead>
              <tr>
                <th>Projet</th><th>Client</th><th>Dernier rapport</th>
                <th className="text-right">Commandes HT</th>
                <th className="text-right">Factures HT</th>
                <th className="text-right">Cmd.</th>
                <th className="text-right">Fact.</th>
                <th style={{ width: 150 }}>Avancement</th>
              </tr>
            </thead>
            <tbody>
              {projets.map((p) => {
                const r = getDernierRapport(p);
                if (!r) return null;
                return (
                  <tr key={p.id}>
                    <td><a href={`/projet/${p.id}`} className="font-bold text-rom-700 hover:underline">{p.nom}</a></td>
                    <td className="text-slate-500 font-medium">{p.client}</td>
                    <td className="text-slate-400">{r.mois}</td>
                    <td className="text-right font-semibold tabular-nums">{formatMontantHT(r.montantTotalCommandesHT)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatMontantHT(r.montantTotalFacturesHT)}</td>
                    <td className="text-right text-slate-500">{r.nombreTotalCommandes}</td>
                    <td className="text-right text-slate-500">{r.nombreTotalFactures}</td>
                    <td><ProgressBar value={r.pourcentageAvancementTotal} size="sm" showLabel /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>TOTAL CONSOLIDÉ</td>
                <td className="text-right tabular-nums">{formatMontantHT(totalCommandesHT)}</td>
                <td className="text-right tabular-nums">{formatMontantHT(totalFacturesHT)}</td>
                <td className="text-right">{totalCommandes}</td>
                <td className="text-right">{totalFactures}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <p className="section-title">Projets</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {projets.map((p) => <ProjectCard key={p.id} projet={p} />)}
        </div>
      </div>
    </div>
  );
}
