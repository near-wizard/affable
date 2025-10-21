from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class Affiliate(Base):
    __tablename__ = "affiliates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"))

class AffiliateLink(Base):
    __tablename__ = "affiliate_links"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True)
    target_url = Column(String)

class ConversionEvent(Base):
    __tablename__ = "conversion_events"
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"))
    amount = Column(Float)
    currency = Column(String, default="USD")
    posthog_distinct_id = Column(String, nullable=True)

def create_tables(engine):
    Base.metadata.create_all(bind=engine)

def get_session():
    engine = create_engine("sqlite:///database.db")  # Replace with your database URL
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionLocal()