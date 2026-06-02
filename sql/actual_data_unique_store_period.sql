-- 与 supabase/migrations/20260512120000_actual_data_unique_store_period.sql 相同，便于在 SQL Editor 中单独执行。

CREATE UNIQUE INDEX IF NOT EXISTS actual_data_store_period_uidx
  ON public.actual_data (store_id, period_type, period_value);
