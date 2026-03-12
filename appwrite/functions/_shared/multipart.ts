import Busboy from "busboy";
import type { ParsedInboundFile, ParsedMailgunPayload, AppwriteRequest } from "@/appwrite/functions/_shared/types";

function toBuffer(binary: AppwriteRequest["bodyBinary"], bodyText?: string) {
  if (binary instanceof Uint8Array) {
    return Buffer.from(binary);
  }

  if (binary instanceof ArrayBuffer) {
    return Buffer.from(binary);
  }

  if (typeof binary === "string") {
    return Buffer.from(binary, "binary");
  }

  if (bodyText) {
    return Buffer.from(bodyText);
  }

  return Buffer.alloc(0);
}

export async function parseInboundPayload(req: AppwriteRequest): Promise<ParsedMailgunPayload> {
  const contentType = req.headers["content-type"] ?? req.headers["Content-Type"] ?? "";

  if (contentType.includes("application/json")) {
    const jsonPayload = (req.bodyJson ?? {}) as Record<string, string | string[]>;
    const fields = Object.fromEntries(
      Object.entries(jsonPayload).map(([key, value]) => [key, Array.isArray(value) ? value : [String(value ?? "")]])
    );
    return { fields, files: [] };
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(req.bodyText ?? "");
    const fields: ParsedMailgunPayload["fields"] = {};

    for (const [key, value] of params.entries()) {
      fields[key] ??= [];
      fields[key].push(value);
    }

    return { fields, files: [] };
  }

  if (!contentType.includes("multipart/form-data")) {
    throw new Error(`Unsupported content type ${contentType}`);
  }

  const fields: ParsedMailgunPayload["fields"] = {};
  const files: ParsedInboundFile[] = [];
  const buffer = toBuffer(req.bodyBinary, req.bodyText);

  await new Promise<void>((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType } });

    busboy.on("field", (name, value) => {
      fields[name] ??= [];
      fields[name].push(value);
    });

    busboy.on("file", (name, stream, info) => {
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        files.push({
          fieldName: name,
          filename: info.filename,
          mimeType: info.mimeType,
          size: chunks.reduce((total, chunk) => total + chunk.length, 0),
          buffer: Buffer.concat(chunks)
        });
      });
    });

    busboy.on("close", resolve);
    busboy.on("error", reject);
    busboy.end(buffer);
  });

  return { fields, files };
}
