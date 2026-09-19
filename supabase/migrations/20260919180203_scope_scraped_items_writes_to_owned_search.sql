/*
# Require parent search ownership on scraped_items writes

## Plain-English explanation

Previously, a signed-in user could save a collected item that pointed at a
search session belonging to a DIFFERENT account. The write policies only checked
that the row's owner column matched the caller; they said nothing about the
`search_id` the caller supplied, so the only constraint on it was the foreign
key, which verifies that the search exists but not who owns it.

This migration tightens the INSERT and UPDATE policies on `scraped_items` so the
referenced search must ALSO belong to the caller. Reads and deletes are unchanged.

## 1. Modified Tables

- `scraped_items` — no columns added, removed or changed. Only policies change.

## 2. Security Changes

1. `insert_own_scraped_items` — replaced. Now additionally requires that
   `search_id` references a row in `searches` owned by `auth.uid()`.
2. `update_own_scraped_items` — replaced. Same additional requirement on both the
   rows that may be targeted (USING) and the values they may become (WITH CHECK),
   so an item cannot be moved into another account's search session.

## 3. Important Notes

1. No behaviour change for the application. The frontend always inserts items
   using the `search_id` of the search row it just created for the current user
   (`src/App.tsx`), which satisfies the new predicate.
2. RLS remains enabled. SELECT and DELETE policies are intentionally untouched:
   they are already correctly scoped to `auth.uid() = user_id`.
3. Policies are dropped before being created so this migration is safe to re-run.
*/

-- INSERT: owner must match AND the parent search must belong to the caller.
DROP POLICY IF EXISTS "insert_own_scraped_items" ON scraped_items;
CREATE POLICY "insert_own_scraped_items" ON scraped_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM searches s
      WHERE s.id = scraped_items.search_id
        AND s.user_id = auth.uid()
    )
  );

-- UPDATE: same requirement on the targeted row and on the resulting row.
DROP POLICY IF EXISTS "update_own_scraped_items" ON scraped_items;
CREATE POLICY "update_own_scraped_items" ON scraped_items FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM searches s
      WHERE s.id = scraped_items.search_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM searches s
      WHERE s.id = scraped_items.search_id
        AND s.user_id = auth.uid()
    )
  );
