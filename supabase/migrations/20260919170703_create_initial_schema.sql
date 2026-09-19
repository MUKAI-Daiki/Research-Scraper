/*
# Research Scraper & Coding Studio - Initial Schema

This migration creates the complete database schema for a web scraping
and qualitative data coding application used by students for research.

## 1. New Tables

### searches
Stores each scraping search session a user performs.
- `id` (uuid, primary key) — unique identifier
- `user_id` (uuid, not null, default auth.uid()) — owner, references auth.users
- `query_and` (text[], default '{}') — AND keywords (all must match)
- `query_or` (text[], default '{}') — OR keywords (any may match)
- `query_not` (text[], default '{}') — NOT keywords (excluded)
- `selected_sources` (text[], default '{}') — source types selected (twitter, news, blog, web)
- `total_results` (integer, default 0) — number of results returned
- `created_at` (timestamptz, default now()) — when the search was run

### scraped_items
Stores individual data items collected from a search.
- `id` (uuid, primary key) — unique identifier
- `search_id` (uuid, not null) — references searches(id)
- `user_id` (uuid, not null, default auth.uid()) — owner, references auth.users
- `source_type` (text, not null) — one of: twitter, news, blog, web
- `title` (text, default '') — item title or headline
- `content` (text, default '') — full text body
- `url` (text, default '') — original source URL
- `author_name` (text, default '') — author or poster name
- `published_at` (timestamptz) — original publication date (nullable)
- `raw_metadata` (jsonb, default '{}') — any additional structured data
- `created_at` (timestamptz, default now()) — when the item was collected

### qualitative_codes
Stores user-defined qualitative codes (tags) for data analysis.
- `id` (uuid, primary key) — unique identifier
- `user_id` (uuid, not null, default auth.uid()) — owner, references auth.users
- `name` (text, not null) — display name of the code
- `color_hex` (text, not null, default '#6B7280') — color for the code badge
- `description` (text, default '') — optional description of the code
- `created_at` (timestamptz, default now()) — when the code was created

### item_codings
Junction table linking scraped_items to qualitative_codes, with per-assignment memos.
- `id` (uuid, primary key) — unique identifier
- `item_id` (uuid, not null) — references scraped_items(id)
- `code_id` (uuid, not null) — references qualitative_codes(id)
- `user_id` (uuid, not null, default auth.uid()) — owner, references auth.users
- `memo` (text, default '') — research memo for this item-code pair
- `created_at` (timestamptz, default now()) — when the coding was applied

## 2. Security
- RLS enabled on all 4 tables.
- 4 per-table policies (SELECT, INSERT, UPDATE, DELETE) scoped to authenticated role.
- All ownership checks use auth.uid() = user_id.
- Child tables (scraped_items, item_codings) also carry user_id for direct ownership checks.

## 3. Indexes
- searches: user_id, created_at
- scraped_items: search_id, user_id, source_type
- qualitative_codes: user_id
- item_codings: item_id, code_id, user_id + unique(item_id, code_id) to prevent duplicates

## 4. Important Notes
- All user_id columns default to auth.uid() so frontend inserts need not supply them.
- item_codings has a UNIQUE constraint on (item_id, code_id) to prevent duplicate tag assignments.
- CASCADE deletes: deleting a search removes its items; deleting items or codes removes their codings.
*/

-- ============================================================
-- Table: searches
-- ============================================================
CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  query_and text[] NOT NULL DEFAULT '{}',
  query_or text[] NOT NULL DEFAULT '{}',
  query_not text[] NOT NULL DEFAULT '{}',
  selected_sources text[] NOT NULL DEFAULT '{}',
  total_results integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at DESC);

DROP POLICY IF EXISTS "select_own_searches" ON searches;
CREATE POLICY "select_own_searches" ON searches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_searches" ON searches;
CREATE POLICY "insert_own_searches" ON searches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_searches" ON searches;
CREATE POLICY "update_own_searches" ON searches FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_searches" ON searches;
CREATE POLICY "delete_own_searches" ON searches FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Table: scraped_items
-- ============================================================
CREATE TABLE IF NOT EXISTS scraped_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  published_at timestamptz,
  raw_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scraped_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scraped_items_search_id ON scraped_items(search_id);
CREATE INDEX IF NOT EXISTS idx_scraped_items_user_id ON scraped_items(user_id);
CREATE INDEX IF NOT EXISTS idx_scraped_items_source_type ON scraped_items(source_type);

DROP POLICY IF EXISTS "select_own_scraped_items" ON scraped_items;
CREATE POLICY "select_own_scraped_items" ON scraped_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scraped_items" ON scraped_items;
CREATE POLICY "insert_own_scraped_items" ON scraped_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scraped_items" ON scraped_items;
CREATE POLICY "update_own_scraped_items" ON scraped_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scraped_items" ON scraped_items;
CREATE POLICY "delete_own_scraped_items" ON scraped_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Table: qualitative_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS qualitative_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color_hex text NOT NULL DEFAULT '#6B7280',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qualitative_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qualitative_codes_user_id ON qualitative_codes(user_id);

DROP POLICY IF EXISTS "select_own_qualitative_codes" ON qualitative_codes;
CREATE POLICY "select_own_qualitative_codes" ON qualitative_codes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_qualitative_codes" ON qualitative_codes;
CREATE POLICY "insert_own_qualitative_codes" ON qualitative_codes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_qualitative_codes" ON qualitative_codes;
CREATE POLICY "update_own_qualitative_codes" ON qualitative_codes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_qualitative_codes" ON qualitative_codes;
CREATE POLICY "delete_own_qualitative_codes" ON qualitative_codes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Table: item_codings
-- ============================================================
CREATE TABLE IF NOT EXISTS item_codings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES scraped_items(id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES qualitative_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  memo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, code_id)
);

ALTER TABLE item_codings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_item_codings_item_id ON item_codings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_codings_code_id ON item_codings(code_id);
CREATE INDEX IF NOT EXISTS idx_item_codings_user_id ON item_codings(user_id);

DROP POLICY IF EXISTS "select_own_item_codings" ON item_codings;
CREATE POLICY "select_own_item_codings" ON item_codings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_item_codings" ON item_codings;
CREATE POLICY "insert_own_item_codings" ON item_codings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_item_codings" ON item_codings;
CREATE POLICY "update_own_item_codings" ON item_codings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_item_codings" ON item_codings;
CREATE POLICY "delete_own_item_codings" ON item_codings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
