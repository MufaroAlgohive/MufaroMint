-- ===========================================================================
-- Family Members + Child Dashboard — Schema Migration
-- Run in Supabase SQL Editor (safe, idempotent)
-- ===========================================================================

BEGIN;

-- ─── 1. family_members columns ─────────────────────────────────────────────

-- linked_user_id (for spouse linking)
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN linked_user_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- spouse_email
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN spouse_email text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- certificate_url (birth certificate path)
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN certificate_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- certificate_uploaded_at
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN certificate_uploaded_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- available_balance (child wallet, in cents)
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN available_balance bigint DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── 2. Foreign keys on family_members ──────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE family_members
    ADD CONSTRAINT family_members_primary_user_id_fkey
    FOREIGN KEY (primary_user_id) REFERENCES auth.users(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE family_members
    ADD CONSTRAINT family_members_linked_user_id_fkey
    FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Relationship check constraint ───────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE family_members
    ADD CONSTRAINT family_members_relationship_check
    CHECK (relationship IN ('spouse', 'child')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Unique spouse per user (conditional) ───────────────────────────────

DO $$
DECLARE dup_count int;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT primary_user_id
    FROM family_members
    WHERE relationship = 'spouse'
    GROUP BY primary_user_id
    HAVING count(*) > 1
  ) t;
  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS family_members_unique_spouse_per_user
      ON family_members (primary_user_id) WHERE (relationship = 'spouse');
  ELSE
    RAISE NOTICE 'Skipping unique spouse index — duplicate spouse rows exist. Clean them up first.';
  END IF;
END $$;

-- ─── 5. Performance indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_family_members_primary_user_id ON family_members(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_linked_user_id ON family_members(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_relationship ON family_members(relationship);
CREATE INDEX IF NOT EXISTS idx_family_members_spouse_email ON family_members(spouse_email);

-- ─── 6. family_member_id on stock_holdings ──────────────────────────────────

DO $$ BEGIN
  ALTER TABLE stock_holdings ADD COLUMN family_member_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stock_holdings
    ADD CONSTRAINT stock_holdings_family_member_id_fkey
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_holdings_family_member_id ON stock_holdings(family_member_id);

-- ─── 7. family_member_id on transactions ────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN family_member_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE transactions
    ADD CONSTRAINT transactions_family_member_id_fkey
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_family_member_id ON transactions(family_member_id);

-- ─── 8. family_member_id on user_strategies (only if table exists) ───────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_strategies') THEN
    ALTER TABLE user_strategies ADD COLUMN family_member_id uuid;
  ELSE
    RAISE NOTICE 'user_strategies table does not exist — skipping.';
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_strategies') THEN
    ALTER TABLE user_strategies
      ADD CONSTRAINT user_strategies_family_member_id_fkey
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE SET NULL NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_strategies') THEN
    CREATE INDEX IF NOT EXISTS idx_user_strategies_family_member_id ON user_strategies(family_member_id);
  END IF;
END $$;

-- ─── 9. Birth certificate storage bucket ────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'birth-certificates',
  'birth-certificates',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- ─── 10. RLS policies for birth-certificates bucket ─────────────────────────

-- Users can upload to their own folder
DO $$ BEGIN
  CREATE POLICY "Users can upload own birth certificates"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'birth-certificates'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can view their own certificates
DO $$ BEGIN
  CREATE POLICY "Users can view own birth certificates"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'birth-certificates'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own certificates
DO $$ BEGIN
  CREATE POLICY "Users can update own birth certificates"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'birth-certificates'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own certificates
DO $$ BEGIN
  CREATE POLICY "Users can delete own birth certificates"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'birth-certificates'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- ===========================================================================
-- Done! Summary of changes:
-- • family_members: linked_user_id, spouse_email, certificate_url,
--   certificate_uploaded_at, available_balance columns
-- • stock_holdings: family_member_id column (for child investments)
-- • transactions: family_member_id column (for child transactions)
-- • user_strategies: family_member_id column (if table exists)
-- • birth-certificates storage bucket (private, 10MB, PDF/JPG/PNG/HEIC)
-- • RLS policies scoped to user_id folder
-- ===========================================================================
