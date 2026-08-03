from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import account, profile
from .security import hash_password

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(account.router, prefix=settings.api_prefix)
app.include_router(profile.router, prefix=settings.api_prefix)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get(f"{settings.api_prefix}/health")
def health():
    return {"ok": True}


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    if not settings.seed_admin:
        return

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.admin_email.lower()))
        if existing:
            return
        admin = User(
            first_name="System",
            last_name="Admin",
            email=settings.admin_email.lower(),
            password_hash=hash_password(settings.admin_password),
            role="admin",
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()
