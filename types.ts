
export interface KeyMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Recommendation {
  goal: string;
  strategy: string;
}

export interface AnalysisResult {
  inferredType: string;
  summary: string;
  keyMetrics: KeyMetric[];
  pythonCode: string;
  recommendation: Recommendation;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | AnalysisResult;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_VISUALS = 'GENERATING_VISUALS',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
