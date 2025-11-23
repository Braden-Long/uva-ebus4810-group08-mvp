import random
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import engine, get_db, Base
from models import User, Appointment, UserRole, RiskLevel, AppointmentStatus

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocClock API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing context (using bcrypt instead of SHA256)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic models for API requests/responses
class UserPublic(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterPayload(BaseModel):
    full_name: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole


class AppointmentBase(BaseModel):
    patient_name: str = Field(..., description="Patient full name")
    provider_name: str = Field(..., description="Provider handling the visit")
    appointment_time: datetime = Field(..., description="Appointment start time in ISO format")
    reason: str = Field(..., min_length=3, max_length=180)
    location: str = Field(..., description="Clinic or facility location")
    channel: str = Field(..., description="in-person or virtual")
    status: AppointmentStatus = AppointmentStatus.scheduled
    risk_level: RiskLevel = RiskLevel.none
    notes: Optional[str] = None
    patient_user_id: Optional[str] = Field(
        default=None, description="Foreign key reference for patient user"
    )
    provider_user_id: Optional[str] = Field(
        default=None, description="Foreign key reference for provider user"
    )


class AppointmentCreate(AppointmentBase):
    risk_level: RiskLevel = RiskLevel.none
    status: AppointmentStatus = AppointmentStatus.scheduled


class AppointmentUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    risk_level: Optional[RiskLevel] = None
    notes: Optional[str] = None
    reason: Optional[str] = None
    patient_user_id: Optional[str] = None
    provider_user_id: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: str
    patient_name: str
    provider_name: str
    patient_user_id: Optional[str]
    provider_user_id: Optional[str]
    appointment_time: datetime
    reason: str
    location: str
    channel: str
    status: AppointmentStatus
    risk_level: RiskLevel
    notes: Optional[str]

    class Config:
        from_attributes = True


# Helper functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email (case-insensitive)"""
    return db.query(User).filter(User.email == email.lower()).first()


def bootstrap_demo_data(db: Session):
    """Create demo users and appointments if database is empty"""
    # Check if users already exist
    if db.query(User).count() > 0:
        return

    now = datetime.utcnow()

    # Create demo users
    demo_users = [
        {
            "full_name": "Jordan Carter",
            "email": "jordan@docclock.health",
            "role": UserRole.patient,
            "password": "patient123",
        },
        {
            "full_name": "Ava Mitchell",
            "email": "ava@docclock.health",
            "role": UserRole.patient,
            "password": "patient123",
        },
        {
            "full_name": "Dr. Sarah Mitchell",
            "email": "sarah.mitchell@docclock.health",
            "role": UserRole.provider,
            "password": "provider123",
        },
        {
            "full_name": "Dr. James Cooper",
            "email": "james.cooper@docclock.health",
            "role": UserRole.provider,
            "password": "provider123",
        },
    ]

    user_objects = []
    for user_data in demo_users:
        user = User(
            id=str(uuid4()),
            full_name=user_data["full_name"],
            email=user_data["email"].lower(),
            role=user_data["role"],
            password_hash=hash_password(user_data["password"]),
            created_at=now,
        )
        db.add(user)
        user_objects.append(user)

    db.commit()

    # Create demo appointments
    jordan = get_user_by_email(db, "jordan@docclock.health")
    ava = get_user_by_email(db, "ava@docclock.health")
    sarah = get_user_by_email(db, "sarah.mitchell@docclock.health")
    james = get_user_by_email(db, "james.cooper@docclock.health")

    demo_appointments = [
        {
            "patient": jordan,
            "provider": sarah,
            "appointment_time": now + timedelta(hours=4),
            "reason": "Chronic migraine follow-up",
            "location": "UVA Neurology - Pavilion II",
            "channel": "in-person",
            "status": AppointmentStatus.scheduled,
            "risk": RiskLevel.high,
            "notes": "Missed last two appointments, commute > 1 hr",
        },
        {
            "patient": ava,
            "provider": james,
            "appointment_time": now + timedelta(days=1, hours=2),
            "reason": "Post-op wound check",
            "location": "UVA Surgical Center",
            "channel": "in-person",
            "status": AppointmentStatus.rescheduled,
            "risk": RiskLevel.low,
            "notes": "Confirmed via SMS",
        },
        {
            "patient": jordan,
            "provider": sarah,
            "appointment_time": now + timedelta(days=2, hours=3),
            "reason": "Dermatology consult",
            "location": "UVA Dermatology",
            "channel": "in-person",
            "status": AppointmentStatus.scheduled,
            "risk": RiskLevel.medium,
            "notes": "Transit reliability score low",
        },
    ]

    for appt_data in demo_appointments:
        appointment = Appointment(
            id=str(uuid4()),
            patient_name=appt_data["patient"].full_name,
            provider_name=appt_data["provider"].full_name,
            patient_user_id=appt_data["patient"].id,
            provider_user_id=appt_data["provider"].id,
            appointment_time=appt_data["appointment_time"],
            reason=appt_data["reason"],
            location=appt_data["location"],
            channel=appt_data["channel"],
            status=appt_data["status"],
            risk_level=appt_data["risk"],
            notes=appt_data["notes"],
            created_at=now,
            updated_at=now,
        )
        db.add(appointment)

    db.commit()


# API Routes
@app.on_event("startup")
async def startup_event():
    """Initialize database with demo data on startup"""
    db = next(get_db())
    try:
        bootstrap_demo_data(db)
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Welcome to DocClock API"}


@app.get("/health")
async def health(db: Session = Depends(get_db)):
    return {
        "status": "healthy",
        "appointments_count": db.query(Appointment).count(),
        "users_count": db.query(User).count(),
    }


@app.post("/api/auth/register", response_model=UserPublic, status_code=201)
async def register_user(payload: RegisterPayload, db: Session = Depends(get_db)):
    """Register a new user (patient or provider)"""
    email = payload.email.lower()

    # Check if user already exists
    if get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create new user
    user = User(
        id=str(uuid4()),
        full_name=payload.full_name.strip(),
        email=email,
        role=payload.role,
        password_hash=hash_password(payload.password),
        created_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@app.post("/api/auth/login", response_model=UserPublic)
async def login_user(payload: LoginPayload, db: Session = Depends(get_db)):
    """Authenticate user and return user info"""
    user = get_user_by_email(db, payload.email)

    # Check user exists and role matches
    if not user or user.role != payload.role:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return user


@app.get("/api/users", response_model=List[UserPublic])
async def list_users(role: Optional[UserRole] = None, db: Session = Depends(get_db)):
    """Get list of users, optionally filtered by role"""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.full_name).all()
    return users


@app.get("/api/appointments", response_model=List[AppointmentResponse])
async def list_appointments(
    status: Optional[AppointmentStatus] = None,
    risk: Optional[RiskLevel] = None,
    patient_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List appointments with optional filters"""
    query = db.query(Appointment)

    if status:
        query = query.filter(Appointment.status == status)
    if risk:
        query = query.filter(Appointment.risk_level == risk)
    if patient_id:
        query = query.filter(Appointment.patient_user_id == patient_id)
    if provider_id:
        query = query.filter(Appointment.provider_user_id == provider_id)

    # Sort by appointment time
    appointments = query.order_by(Appointment.appointment_time).all()
    return appointments


@app.get("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """Get a single appointment by ID"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return appointment


@app.post("/api/appointments", response_model=AppointmentResponse, status_code=201)
async def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    """Create a new appointment"""
    appointment_data = payload.model_dump()

    # Validate and link patient user
    if payload.patient_user_id:
        patient = db.query(User).filter(
            User.id == payload.patient_user_id,
            User.role == UserRole.patient
        ).first()
        if not patient:
            raise HTTPException(status_code=400, detail="Patient does not exist")
        appointment_data["patient_name"] = patient.full_name

    # Validate and link provider user
    if payload.provider_user_id:
        provider = db.query(User).filter(
            User.id == payload.provider_user_id,
            User.role == UserRole.provider
        ).first()
        if not provider:
            raise HTTPException(status_code=400, detail="Provider does not exist")
        appointment_data["provider_name"] = provider.full_name
    else:
        # Try to find provider by name
        provider = db.query(User).filter(
            User.role == UserRole.provider,
            User.full_name == payload.provider_name
        ).first()
        if provider:
            appointment_data["provider_user_id"] = provider.id

    # Randomly assign risk level (30% chance of being flagged)
    risk_roll = random.random()
    if risk_roll < 0.10:
        appointment_data["risk_level"] = RiskLevel.high
    elif risk_roll < 0.20:
        appointment_data["risk_level"] = RiskLevel.medium
    elif risk_roll < 0.30:
        appointment_data["risk_level"] = RiskLevel.low
    else:
        appointment_data["risk_level"] = RiskLevel.none

    # Create appointment
    appointment = Appointment(
        id=str(uuid4()),
        **appointment_data,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment


@app.patch("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Get update data (only fields that were provided)
    update_data = payload.model_dump(exclude_unset=True)

    # Validate patient_user_id if provided
    if "patient_user_id" in update_data:
        patient_id = update_data["patient_user_id"]
        if patient_id:
            patient = db.query(User).filter(
                User.id == patient_id,
                User.role == UserRole.patient
            ).first()
            if not patient:
                raise HTTPException(status_code=400, detail="Patient does not exist")
            appointment.patient_name = patient.full_name

    # Validate provider_user_id if provided
    if "provider_user_id" in update_data:
        provider_id = update_data["provider_user_id"]
        if provider_id:
            provider = db.query(User).filter(
                User.id == provider_id,
                User.role == UserRole.provider
            ).first()
            if not provider:
                raise HTTPException(status_code=400, detail="Provider does not exist")
            appointment.provider_name = provider.full_name

    # Update fields
    for field, value in update_data.items():
        setattr(appointment, field, value)

    appointment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(appointment)

    return appointment


@app.delete("/api/appointments/{appointment_id}", status_code=204)
async def delete_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """Delete an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    db.delete(appointment)
    db.commit()

    return None


@app.get("/api/summary")
async def summary(db: Session = Depends(get_db)):
    """Get summary statistics for provider analytics"""
    all_appointments = db.query(Appointment).all()

    total = len(all_appointments)
    scheduled = len([
        a for a in all_appointments
        if a.status in {AppointmentStatus.scheduled, AppointmentStatus.rescheduled}
    ])
    cancelled = len([a for a in all_appointments if a.status == AppointmentStatus.cancelled])
    completed = len([a for a in all_appointments if a.status == AppointmentStatus.completed])

    risk_counts = {
        level.value: len([a for a in all_appointments if a.risk_level == level])
        for level in RiskLevel
    }

    return {
        "total": total,
        "active": scheduled,
        "cancelled": cancelled,
        "completed": completed,
        "risk_breakdown": risk_counts,
    }
