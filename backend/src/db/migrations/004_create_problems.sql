CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  statement TEXT NOT NULL,      -- markdown supported
  input_format TEXT,
  output_format TEXT,
  constraints_text TEXT,
  sample_input TEXT,
  sample_output TEXT,
  explanation TEXT,             -- optional explanation for sample
  time_limit_ms INTEGER NOT NULL DEFAULT 1000,
  memory_limit_mb INTEGER NOT NULL DEFAULT 256,
  points INTEGER NOT NULL DEFAULT 100,
  problem_order INTEGER NOT NULL DEFAULT 1,  -- A=1, B=2, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_problems_contest_id ON problems(contest_id);
CREATE UNIQUE INDEX idx_problems_contest_order ON problems(contest_id, problem_order);
