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
    <Panel title="Generation Task Trace" action={<Activity className="h-5 w-5 text-mint" />}>
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
              <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${job.progress}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink/65">
              <span>{job.type}</span>
              <span>{job.progress}%</span>
            </div>
            {(job.status === "FAILED" || job.status === "RETRYABLE") && (
              <Button variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate()}>
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
          <div className="grid gap-3">
            {job.trace.map((event, index) => (
              <div key={`${event.at}-${index}`} className="rounded-md border border-ink/10 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{event.stage}</strong>
                  <span className="text-xs text-ink/45">{new Date(event.at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-ink/65">{event.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">
          Upload assets, regenerate a shot, or create a video to see live task progress.
        </div>
      )}
    </Panel>
  );
};
