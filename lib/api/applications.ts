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

export const applicationsApi = {
  submitApplication: (data: ApplicationRequest) =>
    api.post<Application>('/admin/apply', data),

  getApplications: () =>
    api.get<Application[]>('/admin/applications/list'),

  approveApplication: (id: string) =>
    api.post<Application>(`/admin/applications/${id}/approve`),

  rejectApplication: (id: string) =>
    api.post<Application>(`/admin/applications/${id}/reject`),
};
