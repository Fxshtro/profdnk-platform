'use client';

import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  mode?: 'block' | 'warn' | 'none';
  warningMessage?: string;
}

export function SubscriptionGuard({
  children, 
  mode = 'none',
  warningMessage 
}: SubscriptionGuardProps) {
  const { isActive, isExpired } = useSubscriptionStatus();

  if (isActive) {
    return <>{children}</>;
  }

  if (mode === 'none') {
    return <>{children}</>;
  }

  if (mode === 'block') {
    return <SubscriptionRequired />;
  }

  return (
    <>
      <ExpiredBanner message={warningMessage} />
      {children}
    </>
  );
}

interface ExpiredBannerProps {
  message?: string;
}

function ExpiredBanner({ message }: ExpiredBannerProps) {
  return (
    <Card className="mb-6 border-destructive/50 bg-destructive/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-destructive">Подписка истекла</CardTitle>
        <CardDescription className="text-destructive/80">
          {message ?? 'Доступ к функциям платформы ограничен. Продлите подписку для продолжения работы.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/subscription">
          <Button variant="destructive">Перейти к подписке</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function SubscriptionRequired() {
  return (
    <div className="flex items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Требуется активная подписка</CardTitle>
          <CardDescription>
            Доступ к этой функции ограничен. Пожалуйста, активируйте или продлите подписку.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/subscription">
            <Button className="w-full">Перейти к подписке</Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            На странице подписки вы можете отправить запрос на продление.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function useSubscriptionGuard() {
  const { isActive, isExpired, daysUntilExpiry } = useSubscriptionStatus();

  const canEdit = isActive;
  const canCreate = isActive;
  const canSave = isActive;
  const canDelete = isActive;
  const canExport = isActive;

  return {
    isActive,
    isExpired,
    daysUntilExpiry,
    canEdit,
    canCreate,
    canSave,
    canDelete,
    canExport,
    requireSubscription: <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: Parameters<T>) => {
        if (!isActive) {
          alert('Требуется активная подписка для выполнения этого действия.\n\nПерейдите на вкладку «Подписка» для продления.');
          return;
        }
        return fn(...args);
      }) as T;
    },
  };
}
