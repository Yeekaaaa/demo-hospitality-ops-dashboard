-- 与 supabase/migrations/20260523120000_actual_data_extended_operating_fields.sql 相同，便于在 SQL Editor 中单独执行。

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS business_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS operating_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS operating_profit double precision;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS hourly_rooms_sold integer;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS overnight_rooms_sold integer;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS sales_expense double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS non_room_service_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS room_service_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS huazhu_management_fee double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS rent double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS tax_and_surcharge double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS staff_bonus double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS back_office_bonus double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS manager_bonus double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS depreciation_amortization double precision;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS other_business_income double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS management_expense double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS non_operating_income double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS net_profit double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS profit_after_amortization double precision;
