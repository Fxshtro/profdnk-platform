'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { psychologistApi } from '@/lib/api/psychologist';
import { ProfileQRCode } from '@/components/features/ProfileQRCode';
import { cn } from '@/lib/utils';
import { filterPhoneDigits } from '@/lib/phone-digits';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [qrPanelMounted, setQrPanelMounted] = useState(false);
  const [qrPanelActive, setQrPanelActive] = useState(false);
  const qrPanelWasActiveRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    about_md: '',
    specialization: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: psychologistApi.getProfile,
  });

  // Сохраняем профиль в localStorage при загрузке
  useEffect(() => {
    if (profile) {
      localStorage.setItem('profile', JSON.stringify(profile));
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: { full_name?: string; phone?: string; about_md?: string }) =>
      psychologistApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        about_md: profile.about_md || '',
        specialization: profile.specialization ?? '',
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      full_name: '',
      phone: '',
      about_md: '',
      specialization: '',
    });
  };

  const handleSave = () => {
    if (profile?.role === 'psychologist') {
      updateMutation.mutate(formData);
    } else {
      updateMutation.mutate({
        full_name: formData.full_name,
        phone: formData.phone,
        about_md: formData.about_md,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const next = field === 'phone' ? filterPhoneDigits(value) : value;
    setFormData(prev => ({ ...prev, [field]: next }));
  };

  const requestCloseQrPanel = useCallback(() => {
    setQrPanelActive(false);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      queueMicrotask(() => setQrPanelMounted(false));
    }
  }, []);

  useLayoutEffect(() => {
    if (!qrPanelMounted) return;
    setQrPanelActive(false);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setQrPanelActive(true));
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
    };
  }, [qrPanelMounted]);

  const handleQrPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
      if (qrPanelActive || !qrPanelMounted) return;
      setQrPanelMounted(false);
    },
    [qrPanelActive, qrPanelMounted],
  );

  useEffect(() => {
    if (!qrPanelMounted || !qrPanelActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestCloseQrPanel();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [qrPanelMounted, qrPanelActive, requestCloseQrPanel]);

  useEffect(() => {
    if (!qrPanelMounted) {
      qrPanelWasActiveRef.current = false;
      return;
    }
    if (qrPanelActive) {
      qrPanelWasActiveRef.current = true;
      return;
    }
    if (!qrPanelWasActiveRef.current) return;
    qrPanelWasActiveRef.current = false;
    const id = window.setTimeout(() => setQrPanelMounted(false), 400);
    return () => clearTimeout(id);
  }, [qrPanelMounted, qrPanelActive]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Профиль</h1>
          <p className="text-muted-foreground mt-1">
            Информация о вашем аккаунте
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Загрузка...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Профиль</h1>
          <p className="text-muted-foreground mt-1">
            Информация о вашем аккаунте
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit}>
            Редактировать
          </Button>
        )}
      </div>

      {saveStatus === 'success' && (
        <div className="rounded-md border border-green-500 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          Профиль успешно обновлён
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          Не удалось обновить профиль
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Информация об аккаунте</CardTitle>
            <CardDescription>
              Основные данные вашего профиля
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Электронная почта</Label>
              <Input value={profile?.email || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">ФИО</Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              ) : (
                <Input value={profile?.full_name || ''} disabled />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="79990001122"
                />
              ) : (
                <Input value={profile?.phone || 'Не указан'} disabled />
              )}
            </div>

            <div className="space-y-2">
              <Label>Роль</Label>
              <Input
                value={profile?.role === 'admin' ? 'Администратор' : 'Психолог'}
                disabled
              />
            </div>

            {profile?.role === 'psychologist' ? (
              <div className="space-y-2">
                <Label htmlFor="specialization">Специализация</Label>
                {isEditing ? (
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    placeholder="Например: профориентолог, карьерный консультант"
                  />
                ) : (
                  <Input
                    value={profile.specialization?.trim() || 'Не указана'}
                    disabled
                    className={!profile.specialization?.trim() ? 'text-muted-foreground' : ''}
                  />
                )}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Статус подписки</Label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    profile?.is_active && !profile?.is_blocked
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span>
                  {profile?.is_active && !profile?.is_blocked
                    ? 'Активен'
                    : 'Не активен'}
                </span>
              </div>
            </div>

            {profile?.access_expires_at && (
              <div className="space-y-2">
                <Label>Действует до</Label>
                <Input
                  value={new Date(profile.access_expires_at).toLocaleDateString('ru-RU')}
                  disabled
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>О себе</CardTitle>
            <CardDescription>
              Информация для клиентов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="about_md">Расскажите о себе</Label>
                <Textarea
                  id="about_md"
                  value={formData.about_md}
                  onChange={(e) => handleInputChange('about_md', e.target.value)}
                  placeholder="Напишите несколько слов о вашей специализации, опыте и подходе к работе..."
                  rows={10}
                />
              </div>
            ) : (
              <div className="rounded-md border p-4">
                {profile?.about_md ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {profile.about_md}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    Информация о себе не заполнена
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isEditing && (
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
            Отмена
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Статистика аккаунта</CardTitle>
          <CardDescription>
            Общая информация о вашей деятельности
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Дата регистрации</p>
              <p className="text-lg font-semibold">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('ru-RU')
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">ID аккаунта</p>
              <p className="text-lg font-semibold">#{profile?.id}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Статус</p>
              <p className="text-lg font-semibold">
                {profile?.is_blocked ? 'Заблокирован' : 'Активен'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile && (
        <>
          <button
            type="button"
            aria-label={qrPanelMounted && qrPanelActive ? 'Закрыть QR профиля' : 'Открыть QR профиля'}
            aria-expanded={qrPanelMounted && qrPanelActive}
            className={cn(
              'fixed right-0 top-1/2 z-45 flex h-14 w-13 -translate-y-1/2 items-center justify-center rounded-l-full border border-r-0 border-border bg-card shadow-md transition-colors hover:bg-accent cursor-pointer',
              qrPanelMounted && qrPanelActive && 'z-65',
            )}
            onClick={() => {
              if (qrPanelMounted && qrPanelActive) {
                requestCloseQrPanel();
                return;
              }
              if (!qrPanelMounted) {
                setQrPanelMounted(true);
              }
            }}
          >
            <Share2 className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
          </button>

          {qrPanelMounted && (
            <>
              <button
                type="button"
                aria-label="Закрыть"
                className={cn(
                  'fixed inset-0 z-55 bg-black/60 transition-opacity duration-300 ease-out',
                  qrPanelActive ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={requestCloseQrPanel}
              />
              <div className="pointer-events-none fixed inset-0 z-60 max-lg:flex max-lg:items-center max-lg:justify-center max-lg:p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Ваш профиль, QR-код для быстрого доступа"
                  onTransitionEnd={handleQrPanelTransitionEnd}
                  className={cn(
                    'pointer-events-auto flex max-h-[min(85vh,calc(100dvh-2rem))] flex-col items-center justify-center overflow-y-auto rounded-xl border bg-background px-4 pb-6 pt-12 shadow-xl duration-300 ease-out motion-reduce:transition-none',
                    'max-lg:w-[min(100vw-2rem,28rem)] max-lg:transition-[transform,opacity] max-lg:will-change-[transform,opacity]',
                    qrPanelActive ? 'max-lg:translate-y-0 max-lg:opacity-100' : 'max-lg:-translate-y-3 max-lg:opacity-0',
                    'lg:fixed lg:right-0 lg:top-16 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:max-w-md lg:w-full lg:rounded-l-xl lg:rounded-r-none lg:border-r-0 lg:shadow-2xl lg:transition-transform lg:will-change-transform',
                    qrPanelActive ? 'lg:translate-x-0' : 'lg:translate-x-full',
                  )}
                >
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="absolute right-3 top-3 z-10 rounded-sm p-1.5 text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:opacity-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={requestCloseQrPanel}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="mx-auto my-auto w-full max-w-sm shrink-0">
                  <ProfileQRCode
                    profileUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`}
                    psychologistName={profile.full_name || 'Психолог'}
                    psychologistId={profile.id}
                  />
                </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
