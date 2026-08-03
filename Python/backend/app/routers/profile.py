import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db, require_admin, require_unlocked
from ..models import User
from ..security import hash_password

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path("uploads") / "profile-pics"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def to_profile_dto(user: User) -> dict:
    return {
        "id": user.id,
        "firstName": user.first_name or "",
        "lastName": user.last_name or "",
        "email": user.email,
        "phoneNumber": user.phone_number or "",
        "addressLine1": user.address_line1 or "",
        "addressLine2": user.address_line2 or "",
        "country": user.country or "",
        "shortBio": user.short_bio or "",
        "profilePicUrl": user.profile_pic_url or "",
    }


def _save_profile_picture(profile_picture: UploadFile | None) -> str | None:
    if not profile_picture:
        return None
    ext = os.path.splitext(profile_picture.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".tiff"}:
        return None
    filename = f"{uuid.uuid4().hex}{ext}"
    target = UPLOAD_DIR / filename
    with target.open("wb") as f:
        f.write(profile_picture.file.read())
    return f"/uploads/profile-pics/{filename}"


@router.get("/getDetails")
def get_details(
    _unlocked: dict = Depends(require_unlocked),
    current_user: User = Depends(get_current_user),
):
    return to_profile_dto(current_user)


@router.post("/updateDetails")
def update_details(
    firstName: str = Form(default=""),
    lastName: str = Form(default=""),
    email: str = Form(default=""),
    phoneNumber: str = Form(default=""),
    addressLine1: str = Form(default=""),
    addressLine2: str = Form(default=""),
    country: str = Form(default=""),
    shortBio: str = Form(default=""),
    profilePicture: UploadFile | None = File(default=None),
    _unlocked: dict = Depends(require_unlocked),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if email:
        existing = db.scalar(select(User).where(User.email == email.lower(), User.id != current_user.id))
        if existing:
            return ["Email already exists"]
        current_user.email = email.lower()

    current_user.first_name = firstName or current_user.first_name
    current_user.last_name = lastName or current_user.last_name
    current_user.phone_number = phoneNumber or current_user.phone_number
    current_user.address_line1 = addressLine1 or current_user.address_line1
    current_user.address_line2 = addressLine2 or current_user.address_line2
    current_user.country = country or current_user.country
    current_user.short_bio = shortBio or current_user.short_bio

    uploaded_path = _save_profile_picture(profilePicture)
    if uploaded_path:
        current_user.profile_pic_url = uploaded_path

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return to_profile_dto(current_user)


@router.get("/getAll")
def get_all(
    _unlocked: dict = Depends(require_unlocked),
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [to_profile_dto(user) for user in users]


@router.post("/createUser")
def create_user(
    firstName: str = Form(default=""),
    lastName: str = Form(default=""),
    email: str = Form(default=""),
    phoneNumber: str = Form(default=""),
    addressLine1: str = Form(default=""),
    addressLine2: str = Form(default=""),
    country: str = Form(default=""),
    shortBio: str = Form(default=""),
    _admin: dict = Depends(require_admin),
    _unlocked: dict = Depends(require_unlocked),
    db: Session = Depends(get_db),
):
    email = email.lower().strip()
    if not email:
        return ["Email is required"]
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        return ["Email already exists"]

    user = User(
        first_name=firstName.strip(),
        last_name=lastName.strip(),
        email=email,
        phone_number=phoneNumber.strip(),
        address_line1=addressLine1.strip(),
        address_line2=addressLine2.strip(),
        country=country.strip(),
        short_bio=shortBio.strip(),
        role="user",
        password_hash=hash_password("User@123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_profile_dto(user)


@router.post("/updateDetailsByAdmin")
def update_by_admin(
    id: str = Form(default=""),
    firstName: str = Form(default=""),
    lastName: str = Form(default=""),
    email: str = Form(default=""),
    phoneNumber: str = Form(default=""),
    addressLine1: str = Form(default=""),
    addressLine2: str = Form(default=""),
    country: str = Form(default=""),
    shortBio: str = Form(default=""),
    _admin: dict = Depends(require_admin),
    _unlocked: dict = Depends(require_unlocked),
    db: Session = Depends(get_db),
):
    user = db.get(User, id)
    if not user:
        return ["User not found"]
    if email:
        existing = db.scalar(select(User).where(User.email == email.lower(), User.id != user.id))
        if existing:
            return ["Email already exists"]
        user.email = email.lower()
    user.first_name = firstName or user.first_name
    user.last_name = lastName or user.last_name
    user.phone_number = phoneNumber or user.phone_number
    user.address_line1 = addressLine1 or user.address_line1
    user.address_line2 = addressLine2 or user.address_line2
    user.country = country or user.country
    user.short_bio = shortBio or user.short_bio
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_profile_dto(user)


@router.delete("/deleteUser/{user_id}")
def delete_user(
    user_id: str,
    _admin: dict = Depends(require_admin),
    _unlocked: dict = Depends(require_unlocked),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True
