CREATE TABLE contest_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'registered')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contest_id, username)
);
CREATE INDEX idx_contest_invites_contest_id ON contest_invites(contest_id);
