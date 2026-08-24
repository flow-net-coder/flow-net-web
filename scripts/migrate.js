require('dotenv').config();
const postgres = require('postgres');

async function testAndMigrate() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('Testing connection to Supabase PostgreSQL...');
  console.log('Host/URL:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'MISSING');

  if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { prepare: false, ssl: 'require' });

  try {
    const result = await sql`SELECT version();`;
    console.log('Connected successfully to:', result[0].version);

    console.log('Creating pipeline table if not exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline (
        id TEXT PRIMARY KEY,
        stage TEXT NOT NULL DEFAULT 'demos_ideas',
        name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        project_idea TEXT,
        project_goal TEXT,
        timeline TEXT,
        additional_details TEXT,
        source TEXT DEFAULT 'website',
        proposal_notes TEXT,
        demo_url TEXT,
        quote_amount TEXT,
        scope_summary TEXT,
        app_name TEXT,
        live_url TEXT,
        monthly_price TEXT,
        status TEXT DEFAULT 'new',
        created_at TEXT,
        updated_at TEXT
      );
    `;

    console.log('Creating submissions table if not exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        project_idea TEXT,
        project_goal TEXT,
        timeline TEXT,
        additional_details TEXT,
        timestamp TEXT
      );
    `;

    console.log('Tables created / verified in Supabase PostgreSQL!');

    // Check count
    const rows = await sql`SELECT count(*) FROM pipeline;`;
    console.log('Current pipeline rows in DB:', rows[0].count);

    await sql.end();
    console.log('Done!');
  } catch (err) {
    console.error('Database migration error:', err);
    await sql.end({ timeout: 2 });
    process.exit(1);
  }
}

testAndMigrate();
