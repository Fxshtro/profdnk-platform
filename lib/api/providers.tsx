'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeApplier } from '@/components/features/ThemeApplier';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              if (error?.status === 403) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            throwOnError: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
    </QueryClientProvider>
  );
}
