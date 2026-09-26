/*
# Add admin role system, profiles, and API usage tracking

## Plain-English explanation

This migration introduces a role-based system so that a designated administrator can
view all users and their research data (read-only), and monitor API usage. Regular
users see NO change in behaviour.

## 1. New Tables

### profiles
- `id` (uuid, PK, references auth.users) — same as the auth user ID.
- `email` (text) — copied from auth for easy display.
- `display_name` (text) — from Google profile metadata.
- `avatar_url` (text) — from Google profile metadata.
- `role` (text, CHECK in ('admin','user'), default 'user') — determines access level.
- `created_at` (timestamptz, default now()).

### api_usage_logs
- `id` (uuid, PK).
- `user_id` (uuid, references auth.users) — who triggered the API call.
- `api_type` (text, CHECK in ('x_api','gemini')) — which external API was called.
- `endpoint` (text) — the specific endpoint or action.
- `result_count` (integer) — number of results returned.
- `created_at` (timestamptz, default now()).

## 2. New Functions

### public.is_admin()
- Returns `true` when the caller has the `admin` role in `profiles`.
- SECURITY DEFINER; fixed search_path.

### public.handle_new_user() (trigger function)
- Fires AFTER INSERT on auth.users.
- Sets role = 'admin' for d-mukai@nua.ac.jp, 'user' otherwise.

## 3. Security
- RLS on both new tables.
- profiles: SELECT allows own row or admin. No INSERT/UPDATE/DELETE for users.
- api_usage_logs: SELECT admin-only. Edge Function writes via service-role key.
- Column privilege: UPDATE on `role` revoked from authenticated and anon.
- Existing data tables: SELECT policies gain `OR is_admin()` for read-only admin access.
- INSERT/UPDATE/DELETE policies are UNCHANGED (admin has no write access).

## 4. Important Notes
1. Existing auth.users rows are backfilled into profiles.
2. Admin email is hardcoded in the trigger; change requires a new migration.
*/

-- ============================================================
-- 1. profiles table (must exist before is_admin references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Column-level security: prevent any API user from changing their own role
REVOKE UPDATE (role) ON profiles FROM authenticated;
REVOKE UPDATE (role) ON profiles FROM anon;

-- ============================================================
-- 2. Helper function: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 3. profiles RLS (needs is_admin)
-- ============================================================
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- ============================================================
-- 4. Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE WHEN NEW.email = 'd-mukai@nua.ac.jp' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO profiles (id, email, display_name, avatar_url, role)
SELECT
  id,
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', ''),
  CASE WHEN email = 'd-mukai@nua.ac.jp' THEN 'admin' ELSE 'user' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. api_usage_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type text NOT NULL CHECK (api_type IN ('x_api', 'gemini')),
  endpoint text NOT NULL DEFAULT '',
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_type ON api_usage_logs(api_type);

DROP POLICY IF EXISTS "select_api_usage_admin" ON api_usage_logs;
CREATE POLICY "select_api_usage_admin" ON api_usage_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 6. Update SELECT policies on existing data tables for admin read
-- ============================================================
DROP POLICY IF EXISTS "select_own_searches" ON searches;
CREATE POLICY "select_own_searches" ON searches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "select_own_scraped_items" ON scraped_items;
CREATE POLICY "select_own_scraped_items" ON scraped_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "select_own_qualitative_codes" ON qualitative_codes;
CREATE POLICY "select_own_qualitative_codes" ON qualitative_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "select_own_item_codings" ON item_codings;
CREATE POLICY "select_own_item_codings" ON item_codings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
