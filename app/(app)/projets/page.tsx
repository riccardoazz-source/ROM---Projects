import { getAllProjets } from '@/lib/data';
import ProjectCard from '@/components/ProjectCard';

export const dynamic = 'force-dynamic';

export default function ProjetsPage() {
  const projets = getAllProjets();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
        <p className="text-gray-500 mt-1 text-sm">{projets.length} projet{projets.length > 1 ? 's' : ''} en suivi</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {projets.map((projet) => (
          <ProjectCard key={projet.id} projet={projet} />
        ))}
      </div>
    </div>
  );
}
