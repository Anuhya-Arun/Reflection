import { Hono } from "hono";
import { reviewApplication } from "../services/review";
import type { ReviewRequest } from "../types/review";

const MAX_OPPORTUNITY_LENGTH = 20_000;
const MAX_APPLICATION_LENGTH = 20_000;

const review = new Hono<{
  Bindings: Env;
}>();

function isReviewRequest(value: unknown): value is ReviewRequest {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.opportunity === "string" &&
    typeof candidate.application === "string"
  );
}

review.post("/", async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "Request body must be valid JSON." },
      400,
    );
  }

  if (!isReviewRequest(body)) {
    return c.json(
      {
        success: false,
        error: "Opportunity and application must be text.",
      },
      400,
    );
  }

  const opportunity = body.opportunity.trim();
  const application = body.application.trim();

  if (!opportunity || !application) {
    return c.json(
      {
        success: false,
        error: "Opportunity and application are required.",
      },
      400,
    );
  }

  if (
    opportunity.length > MAX_OPPORTUNITY_LENGTH ||
    application.length > MAX_APPLICATION_LENGTH
  ) {
    return c.json(
      { success: false, error: "The submitted text is too long." },
      413,
    );
  }

  try {
    const review = await reviewApplication(
      { opportunity, application },
      c.env,
    );

    return c.json({ success: true, review });
  } catch (error) {
    console.error("Review generation failed", error);

    return c.json(
      {
        success: false,
        error: "The AI review service is unavailable. Please try again.",
      },
      502,
    );
  }
});

export default review;