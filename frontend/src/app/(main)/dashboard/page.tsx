'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Code2, Medal, Calendar, PlayCircle, Clock, ChevronRight, Radio, Mail, UserCheck, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import axiosClient from '@/lib/axios';
import { toast } from 'react-hot-toast';

interface Contest {
  id: string;
  title: string;
  description: string;
  status: 'upcoming' | 'running' | 'ended';
  start_time: string;
  end_time: string;
  is_public: boolean;
  registered_at: string;
}

interface InvitedContest {
  id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  creator_username: string;
  invited_at: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [myContests, setMyContests] = useState<Contest[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InvitedContest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchMyContests = async () => {
    const res = await axiosClient.get('/api/contests/my');
    setMyContests(res.data.contests ?? []);
  };

  const fetchPendingInvites = async () => {
    const res = await axiosClient.get('/api/contests/my-invites');
    setPendingInvites(res.data.contests ?? []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchMyContests(), fetchPendingInvites()]);
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAcceptInvite = async (contestId: string, contestTitle: string) => {
    setAcceptingId(contestId);
    try {
      await axiosClient.post(`/api/contests/${contestId}/register`, {});
      toast.success(`Registered for "${contestTitle}"!`);
      // Remove from pending list immediately, re-fetch registered contests
      setPendingInvites(prev => prev.filter(c => c.id !== contestId));
      await fetchMyContests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setAcceptingId(null);
    }
  };

  const upcomingContests = myContests.filter(c => c.status === 'upcoming');
  const runningContests  = myContests.filter(c => c.status === 'running');
  const endedContests    = myContests.filter(c => c.status === 'ended');
  const contestsWon = 0; // placeholder until leaderboard win-tracking is added

  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto max-w-5xl px-4 py-8 mt-4">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back, <span className="text-blue-600 dark:text-blue-400">{user?.username}</span>!
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Here's what's happening with your account today.
            </p>
          </div>
          <Link href="/contests">
            <Button className="shadow-md hover:shadow-lg transition-all">Browse All Contests</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <Card className="hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Submissions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {isLoading ? <span className="text-slate-400">—</span> : myContests.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contests Joined</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {isLoading ? <span className="text-slate-400">—</span> : myContests.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-yellow-200 dark:hover:border-yellow-800 transition-colors">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400">
                <Medal className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contests Won</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{contestsWon}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-8">
            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <Card className="overflow-hidden border-indigo-200/60 dark:border-indigo-800/40">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-200/60 dark:border-indigo-800/40">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    Pending Invitations
                    <span className="ml-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                      {pendingInvites.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">You've been invited to these private contests. Accept to register.</p>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {pendingInvites.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>By {c.creator_username}</span>
                            <span>·</span>
                            <Calendar className="h-3 w-3" />
                            {c.status === 'running'
                              ? <span className="text-green-500 font-semibold">Live now</span>
                              : format(new Date(c.start_time), 'MMM d, h:mm a')
                            }
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 ml-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                        isLoading={acceptingId === c.id}
                        onClick={() => handleAcceptInvite(c.id, c.title)}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Running Contests */}
            {runningContests.length > 0 && (
              <Card className="overflow-hidden border-green-200/60 dark:border-green-800/40">
                <CardHeader className="bg-green-50/50 dark:bg-green-900/10 border-b border-green-200/60 dark:border-green-800/40">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-green-500">
                      <Radio className="h-4 w-4" />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                    </span>
                    Live Right Now
                  </h2>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {runningContests.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shrink-0">
                          <Radio className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> Ends {format(new Date(c.end_time), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Link href={`/contests/${c.id}/problems`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0 ml-4">
                          Enter <PlayCircle className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Contests */}
            <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Your Upcoming Contests
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                {upcomingContests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800/80 ring-8 ring-slate-50 dark:ring-slate-900/50">
                      <Trophy className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">No upcoming contests</h3>
                    <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                      You haven't registered for any upcoming contests yet. Discover new challenges and test your skills!
                    </p>
                    <Link href="/contests">
                      <Button variant="secondary" className="shadow-sm">Find a Contest</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {upcomingContests.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shrink-0">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> Starts {format(new Date(c.start_time), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <Link href={`/contests/${c.id}`}>
                          <Button variant="ghost" size="sm" className="shrink-0 ml-4">
                            View <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Contests */}
            {endedContests.length > 0 && (
              <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800/80">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Past Contests</h2>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {endedContests.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> Ended {format(new Date(c.end_time), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Link href={`/contests/${c.id}/problems`}>
                        <Button variant="ghost" size="sm" className="shrink-0 ml-4">
                          Review <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}