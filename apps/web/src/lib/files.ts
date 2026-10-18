import type { MaterialFile } from "@overnover/core";

const MAX_BYTES = 15 * 1024 * 1024;

export interface PreparedMaterial {
  texts: string[];
  files: MaterialFile[];
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * PDFs and images go to the model as files; DOCX and plain text become text
 * here, since the model can't read DOCX.
 */
export async function prepareFiles(list: File[]): Promise<PreparedMaterial> {
  const out: PreparedMaterial = { texts: [], files: [] };
  for (const file of list) {
    if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 15 MB`);
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/") || file.type === "application/pdf" || name.endsWith(".pdf")) {
      out.files.push({
        name: file.name,
        mimeType: file.type || "application/pdf",
        data: toBase64(await file.arrayBuffer()),
      });
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      out.texts.push((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value);
    } else if (file.type.startsWith("text/") || /\.(txt|md)$/.test(name)) {
      out.texts.push(await file.text());
    } else {
      throw new Error(`Unsupported file: ${file.name}. Use PDF, DOCX, TXT or an image.`);
    }
  }
  return out;
}
