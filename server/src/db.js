// Storage layer. Uses Postgres when DATABASE_URL is set (Render), otherwise an
// in-memory store so the server runs locally with zero setup.
const { Pool, types } = require('pg');

// Keep DATE columns as 'YYYY-MM-DD' strings; the default parser builds a local-midnight
// JS Date, which serializes with a timezone offset and can show up as the previous day.
types.setTypeParser(1082, (v) => v);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  flexible_days INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name TEXT NOT NULL,
  props JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);`;

function pgStore(pool) {
  const q = (text, params) => pool.query(text, params).then((r) => r.rows);
  return {
    kind: 'postgres',
    init: () => pool.query(SCHEMA),
    createUser: async (email, hash) =>
      (await q('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email, hash]))[0],
    findUserByEmail: async (email) => (await q('SELECT * FROM users WHERE email = $1', [email]))[0],
    listTrips: (userId) => q('SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date', [userId]),
    createTrip: async (userId, t) =>
      (await q(
        `INSERT INTO trips (user_id, destination, lat, lon, start_date, end_date, flexible_days, note, is_public)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [userId, t.destination, t.lat, t.lon, t.start_date, t.end_date, t.flexible_days, t.note, t.is_public]
      ))[0],
    deleteTrip: async (userId, id) =>
      (await q('DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).length > 0,
    publicFeed: () =>
      q(`SELECT t.id, t.destination, t.start_date, t.end_date, t.flexible_days, t.note, t.created_at,
                split_part(u.email, '@', 1) AS author
         FROM trips t JOIN users u ON u.id = t.user_id
         WHERE t.is_public ORDER BY t.created_at DESC LIMIT 50`),
    logEvent: (userId, name, props) =>
      q('INSERT INTO events (user_id, name, props) VALUES ($1, $2, $3)', [userId, name, props]),
    eventStats: () => q('SELECT name, COUNT(*)::int AS count FROM events GROUP BY name ORDER BY count DESC'),
  };
}

function memoryStore() {
  const users = [];
  const trips = [];
  const events = [];
  let nextId = 1;
  return {
    kind: 'memory',
    init: async () => {},
    createUser: async (email, hash) => {
      if (users.some((u) => u.email === email)) {
        const err = new Error('duplicate');
        err.code = '23505';
        throw err;
      }
      const u = { id: nextId++, email, password_hash: hash };
      users.push(u);
      return { id: u.id, email };
    },
    findUserByEmail: async (email) => users.find((u) => u.email === email),
    listTrips: async (userId) => trips.filter((t) => t.user_id === userId),
    createTrip: async (userId, t) => {
      const trip = { id: nextId++, user_id: userId, ...t, created_at: new Date().toISOString() };
      trips.push(trip);
      return trip;
    },
    deleteTrip: async (userId, id) => {
      const i = trips.findIndex((t) => t.id === id && t.user_id === userId);
      if (i === -1) return false;
      trips.splice(i, 1);
      return true;
    },
    publicFeed: async () =>
      trips
        .filter((t) => t.is_public)
        .map(({ id, destination, start_date, end_date, flexible_days, note, created_at, user_id }) => ({
          id, destination, start_date, end_date, flexible_days, note, created_at,
          author: users.find((u) => u.id === user_id).email.split('@')[0],
        }))
        .reverse(),
    logEvent: async (userId, name, props) => {
      events.push({ user_id: userId, name, props, created_at: new Date().toISOString() });
    },
    eventStats: async () => {
      const counts = {};
      events.forEach((e) => (counts[e.name] = (counts[e.name] || 0) + 1));
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
  };
}

module.exports = process.env.DATABASE_URL
  ? pgStore(new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }))
  : memoryStore();
