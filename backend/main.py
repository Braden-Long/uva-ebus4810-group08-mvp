import json
import random
from datetime import datetime, timedelta
from enum import Enum
from hashlib import sha256
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"
APPOINTMENTS_FILE = DATA_DIR / "appointments.json"

app = FastAPI(title="DocClock API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserRole(str, Enum):
    patient = "patient"
    provider = "provider"


class RiskLevel(str, Enum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"


class AppointmentStatus(str, Enum):
    scheduled = "Scheduled"
    rescheduled = "Rescheduled"
    checked_in = "CheckedIn"
    completed = "Completed"
    cancelled = "Cancelled"


class UserRecord(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    password_hash: str
    created_at: datetime

    def public(self) -> "UserPublic":
        return UserPublic(
            id=self.id,
            full_name=self.full_name,
            email=self.email,
            role=self.role,
            created_at=self.created_at,
        )


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


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


class Appointment(AppointmentBase):
    id: str


users_store: Dict[str, UserRecord] = {}
appointments_store: Dict[str, Appointment] = {}


def hash_password(password: str) -> str:
    return sha256(password.encode("utf-8")).hexdigest()


def save_users() -> None:
    USERS_FILE.write_text(
        json.dumps([user.model_dump(mode="json") for user in users_store.values()], indent=2),
        encoding="utf-8",
    )


def load_users() -> None:
    users_store.clear()
    if not USERS_FILE.exists():
        return
    data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    for record in data:
        record["created_at"] = datetime.fromisoformat(record["created_at"])
        users_store[record["id"]] = UserRecord(**record)


def bootstrap_users() -> None:
    load_users()
    if users_store:
        return
    now = datetime.utcnow()
    sample_users = [
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
            "full_name": "Dr. Emilia Wong",
            "email": "emilia.wong@docclock.health",
            "role": UserRole.provider,
            "password": "provider123",
        },
        {
            "full_name": "Dr. Rishi Patel",
            "email": "rishi.patel@docclock.health",
            "role": UserRole.provider,
            "password": "provider123",
        },
    ]
    for sample in sample_users:
        user = UserRecord(
            id=str(uuid4()),
            full_name=sample["full_name"],
            email=sample["email"],
            role=sample["role"],
            password_hash=hash_password(sample["password"]),
            created_at=now,
        )
        users_store[user.id] = user
    save_users()


def save_appointments() -> None:
    APPOINTMENTS_FILE.write_text(
        json.dumps([appt.model_dump(mode="json") for appt in appointments_store.values()], indent=2),
        encoding="utf-8",
    )


def load_appointments() -> None:
    appointments_store.clear()
    if not APPOINTMENTS_FILE.exists():
        return
    data = json.loads(APPOINTMENTS_FILE.read_text(encoding="utf-8"))
    for record in data:
        dt = datetime.fromisoformat(record["appointment_time"])
        # Remove timezone info to keep all datetimes naive
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        record["appointment_time"] = dt
        appointments_store[record["id"]] = Appointment(**record)


def user_by_email(email: str) -> Optional[UserRecord]:
    target = email.lower()
    return next((user for user in users_store.values() if user.email.lower() == target), None)


def seed_appointments() -> None:
    now = datetime.utcnow()
    sample_data = [
        {
            "patient_email": "jordan@docclock.health",
            "provider_email": "emilia.wong@docclock.health",
            "appointment_time": now + timedelta(hours=4),
            "reason": "Chronic migraine follow-up",
            "location": "UVA Neurology - Pavilion II",
            "channel": "in-person",
            "status": AppointmentStatus.scheduled,
            "risk": RiskLevel.high,
            "notes": "Missed last two appointments, commute > 1 hr",
        },
        {
            "patient_email": "ava@docclock.health",
            "provider_email": "rishi.patel@docclock.health",
            "appointment_time": now + timedelta(days=1, hours=2),
            "reason": "Post-op wound check",
            "location": "UVA Surgical Center",
            "channel": "in-person",
            "status": AppointmentStatus.rescheduled,
            "risk": RiskLevel.low,
            "notes": "Confirmed via SMS",
        },
        {
            "patient_email": "jordan@docclock.health",
            "provider_email": "emilia.wong@docclock.health",
            "appointment_time": now + timedelta(days=2, hours=3),
            "reason": "Dermatology consult",
            "location": "UVA Dermatology",
            "channel": "in-person",
            "status": AppointmentStatus.scheduled,
            "risk": RiskLevel.medium,
            "notes": "Transit reliability score low",
        },
    ]
    for sample in sample_data:
        patient = user_by_email(sample["patient_email"])
        provider = user_by_email(sample["provider_email"])
        appointment = Appointment(
            id=str(uuid4()),
            patient_name=patient.full_name if patient else sample["patient_email"],
            provider_name=provider.full_name if provider else sample["provider_email"],
            appointment_time=sample["appointment_time"],
            reason=sample["reason"],
            location=sample["location"],
            channel=sample["channel"],
            status=sample["status"],
            risk_level=sample["risk"],
            notes=sample["notes"],
            patient_user_id=patient.id if patient else None,
            provider_user_id=provider.id if provider else None,
        )
        appointments_store[appointment.id] = appointment
    save_appointments()


def bootstrap_appointments() -> None:
    load_appointments()
    if appointments_store:
        return
    seed_appointments()


bootstrap_users()
bootstrap_appointments()


@app.get("/")
async def root():
    return {"message": "Welcome to DocClock API"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "appointments_cached": len(appointments_store),
        "users_cached": len(users_store),
    }


@app.post("/api/auth/register", response_model=UserPublic, status_code=201)
async def register_user(payload: RegisterPayload):
    email = payload.email.lower()
    if user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = UserRecord(
        id=str(uuid4()),
        full_name=payload.full_name.strip(),
        email=email,
        role=payload.role,
        password_hash=hash_password(payload.password),
        created_at=datetime.utcnow(),
    )
    users_store[user.id] = user
    save_users()
    return user.public()


@app.post("/api/auth/login", response_model=UserPublic)
async def login_user(payload: LoginPayload):
    user = user_by_email(payload.email)
    if not user or user.role != payload.role:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user.public()


@app.get("/api/appointments", response_model=List[Appointment])
async def list_appointments(
    status: Optional[AppointmentStatus] = None,
    risk: Optional[RiskLevel] = None,
    patient_id: Optional[str] = None,
    provider_id: Optional[str] = None,
):
    results = list(appointments_store.values())
    if status:
        results = [appt for appt in results if appt.status == status]
    if risk:
        results = [appt for appt in results if appt.risk_level == risk]
    if patient_id:
        results = [appt for appt in results if appt.patient_user_id == patient_id]
    if provider_id:
        results = [appt for appt in results if appt.provider_user_id == provider_id]
    
    # Sort safely by converting all datetimes to naive if needed
    def safe_sort_key(appt):
        dt = appt.appointment_time
        if dt.tzinfo is not None:
            return dt.replace(tzinfo=None)
        return dt
    
    return sorted(results, key=safe_sort_key)


@app.get("/api/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str):
    appointment = appointments_store.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def assert_user_exists(user_id: str, expected_role: UserRole) -> None:
    user = users_store.get(user_id)
    if not user or user.role != expected_role:
        raise HTTPException(status_code=400, detail=f"{expected_role.value.title()} does not exist")


@app.post("/api/appointments", response_model=Appointment, status_code=201)
async def create_appointment(payload: AppointmentCreate):
    appointment_data = payload.model_dump()
    
    if payload.patient_user_id:
        assert_user_exists(payload.patient_user_id, UserRole.patient)
        patient = users_store[payload.patient_user_id]
        appointment_data["patient_name"] = patient.full_name
    
    if payload.provider_user_id:
        assert_user_exists(payload.provider_user_id, UserRole.provider)
        provider = users_store[payload.provider_user_id]
        appointment_data["provider_name"] = provider.full_name
    else:
        # If no provider_user_id, try to find provider by name
        provider_name = payload.provider_name
        provider = next(
            (u for u in users_store.values() if u.role == UserRole.provider and u.full_name == provider_name),
            None
        )
        if provider:
            appointment_data["provider_user_id"] = provider.id
    
    # Randomly assign risk level for demo purposes (30% chance of being flagged)
    risk_roll = random.random()
    if risk_roll < 0.10:
        appointment_data["risk_level"] = RiskLevel.high
    elif risk_roll < 0.20:
        appointment_data["risk_level"] = RiskLevel.medium
    elif risk_roll < 0.30:
        appointment_data["risk_level"] = RiskLevel.low
    else:
        appointment_data["risk_level"] = RiskLevel.none
    
    appointment_id = str(uuid4())
    appointment = Appointment(id=appointment_id, **appointment_data)
    appointments_store[appointment_id] = appointment
    save_appointments()
    return appointment


@app.patch("/api/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, payload: AppointmentUpdate):
    stored = appointments_store.get(appointment_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Appointment not found")
    update_data = payload.model_dump(exclude_unset=True)
    patient_id = update_data.get("patient_user_id")
    provider_id = update_data.get("provider_user_id")
    if patient_id:
        assert_user_exists(patient_id, UserRole.patient)
        update_data["patient_name"] = users_store[patient_id].full_name
    if provider_id:
        assert_user_exists(provider_id, UserRole.provider)
        update_data["provider_name"] = users_store[provider_id].full_name
    updated = stored.model_copy(update=update_data)
    appointments_store[appointment_id] = updated
    save_appointments()
    return updated


@app.delete("/api/appointments/{appointment_id}", status_code=204)
async def delete_appointment(appointment_id: str):
    if appointment_id not in appointments_store:
        raise HTTPException(status_code=404, detail="Appointment not found")
    del appointments_store[appointment_id]
    save_appointments()
    return None


@app.get("/api/summary")
async def summary():
    appointments = list(appointments_store.values())
    total = len(appointments)
    scheduled = len(
        [
            a
            for a in appointments
            if a.status in {AppointmentStatus.scheduled, AppointmentStatus.rescheduled}
        ]
    )
    cancelled = len([a for a in appointments if a.status == AppointmentStatus.cancelled])
    completed = len([a for a in appointments if a.status == AppointmentStatus.completed])
    risk_counts = {
        level.value: len([a for a in appointments if a.risk_level == level]) for level in RiskLevel
    }
    return {
        "total": total,
        "active": scheduled,
        "cancelled": cancelled,
        "completed": completed,
        "risk_breakdown": risk_counts,
    }


