require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  console.log(res.rows);
  await client.end();
}
test();
