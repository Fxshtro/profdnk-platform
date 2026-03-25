'use client';

import { DashboardNav } from './_components/DashboardNav';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBuilderPage = pathname === '/builder';

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className={isBuilderPage ? 'h-full' : 'container py-8'}>
        {children}
      </main>
    </div>
  );
}
