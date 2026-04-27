'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import axiosClient from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  // Redirect if already logged in
  if (user) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axiosClient.post('/api/auth/login', { email, password });
      setUser(response.data.user);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Welcome Back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sign in to your ContestHub account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Button type="submit" className="w-full mt-6 shadow-md hover:shadow-lg transition-all" isLoading={isLoading}>
                Sign In
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}