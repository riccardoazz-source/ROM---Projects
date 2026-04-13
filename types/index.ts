export interface BudgetLigne {
  libelle: string;
  type: 'section' | 'item' | 'total';
  valeurs: number[];
}

export interface BudgetTable {
  titre: string;
  colonnes: string[];
  lignes: BudgetLigne[];
}

export interface FactureMois {
  factureOuSituation: string;
  societe: string;
  dateValidation: string;
  montantHT: number;
  tva: number;
  montantTTC: number;
  pourcentageFactureSurCommande: number;
  pourcentageAvancementTotal: number;
}

export interface Facture {
  dateFacture: string;
  factureOuSituation: string;
  societe: string;
  dateValidationAMO: string;
  montantHT: number;
  montantTTC: number;
  retenueGarantie: number;
  pourcentageFactureSurCommande: number;
  pourcentageAvancementTotal: number;
}

export interface Commande {
  societe: string;
  montantHT: number;
  lot: string;
  type: 'honoraires' | 'travaux' | 'divers';
  valeurHtRestante: number;
  pourcentageAvancement: number;
}

export interface HistoriquePoint {
  date: string;
  montantCommandesHT: number;
  montantFacturesHT: number;
}

export interface RapportMensuel {
  date: string;
  mois: string;
  nombreTotalCommandes: number;
  nombreTotalAvenants: number;
  nombreCommandesActives: number;
  nombreTotalFactures: number;
  montantTotalCommandesHT: number;
  montantTotalFacturesHT: number;
  totalCommandesHonorairesHT: number;
  totalCommandesTravauxHT: number;
  totalCommandesDiversHT: number;
  totalTVACommandes: number;
  totalTVAFactures: number;
  nombreFacturesAvecRetenue: number;
  montantTotalRetenueGarantieHT: number;
  montantTotalCommandesTTC: number;
  montantTotalFacturesTTC: number;
  pourcentageAvancementMois: number;
  pourcentageAvancementTotal: number;
  commandes: Commande[];
  factures: Facture[];
  facturesMois: FactureMois[];
  budget?: BudgetTable;
}

export interface Projet {
  id: string;
  shareToken: string;
  nom: string;
  client: string;
  description?: string;
  statut?: 'en_cours' | 'termine' | 'en_attente';
  rapports: RapportMensuel[];
  historiqueChart: HistoriquePoint[];
}

export interface ProjetResume {
  id: string;
  nom: string;
  client: string;
  dernierRapport: RapportMensuel;
  nombreRapports: number;
}
