'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Users, Clock, Trophy, FileText, ArrowRight, PlayCircle } from 'lucide-react';
import axiosClient from '@/lib/axios';
import { Contest, Problem } from '@shared/types';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { CountdownTimer } from '@/components/contest/CountdownTimer';
import { useAuthStore } from '@/store/authStore';

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();
  
  const [contest, setContest] = useState<Contest & { isRegistered?: boolean, problems?: Problem[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const inviteParam = searchParams.get('invite');
  const [inviteTokenInput, setInviteTokenInput] = useState(inviteParam || '');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchContest = async () => {
    try {
      const res = await axiosClient.get(`/api/contests/${params.contestId}`);
      setContest(res.data.contest);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Contest not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [params.contestId]);

  useEffect(() => {
    if (isHydrated && !user && inviteParam) {
      router.push(`/login?redirect=/contests/${params.contestId}?invite=${inviteParam}`);
    }
  }, [isHydrated, user, inviteParam, router, params.contestId]);

  const handleRegister = async (tokenOverride?: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setIsRegistering(true);
    try {
      await axiosClient.post(`/api/contests/${params.contestId}/register`, {
        inviteToken: tokenOverride || inviteTokenInput
      });
      toast.success('Successfully registered for the contest!');
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    if (isHydrated && user && contest && inviteParam && !contest.isRegistered && !isRegistering) {
      handleRegister(inviteParam);
    }
  }, [isHydrated, user, contest, inviteParam]);

  if (isLoading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>;
  
  if (errorMsg || !contest) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
          <div className="bg-red-500/10 p-6 rounded-full mb-4">
            <Trophy className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400">{errorMsg}</p>
          <Button className="mt-6 bg-zinc-800 hover:bg-zinc-700" onClick={() => router.push('/contests')}>Back to Contests</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="bg-zinc-950 text-white py-16 border-b border-zinc-800 animate-in fade-in slide-in-from-top-4">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  contest.status === 'upcoming' ? 'bg-amber-500/10 text-amber-500' :
                  contest.status === 'running' ? 'bg-green-500/10 text-green-400 animate-pulse' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {contest.status}
                </span>
                {!contest.is_public && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">Private</span>}
              </div>
              <h1 className="text-4xl font-black mb-4 tracking-tight">{contest.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-zinc-400 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(contest.start_time).toLocaleString()}</span>
                </div>
                {contest.status === 'running' && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Users className="w-4 h-4" />
                    <span>Live</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 min-w-[300px] shadow-xl">
              {contest.status === 'upcoming' && (
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-2 uppercase tracking-wider font-bold">Starts In</p>
                  <CountdownTimer targetDate={contest.start_time} onExpire={fetchContest} />
                  
                  <div className="mt-6 pt-6 border-t border-zinc-800/50">
                    {contest.isRegistered ? (
                      <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold flex items-center justify-center gap-2">
                        ✓ You are registered
                      </div>
                    ) : (
                      <>
                        {!contest.is_public && (
                          <Input
                            placeholder="Enter Invite Token"
                            value={inviteTokenInput}
                            onChange={(e) => setInviteTokenInput(e.target.value)}
                            className="mb-3 bg-zinc-950 border-zinc-800 text-white"
                          />
                        )}
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={() => handleRegister()} isLoading={isRegistering}>
                          Register Now
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {contest.status === 'running' && (
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-2 uppercase tracking-wider font-bold">Time Remaining</p>
                  <CountdownTimer targetDate={contest.end_time} onExpire={fetchContest} />
                  
                  <div className="mt-6 pt-6 border-t border-zinc-800/50">
                    {contest.isRegistered ? (
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={() => router.push(`/contests/${contest.id}/problems`)}>
                        Enter Arena <PlayCircle className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="bg-red-500/10 text-red-500 p-3 rounded-lg border border-red-500/20 text-sm font-bold">
                        Registration closed
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contest.status === 'ended' && (
                <div className="text-center">
                  <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-4">Contest Ended</h3>
                  <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold" onClick={() => router.push(`/contests/${contest.id}/problems`)}>
                    Review Problems & Leaderboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12 animate-in fade-in slide-in-from-bottom-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {contest.description && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">About the Contest</h2>
                <div className="prose prose-invert max-w-none text-zinc-400">
                  <div className="whitespace-pre-wrap">{contest.description}</div>
                </div>
              </section>
            )}

            {contest.status !== 'upcoming' && contest.problems && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Problems
                </h2>
                <div className="space-y-4">
                  {contest.problems.map((prob) => {
                    const letter = String.fromCharCode(64 + prob.problem_order);
                    return (
                      <div key={prob.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold rounded-lg shrink-0 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-colors">
                            {letter}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">{prob.title}</h3>
                            <p className="text-sm text-zinc-500 font-medium mt-1">
                              {prob.points} Points • {prob.time_limit_ms}ms Limit
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => router.push(`/contests/${contest.id}/problems?problem=${prob.id}`)}>
                          {contest.status === 'ended' ? 'Review' : 'Solve'} <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Rules
              </h3>
              <ul className="text-sm text-zinc-400 space-y-4 font-medium">
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span> Please refrain from discussing strategy during the contest.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span> All submissions are run through a strict plagiarism checker.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span> You can submit solutions multiple times.</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span> Ties are broken by the total time taken to submit correct solutions.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}