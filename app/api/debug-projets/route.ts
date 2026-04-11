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

  return NextResponse.json({
    total: data?.length ?? 0,
    rows: (data ?? []).map(r => ({
      id: r.id,
      dataIsNull: r.data === null,
      nom: r.data?.nom ?? 'NULL',
      client: r.data?.client ?? 'NULL',
      rapportsCount: r.data?.rapports?.length ?? 'NULL',
    })),
  });
}
