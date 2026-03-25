'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { psychologistApi, type Psychologist } from '@/lib/api/psychologist';
import { ApiError } from '@/lib/api/client';

export default function AdminPsychologistsPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<Psychologist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  
  const { data: psychologistsState = [] } = useQuery({
    queryKey: ['admin-psychologists'],
    queryFn: psychologistApi.getPsychologists,
  });

  const filteredPsychologists = psychologistsState.filter((psychologist) => {
    const matchesSearch = psychologist.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubscription =
      subscriptionFilter === 'all' ||
      (subscriptionFilter === 'active' && psychologist.is_active) ||
      (subscriptionFilter === 'inactive' && !psychologist.is_active);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !psychologist.is_blocked) ||
      (statusFilter === 'blocked' && psychologist.is_blocked);

    return matchesSearch && matchesSubscription && matchesStatus;
  });

  const createMutation = useMutation({
    mutationFn: (payload: { full_name: string; email: string; password: string; phone?: string }) =>
      psychologistApi.createPsychologist(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-psychologists'] });
      setShowCreateDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, is_blocked, is_active }: { id: number; is_blocked?: boolean; is_active?: boolean }) =>
      psychologistApi.updatePsychologist(id, { is_blocked, is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-psychologists'] });
    },
  });

  const handleCreate = (formData: FormData) => {
    createMutation.mutate({
      full_name: String(formData.get('fullName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      phone: String(formData.get('phone') || '').trim() || undefined,
    });
  };

  const handleBlock = (id: number) => {
    updateMutation.mutate({ id, is_blocked: true, is_active: false });
  };

  const handleUnblock = (id: number) => {
    updateMutation.mutate({ id, is_blocked: false, is_active: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex-row flex-col flex gap-y-4 items-center justify-between sm:text-left text-center " >
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-unbounded">Управление психологами</h1>
          <p className="text-muted-foreground mt-1">
            Создание и управление аккаунтами специалистов
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Создать психолога
        </Button>
      </div>

      {/* Psychologists Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>Список психологов</CardTitle>
              <CardDescription>
                Все зарегистрированные специалисты в системе
              </CardDescription>
            </div>
            
            {/* Фильтры и поиск */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Поиск по имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:max-w-xs"
              />
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="flex h-10 sm:mt-3 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">Все подписки</option>
                <option value="active">Активна</option>
                <option value="inactive">Не активна</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
                className="flex h-10 sm:mt-3 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активен</option>
                <option value="blocked">Заблокирован</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPsychologists.length === 0 ? (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-1">Психологи не найдены</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                По вашему запросу ничего не найдено. Измените параметры поиска или фильтры.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead className="hidden sm:table-cell">Login</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Подписка</TableHead>
                  <TableHead className="hidden lg:table-cell">Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPsychologists.map((psychologist) => (
                  <TableRow key={psychologist.id}>
                    <TableCell className="font-medium">
                      {psychologist.full_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{psychologist.email.split('@')[0]}</TableCell>
                    <TableCell className="hidden md:table-cell">{psychologist.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant={psychologist.is_active ? 'success' : 'secondary'}
                      >
                        {psychologist.is_active ? 'Активна' : 'Не активна'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={psychologist.is_blocked ? 'destructive' : 'success'}>
                        {psychologist.is_blocked ? 'Заблокирован' : 'Активен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPsychologist(psychologist)}
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

      {/* Create Psychologist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать аккаунт психолога</DialogTitle>
            <DialogDescription>
              Заполните данные для создания нового аккаунта специалиста
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreate(formData);
            }}
            className="space-y-4"
          >
            {createMutation.isError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {createMutation.error instanceof ApiError
                  ? createMutation.error.message
                  : 'Не удалось создать аккаунт. Проверьте данные и попробуйте снова.'}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">ФИО</Label>
              <Input id="fullName" name="fullName" placeholder="Иванов Иван Иванович" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" placeholder="+7 (999) 000-00-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль (минимум 8 символов)</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Psychologist Details Dialog */}
      <Dialog open={!!selectedPsychologist} onOpenChange={(open) => !open && setSelectedPsychologist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Информация о психологе</DialogTitle>
            <DialogDescription>
              Детальная информация о специалисте
            </DialogDescription>
          </DialogHeader>

          {selectedPsychologist && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ФИО</p>
                  <p className="font-medium">{selectedPsychologist.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Логин</p>
                  <p className="font-medium">{selectedPsychologist.email.split('@')[0]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedPsychologist.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <Badge variant={selectedPsychologist.is_blocked ? 'destructive' : 'success'}>
                    {selectedPsychologist.is_blocked ? 'Заблокирован' : 'Активен'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Подписка</p>
                  <Badge variant={selectedPsychologist.is_active ? 'success' : 'secondary'}>
                    {selectedPsychologist.is_active ? 'Активна' : 'Не активна'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата окончания</p>
                  <p className="font-medium">
                    {selectedPsychologist.access_expires_at
                      ? new Date(selectedPsychologist.access_expires_at).toLocaleDateString('ru-RU')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата регистрации</p>
                  <p className="font-medium">—</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Действия</p>
                <div className="flex gap-2">
                  {selectedPsychologist.is_blocked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleUnblock(selectedPsychologist.id);
                        setSelectedPsychologist({ ...selectedPsychologist, is_blocked: false, is_active: true });
                      }}
                    >
                      Разблокировать
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleBlock(selectedPsychologist.id);
                        setSelectedPsychologist({ ...selectedPsychologist, is_blocked: true, is_active: false });
                      }}
                    >
                      Заблокировать
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-5">
            <Button onClick={() => setSelectedPsychologist(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
