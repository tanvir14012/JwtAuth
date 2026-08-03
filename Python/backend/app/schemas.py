from pydantic import BaseModel, EmailStr


class SignUpRequest(BaseModel):
    firstName: str
    lastName: str | None = ""
    email: EmailStr
    password: str
    confirmPassword: str | None = ""


class SignInRequest(BaseModel):
    email: EmailStr
    password: str
    rememberMe: bool = False
    browserIdentifier: str | None = None


class RefreshRequest(BaseModel):
    refreshToken: str | None = None
    browserIdentifier: str | None = None


class UnlockRequest(BaseModel):
    value: str


class ChangePasswordRequest(BaseModel):
    oldPassword: str
    newPassword: str


class ResetPasswordRequest(BaseModel):
    userId: str
    password: str


class UserFormRequest(BaseModel):
    id: str | None = ""
    firstName: str
    lastName: str | None = ""
    email: EmailStr
    phoneNumber: str | None = ""
    addressLine1: str | None = ""
    addressLine2: str | None = ""
    country: str | None = ""
    shortBio: str | None = ""
