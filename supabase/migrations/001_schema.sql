-- 001_schema.sql
-- Initial Schema for Ferme Management ERP

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- SHARED FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit Logging Function
CREATE OR REPLACE FUNCTION audit_log_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data jsonb := NULL;
  new_data jsonb := NULL;
  current_user_id uuid;
BEGIN
  -- Attempt to get user from Supabase auth context if available
  BEGIN
    current_user_id := current_setting('request.jwt.claim.sub', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (
    user_id,
    table_name,
    action,
    record_id,
    old_values,
    new_values
  ) VALUES (
    current_user_id,
    TG_TABLE_NAME::text,
    TG_OP::text,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- TABLES (IN DEPENDENCY ORDER)
-- ==========================================

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- references auth.users(id) handled in Supabase separately or manually mapped
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'PARTNER')) DEFAULT 'PARTNER',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. farm
CREATE TABLE farm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Ferme Avicole',
  area_hectares NUMERIC(10,2) DEFAULT 3.00,
  currency TEXT DEFAULT 'MAD',
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. app_settings
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. poultry_houses
CREATE TABLE poultry_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  house_type TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 5. animal_types
CREATE TABLE animal_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. animal_breeds
CREATE TABLE animal_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_type_id UUID REFERENCES animal_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(animal_type_id, name)
);

-- 7. incubators
CREATE TABLE incubators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 8. suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 9. customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Forward declarations for circular references (using UUID columns)
-- 12. incubation_batches
CREATE TABLE incubation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  incubator_id UUID REFERENCES incubators(id) ON DELETE SET NULL,
  date_received DATE NOT NULL,
  eggs_placed INTEGER NOT NULL CHECK (eggs_placed > 0),
  date_placed DATE,
  expected_hatch_date DATE,
  actual_hatch_date DATE,
  eggs_hatched INTEGER DEFAULT 0 CHECK (eggs_hatched >= 0),
  eggs_failed INTEGER DEFAULT 0 CHECK (eggs_failed >= 0),
  hatch_rate NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN eggs_placed > 0 THEN (eggs_hatched::NUMERIC / eggs_placed * 100) ELSE 0 END) STORED,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'incubating', 'hatching', 'completed', 'failed', 'cancelled')),
  result_lot_id UUID, -- References animal_lots, FK added below
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 10. animal_lots
CREATE TABLE animal_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number TEXT NOT NULL UNIQUE,
  animal_type_id UUID REFERENCES animal_types(id) ON DELETE RESTRICT,
  breed_id UUID REFERENCES animal_breeds(id) ON DELETE RESTRICT,
  sex TEXT CHECK (sex IN ('male', 'female', 'mixed', 'unknown')),
  birth_date DATE,
  origin TEXT,
  source_batch_id UUID REFERENCES incubation_batches(id) ON DELETE SET NULL,
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
  current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  poultry_house_id UUID REFERENCES poultry_houses(id) ON DELETE SET NULL,
  acquisition_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'transferred', 'deceased', 'archived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Resolve circular FK
ALTER TABLE incubation_batches 
ADD CONSTRAINT fk_result_lot 
FOREIGN KEY (result_lot_id) 
REFERENCES animal_lots(id) ON DELETE SET NULL;


