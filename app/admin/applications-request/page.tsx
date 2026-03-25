'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApplications, type Application } from '@/lib/users';

export default function AdminApplicationsRequestPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Загружаем заявки из localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('applications') || '[]');
    setApplications(saved);
  }, []);

  const handleDelete = () => {
    if (!selectedApplication) return;

    const updated = applications.filter(a => a.id !== selectedApplication.id);
    setApplications(updated);
    localStorage.setItem('applications', JSON.stringify(updated));

    setShowDetailDialog(false);
    setSelectedApplication(null);
  };

  const handleEmailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight font-unbounded">Заявки на регистрацию</h1>
        <p className="text-muted-foreground mt-1">
          Рассмотрение заявок от психологов на добавление в систему
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Все заявки в системе
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => !a.reviewedAt).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Требуют просмотра
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
          <CardDescription>
            Список всех поданных заявок на регистрацию психолога
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="h-16 w-16 text-muted-foreground/50 mb-4"
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
              <h3 className="text-lg font-semibold mb-1">Заявок нет</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Заявки от психологов на регистрацию ещё не поступали.
                Когда они появятся, вы сможете просмотреть их здесь.
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
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.fullName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{application.specialization}</TableCell>
                    <TableCell className="hidden md:table-cell">{application.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(application.submittedAt).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowDetailDialog(true);
                        }}
                      >
                        Подробнее
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDetailDialog(false);
          setSelectedApplication(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className='mb-5'>Заявка на регистрацию психолога</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold text-lg">Данные заявителя</h4>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    <p className="font-medium text-base">{selectedApplication.fullName}</p>
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
                  {selectedApplication.experience && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Опыт работы</p>
                      <p className="font-medium">{selectedApplication.experience}</p>
                    </div>
                  )}
                  {selectedApplication.comment && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Комментарий</p>
                      <p className="font-medium">{selectedApplication.comment}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопка для написания на email */}
              <div className="flex justify-between gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Удалить заявку
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleEmailClick(selectedApplication.email)}
                  className="gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Написать на {selectedApplication.email}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
