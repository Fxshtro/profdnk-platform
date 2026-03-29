'use client';

import { useMemo, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { psychologistApi, type Submission } from '@/lib/api/psychologist';
import { countQuestionsInTest } from '@/lib/metrics-display';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function SubmissionProgressBadge({ submission }: { submission: Submission }): ReactElement {
  const total = countQuestionsInTest(submission.test);
  const answered = typeof submission.score === 'number' ? submission.score : 0;
  if (total > 0) {
    return <Badge variant="secondary">{answered}/{total} отвечено</Badge>;
  }
  return <Badge variant="outline">Ответов: {answered}</Badge>;
}

function parseSurveyIdParam(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyIdFilter = parseSurveyIdParam(searchParams.get('surveyId'));

  const { data: submissions = [], isLoading, isError } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: psychologistApi.getAllSubmissions,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['psychologist-tests'],
    queryFn: psychologistApi.getTests,
  });

  const activeTestTitle = useMemo(() => {
    if (surveyIdFilter == null) return null;
    const t = tests.find((x) => x.id === surveyIdFilter);
    return t?.title ?? null;
  }, [surveyIdFilter, tests]);

  const displaySubmissions = useMemo(() => {
    if (surveyIdFilter == null) return submissions;
    return submissions.filter((s) => s.test_id === surveyIdFilter);
  }, [submissions, surveyIdFilter]);

  const resultsLastWeek = useMemo(() => {
    const weekAgo = Date.now() - WEEK_MS;
    return displaySubmissions.filter((r) => {
      const date = new Date(r.created_at).getTime();
      return date >= weekAgo;
    }).length;
  }, [displaySubmissions]);

  const averageScore = useMemo(() => {
    if (!displaySubmissions.length) return 0;
    const total = displaySubmissions.reduce((sum, item) => sum + (item.score || 0), 0);
    return Math.round(total / displaySubmissions.length);
  }, [displaySubmissions]);

  const setSurveyFilter = (value: string): void => {
    if (!value) {
      router.replace('/results');
      return;
    }
    router.replace(`/results?surveyId=${encodeURIComponent(value)}`);
  };

  const filterLabel =
    surveyIdFilter != null
      ? activeTestTitle ?? `Тест #${surveyIdFilter}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Результаты и метрики</h1>
        <p className="text-muted-foreground mt-1">
          Просмотр прохождений и анализ результатов
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего прохождений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displaySubmissions.length}</div>
            <p className="text-xs text-muted-foreground">
              {surveyIdFilter != null ? 'По выбранному опроснику' : 'Клиентов прошли тестирование'}
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
              {surveyIdFilter != null ? 'По выбранному опроснику' : 'Активность клиентов'}
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
              {surveyIdFilter != null ? 'По выбранному опроснику' : 'По всем тестам'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{surveyIdFilter != null ? 'Прохождения по опроснику' : 'Все прохождения'}</CardTitle>
            <CardDescription>
              {surveyIdFilter != null ? (
                <>
                  Показаны только результаты по опроснику «{filterLabel}». Переход с карточки опроса или выбор
                  ниже задаёт фильтр автоматически.
                </>
              ) : (
                'Детальная информация по каждому клиенту'
              )}
            </CardDescription>
          </div>
          <div className="space-y-2 sm:w-72">
            <Label htmlFor="results-survey-filter">Опросник</Label>
            <Select
              id="results-survey-filter"
              value={surveyIdFilter != null ? String(surveyIdFilter) : ''}
              onChange={(e) => setSurveyFilter(e.target.value)}
            >
              <option value="">Все опросники</option>
              {[...tests]
                .sort((a, b) => b.id - a.id)
                .map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.title}
                  </option>
                ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {surveyIdFilter != null ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Фильтр: {filterLabel}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSurveyFilter('')}>
                Показать все
              </Button>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Тест</TableHead>
                <TableHead>Дата прохождения</TableHead>
                <TableHead>Прохождение</TableHead>
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
              {!isLoading && !isError && displaySubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {surveyIdFilter != null
                      ? 'По этому опроснику пока нет прохождений.'
                      : 'Пока нет прохождений.'}
                  </TableCell>
                </TableRow>
              )}
              {displaySubmissions.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{result.client_name}</p>
                      {result.client_email ? (
                        <p className="text-sm text-muted-foreground">{result.client_email}</p>
                      ) : null}
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
                    <SubmissionProgressBadge submission={result} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={
                          surveyIdFilter != null
                            ? `/results/${String(result.id)}?surveyId=${surveyIdFilter}`
                            : `/results/${String(result.id)}`
                        }
                      >
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
