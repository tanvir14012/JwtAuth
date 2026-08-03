import secrets
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings
from .models import RefreshToken, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User, is_session_locked: bool) -> str:
    now = datetime.utcnow()
    payload = {
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
        "nameid": user.id,
        "email": user.email,
        "usertype": "0" if user.role == "admin" else "1",
        "isSessionLocked": "true" if is_session_locked else "false",
        "role": user.role,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )


def create_refresh_token(
    user_id: str, remember_me: bool = False, browser_identifier: str | None = None
) -> RefreshToken:
    return RefreshToken(
        token=secrets.token_urlsafe(48),
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
        remember_me=remember_me,
        browser_identifier=browser_identifier,
        is_session_locked=False,
    )


def is_token_active(refresh_token: RefreshToken) -> bool:
    return refresh_token.revoked_at is None and refresh_token.expires_at > datetime.utcnow()


def safe_decode(token: str) -> dict | None:
    try:
        return decode_access_token(token)
    except JWTError:
        return None
