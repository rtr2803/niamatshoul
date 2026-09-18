import { 
  Home, 
  Warehouse, 
  Bird, 
  Egg, 
  ThermometerSun, 
  ShoppingCart, 
  Banknote, 
  Users, 
  Package, 
  Settings,
  AlertTriangle
} from 'lucide-react';

export const APP_NAME = 'FERME MANAGEMENT';
export const APP_SUBTITLE = 'Farm Operations & Poultry Management';
export const CURRENCY = 'DH';
export const CURRENCY_CODE = 'MAD';
export const DEFAULT_BAG_SIZE = 50;
export const DEFAULT_BAG_UNIT = 'kg';

export const NAVIGATION_ITEMS = [
  { label: 'Tableau de bord', icon: Home, path: '/' },
  { label: 'Bâtiments', icon: Warehouse, path: '/houses' },
  { label: 'Lots d\'animaux', icon: Bird, path: '/lots' },
  { label: 'Production', icon: Egg, path: '/production' },
  { label: 'Incubation', icon: ThermometerSun, path: '/incubation' },
  { label: 'Inventaire', icon: Package, path: '/inventory' },
  { label: 'Ventes', icon: ShoppingCart, path: '/sales' },
  { label: 'Finances', icon: Banknote, path: '/finances' },
  { label: 'Tiers', icon: Users, path: '/contacts' },
  { label: 'Alertes', icon: AlertTriangle, path: '/alerts' },
  { label: 'Paramètres', icon: Settings, path: '/settings' },
];

export const DEFAULT_ALERT_RULES = [
  {
    type: 'MORTALITY_RATE',
    threshold: 0.5, // 0.5%
    severity: 'HIGH',
    description: 'Taux de mortalité quotidien supérieur à la normale',
  },
  {
    type: 'PRODUCTION_DROP',
    threshold: 5, // 5% drop
    severity: 'MEDIUM',
    description: 'Baisse soudaine de la production d\'œufs',
  },
  {
    type: 'FEED_CONSUMPTION_DROP',
    threshold: 10, // 10% drop
    severity: 'MEDIUM',
    description: 'Baisse anormale de la consommation d\'aliment',
  },
  {
    type: 'LOW_STOCK',
    threshold: 0, // Dependent on product min_stock_level
    severity: 'HIGH',
    description: 'Niveau de stock sous le seuil d\'alerte minimum',
  },
];

export const CHART_COLORS = [
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
];
