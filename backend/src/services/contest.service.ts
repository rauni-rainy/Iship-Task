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
  if (!contest) throw new AppError('Contest not found', 404);

  const isCreator = userId === contest.created_by;
  const isAdmin = userRole === 'admin';

  let isRegistered = false;
  let isFlagged = false;
  let joinRequestStatus: string | null = null; // null | pending | approved | rejected

  if (userId) {
    const regCheck = await pool.query('SELECT is_flagged FROM registrations WHERE user_id = $1 AND contest_id = $2', [userId, contestId]);
    if (regCheck.rows.length > 0) {
      isRegistered = true;
      isFlagged = regCheck.rows[0].is_flagged;
    }

    // Get solved problem IDs for this user
    const solvedRes = await pool.query(
      'SELECT problem_id FROM problem_scores WHERE user_id = $1 AND contest_id = $2 AND first_accepted_at IS NOT NULL',
      [userId, contestId]
    );
    contest.solvedProblemIds = solvedRes.rows.map((r: any) => r.problem_id);
  }

  if (!contest.is_public) {
    if (!isCreator && !isAdmin) {
      // Check join_requests for this user
      if (userId) {
        const reqCheck = await pool.query(
          'SELECT status, re_apply_count, decided_at FROM join_requests WHERE contest_id = $1 AND user_id = $2',
          [contestId, userId]
        );
        if (reqCheck.rows.length > 0) {
          const row = reqCheck.rows[0];
          joinRequestStatus = row.status;
          // Expose to frontend so it can render cooldown / remaining attempts
          contest._joinRequestMeta = {
            reApplyCount: row.re_apply_count,
            decidedAt: row.decided_at,
          };
        }
      }

      if (!isRegistered && joinRequestStatus === null) {
        throw new AppError('PRIVATE_NO_ACCESS', 403);
      }
    }
    // Expose invite_token only to creator/admin
    if (!isCreator && !isAdmin) {
      delete contest.invite_token;
    }
  } else {
    delete contest.invite_token;
  }

  const problemsResult = await pool.query('SELECT * FROM problems WHERE contest_id = $1 ORDER BY problem_order ASC', [contestId]);
  contest.problems = problemsResult.rows;
  contest.isRegistered = isRegistered;
  contest.isFlagged = isFlagged;
  contest.joinRequestStatus = joinRequestStatus;
  contest.isCreator = isCreator;

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

