CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(30) NOT NULL,  -- e.g. 'cpp', 'python', 'java', 'javascript'
  verdict VARCHAR(30) DEFAULT 'pending'
    CHECK (verdict IN ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded',
                       'runtime_error', 'compilation_error', 'auto_submitted')),
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  judged_at TIMESTAMPTZ,           -- set after 10-second delay
  is_auto_submitted BOOLEAN NOT NULL DEFAULT false,
  attempt_number INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_submissions_user_contest ON submissions(user_id, contest_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_contest ON submissions(contest_id);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);
