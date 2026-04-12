import { getAllProjets, getDernierRapport } from '@/lib/data';
import CommandesClient, { CommandeResult } from './CommandesClient';

export const dynamic = 'force-dynamic';

export default async function CommandesPage() {
  const projets = await getAllProjets();
  const commandes: CommandeResult[] = [];

  for (const projet of projets) {
    const rapport = getDernierRapport(projet);
    if (!rapport) continue;
    for (const commande of rapport.commandes) {
      commandes.push({ ...commande, projetId: projet.id, projetNom: projet.nom, client: projet.client });
    }
  }

  return <CommandesClient commandes={commandes} />;
}
