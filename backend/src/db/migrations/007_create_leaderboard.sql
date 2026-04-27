CREATE TABLE leaderboard (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  problems_solved INTEGER NOT NULL DEFAULT 0,
  last_accepted_at TIMESTAMPTZ,   -- tie-breaker: earlier = better rank
  penalty INTEGER NOT NULL DEFAULT 0,  -- total penalty minutes (like ICPC)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, contest_id)
);
CREATE INDEX idx_leaderboard_contest ON leaderboard(contest_id);
CREATE INDEX idx_leaderboard_score ON leaderboard(contest_id, total_score DESC, last_accepted_at ASC);
