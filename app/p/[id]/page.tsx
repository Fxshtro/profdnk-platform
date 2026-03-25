'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';
import Link from 'next/link';

interface PublicPsychologistProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'psychologist' | 'admin';
  is_active: boolean;
  is_blocked: boolean;
  about_md: string;
  experience: string;
  specialization?: string;
}

export default function PsychologistCardPage() {
  const params = useParams();
  const psychologistId = params.id as string;

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['psychologist-card', psychologistId],
    queryFn: async () => {
      try {
        return await api.get<PublicPsychologistProfile>(endpoints.psychologistCard(Number(psychologistId)));
      } catch (error) {
        console.log('[Psychologist Card] API error, trying fallback...', error);
        
        // Fallback: пробуем получить из localStorage
        const session = JSON.parse(localStorage.getItem('auth_session') || '{}');
        console.log('[Psychologist Card] Session:', session);
        
        // Получаем профиль из localStorage если это текущий пользователь
        const storedProfile = JSON.parse(localStorage.getItem('profile') || '{}');
        console.log('[Psychologist Card] Stored profile:', storedProfile);
        
        if (session && String(session.userId) === psychologistId) {
          return {
            id: Number(session.userId),
            full_name: session.fullName || storedProfile.full_name || 'Психолог',
            email: session.email || storedProfile.email || 'email@example.com',
            phone: session.phone || storedProfile.phone || '+7 (999) 000-00-00',
            role: session.role || 'psychologist',
            is_active: true,
            is_blocked: false,
            about_md: storedProfile.about_md || 'Информация о себе не заполнена',
            experience: storedProfile.experience || 'Опыт работы не указан',
            specialization: storedProfile.specialization || 'Специализация не указана',
          };
        }
        
        throw new Error('Psychologist not found');
      }
    },
    enabled: !!psychologistId && !isNaN(Number(psychologistId)),
  });

  const profileUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : `/p/${psychologistId}`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Профиль не найден</CardTitle>
            <CardDescription>
              Психолог с таким ID не существует или профиль недоступен
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button>Вернуться на главную</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex justify-center -mt-16 mb-4">
              <div className="h-32 w-32 rounded-full bg-primary-foreground/30 border-4 border-background flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">{profile.full_name}</h1>
              {profile.specialization && (
                <p className="text-muted-foreground">{profile.specialization}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Контакты</CardTitle>
              <CardDescription>
                Связаться со специалистом
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              {profile.phone && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle>Опыт работы</CardTitle>
              <CardDescription>
                Профессиональная информация
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.experience ? (
                <div className="whitespace-pre-wrap text-sm">
                  {profile.experience}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  Информация об опыте не заполнена
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>О себе</CardTitle>
            <CardDescription>
              Информация от специалиста
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.about_md ? (
              <div className="whitespace-pre-wrap text-sm">
                {profile.about_md}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Информация о себе не заполнена
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-6">
          <p>© {new Date().getFullYear()} ПрофДНК — Платформа для профориентологов</p>
        </div>
      </div>
    </div>
  );
}
