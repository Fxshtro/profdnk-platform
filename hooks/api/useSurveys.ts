import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';
import type { Survey, SurveySchema } from '@/types';

export function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: () => api.get<Survey[]>(endpoints.psychologistTests),
  });
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: ['survey', id],
    queryFn: () => api.get<Survey>(endpoints.publicTest(id)),
    enabled: !!id,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Survey>) => api.post<Survey>(endpoints.psychologistCreateTest, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
}

export function useUpdateSurvey(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Survey>) =>
      api.put<Survey>(endpoints.psychologistUpdateTest(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(endpoints.psychologistDeleteTest(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
}

export function useCloneSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post<Survey>(endpoints.psychologistCreateTest, { cloneFrom: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
  });
}
