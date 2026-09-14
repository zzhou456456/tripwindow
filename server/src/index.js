const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';

const app = express();
app.use(cors());
app.use(express.json());

// Logs every request so Render's log view doubles as a debugging trail.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Missing or invalid token' });
  }
}

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.get('/', (_req, res) =>
  res.json({
    name: 'TripWindow API',
    storage: db.kind,
    endpoints: [
      'GET  /health',
      'POST /auth/register {email, password}',
      'POST /auth/login {email, password}',
      'GET  /trips (auth)',
      'POST /trips (auth) {destination, lat, lon, start_date, end_date, flexible_days, note, is_public}',
      'DELETE /trips/:id (auth)',
      'GET  /feed',
      'GET  /weather?lat=..&lon=..',
      'POST /events {name, props}',
      'GET  /events/stats',
    ],
  })
);

app.get('/health', (_req, res) => res.json({ ok: true, storage: db.kind }));

// ---- Auth ----
app.post('/auth/register', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and a password of 6+ characters are required' });
  }
  try {
    const user = await db.createUser(email.toLowerCase().trim(), await bcrypt.hash(password, 10));
    res.status(201).json({ token: jwt.sign(user, JWT_SECRET, { expiresIn: '7d' }), user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const row = email && (await db.findUserByEmail(email.toLowerCase().trim()));
  if (!row || !(await bcrypt.compare(password || '', row.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  const user = { id: row.id, email: row.email };
  res.json({ token: jwt.sign(user, JWT_SECRET, { expiresIn: '7d' }), user });
}));

// ---- Trips (private to each user) ----
app.get('/trips', auth, wrap(async (req, res) => res.json(await db.listTrips(req.user.id))));

app.post('/trips', auth, wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.destination || !b.start_date || !b.end_date) {
    return res.status(400).json({ error: 'destination, start_date and end_date are required' });
  }
  if (b.end_date < b.start_date) {
    return res.status(400).json({ error: 'end_date must be on or after start_date' });
  }
  const trip = await db.createTrip(req.user.id, {
    destination: b.destination,
    lat: b.lat ?? null,
    lon: b.lon ?? null,
    start_date: b.start_date,
    end_date: b.end_date,
    flexible_days: Number(b.flexible_days) || 0,
    note: b.note || '',
    is_public: Boolean(b.is_public),
  });
  res.status(201).json(trip);
}));

app.delete('/trips/:id', auth, wrap(async (req, res) => {
  const ok = await db.deleteTrip(req.user.id, Number(req.params.id));
  ok ? res.status(204).end() : res.status(404).json({ error: 'Trip not found' });
}));

// ---- Shared feed: public trips from all users ----
app.get('/feed', wrap(async (_req, res) => res.json(await db.publicFeed())));

// ---- Third-party data: Open-Meteo 7-day forecast (no API key needed) ----
app.get('/weather', wrap(async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7';
  const r = await fetch(url);
  if (!r.ok) return res.status(502).json({ error: `Open-Meteo returned ${r.status}` });
  const { daily } = await r.json();
  res.json(
    daily.time.map((date, i) => ({
      date,
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
      rain: daily.precipitation_probability_max[i],
    }))
  );
}));

// ---- Activity analytics ----
app.post('/events', wrap(async (req, res) => {
  const { name, props } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  let userId = null;
  try {
    userId = jwt.verify((req.headers.authorization || '').replace(/^Bearer /, ''), JWT_SECRET).id;
  } catch {}
  await db.logEvent(userId, name, props || {});
  res.status(202).json({ ok: true });
}));

app.get('/events/stats', wrap(async (_req, res) => res.json(await db.eventStats())));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

db.init().then(() => {
  app.listen(PORT, () => console.log(`TripWindow API on :${PORT} (storage: ${db.kind})`));
});
