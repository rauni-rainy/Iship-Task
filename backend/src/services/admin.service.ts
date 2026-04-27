import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';

const getIO = () => (global as any).io;

export const getContestLiveStats = async (contestId: string) => {
  const io = getIO();
  const onlineCount = io?.sockets?.adapter?.rooms?.get(`contest:${contestId}`)?.size ?? 0;

  const regRes = await pool.query('SELECT COUNT(*) FROM registrations WHERE contest_id = $1', [contestId]);
  const totalParticipants = parseInt(regRes.rows[0].count, 10);

  const subRes = await pool.query(`
    SELECT verdict, COUNT(*) 
    FROM submissions 
    WHERE contest_id = $1 
    GROUP BY verdict
  `, [contestId]);
  
  let totalSubmissions = 0;
  let acceptedCount = 0;
  subRes.rows.forEach(r => {
    const c = parseInt(r.count, 10);
    totalSubmissions += c;
    if (r.verdict === 'accepted') acceptedCount += c;
  });

  const flagRes = await pool.query('SELECT COUNT(*) FROM registrations WHERE contest_id = $1 AND is_flagged = true', [contestId]);
  const flaggedCount = parseInt(flagRes.rows[0].count, 10);

  const probsRes = await pool.query(`
    SELECT p.id as "problemId", p.title, 
           COUNT(s.id) as "totalAttempts",
           COUNT(CASE WHEN s.verdict = 'accepted' THEN 1 END) as "solveCount"
    FROM problems p
    LEFT JOIN submissions s ON p.id = s.problem_id
    WHERE p.contest_id = $1
    GROUP BY p.id, p.title
  `, [contestId]);

  let mostAttempted = null;
  let maxAttempts = -1;
  const solveRatePerProblem = probsRes.rows.map(row => {
    const attempts = parseInt(row.totalAttempts, 10);
    const solves = parseInt(row.solveCount, 10);
    if (attempts > maxAttempts) {
      maxAttempts = attempts;
      mostAttempted = row.title;
    }
    return {
      problemId: row.problemId,
      title: row.title,
      solveCount: solves,
      totalAttempts: attempts
    };
  });

  return {
    totalParticipants,
    onlineNow: onlineCount,
    totalSubmissions,
    acceptedCount,
    flaggedCount,
    mostAttempted,
    solveRatePerProblem
  };
};

export const getFlaggedUsers = async (contestId: string) => {
  const res = await pool.query(`
    SELECT r.user_id as "userId", u.username, u.email, r.flag_reason as "flagReason", r.flag_count as "flagCount", r.updated_at as "flaggedAt"
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.contest_id = $1 AND r.is_flagged = true
  `, [contestId]);
  return res.rows;
};

export const getOnlineUsers = async (contestId: string) => {
  const io = getIO();
  if (!io) return [];
  const room = io.sockets.adapter.rooms.get(`contest:${contestId}`);
  if (!room) return [];

  const onlineUsers: any[] = [];
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.data && socket.data.user) {
      onlineUsers.push({
        userId: socket.data.user.id
      });
    }
  }
  
  const uniqueIds = Array.from(new Set(onlineUsers.map(u => u.userId)));
  if (uniqueIds.length === 0) return [];
  
  const usersRes = await pool.query('SELECT id, username FROM users WHERE id = ANY($1)', [uniqueIds]);
  return usersRes.rows.map(u => ({
    userId: u.id,
    username: u.username,
    joinedAt: new Date()
  }));
};

export const getAllSubmissionsForAdmin = async (contestId: string, { page = 1, limit = 20, verdict, userId }: any) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT s.*, u.username, p.title as problem_title
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    JOIN problems p ON s.problem_id = p.id
    WHERE s.contest_id = $1
  `;
  const params: any[] = [contestId];
  let paramIdx = 2;

  if (verdict) {
    query += ` AND s.verdict = $${paramIdx++}`;
    params.push(verdict);
  }
  if (userId) {
    query += ` AND s.user_id = $${paramIdx++}`;
    params.push(userId);
  }

  const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  query += ` ORDER BY s.submitted_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);

  return {
    submissions: res.rows,
    total,
    page,
    limit
  };
};

export const unflagUser = async (userId: string, contestId: string, adminUserId: string) => {
  const contestRes = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (contestRes.rows.length === 0) throw new AppError('Contest not found', 404);

  const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminUserId]);
  const role = adminCheck.rows[0]?.role;

  if (role !== 'admin' && contestRes.rows[0].created_by !== adminUserId) {
    throw new AppError('Forbidden: Not an admin or contest creator', 403);
  }

  await pool.query(
    `UPDATE registrations SET is_flagged = false, flag_reason = NULL, updated_at = NOW() WHERE user_id = $1 AND contest_id = $2`,
    [userId, contestId]
  );

  const io = getIO();
  if (io) {
    io.to(`admin:contest:${contestId}`).emit('admin:user_unflagged', { userId, contestId });
  }
};
