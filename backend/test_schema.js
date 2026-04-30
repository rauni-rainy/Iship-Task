const pool = require('./src/db/pool').default;
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='submissions'").then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(console.error);
