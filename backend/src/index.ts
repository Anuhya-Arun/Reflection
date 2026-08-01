import { Hono } from "hono";
import { cors } from "hono/cors";

import review from "./routes/review";

const app = new Hono<{
  Bindings: Env;
}>();

app.use(
  "*",
  cors({
    origin: [
      "https://docs.google.com",
      "http://localhost:3000",
    ],
    allowMethods: [
      "POST",
      "GET",
      "OPTIONS",
    ],
    allowHeaders: [
      "Content-Type",
    ],
  })
);

app.get("/", (c) => {

    return c.json({
        message: "Reflection API is running 🚀",
    });

});

app.route("/review", review);

export default app;