import { BadRequestError, handle } from "@/lib/http";
import { revealAnswer } from "@/lib/service";

export const POST = (req: Request) =>
  handle(async () => {
    const { exerciseId } = await req.json();
    if (typeof exerciseId !== "string") throw new BadRequestError("Missing exerciseId");
    return revealAnswer(exerciseId);
  });
