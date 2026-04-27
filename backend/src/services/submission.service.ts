import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';

const getIO = () => (global as any).io;

export const submitCode = async (userId: string, problemId: string, contestId: string, data: { code: string; language: string }) => {
  // 1. Verify contest is running and user is registered
  const contestRes = await pool.query('SELECT status FROM contests WHERE id = $1', [contestId]);
  if (contestRes.rows.length === 0) throw new AppError('Contest not found', 404);
  if (contestRes.rows[0].status !== 'running') throw new AppError('Contest is not running', 403);

  const regRes = await pool.query('SELECT is_flagged FROM registrations WHERE user_id = $1 AND contest_id = $2', [userId, contestId]);
  if (regRes.rows.length === 0) throw new AppError('User not registered for this contest', 403);
  const isFlagged = regRes.rows[0].is_flagged;

  // 2. Verify problem belongs to contest
  const probRes = await pool.query('SELECT id, points FROM problems WHERE id = $1 AND contest_id = $2', [problemId, contestId]);
  if (probRes.rows.length === 0) throw new AppError('Problem not found in this contest', 404);
  const points = probRes.rows[0].points;

  // 4. Calculate attempt_number
  const attemptRes = await pool.query('SELECT COUNT(*) FROM submissions WHERE user_id = $1 AND problem_id = $2 AND contest_id = $3', [userId, problemId, contestId]);
  const attemptNumber = parseInt(attemptRes.rows[0].count, 10) + 1;

  // 5. Insert submission
  const subRes = await pool.query(
    `INSERT INTO submissions (user_id, problem_id, contest_id, code, language, verdict, attempt_number)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING *`,
    [userId, problemId, contestId, data.code, data.language, attemptNumber]
  );
  const submission = subRes.rows[0];

  if (isFlagged) {
    submission.is_flagged = true; // Annotate for admin visibility if we want, or handle elsewhere
  }

  // 6. Start async judging
  setTimeout(() => {
    judgeSubmission(submission.id, userId, problemId, contestId, points).catch(console.error);
  }, 10000);

  return submission;
};

const judgeSubmission = async (submissionId: string, userId: string, problemId: string, contestId: string, points: number) => {
  const rand = Math.random() * 100;
  let verdict = 'accepted';
  if (rand > 60 && rand <= 75) verdict = 'wrong_answer';
  else if (rand > 75 && rand <= 85) verdict = 'time_limit_exceeded';
  else if (rand > 85 && rand <= 95) verdict = 'runtime_error';
  else if (rand > 95) verdict = 'compilation_error';

  const score = verdict === 'accepted' ? points : 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update submission
    const subRes = await client.query(
      `UPDATE submissions SET verdict = $1, score = $2, judged_at = NOW() WHERE id = $3 RETURNING *`,
      [verdict, score, submissionId]
    );
    const submission = subRes.rows[0];

    // Check problem_scores
    const scoreRes = await client.query('SELECT * FROM problem_scores WHERE user_id = $1 AND problem_id = $2 AND contest_id = $3', [userId, problemId, contestId]);
    
    let isFirstAC = false;

    if (scoreRes.rows.length === 0) {
      if (verdict === 'accepted') {
        isFirstAC = true;
        await client.query(
          `INSERT INTO problem_scores (user_id, contest_id, problem_id, best_score, attempts, first_accepted_at)
           VALUES ($1, $2, $3, $4, 1, NOW())`,
          [userId, contestId, problemId, score]
        );
      } else {
        await client.query(
          `INSERT INTO problem_scores (user_id, contest_id, problem_id, best_score, attempts)
           VALUES ($1, $2, $3, 0, 1)`,
          [userId, contestId, problemId]
        );
      }
    } else {
      const ps = scoreRes.rows[0];
      const newAttempts = ps.attempts + 1;
      
      if (verdict === 'accepted') {
        if (!ps.first_accepted_at) { // First AC
          isFirstAC = true;
          await client.query(
            `UPDATE problem_scores SET best_score = $1, attempts = $2, first_accepted_at = NOW() WHERE id = $3`,
            [score, newAttempts, ps.id]
          );
        } else {
          // Already AC'd, just increment attempts (or ignore, but we'll increment)
          await client.query(`UPDATE problem_scores SET attempts = $1 WHERE id = $2`, [newAttempts, ps.id]);
        }
      } else {
        await client.query(`UPDATE problem_scores SET attempts = $1 WHERE id = $2`, [newAttempts, ps.id]);
      }
    }

    if (isFirstAC) {
      // Recalculate leaderboard entry for this user
      await recalculateUserLeaderboard(client, userId, contestId);
    }

    await client.query('COMMIT');

    const io = getIO();
    if (io) {
      if (isFirstAC) {
        io.to(`contest:${contestId}`).emit('submission:judged', submission);
        // We'll also emit leaderboard update since it changed
        const lb = await getLeaderboard(contestId);
        io.to(`contest:${contestId}`).emit('leaderboard:update', lb);
      } else {
        // Emit only to user
        io.to(`user:${userId}`).emit('submission:judged', submission);
      }
      io.to(`admin:contest:${contestId}`).emit('admin:submission_activity', submission);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Judging failed:', error);
  } finally {
    client.release();
  }
};

