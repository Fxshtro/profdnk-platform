'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { psychologistApi, downloadSubmissionReportDocx, type Test, type Submission } from '@/lib/api/psychologist';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Metric, MetricAssignment, Question } from '@/types';

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

// Преобразование вопросов из backend формата в Question
function toQuestion(raw: Record<string, unknown>): Question {
  const rawType = String(raw.type || 'text');
  const mappedType: Question['type'] =
    rawType === 'single' ? 'single-choice' :
    rawType === 'multi' ? 'multiple-choice' :
    rawType === 'slider' || rawType === 'rating' ? 'scale' :
    rawType === 'datetime' ? 'date' :
    rawType === 'textarea' ? 'text' :
    rawType === 'yesno' ? 'single-choice' :
    rawType === 'number' ? 'number' :
    'text';

  const optionsFromRaw = Array.isArray(raw.options)
    ? raw.options.map((o) =>
        typeof o === 'string'
          ? { value: o, score: 0 }
          : { 
              value: String((o as { value?: string }).value || ''), 
              score: 0,
              metricAssignments: (o as { metricAssignments?: MetricAssignment[] }).metricAssignments,
            }
      )
    : [];

  return {
    id: String(raw.id || ''),
    type: mappedType,
    title: String(raw.title || raw.text || 'Вопрос'),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    required: Boolean(raw.required),
    options: optionsFromRaw.length ? optionsFromRaw : undefined,
    min: typeof raw.min === 'number' ? raw.min : undefined,
    max: typeof raw.max === 'number' ? raw.max : undefined,
    step: typeof raw.step === 'number' ? raw.step : undefined,
  };
}

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  // Расчитываем метрики на frontend
  const metricResults = useMemo(() => {
    if (!result || !test) return [];

    const config = test.config_json as { metrics?: Metric[]; questions?: Record<string, unknown>[] };
    const metrics = config.metrics || [];
    if (metrics.length === 0) return [];

    const questions = (config.questions || []).map(toQuestion);
    
    // Подсчитываем баллы по метрикам
    const metricScores: Record<string, number> = {};
    metrics.forEach(m => {
      metricScores[m.id] = 0;
    });

    questions.forEach(question => {
      const answerValue = result.answers[question.id];
      if (answerValue === undefined || answerValue === null) return;

      // Для шкалы - пропорциональное распределение баллов по близости
      if (question.type === 'scale' && (question as any).metricValues) {
        const answerNum = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
        
        if (!isNaN(answerNum) && Object.keys((question as any).metricValues || {}).length > 0) {
          // Собираем значения метрик
          const metricEntries: Array<{ metricId: string; value: number; distance: number }> = [];
          
          Object.entries((question as any).metricValues || {}).forEach(([metricId, metricValue]) => {
            if (metricValue === null || metricValue === undefined) return;
            const numValue: number = typeof metricValue === 'string' ? parseFloat(metricValue) : (metricValue as number);
            if (isNaN(numValue)) return;
            
            const distance = Math.abs(answerNum - numValue);
            metricEntries.push({ metricId, value: numValue, distance });
          });
          
          if (metricEntries.length === 0) return;
          
          // Сумма обратных расстояний (для взвешивания)
          const totalInverseDistance = metricEntries.reduce((sum, entry) => {
            return sum + 1 / (entry.distance + 0.1);
          }, 0);
          
          // Распределяем 1 балл пропорционально близости
          metricEntries.forEach(entry => {
            const inverseDistance = 1 / (entry.distance + 0.1);
            const proportion = inverseDistance / totalInverseDistance;
            
            if (metricScores[entry.metricId] !== undefined) {
              metricScores[entry.metricId] += proportion;
            }
          });
        }
        return;
      }

      const matchingOption = question.options?.find(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        return optValue === answerValue || (Array.isArray(answerValue) && answerValue.includes(optValue));
      });

      if (matchingOption) {
        const optObj = typeof matchingOption === 'string' 
          ? { value: matchingOption, score: 0 }
          : matchingOption;

        optObj.metricAssignments?.forEach(assignment => {
          if (metricScores[assignment.metricId] !== undefined) {
            metricScores[assignment.metricId] += assignment.points;
          }
        });
      }
    });

    // Формируем результаты
    return metrics
      .map(metric => ({
        metricName: metric.name,
        value: metricScores[metric.id] || 0,
        description: metric.description,
        color: metric.color,
      }))
      .filter(r => r.value > 0); // Показываем только метрики с баллами > 0
  }, [result, test]);

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
            <Button className="mt-4" onClick={() => router.push('/results')}>
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
        <Link href="/results">
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
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      {(Object.keys(result.metrics || {}).length > 0 || typeof result.score === 'number' || metricResults.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Показатели</CardTitle>
            <CardDescription>
              Автоматически рассчитанные метрики
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Результаты по метрикам */}
              {metricResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Результаты по метрикам:</h3>
                  {metricResults.map((metricResult, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-start gap-3">
                        {metricResult.color && (
                          <div
                            className="w-4 h-4 rounded mt-1 shrink-0"
                            style={{ backgroundColor: metricResult.color }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{metricResult.metricName}</p>
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {metricResult.value} балл{metricResult.value === 1 ? '' : metricResult.value < 5 ? 'а' : 'ов'}
                            </Badge>
                          </div>
                          {metricResult.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {metricResult.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Старые метрики (для обратной совместимости) */}
              {Object.entries(result.metrics || {}).map(([metricName, value], index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{metricName}</p>
                    <p className="text-sm text-muted-foreground">
                      Расчитанная метрика
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {String(value)}
                  </Badge>
                </div>
              ))}
              
              {/* Итоговый результат по метрикам */}
              {metricResults.length > 0 && (
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-lg">Итоговый результат:</p>
                    {(() => {
                      const winner = metricResults.reduce((max, r) => r.value > max.value ? r : max, metricResults[0]);
                      return (
                        <div className="flex items-center gap-2">
                          {winner.color && (
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: winner.color }}
                            />
                          )}
                          <div className="text-right">
                            <p className="font-bold text-lg">{winner.metricName}</p>
                            <p className="text-sm text-muted-foreground">
                              {winner.value} балл{winner.value === 1 ? '' : winner.value < 5 ? 'а' : 'ов'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
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
