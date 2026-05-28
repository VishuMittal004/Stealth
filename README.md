# Personal AI Fitness & Diet Coach

Mobile-first full-stack app for a single user with PIN access, MongoDB storage, Indian/desi meal analysis, home workout planning, progress tracking, and a strict AI coach powered server-side by OpenRouter.

## Stack

- Client: React + Vite
- Server: Node.js + Express
- Database: MongoDB through `MONGO_URI`
- AI: OpenRouter chat completions, defaulting to `openrouter/free`
- Auth: 4-digit PIN stored as a bcrypt hash, JWT session token in the browser

## Setup

1. Copy `.env.example` to `server/.env` or root `.env` and fill the values.
2. Install dependencies:

```powershell
npm.cmd run install:all
```

3. Start both apps:

```powershell
npm.cmd run dev
```

Client runs at `http://localhost:5173`. Server runs at `http://localhost:5000`.

## Environment

```env
MONGO_URI=your_mongodb_connection_string
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=Personal AI Fitness Coach
PORT=5000
JWT_SECRET=your_jwt_secret_for_pin_sessions
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```

All OpenRouter calls happen in `server/services/openrouter.js`. The frontend never receives the API key. AI text is stripped of emojis before it is returned.

For deployment, put the server variables on Render. Put `VITE_API_URL` on Vercel as your Render API URL, for example:

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

Also set `CLIENT_ORIGIN` on Render to your Vercel URL so CORS allows the frontend.

## Main API Routes

- `POST /api/setup`
- `POST /api/auth/verify-pin`
- `GET/PATCH /api/profile`
- `POST /api/meals/analyse`
- `POST /api/meals/save`
- `DELETE /api/meals/:id`
- `GET /api/meals/today`
- `GET /api/meals/suggestions`
- `POST /api/workout/log`
- `GET /api/workout/today-plan`
- `POST /api/workout/generate-plan`
- `GET /api/logs/today`
- `PATCH /api/logs/today`
- `GET /api/logs/:date`
- `GET /api/logs/week`
- `POST /api/chat`
- `GET /api/chat/history`
- `GET /api/progress/stats`
- `GET /api/progress/weekly-report`
- `POST /api/progress/photos`
- `POST /api/recalibrate`
- `POST /api/water/log`
- `POST /api/steps/log` — body `{ steps: 1000 }` to add, or `{ count: 10000 }` to set today's total

## Notes

The server includes deterministic fallbacks for profile targets, meal estimates, workout plans, chat, and reports if OpenRouter is unavailable during local development. MongoDB is still required because every production screen reads from the API.
