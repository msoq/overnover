import { extractFile } from "@/lib/extract";
import { BadRequestError, handle } from "@/lib/http";
import { createTopic, listTopics } from "@/lib/service";

export const GET = () => handle(listTopics);

/** Multipart form: optional "prompt" text, any number of "files", "fromLang", "toLang". */
export const POST = (req: Request) =>
  handle(async () => {
    const form = await req.formData();
    const fromLang = String(form.get("fromLang") ?? "").trim();
    const toLang = String(form.get("toLang") ?? "").trim();
    if (!fromLang || !toLang) throw new BadRequestError("Choose both languages");

    const texts: string[] = [];
    const prompt = String(form.get("prompt") ?? "").trim();
    if (prompt) texts.push(prompt);
    const imageDataUrls: string[] = [];
    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const extracted = await extractFile(entry).catch((err: Error) => {
        throw new BadRequestError(err.message);
      });
      if (extracted.text) texts.push(extracted.text);
      if (extracted.imageDataUrl) imageDataUrls.push(extracted.imageDataUrl);
    }
    if (texts.length === 0 && imageDataUrls.length === 0) {
      throw new BadRequestError("Add a file, a screenshot or a text prompt");
    }
    return createTopic({ text: texts.join("\n\n") || undefined, imageDataUrls, fromLang, toLang });
  });
