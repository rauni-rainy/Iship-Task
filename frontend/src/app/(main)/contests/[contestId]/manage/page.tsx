'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Copy, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, UserCheck, UserX, Link as LinkIcon, Activity } from 'lucide-react';
import axiosClient from '@/lib/axios';
import { Contest, Problem } from '@shared/types';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

export default function ManageContestPage() {
  const router = useRouter();
  const params = useParams();
  const contestId = params.contestId as string;
  const { user } = useAuthStore();
  const [contest, setContest] = useState<Contest & { problems?: Problem[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Contest Form State
  const [contestForm, setContestForm] = useState({
    title: '',
    description: '',
    isPublic: true,
    startTime: '',
    endTime: '',
  });

  // Problem Modal State
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [isProblemSaving, setIsProblemSaving] = useState(false);
  const [problemForm, setProblemForm] = useState({
    title: '',
    statement: '',
    inputFormat: '',
    outputFormat: '',
    constraintsText: '',
    sampleInput: '',
    sampleOutput: '',
    explanation: '',
    points: 100,
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    problemOrder: 0,
  });

  // Join request state
  type JoinRequest = { id: string; user_id: string; username: string; status: 'pending' | 'approved' | 'rejected'; requested_at: string; decided_at?: string };
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const fetchContest = async () => {
    try {
      const res = await axiosClient.get(`/api/contests/${contestId}`);
      const data = res.data.contest;
      setContest(data);
      setContestForm({
        title: data.title,
        description: data.description || '',
        isPublic: data.is_public,
        startTime: format(new Date(data.start_time), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(data.end_time), "yyyy-MM-dd'T'HH:mm"),
      });
      // Build invite URL from token (only available to creator)
      if (!data.is_public && data.invite_token) {
        setInviteUrl(`${window.location.origin}/contests/${data.id}?invite=${data.invite_token}`);
      }
      // Fetch join requests for private contests
      if (!data.is_public) {
        const reqRes = await axiosClient.get(`/api/contests/${contestId}/requests`);
        setJoinRequests(reqRes.data.requests ?? []);
      }
    } catch (err: any) {
      toast.error('Failed to load contest details');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, username: string) => {
    setDecidingId(requestId);
    try {
      await axiosClient.post(`/api/contests/${contestId}/requests/${requestId}/approve`);
      toast.success(`✅ ${username} has been approved and registered!`);
      setJoinRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (requestId: string, username: string) => {
    setDecidingId(requestId);
    try {
      await axiosClient.post(`/api/contests/${contestId}/requests/${requestId}/reject`);
      toast(`❌ ${username}'s request declined`);
      setJoinRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setDecidingId(null);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [contestId]);

  // Join admin socket room + listen for real-time join requests
  useEffect(() => {
    if (!contestId) return;
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();

    const doJoinAdmin = () => socket.emit('join:admin', { contestId });
    if (socket.connected) doJoinAdmin();
    else socket.once('connect', doJoinAdmin);

    const handleNewRequest = (data: any) => {
      if (data.contestId !== contestId) return;
      toast(`📩 ${data.username} is requesting to join!`, { duration: 6000 });
      setJoinRequests(prev => {
        const exists = prev.find(r => r.username === data.username);
        if (exists) return prev.map(r => r.username === data.username ? { ...r, status: 'pending' as const, requested_at: data.requestedAt ?? r.requested_at } : r);
        return [{ id: data.id, user_id: data.userId, username: data.username, status: 'pending' as const, requested_at: data.requestedAt ?? new Date().toISOString() }, ...prev];
      });
    };

    socket.on('join_request:new', handleNewRequest);
    return () => {
      socket.off('connect', doJoinAdmin);
      socket.off('join_request:new', handleNewRequest);
    };
  }, [contestId]);


  // Guard: redirect non-owner in an effect, not during render
  useEffect(() => {
    if (!isLoading && contest && user && contest.created_by !== user.id) {
      toast.error('Unauthorized');
      router.replace('/dashboard');
    }
  }, [isLoading, contest, user]);

  if (isLoading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>;
  if (!contest) return null;
  if (contest.created_by !== user?.id) return null; // wait for redirect

  const isEditable = contest.status === 'upcoming';

  const handleUpdateContest = async () => {
    setIsSaving(true);
    try {
      await axiosClient.put(`/api/contests/${contest.id}`, {
        title: contestForm.title,
        description: contestForm.description,
        isPublic: contestForm.isPublic,
        ...(isEditable && {
          startTime: new Date(contestForm.startTime).toISOString(),
          endTime: new Date(contestForm.endTime).toISOString(),
        })
      });
      toast.success('Contest updated successfully');
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const openProblemModal = (problem?: Problem) => {
    if (problem) {
      setEditingProblemId(problem.id);
      setProblemForm({
        title: problem.title,
        statement: problem.statement,
        inputFormat: problem.input_format || '',
        outputFormat: problem.output_format || '',
        constraintsText: problem.constraints_text || '',
        sampleInput: problem.sample_input || '',
        sampleOutput: problem.sample_output || '',
        explanation: problem.explanation || '',
        points: problem.points,
        timeLimitMs: problem.time_limit_ms,
        memoryLimitMb: problem.memory_limit_mb,
        problemOrder: problem.problem_order,
      });
    } else {
      setEditingProblemId(null);
      setProblemForm({
        title: '', statement: '', inputFormat: '', outputFormat: '', constraintsText: '',
        sampleInput: '', sampleOutput: '', explanation: '', points: 100, timeLimitMs: 1000,
        memoryLimitMb: 256, problemOrder: (contest.problems?.length || 0) + 1,
      });
    }
    setIsProblemModalOpen(true);
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProblemSaving(true);
    try {
      if (editingProblemId) {
        await axiosClient.put(`/api/problems/${editingProblemId}`, problemForm);
        toast.success('Problem updated');
      } else {
        await axiosClient.post(`/api/contests/${contest.id}/problems`, problemForm);
        toast.success('Problem added');
      }
      setIsProblemModalOpen(false);
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save problem');
    } finally {
      setIsProblemSaving(false);
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await axiosClient.delete(`/api/problems/${problemId}`);
      toast.success('Problem deleted');
      fetchContest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };



  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Manage Contest</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{contest.title}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/${contestId}`)}
              className="border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 dark:text-indigo-400 font-semibold"
            >
              <Activity className="w-4 h-4 mr-2" />
              Live Admin Dashboard
            </Button>
            <Badge variant={contest.status === 'running' ? 'success' : contest.status === 'ended' ? 'neutral' : 'info'}>
              {contest.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section A - Contest Details + Invites */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Title"
                  value={contestForm.title}
                  onChange={e => setContestForm(p => ({ ...p, title: e.target.value }))}
                />
                <Textarea
                  label="Description"
                  value={contestForm.description}
                  onChange={e => setContestForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />

                <div className="flex items-center space-x-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={contestForm.isPublic}
                    onChange={e => setContestForm(p => ({ ...p, isPublic: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    Public Contest
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                  <Input
                    type="datetime-local"
                    label="Start Time"
                    value={contestForm.startTime}
                    disabled={!isEditable}
                    onChange={e => setContestForm(p => ({ ...p, startTime: e.target.value }))}
                  />
                  <Input
                    type="datetime-local"
                    label="End Time"
                    value={contestForm.endTime}
                    disabled={!isEditable}
                    onChange={e => setContestForm(p => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
                {!isEditable && <p className="text-xs text-red-500">Times cannot be changed once running/ended.</p>}

                <Button className="w-full mt-4" onClick={handleUpdateContest} isLoading={isSaving}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Join Requests — only for private contests */}
            {!contest.is_public && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-500" />
                      Join Requests
                      {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="ml-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                          {joinRequests.filter(r => r.status === 'pending').length} pending
                        </span>
                      )}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Share the invite link. Requests appear here in real-time.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Invite URL copy */}
                  {inviteUrl && (
                    <div className="flex gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <input readOnly value={inviteUrl} className="flex-1 text-xs bg-transparent text-indigo-700 dark:text-indigo-300 outline-none truncate" />
                      <button
                        onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Invite link copied!'); }}
                        className="shrink-0 p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
                        title="Copy invite link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Request list */}
                  {joinRequests.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      No join requests yet. Share the invite link!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {joinRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 min-w-0">
                            {req.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> :
                              req.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-400 shrink-0" /> :
                                <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{req.username}</span>
                            <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                              req.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-500' :
                                'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                              }`}>{req.status}</span>
                          </div>
                          {req.status === 'pending' && (
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <button
                                onClick={() => handleApprove(req.id, req.username)}
                                disabled={decidingId === req.id}
                                title="Approve"
                                className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(req.id, req.username)}
                                disabled={decidingId === req.id}
                                title="Reject"
                                className="p-1.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Section B - Problems */}
          <div className="lg:col-span-2">
            <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Problems</h2>
                {isEditable && (
                  <Button size="sm" onClick={() => openProblemModal()} className="shadow-sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Problem
                  </Button>
                )}
              </div>
              <CardContent className="p-6">
                {!contest.problems || contest.problems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    No problems added yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contest.problems.map((prob) => {
                      const letter = String.fromCharCode(64 + prob.problem_order); // 1->A, 2->B
                      return (
                        <div key={prob.id} className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold rounded-lg shrink-0">
                              {letter}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{prob.title}</h3>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3 mt-1">
                                <span>{prob.points} Points</span>
                                <span>•</span>
                                <span>{prob.time_limit_ms}ms Limit</span>
                                <span>•</span>
                                <span>{prob.memory_limit_mb}MB Limit</span>
                              </div>
                            </div>
                          </div>
                          {isEditable && (
                            <div className="flex gap-2 shrink-0">
                              <Button variant="secondary" size="sm" onClick={() => openProblemModal(prob)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteProblem(prob.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PROBLEM MODAL */}
      <Modal isOpen={isProblemModalOpen} onClose={() => setIsProblemModalOpen(false)} title={editingProblemId ? "Edit Problem" : "Add Problem"}>
        <form onSubmit={handleSaveProblem} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-4">
          <Input label="Problem Title" required value={problemForm.title} onChange={e => setProblemForm(p => ({ ...p, title: e.target.value }))} />
          <Textarea label="Statement (Markdown)" required value={problemForm.statement} onChange={e => setProblemForm(p => ({ ...p, statement: e.target.value }))} rows={5} />

          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Input Format" value={problemForm.inputFormat} onChange={e => setProblemForm(p => ({ ...p, inputFormat: e.target.value }))} />
            <Textarea label="Output Format" value={problemForm.outputFormat} onChange={e => setProblemForm(p => ({ ...p, outputFormat: e.target.value }))} />
          </div>

          <Textarea label="Constraints" value={problemForm.constraintsText} onChange={e => setProblemForm(p => ({ ...p, constraintsText: e.target.value }))} rows={2} />

          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Sample Input" className="font-mono text-sm" value={problemForm.sampleInput} onChange={e => setProblemForm(p => ({ ...p, sampleInput: e.target.value }))} />
            <Textarea label="Sample Output" className="font-mono text-sm" value={problemForm.sampleOutput} onChange={e => setProblemForm(p => ({ ...p, sampleOutput: e.target.value }))} />
          </div>

          <Textarea label="Explanation (Optional)" value={problemForm.explanation} onChange={e => setProblemForm(p => ({ ...p, explanation: e.target.value }))} rows={2} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <Input label="Order (1=A, 2=B)" type="number" required min={1} value={problemForm.problemOrder} onChange={e => setProblemForm(p => ({ ...p, problemOrder: parseInt(e.target.value) }))} />
            <Input label="Points" type="number" required min={1} value={problemForm.points} onChange={e => setProblemForm(p => ({ ...p, points: parseInt(e.target.value) }))} />
            <Input label="Time (ms)" type="number" required min={100} value={problemForm.timeLimitMs} onChange={e => setProblemForm(p => ({ ...p, timeLimitMs: parseInt(e.target.value) }))} />
            <Input label="Memory (MB)" type="number" required min={16} value={problemForm.memoryLimitMb} onChange={e => setProblemForm(p => ({ ...p, memoryLimitMb: parseInt(e.target.value) }))} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsProblemModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isProblemSaving}>Save Problem</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
