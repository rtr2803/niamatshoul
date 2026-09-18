export const EXPENSE_CATEGORIES: Record<string, string> = {
  FEED: 'Alimentation',
  MEDICATION: 'Médicaments & Vaccins',
  EQUIPMENT: 'Équipement',
  LABOR: 'Main d\'œuvre',
  MAINTENANCE: 'Entretien & Réparation',
  UTILITIES: 'Électricité & Eau',
  TRANSPORT: 'Transport',
  OTHER: 'Autre',
};

export const REVENUE_CATEGORIES: Record<string, string> = {
  EGG_SALE: 'Vente d\'œufs',
  ANIMAL_SALE: 'Vente d\'animaux',
  MANURE_SALE: 'Vente de fumier',
  OTHER_SALE: 'Autre vente',
};

export const LOT_EVENT_TYPES: Record<string, string> = {
  VACCINATION: 'Vaccination',
  TREATMENT: 'Traitement médical',
  WEIGHT_CHECK: 'Contrôle de poids',
  INSPECTION: 'Inspection sanitaire',
  DEATH: 'Mortalité',
  OTHER: 'Autre',
};

export const INVENTORY_TRANSACTION_TYPES: Record<string, string> = {
  IN: 'Entrée (Achat)',
  OUT: 'Sortie (Consommation)',
  ADJUSTMENT: 'Ajustement',
  RETURN: 'Retour',
};

export const BATCH_STATUSES: Record<string, string> = {
  PLANNED: 'Planifié',
  INCUBATING: 'En incubation',
  HATCHING: 'En éclosion',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const PAYMENT_STATUSES: Record<string, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

export const HOUSE_STATUSES: Record<string, string> = {
  ACTIVE: 'Actif',
  CLEANING: 'En nettoyage',
  MAINTENANCE: 'En maintenance',
  EMPTY: 'Vide',
};

export const ALERT_SEVERITIES: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export const LOT_STATUSES: Record<string, string> = {
  ACTIVE: 'Actif',
  SOLD: 'Vendu',
  QUARANTINE: 'En quarantaine',
  CLOSED: 'Clôturé',
};

export function getStatusBadgeColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'PAID':
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
    case 'PARTIAL':
    case 'INCUBATING':
    case 'HATCHING':
    case 'CLEANING':
      return 'bg-yellow-100 text-yellow-800';
    case 'EMPTY':
    case 'PLANNED':
    case 'QUARANTINE':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
    case 'MAINTENANCE':
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getSeverityBadgeColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOW':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
