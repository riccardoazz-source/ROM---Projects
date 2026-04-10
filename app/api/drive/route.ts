import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/data';

export const dynamic = 'force-dynamic';

const BASE = 'https://www.googleapis.com/drive/v3/files';
const COMMON = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

async function driveGet(q: string, fields: string, apiKey: string) {
  const url = `${BASE}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=200&${COMMON}`;
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 300) } }; }
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${json.error?.message || 'unknown'}`);
  return (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime: string; parents?: string[] }>;
}

export async function GET() {
  try {
    const config = getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    if (!rootId) return NextResponse.json({ success: false, message: "Aucun dossier Google Drive configuré." });
    if (!apiKey)  return NextResponse.json({ success: false, message: "Clé API Google Drive non configurée." });

    // Step 1 — list subfolders in root
    const folders = await driveGet(
      `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      'files(id,name)',
      apiKey,
    );

    if (folders.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé dans le dossier racine." });
    }

    // Step 2 — fetch all PDFs in all subfolders in one query (OR across folder IDs)
    const parentClause = folders.map(f => `'${f.id}' in parents`).join(' or ');
    const allPdfs = await driveGet(
      `(${parentClause}) and mimeType='application/pdf' and trashed=false`,
      'files(id,name,modifiedTime,parents)',
      apiKey,
    );

    // Step 3 — keep only the most recent PDF per subfolder
    const latestByFolder = new Map<string, { folderName: string; fileName: string; modifiedTime: string }>();
    const folderById = new Map(folders.map(f => [f.id, f.name]));

    for (const pdf of allPdfs) {
      const parentId = pdf.parents?.[0] ?? '';
      const folderName = folderById.get(parentId) ?? parentId;
      const existing = latestByFolder.get(parentId);
      if (!existing || pdf.modifiedTime > existing.modifiedTime) {
        latestByFolder.set(parentId, { folderName, fileName: pdf.name, modifiedTime: pdf.modifiedTime });
      }
    }

    const latest = Array.from(latestByFolder.values());

    try { saveConfig({ ...config, lastSync: new Date().toISOString() }); } catch { /* read-only FS on Vercel */ }

    return NextResponse.json({
      success: true,
      message: `${latest.length} rapport(s) le plus récent par projet (sur ${folders.length} dossiers, ${allPdfs.length} PDF au total)`,
      files: latest.map(f => `[${f.folderName}] ${f.fileName}`),
      folders: folders.map(f => f.name),
      totalFiles: allPdfs.length,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: `Erreur: ${msg}` });
  }
}
