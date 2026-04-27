import React, { useState, useEffect } from 'react';
import { Problem, Submission } from '@shared/types';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';
import axiosClient from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { onSubmissionJudged } from '@/lib/socket';
import { Clock, Database, Copy, CheckCircle2, XCircle, AlertCircle, Loader2, Trophy } from 'lucide-react';

interface ProblemViewerProps {
  problem: Problem;
  contestId: string;
  contestStatus?: string;
}

const defaultCode: Record<string, string> = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code goes here\n    return 0;\n}',
  python: 'import sys\ninput = sys.stdin.readline\n\ndef main():\n    # your code goes here\n    pass\n\nif __name__ == "__main__":\n    main()',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // your code goes here\n    }\n}',
  javascript: 'const fs = require("fs");\nconst input = fs.readFileSync("/dev/stdin", "utf8").trim().split("\\n");\n\n// your code goes here',
  c: '#include <stdio.h>\n\nint main() {\n    // your code goes here\n    return 0;\n}'
};

export const ProblemViewer: React.FC<ProblemViewerProps> = ({ problem, contestId, contestStatus }) => {
  const [activeTab, setActiveTab] = useState<'statement' | 'submit' | 'submissions'>('statement');
  
  const [language, setLanguage] = useState<string>('cpp');
  const [code, setCode] = useState<string>(defaultCode['cpp']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [viewCodeModal, setViewCodeModal] = useState<any | null>(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
  };

  const submitCode = async () => {
    setIsSubmitting(true);
    try {
      await axiosClient.post('/api/submissions', {
        problemId: problem.id,
        contestId,
        code,
        language
      });
      toast.success('Submitted! Judging in ~10 seconds...');
      setActiveTab('submissions');
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const res = await axiosClient.get(`/api/submissions?contestId=${contestId}&problemId=${problem.id}`);
      setSubmissions(res.data.submissions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    const hasPending = submissions.some(s => s.verdict === 'pending');
    if (hasPending) {
      const interval = setInterval(() => {
        fetchSubmissions();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [submissions]);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab, problem.id]);

  useEffect(() => {
    const cleanup = onSubmissionJudged((data) => {
      if (data.problem_id === problem.id || data.problemId === problem.id) {
        setSubmissions(prev => prev.map(s => s.id === data.id ? data : s));
        
        if (data.verdict === 'accepted') {
          toast.custom((t) => (
            <div className="bg-green-900 border border-green-500 text-white p-4 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="text-green-400" />
              <div>
                <p className="font-bold">Accepted</p>
                <p className="text-sm text-green-200">Problem: {problem.title}</p>
              </div>
            </div>
          ));
        } else {
          toast.custom((t) => (
            <div className="bg-red-900 border border-red-500 text-white p-4 rounded-lg flex items-center gap-3">
              <XCircle className="text-red-400" />
              <div>
                <p className="font-bold capitalize">{data.verdict.replace(/_/g, ' ')}</p>
                <p className="text-sm text-red-200">Problem: {problem.title}</p>
              </div>
            </div>
          ));
        }
      }
    });
    return cleanup;
  }, [problem.id, problem.title]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getVerdictBadge = (verdict: string) => {
    switch(verdict) {
      case 'accepted': return <span className="text-green-400 font-semibold bg-green-500/10 px-2 py-1 rounded">Accepted</span>;
      case 'wrong_answer': return <span className="text-red-400 font-semibold bg-red-500/10 px-2 py-1 rounded">Wrong Answer</span>;
      case 'time_limit_exceeded': return <span className="text-orange-400 font-semibold bg-orange-500/10 px-2 py-1 rounded">Time Limit Exceeded</span>;
      case 'runtime_error': return <span className="text-orange-400 font-semibold bg-orange-500/10 px-2 py-1 rounded">Runtime Error</span>;
      case 'compilation_error': return <span className="text-yellow-400 font-semibold bg-yellow-500/10 px-2 py-1 rounded">Compilation Error</span>;
      case 'pending': return <span className="text-slate-400 font-semibold bg-slate-500/10 px-2 py-1 rounded flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Pending</span>;
      case 'auto_submitted': return <span className="text-blue-400 font-semibold bg-blue-500/10 px-2 py-1 rounded">Auto Submitted</span>;
      default: return <span>{verdict}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0">
        <button 
          onClick={() => setActiveTab('statement')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'statement' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Problem Statement
        </button>
        <button 
          onClick={() => setActiveTab('submit')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'submit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Submit
        </button>
        <button 
          onClick={() => setActiveTab('submissions')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          My Submissions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {activeTab === 'statement' && (
          <div className="p-8 max-w-4xl mx-auto pb-24">
            <h1 className="text-3xl font-bold text-white mb-6">{problem.title}</h1>
            
            <div className="flex gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                <Clock className="w-4 h-4 text-blue-400" />
                {problem.time_limit_ms} ms
              </div>
              <div className="flex items-center gap-2 text-sm bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                <Database className="w-4 h-4 text-blue-400" />
                {problem.memory_limit_mb} MB
              </div>
              <div className="flex items-center gap-2 text-sm bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                {problem.points} Points
              </div>
            </div>

            <div className="prose prose-invert prose-blue max-w-none mb-10">
              <ReactMarkdown>{problem.statement}</ReactMarkdown>
            </div>

            {problem.input_format && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-3">Input Format</h3>
                <div className="prose prose-invert prose-blue max-w-none text-slate-300">
                  <ReactMarkdown>{problem.input_format}</ReactMarkdown>
                </div>
              </div>
            )}

            {problem.output_format && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-3">Output Format</h3>
                <div className="prose prose-invert prose-blue max-w-none text-slate-300">
                  <ReactMarkdown>{problem.output_format}</ReactMarkdown>
                </div>
              </div>
            )}

            {problem.constraints_text && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-3">Constraints</h3>
                <div className="prose prose-invert prose-blue max-w-none text-slate-300">
                  <ReactMarkdown>{problem.constraints_text}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {problem.sample_input && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Sample Input</h3>
                    <button onClick={() => copyToClipboard(problem.sample_input)} className="text-slate-400 hover:text-white transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-slate-300 font-mono border border-slate-800">
                    {problem.sample_input}
                  </pre>
                </div>
              )}
              {problem.sample_output && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Sample Output</h3>
                    <button onClick={() => copyToClipboard(problem.sample_output)} className="text-slate-400 hover:text-white transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-slate-300 font-mono border border-slate-800">
                    {problem.sample_output}
                  </pre>
                </div>
              )}
            </div>

            {problem.explanation && (
              <div className="mb-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-3">Explanation</h3>
                <div className="prose prose-invert prose-blue max-w-none text-slate-300">
                  <ReactMarkdown>{problem.explanation}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="flex flex-col h-full p-4">
            {contestStatus === 'ended' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <Trophy className="w-16 h-16 text-zinc-700 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Contest Ended</h2>
                <p className="text-zinc-500">Submissions are disabled. You can still view problems and review the leaderboard.</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-zinc-900 flex justify-between items-center shrink-0 border border-zinc-800 rounded-t-xl">
                  <select 
                    value={language}
                    onChange={handleLanguageChange}
                    className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold"
                  >
                    <option value="cpp">C++ (GCC)</option>
                    <option value="python">Python 3</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="c">C (GCC)</option>
                  </select>

                  <Button onClick={submitCode} disabled={isSubmitting || !code.trim()} className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Code
                  </Button>
                </div>
                <div className="flex-1 min-h-[400px] border border-t-0 border-zinc-800 rounded-b-xl overflow-hidden">
                  <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      fontSize: 14,
                      tabSize: 4,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      padding: { top: 16 }
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Submissions for {problem.title}</h2>
            {isLoadingSubmissions && submissions.length === 0 ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center p-8 text-slate-400 bg-slate-800/50 rounded-xl border border-slate-800">
                You haven't submitted any solutions for this problem yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                    <tr>
                      <th className="px-6 py-4"># ID</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Language</th>
                      <th className="px-6 py-4">Verdict</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{sub.id.substring(0, 8)}</td>
                        <td className="px-6 py-4">{new Date(sub.submitted_at || sub.submittedAt || '').toLocaleTimeString()}</td>
                        <td className="px-6 py-4 uppercase">{sub.language}</td>
                        <td className="px-6 py-4">{getVerdictBadge(sub.verdict)}</td>
                        <td className="px-6 py-4 font-bold">{sub.score !== undefined ? sub.score : '-'}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setViewCodeModal(sub)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            View Code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {viewCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-lg font-bold text-white">Submission #{viewCodeModal.id.substring(0,8)}</h3>
                <p className="text-sm text-slate-400 mt-1 uppercase">{viewCodeModal.language} • {new Date(viewCodeModal.submitted_at || viewCodeModal.submittedAt || '').toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setViewCodeModal(null)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-[500px]">
              <Editor
                height="100%"
                language={viewCodeModal.language}
                theme="vs-dark"
                value={viewCodeModal.code}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
