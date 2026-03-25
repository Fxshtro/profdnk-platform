'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { psychologistApi } from '@/lib/api/psychologist';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOW_TS = Date.now();

export default function ResultsPage() {
  const { data: submissions = [], isLoading, isError } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: psychologistApi.getAllSubmissions,
  });

  const resultsLastWeek = useMemo(() => {
    const weekAgo = NOW_TS - WEEK_MS;
    return submissions.filter((r) => {
      const date = new Date(r.created_at).getTime();
      return date >= weekAgo;
    }).length;
  }, [submissions]);

  const averageScore = useMemo(() => {
    if (!submissions.length) return 0;
    const total = submissions.reduce((sum, item) => sum + (item.score || 0), 0);
    return Math.round(total / submissions.length);
  }, [submissions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Результаты и метрики</h1>
        <p className="text-muted-foreground mt-1">
          Просмотр прохождений и анализ результатов
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего прохождений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Клиентов прошли тестирование
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">За последние 7 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resultsLastWeek}</div>
            <p className="text-xs text-muted-foreground">
              Активность клиентов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            <p className="text-xs text-muted-foreground">
              По всем тестам
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все прохождения</CardTitle>
          <CardDescription>
            Детальная информация по каждому клиенту
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Тест</TableHead>
                <TableHead>Дата прохождения</TableHead>
                <TableHead>Результаты</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Загружаем прохождения...
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Не удалось загрузить результаты. Проверьте API и авторизацию.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Пока нет прохождений.
                  </TableCell>
                </TableRow>
              )}
              {submissions.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{result.client_name}</p>
                      {result.client_email && (
                        <p className="text-sm text-muted-foreground">
                          {result.client_email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{result.test?.title || `Тест #${result.test_id}`}</TableCell>
                  <TableCell>
                    {new Date(result.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(result.metrics || {}).map(([metricName, value]) => (
                        <Badge key={metricName} variant="secondary">
                          {metricName}: {String(value)}
                        </Badge>
                      ))}
                      {(!result.metrics || Object.keys(result.metrics).length === 0) && (
                        <Badge variant="outline">Score: {result.score}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/results/${String(result.id)}`}>
                        <Button variant="outline" size="sm">
                          Подробнее
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
