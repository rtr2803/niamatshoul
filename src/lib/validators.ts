import { z } from 'zod';

const dateSchema = z.string().min(1, 'La date est requise');
const positiveNumber = z.coerce.number().min(0, 'La valeur doit être positive ou nulle');
const strictlyPositiveNumber = z.coerce.number().gt(0, 'La valeur doit être strictement positive');
const idSchema = z.string().uuid('ID invalide').or(z.string().min(1, 'ID requis'));

export const poultryHouseSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  capacity: strictlyPositiveNumber,
  status: z.string().min(1, 'Le statut est requis'),
  notes: z.string().optional(),
});

export const animalLotSchema = z.object({
  lot_number: z.string().min(1, 'Le numéro de lot est requis'),
  house_id: idSchema,
  breed: z.string().min(1, 'La race est requise'),
  initial_quantity: strictlyPositiveNumber,
  arrival_date: dateSchema,
  expected_end_date: dateSchema.optional(),
  status: z.string().min(1, 'Le statut est requis'),
  notes: z.string().optional(),
});

export const animalLotEventSchema = z.object({
  lot_id: idSchema,
  event_type: z.string().min(1, 'Le type d\'événement est requis'),
  event_date: dateSchema,
  description: z.string().min(1, 'La description est requise'),
  cost: positiveNumber.optional(),
  notes: z.string().optional(),
});

export const incubationBatchSchema = z.object({
  batch_number: z.string().min(1, 'Le numéro de lot est requis'),
  start_date: dateSchema,
  expected_hatch_date: dateSchema,
  eggs_set: strictlyPositiveNumber,
  status: z.string().min(1, 'Le statut est requis'),
  notes: z.string().optional(),
});

export const eggProductionSchema = z.object({
  lot_id: idSchema,
  date: dateSchema,
  quantity_good: positiveNumber,
  quantity_broken: positiveNumber,
  quantity_dirty: positiveNumber,
  notes: z.string().optional(),
});

export const feedConsumptionSchema = z.object({
  lot_id: idSchema,
  product_id: idSchema,
  date: dateSchema,
  quantity: strictlyPositiveNumber,
  notes: z.string().optional(),
});

export const eggSaleSchema = z.object({
  sale_number: z.string().min(1, 'Le numéro de vente est requis'),
  customer_id: idSchema.optional(),
  date: dateSchema,
  quantity: strictlyPositiveNumber,
  unit_price: strictlyPositiveNumber,
  total_amount: strictlyPositiveNumber,
  payment_status: z.string().min(1, 'Le statut de paiement est requis'),
  notes: z.string().optional(),
});

export const animalSaleSchema = z.object({
  sale_number: z.string().min(1, 'Le numéro de vente est requis'),
  lot_id: idSchema,
  customer_id: idSchema.optional(),
  date: dateSchema,
  quantity: strictlyPositiveNumber,
  total_weight: strictlyPositiveNumber.optional(),
  unit_price: strictlyPositiveNumber,
  total_amount: strictlyPositiveNumber,
  payment_status: z.string().min(1, 'Le statut de paiement est requis'),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1, 'La catégorie est requise'),
  date: dateSchema,
  amount: strictlyPositiveNumber,
  supplier_id: idSchema.optional(),
  description: z.string().min(1, 'La description est requise'),
  payment_status: z.string().min(1, 'Le statut de paiement est requis'),
  notes: z.string().optional(),
});

export const revenueSchema = z.object({
  category: z.string().min(1, 'La catégorie est requise'),
  date: dateSchema,
  amount: strictlyPositiveNumber,
  customer_id: idSchema.optional(),
  description: z.string().min(1, 'La description est requise'),
  payment_status: z.string().min(1, 'Le statut de paiement est requis'),
  notes: z.string().optional(),
});

export const dailyEntrySchema = z.object({
  date: dateSchema,
  lot_id: idSchema,
  mortality: positiveNumber,
  eggs_produced: positiveNumber.optional(),
  feed_consumed: positiveNumber.optional(),
  water_consumed: positiveNumber.optional(),
  notes: z.string().optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const debtSchema = z.object({
  supplier_id: idSchema,
  date: dateSchema,
  amount: strictlyPositiveNumber,
  due_date: dateSchema.optional(),
  description: z.string().min(1, 'La description est requise'),
  status: z.string().min(1, 'Le statut est requis'),
});

export const debtPaymentSchema = z.object({
  debt_id: idSchema,
  date: dateSchema,
  amount: strictlyPositiveNumber,
  payment_method: z.string().min(1, 'La méthode de paiement est requise'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const receivableSchema = z.object({
  customer_id: idSchema,
  date: dateSchema,
  amount: strictlyPositiveNumber,
  due_date: dateSchema.optional(),
  description: z.string().min(1, 'La description est requise'),
  status: z.string().min(1, 'Le statut est requis'),
});

export const receivablePaymentSchema = z.object({
  receivable_id: idSchema,
  date: dateSchema,
  amount: strictlyPositiveNumber,
  payment_method: z.string().min(1, 'La méthode de paiement est requise'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const inventoryProductSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.string().min(1, 'La catégorie est requise'),
  unit: z.string().min(1, 'L\'unité est requise'),
  min_stock_level: positiveNumber,
  current_stock: positiveNumber,
  notes: z.string().optional(),
});

export const inventoryTransactionSchema = z.object({
  product_id: idSchema,
  transaction_type: z.string().min(1, 'Le type de transaction est requis'),
  quantity: strictlyPositiveNumber,
  date: dateSchema,
  unit_price: positiveNumber.optional(),
  supplier_id: idSchema.optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
