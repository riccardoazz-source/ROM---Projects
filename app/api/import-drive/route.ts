/**
 * /api/import-drive  — download and parse every PDF from Google Drive.
 * New route (replaces /api/sync which only created empty project shells).
 */
import { NextResponse } from 'next/server';
import { getConfig, saveConfig, createOrGetProjet, addOrUpdateRapport, getProjetById } from '@/lib/data';
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
    log.push(`${folders.length} dossier(s) trouvé(s)`);
    if (folders.length === 0) return NextResponse.json({ success: false, message: 'Aucun sous-dossier trouvé.', log });

    // 3. Process each folder
    let processed = 0, errors = 0;

    for (const folder of folders) {
      const { nom, client, id } = folderParts(folder.name);
      try {
        // List PDFs in folder
        const pdfsRes = await driveGet(
          `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
          'files(id,name,modifiedTime)',
          apiKey,
        );
        if (!pdfsRes.ok) {
          errors++;
          log.push(`[${folder.name}] Erreur liste PDFs: ${pdfsRes.message}`);
          continue;
        }
        if (pdfsRes.files.length === 0) {
          log.push(`[${folder.name}] Aucun PDF`);
          continue;
        }

        // Most-recent PDF
        const latest = pdfsRes.files.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);

        // Download
        const buffer = await downloadPdf(latest.id, apiKey);
        if (!buffer) {
          errors++;
          log.push(`[${folder.name}] Téléchargement échoué: ${latest.name}`);
          continue;
        }

        // Parse PDF text
        let text = '';
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;
        } catch (e) {
          errors++;
          log.push(`[${folder.name}] Erreur PDF: ${e instanceof Error ? e.message : String(e)}`);
          continue;
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
        };

        // Save
        await createOrGetProjet(id, nom, client);
        await addOrUpdateRapport(id, rapport);

        // Read-back to verify persistence
        const saved = await getProjetById(id);
        const savedR = saved?.rapports?.reduce((a: any, b: any) => (!a || b.date > a.date ? b : a), null);
        const sCmds  = savedR?.commandes?.length  ?? 0;
        const sFacts = savedR?.factures?.length   ?? 0;

        processed++;
        log.push(`[${folder.name}] OK — parsé: ${rapport.commandes.length} cmds, ${rapport.factures.length} facts → sauvegardé: ${sCmds} cmds, ${sFacts} facts (${mois})`);

      } catch (e) {
        errors++;
        log.push(`[${folder.name}] EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 4. Update lastSync
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
