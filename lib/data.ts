import { Projet, RapportMensuel, Facture } from '@/types';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'projets.json');

export function getAllProjets(): Projet[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  return data.projets as Projet[];
}

export function getProjetById(id: string): Projet | null {
  const projets = getAllProjets();
  return projets.find((p) => p.id === id) ?? null;
}

export function getDernierRapport(projet: Projet): RapportMensuel | null {
  if (!projet.rapports || projet.rapports.length === 0) return null;
  return projet.rapports.reduce((latest, r) =>
    r.date > latest.date ? r : latest
  );
}

export function getAllFactures(): Array<Facture & { projetId: string; projetNom: string; client: string }> {
  const projets = getAllProjets();
  const all: Array<Facture & { projetId: string; projetNom: string; client: string }> = [];
  for (const projet of projets) {
    const rapport = getDernierRapport(projet);
    if (!rapport) continue;
    for (const facture of rapport.factures) {
      all.push({
        ...facture,
        projetId: projet.id,
        projetNom: projet.nom,
        client: projet.client,
      });
    }
  }
  return all;
}

export function saveProjets(projets: Projet[]): void {
  const data = { projets };
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function addOrUpdateRapport(projetId: string, rapport: RapportMensuel): void {
  const projets = getAllProjets();
  const projet = projets.find((p) => p.id === projetId);
  if (!projet) throw new Error(`Projet ${projetId} introuvable`);

  const idx = projet.rapports.findIndex((r) => r.date === rapport.date);
  if (idx >= 0) {
    projet.rapports[idx] = rapport;
  } else {
    projet.rapports.push(rapport);
    projet.rapports.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Update historiqueChart
  const point = {
    date: rapport.mois.substring(0, 3).toUpperCase() + '/' + rapport.mois.slice(-2),
    montantCommandesHT: rapport.montantTotalCommandesHT,
    montantFacturesHT: rapport.montantTotalFacturesHT,
  };
  const hIdx = projet.historiqueChart.findIndex((h) => h.date === point.date);
  if (hIdx >= 0) {
    projet.historiqueChart[hIdx] = point;
  } else {
    projet.historiqueChart.push(point);
  }

  saveProjets(projets);
}

export function formatMontant(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMontantHT(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' €';
}
