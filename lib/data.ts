import { Projet, RapportMensuel, Facture } from '@/types';
import { supabase } from './db';

export interface AppConfig {
  googleDriveFolderId: string;
  googleDriveFolderUrl: string;
  googleApiKey: string;
  appName: string;
  lastSync: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  googleDriveFolderId: '',
  googleDriveFolderUrl: '',
  googleApiKey: '',
  appName: 'ROM - Suivi Projets',
  lastSync: null,
};

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'app')
    .single();
  return (data?.value as AppConfig) ?? DEFAULT_CONFIG;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await supabase
    .from('config')
    .upsert({ key: 'app', value: config });
}

// ─── Projets ─────────────────────────────────────────────────────────────────

export async function getAllProjets(): Promise<Projet[]> {
  const { data } = await supabase
    .from('projets')
    .select('data');
  const projets = (data ?? []).map((r) => r.data as Projet);
  return projets.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function getProjetById(id: string): Promise<Projet | null> {
  const { data } = await supabase
    .from('projets')
    .select('data')
    .eq('id', id)
    .single();
  return data ? (data.data as Projet) : null;
}

export async function getProjetByToken(token: string): Promise<Projet | null> {
  const { data } = await supabase
    .from('projets')
    .select('data')
    .eq('data->>shareToken', token)
    .single();
  return data ? (data.data as Projet) : null;
}

export async function saveProjet(projet: Projet): Promise<void> {
  const { error } = await supabase
    .from('projets')
    .upsert({ id: projet.id, data: projet });
  if (error) throw new Error(`Supabase saveProjet: ${error.message} (code: ${error.code})`);
}

export async function saveProjets(projets: Projet[]): Promise<void> {
  for (const p of projets) await saveProjet(p);
}

export async function createOrGetProjet(id: string, nom: string, client: string): Promise<Projet> {
  const existing = await getProjetById(id);
  if (existing) return existing;
  const newProjet: Projet = {
    id,
    shareToken: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    nom,
    client,
    statut: 'en_cours',
    rapports: [],
    historiqueChart: [],
  };
  await saveProjet(newProjet);
  return newProjet;
}

export function getDernierRapport(projet: Projet): RapportMensuel | null {
  if (!projet.rapports?.length) return null;
  return projet.rapports.reduce((latest, r) => r.date > latest.date ? r : latest);
}

export async function getAllFactures(): Promise<Array<Facture & { projetId: string; projetNom: string; client: string }>> {
  const projets = await getAllProjets();
  const all: Array<Facture & { projetId: string; projetNom: string; client: string }> = [];
  for (const projet of projets) {
    const rapport = getDernierRapport(projet);
    if (!rapport) continue;
    for (const facture of rapport.factures) {
      all.push({ ...facture, projetId: projet.id, projetNom: projet.nom, client: projet.client });
    }
  }
  return all;
}

export async function addOrUpdateRapport(projetId: string, rapport: RapportMensuel): Promise<void> {
  const projet = await getProjetById(projetId);
  if (!projet) throw new Error(`Projet ${projetId} introuvable`);

  const idx = projet.rapports.findIndex((r) => r.date === rapport.date);
  if (idx >= 0) projet.rapports[idx] = rapport;
  else {
    projet.rapports.push(rapport);
    projet.rapports.sort((a, b) => a.date.localeCompare(b.date));
  }

  const label = rapport.mois.substring(0, 3).toUpperCase() + '/' + rapport.mois.slice(-2);
  const point = { date: label, montantCommandesHT: rapport.montantTotalCommandesHT, montantFacturesHT: rapport.montantTotalFacturesHT };
  const hIdx = projet.historiqueChart.findIndex((h) => h.date === label);
  if (hIdx >= 0) projet.historiqueChart[hIdx] = point;
  else projet.historiqueChart.push(point);

  await saveProjet(projet);
}

export function formatMontant(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function formatMontantHT(value: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' €';
}
