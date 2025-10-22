"""
Vendor API Endpoints

Handles vendor/company management, campaigns, and partner relationships.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_vendor_user
from app.models import VendorUser

router = APIRouter()


@router.get("/profile")
def get_vendor_profile(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """Get current vendor's profile."""
    return {
        "vendor_user_id": vendor_user.vendor_user_id,
        "vendor_id": vendor_user.vendor_id,
        "name": vendor_user.name,
        "email": vendor_user.email,
        "created_at": vendor_user.created_at
    }
