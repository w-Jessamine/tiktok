import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(sourceDir, "../../../..");

export const storageRoot = process.env.LOCAL_STORAGE_DIR
  ? path.resolve(process.env.LOCAL_STORAGE_DIR)
  : path.resolve(workspaceRoot, "storage");
