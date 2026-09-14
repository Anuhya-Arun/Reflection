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

const model = "gemini-3.5-flash-lite";

const reviewSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
    },
    strengths: {
      type: "array",
      items: {
        type: "string",
      },
    },
    concerns: {
      type: "array",
      items: {
        type: "string",
      },
    },
    recruiterImpression: {
      type: "string",
    },
    improvements: {
      type: "array",
      items: {
        type: "string",
      },
    },
    revisedText: {
      type: "string",
    },
    quality: {
      type: "object",
      properties: {
        overallScore: {
          type: "integer",
        },
        label: {
          type: "string",
        },
        relevance: {
          type: "integer",
        },
        clarity: {
          type: "integer",
        },
        evidence: {
          type: "integer",
        },
        impact: {
          type: "integer",
        },
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

export async function generateReview(
  prompt: string,
  env: GeminiEnv,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
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
    throw new Error("Unable to reach Gemini.");
  }

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Gemini API error", {
      status: response.status,
      errorBody,
    });

    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "Gemini stopped before completing the structured review response.",
    );
  }

  const review = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!review) {
    throw new Error("Gemini returned no review text.");
  }

  return review;
}