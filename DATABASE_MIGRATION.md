# Database Migration Guide

This guide explains how to set up and test the PostgreSQL database migration from JSON files.

## What Changed

- ✅ Migrated from JSON file storage (`backend/data/`) to PostgreSQL database
- ✅ Added SQLAlchemy ORM for database operations
- ✅ Implemented Alembic for database schema migrations
- ✅ Upgraded password hashing from SHA256 to bcrypt
- ✅ Using Supabase PostgreSQL for production database

---

## Option 1: Quick Test with Supabase (Recommended)

### 1. Create Free Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up (free tier - no credit card required)
3. Create a new project:
   - Project name: `docclock`
   - Database password: (choose a strong password - save it!)
   - Region: Choose closest to you
   - Wait 2-3 minutes for database to provision

### 2. Get Database Connection String

1. In Supabase dashboard, go to **Project Settings** (gear icon bottom left)
2. Click **Database** in the sidebar
3. Scroll to **Connection string** section
4. Copy the **URI** format (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you chose in step 1

### 3. Set Up Environment Variable

In the `backend/` directory:

```bash
# Create .env file
cp .env.example .env

# Edit .env and set your Supabase URL
# Replace the DATABASE_URL line with your Supabase connection string
```

### 4. Install Dependencies

```bash
cd backend

# Activate your virtual environment
source venv/bin/activate  # Mac/Linux
# OR: venv\Scripts\activate  # Windows

# Install new dependencies
pip install -r requirements.txt
```

### 5. Run Alembic Migration

```bash
# Generate initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration to database
alembic upgrade head
```

### 6. Start the Backend

```bash
uvicorn main:app --reload
```

The backend will:
- Create tables in Supabase PostgreSQL
- Seed demo users and appointments
- Be ready to use!

### 7. Test It Works

Open http://localhost:8000/health in your browser. You should see:

```json
{
  "status": "healthy",
  "appointments_count": 3,
  "users_count": 4
}
```

### 8. View Data in Supabase

1. Go to Supabase dashboard
2. Click **Table Editor** in sidebar
3. You should see `users` and `appointments` tables with demo data!

---

## Option 2: Local PostgreSQL (For Development)

### 1. Install PostgreSQL

**Mac (with Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
Download and install from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql shell:
CREATE DATABASE docclock;
CREATE USER docclock_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE docclock TO docclock_user;
\q
```

### 3. Set Environment Variable

```bash
cd backend
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=postgresql://docclock_user:your_password@localhost:5432/docclock
```

### 4. Continue with Steps 4-7 from Option 1

---

## Option 3: Docker PostgreSQL (Easiest for Local)

### 1. Install Docker

Download from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

### 2. Start PostgreSQL Container

```bash
# Run from project root
docker run --name docclock-postgres \
  -e POSTGRES_DB=docclock \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Set Environment Variable

```bash
cd backend
cp .env.example .env

# The default in .env.example should work:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/docclock
```

### 4. Continue with Steps 4-7 from Option 1

### Stop Docker Container

```bash
docker stop docclock-postgres
docker rm docclock-postgres
```

---

## Verify Migration Worked

### 1. Check Database Connection

```bash
cd backend
python -c "from database import engine; print(engine.url)"
```

Should print your DATABASE_URL.

### 2. Check Tables Exist

```bash
cd backend
alembic current
```

Should show the current migration revision.

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# List users (should be empty initially, populated on first API start)
curl http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jordan@docclock.health","password":"patient123","role":"patient"}'
```

### 4. Test Account Creation

Try the frontend account creation again - it should work now!

---

## Alembic Commands Reference

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "Description of changes"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show current migration
alembic current

# Show migration history
alembic history

# Rollback all migrations
alembic downgrade base
```

---

## Troubleshooting

### Error: "could not connect to server"

- Check PostgreSQL is running: `pg_isready` (local) or check Supabase dashboard
- Verify DATABASE_URL is correct in `.env`
- Check firewall isn't blocking port 5432

### Error: "relation 'users' does not exist"

- Run migrations: `alembic upgrade head`
- Check migration files exist in `backend/alembic/versions/`

### Error: "ModuleNotFoundError: No module named 'passlib'"

- Install dependencies: `pip install -r requirements.txt`
- Make sure virtual environment is activated

### Password verification fails for demo accounts

- The old JSON files used SHA256, new database uses bcrypt
- Demo accounts are re-created with bcrypt on first startup
- Old JSON passwords won't work with new system

### Error: "SSL connection required"

For Supabase, add `?sslmode=require` to your DATABASE_URL:
```
postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require
```

---

## Next Steps

After successful migration:

1. ✅ Test all API endpoints work (login, register, create appointment, etc.)
2. ✅ Test frontend connects and works with new backend
3. ✅ Database migration is complete and merged to main
4. 🔜 Ready for deployment - see DEPLOYMENT_PLAN.md

---

## Production Deployment

The database is production-ready:
- Using Supabase PostgreSQL (free tier: 500MB, never expires)
- Session pooler for serverless compatibility
- Automatic backups included
- All migrations applied

See **DEPLOYMENT_PLAN.md** for full deployment guide to Netlify + Render + Supabase.
