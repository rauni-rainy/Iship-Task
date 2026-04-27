import React from 'react';
import { LeaderboardEntry, Problem } from '@shared/types';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuthStore } from '@/store/authStore';

interface LeaderboardTableProps {
  contestId: string;
  problems: Problem[];
  isConnected: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ contestId, problems, isConnected }) => {
  const { leaderboard, isLoading } = useLeaderboard(contestId);
  const { user } = useAuthStore();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading leaderboard...</div>;
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          Standings
          {isConnected && (
            <span className="flex items-center gap-2 text-xs font-medium bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </span>
          )}
        </h2>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-4 font-semibold w-16 text-center">Rank</th>
              <th className="px-4 py-4 font-semibold w-48">Contestant</th>
              {problems.map((p, idx) => (
                <th key={p.id} className="px-4 py-4 font-semibold text-center w-24 truncate" title={p.title}>
                  {String.fromCharCode(65 + idx)}
                </th>
              ))}
              <th className="px-4 py-4 font-semibold text-center w-24">Score</th>
              <th className="px-4 py-4 font-semibold text-center w-24">Penalty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={problems.length + 4} className="px-4 py-12 text-center text-slate-500">
                  No submissions yet
                </td>
              </tr>
            ) : (
              leaderboard.map((entry) => {
                const isMe = entry.userId === user?.id;
                return (
                  <tr 
                    key={entry.userId} 
                    className={`hover:bg-slate-800/30 transition-colors ${isMe ? 'bg-blue-900/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                  >
                    <td className="px-4 py-3 text-center font-bold text-slate-200">
                      {getRankBadge(entry.rank)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200 truncate max-w-[12rem]" title={entry.username}>
                      {entry.username} {isMe && <span className="text-blue-400 text-xs ml-2">(You)</span>}
                    </td>
                    
                    {problems.map(p => {
                      const res = entry.problemResults?.[p.id];
                      if (!res) return <td key={p.id} className="px-4 py-3 text-center text-slate-600">-</td>;
                      
                      const isAC = res.points > 0;
                      return (
                        <td key={p.id} className="px-4 py-3 text-center">
                          <div className={`font-semibold ${isAC ? 'text-green-400' : 'text-slate-500'}`}>
                            {isAC ? res.points : '-'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {res.attempts > 1 ? `${isAC ? res.attempts - 1 : res.attempts} tries` : (isAC ? '' : `${res.attempts} tries`)}
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-center font-bold text-white">
                      {entry.totalPoints}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {entry.penalty || 0}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
