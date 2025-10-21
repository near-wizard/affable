from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal


class PaymentProviderResponse(BaseModel):
    """Payment provider response."""
    payment_provider_id: int
    name: str
    display_name: str
    is_active: bool
    
    class Config:
        from_attributes = True


class PartnerPaymentMethodBase(BaseModel):
    """Base partner payment method schema."""
    payment_provider_id: int
    provider_account_id: Optional[str] = None
    account_details: Optional[Dict[str, Any]] = {}
    is_default: bool = False


class PartnerPaymentMethodCreate(PartnerPaymentMethodBase):
    """Create partner payment method request."""
    partner_id: int


class PartnerPaymentMethodUpdate(BaseModel):
    """Update partner payment method request."""
    account_details: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class PartnerPaymentMethodResponse(PartnerPaymentMethodBase):
    """Partner payment method response."""
    partner_payment_method_id: int
    partner_id: int
    is_verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PayoutBase(BaseModel):
    """Base payout schema."""
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default='USD', max_length=3)


class PayoutCreate(BaseModel):
    """Create payout request."""
    partner_id: int
    start_date: datetime
    end_date: datetime
    partner_payment_method_id: Optional[int] = None


class PayoutBulkCreate(BaseModel):
    """Bulk payout creation request."""
    start_date: datetime
    end_date: datetime
    partner_ids: Optional[List[int]] = None  # If None, create for all partners with balance


class PayoutProcessRequest(BaseModel):
    """Process payout request."""
    payout_id: int


class PayoutResponse(PayoutBase):
    """Payout response."""
    payout_id: int
    partner_id: int
    partner_name: str
    partner_payment_method_id: int
    payment_provider_id: int
    payment_provider_name: str
    provider_transaction_id: Optional[str] = None
    status: str
    start_date: datetime
    end_date: datetime
    created_at: datetime
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    
    class Config:
        from_attributes = True


class PayoutDetailResponse(PayoutResponse):
    """Detailed payout response with conversions."""
    conversion_events: List["ConversionSummary"]
    total_conversions: int


class PayoutEventResponse(BaseModel):
    """Payout event response."""
    payout_id: int
    conversion_event_id: int
    commission_amount: Decimal
    
    class Config:
        from_attributes = True


class PayoutStatsResponse(BaseModel):
    """Payout statistics."""
    total_payouts: int
    total_amount_paid: Decimal
    pending_amount: Decimal
    completed_payouts: int
    failed_payouts: int
    average_payout_amount: Decimal


class PayoutListRequest(BaseModel):
    """Payout list filter request."""
    partner_id: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PayoutListResponse(BaseModel):
    """Paginated payout list response."""
    payouts: List[PayoutResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Forward reference
from app.schemas.commission import ConversionSummary

PayoutDetailResponse.model_rebuild()