import type { GenerationJob } from "@prisma/client";
import type { GenerationJobDto, TraceEvent } from "@videopilot/shared";

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const asTrace = (value: unknown): TraceEvent[] => {
  if (Array.isArray(value)) {
    return value as TraceEvent[];
  }
  return [];
};

export const serializeJob = (job: GenerationJob): GenerationJobDto => ({
  id: job.id,
  type: job.type,
  status: job.status,
  progress: job.progress,
  productId: job.productId,
  scriptId: job.scriptId,
  input: asRecord(job.input),
  output: asRecord(job.output),
  trace: asTrace(job.trace),
  error: job.error,
  retryCount: job.retryCount,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString()
});
