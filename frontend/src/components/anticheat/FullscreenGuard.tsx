"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Button } from '@/components/ui/Button';

interface FullscreenGuardProps {
  children: React.ReactNode;
  contestId: string;
  isContestRunning: boolean;
  isRegistered: boolean;
  isFlagged?: boolean;
  hasFinished?: boolean;
}

export const FullscreenGuard: React.FC<FullscreenGuardProps> = ({
  children,
  contestId,
  isContestRunning,
  isRegistered,
  isFlagged,
  hasFinished
}) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Bypass: flagged users and users who've solved all problems skip anti-cheat
  const bypass = !!isFlagged || !!hasFinished;

  // ⚠️ All hooks must be called unconditionally (Rules of Hooks)
  const { isFullscreen, warningActive, warningTimeLeft, requestFullscreen } = useAntiCheat({
    contestId,
    isContestRunning: !bypass && isContestRunning && isRegistered && hasAcknowledged && !isBlocked
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('violated') === 'true') {
        setIsBlocked(true);
      }
    }
  }, []);

  // After all hooks: conditional renders are safe here
  if (bypass) {
    return <>{children}</>;
  }

  if (isContestRunning && isRegistered && !hasAcknowledged) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl border border-slate-700">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-900/30 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-4">Fullscreen Required</h2>
          <p className="text-slate-300 text-sm mb-6 text-center leading-relaxed">
            This contest requires fullscreen mode. Tab switching or exiting fullscreen
            will result in a warning. A second violation will automatically submit your contest.
          </p>
          <Button
            className="w-full py-6 text-lg font-semibold"
            onClick={() => {
              requestFullscreen();
              setHasAcknowledged(true);
            }}
          >
            I understand, Enter Contest
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {warningActive && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl border-2 border-red-500 animate-in zoom-in-95">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-2">WARNING</h2>
            <p className="text-slate-700 dark:text-slate-300 text-lg mb-6 font-medium">
              You have exited the contest window. Return immediately!
            </p>
            <div className="text-7xl font-mono font-bold text-red-600 dark:text-red-500 mb-8 animate-pulse">
              {warningTimeLeft}
            </div>
            <Button
              size="lg"
              variant="danger"
              className="w-full text-lg h-14 font-bold tracking-wide"
              onClick={requestFullscreen}
            >
              RETURN TO FULLSCREEN
            </Button>
            <p className="text-sm text-slate-500 mt-4 uppercase tracking-wider font-semibold">
              Failure to return will result in automatic submission
            </p>
          </div>
        </div>
      )}

      <div className={isContestRunning && isRegistered && hasAcknowledged && !isFullscreen && !warningActive ? 'opacity-0 pointer-events-none' : ''}>
        {children}
      </div>
    </>
  );
};