-- 11. animal_lot_events
CREATE TABLE animal_lot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES animal_lots(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('INITIAL_STOCK', 'HATCH', 'PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'MORTALITY', 'SALE', 'ADJUSTMENT')),
  quantity INTEGER NOT NULL,
  date DATE NOT NULL,
  poultry_house_id UUID REFERENCES poultry_houses(id) ON DELETE SET NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 13. incubation_events
CREATE TABLE incubation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES incubation_batches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('RECEIVED', 'PLACED', 'CANDLING', 'HATCHING_STARTED', 'HATCHED', 'FAILED', 'NOTE')),
  date DATE NOT NULL,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 14. egg_production
CREATE TABLE egg_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  poultry_house_id UUID NOT NULL REFERENCES poultry_houses(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES animal_lots(id) ON DELETE SET NULL,
  total_eggs INTEGER NOT NULL CHECK (total_eggs >= 0),
  broken_eggs INTEGER NOT NULL DEFAULT 0 CHECK (broken_eggs >= 0),
  sellable_eggs INTEGER GENERATED ALWAYS AS (total_eggs - broken_eggs) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(date, poultry_house_id)
);

-- 15. inventory_categories
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. inventory_products
CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  package_size NUMERIC(10,2),
  package_unit TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12,2),
  current_stock NUMERIC(12,2) DEFAULT 0,
  reorder_level NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 17. inventory_transactions
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('PURCHASE', 'CONSUMPTION', 'LOSS', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'RETURN')),
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2),
  total_price NUMERIC(12,2),
  date DATE NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 18. feed_consumption
