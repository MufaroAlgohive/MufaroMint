-- ===========================================================================
-- Fix Family Members RLS and Add Agreement Columns
-- Run in Supabase SQL Editor
-- ===========================================================================

BEGIN;

-- 1. Add missing columns for signed agreements
DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN signed_agreement_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE family_members ADD COLUMN signed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for authenticated users
-- Remove existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can manage their own family members" ON family_members;

-- Allow users to manage (ALL: select, insert, update, delete) their own family
CREATE POLICY "Users can manage their own family members"
  ON family_members
  FOR ALL
  TO authenticated
  USING (auth.uid() = primary_user_id)
  WITH CHECK (auth.uid() = primary_user_id);

-- 4. Ensure storage bucket for agreements has proper access
-- (Assuming signed-agreements bucket already exists)
-- This allows authenticated users to upload to their own user-id folder
DO $$ BEGIN
  CREATE POLICY "Users can upload own agreements"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'signed-agreements'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own agreements"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'signed-agreements'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- SUMMARY:
-- - Added signed_agreement_url and signed_at columns.
-- - Enabled RLS on family_members table.
-- - Added "manage own family" policy for authenticated users.
-- - Added storage policies for the signed-agreements bucket.
