type GeminiEnv = Env & {
  GEMINI_API_KEY?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

const model = "gemini-3.5-flash-lite";

const reviewSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    concerns: {
      type: "array",
      items: { type: "string" },
    },
    recruiterImpression: { type: "string" },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    revisedText: { type: "string" },
    quality: {
      type: "object",
      properties: {
        overallScore: { type: "integer" },
        label: { type: "string" },
        relevance: { type: "integer" },
        clarity: { type: "integer" },
        evidence: { type: "integer" },
        impact: { type: "integer" },
      },
      required: [
        "overallScore",
        "label",
        "relevance",
        "clarity",
        "evidence",
        "impact",
      ],
    },
  },
  required: [
    "summary",
    "strengths",
    "concerns",
    "recruiterImpression",
    "improvements",
    "revisedText",
    "quality",
  ],
};

function getRetryAfterSeconds(errorBody: string): number | undefined {
  const match = errorBody.match(/"retryDelay":\s*"(\d+)s"/);

  return match ? Number(match[1]) : undefined;
}

export async function generateReview(
  prompt: string,
  env: GeminiEnv,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiServiceError(
      "The Gemini API key is not configured.",
      500,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingLevel: "low",
            },
            responseMimeType: "application/json",
            responseSchema: reviewSchema,
          },
        }),
      },
    );
  } catch {
    throw new GeminiServiceError("Unable to reach Gemini.", 503);
  }

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Gemini API error", {
      status: response.status,
      errorBody,
    });

    throw new GeminiServiceError(
      `Gemini request failed with status ${response.status}.`,
      response.status,
      response.status === 429 ? getRetryAfterSeconds(errorBody) : undefined,
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new GeminiServiceError(
      "Gemini stopped before completing the review.",
      503,
    );
  }

  const review = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!review) {
    throw new GeminiServiceError("Gemini returned no review text.", 503);
  }

  return review;
}