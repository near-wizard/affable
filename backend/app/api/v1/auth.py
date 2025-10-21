"""
Authentication API Endpoints

Handles login, registration, OAuth callbacks, and token management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_partner, get_current_vendor_user
from app.schemas.auth import (
    LoginRequest,
    PartnerRegisterRequest,
    VendorRegisterRequest,
    Token,
    TokenRefresh,
    OAuthLoginResponse,
    PasswordChangeRequest,
    AuthResponse
)
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService
from app.models import Partner, VendorUser

router = APIRouter()


@router.post("/login/partner", response_model=Token)
def login_partner(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Partner login with email and password.
    
    Returns access and refresh tokens.
    """
    partner, tokens = AuthService.login_partner(db, credentials)
    return tokens


@router.post("/login/vendor", response_model=Token)
def login_vendor_user(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Vendor user login with email and password.
    
    Returns access and refresh tokens.
    """
    vendor_user, tokens = AuthService.login_vendor_user(db, credentials)
    return tokens


@router.post("/register/partner", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_partner(
    data: PartnerRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new partner account.
    
    Partner status will be 'pending' and requires approval.
    """
    partner = AuthService.register_partner(db, data)
    
    return AuthResponse(
        message="Partner registered successfully. Your account is pending approval.",
        user_type="partner",
        user_id=partner.partner_id,
        email=partner.email
    )


@router.post("/register/vendor", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_vendor(
    data: VendorRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new vendor account.
    
    Creates both vendor and owner user account.
    """
    vendor = AuthService.register_vendor(db, data)
    
    return AuthResponse(
        message="Vendor registered successfully. You can now log in.",
        user_type="vendor",
        user_id=vendor.vendor_id,
        email=vendor.email
    )


@router.post("/refresh", response_model=Token)
def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    tokens = AuthService.refresh_access_token(db, token_data.refresh_token)
    return tokens


@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for current user.
    """
    AuthService.change_password(
        db,
        current_user,
        data.current_password,
        data.new_password
    )
    
    return {"message": "Password changed successfully"}


@router.get("/me")
def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    """
    if isinstance(current_user, Partner):
        return {
            "user_type": "partner",
            "user_id": current_user.partner_id,
            "email": current_user.email,
            "name": current_user.name,
            "status": current_user.status,
            "tier": current_user.tier
        }
    elif isinstance(current_user, VendorUser):
        return {
            "user_type": "vendor_user",
            "user_id": current_user.vendor_user_id,
            "vendor_id": current_user.vendor_id,
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role,
            "status": current_user.status
        }


# OAuth Endpoints

@router.get("/oauth/{provider}/authorize")
def oauth_authorize(
    provider: str,
    user_type: str = Query(..., description="'partner' or 'vendor'")
):
    """
    Get OAuth authorization URL for provider.
    
    Supported providers: google, linkedin, github
    """
    import secrets
    
    state = secrets.token_urlsafe(32)
    redirect_uri = f"{AuthService.get_settings().API_URL}/v1/auth/oauth/{provider}/callback"
    
    auth_url = OAuthService.get_authorization_url(provider, redirect_uri, state)
    
    return {
        "authorization_url": auth_url,
        "state": state
    }


@router.get("/oauth/{provider}/callback", response_model=OAuthLoginResponse)
async def oauth_callback(
    provider: str,
    code: str,
    state: str,
    user_type: str = Query("partner", description="'partner' or 'vendor'"),
    vendor_id: int = Query(None, description="Required for new vendor users"),
    db: Session = Depends(get_db)
):
    """
    OAuth callback endpoint.
    
    Handles the OAuth flow completion and creates/logs in user.
    """
    from app.config import settings
    
    # Exchange code for access token
    redirect_uri = f"{settings.API_URL}/v1/auth/oauth/{provider}/callback"
    access_token = await OAuthService.exchange_code_for_token(provider, code, redirect_uri)
    
    # Get user info from provider
    if provider == 'google':
        user_info = await OAuthService.get_google_user_info(access_token)
    elif provider == 'linkedin':
        user_info = await OAuthService.get_linkedin_user_info(access_token)
    elif provider == 'github':
        user_info = await OAuthService.get_github_user_info(access_token)
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    # Login or register user
    if user_type == "partner":
        partner, is_new = await OAuthService.oauth_login_partner(db, provider, user_info)
        tokens = AuthService.generate_tokens_for_partner(partner)
        
        return OAuthLoginResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type="bearer",
            user_type="partner",
            user_id=partner.partner_id,
            email=partner.email,
            is_new_user=is_new
        )
    
    elif user_type == "vendor":
        vendor_user, is_new = await OAuthService.oauth_login_vendor_user(
            db, provider, user_info, vendor_id
        )
        tokens = AuthService.generate_tokens_for_vendor_user(vendor_user)
        
        return OAuthLoginResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type="bearer",
            user_type="vendor_user",
            user_id=vendor_user.vendor_user_id,
            email=vendor_user.email,
            is_new_user=is_new
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid user_type")


@router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    """
    Logout current user.
    
    In a stateless JWT system, logout is handled client-side by discarding tokens.
    This endpoint is provided for consistency.
    """
    return {"message": "Logged out successfully. Please discard your tokens."}