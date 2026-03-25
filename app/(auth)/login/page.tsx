import { LoginForm } from '../_components/LoginForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Ещё нет аккаунта?
          </p>
          <Link href="/apply">
            <Button variant="outline" className="w-full">
              Подать заявку на регистрацию
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
