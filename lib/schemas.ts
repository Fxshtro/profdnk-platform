import { z } from 'zod';

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, 'Логин должен содержать минимум 3 символа')
    .max(50, 'Логин не должен превышать 50 символов'),
  password: z
    .string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(100, 'Пароль не должен превышать 100 символов'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const surveySchema = z.object({
  title: z
    .string()
    .min(3, 'Название должно содержать минимум 3 символа')
    .max(200, 'Название не должно превышать 200 символов'),
  description: z
    .string()
    .max(500, 'Описание не должно превышать 500 символов')
    .optional(),
});

export type SurveyFormData = z.infer<typeof surveySchema>;

export const questionSchema = z.object({
  title: z
    .string()
    .min(1, 'Вопрос обязателен')
    .max(500, 'Вопрос не должен превышать 500 символов'),
  description: z
    .string()
    .max(200, 'Описание не должно превышать 200 символов')
    .optional(),
  type: z.enum(['text', 'number', 'single-choice', 'multiple-choice', 'scale', 'date']),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

export type QuestionFormData = z.infer<typeof questionSchema>;

export const clientDataSchema = z.object({
  name: z
    .string()
    .min(3, 'Введите корректное имя')
    .max(100, 'Имя не должно превышать 100 символов'),
  email: z
    .string()
    .email('Введите корректный email')
    .optional()
    .or(z.literal('')),
  age: z
    .number()
    .min(1, 'Возраст должен быть больше 0')
    .max(120, 'Возраст не может быть больше 120')
    .optional()
    .or(z.literal(undefined)),
  city: z
    .string()
    .max(100, 'Название города не должно превышать 100 символов')
    .optional(),
  occupation: z
    .string()
    .max(200, 'Описание занятий не должно превышать 200 символов')
    .optional(),
});

export type ClientDataFormData = z.infer<typeof clientDataSchema>;
