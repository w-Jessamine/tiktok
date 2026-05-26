import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Film, FlaskConical, Play, Trophy, Volume2 } from "lucide-react";
import { useState } from "react";
import { api, type ProductDto, type VideoExportDto } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Panel, Select, StatusPill } from "./ui";

const renderSourceCopy = {
  ARK_GENERATED: {
    label: "Ark/Seedance generated",
    tone: "good" as const,
    description:
      "Every storyboard shot was rendered from Ark video clips and assembled for export.",
    action: "Open Ark export"
  },
  HYBRID_MIX: {
    label: "Hybrid mix",
    tone: "warn" as const,
    description:
      "This export combines Ark clips, merchant material, or local fallback shots. Read the job trace before treating it as a full Seedance result.",
    action: "Open hybrid preview"
  },
  MATERIAL_MIX: {
    label: "Material mix",
    tone: "good" as const,
    description:
      "Export uses merchant/uploaded product materials with motion, subtitles and audio.",
    action: "Open material-mix export"
  },
  DYNAMIC_FALLBACK: {
    label: "Local fallback preview",
    tone: "warn" as const,
    description:
      "This is a local animated storyboard preview. Use real product media or Ark video for final visual quality.",
    action: "Open fallback preview"
  },
  STORYBOARD_FALLBACK: {
    label: "Storyboard fallback",
    tone: "bad" as const,
    description:
      "This is the last-resort text storyboard path and should not be used as the final demo output.",
    action: "Open storyboard fallback"
  }
};

