const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function upgradeDb4() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS reply_to JSONB DEFAULT NULL;
    `).catch(e => console.log(e.message));

    console.log('Database upgraded for reply_to successfully!');
  } catch (err) {
    console.error('Error upgrading DB:', err);
  } finally {
    await client.end();
  }
}

upgradeDb4();
