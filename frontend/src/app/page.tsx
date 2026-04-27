'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axiosClient from '@/lib/axios';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { Trophy, Users, Code2, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function HomePage() {
  const [stats, setStats] = useState({ totalContests: 0, totalParticipants: 0 });
  const [contests, setContests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, contestsRes] = await Promise.all([
          axiosClient.get('/api/contests/stats/public'),
          axiosClient.get('/api/contests', { params: { status: 'upcoming', isPublic: true, limit: 3 } })
        ]);
        setStats(statsRes.data.stats);
        setContests(contestsRes.data.contests);
      } catch (err) {
        console.error('Failed to fetch home page data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Navbar (simple for public) */}
      <header className="fixed top-0 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <Code2 className="w-6 h-6 text-indigo-500" /> ContestHub
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Log In</Link>
            <Link href="/register" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            The Ultimate Coding Arena
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 leading-tight">
            Build. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Compete.</span> Win.
          </h1>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of developers in real-time competitive programming contests. Sharpen your algorithms, climb the global leaderboard, and prove your skills.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
              Browse Contests
            </Link>
            <Link href="/contests/create" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full font-bold text-lg transition-all">
              Create a Contest
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-zinc-800/50">
          <div>
            <div className="text-4xl font-black text-white mb-2">{isLoading ? '-' : stats.totalParticipants}+</div>
            <div className="text-sm text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2"><Users className="w-4 h-4"/> Developers</div>
          </div>
          <div>
            <div className="text-4xl font-black text-white mb-2">{isLoading ? '-' : stats.totalContests}</div>
            <div className="text-sm text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2"><Trophy className="w-4 h-4"/> Contests</div>
          </div>
          <div>
            <div className="text-4xl font-black text-white mb-2">5+</div>
            <div className="text-sm text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2"><Code2 className="w-4 h-4"/> Languages</div>
          </div>
          <div>
            <div className="text-4xl font-black text-white mb-2">&lt;10ms</div>
            <div className="text-sm text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">Latency</div>
          </div>
        </div>
      </section>

      {/* Featured Contests */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Upcoming Contests</h2>
              <p className="text-zinc-400">Register now and prepare for the next challenge.</p>
            </div>
            <Link href="/register" className="hidden sm:flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold group">
              View All <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : contests.length === 0 ? (
              <div className="col-span-3 text-center py-20 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/30">
                <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No upcoming public contests</h3>
                <p className="text-zinc-500 mb-6">Be the first to create one!</p>
                <Link href="/contests/create" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200">Create Contest</Link>
              </div>
            ) : (
              contests.map((contest, i) => (
                <Link key={contest.id} href="/register" className="group block h-full">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-zinc-700 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-zinc-800/50 rounded-xl text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-3 py-1 rounded-full">Upcoming</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{contest.title}</h3>
                    <p className="text-zinc-400 text-sm mb-6 line-clamp-2">{contest.description || 'No description provided.'}</p>
                    
                    <div className="mt-auto pt-6 border-t border-zinc-800/50 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {format(new Date(contest.start_time), 'MMM d, h:mm a')}
                      </div>
                      <div className="text-zinc-500 font-medium">By {contest.creator_username}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link href="/register" className="sm:hidden mt-8 flex items-center justify-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold group w-full bg-zinc-900 py-3 rounded-xl border border-zinc-800">
            View All Contests <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <Code2 className="w-6 h-6 text-indigo-500" /> ContestHub
          </div>
          <div className="flex gap-6 text-sm text-zinc-500 font-medium">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            <Link href="/register" className="hover:text-white transition-colors">Browse Contests</Link>
          </div>
          <div className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} ContestHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
