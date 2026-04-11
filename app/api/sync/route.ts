import { NextResponse } from 'next/server';
import { getConfig, saveConfig, createOrGetProjet, addOrUpdateRapport } from '@/lib/data';
import { RapportMensuel } from '@/types';

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

function parseMontant(text: string): number {
  const cleaned = text.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function extractValue(lines: string[], keyword: string): string {
  const idx = lines.findIndex((l) => l.toLowerCase().includes(keyword.toLowerCase()));
  if (idx === -1) return '';
  const line = lines[idx];
  const match = line.match(/[\d\s]+[,.][\d]+/);
  if (match) return match[0];
  if (idx + 1 < lines.length) {
    const nextMatch = lines[idx + 1].match(/[\d\s]+[,.][\d]+/);
    if (nextMatch) return nextMatch[0];
  }
  return '';
}

function extractNumber(lines: string[], keyword: string): number {
  const idx = lines.findIndex((l) => l.toLowerCase().includes(keyword.toLowerCase()));
  if (idx === -1) return 0;
  const line = lines[idx];
  const match = line.match(/\b(\d+)\b/g);
  if (match) return parseInt(match[match.length - 1], 10);
  return 0;
}

function extractMois(filename: string): string {
  const dateMatch = filename.match(/(\d{8})/);
  if (dateMatch) {
    const d = dateMatch[1];
    const year = d.substring(0, 4);
    const month = parseInt(d.substring(4, 6), 10);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    if (month >= 1 && month <= 12) return `${months[month - 1]} ${year}`;
  }
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function extractDate(filename: string): string {
  const m = filename.match(/(\d{8})/);
  return m ? m[1] : new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function parseFolder(folderName: string): { nom: string; client: string; id: string } {
  const parts = folderName.split(/\s*-\s*/);
  const nom = parts[0]?.trim() || folderName;
  const client = parts.slice(1).join(' - ').trim() || 'Client inconnu';
  const id = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { nom, client, id };
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
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé dans le dossier Drive." });
    }

    // Step 2 — get latest PDF ID per folder
    const toProcess: Array<{ folderName: string; fileId: string; fileName: string }> = [];

    await Promise.all(folders.map(async (folder) => {
      const res = await driveGet(
        `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
        'files(id,name,modifiedTime)',
        apiKey,
      );
      if (!res.ok || res.files.length === 0) return;
      const latest = res.files.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);
      toProcess.push({ folderName: folder.name, fileId: latest.id, fileName: latest.name });
    }));

    if (toProcess.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun PDF trouvé dans les sous-dossiers." });
    }

    // Step 3 — download, parse and save each PDF sequentially
    const results: string[] = [];

    for (const item of toProcess) {
      try {
        // Download the PDF
        const downloadUrl = `${BASE}/${item.fileId}?alt=media&key=${apiKey}`;
        const pdfRes = await fetch(downloadUrl);
        if (!pdfRes.ok) {
          results.push(`[${item.folderName}] Erreur téléchargement (${pdfRes.status})`);
          continue;
        }
        const buffer = Buffer.from(await pdfRes.arrayBuffer());

        // Parse text
        let extractedText = '';
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text;
        } catch {
          // continue with empty text — dates still extracted from filename
        }

        const lines = extractedText.split('\n').map((l) => l.trim()).filter(Boolean);
        const mois = extractMois(item.fileName);
        const date = extractDate(item.fileName);
        const { nom, client, id: projetId } = parseFolder(item.folderName);

        const rapport: RapportMensuel = {
          date,
          mois,
          nombreTotalCommandes:    extractNumber(lines, 'nombre total de commandes'),
          nombreTotalAvenants:     extractNumber(lines, "nombre total d'avenants"),
          nombreCommandesActives:  extractNumber(lines, 'nombre de commandes actives'),
          nombreTotalFactures:     extractNumber(lines, 'nombre total factures'),
          montantTotalCommandesHT: parseMontant(extractValue(lines, 'montant total commandes (ht)')) || parseMontant(extractValue(lines, 'montant total commandes')),
          montantTotalFacturesHT:  parseMontant(extractValue(lines, 'montant total factures (ht)'))  || parseMontant(extractValue(lines, 'montant total factures')),
          totalCommandesHonorairesHT: parseMontant(extractValue(lines, 'total commandes honoraires')),
          totalCommandesTravauxHT:    parseMontant(extractValue(lines, 'total commandes travaux')),
          totalCommandesDiversHT:     parseMontant(extractValue(lines, 'total commandes divers')),
          totalTVACommandes:          parseMontant(extractValue(lines, 'total tva commandes')),
          totalTVAFactures:           parseMontant(extractValue(lines, 'total tva factures')),
          nombreFacturesAvecRetenue:  0,
          montantTotalRetenueGarantieHT: 0,
          montantTotalCommandesTTC: parseMontant(extractValue(lines, 'montant total commandes (ttc)')),
          montantTotalFacturesTTC:  parseMontant(extractValue(lines, 'montant total factures (ttc)')),
          pourcentageAvancementMois:  0,
          pourcentageAvancementTotal: 0,
          commandes:    [],
          factures:     [],
          facturesMois: [],
        };

        await createOrGetProjet(projetId, nom, client);
        await addOrUpdateRapport(projetId, rapport);
        results.push(`[${item.folderName}] OK — ${mois}`);
      } catch (e) {
        results.push(`[${item.folderName}] Erreur: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await saveConfig({ ...config, lastSync: new Date().toISOString() });

    const okCount = results.filter(r => r.includes('] OK')).length;

    return NextResponse.json({
      success: true,
      message: `${okCount}/${toProcess.length} projets synchronisés depuis Google Drive`,
      results,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, message: `Erreur: ${msg}` });
  }
}