export const CreationStudio = ({ products }: { products: ProductDto[] }) => {
  const queryClient = useQueryClient();
  const selectedProductId = useAppStore((state) => state.selectedProductId);
  const selectedScriptId = useAppStore((state) => state.selectedScriptId);
  const setSelectedProductId = useAppStore((state) => state.setSelectedProductId);
  const setSelectedScriptId = useAppStore((state) => state.setSelectedScriptId);
  const [aspectRatio, setAspectRatio] = useState<"VERTICAL_9_16" | "HORIZONTAL_16_9">(
    "VERTICAL_9_16"
  );
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [experimentId, setExperimentId] = useState<string | null>(null);

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
  const experimentQuery = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => api.experiment(experimentId!),
    enabled: Boolean(experimentId),
    refetchInterval: 3000
  });

  const generate = useMutation({
    mutationFn: () =>
      api.generateVideo({
        productId: selectedProductId!,
        scriptId: selectedScriptId!,
        aspectRatio,
        resolution: aspectRatio === "VERTICAL_9_16" ? "720x1280" : "1280x720",
        voiceEnabled,
        bgmEnabled,
        voiceLocale: "en-US",
        bgmMood: "upbeat",
        audioMix: { voiceVolume: 0.9, bgmVolume: 0.18 }
      }),
    onSuccess: (job) => {
      useAppStore.getState().setActiveJobId(job.id);
      useAppStore.getState().setView("jobs");
    }
  });

  const createExperiment = useMutation({
    mutationFn: () =>
      api.createExperiment({
        productId: selectedProductId!,
        goal: "Find the best conversion angle for a short TikTok Shop product video",
        variantCount: 2,
        aspectRatio,
        voiceEnabled,
        bgmEnabled
      }),
    onSuccess: async (result) => {
      setExperimentId(result.experiment.id);
      const firstJobId = result.variants.find((variant) => variant.jobId)?.jobId;
      if (firstJobId) {
        useAppStore.getState().setActiveJobId(firstJobId);
      }
      await queryClient.invalidateQueries({ queryKey: ["scripts"] });
      await queryClient.invalidateQueries({ queryKey: ["exports"] });
    }
  });

  const variants = experimentQuery.data?.variants ?? [];
  const winner = variants
    .map((variant) => ({
      ...variant,
      score:
        Number(variant.metricSummary.ctr ?? 0) * 100 +
        Number(variant.metricSummary.cvr ?? 0) * 180 +
        Number(variant.metricSummary.gmv ?? 0) / 1000
    }))
    .sort((a, b) => b.score - a.score)[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.5fr]">
      <Panel title="Source-Labeled Video Export" action={<Film className="h-5 w-5 text-coral" />}>
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
              <option value="VERTICAL_9_16">Vertical 9:16 / 720x1280</option>
              <option value="HORIZONTAL_16_9">Horizontal 16:9 / 1280x720</option>
            </Select>
          </label>
          <div className="grid gap-2 rounded-md bg-mist p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                TTS voiceover
              </span>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(event) => setVoiceEnabled(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              BGM bed
              <input
                type="checkbox"
                checked={bgmEnabled}
                onChange={(event) => setBgmEnabled(event.target.checked)}
              />
            </label>
          </div>
          <Button
            disabled={!selectedProductId || !selectedScriptId || generate.isPending}
            onClick={() => generate.mutate()}
          >
            <Play className="h-4 w-4" />
            {generate.isPending ? "Queuing export..." : "Queue labeled export"}
          </Button>
          <Button
            variant="secondary"
            disabled={!selectedProductId || createExperiment.isPending}
            onClick={() => createExperiment.mutate()}
          >
            <FlaskConical className="h-4 w-4" />
            {createExperiment.isPending ? "Creating variants..." : "Queue labeled A/B variants"}
          </Button>
        </div>
      </Panel>

      <Panel title="Preview & Export Source">
        <div className="grid gap-4">
          {variants.length > 0 && (
            <div className="rounded-md border border-mint/30 bg-mint/5 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Trophy className="h-4 w-4 text-mint" />
                <strong>Demo winner estimate</strong>
                {winner && <StatusPill tone="good">{winner.name}</StatusPill>}
              </div>
              <p className="text-sm text-ink/65">
                Winner is estimated from CTR, CVR and GMV. Import real campaign metrics in Analytics
                to replace the mock estimate.
              </p>
            </div>
          )}

          {variants.map((variant) => (
            <article key={variant.id} className="rounded-md border border-ink/10 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <strong>{variant.name}</strong>
                <div className="flex flex-wrap gap-2">
                  {variant.generationJobs?.[0] && (
                    <StatusPill>{variant.generationJobs[0].status}</StatusPill>
                  )}
                  <StatusPill tone="good">
                    CTR {(Number(variant.metricSummary.ctr ?? 0.06) * 100).toFixed(1)}%
                  </StatusPill>
                  <StatusPill>
                    GMV ${Number(variant.metricSummary.gmv ?? 0).toLocaleString()}
                  </StatusPill>
                </div>
              </div>
              <p className="text-sm text-ink/65">
                {Object.entries(variant.factors)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" / ")}
              </p>
            </article>
          ))}

          {exportsQuery.data?.map((item) => (
            <ExportCard key={item.id} item={item} />
          ))}
          {!exportsQuery.data?.length && variants.length === 0 && (
            <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
              Labeled exports appear here after rendering. Check the source pill before treating any
              MP4 as an Ark/Seedance output.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};

const ExportCard = ({ item }: { item: VideoExportDto }) => {
  const source = renderSourceCopy[item.renderSource] ?? renderSourceCopy.STORYBOARD_FALLBACK;
  return (
    <article className="grid gap-4 rounded-md border border-ink/10 p-4 lg:grid-cols-[220px_1fr]">
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
          <StatusPill tone={source.tone}>{source.label}</StatusPill>
          <StatusPill tone="good">{item.aspectRatio}</StatusPill>
          <StatusPill>{item.resolution}</StatusPill>
          <StatusPill>{(item.durationMs / 1000).toFixed(1)}s</StatusPill>
        </div>
        <p className="text-sm text-ink/65">{source.description}</p>
        <a href={item.fileUrl} target="_blank" rel="noreferrer">
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            {source.action}
          </Button>
        </a>
      </div>
    </article>
  );
};
