'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Users, Clock, Trophy, FileText, ArrowRight, PlayCircle, Lock, Send, CheckCircle, XCircle, Hourglass, RefreshCw } from 'lucide-react';
import axiosClient from '@/lib/axios';
import { Contest, Problem } from '@shared/types';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { CountdownTimer } from '@/components/contest/CountdownTimer';
import { useAuthStore } from '@/store/authStore';
import { onJoinRequestDecision } from '@/lib/socket';

type ContestWithExtra = Contest & {
  isRegistered?: boolean;
  joinRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  isCreator?: boolean;
  invite_token?: string;
  problems?: Problem[];
  _joinRequestMeta?: {
    reApplyCount: number;
    decidedAt: string | null;
  };
};

export default function ContestDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const contestId = params.contestId as string;
  const { user, isHydrated } = useAuthStore();

  // Invite token can come from URL ?invite=TOKEN
  const inviteToken = searchParams.get('invite');

  const [contest, setContest] = useState<ContestWithExtra | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // If we have a token but no contest access yet (PRIVATE_NO_ACCESS), show the request form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [contestMeta, setContestMeta] = useState<{ title: string } | null>(null);

  const fetchContest = async () => {
    try {
      const res = await axiosClient.get(`/api/contests/${contestId}`);
      setContest(res.data.contest);
      setErrorMsg('');
      setShowRequestForm(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Contest not found';
      if (msg === 'PRIVATE_NO_ACCESS' && inviteToken) {
        // User has token but no existing request — show the Request to Join UI
        setShowRequestForm(true);
        setErrorMsg('');
        // Try to fetch basic public contest metadata (title at minimum)
        try {
          // We embed contestId into the state for the request form
          setContestMeta({ title: 'Private Contest' });
        } catch {}
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [contestId]);

  useEffect(() => {
    if (isHydrated && !user && inviteToken) {
      router.push(`/login?redirect=/contests/${contestId}?invite=${inviteToken}`);
    }
  }, [isHydrated, user, inviteToken, router, contestId]);

  // Listen for real-time approval/rejection from creator
  useEffect(() => {
    if (!user) return;
    const unsub = onJoinRequestDecision(({ contestId: cid, status, message }) => {
      if (cid !== contestId) return;
      if (status === 'approved') {
        toast.success('🎉 ' + message);
        // Refresh contest — user is now registered
        fetchContest();
      } else {
        toast.error('❌ ' + message);
        setContest(prev => prev ? { ...prev, joinRequestStatus: 'rejected' } : prev);
      }
    });
    return unsub;
  }, [user, contestId]);

  useEffect(() => {
    if (searchParams.get('violated') === 'true') {
      toast.error('Contest Terminated: Your session was automatically submitted due to a policy violation.');
      // Clean up the URL
      window.history.replaceState({}, '', `/contests/${contestId}`);
    }
  }, [searchParams, contestId]);

  const handleRequestToJoin = async () => {
    if (!user) {
      router.push(`/login?redirect=/contests/${contestId}?invite=${inviteToken}`);
      return;
    }
    if (!inviteToken) {
      toast.error('No invite link found. Ask the contest creator for the invite link.');
      return;
    }
    setIsRequesting(true);
    try {
      await axiosClient.post(`/api/contests/${contestId}/request-join`, { inviteToken });
      toast.success('Request sent! Waiting for creator approval.');
      // Refresh to show pending state
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRegister = async () => {
    if (!user) { router.push('/login'); return; }
    setIsRegistering(true);
    try {
      await axiosClient.post(`/api/contests/${contestId}/register`, {});
      toast.success('Successfully registered!');
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Rejected panel: cooldown + re-apply limit ────────────────────────────
  const MAX_REAPPLIES = 2;
  const COOLDOWN_HOURS = 24;

  const getRejectedState = (contest: ContestWithExtra) => {
    const meta = contest._joinRequestMeta;
    const reApplyCount = meta?.reApplyCount ?? 0;
    const attemptsLeft = MAX_REAPPLIES - reApplyCount;
    const decidedAt = meta?.decidedAt ? new Date(meta.decidedAt) : null;
    const hoursSince = decidedAt ? (Date.now() - decidedAt.getTime()) / 3_600_000 : COOLDOWN_HOURS;
    const inCooldown = hoursSince < COOLDOWN_HOURS;
    const hoursLeft = inCooldown ? Math.ceil(COOLDOWN_HOURS - hoursSince) : 0;
    return { attemptsLeft, inCooldown, hoursLeft, noAttemptsLeft: attemptsLeft <= 0 };
  };

  const renderJoinPanel = (contest: ContestWithExtra) => {
    // Public contests
    if (contest.is_public) {
      if (contest.isRegistered) {
        return <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> You are registered</div>;
      }
      if (contest.status === 'ended') return null;
      if (contest.status === 'running') {
        return <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={handleRegister} isLoading={isRegistering}>Join Contest</Button>;
      }
      return <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={handleRegister} isLoading={isRegistering}>Register Now</Button>;
    }

    // Private contests — creator view
    if (contest.isCreator) {
      return (
        <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold border border-zinc-700" size="lg" onClick={() => router.push(`/contests/${contestId}/manage`)}>
          Manage Contest
        </Button>
      );
    }

    // Private contests — participant view
    if (contest.isRegistered) {
      if (contest.isFlagged) {
        return (
          <div className="space-y-3">
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Contest Terminated
            </div>
            <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold" size="lg" onClick={() => router.push(`/contests/${contest.id}/problems`)}>
              View Leaderboard
            </Button>
          </div>
        );
      }
      return <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> You are registered</div>;
    }

    if (contest.joinRequestStatus === 'approved') {
      // Approved but not yet registered (edge case — auto-register should have fired)
      if (contest.status === 'ended') return null;
      return <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={handleRegister} isLoading={isRegistering}>Complete Registration</Button>;
    }

    if (contest.joinRequestStatus === 'pending') {
      return (
        <div className="space-y-2">
          <div className="bg-amber-500/10 text-amber-400 p-3 rounded-lg border border-amber-500/20 text-sm font-bold flex items-center justify-center gap-2">
            <Hourglass className="w-4 h-4 animate-pulse" /> Request Sent — Awaiting Approval
          </div>
          <p className="text-xs text-zinc-500 text-center">The creator will review your request. You'll be notified here instantly.</p>
        </div>
      );
    }

    if (contest.joinRequestStatus === 'rejected') {
      const { attemptsLeft, inCooldown, hoursLeft, noAttemptsLeft } = getRejectedState(contest);
      return (
        <div className="space-y-3">
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" /> Request Declined
          </div>

          {/* Attempt counter */}
          {!noAttemptsLeft && (
            <p className="text-xs text-zinc-500 text-center">
              {attemptsLeft} re-apply attempt{attemptsLeft !== 1 ? 's' : ''} remaining
            </p>
          )}

          {/* Cooldown info */}
          {inCooldown && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-amber-500">
              <Clock className="w-3 h-3" />
              Cooldown: {hoursLeft}h remaining before you can re-apply
            </div>
          )}

          {/* Re-apply button */}
          {noAttemptsLeft ? (
            <div className="bg-zinc-800/50 text-zinc-500 p-2.5 rounded-lg border border-zinc-700 text-xs text-center">
              🚫 Maximum re-apply attempts reached
            </div>
          ) : inviteToken ? (
            <Button
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 disabled:opacity-40"
              size="sm"
              onClick={handleRequestToJoin}
              isLoading={isRequesting}
              disabled={inCooldown}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {inCooldown ? `Re-apply in ${hoursLeft}h` : 'Re-apply'}
            </Button>
          ) : null}
        </div>
      );
    }


    // No request yet — but user somehow landed here without a token
    return (
      <div className="bg-zinc-800/50 text-zinc-400 p-3 rounded-lg border border-zinc-700 text-sm text-center">
        <Lock className="w-4 h-4 mx-auto mb-1" />
        This is a private contest. You need an invite link from the creator.
      </div>
    );
  };

  if (isLoading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>;

  // ── Show Request-to-Join page for users with invite token but no access yet ──
  if (showRequestForm) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Private Contest</h1>
            <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
              You've been given access to this private contest. Send a join request and the creator will approve or decline it in real-time.
            </p>
            {!user ? (
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={() => router.push(`/login?redirect=/contests/${contestId}?invite=${inviteToken}`)}>
                Log In to Request Access
              </Button>
            ) : (
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={handleRequestToJoin} isLoading={isRequesting}>
                <Send className="w-4 h-4 mr-2" /> Send Join Request
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  }

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
                {!contest.is_public && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Private</span>}
                {contest.isCreator && (
                  <Button size="sm" variant="ghost" className="ml-auto text-xs py-1 h-7 border border-indigo-500/30 !text-indigo-400 hover:bg-indigo-500/10" onClick={() => router.push(`/contests/${contestId}/manage`)}>
                    Manage Contest
                  </Button>
                )}
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
                    {renderJoinPanel(contest)}
                  </div>
                </div>
              )}

              {contest.status === 'running' && (
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-2 uppercase tracking-wider font-bold">Time Remaining</p>
                  <CountdownTimer targetDate={contest.end_time} onExpire={fetchContest} />
                  <div className="mt-6 pt-6 border-t border-zinc-800/50">
                    {contest.isRegistered && contest.isFlagged ? (
                      <div className="space-y-3">
                        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" /> Contest Terminated
                        </div>
                        <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold" size="lg" onClick={() => router.push(`/contests/${contest.id}/problems`)}>
                          View Leaderboard
                        </Button>
                      </div>
                    ) : contest.isRegistered ? (
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" size="lg" onClick={() => router.push(`/contests/${contest.id}/problems`)}>
                        Enter Arena <PlayCircle className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      renderJoinPanel(contest)
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
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" /> Problems
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
                        <Button variant="ghost" className="!text-zinc-400 hover:!text-white" onClick={() => router.push(`/contests/${contest.id}/problems?problem=${prob.id}`)}>
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