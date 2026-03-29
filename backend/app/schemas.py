from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ApplicationStatus, Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    phone: str | None
    full_name: str
    role: Role
    is_active: bool
    is_blocked: bool
    access_expires_at: datetime | None
    specialization: str = ""


class AdminCreatePsychologist(BaseModel):
    email: EmailStr
    phone: str | None = None
    full_name: str
    password: str = Field(min_length=8)
    access_expires_at: datetime | None = None
    specialization: str = Field(default="", max_length=8000)


class AdminCreateAdmin(BaseModel):
    email: EmailStr
    phone: str | None = None
    full_name: str
    password: str = Field(min_length=8)


class AdminUpdatePsychologist(BaseModel):
    is_blocked: bool | None = None
    access_expires_at: datetime | None = None
    is_active: bool | None = None


class AdminExtendSubscription(BaseModel):
    days: int = Field(default=30, ge=1, le=3650)


class PublicSubmitBody(BaseModel):
    client_name: str = Field(min_length=1)
    client_email: str | None = None
    client_phone: str | None = None
    answers: dict = Field(default_factory=dict)


class PsychologistRegistrationCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=64)
    specialization: str = Field(default="", max_length=8000)
    education: str = Field(default="", max_length=8000)
    experience: str = Field(default="", max_length=8000)
    comment: str = Field(default="", max_length=8000)


class PsychologistRegistrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    specialization: str
    education: str
    experience: str
    comment: str
    status: ApplicationStatus
    submitted_at: datetime
    reviewed_at: datetime | None
