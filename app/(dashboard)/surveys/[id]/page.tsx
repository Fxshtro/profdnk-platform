'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyClipboardButton } from '@/components/ui/copy-clipboard-button';
import { Badge } from '@/components/ui/badge';
import { psychologistApi } from '@/lib/api/psychologist';
import Link from 'next/link';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type SurveyQuestion = {
  id?: string;
  type?: string;
  required?: boolean;
  title?: string;
  text?: string;
  options?: Array<string | { value: string }>;
};

type SurveyFormula = {
  id?: string;
  name?: string;
  description?: string;
  expression?: string;
};

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.id as string);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => psychologistApi.getTest(surveyId),
    enabled: Number.isFinite(surveyId),
  });
  const deleteMutation = useMutation({
    mutationFn: () => psychologistApi.deleteTest(surveyId),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      router.push('/surveys');
    },
  });

  const config = (survey?.config_json as {
    questions?: SurveyQuestion[];
    formulas?: SurveyFormula[];
    minParticipants?: number;
    maxParticipants?: number;
    min_participants?: number;
    max_participants?: number;
  } | undefined) || {};
  const questions: SurveyQuestion[] = Array.isArray(config.questions) ? config.questions : [];
  const formulas: SurveyFormula[] = Array.isArray(config.formulas) ? config.formulas : [];
  const minP = config.minParticipants ?? config.min_participants;
  const maxP = config.maxParticipants ?? config.max_participants;
  const hasLimits =
    (typeof minP === 'number' && Number.isFinite(minP)) || (typeof maxP === 'number' && Number.isFinite(maxP));

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center text-muted-foreground">Загрузка...</CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Опросник не найден</p>
            <Button className="mt-4" onClick={() => router.push('/surveys')}>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">{survey.title}</h1>
          <p className="text-muted-foreground mt-1">{survey.description}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/surveys">
            <Button variant="outline" className="w-full sm:w-auto">Назад</Button>
          </Link>
          <Link href={`/builder?testId=${survey.id}`}>
            <Button className="w-full sm:w-auto">Редактировать</Button>
          </Link>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            Удалить
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Статус</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success">Активен</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Прохождения</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Вопросов</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{questions.length}</p>
          </CardContent>
        </Card>

        {hasLimits && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Лимит участников</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {typeof minP === 'number' && Number.isFinite(minP) ? minP : '—'} —{' '}
                {typeof maxP === 'number' && Number.isFinite(maxP) ? maxP : '—'} чел.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Задаётся в конструкторе. Чтобы изменить — «Редактировать».
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Questions Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Вопросы</CardTitle>
          <CardDescription>
            Список вопросов в этом опроснике
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id || index} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Вопрос {index + 1}</Badge>
                      <Badge>{question.type || 'text'}</Badge>
                      {question.required && (
                        <Badge variant="outline">Обязательный</Badge>
                      )}
                    </div>
                    <p className="font-medium">{question.title || question.text || 'Без текста'}</p>
                  </div>
                </div>
                {question.options && (
                  <div className="mt-3 space-y-1">
                    {question.options.map((option, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {i + 1}. {typeof option === 'string' ? option : option.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {questions.length === 0 && <p className="text-sm text-muted-foreground">В этом тесте пока нет вопросов.</p>}
        </CardContent>
      </Card>

      {/* Formulas */}
      {formulas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Формулы расчёта</CardTitle>
            <CardDescription>
              Формулы для автоматического расчёта показателей
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formulas.map((formula) => (
                <div key={formula.id} className="rounded-lg border p-4">
                  <p className="font-medium">{formula.name}</p>
                  <p className="text-sm text-muted-foreground">{formula.description}</p>
                  <code className="mt-2 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                    {formula.expression}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href={`/results?surveyId=${survey.id}`}>
              <Button variant="outline">Показать результаты</Button>
            </Link>
            <CopyClipboardButton
              variant="outline"
              widthPreset="link"
              text={() =>
                `${typeof window !== 'undefined' ? window.location.origin : ''}/client/${survey.unique_token}`
              }
              defaultLabel="Копировать ссылку"
              copiedLabel="Скопировано!"
            />
          </div>
        </CardContent>
      </Card>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить опросник</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить этот опросник? Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
