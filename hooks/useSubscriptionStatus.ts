'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';

export interface SubscriptionStatus {
  isActive: boolean;
  expiresAt: string | null;
  daysUntilExpiry: number;
  isExpired: boolean;
  hasActiveSubscription: boolean;
  isLoading?: boolean;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const { data: me, error, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{
      access_expires_at: string | null;
      is_active: boolean;
    }>(endpoints.me),
    staleTime: 2 * 60 * 1000,
    throwOnError: false,
  });

  const nowTs = useMemo(() => Date.now(), []);

  const expiresAt = me?.access_expires_at ? new Date(me.access_expires_at) : null;

  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - nowTs) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = daysUntilExpiry <= 0;

  const hasActiveSubscription = Boolean(me?.is_active) && !isExpired && !error;

  return {
    isActive: hasActiveSubscription,
    expiresAt: me?.access_expires_at ?? null,
    daysUntilExpiry,
    isExpired,
    hasActiveSubscription,
    isLoading,
  };
}
