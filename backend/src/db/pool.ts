import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
};

const originalQuery = pool.query.bind(pool);

(pool as any).query = async (text: string | any, params?: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    const isString = typeof text === 'string';
    const queryText = isString ? text : text.text;
    const queryParams = isString ? params : text.values;
    
    // Check for obvious string interpolation (naive check for demo)
    if (isString && /\$\{.*?\}/.test(queryText)) {
      console.warn(`[WARNING] Potential SQL Injection: String interpolation detected in query: ${queryText}`);
    }
    
    console.log(`[DB Query] ${queryText.replace(/\n\s+/g, ' ').trim()}`);
    if (queryParams && queryParams.length > 0) {
      console.log(`[DB Params]`, queryParams);
    }
  }
  return originalQuery(text, params);
};

export default pool;
