export type QuestionType =
  | 'text'
  | 'multiple-choice'
  | 'single-choice'
  | 'scale'
  | 'number'
  | 'date';

export interface Metric {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface MetricAssignment {
  metricId: string;
  points: number;
}

export interface QuestionOption {
  value: string;
  score: number;
  metricAssignments?: MetricAssignment[];
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultScore?: number;
  metricValues?: Record<string, number>;
}

export interface Formula {
  id: string;
  name: string;
  expression: string;
  description: string;
}

export interface ReportTemplate {
  id: string;
  type: 'client' | 'professional';
  title: string;
  content: string;
}

export interface ClientDataConfig {
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
}

export interface BuilderDraftMeta {
  title: string;
  description: string;
}

export interface SurveySchema {
  questions: Question[];
  formulas: Formula[];
  reportTemplates: ReportTemplate[];
  clientDataConfig: ClientDataConfig;
  metrics?: Metric[];
  builderDraftMeta?: BuilderDraftMeta;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  schema: SurveySchema;
  createdAt: string;
  updatedAt: string;
  completions: number;
  isActive: boolean;
  minParticipants?: number;
  maxParticipants?: number;
}

export interface SurveyLink {
  surveyId: string;
  uniqueId: string;
  url: string;
}

export interface ClientData {
  name?: string;
  email?: string;
  phone?: string;
}

export interface Answer {
  questionId: string;
  value: string | number | string[];
  score?: number;
}

export interface Score {
  metricId: string;
  metricName: string;
  value: number;
  showToClient?: boolean;
  clientResultText?: string;
}

export interface MetricResult {
  metricId?: string;
  metricName: string;
  value: number;
  description?: string;
  color?: string;
}

export interface SurveyResult {
  id: string;
  surveyId: string;
  surveyTitle: string;
  clientData: ClientData;
  answers: Answer[];
  scores: Score[];
  metrics?: Record<string, number>;
  metricResults?: MetricResult[];
  completedAt: string;
}
