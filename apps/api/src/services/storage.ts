import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import { storageRoot } from "./paths";

export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY
  }
});

export const putObject = async (input: {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  prefix?: string;
}) => {
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectKey = `${input.prefix ?? "uploads"}/${nanoid(10)}-${safeName}`;
  const localPath = path.resolve(storageRoot, objectKey);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, input.buffer);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.contentType
      })
    );
  } catch {
    // Local storage keeps the demo path working when MinIO has not been initialized yet.
  }

  return {
    objectKey,
    url: `/storage/${objectKey}`
  };
};
