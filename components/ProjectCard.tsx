import Link from 'next/link';
import { Projet } from '@/types';
import { getDernierRapport, formatMontantHT } from '@/lib/data';
import ProgressBar from './ProgressBar';
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
    <Link href={`/projet/${projet.id}`} className="block">
      <div className="rom-card p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 group-hover:text-rom-600 transition-colors">
              {projet.nom}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{projet.client}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-rom-500 transition-colors mt-1" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Commandes HT</p>
            <p className="text-sm font-bold text-gray-900">{formatMontantHT(rapport.montantTotalCommandesHT)}</p>
            <p className="text-xs text-gray-500">TTC: {formatMontantHT(rapport.montantTotalCommandesTTC)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-1">Factures HT</p>
            <p className="text-sm font-bold text-gray-900">{formatMontantHT(rapport.montantTotalFacturesHT)}</p>
            <p className="text-xs text-gray-500">TTC: {formatMontantHT(rapport.montantTotalFacturesTTC)}</p>
          </div>
        </div>

        {/* Avancement */}
        <div className="space-y-2 mb-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-600">Avancement global</span>
            </div>
            <ProgressBar value={pctAvance} color="blue" size="md" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-600">Facturation</span>
            </div>
            <ProgressBar value={pctFacture} color="orange" size="md" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Dernier rapport : {rapport.mois}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FileText className="w-3.5 h-3.5" />
            <span>{rapport.nombreTotalFactures} factures</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
