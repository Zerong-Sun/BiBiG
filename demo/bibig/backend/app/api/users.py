import uuid
import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.auth import create_access_token, verify_password
from app.models.base import get_db
from app.models.user import User

router = APIRouter()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


class CreateUserRequest(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    password: str = "demo123"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.email and not request.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    query = db.query(User)
    if request.email:
        user = query.filter(User.email == request.email).first()
    else:
        user = query.filter(User.phone == request.phone).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=user)


@router.post("/", response_model=UserResponse)
async def create_user(request: CreateUserRequest, db: Session = Depends(get_db)):
    user = User(
        id=str(uuid.uuid4()),
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/", response_model=list[UserResponse])
async def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
