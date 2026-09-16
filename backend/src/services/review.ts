import { generateReview } from "./gemini";
import type { ReviewRequest } from "../types/review";

type ApplicationQuality = {
  overallScore: number;
  label: string;
  relevance: number;
  clarity: number;
  evidence: number;
  impact: number;
};

export type RecruiterReview = {
  summary: string;
  strengths: string[];
  concerns: string[];
  recruiterImpression: string;
  improvements: string[];
  revisedText: string;
  quality: ApplicationQuality;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function asScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getQualityLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Promising";
  if (score >= 40) return "Needs work";
  return "Early draft";
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getMeaningfulRewrite(
  value: unknown,
  originalApplication: string,
): string {
  const revisedText = asText(value, "");

  if (
    !revisedText ||
    normalizeComparableText(revisedText) ===
      normalizeComparableText(originalApplication)
  ) {
    return "";
  }

  return revisedText;
}

function extractJsonObject(rawReview: string): string {
  const firstBrace = rawReview.indexOf("{");
  const lastBrace = rawReview.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Gemini returned no JSON review object.");
  }

  return rawReview.slice(firstBrace, lastBrace + 1);
}

function parseReview(
  rawReview: string,
  originalApplication: string,
): RecruiterReview {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(rawReview));
  } catch {
    throw new Error("Gemini returned an invalid review format.");
  }

  const review = asRecord(parsed);

  if (!review) {
    throw new Error("Gemini returned an invalid review format.");
  }

  const quality = asRecord(review.quality);
  const overallScore = asScore(quality?.overallScore);

  return {
    summary: asText(
      review.summary,
      "Reflection could not generate a summary for this application.",
    ),
    strengths: asTextList(review.strengths),
    concerns: asTextList(review.concerns),
    recruiterImpression: asText(
      review.recruiterImpression,
      "No recruiter impression was generated.",
    ),
    improvements: asTextList(review.improvements),
    revisedText: getMeaningfulRewrite(
      review.revisedText,
      originalApplication,
    ),
    quality: {
      overallScore,
      label: asText(quality?.label, getQualityLabel(overallScore)),
      relevance: asScore(quality?.relevance),
      clarity: asScore(quality?.clarity),
      evidence: asScore(quality?.evidence),
      impact: asScore(quality?.impact),
    },
  };
}

export async function reviewApplication(
  request: ReviewRequest,
  env: Env,
): Promise<RecruiterReview> {
  const prompt = `
You are an experienced recruiter reviewing a candidate's written application.

Opportunity description:

${request.opportunity}

---

Candidate application:

${request.application}

Evaluate the application honestly but constructively.

Your response must contain one JSON object only.
The first character must be { and the final character must be }.
Do not use Markdown, explanation, or code fences.

Use exactly this shape:

{
  "summary": "A concise two-sentence assessment.",
  "strengths": [
    "Specific recruiter-relevant strength",
    "Specific recruiter-relevant strength"
  ],
  "concerns": [
    "Specific concern or missing evidence"
  ],
  "recruiterImpression": "How a recruiter is likely to perceive this applicant.",
  "improvements": [
    "Specific, practical improvement the applicant can make"
  ],
  "revisedText": "A complete improved rewrite, or an empty string if no safe improvement is possible.",
  "quality": {
    "overallScore": 0,
    "label": "Early draft, Needs work, Promising, Strong, or Excellent",
    "relevance": 0,
    "clarity": 0,
    "evidence": 0,
    "impact": 0
  }
}

Rules:
- Every score must be an integer from 0 to 100.
- Base the scores only on the supplied opportunity and application.
- Give 2 to 4 useful items for strengths, concerns, and improvements.
- Keep feedback concise and actionable.
- revisedText must rewrite the complete supplied candidate application.
- revisedText must be meaningfully different from the supplied application; never repeat it unchanged.
- Improve relevance, clarity, evidence, impact, or recruiter readability where possible.
- Keep the candidate's first-person voice and preserve all truthful facts.
- Never invent achievements, qualifications, numbers, employers, or experiences.
- If no safe meaningful rewrite is possible, return an empty revisedText string.
- revisedText must be plain text only, without Markdown or commentary.
`;

  const rawReview = await generateReview(prompt, env);

  return parseReview(rawReview, request.application);
}