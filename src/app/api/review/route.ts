import { handle, parseTypes } from "@/lib/http";
import { reviewCounts, startReview } from "@/lib/service";

export const GET = () => handle(reviewCounts);

/** Body: { mode: "due" | "all", types }. Returns fresh exercises on the rules you got wrong. */
export const POST = (req: Request) =>
  handle(async () => {
    const body = await req.json();
    return startReview(body.mode === "all" ? "all" : "due", parseTypes(body.types));
  });
