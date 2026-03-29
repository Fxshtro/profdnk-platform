'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreatePsychologistDialog, {
  type CreatePsychologistPrefill,
} from '@/components/features/admin/create-psychologist-dialog';
import { applicationsApi } from '@/lib/api/applications';
import type { Application } from '@/lib/users';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Trash2, Mail } from 'lucide-react';

interface ApplicationWithViewed extends Application {
  viewed?: boolean;
}

function applicationToPrefill(app: Application): CreatePsychologistPrefill {
  const ext = app as Application & { full_name?: string };
  return {
    full_name: ext.fullName ?? ext.full_name ?? '',
    email: ext.email,
    phone: ext.phone ?? '',
    specialization: ext.specialization ?? '',
  };
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithViewed | null>(null);
  const [showCreatePsychologist, setShowCreatePsychologist] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<CreatePsychologistPrefill | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    applicationId: number | null;
  }>({ open: false, applicationId: null });

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.getApplications(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => applicationsApi.rejectApplication(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDeleteDialog({ open: false, applicationId: null });
      setSelectedApplication(null);
    },
  });

  const handleDelete = (application: Application) => {
    setDeleteDialog({
      open: true,
      applicationId: typeof application.id === 'number' ? application.id : Number(application.id),
    });
  };

  const confirmDelete = () => {
    if (!deleteDialog.applicationId) return;
    deleteMutation.mutate(deleteDialog.applicationId);
  };

  const markAsViewed = (applicationId: number | string) => {
    const viewedIds = JSON.parse(localStorage.getItem('viewedApplications') || '[]') as number[];
    const id = typeof applicationId === 'number' ? applicationId : Number(applicationId);
    if (!viewedIds.includes(id)) {
      viewedIds.push(id);
      localStorage.setItem('viewedApplications', JSON.stringify(viewedIds));
    }
  };

  const isViewed = (applicationId: number | string) => {
    const viewedIds = JSON.parse(localStorage.getItem('viewedApplications') || '[]') as number[];
    const id = typeof applicationId === 'number' ? applicationId : Number(applicationId);
    return viewedIds.includes(id);
  };

  const getStatusBadge = (status: Application['status']) => {
    const variants = {
      pending: 'secondary' as const,
      approved: 'success' as const,
      rejected: 'destructive' as const,
    };
    const labels = {
      pending: 'На рассмотрении',
      approved: 'Одобрено',
      rejected: 'Отклонено',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center text-muted-foreground">
            Загрузка заявок...
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingApplications = applications?.filter(a => a.status === 'pending') || [];
  const reviewedApplications = applications?.filter(a => a.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Заявки психологов</h1>
        <p className="text-muted-foreground mt-1">
          Управление заявками на регистрацию психологов
        </p>
      </div>

      {/* Заявки на рассмотрении */}
      <Card>
        <CardHeader>
          <CardTitle>Новые заявки</CardTitle>
          <CardDescription>
            Заявки, требующие рассмотрения ({pendingApplications.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет заявок на рассмотрении
            </p>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((application) => {
                const viewed = isViewed(application.id);
                return (
                  <div
                    key={application.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      viewed ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-stretch justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${!viewed ? 'text-primary' : ''}`}>
                            {application.fullName}
                          </h3>
                          {getStatusBadge(application.status)}
                          {!viewed && (
                            <Badge variant="outline" className="text-xs">
                              Новая
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{application.specialization}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-full"
                          onClick={() => handleDelete(application)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-full"
                          onClick={() => {
                            markAsViewed(application.id);
                            setSelectedApplication(application);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Подробнее
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Рассмотренные заявки */}
      {reviewedApplications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Рассмотренные заявки</CardTitle>
              <CardDescription>
                Архив обработанных заявок ({reviewedApplications.length})
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewedApplications.map((application) => {
                const viewed = isViewed(application.id);
                return (
                  <div
                    key={application.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      viewed ? 'bg-muted/30' : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-stretch justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${!viewed ? 'text-primary' : ''}`}>
                            {application.fullName}
                          </h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{application.specialization}</p>
                        </div>
                        {application.reviewedAt && (
                          <p className="text-xs text-muted-foreground">
                            Рассмотрено: {new Date(application.reviewedAt).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-full"
                          onClick={() => handleDelete(application)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-full"
                          onClick={() => {
                            markAsViewed(application.id);
                            setSelectedApplication(application);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Подробнее
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Диалог просмотра деталей */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Заявка на регистрацию</DialogTitle>
              <DialogDescription>
                Детали заявки от {selectedApplication.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Статус:</span>
                  {getStatusBadge(selectedApplication.status)}
                </div>
                <div className="grid gap-1">
                  <span className="text-sm font-medium">ФИО:</span>
                  <p className="text-sm text-muted-foreground">{selectedApplication.fullName}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-sm font-medium">Email:</span>
                  <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-sm font-medium">Телефон:</span>
                  <p className="text-sm text-muted-foreground">{selectedApplication.phone || '—'}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-sm font-medium">Специализация:</span>
                  <p className="text-sm text-muted-foreground">{selectedApplication.specialization}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-sm font-medium">Образование:</span>
                  <p className="text-sm text-muted-foreground">{selectedApplication.education}</p>
                </div>
                {selectedApplication.experience && (
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Опыт работы:</span>
                    <p className="text-sm text-muted-foreground">{selectedApplication.experience}</p>
                  </div>
                )}
                {selectedApplication.comment && (
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Комментарий:</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedApplication.comment}
                    </p>
                  </div>
                )}
                <div className="grid gap-1 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Заявка отправлена: {new Date(selectedApplication.submittedAt).toLocaleString('ru-RU')}
                  </span>
                  {selectedApplication.reviewedAt && (
                    <span className="text-xs text-muted-foreground">
                      Рассмотрено: {new Date(selectedApplication.reviewedAt).toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-stretch">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setCreatePrefill(applicationToPrefill(selectedApplication));
                    setShowCreatePsychologist(true);
                    setSelectedApplication(null);
                  }}
                >
                  Быстро создать аккаунт
                </Button>
                <a href={`mailto:${selectedApplication.email}`} className="inline-flex">
                  <Button variant="outline" type="button" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Написать на почту
                  </Button>
                </a>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelectedApplication(null)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <CreatePsychologistDialog
        open={showCreatePsychologist}
        onOpenChange={(open) => {
          setShowCreatePsychologist(open);
          if (!open) setCreatePrefill(null);
        }}
        initial={createPrefill}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ['applications'] });
          void queryClient.invalidateQueries({ queryKey: ['admin-psychologists'] });
        }}
      />

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить заявку</DialogTitle>
            <DialogDescription>
              Заявка будет отклонена без возможности восстановления.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}
              disabled={deleteMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
