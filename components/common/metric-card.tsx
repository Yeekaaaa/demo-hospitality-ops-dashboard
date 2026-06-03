import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  标题,
  数值,
  变化,
  趋势,
  数据来源,
  说明
}: {
  标题: string;
  数值: string;
  变化: string;
  /** 未指定时根据「变化」是否以 + 开头推断涨跌 */
  趋势?: "up" | "down" | "neutral";
  /** 经营实际 / 演示数据等，展示在卡片底部，不占「变化」位 */
  数据来源?: string;
  /** 无数据时的补充说明 */
  说明?: string;
}) {
  const inferred =
    趋势 ??
    (变化.startsWith("+") ? "up" : 变化.startsWith("-") ? "down" : "neutral");
  const isUp = inferred === "up";
  const isNeutral = inferred === "neutral";
  const showVariance = Boolean(变化.trim());

  if (数据来源) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{标题}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <p className="text-right text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
            {数值}
          </p>
          {说明 ? <p className="text-xs leading-snug text-muted-foreground">{说明}</p> : null}
          <div
            className={cn(
              "flex items-center gap-2 border-t border-slate-100 pt-2",
              showVariance ? "justify-between" : "justify-start"
            )}
          >
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-muted-foreground">
              {数据来源}
            </span>
            {showVariance ? (
              <p
                className={cn(
                  "flex items-center text-sm leading-snug",
                  isNeutral && "text-muted-foreground",
                  !isNeutral && isUp && "text-emerald-600",
                  !isNeutral && !isUp && "text-amber-600"
                )}
              >
                {!isNeutral &&
                  (isUp ? (
                    <ArrowUpRight className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-4 w-4" />
                  ))}
                {变化}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{标题}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3 pt-1">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{数值}</p>
        {showVariance ? (
          <p
            className={cn(
              "flex items-center text-base leading-snug",
              isNeutral && "text-muted-foreground",
              !isNeutral && isUp && "text-emerald-600",
              !isNeutral && !isUp && "text-amber-600"
            )}
          >
            {!isNeutral &&
              (isUp ? <ArrowUpRight className="mr-1 h-4 w-4" /> : <ArrowDownRight className="mr-1 h-4 w-4" />)}
            {变化}
          </p>
        ) : 说明 ? (
          <p className="max-w-[45%] text-right text-xs leading-snug text-muted-foreground">{说明}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
