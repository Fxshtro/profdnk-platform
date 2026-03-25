'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMobileMenu } from '@/hooks/use-mobile-menu';
import { MobileNav } from '@/components/features/MobileNav';
import { ThemeToggle } from '@/components/features/ThemeToggle';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useQueryClient } from '@tanstack/react-query';

// Страницы, доступные даже без подписки (только просмотр)
const PUBLIC_PAGES = ['/subscription', '/dashboard'];

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useMobileMenu(1120);
  const { isActive: hasActiveSubscription } = useSubscriptionStatus();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    fullName: 'Пользователь',
    login: '',
    subscriptionActive: false,
  });

  const allNavItems = [
    { href: '/dashboard', label: 'Главная' },
    { href: '/surveys', label: 'Мои опросники' },
    { href: '/builder', label: 'Конструктор' },
    { href: '/results', label: 'Результаты' },
    { href: '/reports', label: 'Отчёты' },
    { href: '/profile', label: 'Профиль' },
    { href: '/subscription', label: 'Подписка' },
  ];

  // Фильтруем или помечаем элементы меню в зависимости от подписки
  const navItems = allNavItems.map(item => {
    const isPublic = PUBLIC_PAGES.includes(item.href);
    const isBlocked = !hasActiveSubscription && !isPublic;
    return {
      ...item,
      disabled: isBlocked,
    };
  });

  const handleLogout = () => {
    // Очищаем кэш React Query
    queryClient.clear();
    // Очищаем токен и данные сессии
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_token');
    // Перенаправляем на главную
    router.push('/');
  };

  useEffect(() => {
    // Читаем данные из localStorage (они обновляются при логине)
    const sessionData = localStorage.getItem('auth_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        setProfile({
          fullName: session.fullName || 'Пользователь',
          login: session.email || '',
          subscriptionActive: hasActiveSubscription,
        });
      } catch {
        // ignore
      }
    }
  }, [hasActiveSubscription]);

  return (
    <MobileNav
      navItems={navItems}
      logoHref="/dashboard"
      showProfile={{
        fullName: profile.fullName,
        login: profile.login,
        subscriptionActive: profile.subscriptionActive,
      }}
      onLogout={handleLogout}
      breakpoint={1120}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      themeToggle={<ThemeToggle />}
    />
  );
}
