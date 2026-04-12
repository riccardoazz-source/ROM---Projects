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
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { error: { message: text.slice(0, 200) } }; }
  if (!res.ok) return { ok: false as const, status: res.status, message: json.error?.message || 'unknown' };
  return { ok: true as const, files: (json.files || []) as Array<{ id: string; name: string; mimeType: string; modifiedTime: string }> };
}

async function downloadFile(fileId: string, apiKey: string): Promise<Buffer | null> {
  const url = `${BASE}/${fileId}?alt=media&key=${apiKey}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
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
    // ── Step 0: check Supabase ────────────────────────────────────────────
    const { error: pingErr } = await supabase.from('projets').select('id').limit(1);
    if (pingErr) {
      return NextResponse.json({ success: false, message: `Supabase inaccessible: ${pingErr.message}`, log });
    }
    log.push('Supabase: connexion OK');

    // ── Step 1: load config ───────────────────────────────────────────────
    const config = await getConfig();
    const rootId = config.googleDriveFolderId;
    const apiKey = config.googleApiKey || process.env.GOOGLE_DRIVE_API_KEY || '';

    log.push(`Config: rootId=${rootId || 'VIDE'}, apiKey=${apiKey ? 'OK' : 'VIDE'}`);
    if (!rootId) return NextResponse.json({ success: false, message: "Aucun dossier Drive configuré.", log });
    if (!apiKey) return NextResponse.json({ success: false, message: "Clé API Drive manquante.", log });

    // ── Step 2: list project subfolders ───────────────────────────────────
    const rootResult = await driveGet(
      `'${rootId}' in parents and trashed=false`,
      'files(id,name,mimeType)',
      apiKey,
    );
    if (!rootResult.ok) {
      return NextResponse.json({ success: false, message: `Drive API (${rootResult.status}): ${rootResult.message}`, log });
    }

    const folders = rootResult.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    log.push(`${folders.length} dossier(s) de projet trouvé(s)`);

    if (folders.length === 0) {
      return NextResponse.json({ success: false, message: "Aucun sous-dossier trouvé dans le dossier Drive.", log });
    }

    // ── Step 3: download + parse latest PDF in each folder ────────────────
    let processed = 0, errors = 0;

    for (const folder of folders) {
      const { nom, client, id } = parseFolder(folder.name);

      try {
        // List PDFs in this project folder
        const pdfsResult = await driveGet(
          `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
          'files(id,name,modifiedTime)',
          apiKey,
        );

        if (!pdfsResult.ok) {
          errors++;
          log.push(`[${folder.name}] Erreur liste PDFs: ${pdfsResult.message}`);
          continue;
        }

        if (pdfsResult.files.length === 0) {
          log.push(`[${folder.name}] Aucun PDF trouvé`);
          continue;
        }

        // Pick most recent PDF by modifiedTime
        const latest = pdfsResult.files.reduce((a, b) => a.modifiedTime > b.modifiedTime ? a : b);

        // Download PDF binary
        const buffer = await downloadFile(latest.id, apiKey);
        if (!buffer) {
          errors++;
          log.push(`[${folder.name}] Erreur téléchargement: ${latest.name}`);
          continue;
        }

        // Extract text from PDF
        let extractedText = '';
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text;
        } catch (e) {
          errors++;
          log.push(`[${folder.name}] Erreur lecture PDF: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }

        // Parse rapport data
        const filename = latest.name;
        const mois = extractMoisFromFilename(filename);
        const date = extractDateFromFilename(filename);
        const parsed = extractedText ? parseRapportFromPdf(extractedText, filename) : {};

        const rapport: RapportMensuel = {
          date,
          mois,
          nombreTotalCommandes:        parsed.nombreTotalCommandes        ?? 0,
          nombreTotalAvenants:          parsed.nombreTotalAvenants          ?? 0,
          nombreCommandesActives:       parsed.nombreCommandesActives       ?? 0,
          nombreTotalFactures:          parsed.nombreTotalFactures          ?? 0,
          montantTotalCommandesHT:      parsed.montantTotalCommandesHT      ?? 0,
          montantTotalFacturesHT:       parsed.montantTotalFacturesHT       ?? 0,
          totalCommandesHonorairesHT:   parsed.totalCommandesHonorairesHT   ?? 0,
          totalCommandesTravauxHT:      parsed.totalCommandesTravauxHT      ?? 0,
          totalCommandesDiversHT:       parsed.totalCommandesDiversHT       ?? 0,
          totalTVACommandes:            parsed.totalTVACommandes            ?? 0,
          totalTVAFactures:             parsed.totalTVAFactures             ?? 0,
          nombreFacturesAvecRetenue:    parsed.nombreFacturesAvecRetenue    ?? 0,
          montantTotalRetenueGarantieHT: parsed.montantTotalRetenueGarantieHT ?? 0,
          montantTotalCommandesTTC:     parsed.montantTotalCommandesTTC     ?? 0,
          montantTotalFacturesTTC:      parsed.montantTotalFacturesTTC      ?? 0,
          pourcentageAvancementMois:    parsed.pourcentageAvancementMois    ?? 0,
          pourcentageAvancementTotal:   parsed.pourcentageAvancementTotal   ?? 0,
          commandes:    parsed.commandes    ?? [],
          factures:     parsed.factures     ?? [],
          facturesMois: parsed.facturesMois ?? [],
        };

        // Save to Supabase
        await createOrGetProjet(id, nom, client);
        await addOrUpdateRapport(id, rapport);

        // Read back to verify persistence
        const saved = await getProjetById(id);
        const savedRapport = saved?.rapports?.reduce(
          (a: any, b: any) => (!a || b.date > a.date ? b : a), null
        );
        const savedCmds = savedRapport?.commandes?.length ?? 0;
        const savedFacts = savedRapport?.factures?.length ?? 0;

        processed++;
        log.push(`[${folder.name}] OK — parsed: ${rapport.commandes.length} cmds, ${rapport.factures.length} facts → saved: ${savedCmds} cmds, ${savedFacts} facts (${mois})`);

      } catch (e) {
        errors++;
        log.push(`[${folder.name}] EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── Step 4: update lastSync ───────────────────────────────────────────
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
