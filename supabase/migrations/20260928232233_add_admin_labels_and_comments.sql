/*
# Add admin labels and admin comments

Enables administrators to provide feedback on user-collected articles:
- Admin labels: visually distinct tags that admins can attach to any scraped item
- Admin comments: free-text comments admins can leave on any scraped item

1. New Tables
  - `admin_labels`
    - `id` (uuid, primary key)
    - `item_id` (uuid, FK to scraped_items, not null) - the article being labeled
    - `admin_user_id` (uuid, FK to auth.users, not null, defaults to auth.uid()) - the admin who created it
    - `label_name` (text, not null) - label text
    - `color_hex` (text, not null, default '#F59E0B') - amber default to distinguish from user codes
    - `created_at` (timestamptz)
  - `admin_comments`
    - `id` (uuid, primary key)
    - `item_id` (uuid, FK to scraped_items, not null) - the article being commented on
    - `admin_user_id` (uuid, FK to auth.users, not null, defaults to auth.uid()) - the admin who wrote it
    - `comment_text` (text, not null) - comment content
    - `created_at` (timestamptz)

2. Security
  - RLS enabled on both tables.
  - SELECT: admin (via is_admin()) OR owner of the scraped_item (so users see admin feedback)
  - INSERT: admin only
  - UPDATE: admin who created the row only
  - DELETE: admin who created the row only

3. Indexes
  - item_id on both tables for fast lookups
*/

-- admin_labels
CREATE TABLE IF NOT EXISTS admin_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES scraped_items(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label_name text NOT NULL,
  color_hex text NOT NULL DEFAULT '#F59E0B',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_labels_item_id ON admin_labels(item_id);

ALTER TABLE admin_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_labels" ON admin_labels;
CREATE POLICY "select_admin_labels" ON admin_labels FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM scraped_items
      WHERE scraped_items.id = admin_labels.item_id
        AND scraped_items.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_admin_labels" ON admin_labels;
CREATE POLICY "insert_admin_labels" ON admin_labels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_admin_labels" ON admin_labels;
CREATE POLICY "update_admin_labels" ON admin_labels FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND admin_user_id = auth.uid())
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_admin_labels" ON admin_labels;
CREATE POLICY "delete_admin_labels" ON admin_labels FOR DELETE
  TO authenticated
  USING (public.is_admin() AND admin_user_id = auth.uid());

-- admin_comments
CREATE TABLE IF NOT EXISTS admin_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES scraped_items(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_comments_item_id ON admin_comments(item_id);

ALTER TABLE admin_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_comments" ON admin_comments;
CREATE POLICY "select_admin_comments" ON admin_comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM scraped_items
      WHERE scraped_items.id = admin_comments.item_id
        AND scraped_items.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_admin_comments" ON admin_comments;
CREATE POLICY "insert_admin_comments" ON admin_comments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_admin_comments" ON admin_comments;
CREATE POLICY "update_admin_comments" ON admin_comments FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND admin_user_id = auth.uid())
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_admin_comments" ON admin_comments;
CREATE POLICY "delete_admin_comments" ON admin_comments FOR DELETE
  TO authenticated
  USING (public.is_admin() AND admin_user_id = auth.uid());
