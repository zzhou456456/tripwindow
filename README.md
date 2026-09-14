# TripWindow

A small travel companion app for CS 4261 / CS 8803 MAS — First Programming Assignment.
It grew out of my First Interview Assignment, where travelers described booking as fitting a trip
into an uncertain calendar ("I can go the week of Dec 20, give or take two days"). TripWindow lets
you save trips as a *date window with flexibility*, see the weather at the destination, and share
trips publicly with other users.

**Repo:** https://github.com/zzhou456456/tripwindow
**API:** https://tripwindow-api.onrender.com (free Render instance — the first request after ~15 min idle takes up to a minute while it wakes up)

## Architecture

```
iPhone (Expo Go)  ──JSON/HTTPS──▶  Express API on Render  ──▶  Postgres (Render)
   │ expo-location                     │
   │ expo-secure-store (JWT)           └──▶  Open-Meteo forecast API (3rd party)
```

| Folder | What |
|---|---|
| `app/` | Expo (React Native, SDK 57, expo-router) app. Started from the `create-expo-app` default sample. |
| `server/` | Express REST API. Postgres when `DATABASE_URL` is set, in-memory otherwise. |
| `render.yaml` | Render Blueprint: web service + free Postgres. |
| `docs/AI_LOG.md` | Log of how I directed and used an AI assistant. |

## Features

- **Accounts & auth** — register/login, bcrypt-hashed passwords, JWT stored in the iOS Keychain via SecureStore; trips are private to their owner.
- **Trips** — destination, date window, flexible ±days, note, public toggle (form input).
- **Device location** — "Use my location" fills the destination with reverse-geocoded coordinates.
- **Third-party data** — 7-day forecast from Open-Meteo, proxied through the API.
- **User content shown to others** — public trips appear in every user's Feed.
- **Activity analytics** — the app posts events (`app_open`, `trip_created`, …); `GET /events/stats` aggregates them.

## Run it

### Backend (local)

```bash
cd server
npm install
npm run dev        # http://localhost:3000, in-memory storage
```

### App on an iPhone

1. Install **Expo Go** from the App Store.
2. Point the app at an API. Create `app/.env`:
   ```
   EXPO_PUBLIC_API_URL=https://<your-render-service>.onrender.com
   ```
   For a local server use your Mac's LAN IP (`ipconfig getifaddr en0`), e.g. `http://192.168.1.23:3000` — phone and Mac on the same Wi-Fi.
3. Start the dev server and scan the QR code with the iPhone Camera:
   ```bash
   cd app
   npm install
   npx expo start
   ```

### Deploy the backend to Render

Render dashboard → **New → Blueprint** → select this repo. `render.yaml` creates the web service and a
free Postgres database and generates `JWT_SECRET`. Health check: `GET /health`.

## API

| Method | Path | Auth | Body / query |
|---|---|---|---|
| GET | `/health` | – | – |
| POST | `/auth/register` | – | `{email, password}` → `{token, user}` |
| POST | `/auth/login` | – | `{email, password}` → `{token, user}` |
| GET | `/trips` | Bearer | – |
| POST | `/trips` | Bearer | `{destination, lat?, lon?, start_date, end_date, flexible_days?, note?, is_public?}` |
| DELETE | `/trips/:id` | Bearer | – |
| GET | `/feed` | – | public trips from all users |
| GET | `/weather` | – | `?lat=&lon=` → 7 days of `{date, max, min, rain}` |
| POST | `/events` | optional | `{name, props}` |
| GET | `/events/stats` | – | counts per event name |

## Contributing (partner workflow)

1. Fork this repo, clone your fork.
2. `git checkout -b <your-name>/<change>`
3. Make the change, run the app on your device, commit.
4. Push and open a Pull Request against `zzhou456456/tripwindow:main`.
5. I review, merge, pull, and run it on my iPhone.
