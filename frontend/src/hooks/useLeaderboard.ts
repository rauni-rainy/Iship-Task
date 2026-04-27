import { useState, useEffect, useCallback } from 'react';
import axiosClient from '@/lib/axios';
import { onLeaderboardUpdate } from '@/lib/socket';
import { LeaderboardEntry } from '@shared/types';
import { toast } from 'react-hot-toast';

export const useLeaderboard = (contestId?: string) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialLeaderboard = useCallback(async () => {
    if (!contestId) return;
    setIsLoading(true);
    try {
      const res = await axiosClient.get(`/api/contests/${contestId}/leaderboard`);
      setLeaderboard(res.data.leaderboard);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    fetchInitialLeaderboard();
  }, [fetchInitialLeaderboard]);

  useEffect(() => {
    if (!contestId) return;

    const cleanup = onLeaderboardUpdate((data) => {
      // The socket sends the entire leaderboard array
      setLeaderboard(data);
    });

    return () => {
      cleanup();
    };
  }, [contestId]);

  return { leaderboard, isLoading, refetch: fetchInitialLeaderboard };
};
