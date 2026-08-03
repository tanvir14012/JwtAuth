from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .security import safe_decode

auth_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
) -> dict:
    token = credentials.credentials if credentials else ""
    payload = safe_decode(token) if token else None
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return payload


def get_current_user(
    payload: dict = Depends(get_current_payload),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, payload.get("nameid"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


def require_unlocked(payload: dict = Depends(get_current_payload)) -> dict:
    if payload.get("isSessionLocked") == "true":
        raise HTTPException(status_code=423, detail="Session locked")
    return payload


def require_admin(payload: dict = Depends(get_current_payload)) -> dict:
    if payload.get("usertype") != "0":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return payload
