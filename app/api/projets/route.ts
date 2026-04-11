import { NextResponse } from 'next/server';
import { getAllProjets } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projets = await getAllProjets();
    return NextResponse.json(projets);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des projets' }, { status: 500 });
  }
}
