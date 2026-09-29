/*
# Add server-side aggregation views for API usage stats

Instead of fetching all raw api_usage_logs rows and aggregating
in the browser, the admin console can now query two pre-aggregated
views that do the work on the database side.

1. New Views
  - `api_usage_summary` — per api_type totals (total_calls, total_results, last_used)
  - `api_usage_daily` — per day + api_type breakdown (calls, results)

2. Security
  - Views inherit RLS from the underlying table (api_usage_logs).
  - Explicit SELECT granted to authenticated role on both views.

3. Important Notes
  - These are read-only views; no RLS enable needed on views themselves.
  - The admin-only SELECT policy on api_usage_logs already restricts access.
*/

CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  api_type,
  count(*)::int AS total_calls,
  coalesce(sum(result_count), 0)::int AS total_results,
  max(created_at) AS last_used
FROM api_usage_logs
GROUP BY api_type;

CREATE OR REPLACE VIEW api_usage_daily AS
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  api_type,
  count(*)::int AS calls,
  coalesce(sum(result_count), 0)::int AS results
FROM api_usage_logs
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

GRANT SELECT ON api_usage_summary TO authenticated;
GRANT SELECT ON api_usage_daily TO authenticated;
