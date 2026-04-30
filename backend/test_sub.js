const pool = require('./src/db/pool').default;
pool.query("SELECT id, title, created_by FROM contests WHERE id = 'd7b0ba41-65bc-41f5-878c-d9e503662a94'").then(res => {
  console.log('Contest:', res.rows);
  return pool.query("SELECT id, username, role FROM users WHERE id = ANY(ARRAY[(SELECT created_by FROM contests WHERE id = 'd7b0ba41-65bc-41f5-878c-d9e503662a94')]::uuid[])");
}).then(res => {
  console.log('Creator:', res.rows);
  process.exit(0);
}).catch(console.error);
