import { getAllProjets, getDernierRapport, formatMontantHT } from '@/lib/data';
import DashboardTable, { DashboardRow } from '@/components/DashboardTable';
import ProjectCard from '@/components/ProjectCard';
import StatCard from '@/components/StatCard';
import { Euro, TrendingUp, FolderKanban, Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const projets = await getAllProjets();

  let totalCommandesHT = 0, totalFacturesHT = 0;
  let totalCommandesTTC = 0, totalFacturesTTC = 0;
  let totalFactures = 0, totalCommandes = 0, sumAvance = 0, n = 0;

  const rows: DashboardRow[] = [];

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
    const dateStr = r.date && r.date.length === 8
      ? `${r.date.slice(6,8)}/${r.date.slice(4,6)}/${r.date.slice(0,4)}`
      : r.mois;
    rows.push({
      id: p.id,
      nom: p.nom,
      client: p.client,
      mois: dateStr,
      commandesHT: r.montantTotalCommandesHT,
      facturesHT: r.montantTotalFacturesHT,
      commandes: r.nombreTotalCommandes,
      factures: r.nombreTotalFactures,
      avancement: r.pourcentageAvancementTotal,
    });
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

      <DashboardTable rows={rows} />

      <div>
        <p className="section-title">Projets</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {projets.map((p) => <ProjectCard key={p.id} projet={p} />)}
        </div>
      </div>
    </div>
  );
}
