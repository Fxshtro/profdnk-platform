'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveApplication, type Application } from '@/lib/users';

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    education: '',
    comment: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Создаём заявку
    const application: Application = {
      id: `app-${Date.now()}`,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      specialization: formData.specialization,
      education: formData.education,
      experience: formData.experience,
      comment: formData.comment,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    
    // Сохраняем в localStorage
    saveApplication(application);
    console.log('Application submitted:', application);
    
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">Заявка отправлена!</CardTitle>
            <CardDescription>
              Ваша заявка на регистрацию успешно отправлена
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Администратор рассмотрит вашу заявку в ближайшее время и свяжется с вами по указанным контактам.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Подать заявку на регистрацию</CardTitle>
          <CardDescription>
            Заполните форму для получения доступа к платформе ПрофДНК
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">ФИО *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 000-00-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Специализация *</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="Профориентолог, психолог"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Образование *</Label>
              <Input
                id="education"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="ВУЗ, специальность, год окончания"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Опыт работы</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Опишите ваш опыт работы (стаж, места работы, направления)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Дополнительная информация"
                rows={2}
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                После отправки заявки администратор рассмотрит её в течение 1-3 рабочих дней. 
                При положительном решении вы получите доступ к платформе на указанный email.
              </p>
            </div>

            <Button type="submit" className="w-full">
              Отправить заявку
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
