'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyClipboardButton } from '@/components/ui/copy-clipboard-button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { psychologistApi } from '@/lib/api/psychologist';
import Link from 'next/link';

interface LinkLimit {
  token: string;
  limit: number;
  used: number;
}

export default function SurveysPage() {
  const { data: surveys = [], isLoading, isError } = useQuery({
    queryKey: ['surveys'],
    queryFn: psychologistApi.getTests,
  });
  const [selectedSurvey, setSelectedSurvey] = useState<(typeof surveys)[number] | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkLimits, setLinkLimits] = useState<Record<string, LinkLimit>>({});
  const [customLimit, setCustomLimit] = useState<Record<string, string>>({});
  const [useCustomLimit, setUseCustomLimit] = useState<Record<string, boolean>>({});

  // Загружаем лимиты из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('surveyLinkLimits');
    if (saved) {
      try {
        setLinkLimits(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Сохраняем лимиты в localStorage
  const saveLinkLimit = (token: string, limit: number) => {
    const newLimits = {
      ...linkLimits,
      [token]: {
        token,
        limit,
        used: linkLimits[token]?.used || 0,
      },
    };
    setLinkLimits(newLimits);
    localStorage.setItem('surveyLinkLimits', JSON.stringify(newLimits));
  };

  // Обработка изменения лимита
  const handleLimitChange = (token: string, value: string) => {
    if (value === 'custom') {
      setUseCustomLimit(prev => ({ ...prev, [token]: true }));
    } else if (value === 'unlimited') {
      setUseCustomLimit(prev => ({ ...prev, [token]: false }));
      saveLinkLimit(token, 0);
    } else {
      setUseCustomLimit(prev => ({ ...prev, [token]: false }));
      saveLinkLimit(token, parseInt(value));
    }
  };

  // Обработка ввода кастомного лимита
  const handleCustomLimitChange = (token: string, value: string) => {
    setCustomLimit(prev => ({ ...prev, [token]: value }));
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      saveLinkLimit(token, numValue);
    }
  };

  // Увеличиваем счётчик использований
  const incrementLinkUse = (token: string) => {
    if (!linkLimits[token]) return;
    const newLimits = {
      ...linkLimits,
      [token]: {
        ...linkLimits[token],
        used: linkLimits[token].used + 1,
      },
    };
    setLinkLimits(newLimits);
    localStorage.setItem('surveyLinkLimits', JSON.stringify(newLimits));
  };

  // Сбрасываем счётчик
  const resetLinkUse = (token: string) => {
    if (!linkLimits[token]) return;
    const newLimits = {
      ...linkLimits,
      [token]: {
        ...linkLimits[token],
        used: 0,
      },
    };
    setLinkLimits(newLimits);
    localStorage.setItem('surveyLinkLimits', JSON.stringify(newLimits));
  };

  const getLimitStatus = (token: string) => {
    const limitData = linkLimits[token];
    if (!limitData) {
      return { isUnlimited: true, isExhausted: false, used: 0, limit: 0 };
    }
    if (limitData.limit === 0) {
      return { isUnlimited: true, isExhausted: false, used: limitData.used, limit: 0 };
    }
    return {
      isUnlimited: false,
      isExhausted: limitData.used >= limitData.limit,
      used: limitData.used,
      limit: limitData.limit,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Мои опросники</h1>
          <p className="text-muted-foreground mt-1">
            Управление созданными тестами и методиками
          </p>
        </div>
        <Link href="/builder?new=1">
          <Button>Создать тест</Button>
        </Link>
      </div>

      {/* Surveys List */}
      <Card>
        <CardHeader>
          <CardTitle>Список опросников</CardTitle>
          <CardDescription>
            Все созданные вами тесты с статистикой прохождений
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Прохождения</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Загружаем опросники...
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    Не удалось загрузить опросники.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && surveys.map((survey) => (
                <TableRow key={survey.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{survey.title}</p>
                      {survey.description && (
                        <p className="text-sm text-muted-foreground">
                          {survey.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Активен</Badge>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    {new Date(survey.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/builder?copyFrom=${survey.id}`}>
                        <Button variant="secondary" size="sm">
                          Копировать
                        </Button>
                      </Link>
                      <Dialog open={showLinkDialog && selectedSurvey?.id === survey.id} onOpenChange={setShowLinkDialog}>
                        <DialogTrigger>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSurvey(survey)}
                          >
                            Ссылка
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ссылка на прохождение</DialogTitle>
                            <DialogDescription>
                              Отправьте эту ссылку клиенту для прохождения теста
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all">
                                {`${typeof window !== 'undefined' ? window.location.origin : ''}/client/${survey.unique_token}`}
                              </code>
                              <CopyClipboardButton
                                variant="outline"
                                widthPreset="compact"
                                text={`${typeof window !== 'undefined' ? window.location.origin : ''}/client/${survey.unique_token}`}
                                defaultLabel="Копировать"
                                copiedLabel="Скопировано!"
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`limit-${survey.unique_token}`} className="text-sm font-medium">
                                    Лимит прохождений
                                  </Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetLinkUse(survey.unique_token)}
                                    disabled={getLimitStatus(survey.unique_token).used === 0}
                                  >
                                    Сброс
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    id={`limit-${survey.unique_token}`}
                                    value={
                                      useCustomLimit[survey.unique_token]
                                        ? 'custom'
                                        : getLimitStatus(survey.unique_token).isUnlimited
                                          ? 'unlimited'
                                          : String(getLimitStatus(survey.unique_token).limit)
                                    }
                                    onChange={(e) => handleLimitChange(survey.unique_token, e.target.value)}
                                    className="flex-1"
                                  >
                                    <SelectItem value="unlimited" label="Безлимитно" />
                                    <SelectItem value="1" label="1 раз" />
                                    <SelectItem value="3" label="3 раза" />
                                    <SelectItem value="5" label="5 раз" />
                                    <SelectItem value="10" label="10 раз" />
                                    <SelectItem value="20" label="20 раз" />
                                    <SelectItem value="50" label="50 раз" />
                                    <SelectItem value="custom" label="Своё значение..." />
                                  </Select>
                                  {useCustomLimit[survey.unique_token] && (
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="Кол-во"
                                      value={customLimit[survey.unique_token] || ''}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomLimitChange(survey.unique_token, e.target.value)}
                                      className="w-[120px]"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Использовано:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {getLimitStatus(survey.unique_token).used} /{' '}
                                      {getLimitStatus(survey.unique_token).isUnlimited
                                        ? '∞'
                                        : getLimitStatus(survey.unique_token).limit}
                                    </span>
                                    {getLimitStatus(survey.unique_token).isExhausted && (
                                      <Badge variant="destructive">Лимит исчерпан</Badge>
                                    )}
                                  </div>
                                </div>
                                {getLimitStatus(survey.unique_token).used > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => resetLinkUse(survey.unique_token)}
                                  >
                                    Сбросить счётчик
                                  </Button>
                                )}
                              </div>

                              {getLimitStatus(survey.unique_token).isExhausted && (
                                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive">
                                  <p className="text-sm font-medium">⚠️ Лимит исчерпан</p>
                                  <p className="text-xs mt-1">
                                    Ссылка больше не действительна. Увеличьте лимит или сбросьте счётчик для повторной активации.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => setShowLinkDialog(false)}>
                              Закрыть
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Link href={`/surveys/${survey.id}`}>
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
