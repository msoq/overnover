import { BadRequestError, handle, parseTypes } from "@/lib/http";
import { startSession } from "@/lib/service";

/** Body: { topicId, types, count }. Returns the new batch of exercises without answers. */
export const POST = (req: Request) =>
  handle(async () => {
    const body = await req.json();
    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 1 || count > 50) throw new BadRequestError("Count must be between 1 and 50");
    if (typeof body.topicId !== "string") throw new BadRequestError("Missing topicId");
    return startSession(body.topicId, parseTypes(body.types), count);
  });
