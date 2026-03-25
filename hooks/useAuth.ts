'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Session {
  token: string;
  userId: string;
  email: string;
  role: 'admin' | 'psychologist';
  fullName: string;
  expiresAt: string;
}

interface UseAuthOptions {
  requireAuth?: boolean;
  allowedRoles?: ('admin' | 'psychologist')[];
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, allowedRoles } = options;
  const router = useRouter();
  const pathname = usePathname();
  
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = () => {
    try {
      const sessionData = localStorage.getItem('auth_session');
      const token = localStorage.getItem('auth_token');
      
      if (!sessionData || !token) {
        handleUnauthorized();
        return;
      }
      
      const parsedSession: Session = JSON.parse(sessionData);

      if (new Date(parsedSession.expiresAt) < new Date()) {
        logout();
        return;
      }

      if (allowedRoles && !allowedRoles.includes(parsedSession.role)) {
        handleForbidden();
        return;
      }
      
      setSession(parsedSession);
      setIsAuthenticated(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Auth check error:', error);
      handleUnauthorized();
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const handleUnauthorized = () => {
    setIsAuthenticated(false);
    setIsLoading(false);
    
    if (requireAuth && pathname !== '/login') {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
    }
  };

  const handleForbidden = () => {
    setIsAuthenticated(false);
    setIsLoading(false);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_token');
    setSession(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  const getUser = () => session;

  return {
    session,
    isLoading,
    isAuthenticated,
    logout,
    getUser,
  };
}

export function checkAuthServer(allowedRoles?: ('admin' | 'psychologist')[]) {
  if (typeof window === 'undefined') return null;
  
  const sessionData = localStorage.getItem('auth_session');
  if (!sessionData) return null;
  
  try {
    const session: Session = JSON.parse(sessionData);
    
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}
