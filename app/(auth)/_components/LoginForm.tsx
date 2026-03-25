'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, endpoints } from '@/lib/api/config';
import { messageFromApiErrorPayload } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    
    try {
      const formData = new URLSearchParams();
      formData.set('username', data.login);
      formData.set('password', data.password);

      const loginResponse = await fetch(`${API_BASE_URL}${endpoints.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!loginResponse.ok) {
        const raw = await loginResponse.text();
        setError(messageFromApiErrorPayload(raw) || 'Неверный email или пароль');
        return;
      }

      const loginJson = (await loginResponse.json()) as { access_token: string; token_type?: string };
      const token = loginJson.access_token;
      if (!token) {
        setError('Сервер не вернул токен авторизации');
        return;
      }

      const meResponse = await fetch(`${API_BASE_URL}${endpoints.me}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let me: { id: number; email: string; role: 'admin' | 'psychologist'; full_name: string; is_active?: boolean };

      if (meResponse.status === 403) {
        try {
          const responseData = await meResponse.json();
          me = {
            id: responseData.id || 0,
            email: responseData.email || data.login,
            role: responseData.role || 'psychologist',
            full_name: responseData.full_name || 'Пользователь',
            is_active: responseData.is_active ?? false,
          };
        } catch {
          me = {
            id: 0,
            email: data.login,
            role: 'psychologist',
            full_name: 'Пользователь',
            is_active: false,
          };
        }
      } else if (!meResponse.ok) {
        const raw = await meResponse.text();
        setError(
          messageFromApiErrorPayload(raw) || 'Не удалось получить профиль пользователя'
        );
        return;
      } else {
        me = await meResponse.json();
      }

      const session = {
        token,
        userId: String(me.id),
        email: me.email,
        role: me.role,
        fullName: me.full_name,
        is_active: me.is_active ?? true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      queryClient.clear();

      localStorage.setItem('auth_session', JSON.stringify(session));
      localStorage.setItem('auth_token', token);

      if (me.role === 'admin') {
        router.push('/admin/psychologists');
      } else {
        router.push('/dashboard');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Произошла ошибка при входе. Попробуйте позже.');
    }
  };

  if (!isInitialized) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Button>
          </Link>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
            <CardDescription>
              Введите свои данные для входа в личный кабинет
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Логин</Label>
            <Input
              id="login"
              type="text"
              placeholder="Введите логин"
              disabled={isSubmitting}
              {...register('login')}
            />
            {errors.login && (
              <p className="text-sm text-destructive">{errors.login.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Пароль</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Введите пароль"
              disabled={isSubmitting}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Вход...' : 'Войти'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Или
              </span>
            </div>
          </div>

          <Link href="/" className="block">
            <Button variant="outline" className="w-full" type="button">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Вернуться на главную
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
