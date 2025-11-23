# Database Migration: Remove email_verified Column

## Problem
The `email_verified` column was removed from the User model in the code, but still exists in the Supabase database with a NOT NULL constraint. This causes account creation to fail with:
```
null value in column "email_verified" of relation "users" violates not-null constraint
```

## Solution
Run the Alembic migration to drop the `email_verified` column from the database.

## Steps to Apply Migration

### Option 1: Using Alembic (Recommended)
If you have the backend Python environment set up:

```bash
cd backend
alembic upgrade head
```

### Option 2: Direct SQL in Supabase
If you prefer to run the SQL directly in Supabase SQL Editor:

```sql
-- Remove the email_verified column from the users table
ALTER TABLE users DROP COLUMN email_verified;
```

### Option 3: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Run the following SQL:
   ```sql
   ALTER TABLE users DROP COLUMN email_verified;
   ```
4. Click "Run"

## Verification
After running the migration, try creating a new account. The registration should work without the `email_verified` error.

## Rollback (if needed)
If you need to rollback this migration:

```bash
cd backend
alembic downgrade -1
```

Or run this SQL:
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
```
