'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { psychologistApi, type Psychologist } from '@/lib/api/psychologist';

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const { data: psychologists = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: psychologistApi.getSubscriptions,
  });
  const [selectedPsychologist, setSelectedPsychologist] = useState<Psychologist | null>(null);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [psychologistToReset, setPsychologistToReset] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const nowTs = useMemo(() => Date.now(), []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });

  const activateMutation = useMutation({
    mutationFn: (id: number) => psychologistApi.activatePsychologist(id),
    onSuccess: refresh,
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) => psychologistApi.extendSubscription(id, days),
    onSuccess: () => {
      refresh();
      setShowExtendDialog(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => psychologistApi.updatePsychologist(id, { is_active: false }),
    onSuccess: refresh,
  });

  const resetMutation = useMutation({
    mutationFn: (id: number) => psychologistApi.updatePsychologist(id, { is_active: false }),
    onSuccess: () => {
      refresh();
      setShowResetDialog(false);
      setPsychologistToReset(null);
    },
  });

  const handleExtend = () => {
    if (!selectedPsychologist) return;
    const days = Math.max(1, parseInt(extendDays, 10) || 30);
    extendMutation.mutate({ id: selectedPsychologist.id, days });
  };

  const handleCancel = (id: number) => {
    cancelMutation.mutate(id);
  };

  const isSubscriptionActive = (psychologist: Psychologist) => {
    if (!psychologist.is_active || psychologist.is_blocked) return false;
    if (!psychologist.access_expires_at) return false;
    const endDate = new Date(psychologist.access_expires_at);
    const daysUntilExpiry = Math.max(0, Math.ceil((endDate.getTime() - nowTs) / (1000 * 60 * 60 * 24)));
    return daysUntilExpiry > 0;
  };

  const handleReset = (id: number) => {
    setPsychologistToReset(id);
    setShowResetDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight sm:text-left text-center font-unbounded">Управление подписками</h1>
        <p className="text-muted-foreground mt-1">
          Активация, продление и отмена подписок психологов
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Как управлять подписками</CardTitle>
          <CardDescription>
            Подписка работает по принципу «доступ/нет доступа»
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Badge variant="secondary" className="mt-1">1</Badge>
              <div>
                <p className="font-medium">Активация</p>
                <p className="text-sm text-muted-foreground">
                  Предоставить доступ психологу на определённый срок после оплаты
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="secondary" className="mt-1">2</Badge>
              <div>
                <p className="font-medium">Продление</p>
                <p className="text-sm text-muted-foreground">
                  Продлить доступ на указанный срок после получения запроса
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Badge variant="secondary" className="mt-1">3</Badge>
              <div>
                <p className="font-medium">Отмена</p>
                <p className="text-sm text-muted-foreground">
                  Отключить доступ при нарушениях или неоплате
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все подписки</CardTitle>
          <CardDescription>
            Статус подписок всех психологов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Психолог</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Статус подписки</TableHead>
                <TableHead>Дата окончания</TableHead>
                <TableHead>Дней до окончания</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {psychologists.map((psychologist) => {
                const isActive = isSubscriptionActive(psychologist);
                const endDate = psychologist.access_expires_at
                  ? new Date(psychologist.access_expires_at)
                  : null;
                const daysUntilExpiry = endDate
                  ? Math.max(0, Math.ceil((endDate.getTime() - nowTs) / (1000 * 60 * 60 * 24)))
                  : 0;

                return (
                  <TableRow key={psychologist.id}>
                    <TableCell className="font-medium">
                      {psychologist.full_name}
                    </TableCell>
                    <TableCell>{psychologist.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? 'success' : 'secondary'}
                      >
                        {isActive ? 'Активна' : 'Не активна'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {endDate
                        ? endDate.toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {isActive ? daysUntilExpiry : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPsychologist(psychologist);
                              setShowExtendDialog(true);
                            }}
                          >
                            Активировать
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPsychologist(psychologist);
                                setShowExtendDialog(true);
                              }}
                            >
                              Продлить
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReset(psychologist.id)}
                            >
                              Сбросить
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Extend/Activate Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPsychologist?.is_active ? 'Продление подписки' : 'Активация подписки'}
            </DialogTitle>
            <DialogDescription>
              Психолог: {selectedPsychologist?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days">Срок действия (дней)</Label>
              <Input
                id="days"
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                min="1"
              />
            </div>

            <div className="rounded-md border border-input p-4">
              <p className="text-sm font-medium">Информация:</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Подписка будет активна в течение указанного срока</li>
                <li>Психолог получит доступ ко всем функциям платформы</li>
                <li>Уведомление об изменении будет отправлено психологу</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-5">
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!selectedPsychologist) return;
                if (selectedPsychologist.is_active) {
                  handleExtend();
                } else {
                  activateMutation.mutate(selectedPsychologist.id);
                  setShowExtendDialog(false);
                }
              }}
            >
              {selectedPsychologist?.is_active ? 'Продлить' : 'Активировать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResetDialog(false);
          setPsychologistToReset(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сброс подписки</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите сбросить подписку? Психолог потеряет доступ к платформе.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={resetMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => psychologistToReset && resetMutation.mutate(psychologistToReset)}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Сброс...' : 'Сбросить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
