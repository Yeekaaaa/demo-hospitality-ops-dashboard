"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "下载模板", description: "获取标准 Excel 模板" },
  { id: 2, title: "填写月度数据", description: "按门店与账期填写" },
  { id: 3, title: "上传并检查", description: "上传文件查看预览" },
  { id: 4, title: "确认导入", description: "写入经营实际数据" }
] as const;

export type ImportFlowPhase = "prepare" | "preview" | "ready";

function stepVisualState(stepId: number, phase: ImportFlowPhase): "done" | "current" | "upcoming" {
  if (phase === "prepare") {
    if (stepId <= 2) return "current";
    return "upcoming";
  }
  if (phase === "preview") {
    if (stepId < 3) return "done";
    if (stepId === 3) return "current";
    return "upcoming";
  }
  if (stepId < 4) return "done";
  return "current";
}

export function ImportStepIndicator({ phase }: { phase: ImportFlowPhase }) {
  return (
    <nav aria-label="导入步骤" className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const state = stepVisualState(step.id, phase);
          return (
            <li key={step.id} className="relative flex gap-3">
              {index < STEPS.length - 1 ? (
                <span
                  className="absolute left-[1.125rem] top-9 hidden h-px w-[calc(100%-2.25rem)] bg-slate-200 lg:block"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  state === "done" && "border-emerald-600 bg-emerald-600 text-white",
                  state === "current" && "border-blue-600 bg-blue-600 text-white",
                  state === "upcoming" && "border-slate-300 bg-white text-slate-500"
                )}
              >
                {state === "done" ? <Check className="h-4 w-4" aria-hidden /> : step.id}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "current" && "text-slate-900",
                    state === "done" && "text-emerald-800",
                    state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
