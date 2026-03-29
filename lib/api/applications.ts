import { api } from './client';
import type { Application } from '@/lib/users';

export interface ApplicationRequest {
  full_name: string;
  email: string;
  phone?: string;
  specialization: string;
  education: string;
  experience: string;
  comment: string;
}

interface PsychologistRegistrationApiRow {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string;
  education: string;
  experience: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
}

function mapRow(row: PsychologistRegistrationApiRow): Application {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    specialization: row.specialization,
    education: row.education,
    experience: row.experience,
    comment: row.comment,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export const applicationsApi = {
  submitApplication: async (data: ApplicationRequest): Promise<Application> => {
    const row = await api.post<PsychologistRegistrationApiRow>('/public/psychologist-registration', data);
    return mapRow(row);
  },

  getApplications: async (): Promise<Application[]> => {
    const rows = await api.get<PsychologistRegistrationApiRow[]>('/admin/applications/list');
    return rows.map(mapRow);
  },

  approveApplication: (id: string) =>
    api.post<PsychologistRegistrationApiRow>(`/admin/applications/${id}/approve`).then(mapRow),

  rejectApplication: (id: string) =>
    api.post<PsychologistRegistrationApiRow>(`/admin/applications/${id}/reject`).then(mapRow),
};
