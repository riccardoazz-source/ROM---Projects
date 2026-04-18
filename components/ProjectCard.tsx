import Link from 'next/link';
import { Projet } from '@/types';
import { getDernierRapport, formatMontantHT } from '@/lib/data';
import ProgressBar from './ProgressBar';
import CopyShareButton from './CopyShareButton';
import { ArrowUpRight, CalendarDays, Receipt } from 'lucide-react';

export default function ProjectCard({ projet }: { projet: Projet }) {
  const rapport = getDernierRapport(projet);
  if (!rapport) return null;

  const pctAvance   = rapport.pourcentageAvancementTotal;
  const pctFacture  = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100) : 0;

  return (
    <div className="card-hover group overflow-hidden">
      {/* Color strip */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #1C3D54, #2589A8)' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <Link href={`/projet/${projet.id}`}>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-rom-700 transition-colors truncate leading-tight">
                {projet.nom}
              </h3>
            </Link>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{projet.client}</p>
          </div>
          <Link href={`/projet/${projet.id}`}
            className="ml-3 p-1.5 rounded-lg text-slate-300 group-hover:text-rom-500 group-hover:bg-blue-50 transition-all">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Financial stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commandes HT</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">{formatMontantHT(rapport.montantTotalCommandesHT)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">TTC {formatMontantHT(rapport.montantTotalCommandesTTC)}</p>
          </div>
          <div className="bg-orange-50/60 rounded-xl p-3 border border-orange-100/80">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Factures HT</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">{formatMontantHT(rapport.montantTotalFacturesHT)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">TTC {formatMontantHT(rapport.montantTotalFacturesTTC)}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2.5 mb-4">
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium">Avancement global</span>
            </div>
            <ProgressBar value={pctAvance} size="md" color="blue" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium">Taux de facturation</span>
            </div>
            <ProgressBar value={pctFacture} size="md" color="orange" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />{rapport.mois}
            </span>
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />{rapport.nombreTotalFactures} factures
            </span>
          </div>
          <CopyShareButton projetId={projet.id} projetNom={projet.nom} />
        </div>
      </div>
    </div>
  );
}
