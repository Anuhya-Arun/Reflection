import type { Context } from "hono";

export function ok<T>(c: Context, data: T) {
  return c.json({
    success: true,
    data,
  });
}

export function fail(
  c: Context,
  message: string,
  status: 400 | 401 | 403 | 404 | 500 = 400
) {
  return c.json(
    {
      success: false,
      error: message,
    },
    status
  );
}