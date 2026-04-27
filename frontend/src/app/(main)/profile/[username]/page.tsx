'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosClient from '@/lib/axios';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeletons';
import { Trophy, Code2, Calendar, Star, Activity, UserCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get(`/api/users/${username}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    if (username) fetchProfile();
  }, [username]);

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in">
        <UserCircle className="w-20 h-20 text-zinc-700 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Profile Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full -z-10"></div>
        {isLoading ? (
          <div className="w-32 h-32 rounded-full bg-zinc-800 animate-pulse shrink-0"></div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-5xl font-black shrink-0 border-4 border-zinc-900 shadow-[0_0_0_2px_rgba(79,70,229,0.5)]">
            {data?.user.avatar_url ? (
              <img src={data.user.avatar_url} alt={username} className="w-full h-full rounded-full object-cover" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
        )}
        
        <div className="flex-1 text-center md:text-left pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-8 bg-zinc-800 rounded w-48 mx-auto md:mx-0"></div>
              <div className="h-4 bg-zinc-800 rounded w-32 mx-auto md:mx-0"></div>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{data.user.username}</h1>
              <div className="flex items-center justify-center md:justify-start gap-2 text-zinc-400 text-sm font-medium">
                <Calendar className="w-4 h-4" /> Member since {format(new Date(data.user.created_at), 'MMMM yyyy')}
                {data.user.role === 'admin' && <span className="ml-2 bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-xs uppercase tracking-widest font-bold">Admin</span>}
              </div>
            </>
          )}
        </div>

        {/* Highlight Stats */}
        <div className="flex gap-4 self-center w-full md:w-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex-1 md:flex-none md:w-32 text-center">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Score</div>
            <div className="text-2xl font-black text-white">{isLoading ? '-' : data.stats.totalScore}</div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex-1 md:flex-none md:w-32 text-center">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Solved</div>
            <div className="text-2xl font-black text-green-400">{isLoading ? '-' : data.stats.problemsSolved}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Contest History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">Recent Contests</h2>
          </div>
          
          {isLoading ? <SkeletonCard /> : data?.recentContests.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
              No contests participated yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentContests.map((c: any) => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors group">
                  <h3 className="font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">{c.title}</h3>
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-zinc-500 font-medium">
                      {format(new Date(c.end_time), 'MMM d, yyyy')}
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Rank</div>
                      <div className="font-black text-lg text-amber-400 flex items-center justify-end gap-1">
                        {c.rank ? <>#{c.rank}</> : <span className="text-zinc-600">-</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
          </div>

          {isLoading ? <SkeletonTable /> : data?.recentSubmissions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <Code2 className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No submissions yet</h3>
              <p className="text-zinc-500">When this user solves problems, their activity will appear here.</p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-950 text-zinc-500 uppercase tracking-wider text-xs font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Problem</th>
                      <th className="px-6 py-4">Contest</th>
                      <th className="px-6 py-4">Verdict</th>
                      <th className="px-6 py-4">Lang</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {data.recentSubmissions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-white group-hover:text-indigo-400">{s.problem_title}</td>
                        <td className="px-6 py-4 text-zinc-400">{s.contest_title}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            s.verdict === 'accepted' ? 'bg-green-500/10 text-green-400' :
                            s.verdict === 'wrong_answer' ? 'bg-red-500/10 text-red-400' :
                            s.verdict === 'time_limit_exceeded' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {s.verdict.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-medium text-zinc-500 uppercase">{s.language}</td>
                        <td className="px-6 py-4 text-right text-zinc-500 text-xs">{format(new Date(s.submitted_at), 'MMM d, HH:mm')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