const recalculateUserLeaderboard = async (client: any, userId: string, contestId: string) => {
  // Get all AC problem_scores for user in contest
  const psRes = await client.query(`
    SELECT best_score, attempts, first_accepted_at 
    FROM problem_scores 
    WHERE user_id = $1 AND contest_id = $2 AND first_accepted_at IS NOT NULL
  `, [userId, contestId]);

  let totalScore = 0;
  let penalty = 0;
  let lastAcceptedAt = null;

  for (const ps of psRes.rows) {
    totalScore += ps.best_score;
    // penalty: 20 mins per wrong attempt before AC. (attempts - 1)
    penalty += (ps.attempts - 1) * 20;
    
    if (!lastAcceptedAt || new Date(ps.first_accepted_at) > new Date(lastAcceptedAt)) {
      lastAcceptedAt = ps.first_accepted_at;
    }
  }

  await client.query(`
    UPDATE leaderboard 
    SET total_score = $1, penalty = $2, last_accepted_at = $3, updated_at = NOW()
    WHERE user_id = $4 AND contest_id = $5
  `, [totalScore, penalty, lastAcceptedAt, userId, contestId]);
};

export const getSubmissions = async (userId: string, contestId: string, problemId?: string) => {
  let query = 'SELECT id, problem_id, contest_id, language, verdict, score, submitted_at, judged_at FROM submissions WHERE user_id = $1 AND contest_id = $2';
  const params: any[] = [userId, contestId];
  if (problemId) {
    params.push(problemId);
    query += ' AND problem_id = $3';
  }
  query += ' ORDER BY submitted_at DESC';

  const res = await pool.query(query, params);
  return res.rows;
};

export const getSubmissionsForAdmin = async (contestId: string) => {
  const res = await pool.query(`
    SELECT s.*, u.username
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.contest_id = $1
    ORDER BY s.submitted_at DESC
  `, [contestId]);
  return res.rows;
};

export const recalculateLeaderboard = async (contestId: string) => {
  const usersRes = await pool.query('SELECT DISTINCT user_id FROM registrations WHERE contest_id = $1', [contestId]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of usersRes.rows) {
      await recalculateUserLeaderboard(client, row.user_id, contestId);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return await getLeaderboard(contestId);
};

export const getLeaderboard = async (contestId: string) => {
  const lbRes = await pool.query(`
    SELECT l.*, u.username
    FROM leaderboard l
    JOIN users u ON l.user_id = u.id
    WHERE l.contest_id = $1
    ORDER BY l.total_score DESC, l.last_accepted_at ASC NULLS LAST, l.penalty ASC
  `, [contestId]);

  const psRes = await pool.query(`
    SELECT user_id, problem_id, best_score, attempts, first_accepted_at
    FROM problem_scores
    WHERE contest_id = $1
  `, [contestId]);

  const lbData = lbRes.rows.map((entry, index) => {
    const userScores = psRes.rows.filter(ps => ps.user_id === entry.user_id);
    const problemResults: any = {};
    for (const ps of userScores) {
      problemResults[ps.problem_id] = {
        points: ps.best_score,
        attempts: ps.attempts,
        time: ps.first_accepted_at
      };
    }
    return {
      rank: index + 1,
      userId: entry.user_id,
      username: entry.username,
      totalPoints: entry.total_score,
      lastSubmissionTime: entry.last_accepted_at,
      penalty: entry.penalty,
      problemResults
    };
  });

  return lbData;
};

export const autoSubmitAll = async (userId: string, contestId: string, flagReason: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('UPDATE registrations SET is_flagged = true, flag_reason = $1 WHERE user_id = $2 AND contest_id = $3', [flagReason, userId, contestId]);

    const probsRes = await client.query(`
      SELECT id FROM problems WHERE contest_id = $1
      EXCEPT
      SELECT problem_id FROM problem_scores WHERE contest_id = $1 AND user_id = $2 AND first_accepted_at IS NOT NULL
    `, [contestId, userId]);

    const code = '[Auto-submitted due to policy violation]';
    
    for (const prob of probsRes.rows) {
      await client.query(`
        INSERT INTO submissions (user_id, problem_id, contest_id, code, language, verdict, is_auto_submitted)
        VALUES ($1, $2, $3, $4, 'text', 'auto_submitted', true)
      `, [userId, prob.id, contestId, code]);
    }

    await client.query('COMMIT');
    
    const io = getIO();
    if (io) {
      io.to(`admin:contest:${contestId}`).emit('admin:user_flagged', { userId, contestId, reason: flagReason });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('autoSubmitAll failed:', error);
  } finally {
    client.release();
  }
};
