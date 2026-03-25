import { Psychologist, Survey, SurveyResult, Subscription } from '@/types';

export const mockSubscription: Subscription = {
  isActive: true,
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockPsychologist: Psychologist = {
  id: 'psych-1',
  login: 'psychologist',
  email: 'psychologist@example.com',
  fullName: 'Иванов Иван Иванович',
  subscription: mockSubscription,
  isBlocked: false,
  createdAt: new Date().toISOString(),
};

export const mockSurveys: Survey[] = [
  {
    id: 'survey-1',
    title: 'Профориентация для подростков',
    description: 'Тест для определения профессиональных предпочтений',
    schema: {
      questions: [
        {
          id: 'q1',
          type: 'multiple-choice',
          title: 'Что вам нравится делать в свободное время?',
          required: true,
          options: [
            { value: 'Читать книги', score: 5 },
            { value: 'Заниматься спортом', score: 3 },
            { value: 'Общаться с друзьями', score: 4 },
            { value: 'Играть в игры', score: 2 },
          ],
        },
        {
          id: 'q2',
          type: 'scale',
          title: 'Оцените ваш интерес к техническим наукам',
          required: true,
          min: 1,
          max: 10,
          step: 1,
          defaultScore: 1,
        },
      ],
      formulas: [
        {
          id: 'f1',
          name: 'Технический склад',
          expression: 'q2 * 10',
          description: 'Показатель технического мышления',
        },
      ],
      reportTemplates: [
        {
          id: 'rt1',
          type: 'client',
          title: 'Клиентский отчет',
          content: '<h1>Результаты тестирования</h1><p>Ваш профиль: {profile}</p>',
        },
        {
          id: 'rt2',
          type: 'professional',
          title: 'Профессиональный отчет',
          content: '<h1>Профессиональный отчет</h1><p>Клиент: {name}</p>',
        },
      ],
      clientDataConfig: {
        requireName: true,
        requireEmail: true,
        requirePhone: false,
      },
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    completions: 15,
    isActive: true,
  },
  {
    id: 'survey-2',
    title: 'Диагностика мотивации',
    description: 'Определение типа мотивации сотрудника',
    schema: {
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          title: 'Что для вас важнее всего в работе?',
          required: true,
          options: [
            { value: 'Зарплата', score: 5 },
            { value: 'Карьерный рост', score: 3 },
            { value: 'Интересные задачи', score: 4 },
            { value: 'Коллектив', score: 2 },
          ],
        },
      ],
      formulas: [],
      reportTemplates: [],
      clientDataConfig: {
        requireName: true,
        requireEmail: true,
        requirePhone: false,
      },
    },
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    completions: 8,
    isActive: true,
  },
  {
    id: 'survey-3',
    title: 'Комплексный тест личности',
    description: 'Полный тест со всеми типами вопросов для демонстрации возможностей платформы',
    schema: {
      questions: [
        {
          id: 'q1',
          type: 'text',
          title: 'Расскажите о ваших главных достижениях в жизни',
          description: 'Опишите 2-3 ваших наиболее значимых достижения',
          required: true,
        },
        {
          id: 'q2',
          type: 'number',
          title: 'Сколько лет вы планируете посвятить выбранной профессии?',
          required: true,
          min: 1,
          max: 60,
        },
        {
          id: 'q3',
          type: 'single-choice',
          title: 'Какой стиль работы вам ближе?',
          required: true,
          options: [
            { value: 'Индивидуальная работа', score: 3 },
            { value: 'Работа в команде', score: 4 },
            { value: 'Смешанный формат', score: 5 },
          ],
        },
        {
          id: 'q4',
          type: 'multiple-choice',
          title: 'Выберите качества, которые вы цените в коллегах',
          required: true,
          options: [
            { value: 'Профессионализм', score: 5 },
            { value: 'Дружелюбие', score: 3 },
            { value: 'Ответственность', score: 4 },
            { value: 'Креативность', score: 2 },
            { value: 'Пунктуальность', score: 3 },
          ],
        },
        {
          id: 'q5',
          type: 'scale',
          title: 'Оцените ваш уровень стрессоустойчивости',
          description: 'Где 1 — очень низкий, 10 — очень высокий',
          required: true,
          min: 1,
          max: 10,
          step: 1,
        },
        {
          id: 'q6',
          type: 'date',
          title: 'Когда вы планируете начать карьерные изменения?',
          required: false,
        },
      ],
      formulas: [
        {
          id: 'f1',
          name: 'Общий показатель мотивации',
          expression: '(q2 + q5) * 5',
          description: 'Расчёт общего уровня мотивации',
        },
      ],
      reportTemplates: [
        {
          id: 'rt1',
          type: 'client',
          title: 'Клиентский отчет',
          content: '<h1>Результаты тестирования</h1><p>Ваш профиль: {profile}</p>',
        },
        {
          id: 'rt2',
          type: 'professional',
          title: 'Профессиональный отчет',
          content: '<h1>Профессиональный отчет</h1><p>Клиент: {name}</p>',
        },
      ],
      clientDataConfig: {
        requireName: true,
        requireEmail: true,
        requirePhone: false,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completions: 0,
    isActive: true,
  },
];

export const mockResults: SurveyResult[] = [
  {
    id: 'result-1',
    surveyId: 'survey-1',
    surveyTitle: 'Профориентация для подростков',
    clientData: {
      name: 'Петров Алексей',
      email: 'alexey@example.com',
      phone: '+7 (999) 000-00-00',
    },
    answers: [
      { questionId: 'q1', value: 'Читать книги' },
      { questionId: 'q2', value: 8 },
    ],
    scores: [
      { metricName: 'Технический склад', value: 80, metricId: 'f1' },
    ],
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'result-2',
    surveyId: 'survey-1',
    surveyTitle: 'Профориентация для подростков',
    clientData: {
      name: 'Смирнова Елена',
      email: 'elena@example.com',
      phone: '+7 (888) 000-00-00',
    },
    answers: [
      { questionId: 'q1', value: 'Общаться с друзьями' },
      { questionId: 'q2', value: 6 },
    ],
    scores: [
      { metricName: 'Технический склад', value: 60, metricId: 'f1' },
    ],
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockAdmin = {
  id: 'admin-1',
  login: 'admin',
  email: 'admin@profdnk.ru',
};

export const mockPsychologistsList: Psychologist[] = [
  mockPsychologist,
  {
    id: 'psych-2',
    login: 'petrova',
    email: 'petrova@example.com',
    fullName: 'Петрова Анна Сергеевна',
    subscription: {
      isActive: false,
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    isBlocked: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'psych-3',
    login: 'sidorov',
    email: 'sidorov@example.com',
    fullName: 'Сидоров Петр Ильич',
    subscription: {
      isActive: true,
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    isBlocked: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
