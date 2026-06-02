import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({
  标题,
  说明 = "模块开发中，后续将接入业务数据与流程。"
}: {
  标题: string;
  说明?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{标题}</h1>
        <p className="text-sm text-muted-foreground">{说明}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>功能占位</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[200px] rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          此处为演示占位，路由已就绪，可继续扩展列表、表单与权限控制。
        </CardContent>
      </Card>
    </div>
  );
}
