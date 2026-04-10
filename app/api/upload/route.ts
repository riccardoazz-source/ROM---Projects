import { NextRequest, NextResponse } from 'next/server';
import { getProjetById, createOrGetProjet, addOrUpdateRapport } from '@/lib/data';
import { RapportMensuel } from '@/types';

export const dynamic = 'force-dynamic';

// Basic PDF text extraction and parsing helpers
function parseMontant(text: string): number {
  const cleaned = text.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function extractValue(lines: string[], keyword: string): string {
  const idx = lines.findIndex((l) => l.toLowerCase().includes(keyword.toLowerCase()));
  if (idx === -1) return '';
  // Look for numeric value on same line or next
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

function extractMois(filename: string, text: string): string {
  // Try from filename (YYYYMMDD pattern)
  const dateMatch = filename.match(/(\d{8})/);
  if (dateMatch) {
    const d = dateMatch[1];
    const year = d.substring(0, 4);
    const month = parseInt(d.substring(4, 6), 10);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[month - 1]} ${year}`;
  }
  // Try from text
  const moisNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  for (const mois of moisNames) {
    const reg = new RegExp(`${mois}\\s+(\\d{2,4})`, 'i');
    const m = text.match(reg);
    if (m) return `${mois.charAt(0).toUpperCase() + mois.slice(1)} ${m[1]}`;
  }
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function extractDate(filename: string): string {
  const dateMatch = filename.match(/(\d{8})/);
  if (dateMatch) return dateMatch[1];
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projetId = formData.get('projetId') as string | null;

    if (!file || !projetId) {
      return NextResponse.json({ success: false, message: 'Fichier et projet requis.' }, { status: 400 });
    }

    // Use existing project or create from folder name
    const folderName = (formData.get('folderName') as string | null) ?? projetId;
    const parts = folderName.split(/\s*-\s*/);
    const nom = parts[0]?.trim() || folderName;
    const client = parts.slice(1).join(' - ').trim() || 'Client inconnu';

    const projet = getProjetById(projetId) ?? createOrGetProjet(projetId, nom, client);

    // Read the PDF buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = '';
    try {
      // Dynamically import pdf-parse to avoid build issues
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch (e) {
      // pdf-parse failed, continue with empty text
      console.error('PDF parse error:', e);
    }

    const lines = extractedText.split('\n').map((l) => l.trim()).filter(Boolean);
    const filename = file.name;
    const mois = extractMois(filename, extractedText);
    const date = extractDate(filename);

    // Attempt to extract key values
    const montantTotalCommandesHT = parseMontant(extractValue(lines, 'montant total commandes (ht)')) ||
      parseMontant(extractValue(lines, 'montant total commandes'));
    const montantTotalFacturesHT = parseMontant(extractValue(lines, 'montant total factures (ht)')) ||
      parseMontant(extractValue(lines, 'montant total factures'));
    const montantTotalCommandesTTC = parseMontant(extractValue(lines, 'montant total commandes (ttc)'));
    const montantTotalFacturesTTC = parseMontant(extractValue(lines, 'montant total factures (ttc)'));
    const nombreTotalCommandes = extractNumber(lines, 'nombre total de commandes');
    const nombreTotalAvenants = extractNumber(lines, "nombre total d'avenants");
    const nombreCommandesActives = extractNumber(lines, 'nombre de commandes actives');
    const nombreTotalFactures = extractNumber(lines, 'nombre total factures');
    const totalTVACommandes = parseMontant(extractValue(lines, 'total tva commandes'));
    const totalTVAFactures = parseMontant(extractValue(lines, 'total tva factures'));
    const totalCommandesHonorairesHT = parseMontant(extractValue(lines, 'total commandes honoraires'));
    const totalCommandesTravauxHT = parseMontant(extractValue(lines, 'total commandes travaux'));
    const totalCommandesDiversHT = parseMontant(extractValue(lines, 'total commandes divers'));

    // Build a partial rapport (user can edit via UI if extraction is imperfect)
    const rapport: RapportMensuel = {
      date,
      mois,
      nombreTotalCommandes: nombreTotalCommandes || 0,
      nombreTotalAvenants: nombreTotalAvenants || 0,
      nombreCommandesActives: nombreCommandesActives || 0,
      nombreTotalFactures: nombreTotalFactures || 0,
      montantTotalCommandesHT: montantTotalCommandesHT || 0,
      montantTotalFacturesHT: montantTotalFacturesHT || 0,
      totalCommandesHonorairesHT: totalCommandesHonorairesHT || 0,
      totalCommandesTravauxHT: totalCommandesTravauxHT || 0,
      totalCommandesDiversHT: totalCommandesDiversHT || 0,
      totalTVACommandes: totalTVACommandes || 0,
      totalTVAFactures: totalTVAFactures || 0,
      nombreFacturesAvecRetenue: 0,
      montantTotalRetenueGarantieHT: 0,
      montantTotalCommandesTTC: montantTotalCommandesTTC || 0,
      montantTotalFacturesTTC: montantTotalFacturesTTC || 0,
      pourcentageAvancementMois: 0,
      pourcentageAvancementTotal: 0,
      commandes: [],
      factures: [],
      facturesMois: [],
    };

    addOrUpdateRapport(projetId, rapport);

    return NextResponse.json({
      success: true,
      message: `Rapport "${mois}" importé avec succès pour le projet "${projet.nom}". Les données ont été extraites automatiquement — vérifiez les valeurs dans la vue projet.`,
      projetId,
      projetNom: projet.nom,
      mois,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      message: "Erreur lors du traitement du fichier. Vérifiez que le fichier est un PDF valide.",
    }, { status: 500 });
  }
}
