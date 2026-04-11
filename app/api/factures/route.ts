import { NextResponse } from 'next/server';
import { getAllFactures } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const factures = await getAllFactures();
    return NextResponse.json(factures);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des factures' }, { status: 500 });
  }
}
