import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Test 1: plain select (what getAllProjets does now)
  const { data: plain, error: err1 } = await supabase
    .from('projets')
    .select('data');

  // Test 2: select with old broken order (what the OLD code did)
  const { data: ordered, error: err2 } = await supabase
    .from('projets')
    .select('data')
    .order('data->nom' as any);

  return NextResponse.json({
    plain: {
      error: err1?.message ?? null,
      count: plain?.length ?? 0,
      noms: (plain ?? []).map(r => r.data?.nom ?? 'NULL'),
    },
    ordered: {
      error: err2?.message ?? null,
      count: ordered?.length ?? 0,
      noms: (ordered ?? []).map(r => r.data?.nom ?? 'NULL'),
    },
  });
}
