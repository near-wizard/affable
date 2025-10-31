from typing import Optional, Union
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_access_token
from app.models.partner import Partner
from app.models.vendor import Vendor, VendorUser
from app.core.exceptions import UnauthorizedException, ForbiddenException

# Security scheme
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[Partner, VendorUser]:
    """
    Get current authenticated user (Partner or VendorUser).
    
    Extracts and validates JWT token, then retrieves user from database.
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    user_type = payload.get("user_type")
    user_id = payload.get("sub")
    
    if not user_type or not user_id:
        raise UnauthorizedException("Invalid token payload")
    
    # Fetch user based on type
    if user_type == "partner":
        user = db.query(Partner).filter(
            Partner.partner_id == int(user_id),
            Partner.is_deleted == False
        ).first()
        if not user:
            raise UnauthorizedException("Partner not found")
        if user.status not in ['active', 'pending']:
            raise UnauthorizedException("Partner account is suspended or rejected")
    
    elif user_type == "vendor_user":
        user = db.query(VendorUser).filter(
            VendorUser.vendor_user_id == int(user_id),
            VendorUser.is_deleted == False
        ).first()
        if not user:
            raise UnauthorizedException("Vendor user not found")
        if user.status != 'active':
            raise UnauthorizedException("Vendor user account is not active")
    
    else:
        raise UnauthorizedException("Invalid user type")
    
    return user


def get_current_partner(
    current_user: Union[Partner, VendorUser] = Depends(get_current_user)
) -> Partner:
    """Get current user, ensuring they are a Partner."""
    if not isinstance(current_user, Partner):
        raise ForbiddenException("This endpoint is only accessible to partners")
    return current_user


def get_current_vendor_user(
    current_user: Union[Partner, VendorUser] = Depends(get_current_user)
) -> VendorUser:
    """Get current user, ensuring they are a VendorUser."""
    if not isinstance(current_user, VendorUser):
        raise ForbiddenException("This endpoint is only accessible to vendor users")
    return current_user


def get_current_active_partner(
    partner: Partner = Depends(get_current_partner)
) -> Partner:
    """Get current partner, ensuring they are active."""
    if partner.status != 'active':
        raise ForbiddenException("Partner account must be active")
    return partner


def require_vendor_role(allowed_roles: list[str]):
    """
    Dependency factory to require specific vendor user roles.
    
    Usage:
        @router.post("/admin-action")
        def admin_action(
            vendor_user: VendorUser = Depends(require_vendor_role(["owner", "admin"]))
        ):
            ...
    """
    def role_checker(
        vendor_user: VendorUser = Depends(get_current_vendor_user)
    ) -> VendorUser:
        if vendor_user.role not in allowed_roles:
            raise ForbiddenException(
                f"This action requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return vendor_user
    
    return role_checker


def verify_partner_access(partner_id: int):
    """
    Dependency factory to verify partner can only access their own data.
    
    Usage:
        @router.get("/partners/{partner_id}/stats")
        def get_stats(
            partner_id: int,
            _: None = Depends(verify_partner_access(partner_id))
        ):
            ...
    """
    def access_checker(
        current_user: Union[Partner, VendorUser] = Depends(get_current_user)
    ) -> None:
        # Vendor users can access any partner's data (for their campaigns)
        if isinstance(current_user, VendorUser):
            return
        
        # Partners can only access their own data
        if isinstance(current_user, Partner):
            if current_user.partner_id != partner_id:
                raise ForbiddenException("You can only access your own data")
        
    return access_checker


def verify_vendor_access(vendor_id: int):
    """
    Dependency factory to verify vendor user can only access their vendor's data.
    
    Usage:
        @router.get("/vendors/{vendor_id}/campaigns")
        def get_campaigns(
            vendor_id: int,
            _: None = Depends(verify_vendor_access(vendor_id))
        ):
            ...
    """
    def access_checker(
        vendor_user: VendorUser = Depends(get_current_vendor_user)
    ) -> None:
        if vendor_user.vendor_id != vendor_id:
            raise ForbiddenException("You can only access your own vendor's data")
    
    return access_checker


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[Union[Partner, VendorUser]]:
    """
    Get current user if authenticated, otherwise return None.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials, db)
    except:
        return None