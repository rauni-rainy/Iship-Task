'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosClient from '@/lib/axios';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hydrateFromServer } = useAuthStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosClient.get('/api/auth/me');
        hydrateFromServer(response.data.user);
      } catch (error) {
        // Not authenticated
        hydrateFromServer(null);
      }
    };
    
    fetchUser();
  }, [hydrateFromServer]);

  return <>{children}</>;
};
