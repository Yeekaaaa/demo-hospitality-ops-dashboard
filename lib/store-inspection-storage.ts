"use client";

export const STORE_INSPECTION_LS_KEY = "fengtin_store_inspection_v1";

export type InspectionModule =
  | "产品状态"
  | "服务状态"
  | "经营状态"
  | "团队状态"
  | "风险状态"
  | "财务异常迹象";

export type StoreInspectionRecord = {
  id: string;
  storeName: string;
  inspectionDate: string;
  inspector: string;
  module: InspectionModule;
  checklistItem: string;
  situation: string;
  isAbnormal: boolean;
  problem: string;
  suggestion: string;
  owner: string;
  dueDate: string;
};

function safeParse(raw: string | null): StoreInspectionRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof (x as StoreInspectionRecord).id === "string") as StoreInspectionRecord[];
  } catch {
    return [];
  }
}

export function loadInspections(): StoreInspectionRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORE_INSPECTION_LS_KEY));
}

export function saveInspections(rows: StoreInspectionRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_INSPECTION_LS_KEY, JSON.stringify(rows));
}

export function createInspectionId(): string {
  return `insp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const INSPECTION_MODULES: InspectionModule[] = [
  "产品状态",
  "服务状态",
  "经营状态",
  "团队状态",
  "风险状态",
  "财务异常迹象"
];
