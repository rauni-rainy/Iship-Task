"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import axiosClient from '@/lib/axios';

export const Navbar: React.FC = () => {
  const { user, isHydrated, clearUser } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await axiosClient.post('/api/auth/logout');
      clearUser();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600 dark:text-blue-500">
            ContestHub
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {!isHydrated ? (
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">
                {user.username}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => router.push('/contests/create')}>
                Create Contest
              </Button>
              {user.role === 'admin' && (
                <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Admin
                </Link>
              )}
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push('/register')}>
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
