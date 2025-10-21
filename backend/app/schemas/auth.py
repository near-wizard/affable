from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: int
    user_type: str  # "partner" or "vendor_user"
    email: str
    exp: datetime
    iat: datetime


class Token(BaseModel):
    """Access and refresh token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class LoginRequest(BaseModel):
    """Login credentials."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class PartnerRegisterRequest(BaseModel):
    """Partner registration."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    website_url: Optional[str] = None
    bio: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class VendorRegisterRequest(BaseModel):
    """Vendor registration."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: str = Field(..., min_length=2, max_length=255)
    website_url: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class OAuthCallbackRequest(BaseModel):
    """OAuth callback parameters."""
    code: str
    state: Optional[str] = None


class OAuthLoginResponse(BaseModel):
    """OAuth login response with tokens and user info."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_type: str
    user_id: int
    email: str
    is_new_user: bool = False


class PasswordChangeRequest(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordResetRequest(BaseModel):
    """Request password reset."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token."""
    token: str
    new_password: str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    """Generic authentication response."""
    message: str
    user_type: str
    user_id: int
    email: str