export const registerForContest = async (userId: string, contestId: string) => {
  const check = await pool.query('SELECT status, is_public, created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = check.rows[0];

  if (contest.status === 'ended') throw new AppError('Contest has already ended', 400);

  // For private contests, require an approved join_request
  if (!contest.is_public && userId !== contest.created_by) {
    const reqCheck = await pool.query(
      `SELECT status FROM join_requests WHERE contest_id = $1 AND user_id = $2`,
      [contestId, userId]
    );
    if (reqCheck.rows.length === 0 || reqCheck.rows[0].status !== 'approved') {
      throw new AppError('Your join request has not been approved yet', 403);
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

// ── Join Request system (private contests) ─────────────────────────────────

export const requestToJoin = async (userId: string, contestId: string, inviteToken: string) => {
  const contestRes = await pool.query(
    'SELECT id, invite_token, is_public, status, created_by FROM contests WHERE id = $1',
    [contestId]
  );
  if (contestRes.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = contestRes.rows[0];

  if (contest.is_public) throw new AppError('This is a public contest — register directly', 400);
  if (contest.status === 'ended') throw new AppError('Contest has already ended', 400);
  if (contest.invite_token !== inviteToken) throw new AppError('Invalid invite link', 403);
  if (contest.created_by === userId) throw new AppError('You are the creator of this contest', 400);

  // Already registered?
  const regCheck = await pool.query('SELECT 1 FROM registrations WHERE user_id = $1 AND contest_id = $2', [userId, contestId]);
  if (regCheck.rows.length > 0) throw new AppError('You are already registered', 400);

  const MAX_REAPPLIES = 2;
  const COOLDOWN_HOURS = 24;

  // Already requested?
  const existing = await pool.query(
    'SELECT id, status, re_apply_count, decided_at FROM join_requests WHERE contest_id = $1 AND user_id = $2',
    [contestId, userId]
  );
  if (existing.rows.length > 0) {
    const req = existing.rows[0];
    if (req.status === 'pending') throw new AppError('Your request is already pending', 400);
    if (req.status === 'approved') throw new AppError('Your request was already approved', 400);

    // --- Rejected path: enforce limits before allowing re-apply ---
    if (req.re_apply_count >= MAX_REAPPLIES) {
      throw new AppError(
        `You have used all ${MAX_REAPPLIES} re-apply attempts for this contest.`,
        403
      );
    }

    if (req.decided_at) {
      const hoursSince = (Date.now() - new Date(req.decided_at).getTime()) / 3_600_000;
      if (hoursSince < COOLDOWN_HOURS) {
        const hoursLeft = Math.ceil(COOLDOWN_HOURS - hoursSince);
        throw new AppError(
          `Please wait ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} before re-applying.`,
          429
        );
      }
    }

    const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    await pool.query(
      `UPDATE join_requests
       SET status = 'pending', requested_at = NOW(), decided_at = NULL,
           re_apply_count = re_apply_count + 1
       WHERE id = $1`,
      [req.id]
    );
    const updatedReq = {
      id: req.id,
      status: 'pending',
      username: userRes.rows[0]?.username,
      reApplyCount: req.re_apply_count + 1,
    };
    const io = getIO();
    if (io) io.to(`admin:contest:${contestId}`).emit('join_request:new', { ...updatedReq, contestId, isReRequest: true });
    return updatedReq;
  }

  const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) throw new AppError('User not found', 404);
  const username = userRes.rows[0].username;

  const result = await pool.query(
    `INSERT INTO join_requests (contest_id, user_id, username) VALUES ($1, $2, $3) RETURNING *`,
    [contestId, userId, username]
  );
  const newRequest = result.rows[0];

  // Notify creator in real-time
  const io = getIO();
  if (io) {
    io.to(`admin:contest:${contestId}`).emit('join_request:new', {
      id: newRequest.id,
      contestId,
      userId,
      username,
      requestedAt: newRequest.requested_at,
    });
  }

  return newRequest;
};

export const getJoinRequests = async (contestId: string, requesterId: string) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);

  const result = await pool.query(
    `SELECT id, user_id, username, status, requested_at, decided_at
     FROM join_requests WHERE contest_id = $1 ORDER BY requested_at DESC`,
    [contestId]
  );
  return result.rows;
};

export const approveJoinRequest = async (requestId: string, contestId: string, requesterId: string) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);

  const reqRes = await pool.query(
    `UPDATE join_requests SET status = 'approved', decided_at = NOW()
     WHERE id = $1 AND contest_id = $2 RETURNING *`,
    [requestId, contestId]
  );
  if (reqRes.rows.length === 0) throw new AppError('Request not found', 404);
  const req = reqRes.rows[0];

  // Auto-register the user
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO registrations (user_id, contest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user_id, contestId]
    );
    await client.query(
      `INSERT INTO leaderboard (user_id, contest_id, total_score) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
      [req.user_id, contestId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Notify the user in real-time
  const io = getIO();
  if (io) {
    io.to(`user:${req.user_id}`).emit('join_request:decision', {
      contestId,
      requestId,
      status: 'approved',
      message: 'Your request has been approved! You are now registered.',
    });
  }

  return req;
};

export const rejectJoinRequest = async (requestId: string, contestId: string, requesterId: string) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);

  const reqRes = await pool.query(
    `UPDATE join_requests SET status = 'rejected', decided_at = NOW()
     WHERE id = $1 AND contest_id = $2 RETURNING *`,
    [requestId, contestId]
  );
  if (reqRes.rows.length === 0) throw new AppError('Request not found', 404);
  const req = reqRes.rows[0];

  // Notify the user in real-time
  const io = getIO();
  if (io) {
    io.to(`user:${req.user_id}`).emit('join_request:decision', {
      contestId,
      requestId,
      status: 'rejected',
      message: 'Your join request was declined.',
    });
  }

  return req;
};


// --- Invite management (private contests) ---

export const addInvite = async (contestId: string, requesterId: string, username: string) => {
  // Verify requester is creator
  const check = await pool.query('SELECT created_by, is_public FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);
  if (check.rows[0].is_public) throw new AppError('Cannot invite to a public contest', 400);

  // Verify user with that username exists
  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (userRes.rows.length === 0) throw new AppError(`User "${username}" not found`, 404);

  // Insert (ignore duplicate)
  await pool.query(
    `INSERT INTO contest_invites (contest_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [contestId, username]
  );

  return { contestId, username, status: 'pending' };
};

export const removeInvite = async (contestId: string, requesterId: string, username: string) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);

  // Don't allow removing someone who already registered
  const inviteRow = await pool.query(
    `SELECT status FROM contest_invites WHERE contest_id = $1 AND username = $2`,
    [contestId, username]
  );
  if (inviteRow.rows.length > 0 && inviteRow.rows[0].status === 'registered') {
    throw new AppError('Cannot remove an invite for someone who has already registered', 400);
  }

  await pool.query(
    `DELETE FROM contest_invites WHERE contest_id = $1 AND username = $2`,
    [contestId, username]
  );
};

export const getInvites = async (contestId: string, requesterId: string) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== requesterId) throw new AppError('Unauthorized', 403);

  const result = await pool.query(
    `SELECT username, status, invited_at FROM contest_invites WHERE contest_id = $1 ORDER BY invited_at ASC`,
    [contestId]
  );
  return result.rows;
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

// Returns private contests where the user has a PENDING invite (not yet registered)
export const getMyInvitedContests = async (userId: string) => {
  const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) return [];
  const username = userRes.rows[0].username;

  const result = await pool.query(`
    SELECT c.id, c.title, c.description, c.start_time, c.end_time, c.status,
           u.username AS creator_username, ci.invited_at
    FROM contest_invites ci
    JOIN contests c ON ci.contest_id = c.id
    JOIN users u ON c.created_by = u.id
    WHERE ci.username = $1 AND ci.status = 'pending'
    ORDER BY c.start_time ASC
  `, [username]);
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
