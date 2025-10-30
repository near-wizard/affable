from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from decimal import Decimal
import json
import time
import logging

from app.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, partners, vendors, campaigns, links, tracking, conversions, payouts, webhooks, billing

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.ENV == "development" else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Sentry if configured
if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV,
        traces_sample_rate=1.0 if settings.ENV == "development" else 0.1,
    )

# Custom JSON encoder to handle Decimal serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    docs_url="/docs" if settings.ENV == "development" else None,
    redoc_url="/redoc" if settings.ENV == "development" else None,
)

# Override JSON encoder to handle Decimals
app.json_encoder = DecimalEncoder

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": str(type(exc).__name__)}
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "version": settings.API_VERSION
    }

# Include API routers
app.include_router(auth.router, prefix=f"/{settings.API_VERSION}/auth", tags=["Authentication"])
app.include_router(partners.router, prefix=f"/{settings.API_VERSION}/partners", tags=["Partners"])
app.include_router(vendors.router, prefix=f"/{settings.API_VERSION}/vendors", tags=["Vendors"])
app.include_router(campaigns.router, prefix=f"/{settings.API_VERSION}/campaigns", tags=["Campaigns"])
app.include_router(links.router, prefix=f"/{settings.API_VERSION}/links", tags=["Links"])
app.include_router(conversions.router, prefix=f"/{settings.API_VERSION}/conversions", tags=["Conversions"])
app.include_router(payouts.router, prefix=f"/{settings.API_VERSION}/payouts", tags=["Payouts"])
app.include_router(webhooks.router, prefix=f"/{settings.API_VERSION}/webhooks", tags=["Webhooks"])
app.include_router(billing.router, prefix=f"/{settings.API_VERSION}/billing", tags=["Billing"])
app.include_router(tracking.router, tags=["Tracking"])  # No prefix for short URLs

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} in {settings.ENV} mode")
    # Note: In production, use Alembic migrations instead of creating tables
    if settings.ENV == "development":
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created (development mode)")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Affiliate Tracking Platform API",
        "version": settings.API_VERSION,
        "docs": f"{settings.API_URL}/docs" if settings.ENV == "development" else None
    }