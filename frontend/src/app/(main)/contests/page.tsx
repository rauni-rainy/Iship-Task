'use client';

import React, { useState, useEffect } from 'react';
import axiosClient from '@/lib/axios';
import { Contest } from '@shared/types';
import { ContestCard } from '@/components/contest/ContestCard';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Search, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ContestsPage() {
  const [contests, setContests] = useState<(Contest & { creator_username?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const fetchContests = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (activeTab !== 'all') params.status = activeTab;
      
      const response = await axiosClient.get('/api/contests', { params });
      setContests(response.data.contests);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Failed to load contests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, [activeTab, page]);

  const filteredContests = contests.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(total / limit);

  return (
    <PageWrapper>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Contests</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Discover and compete in programming challenges</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
          {['all', 'upcoming', 'running', 'ended'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as any); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : filteredContests.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredContests.map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
              <Trophy className="h-12 w-12 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Contests Found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              We couldn't find any contests matching your criteria. Try adjusting your filters or search query.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}