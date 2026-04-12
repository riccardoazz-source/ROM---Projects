import { NextRequest, NextResponse } from 'next/server';
import { getProjetById, createOrGetProjet, addOrUpdateRapport } from '@/lib/data';
import { parseRapportFromPdf, extractMoisFromFilename, extractDateFromFilename } from '@/lib/pdfParser';
import { RapportMensuel } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projetId = formData.get('projetId') as string | null;

    if (!file || !projetId) {
      return NextResponse.json({ success: false, message: 'Fichier et projet requis.' }, { status: 400 });
    }

    const folderName = (formData.get('folderName') as string | null) ?? projetId;
    const parts = folderName.split(/\s*-\s*/);
    const nom = parts[0]?.trim() || folderName;
    const client = parts.slice(1).join(' - ').trim() || 'Client inconnu';

    const projet = await getProjetById(projetId) ?? await createOrGetProjet(projetId, nom, client);

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch (e) {
      console.error('PDF parse error:', e);
    }

    const filename = file.name;
    const mois = extractMoisFromFilename(filename);
    const date = extractDateFromFilename(filename);

    // Parse the PDF content
    const parsed = extractedText ? parseRapportFromPdf(extractedText, filename) : {};

    const rapport: RapportMensuel = {
      date,
      mois,
      nombreTotalCommandes: parsed.nombreTotalCommandes ?? 0,
      nombreTotalAvenants: parsed.nombreTotalAvenants ?? 0,
      nombreCommandesActives: parsed.nombreCommandesActives ?? 0,
      nombreTotalFactures: parsed.nombreTotalFactures ?? 0,
      montantTotalCommandesHT: parsed.montantTotalCommandesHT ?? 0,
      montantTotalFacturesHT: parsed.montantTotalFacturesHT ?? 0,
      totalCommandesHonorairesHT: parsed.totalCommandesHonorairesHT ?? 0,
      totalCommandesTravauxHT: parsed.totalCommandesTravauxHT ?? 0,
      totalCommandesDiversHT: parsed.totalCommandesDiversHT ?? 0,
      totalTVACommandes: parsed.totalTVACommandes ?? 0,
      totalTVAFactures: parsed.totalTVAFactures ?? 0,
      nombreFacturesAvecRetenue: parsed.nombreFacturesAvecRetenue ?? 0,
      montantTotalRetenueGarantieHT: parsed.montantTotalRetenueGarantieHT ?? 0,
      montantTotalCommandesTTC: parsed.montantTotalCommandesTTC ?? 0,
      montantTotalFacturesTTC: parsed.montantTotalFacturesTTC ?? 0,
      pourcentageAvancementMois: parsed.pourcentageAvancementMois ?? 0,
      pourcentageAvancementTotal: parsed.pourcentageAvancementTotal ?? 0,
      commandes: parsed.commandes ?? [],
      factures: parsed.factures ?? [],
      facturesMois: parsed.facturesMois ?? [],
    };

    await addOrUpdateRapport(projetId, rapport);

    const nbCommandes = rapport.commandes.length;
    const nbFactures = rapport.factures.length;
    const nbFacturesMois = rapport.facturesMois.length;
    const textLen = extractedText.length;

    return NextResponse.json({
      success: true,
      message: `Rapport "${mois}" importé pour "${projet.nom}" [id:${projetId}]. ${nbCommandes} commande(s), ${nbFactures} facture(s), ${nbFacturesMois} bordereau(x). Texte PDF: ${textLen} car.`,
      projetId,
      projetNom: projet.nom,
      mois,
      stats: { nbCommandes, nbFactures, nbFacturesMois, textLen },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      message: "Erreur lors du traitement du fichier.",
    }, { status: 500 });
  }
}
