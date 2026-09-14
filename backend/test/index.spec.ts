import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";

import worker from "../src/index";

async function requestWorker(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(`https://example.com${path}`, init);
  const context = createExecutionContext();

  const response = await worker.fetch(request, env, context);

  await waitOnExecutionContext(context);

  return response;
}

describe("Reflection Worker", () => {
  it("returns a health response", async () => {
    const response = await requestWorker("/");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Reflection API is running",
    });
  });

  it("rejects invalid JSON review requests", async () => {
    const response = await requestWorker("/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Request body must be valid JSON.",
    });
  });

  it("requires opportunity and application text", async () => {
    const response = await requestWorker("/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunity: "Graduate software engineering internship",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Opportunity and application must be text.",
    });
  });

  it("rejects empty application content", async () => {
    const response = await requestWorker("/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunity: "Graduate software engineering internship",
        application: "   ",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Opportunity and application are required.",
    });
  });

  it("rejects oversized requests before calling Gemini", async () => {
    const response = await requestWorker("/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunity: "Graduate software engineering internship",
        application: "a".repeat(20_001),
      }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "The submitted text is too long.",
    });
  });
});