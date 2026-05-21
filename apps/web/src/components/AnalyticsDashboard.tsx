import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { BarChart3 } from "lucide-react";
import { api } from "../lib/api";
import { Panel, StatusPill } from "./ui";

export const AnalyticsDashboard = () => {
  const factors = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });
  const data = factors.data ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
      <Panel title="Factor Attribution Mock Board" action={<BarChart3 className="h-5 w-5 text-plum" />}>
        <ReactECharts
          style={{ height: 420 }}
          option={{
            tooltip: { trigger: "axis" },
            legend: { data: ["CTR", "CVR", "GMV"] },
            grid: { left: 48, right: 24, bottom: 80 },
            xAxis: { type: "category", data: data.map((item) => item.factor), axisLabel: { rotate: 24 } },
            yAxis: [
              { type: "value", name: "Rate", axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%` } },
              { type: "value", name: "GMV" }
            ],
            series: [
              { name: "CTR", type: "bar", data: data.map((item) => item.ctr), color: "#1f9d8a" },
              { name: "CVR", type: "bar", data: data.map((item) => item.cvr), color: "#6d5bd0" },
              { name: "GMV", type: "line", yAxisIndex: 1, data: data.map((item) => item.gmv), color: "#e76f51" }
            ]
          }}
        />
      </Panel>
      <Panel title="Insights">
        <div className="grid gap-3">
          {data.map((item) => (
            <div key={item.factor} className="rounded-md border border-ink/10 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong>{item.factor}</strong>
                <StatusPill tone="good">${item.gmv.toLocaleString()}</StatusPill>
              </div>
              <p className="text-sm text-ink/65">
                CTR {(item.ctr * 100).toFixed(1)}% · CVR {(item.cvr * 100).toFixed(1)}% · {item.impressions.toLocaleString()} impressions
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};
