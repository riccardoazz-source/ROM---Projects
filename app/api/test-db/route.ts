import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-db
 * Performs a write-then-read cycle on Supabase to verify persistence works.
 * Writes a temporary test record, reads it back, then deletes it.
 */
export async function GET() {
  const testId = `__test_${Date.now()}`;
  const steps: string[] = [];

  try {
    // 1. Ping
    const { error: pingErr } = await supabase.from('projets').select('id').limit(1);
    if (pingErr) {
      return NextResponse.json({ ok: false, step: 'ping', error: pingErr.message });
    }
    steps.push('ping: OK');

    // 2. Write
    const { error: writeErr } = await supabase.from('projets').upsert({
      id: testId,
      data: { id: testId, nom: 'TEST', client: 'test', rapports: [], historiqueChart: [] },
    });
    if (writeErr) {
      return NextResponse.json({ ok: false, step: 'write', error: writeErr.message, steps });
    }
    steps.push('write: OK');

    // 3. Read back
    const { data: readData, error: readErr } = await supabase
      .from('projets')
      .select('id, data')
      .eq('id', testId)
      .single();
    if (readErr || !readData) {
      return NextResponse.json({ ok: false, step: 'read', error: readErr?.message ?? 'not found', steps });
    }
    steps.push(`read: OK — found id=${readData.id}`);

    // 4. Delete
    const { error: delErr } = await supabase.from('projets').delete().eq('id', testId);
    if (delErr) {
      steps.push(`delete: WARN — ${delErr.message}`);
    } else {
      steps.push('delete: OK');
    }

    // 5. Count all real projects
    const { data: allData, error: allErr } = await supabase.from('projets').select('id, data');
    const realProjects = (allData ?? []).filter(r => !r.id.startsWith('__test_'));
    const summary = realProjects.map(r => ({
      id: r.id,
      nom: r.data?.nom ?? '?',
      nbRapports: r.data?.rapports?.length ?? 0,
      dernierNbCommandes: (() => {
        const rapports: any[] = r.data?.rapports ?? [];
        if (!rapports.length) return 0;
        const last = rapports.reduce((a: any, b: any) => b.date > a.date ? b : a);
        return last.commandes?.length ?? 0;
      })(),
      dernierNbFactures: (() => {
        const rapports: any[] = r.data?.rapports ?? [];
        if (!rapports.length) return 0;
        const last = rapports.reduce((a: any, b: any) => b.date > a.date ? b : a);
        return last.factures?.length ?? 0;
      })(),
    }));

    return NextResponse.json({
      ok: true,
      steps,
      totalProjects: realProjects.length,
      projects: summary,
      allErr: allErr?.message ?? null,
    });

  } catch (e) {
    return NextResponse.json({ ok: false, step: 'exception', error: String(e), steps });
  }
}
