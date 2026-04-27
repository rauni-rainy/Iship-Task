CREATE TABLE contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_token VARCHAR(64) UNIQUE,  -- for private contests, share this token
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'running', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time CHECK (end_time > start_time)
);
CREATE INDEX idx_contests_created_by ON contests(created_by);
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_start_time ON contests(start_time);
