-- budget_data：预算目标（与 actual_data 分离，按门店+账期+预算版本唯一）

CREATE TABLE IF NOT EXISTS public.budget_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id),
  period_type text NOT NULL,
  period_value text NOT NULL,
  budget_version text NOT NULL DEFAULT 'base',
  revenue_budget numeric,
  cost_budget numeric,
  profit_budget numeric,
  room_revenue_budget numeric,
  rooms_available_budget numeric,
  rooms_sold_budget numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_data_store_period_version_uidx
    UNIQUE (store_id, period_type, period_value, budget_version)
);

CREATE INDEX IF NOT EXISTS budget_data_period_idx
  ON public.budget_data (period_type, period_value);

CREATE INDEX IF NOT EXISTS budget_data_store_idx
  ON public.budget_data (store_id);

COMMENT ON TABLE public.budget_data IS '预算目标；不得写入 actual_data';
COMMENT ON COLUMN public.budget_data.budget_version IS 'base | optimistic | conservative';
