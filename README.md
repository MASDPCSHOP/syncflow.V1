# SyncFlow Auth Backend

A small Node.js + Express + PostgreSQL API that replaces SyncFlow's old
`localStorage`-based login/registration with real, centralized accounts.
Once this is running, an account created in one browser works in every
browser and device.

This backend handles **authentication only** (register, login, logout,
profile, password reset). SyncFlow's business data (products, sales,
expenses, etc.) is unchanged and still stored locally per browser, per your
original instructions — only login was broken across browsers, so only login
was replaced.

## What's new

- Real user accounts stored in PostgreSQL instead of `localStorage`
- Passwords hashed with bcrypt (never stored in plain text)
- JWT-based sessions
- Server-side validation: duplicate username/email checks, password
  strength requirements
- Rate limiting on auth endpoints to slow down brute-force attempts
- Password reset structure ready to go (just needs an email provider
  plugged in — see below)

## 1. Install PostgreSQL (pick one)

You don't have a database yet, so pick one of these managed free/cheap
options — no server admin required:

- **Render** — Dashboard → New → PostgreSQL → copy the "External Database URL"
- **Railway** — New Project → Provision PostgreSQL → copy `DATABASE_URL` from Variables
- **Supabase** — New Project → Settings → Database → copy the connection string
- **Neon** — New Project → copy the connection string shown on the dashboard

Any of these gives you a `DATABASE_URL` that looks like:
```
postgresql://user:password@host:5432/dbname
```

## 2. Set up the database schema

With `psql` installed locally, or the "SQL Editor" in your provider's
dashboard, run the script in `sql/schema.sql`:

```bash
psql "$DATABASE_URL" -f sql/schema.sql
```

This creates the `users`, `refresh_tokens`, and `password_reset_tokens`
tables.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — from step 1
- `DB_SSL` — `true` for managed cloud providers (Render/Railway/Supabase/Neon all need this)
- `JWT_SECRET` — generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- `CORS_ORIGIN` — the URL(s) your frontend is served from, comma-separated (e.g. `https://yourapp.com`)

## 4. Install and run

```bash
npm install
npm start        # production
npm run dev       # auto-restarts on file changes
```

The API starts on `http://localhost:4000` by default. Check it's alive:

```bash
curl http://localhost:4000/health
```

## API Reference

Base path: `/api/auth`

| Method | Path                | Auth required | Body                                | Description |
|--------|----------------------|:--:|--------------------------------------|--------------|
| POST   | `/register`          | No | `{ "username", "password", "email"? }` | Create an account |
| POST   | `/login`              | No | `{ "username", "password" }`         | Log in, returns a JWT |
| POST   | `/logout`             | Yes | —                                    | Logout (client discards token) |
| GET    | `/profile`            | Yes | —                                    | Get the logged-in user's info |
| POST   | `/forgot-password`    | No | `{ "email" }`                        | Request a password reset (see note below) |
| POST   | `/reset-password`     | No | `{ "token", "newPassword" }`         | Complete a password reset |

Authenticated requests send the JWT from login/register as:
```
Authorization: Bearer <token>
```

**Example — register:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"Acme Auto Parts","password":"secure123"}'
```

**Example — login:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Acme Auto Parts","password":"secure123"}'
```

Response shape (register/login):
```json
{ "ok": true, "token": "<jwt>", "user": { "id": "...", "username": "...", "email": null } }
```

### Note on "Forgot Password"

The original UI only collects a company name and password — no email — so
there's nothing to send a reset link to yet. The `/forgot-password` and
`/reset-password` endpoints and their database tables are fully built and
ready; they just need:
1. An optional email field added at registration (backend already accepts it)
2. An email-sending provider (e.g. SendGrid, AWS SES, Postmark) wired into
   `controllers/authController.js` where the `// TODO: hook up an email provider`
   comment is

## 5. Deploying to the cloud

Since you're deploying to Azure/AWS/etc., the general pattern for any of
them:

1. Push this `backend/` folder to its own Git repo (or a subfolder of your
   project repo).
2. Create a new Web Service pointing at that repo:
   - **Render**: New → Web Service → connect repo → Build command `npm install`, Start command `npm start`
   - **Railway**: New Project → Deploy from GitHub → auto-detects Node
   - **Azure App Service**: create a Node 18+ Linux App Service, deploy via GitHub Actions or `az webapp up`
   - **AWS**: Elastic Beanstalk (simplest) or ECS/Fargate for more control
3. Set the same environment variables from `.env` in that platform's
   dashboard (never commit `.env` itself).
4. Set `CORS_ORIGIN` to the exact URL where `index.html` is hosted.
5. Once deployed, update `API_BASE_URL` in the frontend (`index.html`,
   near the top of the `<script>` block) to your backend's public URL,
   e.g. `https://syncflow-api.onrender.com/api/auth`.

## Project structure

```
backend/
  server.js              # entry point, express app setup
  package.json
  .env.example
  config/
    db.js                # PostgreSQL connection pool
  controllers/
    authController.js    # register/login/logout/profile/reset logic
  middleware/
    auth.js               # JWT verification for protected routes
  models/
    userModel.js          # all user-related SQL queries
  routes/
    authRoutes.js
  utils/
    validators.js         # username/email/password validation
  sql/
    schema.sql            # run once to create tables
```

## Security notes

- Passwords are hashed with bcrypt (12 rounds) — plain text is never stored
  or logged.
- All SQL queries use parameterized placeholders (`$1`, `$2`, ...) — no
  string concatenation of user input into SQL, which is what prevents SQL
  injection.
- JWTs are signed with `JWT_SECRET` and expire (`JWT_EXPIRES_IN`, default 7
  days).
- Auth endpoints are rate-limited (20 requests / 15 min per IP) to slow
  brute-force attempts.
- `helmet` sets sane default security headers.
- Forgot-password responses are identical whether or not the email exists,
  so the endpoint can't be used to enumerate registered emails.
