import fs from 'fs';
import path from 'path';
import pool from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const appliedMigrations = new Set(rows.map((row: any) => row.filename));

    // Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`⏩ Skipping applied migration: ${file}`);
        continue;
      }

      console.log(`⏳ Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied migration: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying migration ${file}:`, error);
        throw error;
      }
    }
    
    console.log('🎉 All migrations applied successfully.');
  } catch (err) {
    console.error('💥 Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if script is executed directly
if (require.main === module) {
  migrate();
}

export default migrate;
