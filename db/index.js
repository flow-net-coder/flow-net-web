const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema');

let db = null;
let client = null;

function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!db) {
    try {
      client = postgres(connectionString, { prepare: false, ssl: 'require' });
      db = drizzle(client, { schema });
    } catch (e) {
      console.error('[Drizzle] Connection error:', e.message || e);
      return null;
    }
  }
  return db;
}

module.exports = {
  getDb,
  schema,
};
