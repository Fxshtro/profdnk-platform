'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { hashPassword } from '@/lib/auth';
import { createUser, getApplications, saveApplication, updateApplication, type Application } from '@/lib/users';

const MOCK_APPLICATIONS: Application[] = [
  {
    id: '1',
    fullName: 'Петрова Анна Сергеевна',
    email: 'petrova@example.com',
    phone: '+7 (999) 111-22-33',
    specialization: 'Профориентолог',
    education: 'МГУ им. Ломоносова, Психологический факультет, 2018',
    experience: '5 лет в профориентации, работа с подростками и взрослыми',
    comment: 'Хочу развивать свою практику с помощью современных инструментов',
    status: 'pending',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2',
    fullName: 'Сидоров Петр Ильич',
    email: 'sidorov@example.com',
    phone: '+7 (888) 222-33-44',
    specialization: 'Клинический психолог',
    education: 'СПбГУ, Медицинский факультет, 2013',
    experience: '10 лет клинической практики',
    comment: '',
    status: 'approved',
    submittedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '3',
    fullName: 'Козлова Мария Ивановна',
    email: 'kozlova@example.com',
    phone: '+7 (777) 333-44-55',
    specialization: 'Карьерный консультант',
    education: 'ВШЭ, Психология, 2020',
    experience: '3 года',
    comment: 'Рекомендована коллегами',
    status: 'rejected',
    submittedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('applications') || '[]');
    setApplications(saved.length > 0 ? saved : MOCK_APPLICATIONS);
  }, []);

  const handleApprove = async () => {
    if (!selectedApplication) return;

    const tempPassword = 'temp' + Math.random().toString(36).slice(-6);

    await createUser({
      email: selectedApplication.email,
      password: tempPassword,
      fullName: selectedApplication.fullName,
      role: 'psychologist',
      subscription: {
        isActive: true,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    updateApplication(selectedApplication.id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
    });

    setApplications(prev => prev.map(app =>
      app.id === selectedApplication.id 
        ? { ...app, status: 'approved' as const, reviewedAt: new Date().toISOString() }
        : app
    ));
    
    setShowResponseDialog(false);
    setSelectedApplication(null);
    setResponseText('');
    
    alert(`Заявка одобрена!\n\nПсихолог ${selectedApplication.fullName} создан.\n\nВременный пароль: ${tempPassword}\n\nПсихолог может войти используя email и этот пароль.`);
  };

  const handleReject = () => {
    if (!selectedApplication) return;

    updateApplication(selectedApplication.id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
    });
    
    setApplications(prev => prev.map(app => 
      app.id === selectedApplication.id 
        ? { ...app, status: 'rejected' as const, reviewedAt: new Date().toISOString() }
        : app
    ));
    
    setShowResponseDialog(false);
    setSelectedApplication(null);
    setResponseText('');
    alert('Заявка отклонена');
  };

  const getStatusBadge = (status: Application['status']) => {
    const variants: Record<Application['status'], 'secondary' | 'success' | 'destructive'> = {
      pending: 'secondary',
      approved: 'success',
      rejected: 'destructive',
    };
    const labels: Record<Application['status'], string> = {
      pending: 'На рассмотрении',
      approved: 'Одобрено',
      rejected: 'Отклонено',
    };
    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight font-unbounded">Заявки психологов</h1>
        <p className="text-muted-foreground mt-1">
          Рассмотрение заявок на регистрацию в системе
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Требуют рассмотрения
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Одобрено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              За всё время
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отклонено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              За всё время
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
          <CardDescription>
            Список всех поданных заявок на регистрацию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Специализация</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Дата подачи</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">
                    {application.fullName}
                  </TableCell>
                  <TableCell>{application.specialization}</TableCell>
                  <TableCell>{application.email}</TableCell>
                  <TableCell>
                    {new Date(application.submittedAt).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(application.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(application);
                        setShowResponseDialog(true);
                      }}
                      disabled={application.status !== 'pending'}
                    >
                      {application.status === 'pending' ? 'Рассмотреть' : 'Просмотр'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResponseDialog(false);
          setSelectedApplication(null);
          setResponseText('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Рассмотрение заявки</DialogTitle>
            <DialogDescription>
              Информация о заявителе и форма ответа
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold">Данные заявителя</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    <p className="font-medium">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{selectedApplication.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Специализация</p>
                    <p className="font-medium">{selectedApplication.specialization}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Образование</p>
                    <p className="font-medium">{selectedApplication.education}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Опыт работы</p>
                    <p className="font-medium">{selectedApplication.experience || 'Не указан'}</p>
                  </div>
                  {selectedApplication.comment && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Комментарий</p>
                      <p className="font-medium">{selectedApplication.comment}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  При одобрении заявки психолог получит доступ к платформе на указанный email.
                  При отклонении — уведомление с причиной (если указана).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={selectedApplication?.status !== 'pending'}
            >
              Отклонить
            </Button>
            <Button
              onClick={handleApprove}
              disabled={selectedApplication?.status !== 'pending'}
            >
              Одобрить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
