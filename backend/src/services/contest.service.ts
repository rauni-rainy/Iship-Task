import crypto from 'crypto';
import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';
import { sanitizeString } from '../utils/sanitize';

// Dummy IO for now, usually imported from socket setup
const getIO = () => (global as any).io;

export const createContest = async (userId: string, data: { title: string; description: string; startTime: string; endTime: string; isPublic: boolean }) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const now = new Date();

  if (start <= now) {
    throw new AppError('Start time must be in the future', 400);
  }
  if (end <= start) {
    throw new AppError('End time must be after start time', 400);
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 30 * 60 * 1000) {
    throw new AppError('Contest duration must be at least 30 minutes', 400);
  }

  let inviteToken = null;
  if (data.isPublic === false) {
    inviteToken = crypto.randomBytes(16).toString('hex'); // 32 chars
  }

  const safeTitle = sanitizeString(data.title);
  const safeDescription = sanitizeString(data.description);

  const result = await pool.query(
    `INSERT INTO contests (title, description, start_time, end_time, is_public, created_by, invite_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [safeTitle, safeDescription, start, end, data.isPublic, userId, inviteToken]
  );

  return result.rows[0];
};

export const getContests = async ({ status, isPublic, page = 1, limit = 20, role = 'user', createdByMe }: any) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT c.*, u.username as creator_username
    FROM contests c
    JOIN users u ON c.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (createdByMe) {
    query += ` AND c.created_by = $${paramIndex++}`;
    params.push(createdByMe);
  } else {
    if (role !== 'admin') {
      query += ` AND c.is_public = $${paramIndex++}`;
      params.push(true);
    } else if (isPublic !== undefined) {
      query += ` AND c.is_public = $${paramIndex++}`;
      params.push(isPublic);
    }
  }

  if (status) {
    query += ` AND c.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY c.start_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = `SELECT COUNT(*) FROM contests c WHERE 1=1`;
  const countParams: any[] = [];
  let countParamIndex = 1;
  
  if (createdByMe) {
    countQuery += ` AND c.created_by = $${countParamIndex++}`;
    countParams.push(createdByMe);
  } else {
    if (role !== 'admin') {
      countQuery += ` AND c.is_public = $${countParamIndex++}`;
      countParams.push(true);
    } else if (isPublic !== undefined) {
      countQuery += ` AND c.is_public = $${countParamIndex++}`;
      countParams.push(isPublic);
    }
  }

  if (status) {
    countQuery += ` AND c.status = $${countParamIndex++}`;
    countParams.push(status);
  }
  
  const countResult = await pool.query(countQuery, countParams);

  return {
    contests: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page: Number(page),
    limit: Number(limit)
  };
};

export const getContestById = async (contestId: string, userId?: string, userRole?: string) => {
  const contestResult = await pool.query(`
    SELECT c.*, u.username as creator_username
    FROM contests c
    JOIN users u ON c.created_by = u.id
    WHERE c.id = $1
  `, [contestId]);

  const contest = contestResult.rows[0];
  if (!contest) {
    throw new AppError('Contest not found', 404);
  }

  let isRegistered = false;

  if (userId) {
    const regCheck = await pool.query('SELECT 1 FROM registrations WHERE user_id = $1 AND contest_id = $2', [userId, contestId]);
    isRegistered = regCheck.rows.length > 0;
  }

  if (!contest.is_public && userRole !== 'admin' && userId !== contest.created_by) {
    if (!isRegistered) {
      throw new AppError('Forbidden: Private contest', 403);
    }
  }

  const problemsResult = await pool.query('SELECT * FROM problems WHERE contest_id = $1 ORDER BY problem_order ASC', [contestId]);
  contest.problems = problemsResult.rows;
  contest.isRegistered = isRegistered;

  return contest;
};

