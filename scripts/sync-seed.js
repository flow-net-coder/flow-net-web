require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb, schema } = require('../db');

async function syncSeedToDb() {
  const db = getDb();
  if (!db) {
    console.error('Database connection could not be established.');
    process.exit(1);
  }

  const pipelinePath = path.join(__dirname, '..', 'pipeline.json');
  if (!fs.existsSync(pipelinePath)) {
    console.log('No pipeline.json to sync.');
    process.exit(0);
  }

  const items = JSON.parse(fs.readFileSync(pipelinePath, 'utf8') || '[]');
  console.log(`Syncing ${items.length} items to Supabase PostgreSQL...`);

  for (const item of items) {
    const dbRow = {
      id: String(item.id),
      stage: String(item.stage || 'demos_ideas'),
      name: String(item.name || ''),
      email: String(item.email || ''),
      phone: String(item.phone || ''),
      company: String(item.company || ''),
      project_idea: String(item.project_idea || ''),
      project_goal: String(item.project_goal || ''),
      timeline: String(item.timeline || ''),
      additional_details: String(item.additional_details || ''),
      source: String(item.source || 'website'),
      proposal_notes: String(item.proposal_notes || ''),
      demo_url: String(item.demo_url || ''),
      quote_amount: String(item.quote_amount || ''),
      scope_summary: String(item.scope_summary || ''),
      app_name: String(item.app_name || ''),
      live_url: String(item.live_url || ''),
      monthly_price: String(item.monthly_price || ''),
      status: String(item.status || 'new'),
      created_at: String(item.createdAt || new Date().toISOString()),
      updated_at: String(item.updatedAt || new Date().toISOString()),
    };

    await db.insert(schema.pipeline).values(dbRow).onConflictDoUpdate({
      target: schema.pipeline.id,
      set: dbRow,
    });
    console.log('Synced item to Supabase:', item.name, `(${item.stage})`);
  }

  console.log('All pipeline items synced to Supabase database!');
  process.exit(0);
}

syncSeedToDb().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
