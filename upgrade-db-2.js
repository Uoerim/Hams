const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function upgradeDb2() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
    `).catch(e => console.log(e.message));

    await client.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
    `).catch(e => console.log(e.message));

    console.log('Database upgraded for read receipts and edit/delete successfully!');
  } catch (err) {
    console.error('Error upgrading DB:', err);
  } finally {
    await client.end();
  }
}

upgradeDb2();
