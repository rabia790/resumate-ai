export interface AnalysisResult {
  grammarIssues: string[];
  missingKeywords: string[];
  formattingSuggestions: string[];
  atsTips: string[];
  matchScore: number;
  summary: string;
}

export interface OptimizedResume {
  markdownContent: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  OPTIMIZING = 'OPTIMIZING',
  VIEW_ANALYSIS = 'VIEW_ANALYSIS',
  VIEW_OPTIMIZED = 'VIEW_OPTIMIZED',
  ERROR = 'ERROR'
}

export enum Tab {
  INPUT = 'INPUT',
  ANALYSIS = 'ANALYSIS',
  OPTIMIZED = 'OPTIMIZED'
}