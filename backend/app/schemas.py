from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import Role


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


class AdminCreatePsychologist(BaseModel):
    email: EmailStr
    phone: str | None = None
    full_name: str
    password: str = Field(min_length=8)
    access_expires_at: datetime | None = None


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
    client_email: EmailStr
    client_phone: str | None = None
    answers: dict = Field(default_factory=dict)
