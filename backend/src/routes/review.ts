import { Hono } from "hono";
import { generateReview } from "../services/gemini";

const review = new Hono<{
  Bindings: Env;
}>();

review.post("/", async (c) => {

  const body = await c.req.json();

  const result = await generateReview(
    `
Review this application:

${body.application}

For this opportunity:

${body.opportunity}

Give concise recruiter feedback.
`,
    c.env
  );

  return c.json({
    success: true,
    result,
  });

});

export default review;