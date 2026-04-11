import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/data';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://www.googleapis.com/drive/v3/files';

async function driveGet(q: string, fields: string, apiKey: string) {
  const url = `${BASE}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 200) } }; }
  if (!res.ok) return { ok: false as const, status: res.status, message: json.error?.message || 'unknown' };
  return { ok: true as const, files: (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime: string }> };
}

function parseFolder(folderName: string): { nom: string; client: string; id: string } {
  const parts = folderName.split(/\s*-\s*/);
  const nom = parts[0]?.trim() || folderName;
  const client = parts.slice(1).join(' - ').trim() || 'Client inconnu';
  const id = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { nom, client, id };
}

export async function GET() {
  const log: string[] = [];

  try {
    // ── Step 0: test direct Supabase write ────────────────────────────────
    const { error: pingErr } = await supabase
      .from('projets')
      .select('id')
      .limit(1);

    if (pingErr) {
      return NextResponse.json({
        success: false,
        message: `Supabase inaccessible: ${pingErr.message} (${pingErr.code})`,
        log,
      });
    }
    log.push('Supabase: connexion OK');

    // ── Step 1: load config ───────────────────────────────────────────────
    const config = await getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    log.push(`Config: rootId=${rootId || 'VIDE'}, apiKey=${apiKey ? 'OK' : 'VIDE'}`);

    if (!rootId) return NextResponse.json({ success: false, message: "Aucun dossier Drive configuré.", log });
    if (!apiKey) return NextResponse.json({ success: false, message: "Clé API Drive manquante.", log });

    // ── Step 2: list subfolders ───────────────────────────────────────────
    const rootResult = await driveGet(
      `'${rootId}' in parents and trashed=false`,
      'files(id,name,mimeType)',
      apiKey,
    );
    if (!rootResult.ok) {
      return NextResponse.json({ success: false, message: `Drive API error (${rootResult.status}): ${rootResult.message}`, log });
    }

    const folders = rootResult.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    log.push(`Drive: ${folders.length} dossier(s) trouvé(s)`);

    if (folders.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé.", log });
    }

    // ── Step 3: for each folder, upsert project directly ─────────────────
    let created = 0, existing = 0, errors = 0;

    for (const folder of folders) {
      const { nom, client, id } = parseFolder(folder.name);

      try {
        // Check if exists
        const { data: rows } = await supabase
          .from('projets')
          .select('id')
          .eq('id', id);

        if (rows && rows.length > 0) {
          existing++;
          log.push(`[${folder.name}] existant (id: ${id})`);
          continue;
        }

        // Create new project directly via supabase
        const newProjet = {
          id,
          shareToken: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          nom,
          client,
          statut: 'en_cours',
          rapports: [],
          historiqueChart: [],
        };

        const { error: insErr } = await supabase
          .from('projets')
          .upsert({ id, data: newProjet });

        if (insErr) {
          errors++;
          log.push(`[${folder.name}] ERREUR INSERT: ${insErr.message} (${insErr.code})`);
        } else {
          created++;
          log.push(`[${folder.name}] CRÉÉ (id: ${id})`);
        }
      } catch (e) {
        errors++;
        log.push(`[${folder.name}] EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── Step 4: update lastSync ───────────────────────────────────────────
    try {
      await saveConfig({ ...config, lastSync: new Date().toISOString() });
    } catch { /* non bloquant */ }

    return NextResponse.json({
      success: true,
      message: `${folders.length} dossiers — ${created} créé(s), ${existing} existant(s), ${errors} erreur(s)`,
      results: log,
      created,
      existing,
      errors,
    });

  } catch (e) {
    log.push(`EXCEPTION GLOBALE: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ success: false, message: String(e), log });
  }
}
