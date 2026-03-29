'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { psychologistApi, downloadSubmissionReportDocx, type Test } from '@/lib/api/psychologist';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Metric } from '@/types';
import {
  parseSubmissionMetricsWithConfig,
  countQuestionsInTest,
  formatMetricValueDisplay,
} from '@/lib/metrics-display';

function getQuestionWording(test: Test | undefined, questionId: string): string | null {
  const cfg = test?.config_json as
    | { questions?: Array<{ id?: string; title?: string; text?: string }> }
    | undefined;
  const list = cfg?.questions;
  if (!Array.isArray(list)) return null;
  const found = list.find((q) => String(q?.id) === String(questionId));
  if (!found) return null;
  const t = String(found.title || found.text || '').trim();
  return t || null;
}

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyIdParam = searchParams.get('surveyId');
  const resultsListHref =
    surveyIdParam != null && surveyIdParam !== ''
      ? `/results?surveyId=${encodeURIComponent(surveyIdParam)}`
      : '/results';
  const [docxLoading, setDocxLoading] = useState(false);
  const resultId = Number(params.id as string);
  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['submission', resultId],
    queryFn: () => psychologistApi.getSubmission(resultId),
    enabled: Number.isFinite(resultId),
  });

  // Загружаем тест для получения вопросов с metricAssignments
  const { data: test } = useQuery({
    queryKey: ['test', result?.test_id],
    queryFn: () => psychologistApi.getTest(result?.test_id as number),
    enabled: !!result?.test_id,
  });

  const configMetrics = useMemo((): Metric[] => {
    const cfg = (test ?? result?.test)?.config_json as { metrics?: Metric[] } | undefined;
    return Array.isArray(cfg?.metrics) ? cfg.metrics : [];
  }, [test, result?.test]);

  const parsedMetrics = useMemo(
    () => parseSubmissionMetricsWithConfig(result?.metrics, configMetrics),
    [result?.metrics, configMetrics]
  );

  const questionsTotal = useMemo(
    () => countQuestionsInTest(test ?? result?.test),
    [test, result?.test]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Загружаем результат...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result || isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Результат не найден или недоступен</p>
            <Button className="mt-4" onClick={() => router.push(resultsListHref)}>
              Назад к списку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Результат тестирования</h1>
          <p className="text-muted-foreground mt-1">
            Детальная информация о прохождении
          </p>
        </div>
        <Link href={resultsListHref}>
          <Button variant="outline">Назад</Button>
        </Link>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle>Данные клиента</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">ФИО</p>
              <p className="font-medium">{result.client_name}</p>
            </div>
            {result.client_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{result.client_email}</p>
              </div>
            )}
            {result.client_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Телефон</p>
                <p className="font-medium">{result.client_phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Тест</p>
              <p className="font-medium">{result.test?.title || `Тест #${result.test_id}`}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата прохождения</p>
              <p className="font-medium">
                {new Date(result.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Вопросов отвечено</p>
              <p className="font-medium">
                {questionsTotal > 0
                  ? `${result.score}/${questionsTotal}`
                  : String(result.score)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {parsedMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Показатели</CardTitle>
            <CardDescription>Метрики по данным сервера</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parsedMetrics.map((m) => (
                <div key={m.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {m.color ? (
                        <div
                          className="w-4 h-4 rounded mt-0.5 shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium">{m.name}</p>
                        {m.description ? (
                          <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2 shrink-0 tabular-nums">
                      {formatMetricValueDisplay(m.value)}
                    </Badge>
                  </div>
                </div>
              ))}
              {parsedMetrics.length > 1 ? (
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-lg">Наибольший показатель</p>
                    {(() => {
                      const winner = parsedMetrics.reduce((a, b) => (a.value >= b.value ? a : b));
                      return (
                        <div className="flex items-center gap-2">
                          {winner.color ? (
                            <div
                              className="w-4 h-4 rounded shrink-0"
                              style={{ backgroundColor: winner.color }}
                            />
                          ) : null}
                          <div className="text-right">
                            <p className="font-bold text-lg">{winner.name}</p>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              {formatMetricValueDisplay(winner.value)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Ответы клиента</CardTitle>
          <CardDescription>
            Все ответы на вопросы теста
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(result.answers || {}).map(([questionId, value], index) => {
              const wording = getQuestionWording(result.test, questionId);
              return (
                <div key={questionId} className="rounded-lg border p-4">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Вопрос {index + 1}</p>
                    {wording && (
                      <p className="mt-1 text-sm font-medium text-foreground">{wording}</p>
                    )}
                  </div>
                  <p className="font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              );
            })}
            {Object.keys(result.answers || {}).length === 0 && (
              <p className="text-sm text-muted-foreground">Ответы отсутствуют.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href={`/reports?resultId=${result.id}&testId=${result.test_id}`}>
              <Button>Сформировать отчёт</Button>
            </Link>
            <Button
              variant="outline"
              disabled={docxLoading}
              onClick={async () => {
                setDocxLoading(true);
                try {
                  await downloadSubmissionReportDocx(result.test_id, result.id, 'specialist');
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Не удалось скачать DOCX');
                } finally {
                  setDocxLoading(false);
                }
              }}
            >
              {docxLoading ? 'Формируем файл…' : 'Скачать результаты (DOCX)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
