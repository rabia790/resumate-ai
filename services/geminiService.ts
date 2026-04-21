import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AnalysisResult } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// 1. Fix TypeScript Error: Add 'as const' to the type
const analysisSchema = {
  type: SchemaType.OBJECT as const, // <--- FIX: Add 'as const'
  properties: {
    grammarIssues: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: "List of grammar or sentence structure issues found.",
    },
    missingKeywords: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: "List of important keywords from the JD missing in the resume.",
    },
    formattingSuggestions: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: "Suggestions to improve visual layout and readability.",
    },
    atsTips: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: "Tips to make the resume more parsable by ATS software.",
    },
    matchScore: {
      type: SchemaType.INTEGER as const,
      description: "A score from 0 to 100 indicating how well the resume matches the job description.",
    },
    summary: {
      type: SchemaType.STRING as const,
      description: "A brief 2-3 sentence summary of the analysis.",
    },
  },
  required: ["grammarIssues", "missingKeywords", "formattingSuggestions", "atsTips", "matchScore", "summary"],
};

export const analyzeResumeWithGemini = async (resumeText: string, jobDescription: string): Promise<AnalysisResult> => {
  // 2. SWITCH BACK TO 2.5 (The one that gave 429, not 404)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", 
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const prompt = `
    You are an expert Resume Coach and ATS Specialist.
    Job Description:
    ${jobDescription}
    Resume Content:
    ${resumeText}
    Analyze the resume against the job description. Identify gaps, keyword matches, and structural issues.
    Be strict but constructive. 
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  if (!responseText) throw new Error("Failed to generate analysis.");
  
  return JSON.parse(responseText) as AnalysisResult;
};

export const optimizeResumeWithGemini = async (resumeText: string, jobDescription: string): Promise<string> => {
  // 3. SWITCH BACK TO 2.5 HERE TOO
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `
  You are an **aggressive, top-tier Executive Recruiter and ATS Optimization Expert.**
  CRITICAL GOAL: Rewrite the entire resume in this single pass to achieve the **maximum possible match score (90%+)** with the Job Description below.
  Job Description: ${jobDescription}
  Original Resume: ${resumeText}
  Instructions:
  1. Improve grammar, clarity, and action verbs.
  2. Integrate keywords.
  3. Return ONLY markdown text.
 `;

  const result = await model.generateContent(prompt);
  return result.response.text() || "Failed to optimize resume.";
};