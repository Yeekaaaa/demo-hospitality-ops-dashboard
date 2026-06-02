"use client";

export const ISSUE_TRACKING_LS_KEY = "fengtin_issue_tracking_v1";
export const ISSUE_FROM_ALERT_SESSION_KEY = "fengtin_issue_from_alert_v1";

export type IssueStatus = "待处理" | "进行中" | "已完成" | "已延期";

export type IssueRecord = {
  id: string;
  description: string;
  discoveredAt: string;
  metric: string;
  cause: string;
  actions: string;
  owner: string;
  plannedAt: string;
  completedAt: string;
  retrospective: string;
  status: IssueStatus;
};

function safeParse(raw: string | null): IssueRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof (x as IssueRecord).id === "string") as IssueRecord[];
  } catch {
    return [];
  }
}

export function loadIssues(): IssueRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(ISSUE_TRACKING_LS_KEY));
}

export function saveIssues(rows: IssueRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ISSUE_TRACKING_LS_KEY, JSON.stringify(rows));
}

export function createIssueId(): string {
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type IssueDraftFromAlert = {
  description: string;
  metric: string;
  cause: string;
  owner: string;
};

export function readIssueDraftFromAlert(): IssueDraftFromAlert | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ISSUE_FROM_ALERT_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as IssueDraftFromAlert;
    if (!o || typeof o.description !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function clearIssueDraftFromAlert(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ISSUE_FROM_ALERT_SESSION_KEY);
}

export function writeIssueDraftFromAlert(draft: IssueDraftFromAlert): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ISSUE_FROM_ALERT_SESSION_KEY, JSON.stringify(draft));
}
