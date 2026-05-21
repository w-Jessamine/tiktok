import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { BarChart3, Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { Button, Input, Panel, StatusPill } from "./ui";

export const AnalyticsDashboard = () => {
  const queryClient = useQueryClient();
  const factors = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });
  const data = factors.data ?? [];
  const [factor, setFactor] = useState("Creator proof");
  const [impressions, setImpressions] = useState(8200);
  const [clicks, setClicks] = useState(640);
  const [conversions, setConversions] = useState(31);
  const [gmv, setGmv] = useState(8600);
  const createMetric = useMutation({
    mutationFn: () =>
      api.createMetric({
        factor,
        impressions,
        clicks,
        conversions,
        gmvCents: Math.round(gmv * 100),
        source: "manual-demo"
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["analytics"] })
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
      <Panel title="Factor Attribution Board" action={<BarChart3 className="h-5 w-5 text-plum" />}>
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

      <div className="grid gap-5">
        <Panel title="Data Backflow">
          <div className="grid gap-3">
            <Input value={factor} onChange={(event) => setFactor(event.target.value)} placeholder="Creative factor" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={impressions} onChange={(event) => setImpressions(Number(event.target.value))} />
              <Input type="number" value={clicks} onChange={(event) => setClicks(Number(event.target.value))} />
              <Input type="number" value={conversions} onChange={(event) => setConversions(Number(event.target.value))} />
              <Input type="number" value={gmv} onChange={(event) => setGmv(Number(event.target.value))} />
            </div>
            <Button disabled={createMetric.isPending} onClick={() => createMetric.mutate()}>
              <Plus className="h-4 w-4" />
              Feed metric
            </Button>
          </div>
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
                  CTR {(item.ctr * 100).toFixed(1)}% · CVR {(item.cvr * 100).toFixed(1)}% ·{" "}
                  {item.impressions.toLocaleString()} impressions · {item.sources?.join(", ") ?? "seed"}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};
