import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { QualityIssue } from "@/lib/data-quality";

export function DataQualityBanner({ issues }: { issues: QualityIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        <span>数据完整</span>
      </div>
    );
  }

  const text = issues
    .slice(0, 4)
    .map((i) => `${i.月份}${i.指标}：${i.类型}`)
    .join("；");

  return (
    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">数据质量提示</span>
      </div>
      <p>{text}{issues.length > 4 ? `；另有 ${issues.length - 4} 项` : ""}</p>
    </div>
  );
}
