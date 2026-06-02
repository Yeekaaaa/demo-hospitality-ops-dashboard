"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildBossCockpitBriefing,
  type BuildBossBriefingArgs
} from "@/lib/dashboard-boss-briefing";

export function BossCockpitBriefingCard(props: BuildBossBriefingArgs) {
  const lines = buildBossCockpitBriefing(props);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">老板经营简报</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          以下由当期驾驶舱数据规则生成，便于您用五分钟把握要点；与下方图表及预警模块口径一致。
        </p>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-3 pl-5 text-base leading-7 text-slate-800 marker:font-semibold marker:text-slate-600">
          {lines.map((line) => (
            <li key={line.heading} className="pl-1">
              <span className="font-semibold text-slate-900">{line.heading}</span>
              <span className="text-muted-foreground"> — </span>
              {line.body}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
