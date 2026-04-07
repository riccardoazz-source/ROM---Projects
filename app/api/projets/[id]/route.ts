import { NextResponse } from 'next/server';
import { getProjetById } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const projet = getProjetById(params.id);
    if (!projet) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    return NextResponse.json(projet);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
