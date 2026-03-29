import { LoginForm } from '../_components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
      </div>
    </div>
  );
}
