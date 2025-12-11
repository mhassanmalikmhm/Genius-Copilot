
export interface KeyMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Recommendation {
  goal: string;
  strategy: string;
}

export interface ChartPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartConfig {
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  xAxisKey: string;
  dataKey: string;
  data: ChartPoint[];
  color?: string;
  description?: string;
}

export interface AnalysisResult {
  inferredType: string;
  summary: string;
  keyMetrics: KeyMetric[];
  charts: ChartConfig[];
  pythonCode: string;
  recommendation: Recommendation;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_VISUALS = 'GENERATING_VISUALS',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
