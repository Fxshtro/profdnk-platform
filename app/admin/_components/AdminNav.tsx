'use client';

import { useRouter } from 'next/navigation';
import { useMobileMenu } from '@/hooks/use-mobile-menu';
import { MobileNav } from '@/components/features/MobileNav';
import { ThemeToggle } from '@/components/features/ThemeToggle';

export function AdminNav() {
  const router = useRouter();
  const { isOpen, setIsOpen } = useMobileMenu(640);

  const navItems = [
    { href: '/admin/psychologists', label: 'Психологи' },
    { href: '/admin/applications-request', label: 'Заявки' },
    { href: '/admin/subscriptions', label: 'Подписки' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  return (
    <MobileNav
      navItems={navItems}
      logoHref="/admin/psychologists"
      logoText={
        <>
          ПрофДНК{' '}
          <span className="text-sm tracking-tight font-medium opacity-70">| Админ</span>
        </>
      }
      showProfile={{
        fullName: 'Администратор',
        login: 'admin',
        subscriptionActive: true,
      }}
      onLogout={handleLogout}
      breakpoint={640}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      themeToggle={<ThemeToggle />}
    />
  );
}
