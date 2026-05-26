import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button, Panel, StatusPill } from "./ui";

const toneFor = (status?: string) => {
  if (status === "COMPLETED") {
    return "good" as const;
  }
  if (status === "FAILED" || status === "RETRYABLE") {
    return "bad" as const;
  }
  if (status === "RUNNING") {
    return "warn" as const;
  }
  return "neutral" as const;
};

const readMeta = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getTraceSummary = (job?: {
  output?: Record<string, unknown>;
  trace: Array<{ meta?: Record<string, unknown> }>;
}) => {
  const providerMeta = job?.trace.map((event) => event.meta).find((meta) => meta?.provider);
  const shotFallback = job?.trace
    .map((event) => event.meta)
    .find((meta) => meta?.fallbackReason)?.fallbackReason;
  const exportMeta = job?.trace.map((event) => event.meta).find((meta) => meta?.source);
  return {
    provider: String(providerMeta?.provider ?? "unknown"),
    videoMode: String(providerMeta?.videoMode ?? "not reported"),
    finalSource: String(exportMeta?.source ?? readMeta(job?.output).source ?? "pending"),
    fallbackReason: shotFallback ? String(shotFallback) : undefined
  };
};

export const JobCenter = () => {
  const activeJobId = useAppStore((state) => state.activeJobId);
  const jobQuery = useQuery({
    queryKey: ["job", activeJobId],
    queryFn: () => api.job(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 1200;
    }
  });
  const retry = useMutation({
    mutationFn: () => api.retryJob(activeJobId!),
    onSuccess: () => jobQuery.refetch()
  });
  const job = jobQuery.data;

  return (
    <Panel title="Provider & Render Trace" action={<Activity className="h-5 w-5 text-mint" />}>
      {job ? (
        <div className="grid gap-5">
          <div className="grid gap-3 rounded-md bg-mist p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink/55">Job ID</p>
                <strong>{job.id}</strong>
              </div>
              <StatusPill tone={toneFor(job.status)}>{job.status}</StatusPill>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/65">
              <span>{job.type}</span>
              <span>{job.progress}%</span>
            </div>
            <div className="grid gap-2 rounded-md bg-white p-3 text-sm text-ink/70">
              {(() => {
                const summary = getTraceSummary(job);
                return (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill>Provider {summary.provider}</StatusPill>
                      <StatusPill>{summary.videoMode}</StatusPill>
                      <StatusPill tone={summary.finalSource.includes("FALLBACK") ? "warn" : "good"}>
                        Final {summary.finalSource}
                      </StatusPill>
                    </div>
                    {summary.fallbackReason && <p>Fallback reason: {summary.fallbackReason}</p>}
                  </>
                );
              })()}
            </div>
            {(job.status === "FAILED" || job.status === "RETRYABLE") && (
              <Button variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate()}>
                <RotateCcw className="h-4 w-4" />
                Retry provider/render job
              </Button>
            )}
          </div>
          <div className="grid gap-3">
            {job.trace.map((event, index) => (
              <div
                key={`${event.at}-${index}`}
                className="rounded-md border border-ink/10 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{event.stage}</strong>
                  <span className="text-xs text-ink/45">{new Date(event.at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-ink/65">{event.message}</p>
                {event.meta && Object.keys(event.meta).length > 0 && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-mist p-2 text-xs text-ink/70">
                    {JSON.stringify(event.meta, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
          Queue an export to see provider attempts, fallback decisions, and final render source.
        </div>
      )}
    </Panel>
  );
};
