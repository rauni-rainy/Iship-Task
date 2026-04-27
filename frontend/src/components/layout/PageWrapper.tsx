import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/Spinner';

interface PageWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, requireAuth = false, requireAdmin = false }) => {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    if (requireAuth && !user) {
      router.replace('/login');
    } else if (requireAdmin && user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [isHydrated, user, requireAuth, requireAdmin, router]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  // Prevent rendering protected content if redirecting
  if ((requireAuth && !user) || (requireAdmin && user?.role !== 'admin')) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {children}
    </main>
  );
};