export const updateContest = async (contestId: string, userId: string, data: any) => {
  const check = await pool.query('SELECT created_by, status FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = check.rows[0];

  if (contest.created_by !== userId) throw new AppError('Unauthorized', 403);
  
  const updates: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    params.push(data.description);
  }
  if (data.isPublic !== undefined) {
    updates.push(`is_public = $${paramIdx++}`);
    params.push(data.isPublic);
  }

  // Update start_time / end_time only if upcoming
  if (contest.status !== 'upcoming') {
    if (data.startTime !== undefined || data.endTime !== undefined) {
      throw new AppError('Cannot update times for a running or ended contest', 400);
    }
  } else {
    if (data.startTime !== undefined) {
      updates.push(`start_time = $${paramIdx++}`);
      params.push(new Date(data.startTime));
    }
    if (data.endTime !== undefined) {
      updates.push(`end_time = $${paramIdx++}`);
      params.push(new Date(data.endTime));
    }
  }

  if (updates.length === 0) return await getContestById(contestId);

  params.push(contestId);
  const result = await pool.query(`UPDATE contests SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING *`, params);
  return result.rows[0];
};

export const deleteContest = async (contestId: string, userId: string, userRole: string) => {
  const check = await pool.query('SELECT created_by, status FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = check.rows[0];

  if (contest.created_by !== userId && userRole !== 'admin') throw new AppError('Unauthorized', 403);
  if (contest.status === 'running') throw new AppError('Cannot delete a running contest', 400);

  await pool.query('DELETE FROM contests WHERE id = $1', [contestId]);
};

export const getPublicStats = async () => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(id) FROM contests WHERE is_public = true) as total_contests,
      (SELECT COUNT(DISTINCT user_id) FROM registrations) as total_participants
  `);
  return {
    totalContests: parseInt(result.rows[0].total_contests, 10),
    totalParticipants: parseInt(result.rows[0].total_participants, 10)
  };
};

export const registerForContest = async (userId: string, contestId: string, inviteToken?: string) => {
  const check = await pool.query('SELECT status, is_public, invite_token FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = check.rows[0];

  if (contest.status === 'ended') throw new AppError('Contest has already ended', 400);
  
  if (!contest.is_public) {
    if (contest.invite_token !== inviteToken) {
      throw new AppError('Invalid or missing invite token', 403);
    }
  }

  const regCheck = await pool.query('SELECT 1 FROM registrations WHERE user_id = $1 AND contest_id = $2', [userId, contestId]);
  if (regCheck.rows.length > 0) throw new AppError('User already registered', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('INSERT INTO registrations (user_id, contest_id) VALUES ($1, $2) RETURNING *', [userId, contestId]);
    await client.query('INSERT INTO leaderboard (user_id, contest_id, total_score) VALUES ($1, $2, 0)', [userId, contestId]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getMyRegisteredContests = async (userId: string) => {
  const result = await pool.query(`
    SELECT c.*, r.registered_at
    FROM contests c
    JOIN registrations r ON c.id = r.contest_id
    WHERE r.user_id = $1
    ORDER BY c.start_time ASC
  `, [userId]);
  return result.rows;
};

export const updateContestStatuses = async () => {
  try {
    // Upcoming -> Running
    const runningResult = await pool.query(`
      UPDATE contests
      SET status = 'running', updated_at = NOW()
      WHERE status = 'upcoming' AND start_time <= NOW() AND end_time > NOW()
      RETURNING id, title
    `);

    // Running -> Ended
    const endedResult = await pool.query(`
      UPDATE contests
      SET status = 'ended', updated_at = NOW()
      WHERE status IN ('upcoming', 'running') AND end_time <= NOW()
      RETURNING id, title
    `);

    const io = getIO();
    if (io && runningResult.rows.length > 0) {
      runningResult.rows.forEach(contest => {
        io.to(`contest:${contest.id}`).emit('contest:started', { contestId: contest.id, title: contest.title });
      });
    }
    
    if (io && endedResult.rows.length > 0) {
      endedResult.rows.forEach(contest => {
        io.to(`contest:${contest.id}`).emit('contest:ended', { contestId: contest.id, title: contest.title });
      });
    }

  } catch (error) {
    console.error('Failed to update contest statuses:', error);
  }
};
