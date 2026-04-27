-- Tracks per-problem scores for each participant (for leaderboard breakdown)
CREATE TABLE problem_scores (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_accepted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, problem_id)
);
CREATE INDEX idx_problem_scores_contest ON problem_scores(contest_id);
