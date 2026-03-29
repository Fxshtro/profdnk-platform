'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Question, Metric, MetricAssignment } from '@/types';
import { ApiError, api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';

type PublicTestConfig = {
  questions?: Question[];
  sections?: Array<{ questions?: Array<Record<string, unknown>> }>;
  client_data?: { requireName?: boolean; requireEmail?: boolean; requirePhone?: boolean };
  clientDataConfig?: { requireName?: boolean; requireEmail?: boolean; requirePhone?: boolean };
};

function isAnswerEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function toBuilderQuestion(raw: Record<string, unknown>): Question {
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

  const options =
    rawType === 'yesno'
      ? [{ value: 'Да', score: 0 }, { value: 'Нет', score: 0 }]
      : optionsFromRaw;

  let min = typeof raw.min === 'number' ? raw.min : undefined;
  let max = typeof raw.max === 'number' ? raw.max : undefined;
  if (rawType === 'rating') {
    if (min === undefined) min = typeof raw.scale_min === 'number' ? raw.scale_min : 1;
    if (max === undefined) max = typeof raw.scale_max === 'number' ? raw.scale_max : 5;
  } else if (rawType === 'slider' || mappedType === 'scale') {
    if (min === undefined) min = 0;
    if (max === undefined) max = 10;
  }

  return {
    id: String(raw.id || ''),
    type: mappedType,
    title: String(raw.title || raw.text || 'Вопрос'),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    required: Boolean(raw.required),
    options: options.length ? options : undefined,
    min,
    max,
    step: typeof raw.step === 'number' ? raw.step : undefined,
    defaultScore: typeof raw.defaultScore === 'number' ? raw.defaultScore : undefined,
  };
}

export default function ClientSurveyPage() {
  const params = useParams();
  const surveyToken = params.surveyId as string;
  const [linkLimitExhausted, setLinkLimitExhausted] = useState(false);
  const [metricResults, setMetricResults] = useState<{ metric: Metric; score: number }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('surveyLinkLimits');
    if (saved) {
      try {
        const limits: Record<string, { token: string; limit: number; used: number }> = JSON.parse(saved);
        const limitData = limits[surveyToken];
        if (limitData && limitData.limit > 0 && limitData.used >= limitData.limit) {
          setLinkLimitExhausted(true);
        }
      } catch {
      }
    }
  }, [surveyToken]);

  const { data: surveyData, isLoading, isError } = useQuery({
    queryKey: ['public-test', surveyToken],
    queryFn: () => api.get<{ id: number; title: string; description?: string; config?: PublicTestConfig & { metrics?: Metric[] } }>(endpoints.publicTest(surveyToken)),
    enabled: !!surveyToken,
  });

  const clientDataConfig = surveyData?.config?.client_data || surveyData?.config?.clientDataConfig || {
    requireName: true,
    requireEmail: true,
    requirePhone: false,
  };

  const configQuestions = Array.isArray(surveyData?.config?.questions)
    ? (surveyData?.config?.questions as unknown as Array<Record<string, unknown>>)
    : [];
  const sectionQuestions = Array.isArray(surveyData?.config?.sections)
    ? surveyData!.config!.sections!.flatMap((s) => (Array.isArray(s.questions) ? s.questions : []))
    : [];
  const questions: Question[] = [...configQuestions, ...sectionQuestions].map(toBuilderQuestion);

  const [step, setStep] = useState<'data' | 'survey' | 'complete'>('data');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  /** Актуальные ответы для отправки (обход гонки: последний клик до обновления state). */
  const answersRef = useRef<Record<string, string | number | string[]>>({});
  const [errors, setErrors] = useState<{name?: string; email?: string; phone?: string}>({});
  const [totalScore, setTotalScore] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitMutation = useMutation({
    mutationFn: (payload: {
      client_name: string;
      client_email: string;
      client_phone?: string;
      answers: Record<string, string | number | string[]>;
    }) => api.post<{ ok: boolean; score: number; completion_percent?: number }>(endpoints.publicTestSubmit(surveyToken), payload),
  });

  const validateClientData = () => {
    const newErrors: {name?: string; email?: string; phone?: string} = {};

    if (!clientData.name.trim()) {
      newErrors.name = 'Введите ФИО';
    }

    if (clientDataConfig.requireEmail) {
      if (!clientData.email.trim()) {
        newErrors.email = 'Введите email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
        newErrors.email = 'Введите корректный email';
      }
    }

    if (clientDataConfig.requirePhone) {
      if (!clientData.phone.trim()) {
        newErrors.phone = 'Введите номер телефона';
      } else if (!/^[\d\s\-\+\(\)]+$/.test(clientData.phone)) {
        newErrors.phone = 'Введите корректный номер телефона';
      }
    } else if (clientData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(clientData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateClientData()) {
      setStep('survey');
    }
  };

  const handleAnswer = (value: string | number | string[]) => {
    const qid = currentQuestion.id;
    setAnswers((prev) => {
      const next = { ...prev, [qid]: value };
      answersRef.current = next;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = useCallback(() => {
    setSubmitError(null);
    const payloadAnswers = { ...answersRef.current };

    let testMetrics = surveyData?.config?.metrics || [];

    if (testMetrics.length === 0) {
      const metricIds = new Set<string>();
      const metricMap = new Map<string, { id: string; name: string; color?: string }>();
      
      [...configQuestions, ...sectionQuestions].forEach((q: Record<string, unknown>) => {
        const options = Array.isArray(q.options) ? q.options : [];
        options.forEach((opt: unknown) => {
          const optObj = opt as { metricAssignments?: Array<{ metricId: string; points: number }> };
          optObj.metricAssignments?.forEach(a => {
            metricIds.add(a.metricId);
          });
        });
      });

      metricIds.forEach(id => {
        metricMap.set(id, {
          id,
          name: `Метрика ${id}`,
        });
      });
      
      testMetrics = Array.from(metricMap.values());
    }

    console.log('[Metrics Debug]', {
      metricsCount: testMetrics.length,
      hasConfigMetrics: !!surveyData?.config?.metrics,
      questionsCount: questions.length,
      answers: payloadAnswers,
    });

    const metricScores: Record<string, number> = {};
    testMetrics.forEach(m => {
      metricScores[m.id] = 0;
    });

    questions.forEach((question, qIndex) => {
      const answerValue = payloadAnswers[question.id];
      if (answerValue === undefined || answerValue === null) return;

      console.log(`[Question ${qIndex}]`, {
        id: question.id,
        title: question.title?.substring(0, 50),
        type: question.type,
        answerValue,
        answerValueType: typeof answerValue,
        optionsCount: question.options?.length,
      });

      if (question.type === 'scale' && question.metricValues) {
        const answerNum = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
        
        if (!isNaN(answerNum) && Object.keys(question.metricValues).length > 0) {
          const metricEntries: Array<{ metricId: string; value: number; distance: number }> = [];

          Object.entries(question.metricValues).forEach(([metricId, metricValue]) => {
            if (metricValue === null || metricValue === undefined) return;
            const numValue = typeof metricValue === 'string' ? parseFloat(metricValue) : metricValue;
            if (isNaN(numValue)) return;
            
            const distance = Math.abs(answerNum - numValue);
            metricEntries.push({ metricId, value: numValue, distance });
          });
          
          if (metricEntries.length === 0) return;

          const totalInverseDistance = metricEntries.reduce((sum, entry) => {
            return sum + 1 / (entry.distance + 0.1);
          }, 0);

          metricEntries.forEach(entry => {
            const inverseDistance = 1 / (entry.distance + 0.1);
            const proportion = inverseDistance / totalInverseDistance;
            const points = proportion; // 1 балл распределяется пропорционально
            
            if (metricScores[entry.metricId] !== undefined) {
              metricScores[entry.metricId] += points;
            }
          });
          
          console.log('[Scale Proportional]', {
            answerValue: answerNum,
            metrics: metricEntries,
            totalInverseDistance,
          });
        }
        return;
      }

      const matchingOption = question.options?.find(opt => {
        const optObj = typeof opt === 'string' ? { value: opt, score: 0 } : opt;
        const optValue = optObj.value;
        const matches = optValue === answerValue || (Array.isArray(answerValue) && answerValue.includes(optValue));

        if (matches) {
          console.log('[Matching Option]', {
            optValue,
            metricAssignments: optObj.metricAssignments,
          });
        }

        return matches;
      });

      if (matchingOption) {
        const optObj = typeof matchingOption === 'string'
          ? { value: matchingOption, score: 0 }
          : matchingOption;

        optObj.metricAssignments?.forEach(assignment => {
          if (metricScores[assignment.metricId] !== undefined) {
            metricScores[assignment.metricId] += assignment.points;
            console.log('[Added Points]', {
              metricId: assignment.metricId,
              points: assignment.points,
              newTotal: metricScores[assignment.metricId],
            });
          }
        });
      }
    });

    console.log('[Metric Scores]', metricScores);

    const results = testMetrics
      .map(metric => ({
        metric,
        score: metricScores[metric.id] || 0,
      }))
      .filter(r => r.score > 0);

    console.log('[Final Results]', results);
    setMetricResults(results);

    submitMutation.mutate(
      {
        client_name: clientData.name.trim(),
        client_email: clientData.email.trim(),
        client_phone: clientData.phone.trim() || undefined,
        answers: payloadAnswers,
      },
      {
        onSuccess: (res) => {
          const saved = localStorage.getItem('surveyLinkLimits');
          if (saved) {
            try {
              const limits = JSON.parse(saved);
              if (limits[surveyToken]) {
                limits[surveyToken].used += 1;
                localStorage.setItem('surveyLinkLimits', JSON.stringify(limits));
              }
            } catch {
            }
          }
          const percent = typeof res?.completion_percent === 'number'
            ? res.completion_percent
            : (questions.length > 0 ? Math.round((res.score / questions.length) * 100) : 0);
          setTotalScore(percent);

          setTimeout(() => {
            setStep('complete');
          }, 100);
        },
        onError: (err: unknown) => {
          if (err instanceof ApiError) {
            setSubmitError(err.message || 'Не удалось отправить результаты');
            return;
          }
          setSubmitError('Не удалось отправить результаты');
        },
      }
    );
  }, [clientData, questions.length, submitMutation, surveyToken, surveyData, questions, configQuestions, sectionQuestions]);

  /** Обязательная шкала: без движения слайдера в answers нет значения — кнопка «Далее» недоступна. Ставим минимум по умолчанию. */
  useEffect(() => {
    if (step !== 'survey') return;
    const q = questions[currentQuestionIndex];
    if (!q || q.type !== 'scale' || !q.required) return;
    const id = q.id;
    if (!isAnswerEmpty(answersRef.current[id])) return;
    const smin = typeof q.min === 'number' ? q.min : 0;
    setAnswers((prev) => {
      if (!isAnswerEmpty(prev[id])) return prev;
      const next = { ...prev, [id]: smin };
      answersRef.current = next;
      return next;
    });
  }, [step, currentQuestionIndex, questions]);

  const renderQuestion = (question: Question) => {
    const value = answers[question.id];

    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Ваш ответ"
            rows={4}
            className="min-h-[300px] resize-y"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            min={question.min}
            max={question.max}
            step={question.step || 1}
            onChange={(e) => {
              const rawValue = e.target.value;
              if (rawValue === '') {
                handleAnswer('');
                return;
              }
              const parsed = Number(rawValue);
              if (Number.isNaN(parsed)) return;
              const min = typeof question.min === 'number' ? question.min : undefined;
              const max = typeof question.max === 'number' ? question.max : undefined;
              const clamped =
                typeof min === 'number' && parsed < min
                  ? min
                  : typeof max === 'number' && parsed > max
                    ? max
                    : parsed;
              handleAnswer(clamped);
            }}
            placeholder="Ваш ответ"
          />
        );

      case 'single-choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={typeof option === 'string' ? option : option.value}
                  checked={value === (typeof option === 'string' ? option : option.value)}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="h-4 w-4"
                />
                <span>{typeof option === 'string' ? option : option.value}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  value={typeof option === 'string' ? option : option.value}
                  checked={((value as string[]) || []).includes(typeof option === 'string' ? option : option.value)}
                  onChange={(e) => {
                    const current = (value as string[]) || [];
                    const optionValue = typeof option === 'string' ? option : option.value;
                    const newValue = e.target.checked
                      ? [...current, optionValue]
                      : current.filter((v) => v !== optionValue);
                    handleAnswer(newValue);
                  }}
                  className="h-4 w-4"
                />
                <span>{typeof option === 'string' ? option : option.value}</span>
              </label>
            ))}
          </div>
        );

      case 'scale': {
        const smin = typeof question.min === 'number' ? question.min : 0;
        const smax = typeof question.max === 'number' ? question.max : 10;
        const sstep = question.step && question.step > 0 ? question.step : 1;
        const numVal =
          typeof value === 'number' && !Number.isNaN(value) ? value : smin;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{smin}</span>
              <input
                type="range"
                min={smin}
                max={smax}
                step={sstep}
                value={numVal}
                onChange={(e) => handleAnswer(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">{smax}</span>
            </div>
            <p className="text-center text-lg font-medium">{numVal}</p>
          </div>
        );
      }

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleAnswer(e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center text-muted-foreground">Загружаем тест...</CardContent>
        </Card>
      </div>
    );
  }

  if (linkLimitExhausted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="h-8 w-8 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">Лимит исчерпан</CardTitle>
            <CardDescription>
              К сожалению, лимит прохождений по этой ссылке исчерпан.
              Обратитесь к психологу для получения новой ссылки.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isError || !surveyData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center text-destructive">Тест не найден или недоступен.</CardContent>
        </Card>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center text-muted-foreground">
            В этом тесте пока нет вопросов.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">Тест завершён!</CardTitle>
            <CardDescription>
              Ваши ответы успешно сохранены
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Блок с результатом */}
            <div className="rounded-lg bg-muted p-6">
              <p className="text-sm text-muted-foreground mb-2">Ваш результат</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-primary">{totalScore}</span>
                <span className="text-2xl text-muted-foreground">/ 100</span>
              </div>
              {/* Прогресс бар */}
              <div className="mt-4 h-3 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ width: `${totalScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {totalScore >= 80 ? 'Отличный результат! 🎉' :
                 totalScore >= 60 ? 'Хороший результат! 👍' :
                 totalScore >= 40 ? 'Средний результат 👌' :
                 'Есть куда расти 💪'}
              </p>
            </div>

            {/* Результаты по метрикам */}
            {metricResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Ваши результаты:</h3>
                {metricResults.map((result, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded mt-1 shrink-0"
                          style={{ backgroundColor: result.metric.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{result.metric.name}</p>
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {result.score} балл{result.score === 1 ? '' : result.score < 5 ? 'а' : 'ов'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Результаты переданы специалисту. При необходимости он свяжется с вами.
            </p>
            <Button onClick={() => (window.location.href = '/')} className="w-full">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'data') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{surveyData.title}</CardTitle>
            <CardDescription>
              Заполните данные для начала тестирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitError && (
              <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {submitError}
              </p>
            )}
            <form onSubmit={handleDataSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ФИО *</Label>
                <Input
                  id="name"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  required
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              {clientDataConfig.requireEmail && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    placeholder="example@email.com"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              )}
              {clientDataConfig.requirePhone && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Номер телефона {clientDataConfig.requirePhone && '*'}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              )}
              <Button type="submit" className="w-full">
                Начать тестирование
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{surveyData.title}</CardTitle>
              <CardDescription>
                Вопрос {currentQuestionIndex + 1} из {questions.length}
              </CardDescription>
            </div>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {submitError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
              {submitError}
            </p>
          )}
          <div className="space-y-4">
            <Label className="text-base">
              {currentQuestion.title}
              {currentQuestion.required && <span className="text-destructive"> *</span>}
            </Label>
            {renderQuestion(currentQuestion)}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestionIndex === 0 || submitMutation.isPending}
            >
              Назад
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                submitMutation.isPending ||
                (currentQuestion.required && isAnswerEmpty(answers[currentQuestion.id]))
              }
            >
              {submitMutation.isPending && currentQuestionIndex === questions.length - 1
                ? 'Отправка…'
                : currentQuestionIndex === questions.length - 1
                  ? 'Завершить'
                  : 'Далее'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
