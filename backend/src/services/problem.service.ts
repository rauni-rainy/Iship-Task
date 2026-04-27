import pool from '../db/pool';
import { AppError } from '../utils/errorHandler';
import { sanitizeString } from '../utils/sanitize';

export const addProblem = async (contestId: string, userId: string, data: any) => {
  const check = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
  if (check.rows.length === 0) throw new AppError('Contest not found', 404);
  if (check.rows[0].created_by !== userId) throw new AppError('Unauthorized: Only contest creator can add problems', 403);

  let { problemOrder } = data;
  if (!problemOrder) {
    const orderCheck = await pool.query('SELECT COALESCE(MAX(problem_order), 0) + 1 as next_order FROM problems WHERE contest_id = $1', [contestId]);
    problemOrder = orderCheck.rows[0].next_order;
  } else {
    const existCheck = await pool.query('SELECT 1 FROM problems WHERE contest_id = $1 AND problem_order = $2', [contestId, problemOrder]);
    if (existCheck.rows.length > 0) throw new AppError(`Problem order ${problemOrder} already exists in this contest`, 400);
  }

  const result = await pool.query(
    `INSERT INTO problems (contest_id, title, statement, input_format, output_format, constraints_text, sample_input, sample_output, explanation, time_limit_ms, memory_limit_mb, points, problem_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [contestId, sanitizeString(data.title), sanitizeString(data.statement), sanitizeString(data.inputFormat), sanitizeString(data.outputFormat), sanitizeString(data.constraintsText), sanitizeString(data.sampleInput), sanitizeString(data.sampleOutput), sanitizeString(data.explanation), data.timeLimitMs || 1000, data.memoryLimitMb || 256, data.points || 100, problemOrder]
  );

  return result.rows[0];
};

export const getProblemsForContest = async (contestId: string, userId?: string) => {
  const contestResult = await pool.query('SELECT status, created_by, is_public FROM contests WHERE id = $1', [contestId]);
  if (contestResult.rows.length === 0) throw new AppError('Contest not found', 404);
  const contest = contestResult.rows[0];

  if (contest.status === 'upcoming' && contest.created_by !== userId) {
    throw new AppError('Problems are not visible until the contest starts', 403);
  }

  const result = await pool.query('SELECT * FROM problems WHERE contest_id = $1 ORDER BY problem_order ASC', [contestId]);
  return result.rows;
};

export const getProblemById = async (problemId: string, userId?: string) => {
  const result = await pool.query(`
    SELECT p.*, c.status as contest_status, c.created_by as contest_creator
    FROM problems p
    JOIN contests c ON p.contest_id = c.id
    WHERE p.id = $1
  `, [problemId]);

  if (result.rows.length === 0) throw new AppError('Problem not found', 404);
  const problem = result.rows[0];

  if (problem.contest_status === 'upcoming' && problem.contest_creator !== userId) {
    throw new AppError('Problem is not visible yet', 403);
  }

  if (userId) {
    const submissions = await pool.query('SELECT id, language, verdict, score, submitted_at FROM submissions WHERE user_id = $1 AND problem_id = $2 ORDER BY submitted_at DESC', [userId, problemId]);
    problem.mySubmissions = submissions.rows;
  }

  return problem;
};

export const updateProblem = async (problemId: string, userId: string, data: any) => {
  const check = await pool.query(`
    SELECT p.id, c.created_by, c.status
    FROM problems p
    JOIN contests c ON p.contest_id = c.id
    WHERE p.id = $1
  `, [problemId]);
  
  if (check.rows.length === 0) throw new AppError('Problem not found', 404);
  const { created_by, status } = check.rows[0];

  if (created_by !== userId) throw new AppError('Unauthorized', 403);
  if (status !== 'upcoming') throw new AppError('Cannot edit problem after contest has started', 400);

  const allowedFields = ['title', 'statement', 'input_format', 'output_format', 'constraints_text', 'sample_input', 'sample_output', 'explanation', 'time_limit_ms', 'memory_limit_mb', 'points', 'problem_order'];
  
  const updates: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    const camelField = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
    if (data[camelField] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      const val = typeof data[camelField] === 'string' ? sanitizeString(data[camelField]) : data[camelField];
      params.push(val);
    }
  }

  if (updates.length === 0) return await getProblemById(problemId);

  params.push(problemId);
  const result = await pool.query(`UPDATE problems SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`, params);
  return result.rows[0];
};

export const deleteProblem = async (problemId: string, userId: string) => {
  const check = await pool.query(`
    SELECT p.id, c.created_by, c.status
    FROM problems p
    JOIN contests c ON p.contest_id = c.id
    WHERE p.id = $1
  `, [problemId]);
  
  if (check.rows.length === 0) throw new AppError('Problem not found', 404);
  if (check.rows[0].created_by !== userId) throw new AppError('Unauthorized', 403);
  if (check.rows[0].status !== 'upcoming') throw new AppError('Cannot delete problem after contest has started', 400);

  await pool.query('DELETE FROM problems WHERE id = $1', [problemId]);
};
