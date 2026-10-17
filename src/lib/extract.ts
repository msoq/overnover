export interface ExtractedFile {
  text?: string;
  imageDataUrl?: string;
}

const MAX_TEXT = 40_000;

/** Turns an uploaded file into text, or into an image for the model to read. */
export async function extractFile(file: File): Promise<ExtractedFile> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type.startsWith("image/")) {
    return { imageDataUrl: `data:${file.type};base64,${buffer.toString("base64")}` };
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      return { text: clip((await parser.getText()).text) };
    } finally {
      await parser.destroy();
    }
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return { text: clip((await mammoth.extractRawText({ buffer })).value) };
  }
  if (file.type.startsWith("text/") || /\.(txt|md)$/.test(name)) {
    return { text: clip(buffer.toString("utf8")) };
  }
  throw new Error(`Unsupported file type: ${file.name}. Use PDF, DOCX, TXT or an image.`);
}

function clip(text: string): string {
  return text.trim().slice(0, MAX_TEXT);
}
