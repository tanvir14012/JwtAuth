from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Cookie, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_payload, get_current_user, get_db, require_admin, require_unlocked
from ..models import RefreshToken, User
from ..schemas import (
    ChangePasswordRequest,
    RefreshRequest,
    ResetPasswordRequest,
    SignInRequest,
    SignUpRequest,
    UnlockRequest,
)
from ..security import create_access_token, create_refresh_token, hash_password, is_token_active, verify_password

router = APIRouter(prefix="/account", tags=["account"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )


def _find_active_refresh(db: Session, token: str | None) -> RefreshToken | None:
    if not token:
        return None
    refresh = db.scalar(select(RefreshToken).where(RefreshToken.token == token))
    if not refresh or not is_token_active(refresh):
        return None
    return refresh


@router.post("/signup")
def signup(payload: SignUpRequest, response: Response, db: Session = Depends(get_db)):
    if payload.password != payload.confirmPassword:
        return {"succeeded": False, "errorMessage": "Passwords do not match"}

    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        return {"succeeded": False, "errorMessage": "Email already exists"}

    user = User(
        first_name=payload.firstName.strip(),
        last_name=(payload.lastName or "").strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh = create_refresh_token(user.id, False, None)
    db.add(refresh)
    db.commit()

    access_token = create_access_token(user, False)
    _set_refresh_cookie(response, refresh.token)
    return {"succeeded": True, "accessToken": access_token, "refreshSucceeded": True}


@router.post("/signin")
def signin(payload: SignInRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user:
        return {"succeeded": False, "errorMessage": "Invalid credentials"}

    if user.lockout_until and user.lockout_until > datetime.utcnow():
        return {"succeeded": False, "errorMessage": "Account is temporarily locked"}

    if not verify_password(payload.password, user.password_hash):
        user.failed_sign_in_attempts += 1
        if user.failed_sign_in_attempts >= 5:
            user.lockout_until = datetime.utcnow() + timedelta(minutes=10)
            user.failed_sign_in_attempts = 0
        db.add(user)
        db.commit()
        return {"succeeded": False, "errorMessage": "Invalid credentials"}

    user.failed_sign_in_attempts = 0
    user.lockout_until = None
    db.add(user)
    db.commit()

    refresh = create_refresh_token(user.id, payload.rememberMe, payload.browserIdentifier)
    db.add(refresh)
    db.commit()

    access_token = create_access_token(user, False)
    _set_refresh_cookie(response, refresh.token)
    return {"succeeded": True, "accessToken": access_token, "refreshSucceeded": True}


@router.post("/refreshUserTokens")
def refresh_tokens(
    response: Response,
    req: RefreshRequest = Body(default=RefreshRequest()),
    refresh_cookie: str | None = Cookie(default=None, alias="refreshToken"),
    db: Session = Depends(get_db),
):
    token_value = req.refreshToken or refresh_cookie
    refresh = _find_active_refresh(db, token_value)
    if not refresh:
        return {"refreshSucceeded": False, "signedOut": True}

    if refresh.remember_me and req.browserIdentifier and refresh.browser_identifier:
        if req.browserIdentifier != refresh.browser_identifier:
            refresh.revoked_at = datetime.utcnow()
            refresh.revocation_reason = "Browser mismatch"
            db.add(refresh)
            db.commit()
            return {"refreshSucceeded": False, "signedOut": True}

    user = db.get(User, refresh.user_id)
    if not user:
        return {"refreshSucceeded": False, "signedOut": True}

    rotated = create_refresh_token(user.id, refresh.remember_me, refresh.browser_identifier)
    rotated.is_session_locked = refresh.is_session_locked
    refresh.revoked_at = datetime.utcnow()
    refresh.revocation_reason = "Rotation"
    refresh.replaced_by_token = rotated.token
    db.add(refresh)
    db.add(rotated)
    db.commit()

    access_token = create_access_token(user, rotated.is_session_locked)
    _set_refresh_cookie(response, rotated.token)
    return {"refreshSucceeded": True, "accessToken": access_token}


@router.post("/signout")
def signout(
    response: Response,
    req: RefreshRequest = Body(default=RefreshRequest()),
    refresh_cookie: str | None = Cookie(default=None, alias="refreshToken"),
    db: Session = Depends(get_db),
):
    token_value = req.refreshToken or refresh_cookie
    refresh = db.scalar(select(RefreshToken).where(RefreshToken.token == token_value)) if token_value else None
    if refresh and refresh.revoked_at is None:
        refresh.revoked_at = datetime.utcnow()
        refresh.revocation_reason = "Signed out"
        db.add(refresh)
        db.commit()
    response.delete_cookie("refreshToken", path="/")
    return {"signedOut": True}


@router.post("/changePassword")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    _unlocked: dict = Depends(require_unlocked),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.oldPassword, current_user.password_hash):
        return False
    if payload.oldPassword == payload.newPassword:
        return False
    current_user.password_hash = hash_password(payload.newPassword)
    db.add(current_user)
    db.commit()
    return True


@router.post("/resetPassword")
def reset_password(
    payload: ResetPasswordRequest,
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, payload.userId)
    if not user:
        return False
    user.password_hash = hash_password(payload.password)
    db.add(user)
    db.commit()
    return True


@router.post("/lockSession")
def lock_session(
    response: Response,
    current_user: User = Depends(get_current_user),
    payload: dict = Depends(get_current_payload),
    refresh_cookie: str | None = Cookie(default=None, alias="refreshToken"),
    db: Session = Depends(get_db),
):
    refresh = _find_active_refresh(db, refresh_cookie)
    if refresh and refresh.user_id == current_user.id:
        refresh.is_session_locked = True
        db.add(refresh)
        db.commit()
    access_token = create_access_token(current_user, True)
    return {"lockSuccess": True, "accessToken": access_token, "userId": payload.get("nameid")}


@router.post("/unlockSession")
def unlock_session(
    payload: UnlockRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    refresh_cookie: str | None = Cookie(default=None, alias="refreshToken"),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.value, current_user.password_hash):
        return {"unlockSuccess": False, "errorMessage": "Invalid password"}

    refresh = _find_active_refresh(db, refresh_cookie)
    if refresh and refresh.user_id == current_user.id:
        refresh.is_session_locked = False
        db.add(refresh)
        db.commit()

    access_token = create_access_token(current_user, False)
    return {"unlockSuccess": True, "accessToken": access_token}


@router.get("/checkAccessTokenValidity")
def check_access_token(_payload: dict = Depends(get_current_payload)):
    return {"isValid": True}


@router.get("/isAdmin")
def is_admin(payload: dict = Depends(get_current_payload)):
    return {"isAdmin": payload.get("usertype") == "0"}
