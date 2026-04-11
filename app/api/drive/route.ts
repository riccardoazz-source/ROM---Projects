import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/data';

export const dynamic = 'force-dynamic';

const BASE = 'https://www.googleapis.com/drive/v3/files';

async function driveGet(q: string, fields: string, apiKey: string) {
  const url = `${BASE}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 300) } }; }
  if (!res.ok) return { ok: false as const, status: res.status, message: json.error?.message || 'unknown' };
  return { ok: true as const, files: (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime: string; parents?: string[] }> };
}

export async function GET() {
  try {
    const config = await getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    if (!rootId) return NextResponse.json({ success: false, message: "Aucun dossier Google Drive configuré." });
    if (!apiKey)  return NextResponse.json({ success: false, message: "Clé API Google Drive non configurée." });

    // Step 1 — list everything in root folder
    const rootResult = await driveGet(
      `'${rootId}' in parents and trashed=false`,
      'files(id,name,mimeType)',
      apiKey,
    );

    if (!rootResult.ok) {
      return NextResponse.json({ success: false, message: `Erreur API (${rootResult.status}): ${rootResult.message}` });
    }

    const folders = rootResult.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

    if (folders.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé." });
    }

    // Step 2 — query each subfolder individually (avoids 403 on bulk OR queries)
    const latestByFolder: Array<{ folderName: string; fileName: string; modifiedTime: string }> = [];
    const errors: string[] = [];
    let totalPdfs = 0;

    await Promise.all(folders.map(async (folder) => {
      const res = await driveGet(
        `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
        'files(id,name,modifiedTime)',
        apiKey,
      );

      if (!res.ok) {
        errors.push(`${folder.name}: ${res.status} ${res.message}`);
        return;
      }

      const pdfs = res.files;
      totalPdfs += pdfs.length;

      if (pdfs.length > 0) {
        // Pick the most recent PDF by modifiedTime
        const latest = pdfs.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);
        latestByFolder.push({ folderName: folder.name, fileName: latest.name, modifiedTime: latest.modifiedTime });
      }
    }));

    try { await saveConfig({ ...config, lastSync: new Date().toISOString() }); } catch { /* noop */ }

    const errMsg = errors.length > 0 ? ` (${errors.length} dossier(s) inaccessible(s))` : '';

    return NextResponse.json({
      success: true,
      message: `${latestByFolder.length} rapport(s) récent(s) sur ${folders.length} dossier(s), ${totalPdfs} PDF au total${errMsg}`,
      files: latestByFolder.map(f => `[${f.folderName}] ${f.fileName}`),
      folders: folders.map(f => f.name),
      errors: errors.length > 0 ? errors : undefined,
      totalFiles: totalPdfs,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: `Erreur: ${msg}` });
  }
}
