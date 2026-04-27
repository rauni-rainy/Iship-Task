'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-red-500/20 p-10 rounded-3xl max-w-md w-full shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)]">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Something went wrong</h2>
        <p className="text-zinc-400 text-sm mb-8 font-medium">
          An unexpected error occurred while rendering this page. Our engineers have been notified.
        </p>
        <Button onClick={() => reset()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}
