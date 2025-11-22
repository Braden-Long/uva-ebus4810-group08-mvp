import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment variable
# For Supabase, this will look like: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/docclock"  # Default for local development
)

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, echo=False)

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency to get database session
def get_db():
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session when the request is complete.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
