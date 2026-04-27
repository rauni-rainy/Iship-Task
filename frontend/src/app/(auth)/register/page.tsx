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

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  if (user) {
    router.replace('/dashboard');
    return null;
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(formData.username)) {
      newErrors.username = 'Username must be 3-30 chars (letters, numbers, underscores)';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      // 1. Register
      await axiosClient.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      // 2. Auto-login
      const loginResponse = await axiosClient.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      setUser(loginResponse.data.user);
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      // Map server error back to fields if possible
      if (msg.toLowerCase().includes('username')) setErrors(prev => ({ ...prev, username: msg }));
      else if (msg.toLowerCase().includes('email')) setErrors(prev => ({ ...prev, email: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <PageWrapper>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-lg border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create an Account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Join ContestHub to start competing</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                placeholder="competitive_coder"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="••••••••"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="••••••••"
                className="bg-white/80 dark:bg-slate-950/80"
              />
              <Button type="submit" className="w-full mt-6 shadow-md hover:shadow-lg transition-all" isLoading={isLoading}>
                Register
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Log in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}