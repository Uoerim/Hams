const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setup() {
  const url = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created users table.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created messages table.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY DEFAULT 1,
        admin_password VARCHAR(255),
        group_password VARCHAR(255),
        initialized BOOLEAN DEFAULT false
      );
    `);
    console.log('Created app_settings table.');

    // Insert admin user
    await client.query(`
      INSERT INTO users (username, role) 
      VALUES ('admin', 'admin') 
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('Ensured admin user exists.');

    // Insert settings row
    await client.query(`
      INSERT INTO app_settings (id, initialized)
      VALUES (1, false)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Ensured settings row exists.');

    // Enable realtime for messages table
    await client.query(`
      begin;
      drop publication if exists supabase_realtime;
      create publication supabase_realtime;
      commit;
      alter publication supabase_realtime add table messages;
      alter publication supabase_realtime add table users;
    `).catch(e => {
        console.log('Note on realtime:', e.message);
    });

  } catch (err) {
    console.error('Error setting up DB:', err);
  } finally {
    await client.end();
  }
}

setup();
