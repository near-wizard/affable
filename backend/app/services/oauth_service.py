"""
OAuth Service

Handles OAuth authentication with Google, LinkedIn, and GitHub.
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
import httpx
from authlib.integrations.starlette_client import OAuth

from app.config import settings
from app.models import Partner, VendorUser, Vendor
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.services.auth_service import AuthService


class OAuthService:
    """Service for OAuth operations."""
    
    # OAuth configuration
    oauth = OAuth()
    
    # Google OAuth
    oauth.register(
        name='google',
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    
    # LinkedIn OAuth
    oauth.register(
        name='linkedin',
        client_id=settings.LINKEDIN_CLIENT_ID,
        client_secret=settings.LINKEDIN_CLIENT_SECRET,
        authorize_url='https://www.linkedin.com/oauth/v2/authorization',
        access_token_url='https://www.linkedin.com/oauth/v2/accessToken',
        client_kwargs={'scope': 'r_liteprofile r_emailaddress'}
    )
    
    # GitHub OAuth
    oauth.register(
        name='github',
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=settings.GITHUB_CLIENT_SECRET,
        authorize_url='https://github.com/login/oauth/authorize',
        access_token_url='https://github.com/login/oauth/access_token',
        api_base_url='https://api.github.com/',
        client_kwargs={'scope': 'user:email'}
    )
    
    @staticmethod
    async def get_google_user_info(access_token: str) -> Dict[str, Any]:
        """
        Get user info from Google.
        
        Args:
            access_token: Google access token
            
        Returns:
            User info dictionary
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                raise UnauthorizedException("Failed to fetch Google user info")
            
            return response.json()
    
    @staticmethod
    async def get_linkedin_user_info(access_token: str) -> Dict[str, Any]:
        """
        Get user info from LinkedIn.
        
        Args:
            access_token: LinkedIn access token
            
        Returns:
            User info dictionary
        """
        async with httpx.AsyncClient() as client:
            # Get profile
            profile_response = await client.get(
                'https://api.linkedin.com/v2/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if profile_response.status_code != 200:
                raise UnauthorizedException("Failed to fetch LinkedIn profile")
            
            profile = profile_response.json()
            
            # Get email
            email_response = await client.get(
                'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if email_response.status_code != 200:
                raise UnauthorizedException("Failed to fetch LinkedIn email")
            
            email_data = email_response.json()
            email = email_data['elements'][0]['handle~']['emailAddress']
            
            return {
                'id': profile['id'],
                'email': email,
                'name': f"{profile.get('localizedFirstName', '')} {profile.get('localizedLastName', '')}".strip()
            }
    
    @staticmethod
    async def get_github_user_info(access_token: str) -> Dict[str, Any]:
        """
        Get user info from GitHub.
        
        Args:
            access_token: GitHub access token
            
        Returns:
            User info dictionary
        """
        async with httpx.AsyncClient() as client:
            # Get user profile
            user_response = await client.get(
                'https://api.github.com/user',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if user_response.status_code != 200:
                raise UnauthorizedException("Failed to fetch GitHub user info")
            
            user = user_response.json()
            
            # Get primary email
            email_response = await client.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if email_response.status_code != 200:
                raise UnauthorizedException("Failed to fetch GitHub email")
            
            emails = email_response.json()
            primary_email = next((e['email'] for e in emails if e['primary']), None)
            
            if not primary_email:
                raise BadRequestException("No primary email found in GitHub account")
            
            return {
                'id': user['id'],
                'email': primary_email,
                'name': user.get('name') or user.get('login'),
                'avatar_url': user.get('avatar_url')
            }
    
    @staticmethod
    async def oauth_login_partner(
        db: Session,
        provider: str,
        user_info: Dict[str, Any]
    ) -> Tuple[Partner, bool]:
        """
        Login or register partner via OAuth.
        
        Args:
            db: Database session
            provider: OAuth provider (google, linkedin, github)
            user_info: User info from provider
            
        Returns:
            Tuple of (Partner, is_new_user)
        """
        provider_id = str(user_info['id'])
        email = user_info['email']
        name = user_info.get('name', email.split('@')[0])
        
        # Check if partner exists with this OAuth provider
        partner = db.query(Partner).filter(
            Partner.oauth_provider == provider,
            Partner.oauth_provider_id == provider_id,
            Partner.is_deleted == False
        ).first()
        
        if partner:
            return partner, False
        
        # Check if email already exists
        partner = db.query(Partner).filter(
            Partner.email == email,
            Partner.is_deleted == False
        ).first()
        
        if partner:
            # Link OAuth to existing account
            partner.oauth_provider = provider
            partner.oauth_provider_id = provider_id
            partner.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(partner)
            return partner, False
        
        # Create new partner
        partner = Partner(
            name=name,
            email=email,
            oauth_provider=provider,
            oauth_provider_id=provider_id,
            status='pending',
            tier='standard'
        )
        
        db.add(partner)
        db.commit()
        db.refresh(partner)
        
        return partner, True
    
    @staticmethod
    async def oauth_login_vendor_user(
        db: Session,
        provider: str,
        user_info: Dict[str, Any],
        vendor_id: Optional[int] = None
    ) -> Tuple[VendorUser, bool]:
        """
        Login or register vendor user via OAuth.
        
        Args:
            db: Database session
            provider: OAuth provider
            user_info: User info from provider
            vendor_id: Optional vendor ID for new user registration
            
        Returns:
            Tuple of (VendorUser, is_new_user)
            
        Raises:
            BadRequestException: If vendor_id not provided for new user
        """
        provider_id = str(user_info['id'])
        email = user_info['email']
        name = user_info.get('name', email.split('@')[0])
        
        # Check if vendor user exists with this OAuth provider
        vendor_user = db.query(VendorUser).filter(
            VendorUser.oauth_provider == provider,
            VendorUser.oauth_provider_id == provider_id,
            VendorUser.is_deleted == False
        ).first()
        
        if vendor_user:
            # Update last login
            vendor_user.last_login_at = datetime.utcnow()
            db.commit()
            return vendor_user, False
        
        # Check if email already exists
        vendor_user = db.query(VendorUser).filter(
            VendorUser.email == email,
            VendorUser.is_deleted == False
        ).first()
        
        if vendor_user:
            # Link OAuth to existing account
            vendor_user.oauth_provider = provider
            vendor_user.oauth_provider_id = provider_id
            vendor_user.last_login_at = datetime.utcnow()
            vendor_user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(vendor_user)
            return vendor_user, False
        
        # New user - need vendor_id
        if not vendor_id:
            raise BadRequestException(
                "No existing account found. Please register as a vendor first."
            )
        
        # Verify vendor exists
        vendor = db.query(Vendor).filter(
            Vendor.vendor_id == vendor_id,
            Vendor.is_deleted == False
        ).first()
        
        if not vendor:
            raise BadRequestException("Invalid vendor ID")
        
        # Create new vendor user
        vendor_user = VendorUser(
            vendor_id=vendor_id,
            email=email,
            name=name,
            oauth_provider=provider,
            oauth_provider_id=provider_id,
            role='member',
            status='active',
            joined_at=datetime.utcnow()
        )
        
        db.add(vendor_user)
        db.commit()
        db.refresh(vendor_user)
        
        return vendor_user, True
    
    @staticmethod
    def get_authorization_url(provider: str, redirect_uri: str, state: str) -> str:
        """
        Get OAuth authorization URL.
        
        Args:
            provider: OAuth provider name
            redirect_uri: Callback URL
            state: State parameter for CSRF protection
            
        Returns:
            Authorization URL
        """
        if provider == 'google':
            return f"https://accounts.google.com/o/oauth2/v2/auth?client_id={settings.GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20email%20profile&state={state}"
        
        elif provider == 'linkedin':
            return f"https://www.linkedin.com/oauth/v2/authorization?client_id={settings.LINKEDIN_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope=r_liteprofile%20r_emailaddress&state={state}"
        
        elif provider == 'github':
            return f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope=user:email&state={state}"
        
        else:
            raise BadRequestException(f"Unsupported OAuth provider: {provider}")
    
    @staticmethod
    async def exchange_code_for_token(provider: str, code: str, redirect_uri: str) -> str:
        """
        Exchange authorization code for access token.
        
        Args:
            provider: OAuth provider
            code: Authorization code
            redirect_uri: Redirect URI used in authorization
            
        Returns:
            Access token
        """
        async with httpx.AsyncClient() as client:
            if provider == 'google':
                response = await client.post(
                    'https://oauth2.googleapis.com/token',
                    data={
                        'client_id': settings.GOOGLE_CLIENT_ID,
                        'client_secret': settings.GOOGLE_CLIENT_SECRET,
                        'code': code,
                        'grant_type': 'authorization_code',
                        'redirect_uri': redirect_uri
                    }
                )
            
            elif provider == 'linkedin':
                response = await client.post(
                    'https://www.linkedin.com/oauth/v2/accessToken',
                    data={
                        'client_id': settings.LINKEDIN_CLIENT_ID,
                        'client_secret': settings.LINKEDIN_CLIENT_SECRET,
                        'code': code,
                        'grant_type': 'authorization_code',
                        'redirect_uri': redirect_uri
                    }
                )
            
            elif provider == 'github':
                response = await client.post(
                    'https://github.com/login/oauth/access_token',
                    headers={'Accept': 'application/json'},
                    data={
                        'client_id': settings.GITHUB_CLIENT_ID,
                        'client_secret': settings.GITHUB_CLIENT_SECRET,
                        'code': code,
                        'redirect_uri': redirect_uri
                    }
                )
            
            else:
                raise BadRequestException(f"Unsupported OAuth provider: {provider}")
            
            if response.status_code != 200:
                raise UnauthorizedException("Failed to exchange authorization code")
            
            token_data = response.json()
            return token_data['access_token']