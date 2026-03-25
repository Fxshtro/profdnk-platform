export type ReportType = 'client' | 'professional';
export type ReportFormat = 'html' | 'docx';

export interface Report {
  id: string;
  surveyResultId: string;
  type: ReportType;
  format: ReportFormat;
  content: string;
  generatedAt: string;
}

export interface ReportPreview {
  type: ReportType;
  htmlContent: string;
}
