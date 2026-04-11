import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read existing JSON files
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    const projetsPath = path.join(process.cwd(), 'data', 'projets.json');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projetsData = JSON.parse(fs.readFileSync(projetsPath, 'utf-8'));

    const results: string[] = [];

    // Migrate config
    const { error: ce } = await supabase
      .from('config')
      .upsert({ key: 'app', value: config });
    results.push(ce ? `Config: ERROR ${ce.message}` : 'Config: OK');

    // Migrate projects
    for (const p of projetsData.projets) {
      const { error: pe } = await supabase
        .from('projets')
        .upsert({ id: p.id, data: p });
      results.push(pe ? `${p.id}: ERROR ${pe.message}` : `${p.id}: OK`);
    }

    // Verify
    const { data: allP } = await supabase.from('projets').select('id');
    const { data: cfg } = await supabase.from('config').select('key');

    return NextResponse.json({
      success: true,
      results,
      totalProjets: allP?.length ?? 0,
      totalConfig: cfg?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
