export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_public: boolean;
  created_by: string;
  status: 'upcoming' | 'running' | 'ended';
  invite_token?: string;
}

export interface Problem {
  id: string;
  contest_id: string;
  title: string;
  statement: string;
  input_format: string;
  output_format: string;
  constraints_text?: string;
  sample_input: string;
  sample_output: string;
  explanation?: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  points: number;
  problem_order: number;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  contestId: string;
  code: string;
  language: string;
  verdict: string;
  submittedAt: Date;
  isAutoSubmitted: boolean;
}

export interface Registration {
  userId: string;
  contestId: string;
  registeredAt: Date;
  isFlagged: boolean;
  flagReason: string;
  flag_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  lastSubmissionTime: Date;
  penalty?: number;
  problemResults: Record<string, { points: number; attempts: number; time: Date }>;
}
