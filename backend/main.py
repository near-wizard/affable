from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from datetime import datetime
import os
import redis.asyncio as aioredis
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import random, string

# ---------------------------
# Config
# ---------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")

# ---------------------------
# Redis (Optional - lazy initialization)
# ---------------------------
redis = None

async def get_redis():
    """Get Redis client, lazily initializing if needed."""
    global redis
    if redis is None and REDIS_URL:
        try:
            redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Warning: Redis connection failed: {e}. Continuing without Redis.")
    return redis

# ---------------------------
# Database
# ---------------------------
Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Affiliate(Base):
    __tablename__ = "affiliates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    campaigns = relationship("Campaign", back_populates="affiliate")

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"))
    links = relationship("AffiliateLink", back_populates="campaign")
    affiliate = relationship("Affiliate", back_populates="campaigns")

class AffiliateLink(Base):
    __tablename__ = "affiliate_links"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True)
    target_url = Column(String)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    campaign = relationship("Campaign", back_populates="links")

class ConversionEvent(Base):
    __tablename__ = "conversion_events"
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"))
    amount = Column(Float)
    currency = Column(String, default="USD")
    posthog_distinct_id = Column(String, nullable=True)
    ts = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ---------------------------
# FastAPI app
# ---------------------------
app = FastAPI(title="Affiliate Platform Backend")

# ---------------------------
# Pydantic models
# ---------------------------
class AffiliateCreate(BaseModel):
    name: str | None
    email: str

class CampaignCreate(BaseModel):
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

# ---------------------------
# Helpers
# ---------------------------
def generate_slug(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

# ---------------------------
# API Endpoints
# ---------------------------
@app.post("/api/affiliates")
def create_affiliate(a: AffiliateCreate):
    db = SessionLocal()
    affiliate = Affiliate(name=a.name, email=a.email)
    db.add(affiliate)
    try:
        db.commit()
        db.refresh(affiliate)
        return {"id": affiliate.id, "name": affiliate.name, "email": affiliate.email}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@app.post("/api/campaigns")
def create_campaign(c: CampaignCreate):
    db = SessionLocal()
    campaign = Campaign(name=c.name, affiliate_id=c.affiliate_id)
    db.add(campaign)
    try:
        db.commit()
        db.refresh(campaign)
        return {"id": campaign.id, "name": campaign.name, "affiliate_id": campaign.affiliate_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@app.post("/api/links")
async def create_link(link: LinkCreate):
    db = SessionLocal()
    slug = generate_slug()
    affiliate_link = AffiliateLink(slug=slug, target_url=link.target_url, campaign_id=link.campaign_id)
    db.add(affiliate_link)
    try:
        db.commit()
        db.refresh(affiliate_link)
        await redis.set(slug, affiliate_link.target_url)
        return {"id": affiliate_link.id, "slug": slug, "target_url": affiliate_link.target_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()

@app.get("/l/{slug}")
async def redirect(slug: str, request: Request):
    target_url = await redis.get(slug)
    if not target_url:
        raise HTTPException(status_code=404, detail="Link not found")
    print("Click event:", {"slug": slug, "ip": request.client.host, "ua": request.headers.get("user-agent"), "ts": datetime.utcnow().isoformat()})
    return RedirectResponse(url=target_url)

@app.post("/api/events/conversion")
def track_conversion(event: ConversionCreate):
    db = SessionLocal()
    conv = ConversionEvent(
        affiliate_id=event.affiliate_id,
        amount=event.amount,
        currency=event.currency,
        posthog_distinct_id=event.posthog_distinct_id
    )
    db.add(conv)
    try:
        db.commit()
        db.refresh(conv)
        return {"id": conv.id, "affiliate_id": conv.affiliate_id, "amount": conv.amount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()
