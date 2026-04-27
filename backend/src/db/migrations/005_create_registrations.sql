CREATE TABLE registrations (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,             -- e.g. 'tab_switch' or 'fullscreen_exit'
  flag_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, contest_id)
);
CREATE INDEX idx_registrations_contest_id ON registrations(contest_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
