import { Hono } from "hono";

import review from "./routes/review";

const app = new Hono<{
  Bindings: Env;
}>();

app.get("/", (c) => {

    return c.json({
        message: "Reflection API is running 🚀",
    });

});

app.route("/review", review);

export default app;