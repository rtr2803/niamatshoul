/**
 * Ferme Management ERP - Type Definitions
 * 
 * This file contains all TypeScript types corresponding to the PostgreSQL database
 * schema, form inputs, dashboard data, offline sync, and reporting functionalities.
 */

// ==================== DATABASE ROW TYPES ====================
// Match PostgreSQL schema exactly

export type UserRole = 'OWNER' | 'PARTNER';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  name: string;
  area_hectares: number;
  currency: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type HouseStatus = 'active' | 'inactive' | 'maintenance';

export interface PoultryHouse {
  id: string;
  name: string;
  code: string | null;
  capacity: number;
  house_type: string;
  status: HouseStatus;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AnimalType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimalBreed {
  id: string;
  animal_type_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  animal_type?: AnimalType;
}

export interface Incubator {
  id: string;
  name: string;
  capacity: number | null;
  status: 'active' | 'inactive' | 'maintenance';
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Customer {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type AnimalSex = 'male' | 'female' | 'mixed' | 'unknown';
export type LotStatus = 'active' | 'sold' | 'transferred' | 'deceased' | 'archived';

/**
 * AnimalLot represents a batch or lot of animals within a specific poultry house.
 */
export interface AnimalLot {
  id: string;
  lot_number: string;
  animal_type_id: string;
  breed_id: string | null;
  sex: AnimalSex;
  birth_date: string | null;
  origin: string | null;
  source_batch_id: string | null;
  initial_quantity: number;
  current_quantity: number;
  poultry_house_id: string | null;
  acquisition_date: string;
  status: LotStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  animal_type?: AnimalType;
  breed?: AnimalBreed;
  poultry_house?: PoultryHouse;
  source_batch?: IncubationBatch;
}

export type LotEventType = 'INITIAL_STOCK' | 'HATCH' | 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'MORTALITY' | 'SALE' | 'ADJUSTMENT';

export interface AnimalLotEvent {
  id: string;
  lot_id: string;
  event_type: LotEventType;
  quantity: number;
  date: string;
  poultry_house_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined
  lot?: AnimalLot;
  poultry_house?: PoultryHouse;
}

export type BatchStatus = 'received' | 'incubating' | 'hatching' | 'completed' | 'failed' | 'cancelled';

/**
 * IncubationBatch represents a batch of eggs placed in an incubator.
 */
export interface IncubationBatch {
  id: string;
  batch_number: string;
  supplier_id: string | null;
  incubator_id: string | null;
  date_received: string;
  eggs_placed: number;
  date_placed: string | null;
  expected_hatch_date: string | null;
  actual_hatch_date: string | null;
  eggs_hatched: number;
  eggs_failed: number;
  hatch_rate: number;
  status: BatchStatus;
  result_lot_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  supplier?: Supplier;
  incubator?: Incubator;
  result_lot?: AnimalLot;
}

export interface IncubationEvent {
  id: string;
  batch_id: string;
  event_type: 'RECEIVED' | 'PLACED' | 'CANDLING' | 'HATCHING_STARTED' | 'HATCHED' | 'FAILED' | 'NOTE';
  date: string;
  quantity: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface EggProduction {
  id: string;
  date: string;
  poultry_house_id: string;
  lot_id: string | null;
  total_eggs: number;
  broken_eggs: number;
  sellable_eggs: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  poultry_house?: PoultryHouse;
  lot?: AnimalLot;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  package_size: number | null;
  package_unit: string | null;
  supplier_id: string | null;
  purchase_price: number | null;
  current_stock: number;
  reorder_level: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  category?: InventoryCategory;
  supplier?: Supplier;
}

export type InventoryTransactionType = 'PURCHASE' | 'CONSUMPTION' | 'LOSS' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'RETURN';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  date: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined
  product?: InventoryProduct;
}

export interface FeedConsumption {
  id: string;
  date: string;
  poultry_house_id: string;
  lot_id: string | null;
  product_id: string;
  bags: number;
  kg_consumed: number;
  operator: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  poultry_house?: PoultryHouse;
  product?: InventoryProduct;
}

export interface GreenForage {
  id: string;
  date: string;
  poultry_house_id: string | null;
  lot_id: string | null;
  estimated_kg: number;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Purchase {
  id: string;
  purchase_number: string | null;
  supplier_id: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface EggSale {
  id: string;
  sale_number: string | null;
  date: string;
  customer_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  customer?: Customer;
}

export interface AnimalSale {
  id: string;
  sale_number: string | null;
  date: string;
  lot_id: string;
  customer_id: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  lot?: AnimalLot;
  customer?: Customer;
}

export type ExpenseCategory = 'fertilized_eggs' | 'feed' | 'forage' | 'medication' | 'vaccines' | 'equipment' | 'transport' | 'utilities' | 'labor' | 'maintenance' | 'miscellaneous';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  supplier_id: string | null;
  purchase_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  supplier?: Supplier;
}

export type RevenueCategory = 'egg_sales' | 'animal_sales' | 'other';

export interface Revenue {
  id: string;
  date: string;
  category: RevenueCategory;
  description: string;
  amount: number;
  customer_id: string | null;
  sale_id: string | null;
  sale_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Debt {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  supplier?: Supplier;
  payments?: DebtPayment[];
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Receivable {
  id: string;
  customer_id: string;
  sale_id: string | null;
  sale_type: string | null;
  date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  customer?: Customer;
  payments?: ReceivablePayment[];
}

export interface ReceivablePayment {
  id: string;
  receivable_id: string;
  date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type FinancialTransactionType = 'REVENUE' | 'EXPENSE' | 'DEBT_PAYMENT' | 'RECEIVABLE_PAYMENT';

export interface FinancialTransaction {
  id: string;
  date: string;
  type: FinancialTransactionType;
  category: string | null;
  description: string;
  amount: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  created_by: string | null;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'unread' | 'read' | 'dismissed';

export interface Notification {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  date: string;
  status: AlertStatus;
  related_entity_type: string | null;
  related_entity_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface AlertRule {
  id: string;
  rule_type: string;
  is_enabled: boolean;
  threshold: any;
  severity: AlertSeverity;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  created_at: string;
}

// ==================== FORM TYPES ====================
// These are used for create/edit forms (exclude generated fields)

export interface CreatePoultryHouse {
  name: string;
  code?: string;
  capacity: number;
  house_type?: string;
  status?: HouseStatus;
  description?: string;
  notes?: string;
}

export interface CreateAnimalLot {
  lot_number: string;
  animal_type_id: string;
  breed_id?: string;
  sex?: AnimalSex;
  birth_date?: string;
  origin?: string;
  source_batch_id?: string;
  initial_quantity: number;
  poultry_house_id?: string;
  acquisition_date: string;
  notes?: string;
}

export interface CreateAnimalLotEvent {
  lot_id: string;
  event_type: LotEventType;
  quantity: number;
  date: string;
  poultry_house_id?: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
}

export interface CreateIncubationBatch {
  batch_number: string;
  supplier_id?: string;
  incubator_id?: string;
  date_received: string;
  eggs_placed: number;
  date_placed?: string;
  expected_hatch_date?: string;
  notes?: string;
}

export interface CreateEggProduction {
  date: string;
  poultry_house_id: string;
  lot_id?: string;
  total_eggs: number;
  broken_eggs?: number;
  notes?: string;
}

export interface CreateFeedConsumption {
  date: string;
  poultry_house_id: string;
  lot_id?: string;
  product_id: string;
  bags?: number;
  kg_consumed: number;
  operator?: string;
  notes?: string;
}

export interface CreateEggSale {
  date: string;
  customer_id?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  paid_amount?: number;
  notes?: string;
}

export interface CreateAnimalSale {
  date: string;
  lot_id: string;
  customer_id?: string;
  quantity: number;
  unit_price: number;
  paid_amount?: number;
  notes?: string;
}

export interface CreateExpense {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  supplier_id?: string;
  purchase_id?: string;
  notes?: string;
}

export interface CreateRevenue {
  date: string;
  category: RevenueCategory;
  description: string;
  amount: number;
  customer_id?: string;
  sale_id?: string;
  sale_type?: string;
  notes?: string;
}

// ==================== DASHBOARD TYPES ====================

/**
 * Key Performance Indicators for the main dashboard.
 */
export interface DashboardKPIs {
  totalAnimals: number;
  animalsByHouse: { house: string; count: number; capacity: number }[];
  eggsToday: number;
  eggsThisWeek: number;
  eggsThisMonth: number;
  mortalityToday: number;
  mortalityRate: number;
  feedStock: number;
  forageStock: number;
  feedConsumptionToday: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  netResult: number;
  totalDebts: number;
  totalReceivables: number;
  activeIncubationBatches: number;
  alertCount: number;
}

// ==================== SYNC TYPES ====================

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

/**
 * Represents a local mutation intended to be synchronized with the backend.
 */
export interface QueuedMutation {
  id: string; // client-generated UUID for idempotency
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
}

// ==================== DAILY ENTRY TYPE ====================

/**
 * Payload for submitting daily records all at once.
 */
export interface DailyFarmEntry {
  date: string;
  poultry_house_id: string;
  mortality: number;
  total_eggs: number;
  broken_eggs: number;
  feed_product_id?: string;
  feed_bags: number;
  feed_kg: number;
  forage_kg: number;
  temperature?: number;
  notes?: string;
}

// ==================== REPORT TYPES ====================

export interface ReportFilters {
  start_date: string;
  end_date: string;
  poultry_house_id?: string;
  lot_id?: string;
  category?: string;
  supplier_id?: string;
  customer_id?: string;
}

/**
 * Comprehensive data structure returned for custom reports.
 */
export interface ReportData {
  animals: {
    starting_population: number;
    births: number;
    mortality: number;
    sales: number;
    ending_population: number;
  };
  production: {
    total_eggs: number;
    damaged_eggs: number;
    sellable_eggs: number;
    production_rate: number;
  };
  feed: {
    purchased_kg: number;
    consumed_kg: number;
    ending_stock: number;
    feed_cost: number;
  };
  finance: {
    revenue: number;
    expenses: number;
    debts: number;
    receivables: number;
    payments: number;
    net_result: number;
  };
  incubation: {
    eggs_incubated: number;
    hatchings: number;
    failed: number;
    hatch_rate: number;
  };
}
