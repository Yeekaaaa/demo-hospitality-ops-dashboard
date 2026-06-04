import { filterActiveStores } from "@/lib/active-store-scope";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

/** 惰性初始化的浏览器端 Supabase 客户端（需配置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY） */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置");
  }
  browserClient ??= createClient(url, key);
  return browserClient;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : String(v).trim();
    if (s) return s;
  }
  return undefined;
}

/** Supabase `stores` 表映射后的列表项（门店下拉等使用，独立于本地 mock） */
export interface StoreListItem {
  id: string;
  /** 数据库 `name` 列，列表主文案以此为准 */
  name: string;
  brand: string;
  city: string;
}

/** 将 `stores` 表行映射为列表项：`name` 仅取自 `name` 列 */
function mapStoresRow(row: Record<string, unknown>): StoreListItem | null {
  const id = pickString(row, ["id", "store_id"]);
  const name = pickString(row, ["name"]);
  if (!id || !name) return null;

  const brand = pickString(row, ["brand", "品牌"]) ?? "";
  const city = pickString(row, ["city", "城市"]) ?? "";

  return { id, name, brand, city };
}

/** 下拉展示：独立字段用「 · 」拼接（非 mock 的「｜」文案） */
export function formatStoreOptionLabel(s: StoreListItem): string {
  return [s.name, s.brand, s.city]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(" · ");
}

/** 从 Supabase `stores` 表读取门店列表 */
export async function getStores(): Promise<StoreListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase 环境变量未配置");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.from("stores").select("*");

  if (error) throw error;
  if (!data?.length) throw new Error("stores 表无数据");

  return getActiveStoresIncludeAll();
}

/** Supabase stores 全表（含停用演示门店等），仅管理/排错用 */
export async function getStoresIncludeAllRaw(): Promise<StoreListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase 环境变量未配置");
  }

  const client = getSupabaseClient();
  const { data, error } = await client.from("stores").select("*");

  if (error) throw error;
  if (!data?.length) throw new Error("stores 表无数据");

  return mapStoresRowsRaw(data);
}

/** 默认业务页：active-store-scope 内的在营演示门店 */
export async function getActiveStoresIncludeAll(): Promise<StoreListItem[]> {
  const raw = await getStoresIncludeAllRaw();
  const active = filterActiveStores(raw);
  if (!active.length) throw new Error("无可用经营门店（请检查 stores 表与 active-store-scope 配置）");
  return active;
}

/** @deprecated 请用 getActiveStoresIncludeAll */
export async function getStoresIncludeAll(): Promise<StoreListItem[]> {
  return getActiveStoresIncludeAll();
}

function mapStoresRowsRaw(data: Record<string, unknown>[]): StoreListItem[] {
  const mapped = data
    .map((row) => mapStoresRow(row))
    .filter((x): x is StoreListItem => x !== null);

  if (!mapped.length) throw new Error("无法解析 stores 行（需至少包含 id 与 name）");

  return mapped;
}
