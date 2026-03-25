import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';
import type { SurveyResult } from '@/types';

export function useResults(testId?: number) {
  return useQuery({
    queryKey: ['results', testId],
    queryFn: () =>
      testId
        ? api.get<SurveyResult[]>(endpoints.psychologistSubmissions(testId))
        : Promise.resolve([]),
    enabled: !!testId,
  });
}

export function useResult(id: string) {
  return useQuery({
    queryKey: ['result', id],
    queryFn: () => api.get<SurveyResult>(endpoints.publicTest(id)),
    enabled: !!id,
  });
}

export function useDeleteResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(endpoints.publicTest(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}
