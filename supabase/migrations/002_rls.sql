-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE poultry_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubators ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_lot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_forage ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE poultry_houses FORCE ROW LEVEL SECURITY;
ALTER TABLE animal_types FORCE ROW LEVEL SECURITY;
ALTER TABLE animal_breeds FORCE ROW LEVEL SECURITY;
ALTER TABLE incubators FORCE ROW LEVEL SECURITY;
ALTER TABLE animal_lots FORCE ROW LEVEL SECURITY;
ALTER TABLE animal_lot_events FORCE ROW LEVEL SECURITY;
ALTER TABLE incubation_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE incubation_events FORCE ROW LEVEL SECURITY;
ALTER TABLE egg_production FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_products FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE feed_consumption FORCE ROW LEVEL SECURITY;
ALTER TABLE green_forage FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE purchase_items FORCE ROW LEVEL SECURITY;
ALTER TABLE egg_sales FORCE ROW LEVEL SECURITY;
ALTER TABLE animal_sales FORCE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE revenues FORCE ROW LEVEL SECURITY;
ALTER TABLE debts FORCE ROW LEVEL SECURITY;
ALTER TABLE debt_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE receivables FORCE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE alert_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE farm FORCE ROW LEVEL SECURITY;
ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;

-- Create helper function for OWNER check
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'OWNER'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles Policies
CREATE POLICY "Everyone authenticated can see all profiles"
ON profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Prevent role update via trigger since RLS policy cannot restrict column updates directly
CREATE OR REPLACE FUNCTION prevent_role_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'You are not allowed to change your role.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_role_update
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_update();

-- Audit Logs Policies
CREATE POLICY "All authenticated users can select audit_logs"
ON audit_logs FOR SELECT TO authenticated
USING (true);
-- No INSERT, UPDATE, DELETE policies means they are denied by default for API

-- Farm and App Settings Policies
CREATE POLICY "Authenticated users can view farm" ON farm FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only OWNER can insert farm" ON farm FOR INSERT TO authenticated WITH CHECK (is_owner());
CREATE POLICY "Only OWNER can update farm" ON farm FOR UPDATE TO authenticated USING (is_owner());

CREATE POLICY "Authenticated users can view app_settings" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only OWNER can insert app_settings" ON app_settings FOR INSERT TO authenticated WITH CHECK (is_owner());
CREATE POLICY "Only OWNER can update app_settings" ON app_settings FOR UPDATE TO authenticated USING (is_owner());

-- Macro to create policies for operational tables
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'poultry_houses', 'animal_types', 'animal_breeds', 'incubators', 'animal_lots', 
        'animal_lot_events', 'incubation_batches', 'incubation_events', 'egg_production', 
        'inventory_categories', 'inventory_products', 'inventory_transactions', 
        'feed_consumption', 'green_forage', 'suppliers', 'customers', 'purchases', 
        'purchase_items', 'egg_sales', 'animal_sales', 'expenses', 'revenues', 
        'debts', 'debt_payments', 'receivables', 'receivable_payments', 
        'financial_transactions', 'notifications', 'alert_rules', 'push_subscriptions'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "All authenticated users can select %I" ON %I FOR SELECT TO authenticated USING (true);', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only OWNER can insert %I" ON %I FOR INSERT TO authenticated WITH CHECK (is_owner());', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only OWNER can update %I" ON %I FOR UPDATE TO authenticated USING (is_owner());', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only OWNER can delete %I" ON %I FOR DELETE TO authenticated USING (is_owner());', table_name, table_name);
    END LOOP;
END
$$;
