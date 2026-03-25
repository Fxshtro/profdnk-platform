'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Упс!</h1>
            <p className="text-muted-foreground mb-6">
              Что-то пошло не так. Попробуйте обновить страницу.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 max-w-md bg-muted p-4 rounded-md">
                <summary className="cursor-pointer font-medium mb-2">
                  Детали ошибки
                </summary>
                <pre className="text-xs text-destructive whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                Обновить страницу
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                Попробовать снова
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
