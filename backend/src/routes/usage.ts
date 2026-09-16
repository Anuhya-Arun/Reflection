import { Hono } from "hono";

import { authenticateGoogleUser } from "../services/auth";

type UsageSummary = {
  monthlyLimit: number;
  reviewsUsed: number;
  reviewsRemaining: number;
};

async function getUsage(
  env: Env,
  userId: string,
): Promise<UsageSummary> {
  const stub = env.USER_USAGE.getByName(userId);

  const response = await stub.fetch("https://usage/usage");

  if (!response.ok) {
    throw new Error("Could not read review usage.");
  }

  return response.json<UsageSummary>();
}

const usage = new Hono<{
  Bindings: Env;
}>();

usage.get("/", async (c) => {
  try {
    const user = await authenticateGoogleUser(c.req.raw);
    const summary = await getUsage(c.env, user.id);

    return c.json({
      success: true,
      usage: summary,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Reflection could not verify your account.",
      },
      401,
    );
  }
});

export default usage;