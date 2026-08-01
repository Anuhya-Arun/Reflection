import { generateReview } from "./gemini";
import type { ReviewRequest } from "../types/review";

export async function reviewApplication(
  request: ReviewRequest,
  env: Env
) {
  const prompt = `
Opportunity:

${request.opportunity}

---

Application:

${request.application}
`;

  return await generateReview(
    prompt,
    env
  );
}