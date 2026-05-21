import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Film, Play } from "lucide-react";
import { useState } from "react";
import { api, type ProductDto } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Panel, Select, StatusPill } from "./ui";

export const CreationStudio = ({ products }: { products: ProductDto[] }) => {
  const selectedProductId = useAppStore((state) => state.selectedProductId);
  const selectedScriptId = useAppStore((state) => state.selectedScriptId);
  const setSelectedProductId = useAppStore((state) => state.setSelectedProductId);
  const setSelectedScriptId = useAppStore((state) => state.setSelectedScriptId);
  const [aspectRatio, setAspectRatio] = useState<"VERTICAL_9_16" | "HORIZONTAL_16_9">(
    "VERTICAL_9_16"
  );
  const scriptsQuery = useQuery({
    queryKey: ["scripts", selectedProductId],
    queryFn: () => api.scripts(selectedProductId),
    enabled: Boolean(selectedProductId)
  });
  const exportsQuery = useQuery({
    queryKey: ["exports", selectedScriptId],
    queryFn: () => api.exports(selectedScriptId),
    enabled: Boolean(selectedScriptId),
    refetchInterval: 3000
  });

  const generate = useMutation({
    mutationFn: () =>
      api.generateVideo({
        productId: selectedProductId!,
        scriptId: selectedScriptId!,
        aspectRatio,
        resolution: aspectRatio === "VERTICAL_9_16" ? "720x1280" : "1280x720"
      }),
    onSuccess: (job) => {
      useAppStore.getState().setActiveJobId(job.id);
      useAppStore.getState().setView("jobs");
    }
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.5fr]">
      <Panel title="One-click Video Creation" action={<Film className="h-5 w-5 text-coral" />}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Product
            <Select
              value={selectedProductId ?? ""}
              onChange={(event) => setSelectedProductId(event.target.value || undefined)}
            >
              <option value="">Choose product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Script
            <Select
              value={selectedScriptId ?? ""}
              onChange={(event) => setSelectedScriptId(event.target.value || undefined)}
            >
              <option value="">Choose script</option>
              {scriptsQuery.data?.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Aspect ratio
            <Select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as typeof aspectRatio)}
            >
              <option value="VERTICAL_9_16">Vertical 9:16 · 720x1280</option>
              <option value="HORIZONTAL_16_9">Horizontal 16:9 · 1280x720</option>
            </Select>
          </label>
          <Button
            disabled={!selectedProductId || !selectedScriptId || generate.isPending}
            onClick={() => generate.mutate()}
          >
            <Play className="h-4 w-4" />
            {generate.isPending ? "Queuing..." : "Generate video"}
          </Button>
        </div>
      </Panel>

      <Panel title="Preview & Export">
        <div className="grid gap-4">
          {exportsQuery.data?.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-md border border-ink/10 p-4 lg:grid-cols-[220px_1fr]"
            >
              <div className="aspect-[9/16] overflow-hidden rounded-md bg-ink">
                <video
                  src={item.fileUrl}
                  poster={item.coverUrl ?? undefined}
                  controls
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid content-start gap-3">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="good">{item.aspectRatio}</StatusPill>
                  <StatusPill>{item.resolution}</StatusPill>
                  <StatusPill>{(item.durationMs / 1000).toFixed(1)}s</StatusPill>
                </div>
                <p className="text-sm text-ink/65">
                  Export is ready for TikTok Shop listing posts, ads experiments or merchant review.
                </p>
                <a href={item.fileUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary">
                    <Download className="h-4 w-4" />
                    Open export
                  </Button>
                </a>
              </div>
            </article>
          ))}
          {!exportsQuery.data?.length && (
            <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
              Generated exports appear here after the worker finishes rendering.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
