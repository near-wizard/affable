from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import secrets

from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token types
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing user info (subject, user_type, etc.)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": TOKEN_TYPE_ACCESS
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Dictionary containing user info
        
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": TOKEN_TYPE_REFRESH
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary containing token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_access_token(token: str) -> dict:
    """
    Verify an access token and return payload.
    
    Args:
        token: JWT access token
        
    Returns:
        Token payload
        
    Raises:
        HTTPException: If token is invalid or not an access token
    """
    payload = decode_token(token)
    
    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    return payload


def verify_refresh_token(token: str) -> dict:
    """
    Verify a refresh token and return payload.
    
    Args:
        token: JWT refresh token
        
    Returns:
        Token payload
        
    Raises:
        HTTPException: If token is invalid or not a refresh token
    """
    payload = decode_token(token)
    
    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    return payload


def generate_api_key() -> str:
    """Generate a secure random API key."""
    return f"ak_{secrets.token_urlsafe(32)}"


def generate_webhook_secret() -> str:
    """Generate a secure webhook secret."""
    return secrets.token_hex(32)


def generate_short_code(length: int = 8) -> str:
    """Generate a short code for tracking links."""
    import shortuuid
    return shortuuid.ShortUUID().random(length=length)


def verify_hmac_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify HMAC signature for webhook requests.
    
    Args:
        payload: Request body as bytes
        signature: Signature from header (format: "sha256=hexdigest")
        secret: Webhook secret
        
    Returns:
        True if signature is valid
    """
    import hmac
    import hashlib
    
    # Extract the hash from "sha256=<hash>"
    if not signature.startswith("sha256="):
        return False
    
    provided_hash = signature[7:]
    
    # Calculate expected signature
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_signature, provided_hash)