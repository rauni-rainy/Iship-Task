'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import axiosClient from '@/lib/axios';
import { getSocket, joinAdmin } from '@/lib/socket';
import { toast } from 'react-hot-toast';
import { 
  Users, Activity, Flag, FileCode2, LayoutDashboard, CheckCircle2, AlertTriangle, RefreshCw, ChevronLeft, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const params = useParams();
  const contestId = params.contestId as string;
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'overview'|'submissions'|'participants'|'flagged'>('overview');
  
  const [stats, setStats] = useState<any>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [participantsFilter, setParticipantsFilter] = useState<'all' | 'online' | 'offline'>('all');
  
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historySubmissions, setHistorySubmissions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }

    fetchStats();
    if (activeTab === 'flagged') fetchFlagged();
    if (activeTab === 'submissions') fetchSubmissions();
    if (activeTab === 'participants') {
      fetchOnlineUsers();
      fetchRegisteredUsers();
    }

    const socket = getSocket();
    joinAdmin(contestId);

    const onConnect = () => setIsLive(true);
    const onDisconnect = () => setIsLive(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsLive(socket.connected);

    socket.on('admin:submission_activity', (data) => {
      setActivityFeed(prev => [data, ...prev].slice(0, 100));
      if (activeTab === 'overview') fetchStats();
      if (activeTab === 'submissions') fetchSubmissions();
    });

    socket.on('admin:user_flagged', (data) => {
      if (activeTab === 'overview') fetchStats();
      if (activeTab === 'flagged') fetchFlagged();
    });

    socket.on('admin:user_joined', (data) => {
      setOnlineUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) return [...prev, data];
        return prev;
      });
      if (activeTab === 'overview') fetchStats();
    });

    socket.on('admin:user_left', (data) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      if (activeTab === 'overview') fetchStats();
    });

    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:submission_activity');
      socket.off('admin:user_flagged');
      socket.off('admin:user_joined');
      socket.off('admin:user_left');
      clearInterval(interval);
    };
  }, [contestId, user, isHydrated, activeTab]);

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/stats`);
      setStats(res.data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFlagged = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/flagged`);
      setFlaggedUsers(res.data.flagged);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/submissions`, {
        params: { page, limit: 20, verdict: verdictFilter || undefined }
      });
      setSubmissions(res.data.submissions);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/online`);
      setOnlineUsers(res.data.onlineUsers);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRegisteredUsers = async () => {
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/registered`);
      setRegisteredUsers(res.data.registeredUsers);
    } catch (e) {
      console.error(e);
    }
  };

  const unflagUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unflag this user?')) return;
    try {
      await axiosClient.post(`/api/admin/contests/${contestId}/unflag/${userId}`);
      toast.success('User unflagged');
      fetchFlagged();
      fetchStats();
    } catch (e) {
      toast.error('Failed to unflag user');
    }
  };

  const fetchHistory = async (userId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await axiosClient.get(`/api/admin/contests/${contestId}/submissions`, {
        params: { limit: 100, userId }
      });
      setHistorySubmissions(res.data.submissions || []);
    } catch (e) {
      toast.error('Failed to load history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (historyUser) {
      fetchHistory(historyUser.userId);
    }
  }, [historyUser]);

  if (isLoading || !isHydrated) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Admin Dashboard...</div>;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <button onClick={() => router.push(`/contests/${contestId}`)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Contest
          </button>
          <h2 className="text-xl font-bold text-white mb-2 truncate">Admin Panel</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isLive ? 'Live Connection' : 'Disconnected'}
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> Overview
          </button>
          <button onClick={() => setActiveTab('submissions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'submissions' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <FileCode2 className="w-5 h-5" /> Submissions
          </button>
          <button onClick={() => setActiveTab('participants')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'participants' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users className="w-5 h-5" /> Participants
          </button>
          <button onClick={() => setActiveTab('flagged')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'flagged' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5" /> Flagged Users
            </div>
            {stats?.flaggedCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.flaggedCount}</span>
            )}
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        <button onClick={() => {
          if (activeTab === 'overview') fetchStats();
          if (activeTab === 'submissions') fetchSubmissions();
          if (activeTab === 'flagged') fetchFlagged();
          if (activeTab === 'participants') { fetchOnlineUsers(); fetchRegisteredUsers(); }
        }} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>

        {activeTab === 'overview' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-white mb-8">Dashboard Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Users className="w-5 h-5" /> <span className="font-semibold text-sm uppercase">Total Participants</span>
                </div>
                <div className="text-4xl font-bold text-white">{stats?.totalParticipants || 0}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Activity className="w-5 h-5 text-green-400" /> <span className="font-semibold text-sm uppercase">Online Now</span>
                </div>
                <div className="text-4xl font-bold text-white flex items-center gap-3">
                  {stats?.onlineNow || 0}
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <FileCode2 className="w-5 h-5 text-blue-400" /> <span className="font-semibold text-sm uppercase">Submissions</span>
                </div>
                <div className="text-4xl font-bold text-white">{stats?.totalSubmissions || 0}</div>
                <div className="text-sm text-green-400 mt-2 font-medium">{stats?.acceptedCount || 0} Accepted</div>
              </div>
              <div className={`border p-6 rounded-xl shadow-lg ${stats?.flaggedCount > 0 ? 'bg-red-950/20 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}>
                <div className={`flex items-center gap-3 mb-2 font-semibold text-sm uppercase ${stats?.flaggedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  <Flag className="w-5 h-5" /> Flagged Users
                </div>
                <div className={`text-4xl font-bold ${stats?.flaggedCount > 0 ? 'text-red-500' : 'text-white'}`}>{stats?.flaggedCount || 0}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-800">
                  <h3 className="font-bold text-white">Problem Statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Problem</th>
                        <th className="px-5 py-3 text-center">Solve Count</th>
                        <th className="px-5 py-3 text-center">Attempts</th>
                        <th className="px-5 py-3 text-center">Solve Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stats?.solveRatePerProblem?.map((p: any) => {
                        const rate = p.totalAttempts > 0 ? Math.round((p.solveCount / p.totalAttempts) * 100) : 0;
                        return (
                          <tr key={p.problemId} className="hover:bg-slate-800/30">
                            <td className="px-5 py-4 font-medium text-white">{p.title}</td>
                            <td className="px-5 py-4 text-center text-green-400 font-bold">{p.solveCount}</td>
                            <td className="px-5 py-4 text-center">{p.totalAttempts}</td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono">{rate}%</span>
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${rate}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(!stats?.solveRatePerProblem || stats.solveRatePerProblem.length === 0) && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400"/> Live Activity</h3>
                  <span className="text-xs text-slate-500 font-mono">{activityFeed.length} events</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activityFeed.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10">No recent activity</div>
                  ) : (
                    activityFeed.map((event, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-sm animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono text-xs text-slate-500">
                            [{new Date(event.submittedAt || event.timestamp || Date.now()).toLocaleTimeString()}]
                          </span>
                          {event.isFlagged && <div title="User is flagged"><AlertTriangle className="w-4 h-4 text-red-500" /></div>}
                        </div>
                        <div className="text-slate-300">
                          <span className="font-bold text-white">{event.username}</span> submitted{' '}
                          <span className="font-medium text-blue-400">{event.problemTitle || 'a problem'}</span>
                        </div>
                        {event.verdict && (
                          <div className={`mt-2 font-bold text-xs uppercase tracking-wider ${event.verdict === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                            → {event.verdict.replace(/_/g, ' ')}
                            {event.verdict === 'accepted' && ' ✓'}
                          </div>
                        )}
                        {event.reason && (
                          <div className="mt-2 font-bold text-xs text-red-400 uppercase">
                            → Flagged: {event.reason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-white mb-6">All Submissions</h1>
            
            <div className="flex gap-4 mb-6">
              <select 
                value={verdictFilter} 
                onChange={e => setVerdictFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500"
              >
                <option value="">All Verdicts</option>
                <option value="accepted">Accepted</option>
                <option value="wrong_answer">Wrong Answer</option>
                <option value="time_limit_exceeded">Time Limit Exceeded</option>
                <option value="runtime_error">Runtime Error</option>
                <option value="compilation_error">Compilation Error</option>
                <option value="auto_submitted">Auto Submitted</option>
              </select>
              <Button onClick={() => fetchSubmissions()}>Apply Filter</Button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Problem</th>
                    <th className="px-5 py-4">Lang</th>
                    <th className="px-5 py-4">Verdict</th>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {submissions.map(sub => (
                    <tr key={sub.id} className={`hover:bg-slate-800/30 ${sub.is_auto_submitted || sub.verdict === 'auto_submitted' ? 'bg-red-900/10' : ''}`}>
                      <td className="px-5 py-4 font-bold text-white">{sub.username}</td>
                      <td className="px-5 py-4 truncate max-w-[200px]">{sub.problem_title}</td>
                      <td className="px-5 py-4 uppercase text-xs font-mono">{sub.language}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          sub.verdict === 'accepted' ? 'bg-green-500/10 text-green-400' :
                          sub.verdict === 'auto_submitted' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {(sub.verdict || 'unknown').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{new Date(sub.submitted_at).toLocaleTimeString()}</td>
                      <td className="px-5 py-4 font-bold">{sub.score}</td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No submissions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">Registered Participants</h1>
              <div className="flex items-center gap-4">
                <select 
                  value={participantsFilter} 
                  onChange={e => setParticipantsFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500 text-sm"
                >
                  <option value="all">All Participants</option>
                  <option value="online">Online Only</option>
                  <option value="offline">Offline Only</option>
                </select>
                <div className="text-sm font-medium bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg">
                  <span className="text-green-400 font-bold">{onlineUsers.length}</span> Online / {registeredUsers.length} Total
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">User ID</th>
                    <th className="px-5 py-4">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {registeredUsers.filter(user => {
                    const isOnline = onlineUsers.some(u => u.userId === user.userId);
                    if (participantsFilter === 'online') return isOnline;
                    if (participantsFilter === 'offline') return !isOnline;
                    return true;
                  }).map(user => {
                    const isOnline = onlineUsers.some(u => u.userId === user.userId);
                    return (
                      <tr key={user.userId} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          {isOnline ? (
                            <span className="flex items-center gap-2 text-xs font-medium text-green-400">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              Online
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-white">{user.username || 'Unknown'}</td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500">{user.userId}</td>
                        <td className="px-5 py-4 text-slate-400">{new Date(user.registeredAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {registeredUsers.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No registered participants found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'flagged' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              Flagged Users
              <span className="text-lg bg-red-500/20 text-red-500 px-3 py-1 rounded-full font-semibold">{flaggedUsers.length}</span>
            </h1>

            {flaggedUsers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Contest is Clean</h3>
                <p className="text-slate-400">No users have been flagged by the anti-cheat system.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flaggedUsers.map(u => (
                  <div key={u.userId} className="bg-slate-900 border-2 border-red-900/50 rounded-xl shadow-lg p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl text-white">{u.username}</h3>
                        <p className="text-sm text-slate-400">{u.email}</p>
                      </div>
                      <div className="bg-red-500 text-white font-bold text-xs px-2 py-1 rounded shadow-sm">
                        {u.flagCount} Violations
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Reason</div>
                      <div className="text-red-400 font-medium bg-red-500/10 px-3 py-2 rounded-lg inline-block">
                        {u.flagReason === 'fullscreen_exit' ? 'Exited Fullscreen' : 'Switched Tabs'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mb-6">
                      Last flag: {new Date(u.flaggedAt).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" className="flex-1 text-sm border border-slate-700 hover:bg-slate-800" onClick={() => setHistoryUser(u)}>History</Button>
                      <Button variant="danger" className="flex-1 text-sm" onClick={() => unflagUser(u.userId)}>Unflag</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* History Modal */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-xl font-bold text-white">Flag History: {historyUser.username}</h3>
                <p className="text-sm text-slate-400 mt-1">Review auto-submissions and activities</p>
              </div>
              <button 
                onClick={() => setHistoryUser(null)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : historySubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No submission history found for this user.</div>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
                  {historySubmissions.map((sub: any, idx: number) => {
                    const isFlag = sub.is_auto_submitted || sub.verdict === 'auto_submitted';
                    return (
                      <div key={sub.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 ${isFlag ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        <div className={`p-4 rounded-xl border ${isFlag ? 'bg-red-950/20 border-red-900/50' : 'bg-slate-800/30 border-slate-700'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white">
                              {isFlag ? <span className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Auto-Submitted (Flag)</span> : `Submission for ${sub.problem_title}`}
                            </h4>
                            <span className="text-xs font-mono text-slate-500">{new Date(sub.submitted_at).toLocaleString()}</span>
                          </div>
                          {!isFlag && (
                            <div className="flex gap-4 text-sm mt-2">
                              <span className="text-slate-400">Verdict: <span className={sub.verdict === 'accepted' ? 'text-green-400 font-bold' : 'text-slate-300 font-bold'}>{(sub.verdict || 'unknown').replace(/_/g, ' ').toUpperCase()}</span></span>
                              <span className="text-slate-400">Score: <span className="text-white font-bold">{sub.score}</span></span>
                            </div>
                          )}
                          {isFlag && (
                            <div className="text-sm text-red-300/80 mt-1">
                              This submission was automatically generated by the anti-cheat system due to a violation.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}