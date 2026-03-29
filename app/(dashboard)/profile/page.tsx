'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { psychologistApi } from '@/lib/api/psychologist';
import { ProfileQRCode } from '@/components/features/ProfileQRCode';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    about_md: '',
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
    });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+7 (999) 000-00-00"
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
        <div className="max-w-md">
          <ProfileQRCode
            profileUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`}
            psychologistName={profile?.full_name || 'Психолог'}
            psychologistId={profile?.id}
          />
        </div>
      )}
    </div>
  );
}
