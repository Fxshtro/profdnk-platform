'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Question, QuestionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onToggleExpand: (id: string) => void;
  isExpanded: boolean;
}

const questionTypeLabels: Record<QuestionType, string> = {
  text: 'Текстовый вопрос',
  number: 'Число',
  'single-choice': 'Один вариант',
  'multiple-choice': 'Несколько вариантов',
  scale: 'Шкала',
  date: 'Дата',
};

export function QuestionCard({
  question,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  onToggleExpand,
  isExpanded,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isSortableDragging ? 0 : 1,
  };

  const handleAddOption = () => {
    if (question.options) {
      onUpdate(question.id, {
        options: [...question.options, { value: `Вариант ${question.options.length + 1}`, score: 0 }],
      });
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    if (question.options) {
      const newOptions = question.options.map((opt, i) => {
        if (i === index) {
          return typeof opt === 'string' 
            ? value 
            : { ...opt, value };
        }
        return opt;
      });
      onUpdate(question.id, { options: newOptions as any });
    }
  };

  const handleDeleteOption = (index: number) => {
    if (question.options && question.options.length > 2) {
      onUpdate(question.id, {
        options: question.options.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'relative transition-all',
          isSelected
            ? 'border-primary ring-2 ring-primary ring-offset-2'
            : 'border-muted'
        )}
        onClick={onSelect}
      >
        <CardContent className="p-0">
          {/* Заголовок блока с drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center gap-3 border-b bg-muted/30 p-3 sm:p-4 select-none cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Иконка перетаскивания */}
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

            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:inline-block">
              {questionTypeLabels[question.type]}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider sm:hidden">
              {question.type}
            </span>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(question.id);
                }}
              >
                <svg
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded ? 'rotate-180' : ''
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
                  onDelete(question.id);
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
          {isExpanded && (
            <div
              className="p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <Label htmlFor={`title-${question.id}`}>Текст вопроса *</Label>
                <Input
                  id={`title-${question.id}`}
                  value={question.title}
                  onChange={(e) => onUpdate(question.id, { title: e.target.value })}
                  placeholder="Введите текст вопроса"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`desc-${question.id}`}>Описание (опционально)</Label>
                <Input
                  id={`desc-${question.id}`}
                  value={question.description || ''}
                  onChange={(e) => onUpdate(question.id, { description: e.target.value })}
                  placeholder="Дополнительное описание"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`required-${question.id}`}>Обязательный вопрос</Label>
                <Switch
                  id={`required-${question.id}`}
                  checked={question.required}
                  onCheckedChange={(checked) => onUpdate(question.id, { required: checked })}
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
                      onClick={handleAddOption}
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
                    {question.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <Input
                          value={typeof option === 'string' ? option : option.value}
                          onChange={(e) => handleUpdateOption(optIndex, e.target.value)}
                          placeholder={`Вариант ${optIndex + 1}`}
                          className="flex-1"
                        />
                        {question.options && question.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteOption(optIndex)}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Настройки для шкалы */}
              {question.type === 'scale' && (
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`min-${question.id}`} className="text-xs sm:text-sm">Мин</Label>
                    <Input
                      id={`min-${question.id}`}
                      type="number"
                      value={question.min || 1}
                      onChange={(e) =>
                        onUpdate(question.id, { min: parseInt(e.target.value) || 0 })
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
                        onUpdate(question.id, { max: parseInt(e.target.value) || 0 })
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
                        onUpdate(question.id, { step: parseInt(e.target.value) || 1 })
                      }
                      className="text-sm"
                    />
                  </div>
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
                        onUpdate(question.id, { min: parseInt(e.target.value) || 0 })
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
                        onUpdate(question.id, { max: parseInt(e.target.value) || 0 })
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
    </div>
  );
}
