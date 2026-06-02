import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  标题,
  数值,
  变化,
  趋势
}: {
  标题: string;
  数值: string;
  变化: string;
  /** 未指定时根据「变化」是否以 + 开头推断涨跌 */
  趋势?: "up" | "down" | "neutral";
}) {
  const inferred =
    趋势 ??
    (变化.startsWith("+") ? "up" : 变化.startsWith("-") ? "down" : "neutral");
  const isUp = inferred === "up";
  const isNeutral = inferred === "neutral";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{标题}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3 pt-1">
        <p className="text-3xl font-semibold tracking-tight">{数值}</p>
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
      </CardContent>
    </Card>
  );
}
