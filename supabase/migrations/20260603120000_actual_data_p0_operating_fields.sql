-- P0 经营实际字段：营业外支出、财务费用、后勤管理费（单位：元，可空）

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS non_operating_expense double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS financial_expense double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS back_office_management_fee double precision;
