#!/usr/bin/env python3
"""
Initialize database tables from ORM models.
Called during container startup before seeding data.
"""

import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import engine, Base
from app.config import settings

# Import all models to register them with Base
# This is crucial for create_all() to work properly
import app.models  # noqa


def init_database():
    """Create all database tables from ORM models"""
    try:
        print("🔧 Initializing database tables from ORM models...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
