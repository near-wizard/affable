from pydantic import BaseModel
from datetime import datetime

class Affiliate(BaseModel):
    name: str | None
    email: str

class Campaign(BaseModel):
    name: str
    affiliate_id: int

class LinkCreate(BaseModel):
    campaign_id: int
    target_url: str

class ConversionCreate(BaseModel):
    affiliate_id: int
    amount: float
    currency: str | None = "USD"
    posthog_distinct_id: str | None = None