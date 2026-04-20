import { notFound } from 'next/navigation';
import { getProjetById, getDernierRapport } from '@/lib/data';
import CopyShareButton from '@/components/CopyShareButton';
import ProjetPageContent from '@/components/ProjetPageContent';
import { prepareChartData, checkBudget } from '@/lib/projetUtils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function ProjetPage({ params }: PageProps) {
  const projet = await getProjetById(params.id);
  if (!projet) notFound();

  const rapport = getDernierRapport(projet);
  if (!rapport) notFound();

  const chartData = prepareChartData(projet, rapport);
  const { budgetExists, budgetValid } = checkBudget(rapport);

  const pctFacturation = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100)
    : 0;

  const navSections = [
    { id: 'bordereau', label: 'Bordereau' },
    { id: 'recap', label: 'Récapitulatif' },
    { id: 'evolution', label: 'Évolution' },
    ...(budgetExists ? [{ id: 'budget', label: 'Budget' }] : []),
    { id: 'avancement', label: 'Avancement' },
    { id: 'commandes', label: 'Commandes' },
    { id: 'factures', label: 'Factures' },
  ];

  return (
    <div className="w-full min-w-0">
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
          <CopyShareButton shareToken={projet.shareToken} projetNom={projet.nom} />
        </div>
      </div>

      <ProjetPageContent
        rapport={rapport}
        chartData={chartData}
        budgetExists={budgetExists}
        budgetValid={budgetValid}
        navSections={navSections}
        pctFacturation={pctFacturation}
        mode="admin"
      />
    </div>
  );
}
