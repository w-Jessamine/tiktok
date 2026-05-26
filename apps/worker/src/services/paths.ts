import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(sourceDir, "../../../..");

export const workerOutputRoot = process.env.WORKER_OUTPUT_DIR
  ? path.resolve(process.env.WORKER_OUTPUT_DIR)
  : path.resolve(workspaceRoot, "storage/generated");
