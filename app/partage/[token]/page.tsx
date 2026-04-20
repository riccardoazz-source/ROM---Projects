import { notFound } from 'next/navigation';
import { getProjetByToken, getDernierRapport } from '@/lib/data';
import { prepareChartData, checkBudget } from '@/lib/projetUtils';
import ProjetPageContent from '@/components/ProjetPageContent';

export const dynamic = 'force-dynamic';

interface PageProps { params: { token: string } }

function RomLogo() {
  return (
    <svg width="80" height="24" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    <div className="min-h-screen bg-slate-50">
      {/* Public header — no sidebar, no admin actions. h-14 = 3.5rem = 49px → nav sticky top-14 */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <RomLogo />
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Vue partagée</p>
              <p className="text-xs font-bold text-gray-600">{rapport.mois}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-rom-800 truncate">{projet.nom}</p>
              <p className="text-xs text-gray-500">{projet.client}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <ProjetPageContent
          rapport={rapport}
          chartData={chartData}
          budgetExists={budgetExists}
          budgetValid={budgetValid}
          navSections={navSections}
          pctFacturation={pctFacturation}
          mode="share"
          navStickyTop="top-14"
        />
      </div>

      <div className="text-center py-6 text-xs text-gray-400">
        Vue partagée en lecture seule · <span className="font-semibold text-rom-700">ROM — Roux Oeuvre Maitrise</span>
      </div>
    </div>
  );
}
