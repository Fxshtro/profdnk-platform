import { api, messageFromApiErrorPayload } from './client';
import { API_BASE_URL, endpoints } from './config';

export interface PsychologistCreatePayload {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  access_expires_at?: string;
  specialization?: string;
}

export interface Psychologist {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'psychologist' | 'admin';
  is_active: boolean;
  is_blocked: boolean;
  access_expires_at: string | null;
  specialization?: string;
}

export interface PsychologistProfile {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: 'psychologist' | 'admin';
  is_active: boolean;
  is_blocked: boolean;
  access_expires_at: string | null;
  about_md: string;
  experience: string;
  specialization?: string;
  created_at: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string;
  about_md?: string;
  specialization?: string;
}

export interface Test {
  id: number;
  title: string;
  description: string;
  unique_token: string;
  author_id: number;
  created_at: string;
  config_json?: Record<string, unknown>;
  questions?: unknown[];
}

export interface Submission {
  id: number;
  test_id: number;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  answers: Record<string, unknown>;
  metrics: Record<string, unknown> | null;
  metricResults?: Array<{
    metricName: string;
    value: number;
    description?: string;
    color?: string;
    showToClient?: boolean;
    clientResultText?: string;
  }>;
  score: number;
  created_at: string;
  test?: Test;
}

export const psychologistApi = {
  createPsychologist: (data: PsychologistCreatePayload) =>
    api.post<Psychologist>(endpoints.adminPsychologists, data),

  getPsychologists: () =>
    api.get<Psychologist[]>('/admin/psychologists/list'),

  getPsychologist: (id: number) =>
    api.get<PsychologistProfile>(`/admin/psychologists/${id}`),

  updatePsychologist: (id: number, data: { is_blocked?: boolean; is_active?: boolean; access_expires_at?: string | null }) =>
    api.patch<Psychologist>(`${endpoints.adminPsychologists}/${id}`, data),

  getSubscriptions: () =>
    api.get<Psychologist[]>(endpoints.adminSubscriptions),

  extendSubscription: (id: number, days: number) =>
    api.post<Psychologist>(endpoints.adminExtendSubscription(id), { days }),

  activatePsychologist: (id: number) =>
    api.post<Psychologist>(endpoints.adminActivate(id)),

  blockPsychologist: (id: number) =>
    api.post<Psychologist>(endpoints.adminBlock(id)),

  getTests: () =>
    api.get<Test[]>(endpoints.psychologistTests),

  getTest: (id: number) =>
    api.get<Test>(`/psychologist/tests/${id}`),

  createTest: (data: { title: string; description?: string; config_json?: Record<string, unknown> }) =>
    api.post<Test>(endpoints.psychologistCreateTest, data),

  updateTest: (id: number, data: Partial<Test>) =>
    api.put<Test>(endpoints.psychologistUpdateTest(id), data),

  deleteTest: (id: number) =>
    api.delete(endpoints.psychologistDeleteTest(id)),

  getSubmissions: (testId: number) =>
    api.get<Submission[]>(endpoints.psychologistSubmissions(testId)),

  getAllSubmissions: () =>
    api.get<Submission[]>('/psychologist/submissions'),

  getSubmission: (id: number) =>
    api.get<Submission>(`/psychologist/submissions/${id}`),

  getProfile: () =>
    api.get<PsychologistProfile>('/psychologist/profile'),

  updateProfile: (data: ProfileUpdatePayload) =>
    api.put<PsychologistProfile>('/psychologist/profile', data),
};

export async function downloadSubmissionReportDocx(
  testId: number,
  submissionId: number,
  kind: 'client' | 'specialist' = 'specialist'
): Promise<void> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const path = `${endpoints.psychologistSubmissionReportDocx(testId, submissionId)}?kind=${encodeURIComponent(kind)}`;
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(messageFromApiErrorPayload(text) ?? `Ошибка ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  let filename = `results_${testId}_${submissionId}.docx`;
  const quoted = cd?.match(/filename="([^"]+)"/i);
  const utf8Star = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Star) {
    try {
      filename = decodeURIComponent(utf8Star[1]);
    } catch {
      filename = utf8Star[1];
    }
  } else if (quoted) {
    filename = quoted[1];
  }
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
