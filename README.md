# Cirrh0

Helps people read their liver lab reports. Upload a report, check the values it extracts, and get guideline scores (FIB-4, APRI, ALBI), an estimate from a research model, and your results over time.

**Educational only.** This is a college research project, not a medical device. Nothing it shows is a diagnosis.

## Parts

| Folder | What it is | Stack |
|---|---|---|
| `cirrh0/` | Web app | React, TypeScript, Tailwind |
| `cirrh0-backend/` | HTTP API, accounts, data | Express, **PostgreSQL**, Prisma |
| `cirrh0-prediction-model/` | Report extraction, stage model, image detection | Flask, CatBoost |

## Run it locally

You need Node 22.18 or newer, Python 3.14 (for the model service) and PostgreSQL 16 (Docker is the easy way).

```bash
# 1. Database
docker compose up -d                      # PostgreSQL 16 on localhost:5432, plus a cirrh0_test database

# 2. API
cd cirrh0-backend
cp .env.example .env                      # then fill in DATABASE_URL, SECRET_KEY and the ML URLs
npm install                               # also generates the Prisma client
npm run db:migrate                        # creates the tables
npm run dev                               # http://localhost:8000, check /healthz

# 3. Model service (see cirrh0-prediction-model/README.md)
cd ../cirrh0-prediction-model
pip install -r requirements.txt
PORT=3005 python app.py

# 4. Web app
cd ../cirrh0
cp .env.example .env
npm install && npm start                  # http://localhost:3000
```

Without Docker, point `DATABASE_URL` at any PostgreSQL 14 or newer.

## Database

The schema is `cirrh0-backend/prisma/schema.prisma`, applied by the migrations in `cirrh0-backend/prisma/migrations`.

```bash
npm run db:migrate                         # apply pending migrations (use this in deployments)
npm run db:migrate:dev -- --name add_x     # after editing schema.prisma: create and apply a migration
npm run db:generate                        # regenerate the client (also runs on npm install)
```

- Every record has a UUID `id`. Ownership is the `user_id` foreign key, and deleting a user deletes their analyses.
- Rules the schema cannot express (stage 1 to 4, plausible ages, lower-case email) are CHECK constraints written into the first migration.
- PostgreSQL has no TTL index, so the API deletes expired report drafts when it starts and then hourly.
- CI fails if `schema.prisma` has a change that no migration covers.

### Moving data from the old MongoDB

If you have data in the old database, copy it over once. The script reads MongoDB, writes PostgreSQL, and keeps people's passwords.

```bash
cd cirrh0-backend
npm install --no-save mongodb
MONGO_URI="mongodb+srv://..." DATABASE_URL="postgresql://..." node scripts/migrate-from-mongo.js           # dry run: prints counts only
MONGO_URI="mongodb+srv://..." DATABASE_URL="postgresql://..." node scripts/migrate-from-mongo.js --apply   # writes, in one transaction
```

It refuses to write into a database that already has users, skips drafts and anything without an owner (and says how many), and computes guideline scores for old reports. Everyone has to log in again, because sessions are not migrated. Record ids change from MongoDB ObjectIds to UUIDs, so old links to a report stop working.

## Tests

```bash
cd cirrh0-backend && npm test              # unit tests; the integration tests skip without a database
TEST_DATABASE_URL=postgresql://cirrh0:cirrh0@localhost:5432/cirrh0_test npm test   # also runs them against PostgreSQL
cd cirrh0 && npm test -- --watchAll=false
cd cirrh0-prediction-model && python -m pytest
```

The integration tests **delete all data** in `TEST_DATABASE_URL` and refuse to run unless the database name contains `test`. Apply migrations to it first (`DATABASE_URL=<that url> npm run db:migrate`).

## Deploying the API

- Run `npm run db:migrate` before starting a new version.
- Set `DATABASE_URL`, `SECRET_KEY` (32+ random characters), `CLIENT_ORIGINS`, `NODE_ENV=production` and `ML_SERVICE_TOKEN`.
- Behind a load balancer set `TRUST_PROXY=1`; otherwise every user shares one login rate limit.
- Keep the model service on a private network, and back up the PostgreSQL database.
- `/healthz` returns 200 when the database answers, for load balancers.

More detail on every setting is in `cirrh0-backend/.env.example`. The audit and the list of what is still open are in [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md).
