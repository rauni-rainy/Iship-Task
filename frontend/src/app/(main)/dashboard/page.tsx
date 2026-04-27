'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Code2, Medal } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto max-w-5xl px-4 py-8 mt-4">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back, <span className="text-blue-600 dark:text-blue-400">{user?.username}</span>!
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Here's what's happening with your account today.
            </p>
          </div>
          <Link href="/contests">
            <Button className="shadow-md hover:shadow-lg transition-all">Browse All Contests</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <Card className="hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Submissions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">0</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contests Joined</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">0</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-yellow-200 dark:hover:border-yellow-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400">
                <Medal className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contests Won</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Registered Contests */}
        <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800/80">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Your Upcoming Contests
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800/80 ring-8 ring-slate-50 dark:ring-slate-900/50">
                <Trophy className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">
                No upcoming contests
              </h3>
              <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                You haven't registered for any upcoming contests yet. Discover new challenges and test your skills!
              </p>
              <Link href="/contests">
                <Button variant="secondary" className="shadow-sm">Find a Contest</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}