import { NextResponse } from 'next/server';
import { getAllProjets, getDernierRapport } from '@/lib/data';
import { Commande } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projets = getAllProjets();
    const all: Array<Commande & { projetId: string; projetNom: string; client: string }> = [];

    for (const projet of projets) {
      const rapport = getDernierRapport(projet);
      if (!rapport) continue;
      for (const commande of rapport.commandes) {
        all.push({
          ...commande,
          projetId: projet.id,
          projetNom: projet.nom,
          client: projet.client,
        });
      }
    }
    return NextResponse.json(all);
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
