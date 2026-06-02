-- actual_data：同一门店 + 账期类型 + 账期 仅允许一条经营数据（供 PostgREST upsert / onConflict 使用）
--
-- 执行前请先确认不存在违反唯一性的重复行，否则本语句会失败。可自查：
--   SELECT store_id, period_type, period_value, COUNT(*) AS n
--   FROM public.actual_data
--   GROUP BY 1, 2, 3
--   HAVING COUNT(*) > 1;
--
-- 若存在重复，需先合并或删除多余行后再执行。

CREATE UNIQUE INDEX IF NOT EXISTS actual_data_store_period_uidx
  ON public.actual_data (store_id, period_type, period_value);

-- 若你更倾向使用命名约束（与部分 ORM 习惯一致），可在确认无重复后改用下面语句之一，并删除上面的索引：
-- ALTER TABLE public.actual_data
--   ADD CONSTRAINT actual_data_store_period_unique
--   UNIQUE (store_id, period_type, period_value);
