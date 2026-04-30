"use client";

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    updateTimer(); // Initial call
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [targetDate, onExpire]);

  if (!timeLeft) return <div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-8 w-32 rounded"></div>;

  const formatUnit = (unit: number) => unit.toString().padStart(2, '0');

  return (
    <div className="flex justify-center items-center gap-2 font-mono text-2xl font-bold tracking-tight text-white">
      {timeLeft.days > 0 && (
        <>
          <div className="flex flex-col items-center">
            <span>{formatUnit(timeLeft.days)}</span>
            <span className="text-xs font-sans text-zinc-400 font-normal">DAYS</span>
          </div>
          <span className="text-zinc-600">:</span>
        </>
      )}
      <div className="flex flex-col items-center">
        <span>{formatUnit(timeLeft.hours)}</span>
        <span className="text-xs font-sans text-zinc-400 font-normal">HRS</span>
      </div>
      <span className="text-zinc-600">:</span>
      <div className="flex flex-col items-center">
        <span>{formatUnit(timeLeft.minutes)}</span>
        <span className="text-xs font-sans text-zinc-400 font-normal">MIN</span>
      </div>
      <span className="text-zinc-600">:</span>
      <div className="flex flex-col items-center">
        <span className="text-indigo-400">{formatUnit(timeLeft.seconds)}</span>
        <span className="text-xs font-sans text-zinc-400 font-normal">SEC</span>
      </div>
    </div>
  );
};