CREATE TABLE feed_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  poultry_house_id UUID NOT NULL REFERENCES poultry_houses(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES animal_lots(id) ON DELETE SET NULL,
  product_id UUID REFERENCES inventory_products(id) ON DELETE RESTRICT,
  bags NUMERIC(10,2) DEFAULT 0,
  kg_consumed NUMERIC(10,2) NOT NULL CHECK (kg_consumed >= 0),
  operator TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 19. green_forage
CREATE TABLE green_forage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  poultry_house_id UUID REFERENCES poultry_houses(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES animal_lots(id) ON DELETE SET NULL,
  estimated_kg NUMERIC(10,2) NOT NULL CHECK (estimated_kg >= 0),
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 20. purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 21. purchase_items
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. egg_sales
CREATE TABLE egg_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE,
  date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'oeuf',
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 23. animal_sales
CREATE TABLE animal_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE,
  date DATE NOT NULL,
  lot_id UUID NOT NULL REFERENCES animal_lots(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 24. expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fertilized_eggs', 'feed', 'forage', 'medication', 'vaccines', 'equipment', 'transport', 'utilities', 'labor', 'maintenance', 'miscellaneous')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 25. revenues
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('egg_sales', 'animal_sales', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id UUID,
  sale_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 26. debts
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 27. debt_payments
CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 28. receivables
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id UUID,
  sale_type TEXT,
  date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 29. receivable_payments
CREATE TABLE receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 30. financial_transactions
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE', 'DEBT_PAYMENT', 'RECEIVABLE_PAYMENT')),
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 31. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  related_entity_type TEXT,
  related_entity_id UUID,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 32. alert_rules
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  threshold JSONB,
  severity TEXT DEFAULT 'warning',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 33. push_subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 34. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_animal_lots_house ON animal_lots(poultry_house_id);
CREATE INDEX idx_animal_lots_type ON animal_lots(animal_type_id);
CREATE INDEX idx_animal_lot_events_lot ON animal_lot_events(lot_id);
CREATE INDEX idx_animal_lot_events_date ON animal_lot_events(date);
CREATE INDEX idx_animal_lot_events_type ON animal_lot_events(event_type);
CREATE INDEX idx_incubation_batches_status ON incubation_batches(status);
CREATE INDEX idx_incubation_batches_supplier ON incubation_batches(supplier_id);
CREATE INDEX idx_egg_production_date ON egg_production(date);
CREATE INDEX idx_egg_production_house ON egg_production(poultry_house_id);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(date);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_feed_consumption_date ON feed_consumption(date);
CREATE INDEX idx_feed_consumption_house ON feed_consumption(poultry_house_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_egg_sales_date ON egg_sales(date);
CREATE INDEX idx_egg_sales_customer ON egg_sales(customer_id);
CREATE INDEX idx_animal_sales_date ON animal_sales(date);
CREATE INDEX idx_animal_sales_lot ON animal_sales(lot_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_revenues_date ON revenues(date);
CREATE INDEX idx_debts_supplier ON debts(supplier_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_receivables_customer ON receivables(customer_id);
CREATE INDEX idx_receivables_status ON receivables(status);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);


-- ==========================================
-- COMPUTATION TRIGGERS
-- ==========================================

-- 1. Animal Lot Quantities
CREATE OR REPLACE FUNCTION recalc_lot_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE animal_lots 
    SET current_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM animal_lot_events WHERE lot_id = OLD.lot_id)
    WHERE id = OLD.lot_id;
    RETURN OLD;
  ELSE
    UPDATE animal_lots 
    SET current_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM animal_lot_events WHERE lot_id = NEW.lot_id)
    WHERE id = NEW.lot_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lot_quantity_trigger
AFTER INSERT OR UPDATE OR DELETE ON animal_lot_events
FOR EACH ROW EXECUTE FUNCTION recalc_lot_quantity();


-- 2. Inventory Stock
CREATE OR REPLACE FUNCTION recalc_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE inventory_products 
    SET current_stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    UPDATE inventory_products 
    SET current_stock = (SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_stock_trigger
AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION recalc_inventory_stock();


-- 3. Debts
CREATE OR REPLACE FUNCTION recalc_debt_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_debt_id uuid;
  v_total numeric;
  v_paid numeric;
BEGIN
  v_debt_id := COALESCE(NEW.debt_id, OLD.debt_id);
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM debt_payments WHERE debt_id = v_debt_id;
  
  -- Get total debt amount
  SELECT total_amount INTO v_total FROM debts WHERE id = v_debt_id;
  
  -- Update debt
  UPDATE debts SET 
    paid_amount = v_paid,
    remaining_amount = v_total - v_paid,
    status = CASE 
      WHEN v_paid >= v_total THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = v_debt_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_debt_paid_trigger
AFTER INSERT OR UPDATE OR DELETE ON debt_payments
FOR EACH ROW EXECUTE FUNCTION recalc_debt_amounts();


-- 4. Receivables
CREATE OR REPLACE FUNCTION recalc_receivable_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_rec_id uuid;
  v_total numeric;
  v_paid numeric;
BEGIN
  v_rec_id := COALESCE(NEW.receivable_id, OLD.receivable_id);
  
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM receivable_payments WHERE receivable_id = v_rec_id;
  SELECT total_amount INTO v_total FROM receivables WHERE id = v_rec_id;
  
  UPDATE receivables SET 
    paid_amount = v_paid,
    remaining_amount = v_total - v_paid,
    status = CASE 
      WHEN v_paid >= v_total THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = v_rec_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receivable_paid_trigger
AFTER INSERT OR UPDATE OR DELETE ON receivable_payments
FOR EACH ROW EXECUTE FUNCTION recalc_receivable_amounts();


-- Compute total/remaining amount triggers for sales/purchases
CREATE OR REPLACE FUNCTION compute_purchase_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount = NEW.total_amount - NEW.paid_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_purchase_totals_trigger
BEFORE INSERT OR UPDATE ON purchases
FOR EACH ROW EXECUTE FUNCTION compute_purchase_totals();


CREATE OR REPLACE FUNCTION compute_sale_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount = NEW.quantity * NEW.unit_price;
  NEW.remaining_amount = NEW.total_amount - NEW.paid_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_egg_sale_totals_trigger
BEFORE INSERT OR UPDATE ON egg_sales
FOR EACH ROW EXECUTE FUNCTION compute_sale_totals();

CREATE TRIGGER compute_animal_sale_totals_trigger
BEFORE INSERT OR UPDATE ON animal_sales
FOR EACH ROW EXECUTE FUNCTION compute_sale_totals();


CREATE OR REPLACE FUNCTION compute_purchase_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_purchase_item_totals_trigger
BEFORE INSERT OR UPDATE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION compute_purchase_item_totals();


-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at_%s
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- AUDIT LOGGING TRIGGERS
-- ==========================================

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'audit_logs'
  LOOP
    EXECUTE format('
      CREATE TRIGGER audit_%s
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION audit_log_function();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
