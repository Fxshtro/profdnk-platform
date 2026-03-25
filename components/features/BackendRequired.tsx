import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface BackendRequiredProps {
  feature?: string;
}

export function BackendRequired({ feature = 'Эта функция' }: BackendRequiredProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5v14"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Нужен бэкенд</CardTitle>
          <CardDescription>
            {feature} требует подключения к серверу для работы
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Эта функциональность будет доступна после интеграции с бэкенд-API.
            Сейчас идет разработка серверной части.
          </p>
          <Button className="mt-4" variant="outline" disabled>
            Ожидание бэкенда
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
