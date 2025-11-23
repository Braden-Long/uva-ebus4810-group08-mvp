from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
import enum
from database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    patient = "patient"
    provider = "provider"


class RiskLevel(str, enum.Enum):
    """Appointment risk level enumeration"""
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"


class AppointmentStatus(str, enum.Enum):
    """Appointment status enumeration"""
    scheduled = "Scheduled"
    rescheduled = "Rescheduled"
    checked_in = "CheckedIn"
    completed = "Completed"
    cancelled = "Cancelled"


class User(Base):
    """User model for patients and providers"""
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(SQLEnum(UserRole), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    patient_appointments = relationship(
        "Appointment",
        foreign_keys="Appointment.patient_user_id",
        back_populates="patient_user",
        cascade="all, delete-orphan"
    )
    provider_appointments = relationship(
        "Appointment",
        foreign_keys="Appointment.provider_user_id",
        back_populates="provider_user",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role.value,
            "created_at": self.created_at.isoformat(),
        }


class Appointment(Base):
    """Appointment model"""
    __tablename__ = "appointments"

    id = Column(String, primary_key=True)
    patient_name = Column(String(255), nullable=False)
    provider_name = Column(String(255), nullable=False)
    patient_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    provider_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    appointment_time = Column(DateTime, nullable=False, index=True)
    reason = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    channel = Column(String(50), nullable=False)
    status = Column(SQLEnum(AppointmentStatus), nullable=False, default=AppointmentStatus.scheduled)
    risk_level = Column(SQLEnum(RiskLevel), nullable=False, default=RiskLevel.none)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    patient_user = relationship("User", foreign_keys=[patient_user_id], back_populates="patient_appointments")
    provider_user = relationship("User", foreign_keys=[provider_user_id], back_populates="provider_appointments")

    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "patient_name": self.patient_name,
            "provider_name": self.provider_name,
            "patient_user_id": self.patient_user_id,
            "provider_user_id": self.provider_user_id,
            "appointment_time": self.appointment_time.isoformat(),
            "reason": self.reason,
            "location": self.location,
            "channel": self.channel,
            "status": self.status.value,
            "risk_level": self.risk_level.value,
            "notes": self.notes,
        }
