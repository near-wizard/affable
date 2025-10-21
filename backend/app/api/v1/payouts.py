"""
Payouts API Endpoints

Handles payout generation and processing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_partner, get_current_vendor_user, require_vendor_role
from app.schemas.payout import (
    PayoutCreate,
    PayoutBulkCreate,
    PayoutResponse,
    PayoutDetailResponse,
    PayoutListResponse,
    PartnerPaymentMethodCreate,
    PartnerPaymentMethodResponse,
    PaymentProviderResponse
)
from app.models import Partner, VendorUser, Payout, PaymentProvider, PartnerPaymentMethod
from app.services.payout_service import PayoutService

router = APIRouter()


@router.get("/payment-providers", response_model=List[PaymentProviderResponse])
def list_payment_providers(db: Session = Depends(get_db)):
    """
    List available payment providers.
    """
    providers = db.query(PaymentProvider).filter(
        PaymentProvider.is_active == True,
        PaymentProvider.is_deleted == False
    ).all()
    
    return providers


@router.get("/payment-methods", response_model=List[PartnerPaymentMethodResponse])
def list_my_payment_methods(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get partner's payment methods.
    """
    methods = db.query(PartnerPaymentMethod).filter(
        PartnerPaymentMethod.partner_id == partner.partner_id,
        PartnerPaymentMethod.is_deleted == False
    ).all()
    
    return methods


@router.post("/payment-methods", response_model=PartnerPaymentMethodResponse, status_code=status.HTTP_201_CREATED)
def create_payment_method(
    data: PartnerPaymentMethodCreate,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Add a new payment method.
    """
    # If this is the first payment method, make it default
    existing_count = db.query(PartnerPaymentMethod).filter(
        PartnerPaymentMethod.partner_id == partner.partner_id,
        PartnerPaymentMethod.is_deleted == False
    ).count()
    
    is_default = existing_count == 0 or data.is_default
    
    # If setting as default, unset other defaults
    if is_default:
        db.query(PartnerPaymentMethod).filter(
            PartnerPaymentMethod.partner_id == partner.partner_id,
            PartnerPaymentMethod.is_deleted == False
        ).update({"is_default": False})
    
    payment_method = PartnerPaymentMethod(
        partner_id=partner.partner_id,
        payment_provider_id=data.payment_provider_id,
        provider_account_id=data.provider_account_id,
        account_details=data.account_details,
        is_default=is_default,
        is_verified=False  # Requires verification
    )
    
    db.add(payment_method)
    db.commit()
    db.refresh(payment_method)
    
    return payment_method


@router.get("/my-payouts", response_model=List[PayoutResponse])
def list_my_payouts(
    status_filter: Optional[str] = Query(None, alias="status"),
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get partner's payouts.
    """
    payouts = PayoutService.get_partner_payouts(db, partner.partner_id, status_filter)
    
    return [
        PayoutResponse(
            payout_id=p.payout_id,
            partner_id=p.partner_id,
            partner_name=p.partner.name,
            partner_payment_method_id=p.partner_payment_method_id,
            payment_provider_id=p.payment_provider_id,
            payment_provider_name=p.payment_provider.name,
            amount=p.amount,
            currency=p.currency,
            provider_transaction_id=p.provider_transaction_id,
            status=p.status,
            start_date=p.start_date,
            end_date=p.end_date,
            created_at=p.created_at,
            processed_at=p.processed_at,
            completed_at=p.completed_at,
            failed_at=p.failed_at,
            failure_reason=p.failure_reason
        )
        for p in payouts
    ]


@router.get("/my-payouts/{payout_id}", response_model=PayoutDetailResponse)
def get_my_payout(
    payout_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get payout details with conversions.
    """
    payout_details = PayoutService.get_payout_details(db, payout_id)
    
    # Verify ownership
    if payout_details['partner_id'] != partner.partner_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return payout_details


# Vendor endpoints

@router.post("/generate", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
def generate_payout(
    data: PayoutCreate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Generate a payout for a partner.
    
    Requires owner or admin role.
    """
    payout = PayoutService.generate_payout(
        db=db,
        partner_id=data.partner_id,
        start_date=data.start_date,
        end_date=data.end_date,
        payment_method_id=data.partner_payment_method_id
    )
    
    return PayoutResponse(
        payout_id=payout.payout_id,
        partner_id=payout.partner_id,
        partner_name=payout.partner.name,
        partner_payment_method_id=payout.partner_payment_method_id,
        payment_provider_id=payout.payment_provider_id,
        payment_provider_name=payout.payment_provider.name,
        amount=payout.amount,
        currency=payout.currency,
        provider_transaction_id=payout.provider_transaction_id,
        status=payout.status,
        start_date=payout.start_date,
        end_date=payout.end_date,
        created_at=payout.created_at,
        processed_at=payout.processed_at,
        completed_at=payout.completed_at,
        failed_at=payout.failed_at,
        failure_reason=payout.failure_reason
    )


@router.post("/generate-bulk", response_model=List[PayoutResponse], status_code=status.HTTP_201_CREATED)
def generate_bulk_payouts(
    data: PayoutBulkCreate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    db: Session = Depends(get_db)
):
    """
    Generate payouts for multiple partners.
    
    Requires owner role.
    """
    from decimal import Decimal
    
    payouts = PayoutService.generate_bulk_payouts(
        db=db,
        start_date=data.start_date,
        end_date=data.end_date,
        partner_ids=data.partner_ids,
        min_amount=Decimal('0')
    )
    
    return [
        PayoutResponse(
            payout_id=p.payout_id,
            partner_id=p.partner_id,
            partner_name=p.partner.name,
            partner_payment_method_id=p.partner_payment_method_id,
            payment_provider_id=p.payment_provider_id,
            payment_provider_name=p.payment_provider.name,
            amount=p.amount,
            currency=p.currency,
            provider_transaction_id=p.provider_transaction_id,
            status=p.status,
            start_date=p.start_date,
            end_date=p.end_date,
            created_at=p.created_at,
            processed_at=p.processed_at,
            completed_at=p.completed_at,
            failed_at=p.failed_at,
            failure_reason=p.failure_reason
        )
        for p in payouts
    ]


@router.post("/{payout_id}/process", response_model=PayoutResponse)
def process_payout(
    payout_id: int,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Process a payout (send to payment provider).
    
    Requires owner or admin role.
    """
    payout = PayoutService.process_payout(db, payout_id)
    
    return PayoutResponse(
        payout_id=payout.payout_id,
        partner_id=payout.partner_id,
        partner_name=payout.partner.name,
        partner_payment_method_id=payout.partner_payment_method_id,
        payment_provider_id=payout.payment_provider_id,
        payment_provider_name=payout.payment_provider.name,
        amount=payout.amount,
        currency=payout.currency,
        provider_transaction_id=payout.provider_transaction_id,
        status=payout.status,
        start_date=payout.start_date,
        end_date=payout.end_date,
        created_at=payout.created_at,
        processed_at=payout.processed_at,
        completed_at=payout.completed_at,
        failed_at=payout.failed_at,
        failure_reason=payout.failure_reason
    )