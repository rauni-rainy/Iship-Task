import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';

export const getPublicProfile = async (username: string) => {
  // Fetch user (excluding email and password_hash)
  const userResult = await pool.query(
    'SELECT id, username, role, avatar_url, created_at FROM users WHERE username = $1',
    [username]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  // Aggregate stats
  // Total contests participated: count distinct contest_ids from registrations where user_id = user.id
  const statsResult = await pool.query(`
    SELECT 
      (SELECT COUNT(DISTINCT contest_id) FROM registrations WHERE user_id = $1) as contests_participated,
      (SELECT COUNT(DISTINCT problem_id) FROM submissions WHERE user_id = $1 AND verdict = 'accepted') as problems_solved,
      (SELECT COALESCE(SUM(score), 0) FROM leaderboard WHERE user_id = $1) as total_score
  `, [user.id]);

  const stats = {
    contestsParticipated: parseInt(statsResult.rows[0].contests_participated, 10),
    problemsSolved: parseInt(statsResult.rows[0].problems_solved, 10),
    totalScore: parseInt(statsResult.rows[0].total_score, 10)
  };

  // Recent Submissions (last 10 across all contests)
  const recentSubmissionsResult = await pool.query(`
    SELECT 
      s.id, s.verdict, s.language, s.submitted_at, s.score,
      p.title as problem_title, p.id as problem_id,
      c.title as contest_title, c.id as contest_id
    FROM submissions s
    JOIN problems p ON s.problem_id = p.id
    JOIN contests c ON s.contest_id = c.id
    WHERE s.user_id = $1
    ORDER BY s.submitted_at DESC
    LIMIT 10
  `, [user.id]);

  // Recent Contests
  const recentContestsResult = await pool.query(`
    SELECT 
      c.id, c.title, c.start_time, c.end_time, c.status,
      l.rank, l.score
    FROM registrations r
    JOIN contests c ON r.contest_id = c.id
    LEFT JOIN leaderboard l ON l.contest_id = c.id AND l.user_id = r.user_id
    WHERE r.user_id = $1
    ORDER BY c.end_time DESC
    LIMIT 5
  `, [user.id]);

  return {
    user,
    stats,
    recentSubmissions: recentSubmissionsResult.rows,
    recentContests: recentContestsResult.rows
  };
};
