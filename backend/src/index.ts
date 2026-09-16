import { Hono } from "hono";

import review from "./routes/review";
import usage from "./routes/usage";

export { UserUsage } from "./durable-objects/UserUsage";

const app = new Hono<{
  Bindings: Env;
}>();

app.get("/", (c) => {
  return c.json({
    message: "Reflection API is running",
  });
});

app.route("/review", review);
app.route("/usage", usage);

export default app;