import { BadRequestError, handle } from "@/lib/http";
import { submitAnswer } from "@/lib/service";

export const POST = (req: Request) =>
  handle(async () => {
    const { exerciseId, answer } = await req.json();
    if (typeof exerciseId !== "string" || typeof answer !== "string" || !answer.trim()) {
      throw new BadRequestError("Type an answer first");
    }
    return submitAnswer(exerciseId, answer);
  });
