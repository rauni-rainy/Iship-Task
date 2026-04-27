'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axiosClient from '@/lib/axios';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { format } from 'date-fns';
import { Trophy, Settings, LayoutDashboard, Calendar, Edit2, Code2, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function MyContestsPage() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'participating' | 'created'>('participating');
  const [participating, setParticipating] = useState<any[]>([]);
  const [created, setCreated] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchContests();
  }, [user, isHydrated, activeTab]);

  const fetchContests = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'participating') {
        const res = await axiosClient.get('/api/contests/my');
        setParticipating(res.data.contests);
      } else {
        const res = await axiosClient.get('/api/contests', { params: { createdByMe: 'true', limit: 100 } });
        setCreated(res.data.contests);
      }
    } catch (err) {
      console.error('Failed to fetch contests');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">My Contests</h1>
          <p className="text-zinc-400">Manage your competitions and track your progress.</p>
        </div>
        <Link href="/contests/create" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all text-sm shrink-0 flex items-center justify-center gap-2">
          <Edit2 className="w-4 h-4" /> Create New
        </Link>
      </div>

      <div className="flex gap-4 mb-8 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('participating')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'participating' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Participating
        </button>
        <button
          onClick={() => setActiveTab('created')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'created' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Created by Me
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : activeTab === 'participating' ? (
          participating.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
              <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No active participations</h3>
              <p className="text-zinc-500 mb-6">You haven't joined any contests yet.</p>
              <Link href="/" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200">Browse Contests</Link>
            </div>
          ) : (
            participating.map((c) => (
              <div key={c.contest_id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col group animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    c.status === 'upcoming' ? 'bg-amber-500/10 text-amber-500' :
                    c.status === 'running' ? 'bg-green-500/10 text-green-400 animate-pulse' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {c.status}
                  </span>
                  {c.is_flagged && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-bold">Flagged</span>}
                </div>
                <h3 className="font-bold text-lg text-white mb-2 group-hover:text-indigo-400 transition-colors">{c.title}</h3>
                
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                  <Calendar className="w-4 h-4" /> {format(new Date(c.start_time), 'MMM d, HH:mm')}
                </div>
                
                <div className="mt-auto pt-6 border-t border-zinc-800/50 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Your Rank</div>
                    <div className="text-2xl font-black text-amber-400">{c.rank ? `#${c.rank}` : '-'}</div>
                  </div>
                  <Link href={`/contests/${c.contest_id}`} className="px-4 py-2 bg-indigo-600/10 text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-600/20 transition-colors">
                    Enter Arena
                  </Link>
                </div>
              </div>
            ))
          )
        ) : (
          created.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
              <Code2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No contests created</h3>
              <p className="text-zinc-500 mb-6">You haven't hosted any contests yet.</p>
              <Link href="/contests/create" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200">Host a Contest</Link>
            </div>
          ) : (
            created.map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col group animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    c.status === 'upcoming' ? 'bg-amber-500/10 text-amber-500' :
                    c.status === 'running' ? 'bg-green-500/10 text-green-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                    {c.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2 group-hover:text-indigo-400 transition-colors">{c.title}</h3>
                
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
                  <Calendar className="w-4 h-4" /> {format(new Date(c.start_time), 'MMM d, yyyy')}
                </div>
                
                <div className="mt-auto pt-6 border-t border-zinc-800/50 flex flex-wrap gap-2">
                  <Link href={`/admin/${c.id}`} className="flex-1 text-center py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Admin
                  </Link>
                  {c.status === 'upcoming' && (
                    <Link href={`/contests/${c.id}/manage`} className="flex-1 text-center py-2 bg-zinc-800 text-white font-bold text-xs rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                      <Settings className="w-3.5 h-3.5" /> Edit
                    </Link>
                  )}
                  <Link href={`/contests/${c.id}`} className="flex-1 text-center py-2 border border-zinc-700 text-zinc-300 font-bold text-xs rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    <PlayCircle className="w-3.5 h-3.5" /> View
                  </Link>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
