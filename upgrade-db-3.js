const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function upgradeDb3() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
    `).catch(e => console.log(e.message));

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_device VARCHAR(255);
    `).catch(e => console.log(e.message));

    await client.query(`
      ALTER TABLE app_settings 
      ADD COLUMN IF NOT EXISTS is_dark_mode BOOLEAN DEFAULT true;
    `).catch(e => console.log(e.message));

    console.log('Database upgraded for edit history, device, and dark mode!');
  } catch (err) {
    console.error('Error upgrading DB:', err);
  } finally {
    await client.end();
  }
}

upgradeDb3();
