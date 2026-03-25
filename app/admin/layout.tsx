import { AdminNav } from './_components/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container py-8">
        {children}
      </main>
    </div>
  );
}
