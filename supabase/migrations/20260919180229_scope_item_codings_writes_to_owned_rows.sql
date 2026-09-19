/*
# Require item and code ownership on item_codings writes

## Plain-English explanation

Previously, a signed-in user could create a tag assignment that referenced a
collected item and/or a code belonging to a DIFFERENT account. The write policies
only checked that the row's owner column matched the caller; they said nothing
about the `item_id` and `code_id` the caller supplied, so the only constraint on
those was the foreign keys, which verify the rows exist but not who owns them.

That also mattered because `item_codings` carries a UNIQUE(item_id, code_id)
constraint that is global rather than per-account: whoever claims a given
(item, code) pair first owns it, so an outsider could claim another account's
pair and permanently block the rightful owner from applying that tag.

This migration tightens the INSERT and UPDATE policies so BOTH referenced rows
must belong to the caller. Reads and deletes are unchanged.

## 1. Modified Tables

- `item_codings` — no columns added, removed or changed. Only policies change.

## 2. Security Changes

1. `insert_own_item_codings` — replaced. Now additionally requires that `item_id`
   references a row in `scraped_items` owned by `auth.uid()` AND that `code_id`
   references a row in `qualitative_codes` owned by `auth.uid()`.
2. `update_own_item_codings` — replaced. Same additional requirements on both the
   rows that may be targeted (USING) and the values they may become (WITH CHECK).
3. Because a pair can now only be claimed by the account that owns both sides,
   the global uniqueness constraint can no longer be used to block another user.

## 3. Important Notes

1. No behaviour change for the application. The frontend only ever tags items it
   has loaded for the current user with codes that user created
   (`handleToggleCode` in `src/App.tsx`), which satisfies the new predicates.
2. RLS remains enabled. SELECT and DELETE policies are intentionally untouched:
   they are already correctly scoped to `auth.uid() = user_id`.
3. Policies are dropped before being created so this migration is safe to re-run.
*/

-- INSERT: owner must match AND both referenced rows must belong to the caller.
DROP POLICY IF EXISTS "insert_own_item_codings" ON item_codings;
CREATE POLICY "insert_own_item_codings" ON item_codings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM scraped_items si
      WHERE si.id = item_codings.item_id
        AND si.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM qualitative_codes qc
      WHERE qc.id = item_codings.code_id
        AND qc.user_id = auth.uid()
    )
  );

-- UPDATE: same requirements on the targeted row and on the resulting row.
DROP POLICY IF EXISTS "update_own_item_codings" ON item_codings;
CREATE POLICY "update_own_item_codings" ON item_codings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM scraped_items si
      WHERE si.id = item_codings.item_id
        AND si.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM qualitative_codes qc
      WHERE qc.id = item_codings.code_id
        AND qc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM scraped_items si
      WHERE si.id = item_codings.item_id
        AND si.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM qualitative_codes qc
      WHERE qc.id = item_codings.code_id
        AND qc.user_id = auth.uid()
    )
  );
