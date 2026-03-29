'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { psychologistApi } from '@/lib/api/psychologist';
import { ApiError } from '@/lib/api/client';
import { filterPhoneDigits } from '@/lib/phone-digits';

export interface CreatePsychologistPrefill {
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
}

interface CreatePsychologistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CreatePsychologistPrefill | null;
  onCreated?: () => void;
}

export default function CreatePsychologistDialog({
  open,
  onOpenChange,
  initial,
  onCreated,
}: CreatePsychologistDialogProps): ReactElement {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFullName(initial.full_name.trim());
      setEmail(initial.email.trim());
      setPhone(filterPhoneDigits(initial.phone ?? ''));
      setSpecialization((initial.specialization ?? '').trim());
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setSpecialization('');
    }
    setPassword('');
  }, [open, initial]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      full_name: string;
      email: string;
      password: string;
      phone?: string;
      specialization?: string;
    }) => psychologistApi.createPsychologist(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-psychologists'] });
      onCreated?.();
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    createMutation.mutate({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() ? phone.trim() : undefined,
      specialization: specialization.trim() ? specialization.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать аккаунт психолога</DialogTitle>
          <DialogDescription>
            {initial
              ? 'Данные подставлены из заявки. Задайте пароль и при необходимости поправьте поля.'
              : 'Заполните данные для создания нового аккаунта специалиста'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {createMutation.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {createMutation.error instanceof ApiError
                ? createMutation.error.message
                : 'Не удалось создать аккаунт. Проверьте данные и попробуйте снова.'}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="create-psych-fullName">ФИО</Label>
            <Input
              id="create-psych-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-psych-email">Email</Label>
            <Input
              id="create-psych-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-psych-phone">Телефон</Label>
            <Input
              id="create-psych-phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(filterPhoneDigits(e.target.value))}
              placeholder="79990001122"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-psych-specialization">Специализация</Label>
            <Input
              id="create-psych-specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Например: профориентолог, клинический психолог"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-psych-password">Пароль (минимум 8 символов)</Label>
            <Input
              id="create-psych-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
