# Database Setup Instructions

## Step 1: Apply Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zchpcztyraleqpajcwdx
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/001_schema.sql`
5. Click **Run** (Ctrl+Enter)
6. Wait for success message

## Step 2: Apply RLS Policies

1. In SQL Editor, click **New Query**
2. Copy and paste the contents of `supabase/migrations/002_rls.sql`
3. Click **Run**

## Step 3: Apply Seed Data

1. In SQL Editor, click **New Query**
2. Copy and paste the contents of `supabase/seed.sql`
3. Click **Run**

## Step 4: Verify

Run this query in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

You should see 34 tables.

## Step 5: Create Auth User

1. Go to **Authentication** in the dashboard
2. Click **Add user** > **Create new user**
3. Enter your email and password
4. This first user will automatically get the OWNER role
