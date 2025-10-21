from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Create engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,
    max_overflow=20,
    echo=settings.ENV == "development",  # Log SQL in development
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Async support (optional - for future use)
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# 
# async_engine = create_async_engine(
#     settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
#     echo=settings.ENV == "development",
# )
# 
# AsyncSessionLocal = sessionmaker(
#     async_engine, class_=AsyncSession, expire_on_commit=False
# )
# 
# async def get_async_db():
#     async with AsyncSessionLocal() as session:
#         yield session