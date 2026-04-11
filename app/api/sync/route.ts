import { NextResponse } from 'next/server';
import { getConfig, saveConfig, createOrGetProjet, getProjetById } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://www.googleapis.com/drive/v3/files';

async function driveGet(q: string, fields: string, apiKey: string) {
  const url = `${BASE}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 300) } }; }
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

function extractLatestPdf(files: Array<{ id: string; name: string; modifiedTime: string }>): { id: string; name: string } | null {
  if (!files.length) return null;
  return files.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);
}

export async function GET() {
  try {
    const config = await getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    if (!rootId) return NextResponse.json({ success: false, message: "Aucun dossier Google Drive configuré." });
    if (!apiKey) return NextResponse.json({ success: false, message: "Clé API Google Drive non configurée." });

    // Step 1 — list subfolders
    const rootResult = await driveGet(
      `'${rootId}' in parents and trashed=false`,
      'files(id,name,mimeType)',
      apiKey,
    );
    if (!rootResult.ok) {
      return NextResponse.json({ success: false, message: `Erreur Drive (${rootResult.status}): ${rootResult.message}` });
    }

    const folders = rootResult.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    if (folders.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé." });
    }

    // Step 2 — for each folder: get PDF list + create/update project in parallel
    const results = await Promise.allSettled(
      folders.map(async (folder) => {
        const { nom, client, id: projetId } = parseFolder(folder.name);

        // Get PDF list for this folder
        const pdfRes = await driveGet(
          `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
          'files(id,name,modifiedTime)',
          apiKey,
        );

        const latestPdf = pdfRes.ok ? extractLatestPdf(pdfRes.files) : null;
        const pdfName = latestPdf?.name ?? null;

        // Check if project already exists
        const existing = await getProjetById(projetId);
        let action: string;

        if (existing) {
          action = 'existant';
        } else {
          await createOrGetProjet(projetId, nom, client);
          action = 'créé';
        }

        return {
          folder: folder.name,
          projetId,
          nom,
          client,
          action,
          latestPdf: pdfName,
        };
      })
    );

    const summary = results.map((r) => {
      if (r.status === 'fulfilled') {
        const v = r.value;
        return `[${v.folder}] ${v.action === 'créé' ? 'CRÉÉ' : 'OK'} — PDF: ${v.latestPdf ?? 'aucun'}`;
      } else {
        return `Erreur: ${r.reason}`;
      }
    });

    const created = results.filter(r => r.status === 'fulfilled' && (r as any).value.action === 'créé').length;
    const existing = results.filter(r => r.status === 'fulfilled' && (r as any).value.action === 'existant').length;

    // Collect files info for the UI
    const filesInfo = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value)
      .filter(v => v.latestPdf)
      .map(v => `[${v.folder}] ${v.latestPdf}`);

    await saveConfig({ ...config, lastSync: new Date().toISOString() });

    return NextResponse.json({
      success: true,
      message: `${folders.length} dossiers traités — ${created} projet(s) créé(s), ${existing} existant(s)`,
      results: summary,
      files: filesInfo,
      created,
      total: folders.length,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: `Erreur: ${msg}` });
  }
}
