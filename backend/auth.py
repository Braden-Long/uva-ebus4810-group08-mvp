"""
Authentication utilities for JWT token handling
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import HTTPException, Header
from sqlalchemy.orm import Session

from models import User

# Secret key for JWT - should be in environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days for MVP


def create_access_token(user_id: str, email: str, role: str) -> str:
    """
    Create a JWT access token for a user

    Args:
        user_id: User's unique identifier
        email: User's email address
        role: User's role (patient or provider)

    Returns:
        JWT token as a string
    """
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token

    Args:
        token: JWT token string

    Returns:
        Dictionary with user data from token

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to verify JWT token and return user data

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        Dictionary with user data from token

    Raises:
        HTTPException: If authorization is missing or invalid
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Use: Bearer <token>")

    token = parts[1]
    payload = verify_token(token)

    return payload
