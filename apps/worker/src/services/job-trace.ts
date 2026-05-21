import type { Prisma, JobStatus } from "@prisma/client";
import { prisma } from "../db";

export const appendTrace = async (
  jobId: string,
  stage: string,
  message: string,
  meta?: Record<string, unknown>
) => {
  const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
  const trace = Array.isArray(job.trace) ? job.trace : [];
  const event: Record<string, unknown> = {
    at: new Date().toISOString(),
    stage,
    message
  };
  if (meta) {
    event.meta = meta;
  }
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      trace: [...trace, event as Prisma.InputJsonObject] as Prisma.InputJsonArray
    }
  });
};

export const updateJob = async (
  jobId: string,
  data: {
    status?: JobStatus;
    progress?: number;
    error?: string | null;
    output?: Record<string, unknown>;
  }
) => {
  const updateData: {
    status?: JobStatus;
    progress?: number;
    error?: string | null;
    output?: Prisma.InputJsonValue;
  } = {
    status: data.status,
    progress: data.progress,
    error: data.error
  };
  if (data.output) {
    updateData.output = data.output as Prisma.InputJsonObject;
  }
  await prisma.generationJob.update({
    where: { id: jobId },
    data: updateData
  });
};
