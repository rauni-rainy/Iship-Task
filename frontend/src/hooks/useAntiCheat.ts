import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '@/lib/axios';

interface UseAntiCheatProps {
  contestId: string;
  isContestRunning: boolean;
}

export const useAntiCheat = ({ contestId, isContestRunning }: UseAntiCheatProps) => {
  const router = useRouter();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [warningTimeLeft, setWarningTimeLeft] = useState(10);
  const [violationCount, setViolationCount] = useState(0);
  const [hasGracePeriod, setHasGracePeriod] = useState(true);

  const stateRef = useRef({ isContestRunning, warningActive, hasGracePeriod, violationCount });
  stateRef.current = { isContestRunning, warningActive, hasGracePeriod, violationCount };

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initStatus = async () => {
      try {
        const res = await axiosClient.get(`/api/contests/${contestId}/anti-cheat/status`);
        const { isFlagged, flagCount } = res.data;
        setViolationCount(flagCount);
        if (flagCount >= 1 || isFlagged) {
          setHasGracePeriod(false);
        }
      } catch (error) {
        console.error('Failed to load anti-cheat status');
      }
    };
    if (isContestRunning) {
      initStatus();
    }
  }, [contestId, isContestRunning]);

  const triggerAutoSubmit = async (reason: string) => {
    try {
      await axiosClient.post(`/api/contests/${contestId}/anti-cheat/flag`, {
        reason,
        isAutoSubmit: true
      });
    } catch (e) {
      console.error('Auto submit flag failed', e);
    }
    setWarningActive(false);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    
    router.replace(`/contests/${contestId}?violated=true`);
  };

  const handleViolation = (reason: string) => {
    const { isContestRunning, warningActive, hasGracePeriod } = stateRef.current;
    
    if (!isContestRunning) return;
    if (warningActive) return;

    if (!hasGracePeriod) {
      triggerAutoSubmit(reason);
      return;
    }

    setWarningActive(true);
    setWarningTimeLeft(10);
    
    warningTimerRef.current = setInterval(() => {
      setWarningTimeLeft((prev) => {
        if (prev <= 1) {
          if (warningTimerRef.current) clearInterval(warningTimerRef.current);
          triggerAutoSubmit(reason);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearWarning = async () => {
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    setWarningActive(false);
    
    try {
      await axiosClient.post(`/api/contests/${contestId}/anti-cheat/flag`, {
        reason: 'fullscreen_exit',
        isAutoSubmit: false
      });
      setHasGracePeriod(false);
      setViolationCount(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const requestFullscreen = async () => {
    const docElm = document.documentElement as any;
    try {
      if (docElm.requestFullscreen) {
        await docElm.requestFullscreen();
      } else if (docElm.webkitRequestFullscreen) {
        await docElm.webkitRequestFullscreen();
      } else if (docElm.msRequestFullscreen) {
        await docElm.msRequestFullscreen();
      }
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);

      if (stateRef.current.isContestRunning) {
        if (!isFull) {
          handleViolation('fullscreen_exit');
        } else if (isFull && stateRef.current.warningActive) {
          if (document.visibilityState === 'visible') {
            clearWarning();
          }
        }
      }
    };

    const onVisibilityChange = () => {
      if (stateRef.current.isContestRunning) {
        if (document.visibilityState === 'hidden') {
          handleViolation('tab_switch');
        } else if (document.visibilityState === 'visible' && stateRef.current.warningActive) {
          if (document.fullscreenElement) {
            clearWarning();
          }
        }
      }
    };

    const onBlur = () => {
      if (stateRef.current.isContestRunning) {
        handleViolation('tab_switch');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, []);

  return {
    isFullscreen,
    warningActive,
    warningTimeLeft,
    requestFullscreen
  };
};
