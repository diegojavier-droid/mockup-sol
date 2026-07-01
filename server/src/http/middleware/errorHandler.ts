import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { error: { message: err.message, status: err.status } },
      err.status,
    );
  }
  console.error("[sol-mai-api] unhandled error:", err);
  return c.json(
    { error: { message: "Internal Server Error", status: 500 } },
    500,
  );
};

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json({ error: { message: "Not Found", status: 404 } }, 404);
