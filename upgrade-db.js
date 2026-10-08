const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function upgradeDb() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    // Add emergency link
    await client.query(`
      ALTER TABLE app_settings 
      ADD COLUMN IF NOT EXISTS emergency_link VARCHAR(500) DEFAULT 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    `).catch(e => console.log(e.message));

    // Add primary color
    await client.query(`
      ALTER TABLE app_settings 
      ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT 'indigo';
    `).catch(e => console.log(e.message));

    console.log('Database upgraded successfully!');
  } catch (err) {
    console.error('Error upgrading DB:', err);
  } finally {
    await client.end();
  }
}

upgradeDb();
