'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  href: string;
  label: string;
  disabled?: boolean;
}

interface MobileNavProps {
  navItems: NavItem[];
  logoHref: string;
  logoText?: React.ReactNode | string;
  showProfile?: {
    fullName: string;
    login: string;
    subscriptionActive: boolean;
  };
  onLogout: () => void;
  breakpoint?: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  themeToggle?: React.ReactNode;
}

export function MobileNav({
  navItems,
  logoHref,
  logoText = 'ПрофДНК',
  showProfile,
  onLogout,
  breakpoint = 1120,
  isOpen,
  setIsOpen,
  themeToggle,
}: MobileNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin/psychologists') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  // Определяем breakpoint классы
  const desktopClass = breakpoint === 1120 ? 'lg:flex' : 'sm:flex';
  const mobileClass = breakpoint === 1120 ? 'lg:hidden' : 'sm:hidden';
  const desktopOnlyClass = breakpoint === 1120 ? 'max-lg:hidden' : 'max-sm:hidden';

  return (
    <>
      {/* Header */}
      <div className="flex px-4 h-14 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container2 flex h-full items-center justify-between">
          {/* Logo */}
          <Link href={logoHref} className="flex cursor-pointer items-center space-x-2">
            {typeof logoText === 'string' ? (
              <span className="text-xl font-unbounded font-bold">{logoText}</span>
            ) : (
              <span className="text-xl font-unbounded font-bold">{logoText}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className={`hidden ${desktopClass} items-center space-x-6`}>
            {navItems.map((item) => (
              item.disabled ? (
                <span
                  key={item.href}
                  className="cursor-not-allowed text-sm font-medium text-muted-foreground/50"
                  title="Требуется активная подписка"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'cursor-pointer text-sm font-medium transition-colors hover:text-primary',
                    isActive(item.href)
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          {/* Mobile Menu Button & Profile */}
          <div className="flex items-center space-x-4">
            {/* Desktop Profile */}
            {showProfile && (
              <div className={`hidden ${desktopClass} items-center space-x-4`}>
                {/* Бейдж подписки показываем только если login не 'admin' */}
                {showProfile.login !== 'admin' && (
                  <Badge variant={showProfile.subscriptionActive ? 'success' : 'secondary'}>
                    {showProfile.subscriptionActive ? 'Активен' : 'Не активен'}
                  </Badge>
                )}
                <div className="text-sm">
                  <p className="font-medium">{showProfile.fullName}</p>
                  <p className="text-xs text-muted-foreground">{showProfile.login}</p>
                </div>
                {/* Theme Toggle - слева от кнопки Выход */}
                {themeToggle}
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  Выход
                </Button>
              </div>
            )}

            {/* Desktop Logout Button (without profile) - виден только на desktop */}
            {!showProfile && (
              <div className={`hidden ${desktopClass} items-center space-x-2`}>
                {/* Theme Toggle - слева от кнопки Выход */}
                {themeToggle}
                <Button
                  variant="ghost"
                  size="sm"
                  className={desktopOnlyClass}
                  onClick={onLogout}
                >
                  Выход
                </Button>
              </div>
            )}

            {/* Mobile Menu Button - виден только на mobile */}
            <Button
              variant="ghost"
              size="sm"
              className={mobileClass}
              onClick={() => setIsOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer - рендерим всегда для работы анимации */}
      <div
        className={`fixed inset-0 z-40 ${mobileClass}`}
        style={{ 
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Backdrop с анимацией */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer с анимацией выдвижения слева */}
        <div
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r bg-background shadow-lg transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header with Close Button */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <span className="text-lg font-unbounded font-bold">
              {typeof logoText === 'string' ? logoText : logoText}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer h-10 w-10 p-0"
              onClick={() => setIsOpen(false)}
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col p-4">
            {navItems.map((item) => (
              item.disabled ? (
                <span
                  key={item.href}
                  className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50"
                  title="Требуется активная подписка"
                >
                  {item.label} 🔒
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          {/* Profile Section */}
          {showProfile && (
            <div className="mt-auto border-t p-4">
              {/* Подписку показываем только если login не 'admin' */}
              {showProfile.login !== 'admin' && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Подписка</span>
                  <Badge variant={showProfile.subscriptionActive ? 'success' : 'secondary'}>
                    {showProfile.subscriptionActive ? 'Активен' : 'Не активен'}
                  </Badge>
                </div>
              )}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{showProfile.fullName}</p>
                  <p className="text-xs text-muted-foreground">{showProfile.login}</p>
                </div>
                {/* Theme Toggle в мобильном меню */}
                {themeToggle}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
              >
                Выход
              </Button>
            </div>
          )}

          {/* Logout Section (without profile) */}
          {!showProfile && (
            <div className="mt-auto border-t p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Администратор</p>
                  <p className="font-medium">admin</p>
                </div>
                {/* Theme Toggle в мобильном меню */}
                {themeToggle}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
              >
                Выход
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
