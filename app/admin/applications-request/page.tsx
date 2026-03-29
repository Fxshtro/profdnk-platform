'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import CreatePsychologistDialog, {
  type CreatePsychologistPrefill,
} from '@/components/features/admin/create-psychologist-dialog';
import { applicationsApi } from '@/lib/api/applications';
import type { Application } from '@/lib/users';
import { Mail, Trash2 } from 'lucide-react';

function applicationToPrefill(app: Application): CreatePsychologistPrefill {
  const ext = app as Application & { full_name?: string };
  return {
    full_name: ext.fullName ?? ext.full_name ?? '',
    email: ext.email,
    phone: ext.phone ?? '',
    specialization: ext.specialization ?? '',
  };
}

function applicationNumericId(app: Application): number | null {
  if (typeof app.id === 'number' && !Number.isNaN(app.id)) return app.id;
  const n = Number(app.id);
  return Number.isNaN(n) ? null : n;
}

export default function AdminApplicationsRequestPage() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showCreatePsychologist, setShowCreatePsychologist] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<CreatePsychologistPrefill | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    applicationId: number | null;
  }>({ open: false, applicationId: null });

  const { data: applications = [], isLoading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.getApplications(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => applicationsApi.rejectApplication(String(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDeleteDialog({ open: false, applicationId: null });
      setSelectedApplication(null);
    },
  });

  const handleDeleteConfirm = (): void => {
    if (!deleteDialog.applicationId) return;
    deleteMutation.mutate(deleteDialog.applicationId);
  };

  const openRejectDialog = (app: Application): void => {
    const id = applicationNumericId(app);
    if (id === null) return;
    setDeleteDialog({ open: true, applicationId: id });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        Загрузка заявок...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>Не удалось загрузить заявки. Войдите как администратор и проверьте доступ к API.</p>
      </div>
    );
  }

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight font-unbounded">Заявки на регистрацию</h1>
        <p className="text-muted-foreground mt-1">
          Рассмотрение заявок от психологов на добавление в систему
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">Все заявки в системе</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">На рассмотрении</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Статус «ожидает»</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
          <CardDescription>Список поданных заявок на регистрацию психолога</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="mb-4 h-16 w-16 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mb-1 text-lg font-semibold">Заявок нет</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Заявки от психологов ещё не поступали. Когда появятся, они отобразятся здесь для всех
                администраторов.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead className="hidden sm:table-cell">Специализация</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Дата подачи</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={String(application.id)}>
                    <TableCell className="font-medium">{application.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{application.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell">{application.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(application.submittedAt).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openRejectDialog(application)}
                          aria-label="Отклонить заявку"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApplication(application)}
                        >
                          Подробнее
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedApplication ? (
        <Dialog open onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="mb-5">Заявка на регистрацию психолога</DialogTitle>
              <DialogDescription className="sr-only">
                Детали заявки от {selectedApplication.fullName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="text-lg font-semibold">Данные заявителя</h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    <p className="text-base font-medium">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{selectedApplication.phone || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Специализация</p>
                    <p className="font-medium">{selectedApplication.specialization}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Образование</p>
                    <p className="font-medium">{selectedApplication.education}</p>
                  </div>
                  {selectedApplication.experience ? (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Опыт работы</p>
                      <p className="font-medium">{selectedApplication.experience}</p>
                    </div>
                  ) : null}
                  {selectedApplication.comment ? (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Комментарий</p>
                      <p className="font-medium">{selectedApplication.comment}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
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
                      Написать на {selectedApplication.email}
                    </Button>
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      openRejectDialog(selectedApplication);
                    }}
                  >
                    Отклонить заявку
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSelectedApplication(null)}>
                    Закрыть
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

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

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
            <DialogDescription>
              Заявка будет помечена как отклонённая. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}
              disabled={deleteMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
