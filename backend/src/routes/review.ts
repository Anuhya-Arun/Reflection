import { Hono } from "hono";

import { authenticateGoogleUser } from "../services/auth";
import { GeminiServiceError } from "../services/gemini";
import { reviewApplication } from "../services/review";
import type { ReviewRequest } from "../types/review";

const MAX_OPPORTUNITY_LENGTH = 20_000;
const MAX_APPLICATION_LENGTH = 20_000;

type UsageReservation =
  | {
      allowed: true;
      reservationId: string;
      monthlyLimit: number;
      reviewsUsed: number;
      reviewsRemaining: number;
    }
  | {
      allowed: false;
      monthlyLimit: number;
      reviewsUsed: number;
      reviewsRemaining: number;
    };

async function callUsage(
  env: Env,
  userId: string,
  action: "reserve" | "commit" | "refund",
  reservationId?: string,
): Promise<UsageReservation> {
  const stub = env.USER_USAGE.getByName(userId);

  const response = await stub.fetch(`https://usage/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reservationId }),
  });

  if (!response.ok) {
    throw new Error("Reflection could not update review usage.");
  }

  return response.json<UsageReservation>();
}

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

  let reservationId: string | undefined;
  let userId: string | undefined;

  try {
    const user = await authenticateGoogleUser(c.req.raw);
    userId = user.id;

    const rateLimit = await c.env.REVIEW_RATE_LIMITER.limit({
      key: user.id,
    });

    if (!rateLimit.success) {
      return c.json(
        {
          success: false,
          error: "Too many review requests. Please wait up to one minute and try again.",
        },
        429,
      );
    }

    const reservation = await callUsage(c.env, user.id, "reserve");

    if (!reservation.allowed) {
      return c.json(
        {
          success: false,
          error: `You have used all ${reservation.monthlyLimit} free reviews for this month.`,
          usage: reservation,
        },
        402,
      );
    }

    reservationId = reservation.reservationId;

    const generatedReview = await reviewApplication(
      { opportunity, application },
      c.env,
    );

    const usage = await callUsage(
      c.env,
      user.id,
      "commit",
      reservationId,
    );

    return c.json({
      success: true,
      review: generatedReview,
      usage,
    });
  } catch (error) {
    if (userId && reservationId) {
      try {
        await callUsage(c.env, userId, "refund", reservationId);
      } catch (refundError) {
        console.error("Could not refund failed review", refundError);
      }
    }

    if (error instanceof GeminiServiceError && error.status === 429) {
      const retryAfterSeconds = error.retryAfterSeconds ?? 30;

      return c.json(
        {
          success: false,
          error: `The AI service is busy. Please try again in about ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
        },
        429,
        {
          "Retry-After": String(retryAfterSeconds),
        },
      );
    }

    if (error instanceof Error) {
      if (
        error.message.startsWith("Sign in with Google") ||
        error.message.startsWith("Your Google sign-in") ||
        error.message.startsWith("Reflection could not identify")
      ) {
        return c.json(
          { success: false, error: error.message },
          401,
        );
      }
    }

    console.error("Review generation failed", error);

    return c.json(
      {
        success: false,
        error: "The AI review service is unavailable. Please try again.",
      },
      503,
    );
  }
});

export default review;