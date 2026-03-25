'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { psychologistApi } from '@/lib/api/psychologist';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';
import Link from 'next/link';
import { SubscriptionGuard } from '@/components/features/SubscriptionGuard';

export default function DashboardPage() {
  const { data: me, error: meError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ full_name: string; access_expires_at: string | null; is_active: boolean }>('/auth/me'),
  });
  const { data: surveys, error: surveysError } = useQuery({
    queryKey: ['surveys'],
    queryFn: psychologistApi.getTests,
  });
  const { data: submissions, error: submissionsError } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: psychologistApi.getAllSubmissions,
  });

  // Обрабатываем 403 ошибки — считаем что данных нет
  const surveysArray = Array.isArray(surveys) ? surveys : [];
  const submissionsArray = Array.isArray(submissions) ? submissions : [];
  
  const totalSurveys = surveysArray.length;
  const totalCompletions = submissionsArray.length;
  const recentResults = submissionsArray.slice(0, 5);
  
  // Подписка активна только если is_active = true и дата не прошла
  const nowTs = Date.now();
  const expiresAt = me?.access_expires_at ? new Date(me.access_expires_at) : null;
  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - nowTs) / (1000 * 60 * 60 * 24)))
    : 0;
  const isExpired = daysUntilExpiry <= 0;
  const isActive = Boolean(me?.is_active) && !isExpired;
  
  const expiryText = me?.access_expires_at
    ? `До ${new Date(me.access_expires_at).toLocaleDateString('ru-RU')}`
    : 'Без ограничения срока';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold uppercase tracking-tight">
          Личный кабинет
        </h1>
        <p className="text-muted-foreground">
          Добро пожаловать, {me?.full_name || 'пользователь'}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего опросников
            </CardTitle>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSurveys}</div>
            <p className="text-xs text-muted-foreground">
              Активных тестов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего прохождений
            </CardTitle>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletions}</div>
            <p className="text-xs text-muted-foreground">
              Клиентов прошли тесты
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Статус подписки
            </CardTitle>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isActive ? 'Активна' : 'Не активна'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isActive ? expiryText : 'Требуется продление'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Создать тест</CardTitle>
            <CardDescription>
              Новый опросник для клиентов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionGuard mode="block">
              <Link href="/builder">
                <Button className="w-full">Создать</Button>
              </Link>
            </SubscriptionGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Мои опросники</CardTitle>
            <CardDescription>
              Управление существующими тестами
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionGuard mode="block">
              <Link href="/surveys">
                <Button variant="outline" className="w-full">
                  Перейти
                </Button>
              </Link>
            </SubscriptionGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Результаты</CardTitle>
            <CardDescription>
              Просмотр прохождений клиентов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionGuard mode="block">
              <Link href="/results">
                <Button variant="outline" className="w-full">
                  Смотреть
                </Button>
              </Link>
            </SubscriptionGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Подписка</CardTitle>
            <CardDescription>
              Управление доступом к платформе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/subscription">
              <Button variant="outline" className="w-full">
                Подробнее
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Последние прохождения</CardTitle>
          <CardDescription>
            Последние 5 результатов тестирования
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentResults.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Пока нет прохождений
            </p>
          ) : (
            <div className="space-y-4">
              {recentResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{result.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.test?.title || `Тест #${result.test_id}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    <SubscriptionGuard mode="block">
                      <Link href={`/results/${String(result.id)}`}>
                        <Button variant="ghost" size="sm" className="h-8">
                          Подробнее
                        </Button>
                      </Link>
                    </SubscriptionGuard>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
