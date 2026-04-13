/**
 * /api/import-drive  — download and parse every PDF from Google Drive.
 */
import { NextResponse } from 'next/server';
import { getConfig, saveConfig, getProjetById, saveProjet } from '@/lib/data';
import { parseRapportFromPdf, extractMoisFromFilename, extractDateFromFilename } from '@/lib/pdfParser';
import { supabase } from '@/lib/db';
import { RapportMensuel } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://www.googleapis.com/drive/v3/files';

async function driveGet(q: string, fields: string, apiKey: string) {
  const url = `${BASE}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 200) } }; }
  if (!res.ok) return { ok: false as const, status: res.status, message: json.error?.message || 'unknown' };
  return { ok: true as const, files: (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime: string }> };
}

async function downloadPdf(fileId: string, apiKey: string): Promise<Buffer | null> {
  const url = `${BASE}/${fileId}?alt=media&key=${apiKey}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

function folderId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function folderParts(name: string): { nom: string; client: string; id: string } {
  const parts = name.split(/\s*-\s*/);
  return {
    nom: parts[0]?.trim() || name,
    client: parts.slice(1).join(' - ').trim() || 'Client inconnu',
    id: folderId(name),
  };
}

async function processFolder(
  folder: { id: string; name: string },
  apiKey: string,
): Promise<{ ok: boolean; msg: string }> {
  const { nom, client, id } = folderParts(folder.name);

  // List PDFs
  const pdfsRes = await driveGet(
    `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
    'files(id,name,modifiedTime)',
    apiKey,
  );
  if (!pdfsRes.ok) return { ok: false, msg: `[${folder.name}] Erreur liste PDFs: ${pdfsRes.message}` };
  if (pdfsRes.files.length === 0) return { ok: false, msg: `[${folder.name}] Aucun PDF` };

  // Most-recent PDF
  const latest = pdfsRes.files.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);

  // Download
  const buffer = await downloadPdf(latest.id, apiKey);
  if (!buffer) return { ok: false, msg: `[${folder.name}] Téléchargement échoué: ${latest.name}` };

  // Parse PDF text
  let text = '';
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
  } catch (e) {
    return { ok: false, msg: `[${folder.name}] Erreur PDF: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Parse rapport
  const mois = extractMoisFromFilename(latest.name);
  const date = extractDateFromFilename(latest.name);
  const parsed = text ? parseRapportFromPdf(text, latest.name) : {};

  const rapport: RapportMensuel = {
    date,
    mois,
    nombreTotalCommandes:           parsed.nombreTotalCommandes           ?? 0,
    nombreTotalAvenants:             parsed.nombreTotalAvenants             ?? 0,
    nombreCommandesActives:          parsed.nombreCommandesActives          ?? 0,
    nombreTotalFactures:             parsed.nombreTotalFactures             ?? 0,
    montantTotalCommandesHT:         parsed.montantTotalCommandesHT         ?? 0,
    montantTotalFacturesHT:          parsed.montantTotalFacturesHT          ?? 0,
    totalCommandesHonorairesHT:      parsed.totalCommandesHonorairesHT      ?? 0,
    totalCommandesTravauxHT:         parsed.totalCommandesTravauxHT         ?? 0,
    totalCommandesDiversHT:          parsed.totalCommandesDiversHT          ?? 0,
    totalTVACommandes:               parsed.totalTVACommandes               ?? 0,
    totalTVAFactures:                parsed.totalTVAFactures                ?? 0,
    nombreFacturesAvecRetenue:       parsed.nombreFacturesAvecRetenue       ?? 0,
    montantTotalRetenueGarantieHT:   parsed.montantTotalRetenueGarantieHT   ?? 0,
    montantTotalCommandesTTC:        parsed.montantTotalCommandesTTC        ?? 0,
    montantTotalFacturesTTC:         parsed.montantTotalFacturesTTC         ?? 0,
    pourcentageAvancementMois:       parsed.pourcentageAvancementMois       ?? 0,
    pourcentageAvancementTotal:      parsed.pourcentageAvancementTotal      ?? 0,
    commandes:    parsed.commandes    ?? [],
    factures:     parsed.factures     ?? [],
    facturesMois: parsed.facturesMois ?? [],
    budget:       parsed.budget       ?? undefined,
  };

  // Save: replace the entire rapports array with ONLY this rapport
  const existing = await getProjetById(id);
  const label = rapport.mois.substring(0, 3).toUpperCase() + '/' + rapport.mois.slice(-2);
  const projet = existing ?? {
    id,
    shareToken: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    nom,
    client,
    statut: 'en_cours' as const,
    rapports: [],
    historiqueChart: [],
  };
  projet.rapports = [rapport];
  projet.historiqueChart = [{
    date: label,
    montantCommandesHT: rapport.montantTotalCommandesHT,
    montantFacturesHT:  rapport.montantTotalFacturesHT,
  }];
  await saveProjet(projet);

  return {
    ok: true,
    msg: `[${folder.name}] OK — ${rapport.commandes.length} cmds, ${rapport.factures.length} facts (${mois})`,
  };
}

export async function GET() {
  const log: string[] = [];

  try {
    // 0. Supabase ping
    const { error: pingErr } = await supabase.from('projets').select('id').limit(1);
    if (pingErr) return NextResponse.json({ success: false, message: `Supabase: ${pingErr.message}`, log });
    log.push('Supabase: OK');

    // 1. Config
    const config = await getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';
    log.push(`Config: rootId=${rootId || 'VIDE'}, apiKey=${apiKey ? 'OK' : 'VIDE'}`);
    if (!rootId) return NextResponse.json({ success: false, message: 'Aucun dossier Drive configuré.', log });
    if (!apiKey) return NextResponse.json({ success: false, message: 'Clé API Drive manquante.', log });

    // 2. List project folders
    const rootResult = await driveGet(`'${rootId}' in parents and trashed=false`, 'files(id,name,mimeType)', apiKey);
    if (!rootResult.ok) return NextResponse.json({ success: false, message: `Drive (${rootResult.status}): ${rootResult.message}`, log });

    const folders = rootResult.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    log.push(`${folders.length} dossier(s) trouvé(s): ${folders.map(f => f.name).join(', ')}`);
    if (folders.length === 0) return NextResponse.json({ success: false, message: 'Aucun sous-dossier trouvé.', log });

    // Build the complete set of Drive folder IDs BEFORE processing.
    // This is what we use for cleanup — NOT just the ones we successfully processed.
    const allDriveIds = new Set(folders.map(f => folderId(f.name)));

    // 3. Process all folders in parallel
    const results = await Promise.all(folders.map(f => processFolder(f, apiKey)));

    let processed = 0, errors = 0;
    for (const r of results) {
      if (r.ok) processed++;
      else errors++;
      log.push(r.msg);
    }

    // 4. Remove Supabase projects whose Drive folder no longer exists.
    // We compare against ALL Drive folder IDs, so a failed-parse project is NOT deleted.
    try {
      const { data: allRows } = await supabase.from('projets').select('id');
      const toDelete = (allRows ?? []).map(r => r.id).filter(id => !allDriveIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from('projets').delete().in('id', toDelete);
        log.push(`Supprimé (absent du Drive): ${toDelete.join(', ')}`);
      } else {
        log.push('Aucune suppression nécessaire');
      }
    } catch (e) {
      log.push(`Suppression ignorée: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 5. Update lastSync
    try { await saveConfig({ ...config, lastSync: new Date().toISOString() }); } catch { /* noop */ }

    return NextResponse.json({
      success: true,
      message: `${processed} rapport(s) importé(s), ${errors} erreur(s) sur ${folders.length} dossiers`,
      results: log,
      processed,
      errors,
    });

  } catch (e) {
    log.push(`EXCEPTION GLOBALE: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ success: false, message: String(e), log });
  }
}
