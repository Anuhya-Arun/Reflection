export interface ReviewRequest {
  opportunity: string;
  application: string;
}

export interface ReviewResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
}