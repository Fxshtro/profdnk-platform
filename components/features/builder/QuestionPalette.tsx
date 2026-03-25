'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { QuestionType } from '@/types';
import { cn } from '@/lib/utils';

interface DraggableQuestionTypeProps {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

function DraggableQuestionType({ type, label, icon, description }: DraggableQuestionTypeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-${type}`,
    data: {
      type: 'sidebar-item',
      questionType: type,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group rounded-lg border bg-card p-3 sm:p-4 transition-all cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-primary/50',
        'active:scale-[0.98] lg:active:scale-100'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{label}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

const questionTypes = [
  {
    type: 'text' as QuestionType,
    label: 'Текстовый вопрос',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'Открытый ответ текстом',
  },
  {
    type: 'number' as QuestionType,
    label: 'Число',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    description: 'Числовой ответ',
  },
  {
    type: 'single-choice' as QuestionType,
    label: 'Один вариант',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Выбор одного варианта',
  },
  {
    type: 'multiple-choice' as QuestionType,
    label: 'Несколько вариантов',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    description: 'Выбор нескольких вариантов',
  },
  {
    type: 'scale' as QuestionType,
    label: 'Шкала',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    description: 'Оценка по шкале',
  },
  {
    type: 'date' as QuestionType,
    label: 'Дата',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Выбор даты',
  },
];

export function QuestionPalette() {
  return (
    <aside className="w-full max-w-[85vw] sm:max-w-[400px] lg:max-w-80 border-r bg-background p-4 sm:p-6 overflow-y-auto shrink-0">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Палитра вопросов</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Перетащите вопрос на рабочую область или нажмите для добавления
        </p>
      </div>

      <div className="space-y-3">
        {questionTypes.map((questionType) => (
          <DraggableQuestionType key={questionType.type} {...questionType} />
        ))}
      </div>

      <div className="mt-8 pt-6 border-t hidden lg:block">
        <h3 className="text-sm font-semibold mb-3">Инструкция</h3>
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
  );
}
