import { handle } from "@/lib/http";
import { getTopic } from "@/lib/service";

export const GET = (_req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => getTopic((await ctx.params).id));
