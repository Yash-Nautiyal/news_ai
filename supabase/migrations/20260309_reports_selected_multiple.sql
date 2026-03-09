-- Allow multiple 'selected' reports per day while keeping daily/weekly/monthly
-- constrained to one per (report_type, report_date).
--
-- 1) Drop the existing UNIQUE(report_type, report_date) constraint.
--    The default name in Postgres is reports_report_type_report_date_key.
-- 2) Create a partial unique index that applies only to
--    ('daily', 'weekly', 'monthly') report types.

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_report_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS reports_report_type_report_date_unique
  ON public.reports(report_type, report_date)
  WHERE report_type IN ('daily', 'weekly', 'monthly');

