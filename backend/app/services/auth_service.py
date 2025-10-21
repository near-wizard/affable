"""
Authentication Service

Handles user authentication, registration, and token management.
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Tuple, Union

from app.models import Partner, Vendor, VendorUser
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    generate_api_key,
    generate_webhook_secret
)
from app.core.exceptions import (
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    BadRequestException
)
from app.schemas.auth import (
    LoginRequest,
    PartnerRegisterRequest,
    VendorRegisterRequest,
    Token
)


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def authenticate_partner(db: Session, email: str, password: str) -> Partner:
        """
        Authenticate a partner by email and password.
        
        Args:
            db: Database session
            email: Partner email
            password: Plain text password
            
        Returns:
            Authenticated Partner object
            
        Raises:
            UnauthorizedException: If credentials are invalid
        """
        partner = db.query(Partner).filter(
            Partner.email == email,
            Partner.is_deleted == False
        ).first()
        
        if not partner:
            raise UnauthorizedException("Invalid credentials")
        
        if not partner.password_hash:
            raise UnauthorizedException("Password authentication not available. Please use OAuth.")
        
        if not verify_password(password, partner.password_hash):
            raise UnauthorizedException("Invalid credentials")
        
        if partner.status == 'suspended':
            raise UnauthorizedException("Account is suspended")
        
        if partner.status == 'rejected':
            raise UnauthorizedException("Account has been rejected")
        
        return partner
    
    @staticmethod
    def authenticate_vendor_user(db: Session, email: str, password: str) -> VendorUser:
        """
        Authenticate a vendor user by email and password.
        
        Args:
            db: Database session
            email: Vendor user email
            password: Plain text password
            
        Returns:
            Authenticated VendorUser object
            
        Raises:
            UnauthorizedException: If credentials are invalid
        """
        vendor_user = db.query(VendorUser).filter(
            VendorUser.email == email,
            VendorUser.is_deleted == False
        ).first()
        
        if not vendor_user:
            raise UnauthorizedException("Invalid credentials")
        
        if not vendor_user.password_hash:
            raise UnauthorizedException("Password authentication not available. Please use OAuth.")
        
        if not verify_password(password, vendor_user.password_hash):
            raise UnauthorizedException("Invalid credentials")
        
        if vendor_user.status != 'active':
            raise UnauthorizedException("Account is not active")
        
        # Update last login
        vendor_user.last_login_at = datetime.utcnow()
        db.commit()
        
        return vendor_user
    
    @staticmethod
    def login_partner(db: Session, credentials: LoginRequest) -> Tuple[Partner, Token]:
        """
        Login partner and generate tokens.
        
        Args:
            db: Database session
            credentials: Login credentials
            
        Returns:
            Tuple of (Partner, Token)
        """
        partner = AuthService.authenticate_partner(
            db, credentials.email, credentials.password
        )
        
        tokens = AuthService.generate_tokens_for_partner(partner)
        return partner, tokens
    
    @staticmethod
    def login_vendor_user(db: Session, credentials: LoginRequest) -> Tuple[VendorUser, Token]:
        """
        Login vendor user and generate tokens.
        
        Args:
            db: Database session
            credentials: Login credentials
            
        Returns:
            Tuple of (VendorUser, Token)
        """
        vendor_user = AuthService.authenticate_vendor_user(
            db, credentials.email, credentials.password
        )
        
        tokens = AuthService.generate_tokens_for_vendor_user(vendor_user)
        return vendor_user, tokens
    
    @staticmethod
    def register_partner(db: Session, data: PartnerRegisterRequest) -> Partner:
        """
        Register a new partner.
        
        Args:
            db: Database session
            data: Partner registration data
            
        Returns:
            Created Partner object
            
        Raises:
            ConflictException: If email already exists
        """
        # Check if email exists
        existing = db.query(Partner).filter(
            Partner.email == data.email,
            Partner.is_deleted == False
        ).first()
        
        if existing:
            raise ConflictException("Email already registered")
        
        # Create partner
        partner = Partner(
            name=data.name,
            email=data.email,
            password_hash=get_password_hash(data.password),
            website_url=data.website_url,
            bio=data.bio,
            status='pending',  # Requires approval
            tier='standard'
        )
        
        db.add(partner)
        db.commit()
        db.refresh(partner)
        
        return partner
    
    @staticmethod
    def register_vendor(db: Session, data: VendorRegisterRequest) -> Vendor:
        """
        Register a new vendor.
        
        Args:
            db: Database session
            data: Vendor registration data
            
        Returns:
            Created Vendor object
            
        Raises:
            ConflictException: If email already exists
        """
        # Check if email exists
        existing = db.query(Vendor).filter(
            Vendor.email == data.email,
            Vendor.is_deleted == False
        ).first()
        
        if existing:
            raise ConflictException("Email already registered")
        
        # Create vendor
        vendor = Vendor(
            name=data.name,
            email=data.email,
            password_hash=get_password_hash(data.password),
            company_name=data.company_name,
            website_url=data.website_url,
            status='active',
            api_key=generate_api_key(),
            webhook_secret=generate_webhook_secret()
        )
        
        db.add(vendor)
        db.flush()  # Get vendor_id
        
        # Create owner user
        owner_user = VendorUser(
            vendor_id=vendor.vendor_id,
            email=data.email,
            password_hash=get_password_hash(data.password),
            name=data.name,
            role='owner',
            status='active',
            joined_at=datetime.utcnow()
        )
        
        db.add(owner_user)
        db.commit()
        db.refresh(vendor)
        
        return vendor
    
    @staticmethod
    def generate_tokens_for_partner(partner: Partner) -> Token:
        """
        Generate access and refresh tokens for a partner.
        
        Args:
            partner: Partner object
            
        Returns:
            Token object with access and refresh tokens
        """
        token_data = {
            "sub": str(partner.partner_id),
            "user_type": "partner",
            "email": partner.email,
            "tier": partner.tier
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    
    @staticmethod
    def generate_tokens_for_vendor_user(vendor_user: VendorUser) -> Token:
        """
        Generate access and refresh tokens for a vendor user.
        
        Args:
            vendor_user: VendorUser object
            
        Returns:
            Token object with access and refresh tokens
        """
        token_data = {
            "sub": str(vendor_user.vendor_user_id),
            "user_type": "vendor_user",
            "email": vendor_user.email,
            "vendor_id": vendor_user.vendor_id,
            "role": vendor_user.role
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Token:
        """
        Generate new access token from refresh token.
        
        Args:
            db: Database session
            refresh_token: Valid refresh token
            
        Returns:
            New Token object
            
        Raises:
            UnauthorizedException: If refresh token is invalid
        """
        # Verify refresh token
        payload = verify_refresh_token(refresh_token)
        
        user_type = payload.get("user_type")
        user_id = payload.get("sub")
        
        if user_type == "partner":
            partner = db.query(Partner).filter(
                Partner.partner_id == int(user_id),
                Partner.is_deleted == False
            ).first()
            
            if not partner or partner.status not in ['active', 'pending']:
                raise UnauthorizedException("Invalid refresh token")
            
            return AuthService.generate_tokens_for_partner(partner)
        
        elif user_type == "vendor_user":
            vendor_user = db.query(VendorUser).filter(
                VendorUser.vendor_user_id == int(user_id),
                VendorUser.is_deleted == False
            ).first()
            
            if not vendor_user or vendor_user.status != 'active':
                raise UnauthorizedException("Invalid refresh token")
            
            return AuthService.generate_tokens_for_vendor_user(vendor_user)
        
        else:
            raise UnauthorizedException("Invalid refresh token")
    
    @staticmethod
    def change_password(
        db: Session,
        user: Union[Partner, VendorUser],
        current_password: str,
        new_password: str
    ) -> bool:
        """
        Change user password.
        
        Args:
            db: Database session
            user: Partner or VendorUser object
            current_password: Current password
            new_password: New password
            
        Returns:
            True if password changed successfully
            
        Raises:
            BadRequestException: If current password is incorrect
        """
        if not user.password_hash:
            raise BadRequestException("Password authentication not available")
        
        if not verify_password(current_password, user.password_hash):
            raise BadRequestException("Current password is incorrect")
        
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    
    @staticmethod
    def regenerate_vendor_api_key(db: Session, vendor: Vendor) -> str:
        """
        Regenerate vendor API key.
        
        Args:
            db: Database session
            vendor: Vendor object
            
        Returns:
            New API key
        """
        new_api_key = generate_api_key()
        vendor.api_key = new_api_key
        vendor.updated_at = datetime.utcnow()
        db.commit()
        
        return new_api_key
    
    @staticmethod
    def regenerate_vendor_webhook_secret(db: Session, vendor: Vendor) -> str:
        """
        Regenerate vendor webhook secret.
        
        Args:
            db: Database session
            vendor: Vendor object
            
        Returns:
            New webhook secret
        """
        new_webhook_secret = generate_webhook_secret()
        vendor.webhook_secret = new_webhook_secret
        vendor.updated_at = datetime.utcnow()
        db.commit()
        
        return new_webhook_secret