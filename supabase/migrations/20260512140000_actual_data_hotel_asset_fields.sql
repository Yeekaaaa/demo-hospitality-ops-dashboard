-- 酒店资产管理：actual_data 扩展字段（均可空，兼容历史行）
-- 比例类字段建议存 0–1（如 0.31 表示 31%）；与 Excel 导入解析一致。

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS ota_room_night_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS member_room_night_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS corporate_customer_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS walkin_customer_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS direct_sales_ratio double precision;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS labor_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS labor_cost_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS energy_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS energy_cost_ratio double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS breakfast_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS laundry_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS consumable_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS repair_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS marketing_cost double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS brand_fee double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS reservation_member_fee double precision;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS gop double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS gop_margin double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS noi double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS operating_cash_flow double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS capex double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS net_cash_flow double precision;

ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS negative_review_count integer;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS complaint_count integer;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS abnormal_repair_count integer;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS staff_turnover_rate double precision;
ALTER TABLE public.actual_data ADD COLUMN IF NOT EXISTS nearby_new_competitor_count integer;
