const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        message TEXT,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        decided_at TIMESTAMPTZ,
        UNIQUE (contest_id, user_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_join_requests_contest_id ON join_requests(contest_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id)`);
    await pool.query(`INSERT INTO schema_migrations (filename) VALUES ('011_create_join_requests.sql') ON CONFLICT DO NOTHING`);
    console.log('Migration 011 applied successfully');
  } catch (e) {
    console.error('Migration failed:', e.message);
  } finally {
    await pool.end();
  }
}
run();
