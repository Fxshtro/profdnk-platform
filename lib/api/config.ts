export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const endpoints = {
  health: '/api/health',

  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',

  adminPsychologists: '/admin/psychologists',
  adminPsychologistsList: '/admin/psychologists/list',
  adminActivate: (id: number) => `/admin/psychologists/${id}/activate`,
  adminBlock: (id: number) => `/admin/psychologists/${id}/block`,
  adminSubscriptions: '/admin/subscriptions',
  adminExtendSubscription: (id: number) => `/admin/subscriptions/${id}/extend`,

  psychologistProfile: '/psychologist/profile',
  psychologistProfileUpdate: '/psychologist/profile',
  psychologistTests: '/psychologist/tests',
  psychologistCreateTest: '/psychologist/tests',
  psychologistUpdateTest: (id: number) => `/psychologist/tests/${id}`,
  psychologistDeleteTest: (id: number) => `/psychologist/tests/${id}`,
  psychologistSubmissions: (testId: number) => `/psychologist/tests/${testId}/submissions`,
  psychologistSubmissionsAll: '/psychologist/submissions',
  psychologistSubmissionReportDocx: (testId: number, submissionId: number) =>
    `/psychologist/tests/${testId}/submissions/${submissionId}/report.docx`,

  publicTest: (token: string) => `/public/tests/${token}`,
  publicTestTake: (token: string) => `/public/tests/${token}/take`,
  publicTestSubmit: (token: string) => `/public/tests/${token}/submit`,
  psychologistCard: (pid: number) => `/public/psychologists/${pid}/card`,
  psychologistPhoto: (pid: number) => `/public/psychologists/${pid}/photo`,
} as const;
