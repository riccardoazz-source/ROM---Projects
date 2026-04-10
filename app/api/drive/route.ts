import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getConfig();
    const folderId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    if (!folderId) {
      return NextResponse.json({
        success: false,
        message: "Aucun dossier Google Drive configuré. Ajoutez l'URL dans les Paramètres.",
      });
    }

    if (!apiKey) {
      // Return folder link without API call
      return NextResponse.json({
        success: false,
        message: "Clé API Google Drive non configurée. Ajoutez-la dans les Paramètres pour lister automatiquement les fichiers.",
        folderUrl: config.googleDriveFolderUrl,
        folderId,
      });
    }

    // Call Google Drive API v3 (supportsAllDrives for Shared Drives)
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,size,parents)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=100&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const res = await fetch(url);

    // Capture raw text first for better error reporting
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: { message: text.slice(0, 200) } }; }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        message: `Erreur Google Drive API (${res.status}): ${data.error?.message || 'Erreur inconnue'}`,
      });
    }

    const files = (data.files || []) as Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime: string;
      size?: string;
      parents?: string[];
    }>;

    // Group by folder (project)
    const pdfFiles = files.filter(f =>
      f.mimeType === 'application/pdf' ||
      f.mimeType === 'application/vnd.google-apps.folder'
    );

    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const pdfs = files.filter(f => f.mimeType === 'application/pdf');

    // Update lastSync
    saveConfig({ ...config, lastSync: new Date().toISOString() });

    return NextResponse.json({
      success: true,
      message: `${pdfs.length} fichier(s) PDF trouvé(s) dans ${folders.length} sous-dossier(s)`,
      files: pdfs.map(f => f.name),
      folders: folders.map(f => f.name),
      rawFiles: pdfFiles,
      totalFiles: files.length,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la connexion à Google Drive.',
    });
  }
}
