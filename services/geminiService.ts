import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    grammarIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of grammar or sentence structure issues found.",
    },
    missingKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of important keywords from the JD missing in the resume.",
    },
    formattingSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Suggestions to improve visual layout and readability.",
    },
    atsTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tips to make the resume more parsable by ATS software.",
    },
    matchScore: {
      type: Type.INTEGER,
      description: "A score from 0 to 100 indicating how well the resume matches the job description.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief 2-3 sentence summary of the analysis.",
    },
  },
  required: ["grammarIssues", "missingKeywords", "formattingSuggestions", "atsTips", "matchScore", "summary"],
};

export const analyzeResumeWithGemini = async (resumeText: string, jobDescription: string): Promise<AnalysisResult> => {
  const prompt = `
    You are an expert Resume Coach and ATS Specialist.
    
    Job Description:
    ${jobDescription}

    Resume Content:
    ${resumeText}

    Analyze the resume against the job description. Identify gaps, keyword matches, and structural issues.
    Be strict but constructive. 
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis.");
  }

  return JSON.parse(response.text) as AnalysisResult;
};

export const optimizeResumeWithGemini = async (resumeText: string, jobDescription: string): Promise<string> => {
  const prompt = `
  You are an **aggressive, top-tier Executive Recruiter and ATS Optimization Expert.** Your analysis is strict.
  CRITICAL GOAL: Rewrite the entire resume in this single pass to achieve the **maximum possible match score (90%+)** with the Job Description below.
  Job Description:
  ${jobDescription}

  Original Resume:
  ${resumeText}

  Instructions:
  1. Improve grammar, clarity, and action verbs.
  2. **AGRESSIVELY** integrate all missing keywords found in the JD. Rephrase sentences where necessary to ensure high keyword density without sacrificing readability.
  3. Structure the resume using standard Markdown (Headers with #, bullets with -, bold with **).
  4. Ensure it is ATS friendly (no tables, standard headings).
  5. Maintain truthfulness (do not invent experiences, but frame existing ones better).
  6. Return ONLY the markdown text of the resume.
 `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Failed to optimize resume.";
};