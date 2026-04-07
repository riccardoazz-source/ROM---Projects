import Link from 'next/link';
import { Projet } from '@/types';
import { getDernierRapport, formatMontantHT } from '@/lib/data';
import ProgressBar from './ProgressBar';
import CopyShareButton from './CopyShareButton';
import { ArrowRight, Calendar, FileText } from 'lucide-react';

interface ProjectCardProps {
  projet: Projet;
}

export default function ProjectCard({ projet }: ProjectCardProps) {
  const rapport = getDernierRapport(projet);
  if (!rapport) return null;

  const pctAvance = rapport.pourcentageAvancementTotal;
  const pctFacture = rapport.montantTotalCommandesHT > 0
    ? Math.round((rapport.montantTotalFacturesHT / rapport.montantTotalCommandesHT) * 100)
    : 0;

  return (
    <div className="rom-card p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/projet/${projet.id}`} className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-rom-700 transition-colors truncate">
            {projet.nom}
          </h3>
          <p className="text-xs text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">{projet.client}</p>
        </Link>
        <Link href={`/projet/${projet.id}`} className="ml-2">
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-rom-500 transition-colors mt-1" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Commandes HT</p>
          <p className="text-sm font-bold text-gray-900">{formatMontantHT(rapport.montantTotalCommandesHT)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">TTC: {formatMontantHT(rapport.montantTotalCommandesTTC)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-1">Factures HT</p>
          <p className="text-sm font-bold text-gray-900">{formatMontantHT(rapport.montantTotalFacturesHT)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">TTC: {formatMontantHT(rapport.montantTotalFacturesTTC)}</p>
        </div>
      </div>

      {/* Avancement */}
      <div className="space-y-2.5 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 font-medium">Avancement global</span>
          </div>
          <ProgressBar value={pctAvance} color="blue" size="md" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 font-medium">Taux de facturation</span>
          </div>
          <ProgressBar value={pctFacture} color="orange" size="md" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{rapport.mois}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="w-3.5 h-3.5" />
            <span>{rapport.nombreTotalFactures} factures</span>
          </div>
        </div>
        <CopyShareButton shareToken={projet.shareToken} projetNom={projet.nom} />
      </div>
    </div>
  );
}
