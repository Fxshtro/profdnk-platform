import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/config';

interface LoginData {
  login: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const body = new URLSearchParams();
      body.set('username', data.login);
      body.set('password', data.password);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoints.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.access_token);
      }
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.post(endpoints.logout),
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    },
  });
}
