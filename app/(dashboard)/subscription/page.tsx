'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';

export default function SubscriptionPage() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { data: me, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ access_expires_at: string | null; is_active: boolean }>(endpoints.me),
    // Не выбрасываем ошибку при 403 — просто показываем что подписка не активна
    throwOnError: false,
  });

  const nowTs = useMemo(() => Date.now(), []);
  const endDate = me?.access_expires_at ? new Date(me.access_expires_at) : null;
  
  // Дней до окончания (0 если нет даты)
  const daysUntilExpiry = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - nowTs) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Подписка истекла если дней <= 0
  const isExpired = daysUntilExpiry <= 0;
  
  // Подписка активна только если is_active = true И дней > 0
  const isActive = Boolean(me?.is_active) && !isExpired;

  const handleRequestExtension = () => {
    setShowRequestDialog(true);
  };

  const submitRequest = () => {
    console.log('Request extension');
    setShowRequestDialog(false);
    // Will be replaced with API call
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Моя подписка</h1>
        <p className="text-muted-foreground mt-1">
          Управление доступом к платформе
        </p>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Статус подписки</CardTitle>
              <CardDescription>
                Текущее состояние вашего доступа к платформе
              </CardDescription>
            </div>
            <Badge variant={isActive ? 'success' : 'destructive'} className="text-sm px-4 py-2">
              {isActive ? 'Активна' : 'Не активна'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Дата окончания</p>
              <p className="text-2xl font-bold">
                {endDate
                  ? endDate.toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Дней до окончания</p>
              <p className="text-2xl font-bold">
                {isActive ? daysUntilExpiry : 0}
              </p>
            </div>
          </div>

          {isActive && daysUntilExpiry <= 7 && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive-foreground">
              <p className="font-medium">Внимание!</p>
              <p className="text-sm">
                Срок действия подписки истекает через {daysUntilExpiry} дн.
                Пожалуйста, продлите подписку для продолжения работы.
              </p>
            </div>
          )}

          {!isActive && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive-foreground">
              <p className="font-medium">Подписка не активна</p>
              <p className="text-sm">
                Доступ к платформе заблокирован. Пожалуйста, оплатите подписку
                и обратитесь к администратору для продления.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
          <CardDescription>
            Управление подпиской и доступом
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button onClick={handleRequestExtension}>
              Запросить продление
            </Button>
            <Button variant="outline" disabled>
              История платежей
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            После оплаты вы можете отправить запрос администратору на продление
            подписки. Администратор проверит поступление оплаты и активирует
            доступ на указанный срок.
          </p>
        </CardContent>
      </Card>

      {/* Extension Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запрос на продление подписки</DialogTitle>
            <DialogDescription>
              После отправки запроса администратор получит уведомление и проверит
              поступление оплаты. После подтверждения доступ будет продлён.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Текущий статус:</span>
                  <Badge variant={isActive ? 'success' : 'destructive'}>
                    {isActive ? 'Активна' : 'Не активна'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата окончания:</span>
                  <span>
                    {endDate
                      ? endDate.toLocaleDateString('ru-RU')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-input p-4">
              <p className="text-sm font-medium">Следующие шаги:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Оплатите подписку выбранным способом</li>
                <li>Отправьте этот запрос администратору</li>
                <li>Дождитесь подтверждения от администратора</li>
                <li>Проверьте статус подписки в личном кабинете</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Отмена
            </Button>
            <Button onClick={submitRequest}>
              Отправить запрос
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
