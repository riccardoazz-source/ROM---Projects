import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase
    .from('projets')
    .select('id, data');

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  const rows = (data ?? []).map(r => {
    const rapports: any[] = r.data?.rapports ?? [];
    const dernierRapport = rapports.length > 0
      ? rapports.reduce((a: any, b: any) => b.date > a.date ? b : a)
      : null;
    return {
      id: r.id,
      nom: r.data?.nom ?? 'NULL',
      client: r.data?.client ?? 'NULL',
      rapportsCount: rapports.length,
      dernierMois: dernierRapport?.mois ?? 'aucun',
      nbCommandes: dernierRapport?.commandes?.length ?? 0,
      nbFactures: dernierRapport?.factures?.length ?? 0,
      nbFacturesMois: dernierRapport?.facturesMois?.length ?? 0,
    };
  });
  return NextResponse.json({ total: rows.length, rows });
}
