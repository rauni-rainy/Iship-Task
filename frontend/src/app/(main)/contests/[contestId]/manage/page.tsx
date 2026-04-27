'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Copy, Plus, Edit2, Trash2, Globe, Lock } from 'lucide-react';
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

export default function ManageContestPage({ params }: { params: { contestId: string } }) {
  const router = useRouter();
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

  const fetchContest = async () => {
    try {
      const res = await axiosClient.get(`/api/contests/${params.contestId}`);
      const data = res.data.contest;
      setContest(data);
      setContestForm({
        title: data.title,
        description: data.description || '',
        isPublic: data.is_public,
        startTime: format(new Date(data.start_time), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(data.end_time), "yyyy-MM-dd'T'HH:mm"),
      });
    } catch (err: any) {
      toast.error('Failed to load contest details');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [params.contestId]);

  if (isLoading) return <PageWrapper><div className="flex justify-center py-20"><Spinner size="lg" /></div></PageWrapper>;
  if (!contest) return null;

  if (contest.created_by !== user?.id) {
    toast.error('Unauthorized');
    router.replace('/dashboard');
    return null;
  }

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

  const inviteUrl = !contest.is_public && contest.invite_token 
    ? `${window.location.origin}/contests/${contest.id}?invite=${contest.invite_token}`
    : null;

  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Manage Contest</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{contest.title}</p>
          </div>
          <Badge variant={contest.status === 'running' ? 'success' : contest.status === 'ended' ? 'neutral' : 'info'}>
            {contest.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section A - Contest Details */}
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

                {inviteUrl && (
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <p className="text-xs text-slate-500 mb-1 font-semibold">Invite Link (Private)</p>
                    <div className="flex gap-2">
                      <Input value={inviteUrl} readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                      <Button size="sm" variant="secondary" onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        toast.success('Link copied!');
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

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
