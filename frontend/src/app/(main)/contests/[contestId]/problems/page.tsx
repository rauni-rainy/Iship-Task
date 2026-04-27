'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { FullscreenGuard } from '@/components/anticheat/FullscreenGuard';
import { ProblemViewer } from '@/components/editor/ProblemViewer';
import { LeaderboardTable } from '@/components/contest/LeaderboardTable';
import { useSocket } from '@/hooks/useSocket';
import axiosClient from '@/lib/axios';
import { Contest, Problem } from '@shared/types';
import { toast } from 'react-hot-toast';
import { ChevronRight, LayoutDashboard, Trophy, Loader2 } from 'lucide-react';
import { CountdownTimer } from '@/components/contest/CountdownTimer';

export default function ContestArena() {
  const params = useParams();
  const contestId = params.contestId as string;
  const router = useRouter();
  const { user } = useAuthStore();

  const [contest, setContest] = useState<Contest & { isRegistered?: boolean; problems?: Problem[] } | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected } = useSocket(contestId);

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await axiosClient.get(`/api/contests/${contestId}`);
        const c = res.data.contest;
        setContest(c);
        
        if (c.problems && c.problems.length > 0) {
          setActiveProblemId(c.problems[0].id);
        }

        if (c.status === 'upcoming') {
          toast.error('Contest has not started yet');
          router.push(`/contests/${contestId}`);
        }
      } catch (err: any) {
        toast.error('Failed to load contest arena');
        router.push('/contests');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContest();
  }, [contestId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!contest) return null;

  const isContestRunning = contest.status === 'running';
  const isRegistered = !!contest.isRegistered || user?.role === 'admin' || user?.id === contest.created_by;

  const activeProblem = contest.problems?.find(p => p.id === activeProblemId);

  return (
    <FullscreenGuard 
      contestId={contestId} 
      isContestRunning={isContestRunning} 
      isRegistered={isRegistered}
    >
      <div className="h-screen flex flex-col bg-zinc-950 text-zinc-300 overflow-hidden font-sans selection:bg-indigo-500/30">
        
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-tight">{contest.title}</h1>
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${isContestRunning ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isContestRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
              {isContestRunning ? 'Running' : 'Ended'}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {isContestRunning && (
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Time Remaining</span>
                <div className="text-2xl font-mono font-black text-white bg-zinc-950 px-4 py-1 rounded-lg border border-zinc-800 shadow-inner">
                  <CountdownTimer targetDate={contest.end_time} />
                </div>
              </div>
            )}
            
            <div className="h-8 w-px bg-zinc-800"></div>
            
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${showLeaderboard ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700'}`}
            >
              {showLeaderboard ? <LayoutDashboard className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
              {showLeaderboard ? 'Back to Problem' : 'Leaderboard'}
            </button>
            
            <div className="flex items-center gap-2 pl-4 border-l border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-zinc-200">{user?.username}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          
          <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Problems</h2>
              <div className="text-sm font-bold text-zinc-300">
                {contest.problems?.length || 0} Total Tasks
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {contest.problems?.map((p, idx) => {
                const isActive = activeProblemId === p.id && !showLeaderboard;
                const letter = String.fromCharCode(65 + idx);
                
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProblemId(p.id);
                      setShowLeaderboard(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl flex flex-col gap-2 transition-all group ${
                      isActive 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 shadow-inner' 
                      : 'bg-zinc-800/30 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black ${isActive ? 'bg-indigo-500 text-white shadow-sm' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}>
                          {letter}
                        </div>
                        <span className={`font-bold text-sm truncate max-w-[140px] ${isActive ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-white'}`}>
                          {p.title}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-indigo-500 translate-x-1' : 'text-zinc-600 opacity-0 group-hover:opacity-100'}`} />
                    </div>
                    <div className="flex items-center justify-between pl-9">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{p.points} pts</span>
                      <div className="w-2 h-2 rounded-full bg-zinc-700" title="Not attempted"></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 overflow-hidden bg-zinc-950 relative">
            {showLeaderboard ? (
              <div className="absolute inset-0 p-6 overflow-y-auto animate-in slide-in-from-right-8 duration-300">
                <LeaderboardTable 
                  contestId={contestId} 
                  problems={contest.problems || []} 
                  isConnected={isConnected} 
                />
              </div>
            ) : activeProblem ? (
              <div className="absolute inset-0 animate-in fade-in duration-300">
                <ProblemViewer 
                  problem={activeProblem} 
                  contestId={contestId} 
                  contestStatus={contest.status}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 font-medium">
                Select a problem to begin
              </div>
            )}
          </main>

        </div>
      </div>
    </FullscreenGuard>
  );
}
