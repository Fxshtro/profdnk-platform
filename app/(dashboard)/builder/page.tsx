'use client';

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Question,
  QuestionType,
  SurveySchema,
  ClientDataConfig,
  BuilderDraftMeta,
  Metric,
  MetricAssignment,
} from '@/types';
import { psychologistApi } from '@/lib/api/psychologist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSubscriptionGuard } from '@/components/features/SubscriptionGuard';

const STORAGE_KEY = 'builder-survey-schema';

const DEFAULT_CLIENT_DATA_CONFIG: ClientDataConfig = {
  requireName: true, // Всегда обязательно
  requireEmail: true,
  requirePhone: false,
};

const QUESTION_TYPES_SET = new Set<QuestionType>([
  'text',
  'number',
  'single-choice',
  'multiple-choice',
  'scale',
  'date',
]);

function normalizeImportedQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    throw new Error('В JSON должен быть массив «questions»');
  }
  const out: Question[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Вопрос ${index + 1}: ожидался объект`);
    }
    const o = item as Record<string, unknown>;
    const type = o.type;
    if (typeof type !== 'string' || !QUESTION_TYPES_SET.has(type as QuestionType)) {
      throw new Error(`Вопрос ${index + 1}: неизвестный тип «${String(type)}»`);
    }
    const id =
      typeof o.id === 'string' && o.id.trim() ? o.id : `q-${Date.now()}-${index}`;
    const title = typeof o.title === 'string' ? o.title : '';
    const description = typeof o.description === 'string' ? o.description : undefined;
    const required = Boolean(o.required);
    const q: Question = {
      id,
      type: type as QuestionType,
      title,
      required,
      ...(description !== undefined ? { description } : {}),
    };
    if (Array.isArray(o.options)) {
      q.options = o.options.map((opt) => {
        if (typeof opt === 'object' && opt && 'value' in opt) {
          const x = opt as { value?: unknown; score?: unknown };
          return {
            value: String(x.value ?? ''),
            score: typeof x.score === 'number' ? x.score : 0,
          };
        }
        return { value: String(opt), score: 0 };
      });
    }
    if (typeof o.min === 'number') q.min = o.min;
    if (typeof o.max === 'number') q.max = o.max;
    if (typeof o.step === 'number') q.step = o.step;
    if (typeof o.defaultScore === 'number') q.defaultScore = o.defaultScore;
    out.push(q);
  });
  return out;
}

/** Тот же формат, что при «Экспорт»; допускается вложенный config_json (как у сохранённого теста). */
function parseBuilderImportJson(text: string): {
  questions: Question[];
  clientDataConfig: ClientDataConfig;
  builderDraftMeta?: BuilderDraftMeta;
} {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Файл не является корректным JSON');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Корень JSON должен быть объектом');
  }
  const root = data as Record<string, unknown>;
  const nested =
    root.config_json && typeof root.config_json === 'object'
      ? (root.config_json as Record<string, unknown>)
      : null;

  const questionsRaw = root.questions ?? nested?.questions;
  const questions = normalizeImportedQuestions(questionsRaw);

  const clientSrc =
    (root.clientDataConfig && typeof root.clientDataConfig === 'object'
      ? root.clientDataConfig
      : null) ??
    (nested?.client_data && typeof nested.client_data === 'object' ? nested.client_data : null);

  const clientDataConfig: ClientDataConfig = clientSrc
    ? { ...DEFAULT_CLIENT_DATA_CONFIG, ...(clientSrc as ClientDataConfig) }
    : DEFAULT_CLIENT_DATA_CONFIG;

  let builderDraftMeta: BuilderDraftMeta | undefined;
  if (root.builderDraftMeta && typeof root.builderDraftMeta === 'object') {
    const m = root.builderDraftMeta as Record<string, unknown>;
    builderDraftMeta = {
      title: typeof m.title === 'string' ? m.title : 'Новый тест',
      description: typeof m.description === 'string' ? m.description : '',
    };
  } else if (nested) {
    const title = typeof nested.title === 'string' ? nested.title : undefined;
    const description = typeof nested.description === 'string' ? nested.description : undefined;
    if (title || description) {
      builderDraftMeta = {
        title: title || 'Новый тест',
        description: description || '',
      };
    }
  }

  return { questions, clientDataConfig, builderDraftMeta };
}

interface DragItem {
  type: 'new' | 'existing';
  questionType?: QuestionType;
  questionId?: string;
  index?: number;
}

export default function BuilderPage() {
  const { requireSubscription } = useSubscriptionGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTestIdParam = searchParams.get('testId');
  const editTestId = editTestIdParam ? Number(editTestIdParam) : null;
  const canEditExisting = Number.isFinite(editTestId) && (editTestId as number) > 0;
  const copyFromRaw = searchParams.get('copyFrom');
  const copyFromId = copyFromRaw ? Number(copyFromRaw) : NaN;
  const hasCopyFrom = Number.isFinite(copyFromId) && copyFromId > 0 && !canEditExisting;
  const [isHydrated, setIsHydrated] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [clientDataConfig, setClientDataConfig] = useState<ClientDataConfig>(DEFAULT_CLIENT_DATA_CONFIG);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [testSettings, setTestSettings] = useState({
    title: 'Новый тест',
    description: '',
  });
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  const workspaceRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<Question[]>([]);
  const importSchemaInputRef = useRef<HTMLInputElement>(null);
  /** После выхода из редактирования / копирования не перезатирать состояние черновиком из localStorage */
  const skipLocalStorageLoadOnceRef = useRef(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Загружаем схему только после маунта, чтобы избежать SSR hydration mismatch (не трогаем черновик при редактировании / копировании)
  useEffect(() => {
    if (!isHydrated) return;
    if (canEditExisting) return;
    if (hasCopyFrom) return;
    if (skipLocalStorageLoadOnceRef.current) {
      skipLocalStorageLoadOnceRef.current = false;
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const schema: SurveySchema = JSON.parse(saved);
      if (Array.isArray(schema.questions)) {
        setQuestions(schema.questions);
        setExpandedQuestions(new Set(schema.questions.map(q => q.id)));
      }
      if (schema.clientDataConfig) {
        setClientDataConfig(schema.clientDataConfig);
      }
      if (Array.isArray(schema.metrics)) {
        setMetrics(schema.metrics);
      }
      if (schema.builderDraftMeta) {
        const m = schema.builderDraftMeta;
        setTestSettings({
          title: m.title,
          description: m.description,
        });
      }
    } catch (e) {
      console.error('Failed to load saved schema:', e);
    }
  }, [isHydrated, canEditExisting, hasCopyFrom]);

  useEffect(() => {
    if (!isHydrated || !canEditExisting) return;
    psychologistApi.getTest(editTestId as number).then((test) => {
      const cfg = (test.config_json || {}) as Record<string, unknown> & {
        questions?: Question[];
        client_data?: ClientDataConfig;
        metrics?: Metric[];
      };
      const loadedQuestions = Array.isArray(cfg.questions)
        ? cfg.questions
        : Array.isArray(test.questions)
          ? (test.questions as Question[])
          : [];
      if (loadedQuestions.length > 0) {
        setQuestions(loadedQuestions);
        setExpandedQuestions(new Set(loadedQuestions.map(q => q.id)));
      }
      if (cfg.client_data) {
        setClientDataConfig({ ...DEFAULT_CLIENT_DATA_CONFIG, ...cfg.client_data });
      }
      if (Array.isArray(cfg.metrics)) {
        setMetrics(cfg.metrics);
      }
      setTestSettings(prev => ({
        ...prev,
        title: test.title || prev.title,
        description: test.description ?? prev.description,
      }));
    }).catch((err) => {
      console.error('Load test for edit error:', err);
    });
  }, [isHydrated, canEditExisting, editTestId]);

  // Копирование: ?copyFrom=id — подставляем данные как новый черновик (без testId)
  useEffect(() => {
    if (!isHydrated || !hasCopyFrom) return;
    let cancelled = false;
    psychologistApi
      .getTest(copyFromId)
      .then((test) => {
        if (cancelled) return;
        const cfg = (test.config_json || {}) as Record<string, unknown> & {
          questions?: Question[];
          client_data?: Partial<ClientDataConfig>;
        };
        let qs: Question[] = [];
        if (Array.isArray(cfg.questions)) {
          qs = cfg.questions;
        } else if (Array.isArray(test.questions)) {
          qs = test.questions as Question[];
        }
        const clientCfg = cfg.client_data
          ? { ...DEFAULT_CLIENT_DATA_CONFIG, ...cfg.client_data }
          : DEFAULT_CLIENT_DATA_CONFIG;
        const baseTitle = (test.title || 'Без названия').trim() || 'Без названия';
        const newSettings = {
          title: `${baseTitle} (копия)`,
          description: test.description || '',
        };
        const schema: SurveySchema = {
          questions: qs,
          formulas: [],
          reportTemplates: [],
          clientDataConfig: clientCfg,
          builderDraftMeta: newSettings,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        skipLocalStorageLoadOnceRef.current = true;
        setQuestions(qs);
        setExpandedQuestions(new Set(qs.map(q => q.id)));
        setClientDataConfig(clientCfg);
        setTestSettings(newSettings);
        router.replace('/builder');
      })
      .catch((err) => {
        console.error('Load test for copy error:', err);
        alert('Не удалось загрузить опросник для копирования.');
        router.replace('/builder');
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, hasCopyFrom, copyFromId, router]);

  // Обновляем ref при изменении questions
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Автосохранение в localStorage (включая название и лимиты)
  useEffect(() => {
    if (!isHydrated) return;
    const schema: SurveySchema = {
      questions,
      formulas: [],
      reportTemplates: [],
      clientDataConfig,
      metrics,
      builderDraftMeta: {
        title: testSettings.title,
        description: testSettings.description,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  }, [questions, clientDataConfig, testSettings, metrics, isHydrated]);

  const getQuestionTypeLabel = (type: QuestionType): string => {
    const labels: Record<QuestionType, string> = {
      text: 'Текстовый вопрос',
      number: 'Число',
      'single-choice': 'Один вариант',
      'multiple-choice': 'Несколько вариантов',
      scale: 'Шкала',
      date: 'Дата',
    };
    return labels[type];
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
    const icons: Record<QuestionType, React.ReactNode> = {
      text: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      number: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
      'single-choice': (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'multiple-choice': (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      scale: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      date: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    };
    return icons[type];
  };

  const handleMoveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const newQuestions = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newQuestions.length) {
        return prev;
      }
      
      [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
      return newQuestions;
    });
  }, []);

  const handleAddQuestion = useCallback((questionType: QuestionType) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: questionType,
      title: 'Новый вопрос',
      required: true,
      ...(questionType === 'multiple-choice' || questionType === 'single-choice'
        ? { options: [
            { value: 'Вариант 1', score: 0 },
            { value: 'Вариант 2', score: 0 },
          ]}
        : {}),
      ...(questionType === 'scale'
        ? { min: 1, max: 10, step: 1, defaultScore: 1 }
        : {}),
      ...(questionType === 'number'
        ? { min: 0, max: 100, defaultScore: 0 }
        : {}),
    };

    setQuestions(prev => [...prev, newQuestion]);
    setSelectedQuestionId(newQuestion.id);
    setExpandedQuestions(prev => new Set(prev).add(newQuestion.id));
    setIsSidebarOpen(false);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    
    // Создаём кастомный drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed opacity-50 pointer-events-none';
    dragImage.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 300px;
      padding: 12px 16px;
      background: hsl(var(--card));
      border: 2px solid hsl(var(--primary));
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
    `;
    
    if (item.type === 'new' && item.questionType) {
      dragImage.textContent = getQuestionTypeLabel(item.questionType);
    } else if (item.type === 'existing' && item.questionId) {
      const q = questions.find(q => q.id === item.questionId);
      dragImage.textContent = q ? `Вопрос: ${q.title.slice(0, 30)}...` : 'Вопрос';
    }
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 150, 30);
    
    // Удаляем drag image после завершения
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  }, [questions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!workspaceRef.current) return;
    
    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const questionElements = workspaceRef.current.querySelectorAll('[data-question-index]');
    
    // Проверяем, находится ли курсор над рабочей областью
    if (e.clientY < workspaceRect.top || e.clientY > workspaceRect.bottom) {
      setInsertIndex(null);
      return;
    }
    
    // Находим индекс для вставки
    let newIndex = questions.length;
    
    for (let i = 0; i < questionElements.length; i++) {
      const el = questionElements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        newIndex = i;
        break;
      }
    }
    
    setInsertIndex(newIndex);
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, [questions.length]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem && insertIndex !== null) {
      if (draggedItem.type === 'new' && draggedItem.questionType) {
        // Создаём новый вопрос
        const newQuestion: Question = {
          id: `q-${Date.now()}`,
          type: draggedItem.questionType,
          title: 'Новый вопрос',
          required: true,
          ...(draggedItem.questionType === 'multiple-choice' || draggedItem.questionType === 'single-choice'
            ? { options: [
                { value: 'Вариант 1', score: 0 },
                { value: 'Вариант 2', score: 0 },
              ]}
            : {}),
          ...(draggedItem.questionType === 'scale'
            ? { min: 1, max: 10, step: 1, defaultScore: 1 }
            : {}),
          ...(draggedItem.questionType === 'number'
            ? { min: 0, max: 100, defaultScore: 0 }
            : {}),
        };

        setQuestions(prev => {
          const newQuestions = [...prev];
          newQuestions.splice(insertIndex, 0, newQuestion);
          return newQuestions;
        });
        setSelectedQuestionId(newQuestion.id);
        setExpandedQuestions(prev => new Set(prev).add(newQuestion.id));
      } else if (draggedItem.type === 'existing' && draggedItem.questionId && draggedItem.index !== undefined) {
        // Перемещаем существующий вопрос
        if (draggedItem.index !== insertIndex) {
          setQuestions(prev => {
            const newQuestions = [...prev];
            const [removed] = newQuestions.splice(draggedItem.index!, 1);
            newQuestions.splice(insertIndex, 0, removed);
            return newQuestions;
          });
        }
      }
    }
    
    setDraggedItem(null);
    setDragPosition(null);
    setInsertIndex(null);
  }, [draggedItem, insertIndex]);

  const handleDragLeave = useCallback(() => {
    setInsertIndex(null);
  }, []);

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Удалить вопрос',
      description: 'Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить.',
      action: () => {
        setQuestions(prev => prev.filter(q => q.id !== id));
        setExpandedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        if (selectedQuestionId === id) {
          setSelectedQuestionId(null);
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleToggleExpand = (id: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExitEditMode = useCallback(() => {
    // Просто выходим из режима редактирования - очищаем testId из URL
    // Вопросы и настройки сохраняются в localStorage как новый проект
    const schema: SurveySchema = {
      questions,
      formulas: [],
      reportTemplates: [],
      clientDataConfig,
      builderDraftMeta: {
        title: testSettings.title,
        description: testSettings.description,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    skipLocalStorageLoadOnceRef.current = true;
    router.replace('/builder');
  }, [questions, clientDataConfig, testSettings, router]);

  const handleExportSchema = () => {
    const schema: SurveySchema = {
      questions,
      formulas: [],
      reportTemplates: [],
      clientDataConfig,
    };
    const dataStr = JSON.stringify(schema, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-schema-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSchemaClick = () => {
    importSchemaInputRef.current?.click();
  };

  const handleImportSchemaFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void file.text().then((text) => {
      try {
        const parsed = parseBuilderImportJson(text);
        if (questionsRef.current.length > 0) {
          if (
            !confirm(
              'Заменить текущие вопросы и настройки данных клиента содержимым файла?'
            )
          ) {
            return;
          }
        }
        setQuestions(parsed.questions);
        setExpandedQuestions(new Set(parsed.questions.map(q => q.id)));
        setClientDataConfig(parsed.clientDataConfig);
        if (parsed.builderDraftMeta) {
          const m = parsed.builderDraftMeta;
          setTestSettings((prev) => ({
            ...prev,
            title: m.title,
            description: m.description,
          }));
        }
        setSelectedQuestionId(null);
        alert(`Импорт выполнен. Вопросов: ${parsed.questions.length}.`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Не удалось импортировать файл');
      }
    });
  }, []);

  const handleSaveTest = () => {
    const schema: SurveySchema = {
      questions,
      formulas: [],
      reportTemplates: [],
      clientDataConfig,
      metrics,
    };
    const payload = {
      title: testSettings.title,
      config_json: {
        title: testSettings.title,
        description: testSettings.description,
        questions,
        formulas: [],
        reportTemplates: [],
        client_data: clientDataConfig,
        metrics,
      },
      description: testSettings.description,
    };
    const request = canEditExisting
      ? psychologistApi.updateTest(editTestId as number, payload)
      : psychologistApi.createTest(payload);
    request.then((created) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);
    }).catch((error) => {
      console.error('Save test error:', error);
      alert('Не удалось сохранить тест на сервере. Проверьте авторизацию и доступность backend API.');
    });
  };

  const handleSaveTestWrapped = () => {
    requireSubscription(handleSaveTest)();
  };

  const handleClearAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Удалить все вопросы',
      description: 'Вы уверены, что хотите удалить все вопросы? Это действие нельзя отменить.',
      action: () => {
        setQuestions([]);
        setExpandedQuestions(new Set());
        setSelectedQuestionId(null);
        localStorage.removeItem(STORAGE_KEY);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const questionTypes: { type: QuestionType; label: string }[] = [
    { type: 'text', label: 'Текстовый вопрос' },
    { type: 'number', label: 'Число' },
    { type: 'single-choice', label: 'Один вариант' },
    { type: 'multiple-choice', label: 'Несколько вариантов' },
    { type: 'scale', label: 'Шкала' },
    { type: 'date', label: 'Дата' },
  ];

  if (!isHydrated) {
    return <div className="container2 p-6 text-sm text-muted-foreground">Загрузка конструктора...</div>;
  }

  return (
    <div className="container2 flex h-[calc(100vh-56px)] bg-muted/30 overflow-hidden">
      {/* Уведомление о сохранении */}
      <div
        className={cn(
          'fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out',
          showSaveNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg shadow-lg">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Изменения сохранены</span>
        </div>
      </div>

      {/* Диалог подтверждения */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDialog.action()}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог управления метриками */}
      <MetricsDialog
        open={showMetricsDialog}
        onOpenChange={setShowMetricsDialog}
        metrics={metrics}
        setMetrics={setMetrics}
      />

      {/* Overlay для мобильной версии */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Левая панель - палитра элементов */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-10 w-full max-w-[85vw] sm:max-w-[400px] lg:max-w-80 border-r bg-background p-4 sm:p-6 overflow-y-auto transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold font-unbounded">Палитра вопросов</h2>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer lg:hidden h-8 w-8 p-0"
              onClick={handleCloseSidebar}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Перетащите вопрос на рабочую область
          </p>
        </div>

        <div className="space-y-3">
          {questionTypes.map(({ type, label }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, { type: 'new', questionType: type })}
              onClick={() => handleAddQuestion(type)}
              className={cn(
                'group rounded-lg border bg-card p-3 sm:p-4 transition-all cursor-grab active:cursor-grabbing lg:hover:shadow-md lg:hover:border-primary/50',
                'active:scale-[0.98] lg:active:scale-100'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {getQuestionTypeIcon(type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold">{label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type === 'text' && 'Открытый ответ текстом'}
                    {type === 'number' && 'Числовой ответ'}
                    {type === 'single-choice' && 'Выбор одного варианта'}
                    {type === 'multiple-choice' && 'Выбор нескольких вариантов'}
                    {type === 'scale' && 'Оценка по шкале'}
                    {type === 'date' && 'Выбор даты'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t hidden lg:block">
          <h3 className="text-sm font-semibold mb-3 font-unbounded">Инструкция</h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Перетащите вопрос из этой панели на рабочую область
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Перетаскивайте вопросы для изменения порядка
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Нажмите на вопрос для редактирования
            </li>
          </ul>
        </div>
      </aside>

      {/* Рабочая область */}
      <main
        className="flex-1 overflow-y-auto p-4 sm:p-8 h-full"
        ref={workspaceRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDragOver(e);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDragEnd(e);
        }}
        onDragLeave={handleDragLeave}
      >
        <div className="mx-auto max-w-[1984px] min-h-full pb-20">
          <input
            ref={importSchemaInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden
            onChange={handleImportSchemaFile}
          />
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {/* Кнопка открытия сайдбара для мобильных */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden h-9 w-9 p-0 shrink-0"
                  onClick={handleOpenSidebar}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-unbounded font-bold tracking-tight">
                    {canEditExisting ? 'Редактирование методики' : 'Конструктор методик'}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {canEditExisting
                      ? 'Изменения сохраняются в этом опроснике на сервере (кнопка «Сохранить тест»).'
                      : 'Перетаскивайте вопросы из левой панели и настраивайте их'}
                  </p>
                </div>
              </div>
              {/* Кнопки для десктопа */}
              <div className="hidden lg:flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveTestWrapped}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Сохранить тест
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportSchema}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Экспорт
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportSchemaClick}
                  title="Импорт JSON в формате кнопки «Экспорт»"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Импорт
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll} disabled={questions.length === 0}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Очистить
                </Button>
              </div>
            </div>
            {/* Кнопки для мобильных - под заголовком */}
            <div className="lg:hidden flex sm:flex-row flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" className="flex-1" onClick={handleSaveTestWrapped}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Сохранить
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleExportSchema}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспорт
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleImportSchemaClick}
                title="Импорт JSON"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Импорт
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleClearAll} disabled={questions.length === 0}>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Очистить
              </Button>
            </div>
          </div>

          {canEditExisting && (
            <div
              className="mb-6 flex flex-col gap-3 rounded-lg border-2 border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              role="status"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-700 bg-amber-600 text-white hover:bg-amber-600">Режим редактирования</Badge>
                  <span className="font-mono font-semibold text-foreground">#{editTestId}</span>
                </div>
                <p className="text-foreground">
                  Редактирование существующего опросника. «Выйти в новый проект» — сохранить текущие вопросы как новый проект и начать создание с нуля.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-amber-700 text-foreground hover:bg-amber-500/25"
                  onClick={handleExitEditMode}
                >
                  Выйти в новый проект
                </Button>
                <Link
                  href={`/surveys/${editTestId}`}
                  className={cn(
                    'cursor-pointer inline-flex h-9 items-center justify-center rounded-md border border-amber-600/50 bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  К карточке опросника
                </Link>
              </div>
            </div>
          )}

          {/* Настройки данных клиента */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Настройки теста</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-title">Название теста</Label>
                  <Input
                    id="test-title"
                    value={testSettings.title}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Введите название теста"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-description">Описание</Label>
                  <Textarea
                    id="test-description"
                    value={testSettings.description}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Краткое описание теста"
                    rows={2}
                  />
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowMetricsDialog(true)}
                    className="w-full"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Управление метриками ({metrics.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Настройки данных клиента */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Настройки данных клиента</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="require-email" className="font-medium">Email</Label>
                    <p className="text-xs text-muted-foreground mt-1">Запрашивать при прохождении</p>
                  </div>
                  <Switch
                    id="require-email"
                    checked={clientDataConfig.requireEmail}
                    onCheckedChange={(checked) => setClientDataConfig(prev => ({ ...prev, requireEmail: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="require-phone" className="font-medium">Телефон</Label>
                    <p className="text-xs text-muted-foreground mt-1">Запрашивать при прохождении</p>
                  </div>
                  <Switch
                    id="require-phone"
                    checked={clientDataConfig.requirePhone}
                    onCheckedChange={(checked) => setClientDataConfig(prev => ({ ...prev, requirePhone: checked }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * ФИО клиента запрашивается всегда и является обязательным полем
              </p>
            </CardContent>
          </Card>

          {/* Зона для вставки */}
          <div className="space-y-4 relative">
            {/* Индикатор вставки перед первым элементом */}
            {insertIndex === 0 && (
              <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full z-20" />
            )}

            {questions.map((question, index) => (
              <div
                key={question.id}
                data-question-index={index}
                draggable
                onDragStart={(e) => handleDragStart(e, { type: 'existing', questionId: question.id, index })}
                className={cn(
                  'relative transition-all',
                  draggedItem?.type === 'existing' && draggedItem?.index === index ? 'opacity-50' : ''
                )}
              >
                {/* Индикатор вставки перед этим элементом */}
                {insertIndex === index && draggedItem?.index !== index && (
                  <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full z-20" />
                )}

                <Card
                  className={cn(
                    'relative transition-all',
                    selectedQuestionId === question.id
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-muted'
                  )}
                  onClick={() => setSelectedQuestionId(question.id)}
                >
                  <CardContent className="p-0">
                    {/* Заголовок блока с drag handle */}
                    <div
                      className="flex items-center gap-3 border-b bg-muted/30 p-3 sm:p-4 select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Стрелка раскрытия для мобильных (слева) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden h-7 w-7 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpand(question.id);
                        }}
                      >
                        <svg
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedQuestions.has(question.id) ? 'rotate-180' : ''
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </Button>

                      {/* Иконка перетаскивания для ПК (слева) */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, { type: 'existing', questionId: question.id, index });
                        }}
                        className="hidden lg:flex items-center gap-3 cursor-grab active:cursor-grabbing"
                      >
                        <svg
                          className="h-5 w-5 text-muted-foreground shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                      </div>

                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:inline-block">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider sm:hidden">
                        {question.type}
                      </span>
                      <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        {/* Стрелочки для перемещения на мобильных */}
                        <div className="flex lg:hidden items-center gap-1 mr-1 sm:mr-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(index, 'up');
                            }}
                            disabled={index === 0}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(index, 'down');
                            }}
                            disabled={index === questions.length - 1}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hidden lg:flex h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(question.id);
                          }}
                        >
                          <svg
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedQuestions.has(question.id) ? 'rotate-180' : ''
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(question.id);
                          }}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    {/* Настройки вопроса */}
                    {expandedQuestions.has(question.id) && (
                      <div
                        className="p-4 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`title-${question.id}`}>Текст вопроса *</Label>
                          <Input
                            id={`title-${question.id}`}
                            value={question.title}
                            onChange={(e) => handleUpdateQuestion(question.id, { title: e.target.value })}
                            placeholder="Введите текст вопроса"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`desc-${question.id}`}>Описание (опционально)</Label>
                          <Input
                            id={`desc-${question.id}`}
                            value={question.description || ''}
                            onChange={(e) => handleUpdateQuestion(question.id, { description: e.target.value })}
                            placeholder="Дополнительное описание"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`required-${question.id}`}>Обязательный вопрос</Label>
                          <Switch
                            id={`required-${question.id}`}
                            checked={question.required}
                            onCheckedChange={(checked) => handleUpdateQuestion(question.id, { required: checked })}
                          />
                        </div>

                        {/* Настройки для вариантов ответа */}
                        {(question.type === 'multiple-choice' || question.type === 'single-choice') && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Варианты ответов</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (question.options) {
                                    handleUpdateQuestion(question.id, {
                                      options: [...question.options, { value: `Вариант ${question.options.length + 1}`, score: 0 }],
                                    });
                                  }
                                }}
                              >
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                  />
                                </svg>
                                Добавить
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {question.options?.map((option, optIndex) => {
                                const optObj = typeof option === 'string' ? { value: option, score: 0 } : option;
                                
                                return (
                                  <OptionWithMetricPoints
                                    key={optIndex}
                                    option={optObj}
                                    optIndex={optIndex}
                                    question={question}
                                    metrics={metrics}
                                    handleUpdateQuestion={handleUpdateQuestion}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Настройки для шкалы */}
                        {question.type === 'scale' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`min-${question.id}`} className="text-xs sm:text-sm">Мин</Label>
                                <Input
                                  id={`min-${question.id}`}
                                  type="number"
                                  value={question.min || 0}
                                  onChange={(e) =>
                                    handleUpdateQuestion(question.id, { min: parseInt(e.target.value) || 0 })
                                  }
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`max-${question.id}`} className="text-xs sm:text-sm">Макс</Label>
                                <Input
                                  id={`max-${question.id}`}
                                  type="number"
                                  value={question.max || 10}
                                  onChange={(e) =>
                                    handleUpdateQuestion(question.id, { max: parseInt(e.target.value) || 0 })
                                  }
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`step-${question.id}`} className="text-xs sm:text-sm">Шаг</Label>
                                <Input
                                  id={`step-${question.id}`}
                                  type="number"
                                  value={question.step || 1}
                                  onChange={(e) =>
                                    handleUpdateQuestion(question.id, { step: parseInt(e.target.value) || 1 })
                                  }
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            
                            {/* Назначение метрик для шкалы */}
                            {metrics.length >= 2 && (
                              <div className="rounded-lg border bg-muted/50 p-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  <Label className="text-sm font-medium">Метрики на шкале</Label>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Выберите 2 метрики для шкалы. Баллы распределяются пропорционально близости ответа к значению метрики.
                                </p>
                                <div className="space-y-3">
                                  {(() => {
                                    const currentMetricValues = (question as any).metricValues || {};
                                    const selectedMetricIds = Object.keys(currentMetricValues).filter(id => currentMetricValues[id] !== '' && currentMetricValues[id] !== null && currentMetricValues[id] !== undefined);
                                    const availableMetrics = metrics.filter(m => !selectedMetricIds.includes(m.id) || selectedMetricIds.includes(m.id));
                                    
                                    return (
                                      <>
                                        {/* Выбранные метрики */}
                                        {selectedMetricIds.slice(0, 2).map((metricId, index) => {
                                          const metric = metrics.find(m => m.id === metricId);
                                          if (!metric) return null;
                                          
                                          return (
                                            <div key={metricId} className="flex items-center gap-2 p-2 rounded-md bg-background border">
                                              <div
                                                className="w-3 h-3 rounded shrink-0"
                                                style={{ backgroundColor: metric.color }}
                                              />
                                              <Label className="text-xs flex-1 font-medium">{metric.name}</Label>
                                              <Input
                                                type="number"
                                                placeholder={`Позиция на шкале (${question.min || 0}-${question.max || 10})`}
                                                value={currentMetricValues[metricId] ?? ''}
                                                onChange={(e) => {
                                                  const metricValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                  const newMetricValues = { ...currentMetricValues };
                                                  if (metricValue === '') {
                                                    delete newMetricValues[metricId];
                                                  } else {
                                                    newMetricValues[metricId] = metricValue;
                                                  }
                                                  handleUpdateQuestion(question.id, {
                                                    ...(question as any),
                                                    metricValues: newMetricValues,
                                                  } as any);
                                                }}
                                                className="w-[140px] h-8 text-xs"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                  const newMetricValues = { ...currentMetricValues };
                                                  delete newMetricValues[metricId];
                                                  handleUpdateQuestion(question.id, {
                                                    ...(question as any),
                                                    metricValues: newMetricValues,
                                                  } as any);
                                                }}
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </Button>
                                            </div>
                                          );
                                        })}
                                        
                                        {/* Добавить метрику если меньше 2 */}
                                        {selectedMetricIds.length < 2 && (
                                          <div className="flex items-center gap-2">
                                            <select
                                              className="flex h-8 w-full max-w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              value=""
                                              onChange={(e) => {
                                                const metricId = e.target.value;
                                                if (metricId) {
                                                  const newMetricValues = { ...currentMetricValues, [metricId]: question.min || 0 };
                                                  handleUpdateQuestion(question.id, {
                                                    ...(question as any),
                                                    metricValues: newMetricValues,
                                                  } as any);
                                                }
                                              }}
                                            >
                                              <option value="">Выберите метрику...</option>
                                              {metrics.filter(m => !selectedMetricIds.includes(m.id)).map(metric => (
                                                <option key={metric.id} value={metric.id}>
                                                  {metric.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Настройки для числа */}
                        {question.type === 'number' && (
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`min-${question.id}`} className="text-xs sm:text-sm">Мин</Label>
                              <Input
                                id={`min-${question.id}`}
                                type="number"
                                value={question.min || 0}
                                onChange={(e) =>
                                  handleUpdateQuestion(question.id, { min: parseInt(e.target.value) || 0 })
                                }
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`max-${question.id}`} className="text-xs sm:text-sm">Макс</Label>
                              <Input
                                id={`max-${question.id}`}
                                type="number"
                                value={question.max || 100}
                                onChange={(e) =>
                                  handleUpdateQuestion(question.id, { max: parseInt(e.target.value) || 0 })
                                }
                                className="text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Индикатор вставки после этого элемента */}
                {insertIndex === index + 1 && draggedItem?.index !== index + 1 && (
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full z-20" />
                )}
              </div>
            ))}

            {/* Индикатор вставки в конец */}
            {insertIndex === questions.length && questions.length > 0 && (
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full z-20" />
            )}
          </div>

          {questions.length === 0 && (
            <div className="mt-12 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-16 sm:py-20 text-center">
              <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Рабочая область пуста</h3>
              <p className="text-sm text-muted-foreground mt-1 px-4">
                Перетащите вопросы из левой панели или нажмите на элемент, чтобы добавить его
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 lg:hidden"
                onClick={handleOpenSidebar}
              >
                Открыть палитру вопросов
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Drag overlay - визуальный индикатор */}
      {dragPosition && draggedItem && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-lg">
            {draggedItem.type === 'new' && draggedItem.questionType
              ? `Добавить: ${getQuestionTypeLabel(draggedItem.questionType)}`
              : 'Переместить вопрос'}
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент варианта ответа с баллами метрик
interface OptionWithMetricPointsProps {
  option: { value: string; score: number; metricAssignments?: MetricAssignment[] };
  optIndex: number;
  question: Question;
  metrics: Metric[];
  handleUpdateQuestion: (id: string, updates: Partial<Question>) => void;
}

function OptionWithMetricPoints({
  option,
  optIndex,
  question,
  metrics,
  handleUpdateQuestion,
}: OptionWithMetricPointsProps) {
  const [showMetricPoints, setShowMetricPoints] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={option.value}
          onChange={(e) => {
            if (question.options) {
              const newOptions = question.options.map((opt, i) => {
                if (i === optIndex) {
                  return typeof opt === 'string'
                    ? e.target.value
                    : { ...opt, value: e.target.value };
                }
                return opt;
              });
              handleUpdateQuestion(question.id, { options: newOptions as any });
            }
          }}
          placeholder={`Вариант ${optIndex + 1}`}
          className="flex-1"
        />
        {question.options && question.options.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (question.options) {
                handleUpdateQuestion(question.id, {
                  options: question.options.filter((_, i) => i !== optIndex),
                });
              }
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
        {metrics.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetricPoints(!showMetricPoints)}
            className="text-xs"
          >
            {showMetricPoints ? 'Скрыть баллы' : 'Баллы метрик'}
          </Button>
        )}
      </div>
      
      {showMetricPoints && metrics.length > 0 && (
        <div className="ml-2 p-3 border rounded-md bg-muted/50 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Баллы по метрикам:</p>
          {metrics.map((metric) => {
            const assignment = option.metricAssignments?.find(a => a.metricId === metric.id);
            return (
              <div key={metric.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: metric.color }}
                />
                <Label className="text-xs flex-1">{metric.name}</Label>
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  value={assignment?.points ?? 0}
                  onChange={(e) => {
                    const points = parseInt(e.target.value) || 0;
                    if (question.options) {
                      const newOptions = question.options.map((opt, i) => {
                        if (i === optIndex) {
                          const currentOpt = typeof opt === 'string' ? { value: opt, score: 0 } : opt;
                          const currentAssignments = currentOpt.metricAssignments || [];
                          const otherAssignments = currentAssignments.filter(a => a.metricId !== metric.id);
                          return {
                            ...currentOpt,
                            metricAssignments: [...otherAssignments, { metricId: metric.id, points }],
                          };
                        }
                        return opt;
                      });
                      handleUpdateQuestion(question.id, { options: newOptions as any });
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Компонент диалога управления метриками
interface MetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: Metric[];
  setMetrics: (metrics: Metric[]) => void;
}

function MetricsDialog({ open, onOpenChange, metrics, setMetrics }: MetricsDialogProps) {
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [newMetricName, setNewMetricName] = useState('');

  const handleAddMetric = () => {
    if (!newMetricName.trim()) return;
    const newMetric: Metric = {
      id: `metric-${Date.now()}`,
      name: newMetricName.trim(),
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    };
    setMetrics([...metrics, newMetric]);
    setNewMetricName('');
  };

  const handleUpdateMetric = (updated: Metric) => {
    setMetrics(metrics.map(m => m.id === updated.id ? updated : m));
  };

  const handleDeleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
    if (editingMetric?.id === id) {
      setEditingMetric(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление метриками</DialogTitle>
          <DialogDescription>
            Создайте метрики для оценки результатов теста. Назначайте баллы метрикам в вариантах ответов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Добавление новой метрики */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-metric-name">Название новой метрики</Label>
              <Input
                id="new-metric-name"
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                placeholder="Например: Интроверсия"
                onKeyDown={(e) => e.key === 'Enter' && handleAddMetric()}
              />
            </div>
            <Button onClick={handleAddMetric} disabled={!newMetricName.trim()}>
              Добавить
            </Button>
          </div>

          {/* Список метрик */}
          {metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Метрики ещё не созданы</p>
              <p className="text-sm">Добавьте первую метрику выше</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Существующие метрики</Label>
              {metrics.map((metric) => (
                <Card key={metric.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: metric.color }}
                          />
                          <div className="flex-1">
                            <Input
                              value={metric.name}
                              onChange={(e) => handleUpdateMetric({ ...metric, name: e.target.value })}
                              className="font-medium"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMetric(editingMetric?.id === metric.id ? null : metric)}
                        >
                          {editingMetric?.id === metric.id ? 'Закрыть' : 'Настроить'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMetric(metric.id)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>

                      {editingMetric?.id === metric.id && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid gap-2">
                            <Label htmlFor={`desc-${metric.id}`}>Описание (для психолога)</Label>
                            <Textarea
                              id={`desc-${metric.id}`}
                              value={metric.description || ''}
                              onChange={(e) => handleUpdateMetric({ ...metric, description: e.target.value })}
                              placeholder="Что измеряет эта метрика"
                              rows={2}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`color-${metric.id}`}>Цвет метрики</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`color-${metric.id}`}
                                type="color"
                                value={metric.color || '#000000'}
                                onChange={(e) => handleUpdateMetric({ ...metric, color: e.target.value })}
                                className="w-20 h-10"
                              />
                              <Input
                                type="text"
                                value={metric.color || '#000000'}
                                onChange={(e) => handleUpdateMetric({ ...metric, color: e.target.value })}
                                placeholder="#000000"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Инструкция */}
          <div className="rounded-md border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Как использовать метрики:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Создайте метрики для вашего теста</li>
              <li>Включите "Показывать клиенту" для тех метрик, которые должны отображаться в результате</li>
              <li>Заполните "Текст результата" для показа клиенту</li>
              <li>При редактировании вопросов назначайте баллы метрикам в вариантах ответов</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
